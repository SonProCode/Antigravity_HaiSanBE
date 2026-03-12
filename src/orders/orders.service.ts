import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';
import { OrderStatus } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('order-notifications') private orderQueue: Queue,
  ) { }

  async create(userId: string | undefined, dto: CreateOrderDto) {
    const where: any = userId ? { userId } : { sessionId: dto.sessionId || '' };
    const cart: any = await this.prisma.cart.findUnique({
      where,
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Begin Transaction
    return this.prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const orderItemsData: any[] = [];

      for (const item of cart.items) {
        // Row locking for inventory
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || product.deletedAt) {
          throw new NotFoundException(`Product ${item.productId} not found`);
        }

        if (Number(product.inventoryKg) < Number(item.weightKg)) {
          throw new BadRequestException(
            `Insufficient inventory for ${product.name}. Required: ${item.weightKg}kg, Available: ${product.inventoryKg}kg`,
          );
        }

        // Decrement inventory
        await tx.product.update({
          where: { id: product.id },
          data: {
            inventoryKg: { decrement: item.weightKg },
            soldCount: { increment: 1 },
          },
        });

        // Log inventory change
        await tx.productInventoryLog.create({
          data: {
            productId: product.id,
            delta: -Number(item.weightKg),
            reason: `Order creation`,
          },
        });

        subtotal += Number(item.totalPrice);
        orderItemsData.push({
          productId: item.productId,
          pricePerKg: item.pricePerKg,
          weightKg: item.weightKg,
          totalPrice: item.totalPrice,
        });
      }

      const shippingFee = subtotal >= 1000000 ? 0 : 50000;
      const tax = Math.round(subtotal * 0.1); // 10% VAT
      const total = subtotal + shippingFee + tax;

      const orderCode = `HAI-${new Date().getFullYear()}-${Math.random()
        .toString(36)
        .substring(2, 7)
        .toUpperCase()}`;

      const order = await tx.order.create({
        data: {
          orderCode,
          userId,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          shippingAddress: dto.shippingAddress as any,
          subtotal,
          shippingFee,
          tax,
          total,
          couponCode: dto.couponCode,
          note: dto.note,
          paymentMethod: dto.paymentMethod,
          status: OrderStatus.PENDING,
          statusTimeline: [
            {
              status: OrderStatus.PENDING,
              timestamp: new Date().toISOString(),
              note: 'Order placed',
            },
          ] as any,
          items: {
            create: orderItemsData,
          },
        },
        include: { items: { include: { product: true } } },
      });

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      // Queue notification job
      await this.orderQueue.add('send-confirmation', {
        orderId: order.id,
        email: userId ? (await tx.user.findUnique({ where: { id: userId } }))?.email : null,
        phone: order.customerPhone,
      });

      return order;
    });
  }

  async findAll(query: { status?: OrderStatus; q?: string; page?: number; pageSize?: number; userType?: 'guest' | 'member' }) {
    const { status, q, page = 1, pageSize = 20, userType } = query;
    const where = {
      ...(status && { status }),
      ...(userType === 'guest' && { userId: null }),
      ...(userType === 'member' && { userId: { not: null } }),
      ...(q && {
        OR: [{ orderCode: { contains: q, mode: 'insensitive' } as any }, { customerPhone: { contains: q, mode: 'insensitive' } as any }],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: +pageSize,
        include: { items: { include: { product: true } } },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, total, page: +page, totalPages: Math.ceil(total / pageSize) };
  }

  async findByCodeAndPhone(orderCode: string, phone: string) {
    if (!phone) throw new BadRequestException('Vui lòng nhập số điện thoại');

    const order = await this.prisma.order.findUnique({
      where: { orderCode },
      include: { items: { include: { product: true } } },
    });

    if (!order || order.customerPhone !== phone) {
      throw new NotFoundException('Không tìm thấy đơn hàng hoặc số điện thoại không khớp');
    }
    return order;
  }

  async findByUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true } } },
    });
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const timeline = order.statusTimeline as any[];
    timeline.push({
      status: dto.status,
      timestamp: new Date().toISOString(),
      note: dto.note || `Status updated to ${dto.status}`,
    });

    return this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        statusTimeline: timeline,
      },
    });
  }
}
