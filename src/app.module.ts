import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { CartsModule } from './carts/carts.module';
import { OrdersModule } from './orders/orders.module';
import { JobsModule } from './jobs/jobs.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get('REDIS_URL');
        return {
          connection: redisUrl
            ? {
              url: redisUrl,
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
              connectTimeout: 30000, // 30 seconds
              keepAlive: 30000,      // 30 seconds
              tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
              retryStrategy: (times: number) => {
                // Exponential backoff or simple gradual retry
                return Math.min(times * 100, 3000);
              },
            }
            : {
              host: 'localhost',
              port: 6379,
              maxRetriesPerRequest: null,
            },
        };
      },
    }),
    PrismaModule,
    CommonModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CartsModule,
    OrdersModule,
    JobsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
