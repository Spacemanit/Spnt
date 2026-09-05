import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export type Toast = { id: number; kind: ToastKind; message: string };

let toastSeq = 1;

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  show(kind: ToastKind, message: string, ms = 2600): void {
    const id = toastSeq++;
    this.toasts.update((t) => [...t, { id, kind, message }]);
    const timer = setTimeout(() => this.dismiss(id), ms);
    this.timers.set(id, timer);
  }

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('error', message);
  }

  info(message: string): void {
    this.show('info', message);
  }

  dismiss(id: number): void {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }
}
