import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from '@angular/core';
import type { ClassValue } from 'clsx';
import { mergeClasses } from '@/shared/utils/merge-classes';

@Component({
  selector: '[z-menu-content]',
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    role: 'menu',
  },
  exportAs: 'zMenuContent',
})
export class ZardMenuContentComponent {
  readonly class = input<ClassValue>('');

  protected readonly classes = computed(() =>
    mergeClasses(
      'z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md',
      this.class(),
    ),
  );
}
