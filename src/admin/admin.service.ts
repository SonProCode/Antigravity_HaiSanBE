import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }

    async getDashboardStats() {
        const [
            totalOrders,
            pendingOrders,
            totalRevenue,
            totalProducts,
            totalUsers,
            recentOrders,
        ] = await Promise.all([
            this.prisma.order.count(),
            this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
            this.prisma.order.aggregate({
                where: { status: OrderStatus.DELIVERED },
                _sum: { total: true },
            }),
            this.prisma.product.count({ where: { deletedAt: null } }),
            this.prisma.user.count(),
            this.prisma.order.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: { user: true },
            }),
        ]);

        return {
            totalOrders,
            pendingOrders,
            totalRevenue: totalRevenue._sum.total || 0,
            totalProducts,
            totalUsers,
            recentOrders,
        };
    }

    async getRevenueStats() {
        // Simple mock for chart data: revenue by month for current year
        const orders = await this.prisma.order.findMany({
            where: {
                status: OrderStatus.DELIVERED,
                createdAt: { gte: new Date(new Date().getFullYear(), 0, 1) },
            },
            select: { total: true, createdAt: true },
        });

        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];

        const revenueByMonth = months.map((month, index) => {
            const monthTotal = orders
                .filter(o => o.createdAt.getMonth() === index)
                .reduce((sum, o) => sum + o.total, 0);
            return { month, revenue: monthTotal };
        });

        return revenueByMonth;
    }
}
