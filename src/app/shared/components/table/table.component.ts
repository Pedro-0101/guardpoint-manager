import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from '@angular/core';

import type { ClassValue } from 'clsx';

import { tableVariants } from './table.variants';
import { mergeClasses } from '@/shared/utils/merge-classes';

@Component({
  selector: 'table[z-table]',
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
  },
  exportAs: 'zTable',
})
export class ZardTableComponent {
  readonly class = input<ClassValue>('');

  protected readonly classes = computed(() => mergeClasses(tableVariants(), this.class()));
}
