import { IsString, IsNumber, IsOptional, IsEnum, IsArray, IsBoolean, Min, IsUrl } from 'class-validator';
import { Category } from '@prisma/client';
import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) { }
