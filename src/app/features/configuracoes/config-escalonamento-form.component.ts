import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ConfiguracoesService,
  CreateEscalonamentoPayload,
  UpdateEscalonamentoPayload,
} from './configuracoes.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { NotificationService } from '../../core/services/notification.service';
import { ZardInputDirective } from '@/shared/components/input';
import { ZardSelectComponent, ZardSelectItemComponent } from '@/shared/components/select';
import {
  ZardFormFieldComponent,
  ZardFormLabelComponent,
  ZardFormControlComponent,
  ZardFormMessageComponent,
} from '@/shared/components/form';
import { ZardDialogRef } from '@/shared/components/dialog/dialog-ref';
import { Z_MODAL_DATA } from '@/shared/components/dialog/dialog.service';
import { NivelEscalonamento } from '../../core/models/config.model';

interface UsuarioOption {
  value: string;
  label: string;
}

@Component({
  selector: 'gp-config-escalonamento-form',
  imports: [
    ReactiveFormsModule,
    ZardInputDirective,
    ZardSelectComponent,
    ZardSelectItemComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardFormMessageComponent,
  ],
  templateUrl: './config-escalonamento-form.component.html',
})
export class ConfigEscalonamentoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly configuracoesService = inject(ConfiguracoesService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly dialogRef = inject(ZardDialogRef<ConfigEscalonamentoFormComponent>);
  private readonly notification = inject(NotificationService);
  readonly data = inject<NivelEscalonamento | null>(Z_MODAL_DATA, { optional: true }) ?? null;

  readonly loading = signal(false);
  readonly isEdit = signal(false);
  readonly usuarios = signal<UsuarioOption[]>([]);

  form = this.fb.nonNullable.group({
    nivel: [1, [Validators.required, Validators.min(1)]],
    atrasoMinutos: [5, [Validators.required, Validators.min(1)]],
    usuarioIds: [[] as string[]],
  });

  ngOnInit(): void {
    this.carregarUsuarios();

    if (this.data) {
      this.isEdit.set(true);
      this.form.patchValue({
        nivel: this.data.nivel,
        atrasoMinutos: this.data.atrasoMinutos,
        usuarioIds: this.data.usuarioIds ?? [],
      });
      this.form.controls.nivel.disable();
    }
  }

  private carregarUsuarios(): void {
    this.usuariosService.listar().subscribe({
      next: (users) => {
        this.usuarios.set(
          users
            .filter((u) => u.cargo === 'admin')
            .map((u) => ({ value: u.id, label: u.nome })),
        );
      },
      error: () => {
        this.notification.error('Erro ao carregar usuários.');
      },
    });
  }

  submit(): void {
    if (this.loading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const raw = this.form.getRawValue();

    const request$ = this.isEdit()
      ? this.configuracoesService.atualizarEscalonamento(this.data!.id, {
          atrasoMinutos: raw.atrasoMinutos,
          usuarioIds: raw.usuarioIds,
        } as UpdateEscalonamentoPayload)
      : this.configuracoesService.criarEscalonamento({
          nivel: raw.nivel,
          atrasoMinutos: raw.atrasoMinutos,
          usuarioIds: raw.usuarioIds,
        } as CreateEscalonamentoPayload);

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.notification.success(
          this.isEdit() ? 'Nível atualizado com sucesso.' : 'Nível criado com sucesso.',
        );
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.notification.error(err.message ?? 'Erro ao salvar nível de escalonamento.');
      },
    });
  }
}
