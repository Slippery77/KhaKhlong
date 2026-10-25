import { Injectable } from '@nestjs/common';
import { ReportsRepository } from './reports.repository';
import { SalesQueryDto } from './dto/sales-query.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly repo: ReportsRepository) {}

  async getSalesSummary(query: SalesQueryDto) {
    const data = await this.repo.getSalesSummary(query);
    return { status: 'success', data };
  }

  async getSalesByPeriod(query: SalesQueryDto) {
    const data = await this.repo.getSalesByPeriod(query);
    return { status: 'success', data };
  }

  async getTopItems(query: SalesQueryDto) {
    const items = await this.repo.getTopItems(query);

    // จัดกลุ่มตามหมวด แล้วคิดเปอร์เซ็นต์เทียบกับเมนูอันดับ 1 ของหมวดนั้น
    const categories = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        categoryTotal: number;
        items: Array<{
          name: string;
          quantity: number;
          totalAmount: number;
          percentage: number;
        }>;
      }
    >();

    for (const item of items) {
      let category = categories.get(item.categoryId);
      if (!category) {
        category = {
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          categoryTotal: item.categoryTotal,
          items: [],
        };
        categories.set(item.categoryId, category);
      }
      category.items.push({
        name: item.name,
        quantity: item.quantity,
        totalAmount: item.totalAmount,
        percentage: 0,
      });
    }

    const data = Array.from(categories.values()).map((category) => {
      const maxAmount = category.items.length
        ? Math.max(...category.items.map((i) => i.totalAmount))
        : 0;

      return {
        ...category,
        items: category.items.map((i) => ({
          ...i,
          percentage:
            maxAmount > 0 ? Math.round((i.totalAmount / maxAmount) * 100) : 0,
        })),
      };
    });

    return { status: 'success', data };
  }

  async getTransactions(query: SalesQueryDto) {
    const data = await this.repo.getTransactions(query);
    return { status: 'success', data };
  }

  async getReceiptLines(paymentId: string) {
    const data = await this.repo.getReceiptLines(paymentId);
    return { status: 'success', data };
  }
}
