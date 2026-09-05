import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InkToasts } from './components/ink-toasts';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, InkToasts],
  template: `<div class="ink-wrap"><app-ink-toasts /><router-outlet /></div>`,
  styles: '',
})
export class App {
}
