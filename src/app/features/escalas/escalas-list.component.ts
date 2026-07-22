import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { Subject, BehaviorSubject, combineLatest, forkJoin } from 'rxjs';
import {
  takeUntil,
  debounceTime,
  distinctUntilChanged,
  startWith,
  map,
} from 'rxjs/operators';
import { EscalasService } from './escalas.service';
import { PostosService } from '../postos/postos.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { EscalasFormComponent } from './escalas-form.component';
import { ZardDialogService } from '@/shared/components/dialog';
import { ZardTableImports } from '@/shared/components/table';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { ZardInputDirective } from '@/shared/components/input';
import { ZardTooltipImports } from '@/shared/components/tooltip';
import { ZardCardComponent } from '@/shared/components/card/card.component';
import { ZardSelectComponent } from '@/shared/components/select/select.component';
import { ZardSelectItemComponent } from '@/shared/components/select/select-item.component';
import { ZardCheckboxComponent } from '@/shared/components/checkbox/checkbox.component';
import { ZardSkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout';
import { ZardPaginationComponent } from '@/shared/components/pagination/pagination.component';
import { NotificationService } from '../../core/services/notification.service';
import { Escala } from '../../core/models/escala.model';
import { Posto } from '../../core/models/posto.model';
import { Usuario } from '../../core/models/usuario.model';

const DIA_LABELS: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sab',
};

interface VigiaPostoGroup {
  key: string;
  usuarioId: string;
  usuarioNome: string;
  postoId: string;
  postoNome: string;
  escalas: Escala[];
  qtdEscalasAtivas: number;
  totalHoras: number;
  toleranciaMin: number;
  ativo: boolean;
}

@Component({
  selector: 'gp-escalas-list',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    ZardTableImports,
    ZardButtonComponent,
    ZardInputDirective,
    ZardCardComponent,
    ZardSelectComponent,
    ZardSelectItemComponent,
    ZardCheckboxComponent,
    NgIcon,
    ZardSkeletonComponent,
    StatusBadge,
    EmptyState,
    PageLayoutComponent,
    ZardPaginationComponent,
    ...ZardTooltipImports,
  ],
  templateUrl: './escalas-list.component.html',
  styleUrl: './escalas-list.component.scss',
})
export class EscalasListComponent implements OnInit, OnDestroy {
  private readonly escalasService = inject(EscalasService);
  private readonly postosService = inject(PostosService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly dialog = inject(ZardDialogService);
  private readonly notification = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly postosControl = new FormControl<string[]>([], { nonNullable: true });
  readonly vigiasControl = new FormControl<string[]>([], { nonNullable: true });
  readonly ativosOnlyControl = new FormControl(true, { nonNullable: true });

  private readonly escalasSubject = new BehaviorSubject<Escala[]>([]);
  readonly escalas$ = this.escalasSubject.asObservable();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly expandedKey = signal<string | null>(null);

  readonly postos = signal<Posto[]>([]);
  readonly vigias = signal<Usuario[]>([]);

  readonly pageIndex = signal(0);
  readonly pageSize = 20;
  readonly totalUsers = signal(0);
  readonly totalPages = signal(0);

  readonly filteredGroups$ = combineLatest([
    this.escalas$,
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      startWith(''),
      distinctUntilChanged()
    ),
    this.postosControl.valueChanges.pipe(startWith<string[]>([])),
    this.vigiasControl.valueChanges.pipe(startWith<string[]>([])),
    this.ativosOnlyControl.valueChanges.pipe(startWith(true)),
  ]).pipe(
    map(([escalas, term, selectedPostos, selectedVigias, ativosOnly]) => {
      let filtered = escalas;

      if (ativosOnly) {
        filtered = filtered.filter((e) => e.ativo);
      }

      if (selectedPostos.length > 0) {
        filtered = filtered.filter((e) =>
          selectedPostos.includes(e.postoId)
        );
      }

      if (selectedVigias.length > 0) {
        filtered = filtered.filter((e) =>
          selectedVigias.includes(e.usuarioId)
        );
      }

      let groups = buildGroups(filtered);

      if (term.trim()) {
        const lower = term.toLowerCase().trim();
        groups = groups.filter(
          (g) =>
            g.postoNome.toLowerCase().includes(lower) ||
            g.usuarioNome.toLowerCase().includes(lower)
        );
      }

      return groups;
    })
  );

  ngOnInit(): void {
    this.carregarEscalas();
    this.carregarFiltros();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarEscalas(): void {
    this.loading.set(true);
    this.error.set(null);

    const params: { limit: number; offset: number } = {
      limit: this.pageSize,
      offset: this.pageIndex() * this.pageSize,
    };

    this.escalasService
      .listar(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ data, total }) => {
          this.escalasSubject.next(data);
          this.totalUsers.set(total);
          this.totalPages.set(Math.ceil(total / this.pageSize) || 1);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(
            err.message ?? 'Erro ao carregar escalas.'
          );
          this.loading.set(false);
        },
      });
  }

  irParaPagina(index: number): void {
    if (index < 0 || index >= this.totalPages()) return;
    this.pageIndex.set(index);
    this.expandedKey.set(null);
    this.carregarEscalas();
  }

  onPageChange(page: number): void {
    this.irParaPagina(page - 1);
  }

  carregarFiltros(): void {
    forkJoin({
      postos: this.postosService.listar({ ativos: 'true' }),
      usuarios: this.usuariosService.listar(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ postos, usuarios }) => {
          this.postos.set(postos);
          this.vigias.set(
            usuarios.filter((u) => u.ativo && u.cargo === 'vigia')
          );
        },
        error: (err) => {
          void err;
        },
      });
  }

  limparFiltroPosto(value: string): void {
    const current = this.postosControl.value;
    this.postosControl.setValue(current.filter((v) => v !== value));
  }

  limparFiltroVigia(value: string): void {
    const current = this.vigiasControl.value;
    this.vigiasControl.setValue(current.filter((v) => v !== value));
  }

  limparTodosFiltros(): void {
    this.searchControl.setValue('');
    this.postosControl.setValue([]);
    this.vigiasControl.setValue([]);
    this.ativosOnlyControl.setValue(true);
  }

  toggleExpand(key: string): void {
    this.expandedKey.update((current) =>
      current === key ? null : key
    );
  }

  isExpanded(key: string): boolean {
    return this.expandedKey() === key;
  }

  abrirFormulario(grupo: VigiaPostoGroup): void {
    const dialogRef = this.dialog.create({
      zTitle: 'Editar escala',
      zContent: EscalasFormComponent,
      zWidth: '960px',
      zData: { usuarioId: grupo.usuarioId, postoId: grupo.postoId },
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
          this.carregarEscalas();
        }
      });
  }

  abrirFormularioNova(): void {
    const dialogRef = this.dialog.create({
      zTitle: 'Nova escala',
      zContent: EscalasFormComponent,
      zWidth: '960px',
      zData: null,
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
          this.carregarEscalas();
        }
      });
  }

  confirmarExclusaoIndividual(escala: Escala): void {
    const label = `${escala.usuarioNome} - ${escala.postoNome}`;
    this.dialog.create({
      zTitle: 'Desativar escala',
      zDescription: `Tem certeza que deseja desativar a escala de "${label}" (${this.formatarDias(escala.diaSemanaInicio, escala.diaSemanaFim)})?`,
      zWidth: '28rem',
      zOkText: 'Desativar',
      zCancelText: 'Cancelar',
      zOkDestructive: true,
      zOnOk: () => {
        this.escalasService.excluir(escala.id).subscribe({
          next: () => {
            this.notification.success(
              `Escala desativada com sucesso.`
            );
            this.carregarEscalas();
          },
          error: (err) => {
            this.notification.error(
              err.message ?? 'Erro ao desativar escala.'
            );
          },
        });
      },
    });
  }

  formatarDias(inicio: number, fim: number): string {
    if (inicio === fim) {
      return DIA_LABELS[inicio] ?? '';
    }
    return `${DIA_LABELS[inicio] ?? ''} - ${DIA_LABELS[fim] ?? ''}`;
  }

  formatarHorario(inicio: string, fim: string): string {
    return `${inicio} - ${fim}`;
  }
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function escalaHoras(escala: Escala): number {
  const inicio = timeToMinutes(escala.horaInicio);
  const fim = timeToMinutes(escala.horaFim);
  if (escala.diaSemanaInicio === escala.diaSemanaFim) {
    return (fim - inicio) / 60;
  }
  return (24 * 60 - inicio + fim) / 60;
}

function buildGroups(escalas: Escala[]): VigiaPostoGroup[] {
  const map = new Map<string, Escala[]>();
  for (const e of escalas) {
    const key = `${e.usuarioId}_${e.postoId}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(e);
  }

  const groups: VigiaPostoGroup[] = [];
  for (const [key, items] of map) {
    const first = items[0];
    groups.push({
      key,
      usuarioId: first.usuarioId,
      usuarioNome: first.usuarioNome,
      postoId: first.postoId,
      postoNome: first.postoNome,
      escalas: items.sort(
        (a, b) => a.diaSemanaInicio - b.diaSemanaInicio || a.horaInicio.localeCompare(b.horaInicio)
      ),
      qtdEscalasAtivas: items.filter((e) => e.ativo).length,
      totalHoras: items.reduce((sum, e) => sum + escalaHoras(e), 0),
      toleranciaMin: first.toleranciaMin,
      ativo: items.some((e) => e.ativo),
    });
  }

  return groups.sort((a, b) => a.usuarioNome.localeCompare(b.usuarioNome));
}
