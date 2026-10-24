import { Test, TestingModule } from '@nestjs/testing';
import { CashbookController } from './cashbook.controller';
import { ShiftsService } from '../../shifts/shifts.service';

describe('CashbookController', () => {
  let controller: CashbookController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CashbookController],
      providers: [{ provide: ShiftsService, useValue: {} }],
    }).compile();

    controller = module.get<CashbookController>(CashbookController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
