import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Category, Prisma } from '@prisma/client';
import { slugify } from '../common/utils/slugify';

@Injectable()
export class ProductsService {
    constructor(private prisma: PrismaService) { }

    async create(createProductDto: CreateProductDto) {
        const slug = slugify(createProductDto.name);
        const existing = await this.prisma.product.findUnique({ where: { slug } });
        if (existing) {
            throw new ConflictException('Product with this name/slug already exists');
        }

        const { images, ...productData } = createProductDto;

        return this.prisma.product.create({
            data: {
                ...productData,
                slug,
                images: {
                    create: images?.map((url, index) => ({ url, position: index })) || [],
                },
            },
            include: { images: true },
        });
    }

    async findAll(query: {
        page?: number;
        pageSize?: number;
        category?: Category;
        q?: string;
        minPrice?: number;
        maxPrice?: number;
        isBestSeller?: any;
        sort?: string;
    }) {
        const {
            page = 1,
            pageSize = 20,
            category,
            q,
            minPrice,
            maxPrice,
            isBestSeller,
            sort,
        } = query;

        const isBestSellerBool = isBestSeller === 'true' || isBestSeller === true;

        const where: Prisma.ProductWhereInput = {
            deletedAt: null,
            ...(category && { category }),
            ...(isBestSeller !== undefined && { isBestSeller: isBestSellerBool }),
            ...(q && {
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } },
                ],
            }),
            ...((minPrice || maxPrice) && {
                price: {
                    ...(minPrice && { gte: +minPrice }),
                    ...(maxPrice && { lte: +maxPrice }),
                },
            }),
        };

        const orderBy: Prisma.ProductOrderByWithRelationInput = {};
        if (sort) {
            const [field, order] = sort.split(':');
            (orderBy as any)[field] = order || 'asc';
        } else {
            orderBy.createdAt = 'desc';
        }

        const [data, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                orderBy,
                skip: (page - 1) * pageSize,
                take: +pageSize,
                include: { images: true },
            }),
            this.prisma.product.count({ where }),
        ]);

        return {
            data,
            total,
            page: +page,
            totalPages: Math.ceil(total / pageSize),
        };
    }

    async findOneBySlug(slug: string) {
        const product = await this.prisma.product.findUnique({
            where: { slug },
            include: { images: true, reviews: { include: { user: true } } },
        });
        if (!product || product.deletedAt) throw new NotFoundException('Product not found');
        return product;
    }

    async update(id: string, updateProductDto: UpdateProductDto) {
        const product = await this.prisma.product.findUnique({ where: { id } });
        if (!product) throw new NotFoundException('Product not found');

        const { images, ...productData } = updateProductDto;

        // Handle slug update if name changes
        let slug = product.slug;
        if (productData.name && productData.name !== product.name) {
            slug = slugify(productData.name);
        }

        return this.prisma.product.update({
            where: { id },
            data: {
                ...productData,
                slug,
                ...(images && {
                    images: {
                        deleteMany: {},
                        create: images.map((url, index) => ({ url, position: index })),
                    },
                }),
            },
            include: { images: true },
        });
    }

    async softDelete(id: string) {
        return this.prisma.product.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
}
