import { Test, TestingModule } from '@nestjs/testing';
import { CashMovementsController } from './cash-movements.controller';

describe('CashMovementsController', () => {
  let controller: CashMovementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CashMovementsController],
    }).compile();

    controller = module.get<CashMovementsController>(CashMovementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
