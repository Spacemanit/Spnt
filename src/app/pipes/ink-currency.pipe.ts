import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'inkCurrency', standalone: true })
export class InkCurrencyPipe implements PipeTransform {
  transform(value: number | string | null | undefined, currency = 'USD'): string {
    const num = typeof value === 'string' ? Number(value) : (value ?? 0);
    const safe = Number.isFinite(num) ? num : 0;
    try {
      return safe.toLocaleString('en-US', { style: 'currency', currency });
    } catch {
      return safe.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    }
  }
}
