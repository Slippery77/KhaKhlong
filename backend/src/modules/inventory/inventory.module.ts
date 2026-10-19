import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { IngredientsController } from './ingredients.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';

@Module({
  controllers: [IngredientsController, InventoryController],
  providers: [InventoryService, InventoryRepository],
  exports: [InventoryService, InventoryRepository],
})
export class InventoryModule {}
