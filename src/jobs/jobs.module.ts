import { Global, Module } from '@nestjs/common';
import { OrderProcessor } from './order.processor';

@Global()
@Module({
  providers: [OrderProcessor],
  exports: [OrderProcessor],
})
export class JobsModule { }
