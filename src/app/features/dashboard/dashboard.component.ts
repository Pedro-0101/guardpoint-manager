import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { map } from 'rxjs/operators';
import { NgIcon } from '@ng-icons/core';
import { DashboardService } from './dashboard.service';

import { KpiCard } from './components/kpi-card/kpi-card';
import { DashboardTabela } from './components/dashboard-tabela/dashboard-tabela';
import { ZardSkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

const PAGE_SIZE = 20;

@Component({
  selector: 'gp-dashboard',
  imports: [
    AsyncPipe,
    NgIcon,
    KpiCard,
    DashboardTabela,
    ZardSkeletonComponent,
  ],
  providers: [DashboardService],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);

  readonly loading$ = this.dashboardService.loading$;
  readonly error$ = this.dashboardService.error$;
  readonly table$ = this.dashboardService.table$;

  readonly kpis$ = this.table$.pipe(map((t) => t?.summary.kpis ?? null));
  readonly linhas$ = this.table$.pipe(map((t) => t?.linhas ?? []));
  readonly total$ = this.table$.pipe(map((t) => t?.total ?? 0));

  readonly pagina = signal(1);

  ngOnInit(): void {
    this.dashboardService.startPolling(PAGE_SIZE, 0);
  }

  ngOnDestroy(): void {
    this.dashboardService.stopPolling();
  }

  retry(): void {
    this.dashboardService.refresh();
  }

  onPageChange(page: number): void {
    this.pagina.set(page);
    this.dashboardService.changePage(page);
  }
}
