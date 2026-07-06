import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { Subject, combineLatest } from 'rxjs';
import {
  takeUntil,
  debounceTime,
  distinctUntilChanged,
  startWith,
  map,
  filter,
} from 'rxjs/operators';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { AlertasService, AlertasEstatisticas } from '../alertas.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { ZardTableImports } from '@/shared/components/table';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { NotificationService } from '../../../core/services/notification.service';
import { Alerta } from '../../../core/models/alerta.model';

Chart.register(...registerables);

interface TipoFilter {
  value: string;
  label: string;
  icon: string;
}

const TIPO_FILTERS: TipoFilter[] = [
  { value: '', label: 'Todos', icon: 'error' },
  { value: 'atraso', label: 'Atraso', icon: 'schedule' },
  { value: 'ausencia', label: 'Ausência', icon: 'person_off' },
  { value: 'coacao', label: 'Coação', icon: 'warning' },
  { value: 'sabotagem', label: 'Sabotagem', icon: 'gpp_bad' },
];

interface GravidadeFilter {
  value: string;
  label: string;
}

const GRAVIDADE_FILTERS: GravidadeFilter[] = [
  { value: '', label: 'Todas' },
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
];

interface StatusFilter {
  value: string;
  label: string;
}

const STATUS_FILTERS: StatusFilter[] = [
  { value: '', label: 'Todos' },
  { value: 'aberto', label: 'Aberto' },
  { value: 'reconhecido', label: 'Reconhecido' },
  { value: 'encerrado', label: 'Encerrado' },
];

@Component({
  selector: 'gp-alertas-list',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    MatTabsModule,
    ZardTableImports,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDialogModule,
    MatTooltipModule,
    MatChipsModule,
    LoadingSpinner,
    StatusBadge,
    EmptyState,
  ],
  templateUrl: './alertas-list.component.html',
  styleUrl: './alertas-list.component.scss',
})
export class AlertasListComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly alertasService = inject(AlertasService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly tipoControl = new FormControl('', { nonNullable: true });
  readonly gravidadeControl = new FormControl('', { nonNullable: true });
  readonly statusControl = new FormControl('', { nonNullable: true });

  readonly tipoFilters = TIPO_FILTERS;
  readonly gravidadeFilters = GRAVIDADE_FILTERS;
  readonly statusFilters = STATUS_FILTERS;

  readonly alertas$ = this.alertasService.alertas$;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly statsLoading = signal(false);

  readonly activeTab = signal(0);

  readonly filteredAlertas$ = combineLatest([
    this.alertas$,
    this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
    ),
    this.tipoControl.valueChanges.pipe(startWith('')),
    this.gravidadeControl.valueChanges.pipe(startWith('')),
    this.statusControl.valueChanges.pipe(startWith('')),
  ]).pipe(
    map(([alertas, busca, tipo, gravidade, status]) => {
      let result = alertas;

      if (tipo) {
        result = result.filter((a) => a.tipo === tipo);
      }

      if (gravidade) {
        result = result.filter((a) => a.gravidade === gravidade);
      }

      if (status) {
        result = result.filter((a) => a.status === status);
      }

      if (busca.trim()) {
        const lower = busca.toLowerCase().trim();
        result = result.filter(
          (a) =>
            a.mensagem.toLowerCase().includes(lower) ||
            a.tipo.toLowerCase().includes(lower),
        );
      }

      return result;
    }),
  );

  private readonly porTipoCanvas = viewChild<ElementRef<HTMLCanvasElement>>('porTipoCanvas');
  private readonly porGravidadeCanvas = viewChild<ElementRef<HTMLCanvasElement>>('porGravidadeCanvas');
  private readonly porStatusCanvas = viewChild<ElementRef<HTMLCanvasElement>>('porStatusCanvas');
  private readonly porDiaCanvas = viewChild<ElementRef<HTMLCanvasElement>>('porDiaCanvas');

  private porTipoChart: Chart | null = null;
  private porGravidadeChart: Chart | null = null;
  private porStatusChart: Chart | null = null;
  private porDiaChart: Chart | null = null;

  // Som e toast de coação agora disparam globalmente a partir do AlertasService
  // (funcionam em qualquer tela, não só aqui). Este signal só alimenta o destaque
  // visual local (badge no cabeçalho + linhas piscando na tabela).
  readonly coacaoCount = toSignal(
    this.alertas$.pipe(
      map((alertas) => alertas.filter((a) => a.tipo === 'coacao' && a.status === 'aberto').length),
    ),
    { initialValue: 0 },
  );

  ngOnInit(): void {
    this.carregarAlertas();
  }

  ngAfterViewInit(): void {
    this.carregarEstatisticas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destruirGraficos();
  }

  carregarAlertas(): void {
    this.loading.set(true);
    this.error.set(null);

    this.alertasService
      .listar()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (alertas) => {
          this.alertasService.substituirLista(alertas);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.message ?? 'Erro ao carregar alertas.');
          this.loading.set(false);
        },
      });
  }

  verDetalhes(alerta: Alerta): void {
    this.router.navigate(['/alertas', alerta.id]);
  }

  confirmarReconhecer(alerta: Alerta): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '420px',
      data: {
        title: 'Reconhecer alerta',
        message: `Deseja reconhecer este alerta?`,
        confirmLabel: 'Reconhecer',
        cancelLabel: 'Cancelar',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(
        takeUntil(this.destroy$),
        filter((confirmed) => confirmed),
      )
      .subscribe(() => this.reconhecer(alerta));
  }

  confirmarEncerrar(alerta: Alerta): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '420px',
      data: {
        title: 'Encerrar alerta',
        message: `Deseja encerrar este alerta?`,
        confirmLabel: 'Encerrar',
        cancelLabel: 'Cancelar',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(
        takeUntil(this.destroy$),
        filter((confirmed) => confirmed),
      )
      .subscribe(() => this.encerrar(alerta));
  }

  private reconhecer(alerta: Alerta): void {
    this.alertasService.reconhecer(alerta.id).subscribe({
      next: () => {
        this.alertasService.atualizarStatusLocal(alerta.id, 'reconhecido');
        this.notification.success('Alerta reconhecido com sucesso.');
      },
      error: (err) => {
        this.notification.error(err.message ?? 'Erro ao reconhecer alerta.');
      },
    });
  }

  private encerrar(alerta: Alerta): void {
    this.alertasService.encerrar(alerta.id).subscribe({
      next: () => {
        this.alertasService.atualizarStatusLocal(alerta.id, 'encerrado');
        this.notification.success('Alerta encerrado com sucesso.');
      },
      error: (err) => {
        this.notification.error(err.message ?? 'Erro ao encerrar alerta.');
      },
    });
  }

  isCoercaoAberto(alerta: Alerta): boolean {
    return alerta.tipo === 'coacao' && alerta.status === 'aberto';
  }

  tipoIcon(tipo: Alerta['tipo']): string {
    const icons: Record<Alerta['tipo'], string> = {
      atraso: 'schedule',
      ausencia: 'person_off',
      coacao: 'warning',
      sabotagem: 'gpp_bad',
    };
    return icons[tipo] ?? 'error';
  }

  tipoLabel(tipo: Alerta['tipo']): string {
    const labels: Record<Alerta['tipo'], string> = {
      atraso: 'Atraso',
      ausencia: 'Ausência',
      coacao: 'Coação',
      sabotagem: 'Sabotagem',
    };
    return labels[tipo] ?? tipo;
  }

  gravidadeLabel(g: Alerta['gravidade']): string {
    const map: Record<Alerta['gravidade'], string> = {
      baixa: 'Baixa',
      media: 'Média',
      alta: 'Alta',
      critica: 'Crítica',
    };
    return map[g] ?? g;
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

  onTabChange(index: number): void {
    this.activeTab.set(index);
    if (index === 1) {
      this.carregarEstatisticas();
    }
  }

  private carregarEstatisticas(): void {
    this.statsLoading.set(true);

    this.alertasService
      .listarEstatisticas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.statsLoading.set(false);
          setTimeout(() => this.renderizarGraficos(stats), 100);
        },
        error: () => {
          this.statsLoading.set(false);
          this.notification.warning(
            'Estatísticas ainda não disponíveis no servidor. Os gráficos serão exibidos quando os dados estiverem disponíveis.',
          );
        },
      });
  }

  private destruirGraficos(): void {
    this.porTipoChart?.destroy();
    this.porGravidadeChart?.destroy();
    this.porStatusChart?.destroy();
    this.porDiaChart?.destroy();
    this.porTipoChart = null;
    this.porGravidadeChart = null;
    this.porStatusChart = null;
    this.porDiaChart = null;
  }

  private renderizarGraficos(stats: AlertasEstatisticas): void {
    this.destruirGraficos();

    const configPorTipo: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: stats.porTipo.map((d) => this.tipoLabel(d.tipo as Alerta['tipo'])),
        datasets: [
          {
            data: stats.porTipo.map((d) => d.total),
            backgroundColor: ['#ff9800', '#9c27b0', '#f44336', '#ff5722'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    };

    const configPorGravidade: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: stats.porGravidade.map((d) => this.gravidadeLabel(d.gravidade as Alerta['gravidade'])),
        datasets: [
          {
            label: 'Total',
            data: stats.porGravidade.map((d) => d.total),
            backgroundColor: ['#4caf50', '#ff9800', '#f44336', '#b71c1c'],
            borderWidth: 0,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
        plugins: {
          legend: { display: false },
        },
      },
    };

    const configPorStatus: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: stats.porStatus.map((d) => {
          const labels: Record<string, string> = {
            aberto: 'Aberto',
            reconhecido: 'Reconhecido',
            encerrado: 'Encerrado',
          };
          return labels[d.status] ?? d.status;
        }),
        datasets: [
          {
            data: stats.porStatus.map((d) => d.total),
            backgroundColor: ['#e65100', '#1565c0', '#2e7d32'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    };

    const configPorDia: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: stats.porDia.map((d) => d.data),
        datasets: [
          {
            label: 'Alertas',
            data: stats.porDia.map((d) => d.total),
            borderColor: '#1a237e',
            backgroundColor: 'rgba(26, 35, 126, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: '#1a237e',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
        plugins: {
          legend: { display: false },
        },
      },
    };

    const tipoCanvas = this.porTipoCanvas()?.nativeElement;
    if (tipoCanvas) this.porTipoChart = new Chart(tipoCanvas, configPorTipo);

    const gravidadeCanvas = this.porGravidadeCanvas()?.nativeElement;
    if (gravidadeCanvas) this.porGravidadeChart = new Chart(gravidadeCanvas, configPorGravidade);

    const statusCanvas = this.porStatusCanvas()?.nativeElement;
    if (statusCanvas) this.porStatusChart = new Chart(statusCanvas, configPorStatus);

    const diaCanvas = this.porDiaCanvas()?.nativeElement;
    if (diaCanvas) this.porDiaChart = new Chart(diaCanvas, configPorDia);
  }
}
