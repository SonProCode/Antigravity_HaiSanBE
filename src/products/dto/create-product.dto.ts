import {
    IsString,
    IsNumber,
    IsOptional,
    IsEnum,
    IsArray,
    IsBoolean,
    Min,
    IsUrl,
} from 'class-validator';
import { Category } from '@prisma/client';

export class CreateProductDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @Min(0)
    price: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    originalPrice?: number;

    @IsEnum(Category)
    category: Category;

    @IsNumber()
    @Min(0)
    inventoryKg: number;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    images?: string[];

    @IsUrl()
    @IsOptional()
    videoUrl?: string;

    @IsBoolean()
    @IsOptional()
    isBestSeller?: boolean;
}
