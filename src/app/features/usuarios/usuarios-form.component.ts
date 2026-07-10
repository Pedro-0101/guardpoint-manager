import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { UsuariosService, CreateUsuarioPayload, UpdateUsuarioPayload } from './usuarios.service';
import { NotificationService } from '../../core/services/notification.service';
import { ZardInputDirective } from '@/shared/components/input';
import { ZardRadioComponent, ZardRadioCardDirective } from '@/shared/components/radio';
import {
  ZardFormFieldComponent,
  ZardFormLabelComponent,
  ZardFormControlComponent,
  ZardFormMessageComponent,
  ZardFormStepperComponent,
} from '@/shared/components/form';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { ZardDialogRef } from '@/shared/components/dialog/dialog-ref';
import { Z_MODAL_DATA } from '@/shared/components/dialog/dialog.service';
import { Usuario } from '../../core/models/usuario.model';

@Component({
  selector: 'gp-usuarios-form',
  imports: [
    ReactiveFormsModule,
    NgIcon,
    ZardInputDirective,
    ZardRadioComponent,
    ZardRadioCardDirective,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardFormMessageComponent,
    ZardFormStepperComponent,
    ZardButtonComponent,
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
  readonly currentStep = signal(0);

  readonly stepLabels = ['Informações básicas', 'Tipo de usuário', 'Configurações'];
  readonly showStepper = computed(() => !this.isEdit());
  readonly isLastStep = computed(() => this.currentStep() === this.stepLabels.length - 1);

  readonly cargos = [
    {
      value: 'admin',
      label: 'Admin',
      description:
        'Acesso total ao sistema. Pode gerenciar usuários, postos, configurar escalonamento e acessar todos os relatórios.',
    },
    {
      value: 'supervisor',
      label: 'Supervisor',
      description:
        'Gerencia os turnos e vigias. Pode visualizar o mapa, alertas e relatórios, mas não pode alterar configurações do sistema.',
    },
    {
      value: 'vigia',
      label: 'Vigia',
      description:
        'Usuário operacional. Realiza rondas, registra checkpoints e reporta ocorrências durante o turno.',
    },
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

  nextStep(): void {
    if (this.currentStep() === 0) {
      this.form.controls.nome.markAsTouched();
      this.form.controls.email.markAsTouched();
      this.form.controls.senha.markAsTouched();
      if (
        this.form.controls.nome.invalid ||
        this.form.controls.email.invalid ||
        this.form.controls.senha.invalid
      ) {
        return;
      }
    }
    this.currentStep.update((s) => s + 1);
  }

  prevStep(): void {
    this.currentStep.update((s) => Math.max(0, s - 1));
  }

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.loading()) return;

    if (!this.isEdit() && !this.isLastStep()) {
      this.nextStep();
      return;
    }

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
          this.isEdit() ? 'Usuário atualizado com sucesso.' : 'Usuário criado com sucesso.',
        );
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.notification.error(err.message ?? 'Erro ao salvar usuário.');
      },
    });
  }
}
