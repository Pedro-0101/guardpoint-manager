import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { Subject, ReplaySubject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, startWith, map } from 'rxjs/operators';
import { ConfiguracoesService } from './configuracoes.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { ConfigEscalonamentoFormComponent } from './config-escalonamento-form.component';
import { ZardDialogService } from '@/shared/components/dialog';
import { ZardTableImports } from '@/shared/components/table';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { ZardInputDirective } from '@/shared/components/input';
import { ZardTooltipImports } from '@/shared/components/tooltip';
import { ZardCardComponent } from '@/shared/components/card/card.component';
import { ZardSkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout';
import { NotificationService } from '../../core/services/notification.service';
import { ConfigEscalonamento } from '../../core/models/config.model';

@Component({
  selector: 'gp-config-escalonamento',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    ZardTableImports,
    ZardButtonComponent,
    ZardInputDirective,
    ZardCardComponent,
    NgIcon,
    ZardSkeletonComponent,
    StatusBadge,
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

  private readonly escalonamentosSubject = new ReplaySubject<ConfigEscalonamento[]>(1);
  readonly escalonamentos$ = this.escalonamentosSubject.asObservable();

  readonly usuariosMap = signal<Record<string, string>>({});
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly filteredEscalonamentos$ = combineLatest([
    this.escalonamentos$,
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      startWith(''),
      distinctUntilChanged()
    ),
  ]).pipe(
    map(([list, term]) => {
      if (!term.trim()) return list;
      const lower = term.toLowerCase().trim();
      return list.filter(
        (e) =>
          (e.descricao ?? '').toLowerCase().includes(lower) ||
          e.atrasoMinutos.toString().includes(lower)
      );
    })
  );

  ngOnInit(): void {
    this.carregarDados();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarDados(): void {
    this.loading.set(true);
    this.error.set(null);

    this.configuracoesService
      .listarEscalonamentos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => {
          this.escalonamentosSubject.next(list);
          this.carregarNomesUsuarios(list);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.message ?? 'Erro ao carregar escalonamentos.');
          this.loading.set(false);
        },
      });
  }

  private carregarNomesUsuarios(list: ConfigEscalonamento[]): void {
    const ids = new Set<string>();
    for (const e of list) {
      for (const id of e.usuarioIds) {
        ids.add(id);
      }
    }
    if (ids.size === 0) return;

    this.usuariosService.listar().pipe(takeUntil(this.destroy$)).subscribe({
      next: (usuarios) => {
        const map: Record<string, string> = {};
        for (const u of usuarios) {
          map[u.id] = u.nome;
        }
        this.usuariosMap.set(map);
      },
    });
  }

  abrirFormulario(item?: ConfigEscalonamento): void {
    const dialogRef = this.dialog.create({
      zTitle: item ? 'Editar escalonamento' : 'Novo escalonamento',
      zContent: ConfigEscalonamentoFormComponent,
      zWidth: '520px',
      zData: item ?? null,
      zOkText: item ? 'Salvar' : 'Criar',
      zOnOk: (instance) => {
        instance.submit();
        return false;
      },
    });

    dialogRef.afterClosed.pipe(takeUntil(this.destroy$)).subscribe((result) => {
      if (result) {
        this.carregarDados();
      }
    });
  }

  abrirUsuarios(item: ConfigEscalonamento): void {
    this.dialog.create({
      zTitle: `Alterar usuários: ${item.descricao || `Atraso ${item.atrasoMinutos}min`}`,
      zContent: ConfigEscalonamentoFormComponent,
      zWidth: '520px',
      zData: { ...item, apenasUsuarios: true },
      zOkText: 'Salvar',
      zOnOk: (instance) => {
        instance.submit();
        return false;
      },
    });
  }

  confirmarExclusao(item: ConfigEscalonamento): void {
    this.dialog.create({
      zTitle: 'Excluir escalonamento',
      zDescription: `Tem certeza que deseja excluir o escalonamento "${item.descricao || `Atraso ${item.atrasoMinutos}min`}"?`,
      zWidth: '28rem',
      zOkText: 'Excluir',
      zCancelText: 'Cancelar',
      zOkDestructive: true,
      zOnOk: () => {
        this.configuracoesService.excluirEscalonamento(item.id).subscribe({
          next: () => {
            this.notification.success('Escalonamento excluído com sucesso.');
            this.carregarDados();
          },
          error: (err) => {
            this.notification.error(err.message ?? 'Erro ao excluir escalonamento.');
          },
        });
      },
    });
  }

  usuarioNome(id: string): string {
    return this.usuariosMap()[id] || id;
  }
}