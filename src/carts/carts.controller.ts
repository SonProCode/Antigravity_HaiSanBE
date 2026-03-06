import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Header,
  Headers,
} from '@nestjs/common';
import { CartsService } from './carts.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@ApiTags('Carts')
@Controller('cart')
export class CartsController {
  constructor(private readonly cartsService: CartsService) { }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-session-id', required: false })
  @ApiOperation({ summary: 'Get current cart (User or Session)' })
  getCart(@Req() req: any, @Headers('x-session-id') sessionId?: string) {
    return this.cartsService.getCart(req.user?.userId, sessionId);
  }

  @Post('items')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-session-id', required: false })
  @ApiOperation({ summary: 'Add item to cart' })
  addItem(
    @Req() req: any,
    @Headers('x-session-id') sessionId: string,
    @Body() dto: AddToCartDto,
  ) {
    return this.cartsService.addItem(req.user?.userId, sessionId, dto);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update cart item weight' })
  updateItem(@Param('id') id: string, @Body() dto: UpdateCartItemDto) {
    return this.cartsService.updateItem(id, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove item from cart' })
  removeItem(@Param('id') id: string) {
    return this.cartsService.removeItem(id);
  }

  @Delete()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-session-id', required: false })
  @ApiOperation({ summary: 'Clear the entire cart' })
  clearCart(@Req() req: any, @Headers('x-session-id') sessionId?: string) {
    return this.cartsService.clearCart(req.user?.userId, sessionId);
  }

  @Post('merge')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Merge guest cart into user cart' })
  merge(@Req() req: any, @Body('sessionId') sessionId: string) {
    return this.cartsService.mergeCarts(req.user.userId, sessionId);
  }
}
