import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, startWith, map } from 'rxjs/operators';
import { UsuariosService } from './usuarios.service';
import { UsuariosFormComponent } from './usuarios-form.component';
import { ZardDialogService } from '@/shared/components/dialog';
import { ZardTableImports } from '@/shared/components/table';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { ZardInputDirective } from '@/shared/components/input';
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
    ZardTableImports,
    ZardButtonComponent,
    ZardInputDirective,
    NgIcon,
    LoadingSpinner,
    StatusBadge,
    EmptyState,
  ],
  templateUrl: './usuarios-list.component.html',
  styleUrl: './usuarios-list.component.scss',
})
export class UsuariosListComponent implements OnInit, OnDestroy {
  private readonly usuariosService = inject(UsuariosService);
  private readonly dialog = inject(ZardDialogService);
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
    const dialogRef = this.dialog.create({
      zTitle: usuario ? 'Editar usuário' : 'Novo usuário',
      zContent: UsuariosFormComponent,
      zWidth: '520px',
      zData: usuario ?? null,
      zOkText: usuario ? 'Salvar' : 'Criar',
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
          this.carregarUsuarios();
        }
      });
  }

  confirmarExclusao(usuario: Usuario): void {
    this.dialog.create({
      zTitle: 'Inativar usuário',
      zDescription: `Tem certeza que deseja inativar o usuário "${usuario.nome}"?`,
      zOkText: 'Inativar',
      zCancelText: 'Cancelar',
      zOkDestructive: true,
      zOnOk: () => {
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
      },
    });
  }

  cargoLabel(cargo: string): string {
    return CARGO_LABELS[cargo] ?? cargo;
  }
}
