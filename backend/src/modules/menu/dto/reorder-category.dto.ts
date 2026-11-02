import { IsArray, ArrayNotEmpty, ArrayMaxSize, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderCategoryDTO {
  @ApiProperty({
    description: 'รายการ category_id เรียงตามลำดับใหม่จากบนลงล่าง',
    example: [
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
    ],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  categoryIds!: string[];
}
