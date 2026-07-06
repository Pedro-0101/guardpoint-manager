import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from '@angular/core';

import type { ClassValue } from 'clsx';

import { mergeClasses } from '@/shared/utils/merge-classes';

import { buttonVariants, type ZardButtonSizeVariants, type ZardButtonTypeVariants } from './button.variants';

@Component({
  selector: 'button[z-button], a[z-button]',
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '[attr.disabled]': 'zDisabled() ? "" : null',
  },
  exportAs: 'zButton',
})
export class ZardButtonComponent {
  readonly zType = input<ZardButtonTypeVariants>('default');
  readonly zSize = input<ZardButtonSizeVariants>('default');
  readonly zDisabled = input<boolean>(false);
  readonly class = input<ClassValue>('');

  protected readonly classes = computed(() =>
    mergeClasses(buttonVariants({ zType: this.zType(), zSize: this.zSize() }), this.class()),
  );
}
