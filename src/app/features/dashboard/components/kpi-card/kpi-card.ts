import { Component, input } from '@angular/core';

@Component({
  selector: 'gp-kpi-card',
  imports: [],
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.scss',
})
export class KpiCard {
  icon = input.required<string>();
  value = input.required<number>();
  label = input.required<string>();
  color = input<'primary' | 'accent' | 'warn' | 'info'>('primary');
}
