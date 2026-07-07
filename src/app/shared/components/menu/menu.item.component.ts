import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from '@angular/core';
import type { ClassValue } from 'clsx';
import { mergeClasses } from '@/shared/utils/merge-classes';

@Component({
  selector: '[z-menu-item]',
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '[attr.disabled]': 'zDisabled() ? "" : null',
    '[attr.aria-disabled]': 'zDisabled()',
    role: 'menuitem',
    tabindex: '-1',
  },
  exportAs: 'zMenuItem',
})
export class ZardMenuItemComponent {
  readonly zDisabled = input<boolean>(false);
  readonly class = input<ClassValue>('');

  protected readonly classes = computed(() =>
    mergeClasses(
      'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-accent hover:text-accent-foreground',
      this.zDisabled() ? 'pointer-events-none opacity-50' : '',
      this.class(),
    ),
  );
}
