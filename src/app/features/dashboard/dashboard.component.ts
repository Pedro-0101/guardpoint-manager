import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DashboardService } from './dashboard.service';
import { ZardTableImports } from '@/shared/components/table';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { ZardSkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { StatusBadge, StatusType } from '../../shared/components/status-badge/status-badge';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout';
import { DashboardLinha } from './dashboard.types';

const PAGE_LIMIT = 20;

@Component({
  selector: 'gp-dashboard',
  imports: [
    NgIcon,
    ZardTableImports,
    ZardButtonComponent,
    ZardSkeletonComponent,
    StatusBadge,
    EmptyState,
    PageLayoutComponent,
  ],
  providers: [DashboardService],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  readonly linhas = signal<DashboardLinha[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly totalPages = computed(() => Math.ceil(this.total() / PAGE_LIMIT));

  ngOnInit(): void {
    this.carregarTabela();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarTabela(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dashboardService
      .fetchTable(PAGE_LIMIT, this.page() * PAGE_LIMIT)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.linhas.set(res.linhas);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message ?? 'Erro ao carregar dados.');
          this.loading.set(false);
        },
      });

    this.dashboardService.startWsRefresh(PAGE_LIMIT, this.page() * PAGE_LIMIT)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        this.linhas.set(res.linhas);
        this.total.set(res.total);
      });
  }

  voltarPagina(): void {
    if (this.page() > 0) {
      this.page.update((p) => p - 1);
      this.carregarTabela();
    }
  }

  avancarPagina(): void {
    if (this.page() < this.totalPages() - 1) {
      this.page.update((p) => p + 1);
      this.carregarTabela();
    }
  }

  verDetalhe(turnoId: string): void {
    this.router.navigate(['/turnos', turnoId]);
  }

  statusMap(status: string): StatusType {
    const map: Record<string, StatusType> = {
      agendado: 'agendado',
      em_andamento: 'em_andamento',
      pausado: 'pausado',
      finalizado: 'finalizado',
      critico: 'critico',
    };
    return map[status] ?? 'pendente';
  }

  formatarData(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
