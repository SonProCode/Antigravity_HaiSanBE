import {
    IsString,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsEnum,
    IsPhoneNumber,
} from 'class-validator';
import { PaymentMethod, OrderStatus } from '@prisma/client';

export class CreateOrderDto {
    @IsString()
    @IsNotEmpty()
    customerName: string;

    @IsString()
    @IsNotEmpty()
    @IsPhoneNumber('VN')
    customerPhone: string;

    @IsObject()
    shippingAddress: {
        province: string;
        district: string;
        ward: string;
        address: string;
    };

    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;

    @IsString()
    @IsOptional()
    couponCode?: string;

    @IsString()
    @IsOptional()
    note?: string;

    @IsString()
    @IsOptional()
    sessionId?: string; // For guest checkout
}

export class UpdateOrderStatusDto {
    @IsEnum(OrderStatus)
    status: OrderStatus;

    @IsString()
    @IsOptional()
    note?: string;
}
