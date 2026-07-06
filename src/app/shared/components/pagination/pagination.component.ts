import { ChangeDetectionStrategy, Component, computed, input, output, ViewEncapsulation } from '@angular/core';
import type { ClassValue } from 'clsx';
import { mergeClasses } from '@/shared/utils/merge-classes';
import { ZardButtonComponent } from '@/shared/components/button/button.component';

@Component({
  selector: 'z-pagination',
  imports: [ZardButtonComponent],
  template: `
    <nav class="flex items-center justify-between gap-2" [class]="classes()">
      <span class="text-sm text-muted-foreground">
        Página {{ currentPage() }} de {{ totalPages() }}
      </span>
      <div class="flex gap-1">
        <button z-button zType="outline" zSize="sm" [zDisabled]="currentPage() <= 1" (click)="onPageChange(1)">Início</button>
        <button z-button zType="outline" zSize="sm" [zDisabled]="currentPage() <= 1" (click)="onPageChange(currentPage() - 1)">Anterior</button>
        @for (page of visiblePages(); track page) {
          <button
            z-button
            [zType]="page === currentPage() ? 'default' : 'outline'"
            zSize="sm"
            (click)="onPageChange(page)"
          >{{ page }}</button>
        }
        <button z-button zType="outline" zSize="sm" [zDisabled]="currentPage() >= totalPages()" (click)="onPageChange(currentPage() + 1)">Próximo</button>
        <button z-button zType="outline" zSize="sm" [zDisabled]="currentPage() >= totalPages()" (click)="onPageChange(totalPages())">Fim</button>
      </div>
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  exportAs: 'zPagination',
})
export class ZardPaginationComponent {
  readonly totalItems = input(0);
  readonly pageSize = input(10);
  readonly currentPage = input(1);
  readonly maxVisiblePages = input(5);
  readonly class = input<ClassValue>('');

  readonly pageChange = output<number>();

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize())));
  protected readonly classes = computed(() => mergeClasses('', this.class()));

  protected readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const max = this.maxVisiblePages();
    const half = Math.floor(max / 2);
    let start = Math.max(1, current - half);
    let end = Math.min(total, start + max - 1);
    if (end - start + 1 < max) start = Math.max(1, end - max + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.pageChange.emit(page);
  }
}
