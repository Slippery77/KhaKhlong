import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { SalesQueryDto } from './dto/sales-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwtAuth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequireAnyPermission } from '../auth/guards/permissions.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @ApiOperation({ summary: 'สรุปยอดขาย (เงินสดคงเหลือ รายรับ รายจ่าย)' })
  @Get('sales/summary')
  @RequireAnyPermission('report:view_all', 'report:view_own_shift')
  getSummary(@Query() query: SalesQueryDto) {
    return this.service.getSalesSummary(query);
  }

  @ApiOperation({ summary: 'ยอดขายตามช่วงเวลา (สำหรับกราฟแท่ง)' })
  @Get('sales/by-period')
  @RequireAnyPermission('report:view_all', 'report:view_own_shift')
  getByPeriod(@Query() query: SalesQueryDto) {
    return this.service.getSalesByPeriod(query);
  }

  @ApiOperation({ summary: 'เมนูขายดี 3 อันดับแรกของแต่ละหมวดหมู่' })
  @Get('sales/top-items')
  @RequireAnyPermission('report:view_all', 'report:view_own_shift')
  getTopItems(@Query() query: SalesQueryDto) {
    return this.service.getTopItems(query);
  }

  @ApiOperation({ summary: 'ประวัติธุรกรรมขายและเงินเข้า-ออก' })
  @Get('sales/transactions')
  @RequireAnyPermission('report:view_all', 'report:view_own_shift')
  getTransactions(@Query() query: SalesQueryDto) {
    return this.service.getTransactions(query);
  }

  @ApiOperation({ summary: 'รายการสินค้าในบิล' })
  @Get('sales/receipt/:id')
  @RequireAnyPermission('report:view_all', 'report:view_own_shift', 'payment:receive')
  getReceiptLines(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getReceiptLines(id);
  }
}
