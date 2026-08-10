import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { map } from 'rxjs/operators';
import { NgIcon } from '@ng-icons/core';
import { DashboardService } from './dashboard.service';

import { KpiCard } from './components/kpi-card/kpi-card';
import { DashboardMapaComponent } from './components/dashboard-mapa/dashboard-mapa';
import { CoberturaPostos } from './components/cobertura-postos/cobertura-postos';
import { FeedEventos } from './components/feed-eventos/feed-eventos';
import { ZardSkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

@Component({
  selector: 'gp-dashboard',
  imports: [
    AsyncPipe,
    NgIcon,
    KpiCard,
    DashboardMapaComponent,
    CoberturaPostos,
    FeedEventos,
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
  readonly summary$ = this.dashboardService.summary$;

  readonly kpis$ = this.summary$.pipe(map((s) => s?.kpis ?? null));
  readonly postosSemCobertura$ = this.summary$.pipe(map((s) => s?.postosSemCobertura ?? []));
  readonly feedEventos$ = this.summary$.pipe(map((s) => s?.feedEventos ?? []));

  ngOnInit(): void {
    this.dashboardService.startPolling();
  }

  ngOnDestroy(): void {
    this.dashboardService.stopPolling();
  }

  retry(): void {
    this.dashboardService.refresh();
  }
}
