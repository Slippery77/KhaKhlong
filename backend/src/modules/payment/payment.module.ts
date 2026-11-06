import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentRepository } from './payment.repository';
import { ShiftsModule } from '../shifts/shifts.module';
import { SlipOkClient } from './slipok/slipok.client';

@Module({
  imports:[ShiftsModule],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentRepository, SlipOkClient],
  exports:[PaymentService]
})
export class PaymentModule {}
