import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartData, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { DataList } from '../../../models/DataList.type';

const INK_GRAYS = ['#141412', '#3d3d3a', '#6b6b68', '#9a9a96', '#c9c5b8', '#e8e5dc'];

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

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
      const key = (item.category || 'Uncategorized').trim() || 'Uncategorized';
      acc[key] = (acc[key] || 0) + (item.money || 0);
      return acc;
    }, {} as Record<string, number>)
  );

  doughnutChartData = computed<ChartData<'doughnut'>>(() => {
    const sums = this.categorySums();
    const labels = Object.keys(sums).sort((a, b) => sums[b] - sums[a]).slice(0, 8);
    return {
      labels,
      datasets: [
        {
          data: labels.map((l) => sums[l]),
          backgroundColor: labels.map((_, i) => INK_GRAYS[i % INK_GRAYS.length]),
          borderColor: '#faf9f6',
          borderWidth: 2,
          hoverOffset: 0,
        },
      ],
    };
  });

  doughnutChartOptions = computed<ChartOptions<'doughnut'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: false,
          font: { family: 'IBM Plex Mono', size: 11 },
          color: cssVar('--ink', '#141412'),
        },
      },
      tooltip: {
        backgroundColor: '#141412',
        titleFont: { family: 'IBM Plex Mono' },
        bodyFont: { family: 'IBM Plex Mono' },
        cornerRadius: 0,
        displayColors: false,
      },
    },
  }));

  trendData = computed<ChartData<'bar'>>(() => {
    const byMonth = new Map<string, number>();
    for (const item of this.dataList()) {
      const d = new Date(item.date);
      if (Number.isNaN(d.getTime())) continue;
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth.set(k, (byMonth.get(k) ?? 0) + (item.money || 0));
    }
    const keys = [...byMonth.keys()].sort().slice(-8);
    return {
      labels: keys,
      datasets: [{ data: keys.map((k) => byMonth.get(k) ?? 0), backgroundColor: '#141412', borderWidth: 0 }],
    };
  });

  trendOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { font: { family: 'IBM Plex Mono', size: 10 } }, grid: { display: false } },
      y: { ticks: { font: { family: 'IBM Plex Mono', size: 10 } }, grid: { color: '#d8d5cc' } },
    },
  };
}
