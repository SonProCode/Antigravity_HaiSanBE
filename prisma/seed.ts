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
        Array.from({ length: 9 }).map(() =>
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
    const SEAFOOD_PRODUCTS: Array<{ name: string, category: Category, price: number, originalPrice: number, img: string }> = [
        { name: 'Tôm Hùm Bông', category: Category.TOM, price: 1500000, originalPrice: 1800000, img: 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?q=80&w=800' },
        { name: 'Cua Cà Mau', category: Category.CUA, price: 450000, originalPrice: 550000, img: 'https://images.unsplash.com/photo-1551462147-37885acc3c41?q=80&w=800' },
        { name: 'Mực Lá Tươi', category: Category.MUC, price: 350000, originalPrice: 400000, img: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?q=80&w=800' },
        { name: 'Cá Thu Phấn', category: Category.CA, price: 250000, originalPrice: 300000, img: 'https://images.unsplash.com/photo-1534604973900-c41ab4c5e636?q=80&w=800' },
        { name: 'Bào Ngư Hàn Quốc', category: Category.PREMIUM, price: 850000, originalPrice: 1000000, img: 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?q=80&w=800' },
        { name: 'Tôm Sú CP', category: Category.TOM, price: 280000, originalPrice: 350000, img: 'https://images.unsplash.com/photo-1553649033-3fbc8d0fa3cb?q=80&w=800' },
        { name: 'Ghẹ Xanh Loại 1', category: Category.CUA, price: 550000, originalPrice: 650000, img: 'https://images.unsplash.com/photo-1623340517766-3d719548489c?q=80&w=800' },
        { name: 'Cá Song Hổ', category: Category.CA, price: 420000, originalPrice: 480000, img: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?q=80&w=800' },
        { name: 'Mực Nháy Cửa Lò', category: Category.MUC, price: 500000, originalPrice: 600000, img: 'https://images.unsplash.com/photo-1604328698692-f76ea9498e76?q=80&w=800' },
        { name: 'Ốc Hương Cồ', category: Category.PREMIUM, price: 680000, originalPrice: 750000, img: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=800' },
    ];

    // Generate 20 more mock products with smart categorization
    const seafoodTypes = [
        { name: 'Tôm', cat: Category.TOM, imgs: ['https://images.unsplash.com/photo-1553649033-3fbc8d0fa3cb?w=800', 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=800'] },
        { name: 'Cá', cat: Category.CA, imgs: ['https://images.unsplash.com/photo-1534604973900-c41ab4c5e636?w=800', 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=800'] },
        { name: 'Mực', cat: Category.MUC, imgs: ['https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800', 'https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=800'] },
        { name: 'Cua', cat: Category.CUA, imgs: ['https://images.unsplash.com/photo-1551462147-37885acc3c41?w=800', 'https://images.unsplash.com/photo-1623340517766-3d719548489c?w=800'] },
        { name: 'Ốc', cat: Category.OTHER, imgs: ['https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800'] },
    ];

    for (let i = 0; i < 20; i++) {
        const type = faker.helpers.arrayElement(seafoodTypes);
        SEAFOOD_PRODUCTS.push({
            name: `${type.name} ${faker.commerce.productAdjective()} ${i}`,
            category: type.cat,
            price: parseInt(faker.commerce.price({ min: 100000, max: 1000000, dec: 0 })),
            originalPrice: parseInt(faker.commerce.price({ min: 110000, max: 1500000, dec: 0 })),
            img: faker.helpers.arrayElement(type.imgs),
        });
    }

    const products = await Promise.all(
        SEAFOOD_PRODUCTS.map((p, i) => {
            return prisma.product.create({
                data: {
                    name: p.name,
                    slug: `${faker.helpers.slugify(p.name).toLowerCase()}-${i}`,
                    description: `${p.name} tươi ngon đánh bắt trong ngày từ vùng biển Quảng Ninh. Đảm bảo chất lượng, không chất bảo quản.`,
                    price: p.price,
                    originalPrice: p.originalPrice,
                    category: p.category,
                    inventoryKg: Math.round((Math.random() * 90 + 10) * 100) / 100,
                    isBestSeller: i < 4,
                    images: {
                        create: [
                            { url: p.img, position: 0 },
                            { url: `https://picsum.photos/seed/${i + 100}/600/400`, position: 1 },
                        ],
                    },
                },
            });
        })
    );

    // 5. Create Orders
    for (const user of users) {
        const numOrders = faker.number.int({ min: 1, max: 2 });
        for (let j = 0; j < numOrders; j++) {
            const selectedProducts = faker.helpers.arrayElements(products, { min: 1, max: 3 });
            let subtotal = 0;

            const orderItems = selectedProducts.map(p => {
                const weight = Math.round((Math.random() * 2 + 1) * 10) / 10;
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
            const tax = 0;
            const total = subtotal + shippingFee + tax;

            await prisma.order.create({
                data: {
                    orderCode: `HSQ-${faker.string.alphanumeric(6).toUpperCase()}`,
                    userId: user.id,
                    customerName: user.name || 'Khách hàng',
                    customerPhone: '098' + faker.string.numeric(7),
                    shippingAddress: {
                        province: 'Quảng Ninh',
                        district: 'Hạ Long',
                        ward: 'Hồng Gai',
                        address: 'Số ' + faker.number.int({ min: 1, max: 200 }) + ' Đường Lê Thánh Tông',
                    } as any,
                    subtotal,
                    shippingFee,
                    tax,
                    total,
                    paymentMethod: PaymentMethod.COD,
                    status: j === 0 ? OrderStatus.DELIVERED : OrderStatus.PENDING,
                    statusTimeline: [
                        { status: OrderStatus.PENDING, timestamp: new Date().toISOString(), note: 'Đã đặt hàng' },
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
