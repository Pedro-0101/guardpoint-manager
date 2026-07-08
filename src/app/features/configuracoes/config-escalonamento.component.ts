import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { Subject, BehaviorSubject, combineLatest, forkJoin } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, startWith, map } from 'rxjs/operators';
import { ConfiguracoesService } from './configuracoes.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { ConfigEscalonamentoFormComponent } from './config-escalonamento-form.component';
import { ZardDialogService } from '@/shared/components/dialog';
import { ZardTableImports } from '@/shared/components/table';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { ZardInputDirective } from '@/shared/components/input';
import { ZardSelectComponent } from '@/shared/components/select/select.component';
import { ZardSelectItemComponent } from '@/shared/components/select/select-item.component';
import { ZardCardComponent } from '@/shared/components/card/card.component';
import { ZardTooltipImports } from '@/shared/components/tooltip';
import { ZardSkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout';
import { NotificationService } from '../../core/services/notification.service';
import { NivelEscalonamento } from '../../core/models/config.model';
import { Usuario } from '../../core/models/usuario.model';

@Component({
  selector: 'gp-config-escalonamento',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    ZardTableImports,
    ZardButtonComponent,
    ZardInputDirective,
    ZardSelectComponent,
    ZardSelectItemComponent,
    ZardCardComponent,
    NgIcon,
    ZardSkeletonComponent,
    EmptyState,
    PageLayoutComponent,
    ...ZardTooltipImports,
  ],
  templateUrl: './config-escalonamento.component.html',
  styleUrl: './config-escalonamento.component.scss',
})
export class ConfigEscalonamentoComponent implements OnInit, OnDestroy {
  private readonly configuracoesService = inject(ConfiguracoesService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly dialog = inject(ZardDialogService);
  private readonly notification = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly usuariosControl = new FormControl<string[]>([], { nonNullable: true });

  private readonly escalonamentosSubject = new BehaviorSubject<NivelEscalonamento[]>([]);
  readonly escalonamentos$ = this.escalonamentosSubject.asObservable();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly usuarios = signal<Usuario[]>([]);

  readonly filteredEscalonamentos$ = combineLatest([
    this.escalonamentos$,
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      startWith(''),
      distinctUntilChanged(),
    ),
    this.usuariosControl.valueChanges.pipe(startWith<string[]>([])),
  ]).pipe(
    map(([items, term, selectedUsuarios]) => {
      let filtered = items;

      if (selectedUsuarios.length > 0) {
        filtered = filtered.filter(
          (e) => e.usuarioIds?.some((id) => selectedUsuarios.includes(id)),
        );
      }

      if (!term.trim()) return filtered;
      const lower = term.toLowerCase().trim();
      return filtered.filter(
        (e) =>
          e.descricao?.toLowerCase().includes(lower) ||
          String(e.nivel).includes(lower),
      );
    }),
  );

  ngOnInit(): void {
    this.carregarEscalonamentos();
    this.carregarFiltros();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarFiltros(): void {
    forkJoin({
      usuarios: this.usuariosService.listar(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ usuarios }) => {
          this.usuarios.set(usuarios.filter((u) => u.ativo));
        },
        error: (err) => {
          void err;
        },
      });
  }

  limparFiltroUsuario(value: string): void {
    const current = this.usuariosControl.value;
    this.usuariosControl.setValue(current.filter((v) => v !== value));
  }

  limparTodosFiltros(): void {
    this.searchControl.setValue('');
    this.usuariosControl.setValue([]);
  }

  carregarEscalonamentos(): void {
    this.loading.set(true);
    this.error.set(null);

    this.configuracoesService
      .listarEscalonamento()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          this.escalonamentosSubject.next(items);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.message ?? 'Erro ao carregar escalonamentos.');
          this.loading.set(false);
        },
      });
  }

  getNomesUsuarios(usuarioIds: string[]): string {
    if (usuarioIds.length === 0) return '';
    const nomes = usuarioIds
      .map((id) => this.usuarios().find((u) => u.id === id)?.nome)
      .filter((n): n is string => !!n)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    if (nomes.length <= 10) return nomes.join('\n');
    return nomes.slice(0, 10).join('\n') + '\n...';
  }

  abrirFormulario(item?: NivelEscalonamento): void {
    const dialogRef = this.dialog.create({
      zTitle: item ? 'Editar nível' : 'Novo nível',
      zContent: ConfigEscalonamentoFormComponent,
      zWidth: '520px',
      zData: item ?? null,
      zOkText: item ? 'Salvar' : 'Criar',
      zOnOk: (instance) => {
        instance.submit();
        return false;
      },
    });

    dialogRef
      .afterClosed
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result) {
          this.carregarEscalonamentos();
        }
      });
  }

  confirmarExclusao(item: NivelEscalonamento): void {
    this.configuracoesService.removerEscalonamento(item.id).subscribe({
      next: () => {
        this.notification.success(`Nível ${item.nivel} removido com sucesso.`);
        this.carregarEscalonamentos();
      },
      error: (err) => {
        this.notification.error(err.message ?? 'Erro ao remover escalonamento.');
      },
    });
  }
}
