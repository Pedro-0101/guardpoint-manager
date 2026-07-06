import { ChangeDetectionStrategy, Component, computed, input, TemplateRef, ViewEncapsulation } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NgIcon } from '@ng-icons/core';

import type { ClassValue } from 'clsx';

import { mergeClasses } from '@/shared/utils/merge-classes';

import { emptyVariants, emptyIconVariants, emptyTitleVariants, emptyDescriptionVariants } from './empty.variants';

@Component({
  selector: 'z-empty',
  template: `
    @if (zIcon()) {
      <span [class]="iconClasses()">
        @if (isTemplateIcon()) {
          <ng-container *ngTemplateOutlet="$any(zIcon())" />
        } @else {
          <ng-icon [name]="iconName()" />
        }
      </span>
    }
    @if (zTitle()) {
      <h3 [class]="titleClasses()">{{ zTitle() }}</h3>
    }
    @if (zDescription()) {
      <p [class]="descriptionClasses()">{{ zDescription() }}</p>
    }
    <ng-content />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, NgIcon],
  host: {
    '[class]': 'classes()',
  },
  exportAs: 'zEmpty',
})
export class ZardEmptyComponent {
  readonly class = input<ClassValue>('');
  readonly zIcon = input<string | TemplateRef<void>>('lucideInbox');
  readonly zTitle = input('Nenhum registro encontrado');
  readonly zDescription = input<string>();

  protected readonly isTemplateIcon = computed(() => this.zIcon() instanceof TemplateRef);
  protected readonly iconName = computed(() => this.zIcon() as string);

  protected readonly classes = computed(() => mergeClasses(emptyVariants(), this.class()));
  protected readonly iconClasses = computed(() => emptyIconVariants());
  protected readonly titleClasses = computed(() => emptyTitleVariants());
  protected readonly descriptionClasses = computed(() => emptyDescriptionVariants());
}
