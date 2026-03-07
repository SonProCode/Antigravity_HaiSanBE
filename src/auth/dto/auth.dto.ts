import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}

export class RegisterDto {
    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    phone?: string;
}

export class ChangePasswordDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    oldPassword: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    newPassword: string;
}
