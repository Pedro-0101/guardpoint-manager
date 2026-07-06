import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ZardToastComponent } from '@/shared/components/toast/toast.component';

@Component({
  selector: 'gp-root',
  imports: [RouterOutlet, ZardToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
