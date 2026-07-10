import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { Subject, ReplaySubject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, startWith, map } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import { UsuariosService } from './usuarios.service';
import { UsuariosFormComponent } from './usuarios-form.component';
import { VigiaSenhasFormComponent } from './vigia-senhas-form.component';
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
import { GpAvatarComponent } from '../../shared/components/avatar/gp-avatar';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout';
import { NotificationService } from '../../core/services/notification.service';
import { Usuario } from '../../core/models/usuario.model';

const CARGO_LABELS: Record<string, string> = {
  admin: 'Admin',
  supervisor: 'Supervisor',
  vigia: 'Vigia',
};

const CARGO_OPTIONS = Object.entries(CARGO_LABELS).map(([value, label]) => ({
  value,
  label,
}));

@Component({
  selector: 'gp-usuarios-list',
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
    GpAvatarComponent,
    PageLayoutComponent,
    ...ZardTooltipImports,
  ],
  templateUrl: './usuarios-list.component.html',
  styleUrl: './usuarios-list.component.scss',
})
export class UsuariosListComponent implements OnInit, OnDestroy {
  private readonly usuariosService = inject(UsuariosService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(ZardDialogService);
  private readonly notification = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();
  readonly isAdmin = computed(() => this.authService.userRole() === 'admin');

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly cargosControl = new FormControl<string[]>([], { nonNullable: true });
  readonly ativosOnlyControl = new FormControl(true, { nonNullable: true });

  readonly cargoOptions = CARGO_OPTIONS;

  private readonly usuariosSubject = new ReplaySubject<Usuario[]>(1);
  readonly usuarios$ = this.usuariosSubject.asObservable();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly filteredUsuarios$ = combineLatest([
    this.usuarios$,
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      startWith(''),
      distinctUntilChanged()
    ),
    this.cargosControl.valueChanges.pipe(startWith<string[]>([])),
    this.ativosOnlyControl.valueChanges.pipe(startWith(true)),
  ]).pipe(
    map(([usuarios, term, selectedCargos, ativosOnly]) => {
      let filtered = usuarios;

      if (ativosOnly) {
        filtered = filtered.filter((u) => u.ativo);
      }

      if (selectedCargos.length > 0) {
        filtered = filtered.filter((u) =>
          selectedCargos.includes(u.cargo)
        );
      }

      if (term.trim()) {
        const lower = term.toLowerCase().trim();
        filtered = filtered.filter(
          (u) =>
            u.nome.toLowerCase().includes(lower) ||
            u.email.toLowerCase().includes(lower)
        );
      }

      return filtered;
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
    const isEdit = !!usuario;
    const dialogRef = this.dialog.create({
      zTitle: isEdit ? 'Editar usuário' : 'Novo usuário',
      zContent: UsuariosFormComponent,
      zWidth: '520px',
      zData: usuario ?? null,
      zOkText: isEdit ? 'Salvar' : null,
      zCancelText: isEdit ? 'Cancelar' : null,
      zHideFooter: !isEdit,
      zOnOk: isEdit
        ? (instance) => {
            instance.submit();
            return false;
          }
        : undefined,
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
      zWidth: '28rem',
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

  abrirSenhas(usuario: Usuario): void {
    this.dialog.create({
      zTitle: `Senhas do Vigia: ${usuario.nome}`,
      zContent: VigiaSenhasFormComponent,
      zWidth: '640px',
      zData: usuario,
      zOkText: null,
      zCancelText: 'Fechar',
    });
  }

  limparFiltroCargo(value: string): void {
    const current = this.cargosControl.value;
    this.cargosControl.setValue(current.filter((v) => v !== value));
  }

  limparTodosFiltros(): void {
    this.searchControl.setValue('');
    this.cargosControl.setValue([]);
    this.ativosOnlyControl.setValue(true);
  }
}
