import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, startWith, map } from 'rxjs/operators';
import { EscalasService } from './escalas.service';
import { EscalasFormComponent } from './escalas-form.component';
import { ZardDialogService } from '@/shared/components/dialog';
import { ZardTableImports } from '@/shared/components/table';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { ZardInputDirective } from '@/shared/components/input';
import { ZardCardComponent } from '@/shared/components/card/card.component';
import { ZardSkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout';
import { NotificationService } from '../../core/services/notification.service';
import { Escala } from '../../core/models/escala.model';

const DIA_LABELS: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
};

@Component({
  selector: 'gp-escalas-list',
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
  ],
  templateUrl: './escalas-list.component.html',
  styleUrl: './escalas-list.component.scss',
})
export class EscalasListComponent implements OnInit, OnDestroy {
  private readonly escalasService = inject(EscalasService);
  private readonly dialog = inject(ZardDialogService);
  private readonly notification = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  readonly searchControl = new FormControl('', { nonNullable: true });

  private readonly escalasSubject = new BehaviorSubject<Escala[]>([]);
  readonly escalas$ = this.escalasSubject.asObservable();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly filteredEscalas$ = combineLatest([
    this.escalas$,
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      startWith(''),
      distinctUntilChanged()
    ),
  ]).pipe(
    map(([escalas, term]) => {
      if (!term.trim()) return escalas;
      const lower = term.toLowerCase().trim();
      return escalas.filter(
        (e) =>
          e.nome.toLowerCase().includes(lower) ||
          e.postoNome.toLowerCase().includes(lower) ||
          e.usuarioNome.toLowerCase().includes(lower)
      );
    })
  );

  ngOnInit(): void {
    this.carregarEscalas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarEscalas(): void {
    this.loading.set(true);
    this.error.set(null);

    this.escalasService
      .listar()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (escalas) => {
          this.escalasSubject.next(escalas);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.message ?? 'Erro ao carregar escalas.');
          this.loading.set(false);
        },
      });
  }

  abrirFormulario(escala?: Escala): void {
    const dialogRef = this.dialog.create({
      zTitle: escala ? 'Editar escala' : 'Nova escala',
      zContent: EscalasFormComponent,
      zWidth: '640px',
      zData: escala ?? null,
      zOkText: escala ? 'Salvar' : 'Criar',
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
          this.carregarEscalas();
        }
      });
  }

  confirmarExclusao(escala: Escala): void {
    this.dialog.create({
      zTitle: 'Desativar escala',
      zDescription: `Tem certeza que deseja desativar a escala "${escala.nome}"?`,
      zOkText: 'Desativar',
      zCancelText: 'Cancelar',
      zOkDestructive: true,
      zOnOk: () => {
        this.escalasService.excluir(escala.id).subscribe({
          next: () => {
            this.notification.success(`Escala "${escala.nome}" desativada com sucesso.`);
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

  formatarDias(dias: number[]): string {
    return dias.map((d) => DIA_LABELS[d] ?? '').join(', ');
  }

  formatarHorario(inicio: string, fim: string): string {
    return `${inicio} - ${fim}`;
  }

  formatarData(data: string): string {
    if (!data) return '';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  formatarVigencia(inicio: string, fim: string): string {
    return `${this.formatarData(inicio)} até ${this.formatarData(fim)}`;
  }
}

