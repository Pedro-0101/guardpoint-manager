import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, startWith, map } from 'rxjs/operators';
import { PostosService } from './postos.service';
import { PostosFormComponent } from './postos-form.component';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { NotificationService } from '../../core/services/notification.service';
import { Posto } from '../../core/models/posto.model';

@Component({
  selector: 'gp-postos-list',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatDialogModule,
    LoadingSpinner,
    StatusBadge,
    EmptyState,
  ],
  templateUrl: './postos-list.component.html',
  styleUrl: './postos-list.component.scss',
})
export class PostosListComponent implements OnInit, OnDestroy {
  private readonly postosService = inject(PostosService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  readonly searchControl = new FormControl('', { nonNullable: true });

  private readonly postosSubject = new BehaviorSubject<Posto[]>([]);
  readonly postos$ = this.postosSubject.asObservable();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly filteredPostos$ = combineLatest([
    this.postos$,
    this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged()
    ),
  ]).pipe(
    map(([postos, term]) => {
      if (!term.trim()) return postos;
      const lower = term.toLowerCase().trim();
      return postos.filter(
        (p) =>
          p.nome.toLowerCase().includes(lower)
      );
    })
  );

  readonly displayedColumns: string[] = ['nome', 'geo', 'raio', 'ativo', 'acoes'];

  ngOnInit(): void {
    this.carregarPostos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarPostos(): void {
    this.loading.set(true);
    this.error.set(null);

    this.postosService
      .listar()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (postos) => {
          this.postosSubject.next(postos);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.message ?? 'Erro ao carregar postos.');
          this.loading.set(false);
        },
      });
  }

  abrirFormulario(posto?: Posto): void {
    const dialogRef = this.dialog.open(PostosFormComponent, {
      width: '640px',
      maxWidth: '95vw',
      data: posto ?? null,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result) {
          this.carregarPostos();
        }
      });
  }

  confirmarExclusao(posto: Posto): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '420px',
      data: {
        title: 'Inativar posto',
        message: `Tem certeza que deseja inativar o posto "${posto.nome}"?`,
        confirmLabel: 'Inativar',
        cancelLabel: 'Cancelar',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.postosService.inativar(posto.id).subscribe({
            next: () => {
              this.notification.success(`Posto "${posto.nome}" inativado com sucesso.`);
              this.carregarPostos();
            },
            error: (err) => {
              this.notification.error(
                err.message ?? 'Erro ao inativar posto.'
              );
            },
          });
        }
      });
  }
}
