import { ChangeDetectionStrategy, Component, HostListener, computed, input, signal } from '@angular/core';
import { ChartData, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { DataList } from '../../../models/DataList.type';

@Component({
  selector: 'app-chart',
  imports: [BaseChartDirective],
  templateUrl: './chart.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ``,
})
export class Chart {
  dataList = input<DataList[]>([]);
  isXl = signal(this.getIsXlViewport());

  categorySums = computed(() =>
    this.dataList().reduce((acc, item) => {
      const { category, money } = item;
      acc[category] = (acc[category] || 0) + money;
      return acc;
    }, {} as Record<string, number>)
  );

  doughnutChartData = computed<ChartData<'doughnut'>>(() => {
    const sums = this.categorySums();

    return {
      labels: Object.keys(sums),
      datasets: [
        {
          data: Object.values(sums),
          backgroundColor: ['#4F46E5', '#06B6D4', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6', '#EC4899', '#3B82F6'],
          borderWidth: 0,
        },
      ],
    };
  });

  doughnutChartOptions = computed<ChartOptions<'doughnut'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '50%',
    plugins: {
      legend: {
        position: this.isXl() ? 'bottom' : 'right',
      },
    },
  }));

  @HostListener('window:resize')
  onResize() {
    this.isXl.set(this.getIsXlViewport());
  }

  private getIsXlViewport() {
    return typeof window !== 'undefined' && window.matchMedia('(min-width: 1100px)').matches;
  }
}
