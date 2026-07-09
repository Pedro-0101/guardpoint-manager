import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfiguracoesService } from './configuracoes.service';
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
import { ConfigEscalonamento } from '../../core/models/config.model';
import { Usuario } from '../../core/models/usuario.model';

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
  readonly data = inject<ConfigEscalonamento | null>(Z_MODAL_DATA, { optional: true }) ?? null;

  readonly loading = signal(false);
  readonly usuarios = signal<Usuario[]>([]);

  form = this.fb.nonNullable.group({
    atrasoMinutos: [5, [Validators.required, Validators.min(1)]],
    descricao: [''],
    usuarioIds: [[] as string[], [Validators.required]],
  });

  ngOnInit(): void {
    this.carregarUsuarios();

    if (this.data) {
      this.form.patchValue({
        atrasoMinutos: this.data.atrasoMinutos,
        descricao: this.data.descricao ?? '',
        usuarioIds: this.data.usuarioIds ?? [],
      });
    }
  }

  private carregarUsuarios(): void {
    this.usuariosService.listar().subscribe({
      next: (users) => {
        this.usuarios.set(users.filter((u) => u.ativo));
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

    this.configuracoesService
      .salvarEscalonamento({
        atrasoMinutos: raw.atrasoMinutos,
        descricao: raw.descricao,
        usuarioIds: raw.usuarioIds,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.notification.success('Configuração de escalonamento salva com sucesso.');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading.set(false);
          this.notification.error(err.message ?? 'Erro ao salvar configuração de escalonamento.');
        },
      });
  }
}
