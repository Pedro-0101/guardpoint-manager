import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, startWith, map } from 'rxjs/operators';
import { EscalasService } from './escalas.service';
import { EscalasFormComponent } from './escalas-form.component';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { ZardTableImports } from '@/shared/components/table';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
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
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatDialogModule,
    LoadingSpinner,
    StatusBadge,
    EmptyState,
  ],
  templateUrl: './escalas-list.component.html',
  styleUrl: './escalas-list.component.scss',
})
export class EscalasListComponent implements OnInit, OnDestroy {
  private readonly escalasService = inject(EscalasService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  readonly searchControl = new FormControl('', { nonNullable: true });

  private readonly escalasSubject = new BehaviorSubject<Escala[]>([]);
  readonly escalas$ = this.escalasSubject.asObservable();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly filteredEscalas$ = combineLatest([
    this.escalas$,
    this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
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
    const dialogRef = this.dialog.open(EscalasFormComponent, {
      width: '640px',
      data: escala ?? null,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result) {
          this.carregarEscalas();
        }
      });
  }

  confirmarExclusao(escala: Escala): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '420px',
      data: {
        title: 'Desativar escala',
        message: `Tem certeza que deseja desativar a escala "${escala.nome}"?`,
        confirmLabel: 'Desativar',
        cancelLabel: 'Cancelar',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmed) => {
        if (confirmed) {
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
        }
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

