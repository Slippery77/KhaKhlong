import { Test, TestingModule } from '@nestjs/testing';
import { SystemConfigController } from './system-config.controller';

describe('SystemConfigController', () => {
  let controller: SystemConfigController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemConfigController],
    }).compile();

    controller = module.get<SystemConfigController>(SystemConfigController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
