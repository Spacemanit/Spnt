import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
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
          backgroundColor: ['#4F46E5', '#06B6D4', '#F59E0B', '#EF4444'],
          borderWidth: 0,
        },
      ],
    };
  });

  doughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    cutout: '70%',
    plugins: {
      legend: { position: 'bottom' }
    }
  };
}
