import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Landing } from '../landingPage/landing/landing';
import { Home } from '../homePage/home/home';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styles: ''
})
export class App {
  protected readonly title = signal('Spnt');
}
