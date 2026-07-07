import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from '@angular/core';
import type { ClassValue } from 'clsx';
import { mergeClasses } from '@/shared/utils/merge-classes';

@Component({
  selector: 'z-divider',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    role: 'separator',
    '[attr.aria-orientation]': '"horizontal"',
  },
  exportAs: 'zDivider',
})
export class ZardDividerComponent {
  readonly zSpacing = input<'none' | 'sm' | 'default' | 'lg'>('default');
  readonly class = input<ClassValue>('');

  private readonly spacingMap: Record<string, string> = {
    none: 'my-0',
    sm: 'my-1',
    default: 'my-2',
    lg: 'my-4',
  };

  protected readonly classes = computed(() =>
    mergeClasses('h-px w-full bg-border', this.spacingMap[this.zSpacing()], this.class()),
  );
}
