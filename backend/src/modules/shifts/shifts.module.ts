import { Module } from '@nestjs/common';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';
import { ShiftsRepository } from './shifts.repository';
import { OrdersModule } from '../orders/orders.module';
import { CashMovementsController } from './cash-movements/cash-movements.controller';
import { CashbookController } from './cashbook/cashbook.controller';

@Module({
  imports:[OrdersModule],
  providers:[ShiftsService,ShiftsRepository],
  controllers: [ShiftsController, CashMovementsController, CashbookController],
  exports:[ShiftsService]
})
export class ShiftsModule {}
