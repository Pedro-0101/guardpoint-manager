import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, catchError, finalize, filter, take } from 'rxjs/operators';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { RelatoriosService } from './relatorios.service';
import { PostosService } from '../postos/postos.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { AlertasService } from '../alertas/alertas.service';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { ZardTableImports } from '@/shared/components/table';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { ZardInputDirective } from '@/shared/components/input';
import { ZardCardComponent } from '@/shared/components/card/card.component';
import { ZardSelectImports } from '@/shared/components/select';
import { ZardPaginationComponent } from '@/shared/components/pagination/pagination.component';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { Turno } from '../../core/models/turno.model';
import { Posto } from '../../core/models/posto.model';
import { Usuario } from '../../core/models/usuario.model';
import { Alerta } from '../../core/models/alerta.model';

Chart.register(...registerables);

interface StatusFilter {
  value: string;
  label: string;
}

const STATUS_FILTERS: StatusFilter[] = [
  { value: '', label: 'Todos' },
  { value: 'agendado', label: 'Agendado' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'pausado', label: 'Pausado' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'critico', label: 'Crítico' },
];

@Component({
  selector: 'gp-relatorios',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ZardTableImports,
    ZardButtonComponent,
    ZardInputDirective,
    ZardCardComponent,
    ZardSelectImports,
    NgIcon,
    ZardPaginationComponent,
    LoadingSpinner,
    EmptyState,
    StatusBadge,
  ],
  templateUrl: './relatorios.component.html',
  styleUrl: './relatorios.component.scss',
})
export class RelatoriosComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly relatoriosService = inject(RelatoriosService);
  private readonly postosService = inject(PostosService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly alertasService = inject(AlertasService);
  private readonly destroy$ = new Subject<void>();

  readonly dataInicioControl = new FormControl('', { nonNullable: true });
  readonly dataFimControl = new FormControl('', { nonNullable: true });
  readonly postoControl = new FormControl('', { nonNullable: true });
  readonly usuarioControl = new FormControl('', { nonNullable: true });
  readonly statusControl = new FormControl('', { nonNullable: true });

  readonly statusFilters = STATUS_FILTERS;

  readonly dataSource = signal<Turno[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly error = signal<string | null>(null);

  readonly postos = signal<Posto[]>([]);
  readonly usuarios = signal<Usuario[]>([]);

  readonly pageSize = signal(10);
  readonly pageIndex = signal(0);
  readonly pageSizeOptions = [10, 25, 50, 100];

  private readonly turnosPorDiaCanvas = viewChild<ElementRef<HTMLCanvasElement>>('turnosPorDiaCanvas');
  private readonly alertasPorMesCanvas = viewChild<ElementRef<HTMLCanvasElement>>('alertasPorMesCanvas');

  private turnosPorDiaChart: Chart | null = null;
  private alertasPorMesChart: Chart | null = null;

  ngOnInit(): void {
    this.carregarFiltros();
    this.buscar();
    this.carregarAlertasPorMes();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.renderizarGraficos(), 150);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destruirGraficos();
  }

  carregarFiltros(): void {
    forkJoin([this.postosService.listar(), this.usuariosService.listar()])
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => {
          return [];
        }),
      )
      .subscribe(([postos, usuarios]) => {
        this.postos.set(postos ?? []);
        this.usuarios.set(usuarios ?? []);
      });
  }

  buscar(): void {
    this.loading.set(true);
    this.error.set(null);

    const limit = this.pageSize();
    const offset = this.pageIndex() * limit;

    this.relatoriosService
      .listarHistorico(
        {
          dataInicio: this.dataInicioControl.value || undefined,
          dataFim: this.dataFimControl.value || undefined,
          postoId: this.postoControl.value || undefined,
          usuarioId: this.usuarioControl.value || undefined,
          status: this.statusControl.value || undefined,
        },
        { limit, offset },
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (pagina) => {
          this.dataSource.set(pagina.turnos);
          this.total.set(pagina.total);
          setTimeout(() => this.renderizarGraficos(), 100);
        },
        error: (err) => {
          this.error.set(err.message ?? 'Erro ao carregar histórico.');
        },
      });
  }

  limparFiltros(): void {
    this.dataInicioControl.setValue('');
    this.dataFimControl.setValue('');
    this.postoControl.setValue('');
    this.usuarioControl.setValue('');
    this.statusControl.setValue('');
    this.pageIndex.set(0);
    this.buscar();
  }

  onPageChange(page: number): void {
    this.pageIndex.set(page - 1);
    this.buscar();
  }

  async exportarCSV(): Promise<void> {
    const turnos = this.dataSource();
    if (turnos.length === 0) return;

    this.exporting.set(true);

    const headers = ['Vigia', 'Posto', 'Status', 'Início Previsto', 'Fim Previsto', 'Início Real', 'Fim Real', 'Criado em'];
    const rows = turnos.map((t) => [
      this.escapeCsv(t.usuarioNome),
      this.escapeCsv(t.postoNome),
      t.status,
      this.formatarData(t.inicioPrevisto),
      this.formatarData(t.fimPrevisto),
      t.inicioReal ? this.formatarData(t.inicioReal) : '—',
      t.fimReal ? this.formatarData(t.fimReal) : '—',
      this.formatarData(t.createdAt),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, `turnos-historico-${new Date().toISOString().slice(0, 10)}.csv`);
    this.exporting.set(false);
  }

  async exportarPDF(): Promise<void> {
    const turnos = this.dataSource();
    if (turnos.length === 0) return;

    this.exporting.set(true);

    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text('Histórico de Turnos', 14, 16);

      const columns = ['Vigia', 'Posto', 'Status', 'Início Previsto', 'Fim Previsto', 'Início Real', 'Fim Real'];
      const rows = turnos.map((t) => [
        t.usuarioNome,
        t.postoNome,
        t.status,
        this.formatarData(t.inicioPrevisto),
        this.formatarData(t.fimPrevisto),
        t.inicioReal ? this.formatarData(t.inicioReal) : '—',
        t.fimReal ? this.formatarData(t.fimReal) : '—',
      ]);

      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 22,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [26, 35, 126], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 30 },
          2: { cellWidth: 22 },
          3: { cellWidth: 28 },
          4: { cellWidth: 28 },
          5: { cellWidth: 28 },
          6: { cellWidth: 28 },
        },
      });

      doc.save(`turnos-historico-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      this.error.set('Erro ao gerar PDF. Verifique a conexão e tente novamente.');
    } finally {
      this.exporting.set(false);
    }
  }

  formatarData(iso: string): string {
    if (!iso) return '—';
    const date = new Date(iso);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private carregarAlertasPorMes(): void {
    this.alertasService.alertas$
      .pipe(
        filter((alertas) => alertas.length > 0),
        take(1),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.renderizarGraficos());
  }

  private renderizarGraficos(): void {
    this.renderTurnosPorDia();
    this.renderAlertasPorMes();
  }

  private renderTurnosPorDia(): void {
    const canvas = this.turnosPorDiaCanvas()?.nativeElement;
    if (!canvas) return;

    if (this.turnosPorDiaChart) {
      this.turnosPorDiaChart.destroy();
    }

    const turnos = this.dataSource();
    if (turnos.length === 0) {
      this.turnosPorDiaChart = null;
      return;
    }

    const grouped = new Map<string, number>();
    for (const t of turnos) {
      const day = t.inicioPrevisto.slice(0, 10);
      grouped.set(day, (grouped.get(day) ?? 0) + 1);
    }

    const sorted = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: sorted.map(([day]) => {
          const [y, m, d] = day.split('-');
          return `${d}/${m}/${y.slice(2)}`;
        }),
        datasets: [
          {
            label: 'Turnos',
            data: sorted.map(([, count]) => count),
            backgroundColor: 'rgba(26, 35, 126, 0.75)',
            borderColor: 'rgba(26, 35, 126, 1)',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.raw as number;
                return `${v} turno${v !== 1 ? 's' : ''}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: '#757575' },
            grid: { color: '#f0f0f0' },
          },
          x: {
            ticks: { color: '#757575', maxRotation: 45 },
            grid: { display: false },
          },
        },
      },
    };

    this.turnosPorDiaChart = new Chart(canvas, config);
  }

  private renderAlertasPorMes(): void {
    const canvas = this.alertasPorMesCanvas()?.nativeElement;
    if (!canvas) return;

    if (this.alertasPorMesChart) {
      this.alertasPorMesChart.destroy();
    }

    this.alertasService.alertas$
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe({
        next: (alertas) => {
          this.doRenderAlertasPorMes(canvas, alertas);
        },
      });
  }

  private doRenderAlertasPorMes(canvas: HTMLCanvasElement, alertas: Alerta[]): void {
    if (alertas.length === 0) {
      this.alertasPorMesChart = null;
      return;
    }

    const grouped = new Map<string, number>();
    for (const a of alertas) {
      const month = a.createdAt.slice(0, 7);
      grouped.set(month, (grouped.get(month) ?? 0) + 1);
    }

    const sorted = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: sorted.map(([month]) => {
          const [y, m] = month.split('-');
          return `${m}/${y.slice(2)}`;
        }),
        datasets: [
          {
            label: 'Alertas',
            data: sorted.map(([, count]) => count),
            backgroundColor: 'rgba(229, 57, 53, 0.75)',
            borderColor: 'rgba(229, 57, 53, 1)',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.raw as number;
                return `${v} alerta${v !== 1 ? 's' : ''}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: '#757575' },
            grid: { color: '#f0f0f0' },
          },
          x: {
            ticks: { color: '#757575' },
            grid: { display: false },
          },
        },
      },
    };

    this.alertasPorMesChart = new Chart(canvas, config);
  }

  private destruirGraficos(): void {
    this.turnosPorDiaChart?.destroy();
    this.alertasPorMesChart?.destroy();
    this.turnosPorDiaChart = null;
    this.alertasPorMesChart = null;
  }

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
