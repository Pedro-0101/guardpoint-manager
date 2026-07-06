import { Directive, computed, input } from '@angular/core';

import type { ClassValue } from 'clsx';

import { mergeClasses } from '@/shared/utils/merge-classes';

import { inputVariants, type ZardInputVariants } from './input.variants';

@Directive({
  selector: 'input[z-input], textarea[z-input], select[z-input]',
  host: {
    '[class]': 'classes()',
  },
  exportAs: 'zInput',
})
export class ZardInputDirective {
  readonly zError = input<ZardInputVariants['zError']>(false);
  readonly class = input<ClassValue>('');

  protected readonly classes = computed(() =>
    mergeClasses(inputVariants({ zError: this.zError() }), this.class()),
  );
}
