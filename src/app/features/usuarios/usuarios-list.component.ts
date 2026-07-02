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
import { UsuariosService } from './usuarios.service';
import { UsuariosFormComponent } from './usuarios-form.component';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { NotificationService } from '../../core/services/notification.service';
import { Usuario } from '../../core/models/usuario.model';

const CARGO_LABELS: Record<string, string> = {
  admin: 'Admin',
  supervisor: 'Supervisor',
  vigia: 'Vigia',
};

@Component({
  selector: 'gp-usuarios-list',
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
  templateUrl: './usuarios-list.component.html',
  styleUrl: './usuarios-list.component.scss',
})
export class UsuariosListComponent implements OnInit, OnDestroy {
  private readonly usuariosService = inject(UsuariosService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  readonly searchControl = new FormControl('', { nonNullable: true });

  private readonly usuariosSubject = new BehaviorSubject<Usuario[]>([]);
  readonly usuarios$ = this.usuariosSubject.asObservable();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly filteredUsuarios$ = combineLatest([
    this.usuarios$,
    this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged()
    ),
  ]).pipe(
    map(([usuarios, term]) => {
      if (!term.trim()) return usuarios;
      const lower = term.toLowerCase().trim();
      return usuarios.filter(
        (u) =>
          u.nome.toLowerCase().includes(lower) ||
          u.email.toLowerCase().includes(lower)
      );
    })
  );

  readonly displayedColumns: string[] = ['nome', 'email', 'cargo', 'ativo', 'acoes'];

  ngOnInit(): void {
    this.carregarUsuarios();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarUsuarios(): void {
    this.loading.set(true);
    this.error.set(null);

    this.usuariosService
      .listar()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (usuarios) => {
          this.usuariosSubject.next(usuarios);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.message ?? 'Erro ao carregar usuários.');
          this.loading.set(false);
        },
      });
  }

  abrirFormulario(usuario?: Usuario): void {
    const dialogRef = this.dialog.open(UsuariosFormComponent, {
      width: '520px',
      data: usuario ?? null,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result) {
          this.carregarUsuarios();
        }
      });
  }

  confirmarExclusao(usuario: Usuario): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '420px',
      data: {
        title: 'Inativar usuário',
        message: `Tem certeza que deseja inativar o usuário "${usuario.nome}"?`,
        confirmLabel: 'Inativar',
        cancelLabel: 'Cancelar',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.usuariosService.inativar(usuario.id).subscribe({
            next: () => {
              this.notification.success(`Usuário "${usuario.nome}" inativado com sucesso.`);
              this.carregarUsuarios();
            },
            error: (err) => {
              this.notification.error(
                err.message ?? 'Erro ao inativar usuário.'
              );
            },
          });
        }
      });
  }

  cargoLabel(cargo: string): string {
    return CARGO_LABELS[cargo] ?? cargo;
  }
}
