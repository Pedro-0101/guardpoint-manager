import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UsuariosService } from './usuarios.service';
import { NotificationService } from '../../core/services/notification.service';
import { Usuario } from '../../core/models/usuario.model';

@Component({
  selector: 'gp-usuarios-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatDialogModule,
  ],
  templateUrl: './usuarios-form.component.html',
  styleUrl: './usuarios-form.component.scss',
})
export class UsuariosFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usuariosService = inject(UsuariosService);
  private readonly dialogRef = inject(MatDialogRef<UsuariosFormComponent>);
  private readonly notification = inject(NotificationService);
  readonly data = inject<Usuario | null>(MAT_DIALOG_DATA, { optional: true }) ?? null;

  readonly loading = signal(false);
  readonly isEdit = signal(false);
  readonly hideSenha = signal(true);

  readonly cargos = [
    { value: 'vigia', label: 'Vigia' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'admin', label: 'Admin' },
  ];

  form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.minLength(5)]],
    cargo: ['vigia' as Usuario['cargo'], [Validators.required]],
    ativo: [true],
  });

  ngOnInit(): void {
    if (this.data) {
      this.isEdit.set(true);
      this.form.patchValue({
        nome: this.data.nome,
        email: this.data.email,
        cargo: this.data.cargo,
        ativo: this.data.ativo,
      });
    } else {
      this.form.controls.senha.setValidators([Validators.required, Validators.minLength(6)]);
      this.form.controls.senha.updateValueAndValidity();
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { senha, ...rest } = this.form.getRawValue();
    const data: Record<string, unknown> = { ...rest };
    if (senha) {
      data['senha'] = senha;
    }

    const request$ = this.isEdit()
      ? this.usuariosService.atualizar(this.data!.id, data)
      : this.usuariosService.criar(data as Omit<Usuario, 'id' | 'empresaId' | 'createdAt' | 'updatedAt'>);

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.notification.success(
          this.isEdit() ? 'Usuário atualizado com sucesso.' : 'Usuário criado com sucesso.'
        );
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.notification.error(
          err.message ?? 'Erro ao salvar usuário.'
        );
      },
    });
  }
}
