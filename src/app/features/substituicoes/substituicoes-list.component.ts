import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
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
import { SubstituicoesService } from './substituicoes.service';
import { PostosService } from '../postos/postos.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { SubstituicoesFormComponent } from './substituicoes-form.component';
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
import { ZardDatePickerComponent } from '@/shared/components/date-picker';
import { NotificationService } from '../../core/services/notification.service';
import { Substituicao } from '../../core/models/substituicao.model';
import { Posto } from '../../core/models/posto.model';
import { Usuario } from '../../core/models/usuario.model';

@Component({
  selector: 'gp-substituicoes-list',
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
    ZardDatePickerComponent,
    NgIcon,
    ZardSkeletonComponent,
    StatusBadge,
    EmptyState,
    PageLayoutComponent,
    ...ZardTooltipImports,
  ],
  templateUrl: './substituicoes-list.component.html',
  styleUrl: './substituicoes-list.component.scss',
})
export class SubstituicoesListComponent implements OnInit, OnDestroy {
  private readonly substituicoesService = inject(SubstituicoesService);
  private readonly postosService = inject(PostosService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly dialog = inject(ZardDialogService);
  private readonly notification = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly postosControl = new FormControl<string[]>([], { nonNullable: true });
  readonly vigiasControl = new FormControl<string[]>([], { nonNullable: true });
  readonly ativasOnlyControl = new FormControl(true, { nonNullable: true });

  readonly dataFiltroValue = signal<Date | null>(null);
  private readonly dataFiltroSubject = new BehaviorSubject<string>('');

  private readonly substituicoesSubject = new BehaviorSubject<Substituicao[]>([]);
  readonly substituicoes$ = this.substituicoesSubject.asObservable();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly postos = signal<Posto[]>([]);
  readonly vigias = signal<Usuario[]>([]);

  readonly filteredSubstituicoes$ = combineLatest([
    this.substituicoes$,
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      startWith(''),
      distinctUntilChanged()
    ),
    this.postosControl.valueChanges.pipe(startWith<string[]>([])),
    this.vigiasControl.valueChanges.pipe(startWith<string[]>([])),
    this.dataFiltroSubject,
    this.ativasOnlyControl.valueChanges.pipe(startWith(true)),
  ]).pipe(
    map(([substituicoes, term, selectedPostos, selectedVigias, data, ativasOnly]) => {
      let filtered = substituicoes;

      if (ativasOnly) {
        filtered = filtered.filter((s) => s.ativo);
      }

      if (selectedPostos.length > 0) {
        filtered = filtered.filter((s) => selectedPostos.includes(s.postoId));
      }

      if (selectedVigias.length > 0) {
        filtered = filtered.filter((s) => selectedVigias.includes(s.usuarioId));
      }

      if (data) {
        filtered = filtered.filter(
          (s) => s.dataInicio <= data && data <= s.dataFim
        );
      }

      if (term.trim()) {
        const lower = term.toLowerCase().trim();
        filtered = filtered.filter(
          (s) =>
            s.usuarioNome.toLowerCase().includes(lower) ||
            s.postoNome.toLowerCase().includes(lower) ||
            s.motivo.toLowerCase().includes(lower)
        );
      }

      return filtered;
    })
  );

  ngOnInit(): void {
    this.carregarSubstituicoes();
    this.carregarFiltros();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarSubstituicoes(): void {
    this.loading.set(true);
    this.error.set(null);

    this.substituicoesService
      .listar({ limit: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (substituicoes) => {
          this.substituicoesSubject.next(
            [...substituicoes].sort((a, b) =>
              b.dataInicio.localeCompare(a.dataInicio)
            )
          );
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.message ?? 'Erro ao carregar substituições.');
          this.loading.set(false);
        },
      });
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

  limparTodosFiltros(): void {
    this.searchControl.setValue('');
    this.postosControl.setValue([]);
    this.vigiasControl.setValue([]);
    this.dataFiltroValue.set(null);
    this.dataFiltroSubject.next('');
    this.ativasOnlyControl.setValue(true);
  }

  onDataChange(date: Date | null): void {
    this.dataFiltroValue.set(date);
    this.dataFiltroSubject.next(date ? this.dateToString(date) : '');
  }

  private dateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  abrirFormulario(substituicao?: Substituicao): void {
    const dialogRef = this.dialog.create({
      zTitle: substituicao ? 'Editar substituição' : 'Nova substituição',
      zContent: SubstituicoesFormComponent,
      zWidth: '640px',
      zData: substituicao ?? null,
      zOkText: substituicao ? 'Salvar' : 'Criar',
      zOnOk: (instance: { submit: () => void }) => {
        instance.submit();
        return false;
      },
    });

    dialogRef.afterClosed
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result) {
          this.carregarSubstituicoes();
        }
      });
  }

  confirmarExclusao(substituicao: Substituicao): void {
    const periodo = this.formatarPeriodo(substituicao);
    this.dialog.create({
      zTitle: 'Desativar substituição',
      zDescription: `Tem certeza que deseja desativar a substituição de "${substituicao.usuarioNome}" no posto "${substituicao.postoNome}" (${periodo})?`,
      zWidth: '28rem',
      zOkText: 'Desativar',
      zCancelText: 'Cancelar',
      zOkDestructive: true,
      zOnOk: () => {
        this.substituicoesService.excluir(substituicao.id).subscribe({
          next: () => {
            this.notification.success('Substituição desativada com sucesso.');
            this.carregarSubstituicoes();
          },
          error: (err) => {
            this.notification.error(
              err.message ?? 'Erro ao desativar substituição.'
            );
          },
        });
      },
    });
  }

  // Formata por string para evitar o recuo de um dia que new Date('YYYY-MM-DD')
  // causa em fusos negativos (parse UTC).
  formatarData(data: string): string {
    return data.split('-').reverse().join('/');
  }

  formatarPeriodo(substituicao: Substituicao): string {
    if (substituicao.dataInicio === substituicao.dataFim) {
      return this.formatarData(substituicao.dataInicio);
    }
    return `${this.formatarData(substituicao.dataInicio)} - ${this.formatarData(substituicao.dataFim)}`;
  }

  formatarHorario(substituicao: Substituicao): string {
    return `${substituicao.horaInicio} - ${substituicao.horaFim}`;
  }
}
