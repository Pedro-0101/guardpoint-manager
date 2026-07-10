import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { Router } from '@angular/router';
import { Subject, merge } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import { TurnosService } from '../turnos.service';
import { PostosService } from '../../postos/postos.service';
import { UsuariosService } from '../../usuarios/usuarios.service';
import { SubstituicoesFormComponent } from '../../substituicoes/substituicoes-form.component';
import { ZardDialogService } from '@/shared/components/dialog';
import { ZardDatePickerComponent } from '@/shared/components/date-picker';
import { ZardTableImports } from '@/shared/components/table';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { ZardTooltipImports } from '@/shared/components/tooltip';
import { ZardCardComponent } from '@/shared/components/card/card.component';
import { ZardSelectImports } from '@/shared/components/select';
import { ZardSkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { PageLayoutComponent } from '../../../shared/components/page-layout/page-layout';
import { Turno, TurnoFilter } from '../../../core/models/turno.model';
import { Substituicao, SubstituicaoPrefill } from '../../../core/models/substituicao.model';
import { Posto } from '../../../core/models/posto.model';
import { SubstituicoesService } from '../../substituicoes/substituicoes.service';
import { NotificationService } from '../../../core/services/notification.service';

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

const PAGE_LIMIT = 20;

function toDateInput(d: Date | null): string | undefined {
  if (!d) return undefined;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Component({
  selector: 'gp-turnos-list',
  imports: [
    ReactiveFormsModule,
    ZardDatePickerComponent,
    ZardTableImports,
    ZardButtonComponent,
    ZardCardComponent,
    ZardSelectImports,
    NgIcon,
    ZardSkeletonComponent,
    StatusBadge,
    EmptyState,
    PageLayoutComponent,
    ...ZardTooltipImports,
  ],
  templateUrl: './turnos-list.component.html',
  styleUrl: './turnos-list.component.scss',
})
export class TurnosListComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly turnosService = inject(TurnosService);
  private readonly postosService = inject(PostosService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly substituicoesService = inject(SubstituicoesService);
  private readonly dialog = inject(ZardDialogService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  readonly isAdmin = computed(() => this.authService.userRole() === 'admin');

  private readonly hoje = new Date();

  readonly statusControl = new FormControl<string[]>([], { nonNullable: true });
  readonly postoControl = new FormControl<string[]>([], { nonNullable: true });
  readonly usuarioControl = new FormControl<string[]>([], { nonNullable: true });

  readonly dateRange = signal<{ start: Date | null; end: Date | null }>({ start: this.hoje, end: this.hoje });

  readonly statusFilters = STATUS_FILTERS;

  readonly turnos = signal<Turno[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly postos = signal<Posto[]>([]);
  readonly usuarios = signal<{ id: string; nome: string }[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly totalPages = signal(0);

  private readonly filterChange$ = new Subject<void>();

  ngOnInit(): void {
    this.carregarPostos();
    this.carregarUsuarios();

    merge(
      this.statusControl.valueChanges.pipe(
        distinctUntilChanged((a, b) => a.length === b.length && a.every((v, i) => v === b[i])),
      ),
      this.postoControl.valueChanges.pipe(
        distinctUntilChanged((a, b) => a.length === b.length && a.every((v, i) => v === b[i])),
      ),
      this.usuarioControl.valueChanges.pipe(
        distinctUntilChanged((a, b) => a.length === b.length && a.every((v, i) => v === b[i])),
      ),
      this.filterChange$,
    )
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page.set(0);
        this.carregarTurnos();
      });

    this.carregarTurnos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onDateRangeChange(range: { start: Date | null; end: Date | null }): void {
    this.dateRange.set(range);
    this.filterChange$.next();
  }

  carregarTurnos(): void {
    this.loading.set(true);
    this.error.set(null);

    const filter = this.buildFilter();
    this.turnosService
      .listar(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.turnos.set(response.data);
          this.total.set(response.total);
          this.totalPages.set(Math.ceil(response.total / PAGE_LIMIT));
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.message ?? 'Erro ao carregar turnos.');
          this.loading.set(false);
        },
      });
  }

  private buildFilter(): TurnoFilter {
    const filter: TurnoFilter = {
      sort_by: 'inicio_previsto',
      sort_order: 'asc',
      limit: PAGE_LIMIT,
      offset: this.page() * PAGE_LIMIT,
    };

    const statuses = this.statusControl.value;
    if (statuses.length > 0) filter.status = statuses.join(',');

    const range = this.dateRange();
    const dataInicio = toDateInput(range.start);
    const dataFim = toDateInput(range.end);
    if (dataInicio) filter.data_inicio = dataInicio;
    if (dataFim) filter.data_fim = dataFim;

    const postoIds = this.postoControl.value;
    if (postoIds.length > 0) filter.posto_id = postoIds.join(',');

    const usuarioIds = this.usuarioControl.value;
    if (usuarioIds.length > 0) filter.usuario_id = usuarioIds.join(',');

    return filter;
  }

  private carregarPostos(): void {
    this.postosService.listar({ ativos: 'true' }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (postos) => this.postos.set(postos),
    });
  }

  private carregarUsuarios(): void {
    this.usuariosService.listar().pipe(takeUntil(this.destroy$)).subscribe({
      next: (usuarios) => this.usuarios.set(
        usuarios.filter((u) => u.cargo === 'vigia').map((u) => ({ id: u.id, nome: u.nome }))
      ),
    });
  }

  voltarPagina(): void {
    if (this.page() > 0) {
      this.page.update((p) => p - 1);
      this.carregarTurnos();
    }
  }

  avancarPagina(): void {
    if (this.page() < this.totalPages() - 1) {
      this.page.update((p) => p + 1);
      this.carregarTurnos();
    }
  }

  verDetalhe(turno: Turno): void {
    if (turno.status === 'agendado') return;
    this.router.navigate(['/turnos', turno.id]);
  }

  abrirSubstituicao(turno: Turno): void {
    if (turno.substituicaoId) {
      this.substituicoesService.obter(turno.substituicaoId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (substituicao) => this.abrirDialogEdicao(substituicao),
          error: () => this.notification.error('Erro ao carregar substituição para edição.'),
        });
      return;
    }

    this.abrirDialogCriacao(turno);
  }

  private abrirDialogCriacao(turno: Turno): void {
    const prefill: SubstituicaoPrefill = {
      postoId: turno.postoId,
      dataInicio: turno.inicioPrevisto.slice(0, 10),
      dataFim: turno.fimPrevisto.slice(0, 10),
      horaInicio: turno.inicioPrevisto.slice(11, 16),
      horaFim: turno.fimPrevisto.slice(11, 16),
      excludeUsuarioId: turno.usuarioId,
    };

    const dialogRef = this.dialog.create({
      zTitle: 'Lançar substituição',
      zContent: SubstituicoesFormComponent,
      zWidth: '640px',
      zData: prefill,
      zOkText: 'Criar',
      zOnOk: (instance: { submit: () => void }) => {
        instance.submit();
        return false;
      },
    });

    dialogRef.afterClosed
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result) {
          this.carregarTurnos();
        }
      });
  }

  private abrirDialogEdicao(substituicao: Substituicao): void {
    const dialogRef = this.dialog.create({
      zTitle: 'Editar substituição',
      zContent: SubstituicoesFormComponent,
      zWidth: '640px',
      zData: substituicao,
      zOkText: 'Salvar',
      zOnOk: (instance: { submit: () => void }) => {
        instance.submit();
        return false;
      },
    });

    dialogRef.afterClosed
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result) {
          this.carregarTurnos();
        }
      });
  }

  formatarData(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
