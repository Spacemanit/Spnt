import { Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-ink-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="ink-card-flat px-4 py-3">
      <div class="flex items-center justify-between gap-3">
        <a routerLink="/" class="font-ledger text-xl font-black tracking-tight">SPNT<span aria-hidden="true">.</span></a>
        <p class="font-mono-ink hidden text-[11px] tracking-[0.2em] uppercase opacity-70 sm:block">E-INK LEDGER — {{ today() }}</p>
        <div class="flex items-center gap-2 no-print">
          <button type="button" class="ink-btn-ghost px-3 py-1.5 font-mono-ink text-xs uppercase" (click)="toggleInvert()">
            {{ inverted() ? 'Paper' : 'Invert' }}
          </button>
          @if (userId()) {
            <a [routerLink]="['/profile', userId()]" class="ink-btn-ghost px-3 py-1.5 font-mono-ink text-xs uppercase">Index</a>
            <button type="button" class="ink-btn px-3 py-1.5 font-mono-ink text-xs uppercase" (click)="logout()">Off</button>
          } @else {
            <a routerLink="/auth" class="ink-btn px-3 py-1.5 font-mono-ink text-xs uppercase">Enter</a>
          }
        </div>
      </div>
      <div class="ink-hr-dashed mt-3"></div>
      <div class="mt-2 flex items-center justify-between font-mono-ink text-[11px] uppercase tracking-widest opacity-70">
        <span>PG. {{ page() }}</span>
        <span class="hidden sm:inline">No gradients / No blur</span>
        <span>{{ entriesLabel() }}</span>
      </div>
    </header>
  `,
})
export class InkHeader {
  private router = inject(Router);
  userId = input<string | null>(null);
  page = input<string>('01');
  entriesLabel = input<string>('LEDGER');
  today = signal(new Date().toISOString().slice(0, 10));
  inverted = signal(
    typeof document !== 'undefined' && document.documentElement.classList.contains('ink-invert')
  );

  toggleInvert(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('ink-invert');
    this.inverted.set(document.documentElement.classList.contains('ink-invert'));
    try {
      localStorage.setItem('ink-invert', this.inverted() ? '1' : '0');
    } catch { /* noop */ }
  }

  logout(): void {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
    } catch { /* noop */ }
    void this.router.navigate(['/auth']);
  }
}
