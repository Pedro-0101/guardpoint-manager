import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, startWith, map } from 'rxjs/operators';
import { ConfiguracoesService } from './configuracoes.service';
import { ConfigEscalonamentoFormComponent } from './config-escalonamento-form.component';
import { ZardDialogService } from '@/shared/components/dialog';
import { ZardTableImports } from '@/shared/components/table';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { ZardInputDirective } from '@/shared/components/input';
import { ZardCardComponent } from '@/shared/components/card/card.component';
import { ZardTooltipImports } from '@/shared/components/tooltip';
import { ZardSkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout';
import { NotificationService } from '../../core/services/notification.service';
import { NivelEscalonamento } from '../../core/models/config.model';

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
    EmptyState,
    PageLayoutComponent,
    ...ZardTooltipImports,
  ],
  templateUrl: './config-escalonamento.component.html',
  styleUrl: './config-escalonamento.component.scss',
})
export class ConfigEscalonamentoComponent implements OnInit, OnDestroy {
  private readonly configuracoesService = inject(ConfiguracoesService);
  private readonly dialog = inject(ZardDialogService);
  private readonly notification = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  readonly searchControl = new FormControl('', { nonNullable: true });

  private readonly escalonamentosSubject = new BehaviorSubject<NivelEscalonamento[]>([]);
  readonly escalonamentos$ = this.escalonamentosSubject.asObservable();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly filteredEscalonamentos$ = combineLatest([
    this.escalonamentos$,
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      startWith(''),
      distinctUntilChanged(),
    ),
  ]).pipe(
    map(([items, term]) => {
      if (!term.trim()) return items;
      const lower = term.toLowerCase().trim();
      return items.filter(
        (e) =>
          e.descricao?.toLowerCase().includes(lower) ||
          String(e.nivel).includes(lower),
      );
    }),
  );

  ngOnInit(): void {
    this.carregarEscalonamentos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
