import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('order-notifications')
export class OrderProcessor extends WorkerHost {
    private readonly logger = new Logger(OrderProcessor.name);

    async process(job: Job<any, any, string>): Promise<any> {
        switch (job.name) {
            case 'send-confirmation':
                this.logger.log(`[JOB] Sending order confirmation for ID: ${job.data.orderId}`);
                // Here you would integrate with SendGrid or Twilio
                // For mock purpose:
                await new Promise((resolve) => setTimeout(resolve, 1000));
                this.logger.log(`[JOB] Confirmation sent to ${job.data.email || job.data.phone}`);
                return { success: true };

            default:
                this.logger.warn(`[JOB] Unknown job name: ${job.name}`);
        }
    }
}
