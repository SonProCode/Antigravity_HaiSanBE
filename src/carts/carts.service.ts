import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartsService {
  constructor(private prisma: PrismaService) { }

  async getCart(userId?: string, sessionId?: string) {
    const where: any = userId ? { userId } : { sessionId: sessionId || '' };
    let cart = await this.prisma.cart.findUnique({
      where,
      include: { items: { include: { product: { include: { images: true } } } } },
    });

    if (!cart && sessionId) {
      cart = await this.prisma.cart.create({
        data: { sessionId },
        include: { items: { include: { product: { include: { images: true } } } } },
      });
    }

    return cart;
  }

  async addItem(userId: string | undefined, sessionId: string | undefined, dto: AddToCartDto) {
    const cart = await this.getCart(userId, sessionId);
    if (!cart) throw new NotFoundException('Cart not found');

    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Product not found');

    const existingItem = cart.items.find((i) => i.productId === dto.productId);

    if (existingItem) {
      const newWeight = Number(existingItem.weightKg) + dto.weightKg;
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          weightKg: newWeight,
          totalPrice: Math.round(newWeight * product.price),
        },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: dto.productId,
        weightKg: dto.weightKg,
        pricePerKg: product.price,
        totalPrice: Math.round(dto.weightKg * product.price),
      },
    });
  }

  async updateItem(itemId: string, dto: UpdateCartItemDto) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { product: true },
    });
    if (!item) throw new NotFoundException('Cart item not found');

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        weightKg: dto.weightKg,
        totalPrice: Math.round(dto.weightKg * item.product.price),
      },
    });
  }

  async removeItem(itemId: string) {
    return this.prisma.cartItem.delete({ where: { id: itemId } });
  }

  async mergeCarts(userId: string, sessionId: string) {
    const guestCart = await this.prisma.cart.findUnique({
      where: { sessionId },
      include: { items: true },
    });

    if (!guestCart || guestCart.items.length === 0) return this.getCart(userId);

    const userCart = await this.getCart(userId);
    if (!userCart) {
      // Just assign guest cart to user
      return this.prisma.cart.update({
        where: { id: guestCart.id },
        data: { userId, sessionId: null }
      });
    }

    // Merge items
    for (const item of guestCart.items) {
      const existingUserItem = userCart.items.find((i) => i.productId === item.productId);
      if (existingUserItem) {
        const newWeight = Number(existingUserItem.weightKg) + Number(item.weightKg);
        await this.prisma.cartItem.update({
          where: { id: existingUserItem.id },
          data: {
            weightKg: newWeight,
            totalPrice: Math.round(newWeight * existingUserItem.pricePerKg),
          },
        });
        await this.prisma.cartItem.delete({ where: { id: item.id } });
      } else {
        await this.prisma.cartItem.update({
          where: { id: item.id },
          data: { cartId: userCart.id },
        });
      }
    }

    await this.prisma.cart.delete({ where: { id: guestCart.id } });
    return this.getCart(userId);
  }
}
