import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { BullModule } from '@nestjs/bullmq';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'order-notifications',
    }),
    ProductsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule { }
