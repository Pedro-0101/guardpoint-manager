import { Component, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'gp-kpi-card',
  imports: [NgIcon],
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.scss',
})
export class KpiCard {
  icon = input.required<string>();
  value = input.required<number>();
  label = input.required<string>();
  color = input<'primary' | 'accent' | 'warn' | 'info'>('primary');
}
