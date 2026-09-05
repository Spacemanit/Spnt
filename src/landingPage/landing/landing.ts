import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InkHeader } from '../../app/components/ink-header';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, InkHeader],
  templateUrl: './landing.html',
  styles: ``,
})
export class Landing {}
