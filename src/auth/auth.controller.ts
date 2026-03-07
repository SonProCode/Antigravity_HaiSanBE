import { Controller, Post, Body, UseGuards, Get, Req, Patch, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, ChangePasswordDto } from './dto/auth.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('login')
    @ApiOperation({ summary: 'Login with email and password' })
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Post('refresh')
    @ApiOperation({ summary: 'Refresh access token' })
    refresh(@Body('refreshToken') refreshToken: string) {
        if (!refreshToken) throw new UnauthorizedException('Refresh token is required');
        return this.authService.refreshTokens(refreshToken);
    }

    @Post('logout')
    @ApiOperation({ summary: 'Logout and revoke refresh token' })
    logout(@Body('refresh_token') refreshToken: string) {
        return this.authService.logout(refreshToken);
    }

    @Get('google')
    @UseGuards(AuthGuard('google'))
    @ApiOperation({ summary: 'Login with Google' })
    async googleAuth() {
        // Redirects to Google
    }

    @Patch('change-password')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Change user password' })
    async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
        return this.authService.changePassword(req.user.sub, dto.oldPassword, dto.newPassword);
    }

    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    @ApiOperation({ summary: 'Google OAuth callback' })
    async googleAuthRedirect(@Req() req: any) {
        // This part should handle or create user, then return tokens
        // For now, let's assume AuthService handles Google user creation
        // To simplify: we'd call a googleLogin method in AuthService
        return this.authService.googleLogin(req.user);
    }
}
