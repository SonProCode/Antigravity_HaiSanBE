import { PrismaClient, Role, Category, PaymentMethod, OrderStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // 1. Clear existing data
    await prisma.refreshToken.deleteMany();
    await prisma.review.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.productInventoryLog.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    // 2. Create Admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
        data: {
            email: 'admin@haisan.vn',
            name: 'Admin Hai San',
            passwordHash: adminPassword,
            role: Role.ADMIN,
        },
    });

    // 3. Create Users
    const userPassword = await bcrypt.hash('password123', 10);
    const users = await Promise.all(
        Array.from({ length: 5 }).map(() =>
            prisma.user.create({
                data: {
                    email: faker.internet.email(),
                    name: faker.person.fullName(),
                    passwordHash: userPassword,
                    role: Role.USER,
                },
            })
        )
    );

    // 4. Create Products
    const categories: Category[] = [
        Category.TOM,
        Category.CA,
        Category.MUC,
        Category.CUA,
        Category.PREMIUM,
    ];

    const products = await Promise.all(
        Array.from({ length: 20 }).map((_, i) => {
            const name = faker.commerce.productName();
            return prisma.product.create({
                data: {
                    name,
                    slug: `${faker.helpers.slugify(name).toLowerCase()}-${i}`,
                    description: faker.commerce.productDescription(),
                    price: faker.number.int({ min: 100000, max: 2000000 }),
                    originalPrice: faker.number.int({ min: 2000000, max: 3000000 }),
                    category: faker.helpers.arrayElement(categories),
                    inventoryKg: faker.number.float({ min: 10, max: 100, fractionDigits: 2 }),
                    isBestSeller: faker.datatype.boolean(),
                    images: {
                        create: Array.from({ length: 3 }).map((_, idx) => ({
                            url: `https://picsum.photos/seed/${idx + i}/600/400`,
                            position: idx,
                        })),
                    },
                },
            });
        })
    );

    // 5. Create Orders
    for (const user of users) {
        const numOrders = faker.number.int({ min: 1, max: 3 });
        for (let j = 0; j < numOrders; j++) {
            const selectedProducts = faker.helpers.arrayElements(products, { min: 1, max: 3 });
            let subtotal = 0;

            const orderItems = selectedProducts.map(p => {
                const weight = faker.number.float({ min: 0.5, max: 2, fractionDigits: 1 });
                const price = Number(p.price);
                const total = Math.round(weight * price);
                subtotal += total;
                return {
                    productId: p.id,
                    pricePerKg: price,
                    weightKg: weight,
                    totalPrice: total,
                };
            });

            const shippingFee = subtotal > 1000000 ? 0 : 50000;
            const tax = Math.round(subtotal * 0.1);
            const total = subtotal + shippingFee + tax;

            await prisma.order.create({
                data: {
                    orderCode: `HAI-2026-${faker.string.alphanumeric(5).toUpperCase()}`,
                    userId: user.id,
                    customerName: user.name || 'Customer',
                    customerPhone: '0987123456',
                    shippingAddress: {
                        province: 'Quang Ninh',
                        district: 'Ha Long',
                        ward: 'Hong Gai',
                        address: faker.location.streetAddress(),
                    } as any,
                    subtotal,
                    shippingFee,
                    tax,
                    total,
                    paymentMethod: PaymentMethod.COD,
                    status: OrderStatus.DELIVERED,
                    statusTimeline: [
                        { status: OrderStatus.PENDING, timestamp: new Date().toISOString(), note: 'Placed' },
                        { status: OrderStatus.DELIVERED, timestamp: new Date().toISOString(), note: 'Delivered' },
                    ] as any,
                    items: {
                        create: orderItems,
                    },
                },
            });
        }
    }

    console.log('Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
