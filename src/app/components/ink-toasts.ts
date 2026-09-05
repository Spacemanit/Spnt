import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast-service';

@Component({
  selector: 'app-ink-toasts',
  standalone: true,
  template: `
    <div class="fixed top-4 right-4 z-50 flex w-72 flex-col gap-2 no-print">
      @for (t of toast.toasts(); track t.id) {
        <div class="ink-card-flat px-3 py-2" role="status">
          <div class="flex items-start justify-between gap-2">
            <p class="font-mono-ink text-[11px] font-bold tracking-widest uppercase">
              @if (t.kind === 'success') { [ OK ] } @else if (t.kind === 'error') { [ ERR ] } @else { [ INFO ] }
            </p>
            <button type="button" class="font-mono-ink text-xs" (click)="toast.dismiss(t.id)" aria-label="Dismiss">x</button>
          </div>
          <p class="mt-1 text-sm">{{ t.message }}</p>
        </div>
      }
    </div>
  `,
})
export class InkToasts {
  toast = inject(ToastService);
}
