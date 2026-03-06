import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private prisma: PrismaService,
        private configService: ConfigService,
    ) { }

    async register(registerDto: RegisterDto) {
        return this.usersService.create(registerDto);
    }

    async login(loginDto: LoginDto) {
        const user = await this.usersService.findByEmail(loginDto.email);
        if (!user || !user.passwordHash) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Account is disabled');
        }

        const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);
        if (!isMatch) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const tokens = await this.generateTokens(user.id, user.email, user.role);
        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                image: (user as any).image || null,
            },
        };
    }

    async generateTokens(userId: string, email: string, role: string) {
        const [at, rt] = await Promise.all([
            this.jwtService.signAsync(
                { sub: userId, email, role },
                {
                    secret: this.configService.get('JWT_ACCESS_SECRET'),
                    expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN'),
                },
            ),
            this.jwtService.signAsync(
                { sub: userId, email, role },
                {
                    secret: this.configService.get('JWT_REFRESH_SECRET'),
                    expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
                },
            ),
        ]);

        // Store refresh token
        await this.prisma.refreshToken.create({
            data: {
                token: rt,
                userId,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days matching env default
            },
        });

        return { accessToken: at, refreshToken: rt };
    }

    async googleLogin(googleUser: any) {
        if (!googleUser) {
            throw new BadRequestException('Unauthenticated');
        }

        let user = await this.usersService.findByEmail(googleUser.email);

        if (!user) {
            user = await this.usersService.create({
                email: googleUser.email,
                name: googleUser.name,
                role: 'USER', // OAuth users are always regular users
            });
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Account is disabled');
        }

        const tokens = await this.generateTokens(user.id, user.email, user.role);
        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                image: (user as any).image || null,
            },
        };
    }

    async refreshTokens(refreshToken: string) {
        const payload = await this.jwtService.verifyAsync(refreshToken, {
            secret: this.configService.get('JWT_REFRESH_SECRET'),
        });

        const storedToken = await this.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
        });

        if (!storedToken || storedToken.expiresAt < new Date()) {
            if (storedToken) await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        // Delete old token and issue new ones
        await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });

        const user = await this.usersService.findOne(payload.sub);
        return this.generateTokens(user.id, user.email, user.role);
    }

    async logout(refreshToken: string) {
        try {
            await this.prisma.refreshToken.delete({ where: { token: refreshToken } });
        } catch (e) {
            // Ignore if already deleted
        }
        return { message: 'Logged out successfully' };
    }
}
