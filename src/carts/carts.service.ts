import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartsService {
  constructor(private prisma: PrismaService) { }

  async getCart(userId?: string, sessionId?: string) {
    if (!userId && !sessionId) return null;

    const where: any = userId ? { userId } : { sessionId: sessionId || '' };
    let cart = await this.prisma.cart.findUnique({
      where,
      include: { items: { include: { product: { include: { images: true } } } } },
    });

    if (!cart) {
      if (userId) {
        // Double check user exists to avoid FK error
        const userExists = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!userExists) {
          // If user doesn't exist, we can't create a user cart. 
          // Revert to guest cart if sessionId is available, or return null
          if (sessionId) {
            return this.getCart(undefined, sessionId);
          }
          return null;
        }
      }

      cart = await this.prisma.cart.create({
        data: userId ? { userId } : { sessionId: sessionId! },
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
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          weightKg: newWeight,
          totalPrice: Math.round(newWeight * product.price),
        },
      });
      return this.getCart(userId, sessionId);
    }

    await this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: dto.productId,
        weightKg: dto.weightKg,
        pricePerKg: product.price,
        totalPrice: Math.round(dto.weightKg * product.price),
      },
    });

    return this.getCart(userId, sessionId);
  }

  async updateItem(itemId: string, dto: UpdateCartItemDto) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { product: true },
    });
    if (!item) throw new NotFoundException('Cart item not found');

    const updatedItem = await this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        weightKg: dto.weightKg,
        totalPrice: Math.round(dto.weightKg * item.product.price),
      },
    });

    const cart = await this.prisma.cart.findUnique({ where: { id: updatedItem.cartId } });
    return this.getCart(cart?.userId || undefined, cart?.sessionId || undefined);
  }

  async removeItem(itemId: string) {
    const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Cart item not found');

    await this.prisma.cartItem.delete({ where: { id: itemId } });

    const cart = await this.prisma.cart.findUnique({ where: { id: item.cartId } });
    return this.getCart(cart?.userId || undefined, cart?.sessionId || undefined);
  }

  async clearCart(userId?: string, sessionId?: string) {
    const cart = await this.getCart(userId, sessionId);
    if (!cart) throw new NotFoundException('Cart not found');

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return this.getCart(userId, sessionId);
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
