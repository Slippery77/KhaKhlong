import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentRepository } from './payment.repository';
import { ShiftsModule } from '../shifts/shifts.module';

@Module({
  imports:[ShiftsModule],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentRepository],
  exports:[PaymentService]
})
export class PaymentModule {}
