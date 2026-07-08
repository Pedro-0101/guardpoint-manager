import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuariosService, CreateUsuarioPayload, UpdateUsuarioPayload } from './usuarios.service';
import { NotificationService } from '../../core/services/notification.service';
import { ZardInputDirective } from '@/shared/components/input';
import { ZardRadioComponent } from '@/shared/components/radio';
import {
  ZardFormFieldComponent,
  ZardFormLabelComponent,
  ZardFormControlComponent,
  ZardFormMessageComponent,
} from '@/shared/components/form';
import { ZardDialogRef } from '@/shared/components/dialog/dialog-ref';
import { Z_MODAL_DATA } from '@/shared/components/dialog/dialog.service';
import { Usuario } from '../../core/models/usuario.model';

@Component({
  selector: 'gp-usuarios-form',
  imports: [
    ReactiveFormsModule,
    ZardInputDirective,
    ZardRadioComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardFormMessageComponent,
  ],
  templateUrl: './usuarios-form.component.html',
})
export class UsuariosFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usuariosService = inject(UsuariosService);
  private readonly dialogRef = inject(ZardDialogRef<UsuariosFormComponent>);
  private readonly notification = inject(NotificationService);
  readonly data = inject<Usuario | null>(Z_MODAL_DATA, { optional: true }) ?? null;

  readonly loading = signal(false);
  readonly isEdit = signal(false);

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
    if (this.loading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { nome, email, cargo, ativo, senha } = this.form.getRawValue();

    const request$ = this.isEdit()
      ? this.usuariosService.atualizar(this.data!.id, {
          nome,
          email,
          cargo,
          ativo,
          ...(senha ? { senha } : {}),
        } as UpdateUsuarioPayload)
      : this.usuariosService.criar({
          nome,
          email,
          cargo,
          senha,
          ativo,
        } as CreateUsuarioPayload);

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
