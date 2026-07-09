import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UsuariosService, CreateSenhaVigiaPayload, UpdateSenhaVigiaPayload } from './usuarios.service';
import { NotificationService } from '../../core/services/notification.service';
import { ZardInputDirective } from '@/shared/components/input';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { ZardSelectComponent, ZardSelectItemComponent } from '@/shared/components/select';
import {
  ZardFormFieldComponent,
  ZardFormLabelComponent,
  ZardFormControlComponent,
  ZardFormMessageComponent,
} from '@/shared/components/form';
import { ZardSkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { ZardDialogRef } from '@/shared/components/dialog/dialog-ref';
import { Z_MODAL_DATA } from '@/shared/components/dialog/dialog.service';
import { Usuario } from '../../core/models/usuario.model';
import { SenhaVigia } from '../../core/models/senha.model';

interface CustomFormControls {
  codigo: FormControl<string>;
  descricao: FormControl<string>;
}

@Component({
  selector: 'gp-vigia-senhas-form',
  imports: [
    ReactiveFormsModule,
    ZardInputDirective,
    ZardButtonComponent,
    ZardSelectComponent,
    ZardSelectItemComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardFormMessageComponent,
    ZardSkeletonComponent,
    NgIcon,
  ],
  templateUrl: './vigia-senhas-form.component.html',
})
export class VigiaSenhasFormComponent implements OnInit, OnDestroy {
  private readonly usuariosService = inject(UsuariosService);
  private readonly notification = inject(NotificationService);
  private readonly dialogRef = inject(ZardDialogRef<VigiaSenhasFormComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();
  readonly usuario = inject<Usuario>(Z_MODAL_DATA);

  readonly loading = signal(true);
  readonly senhas = signal<SenhaVigia[]>([]);

  readonly okSenha = computed(() => this.senhas().find((s) => s.tipo === 'ok') ?? null);
  readonly emergenciaSenha = computed(() => this.senhas().find((s) => s.tipo === 'emergencia') ?? null);
  readonly customSenhas = computed(() => this.senhas().filter((s) => s.tipo === 'customizada'));

  readonly okCodigo = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(4), Validators.maxLength(6)],
  });
  readonly emergenciaCodigo = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(4), Validators.maxLength(6)],
  });

  customForms: Record<string, CustomFormControls> = {};

  readonly savingOk = signal(false);
  readonly savingEmergencia = signal(false);
  readonly savingCustomId = signal<string | null>(null);
  readonly deletingSenhaId = signal<string | null>(null);

  readonly showingNewCustom = signal(false);
  readonly savingNewCustom = signal(false);

  novoCustomForm = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(6)]],
    descricao: [''],
  });

  ngOnInit(): void {
    this.carregarDados();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private carregarDados(): void {
    this.loading.set(true);

    this.usuariosService
      .listarSenhas(this.usuario.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (senhas) => {
          this.senhas.set(senhas);
          this.inicializarForms();
        },
        error: (err) => {
          console.error('[VigiaSenhasForm] Erro ao carregar senhas:', err);
          this.notification.error(err.message ?? 'Erro ao carregar senhas.');
          this.loading.set(false);
        },
      });
  }

  private inicializarForms(): void {
    const ok = this.okSenha();
    const emergencia = this.emergenciaSenha();

    if (ok) {
      this.okCodigo.setValue(ok.codigo);
    }

    if (emergencia) {
      this.emergenciaCodigo.setValue(emergencia.codigo);
    }

    const newCustomForms: Record<string, CustomFormControls> = {};
    for (const senha of this.customSenhas()) {
      newCustomForms[senha.id] = this.buildCustomForm(senha);
    }
    this.customForms = newCustomForms;

    this.loading.set(false);
  }

  private buildCustomForm(senha: SenhaVigia): CustomFormControls {
    return {
      codigo: new FormControl(senha.codigo, {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(4), Validators.maxLength(6)],
      }),
      descricao: new FormControl(senha.descricao ?? '', { nonNullable: true }),
    };
  }

  salvarOk(): void {
    if (this.okCodigo.invalid) {
      this.okCodigo.markAsTouched();
      return;
    }
    if (this.savingOk()) return;

    this.savingOk.set(true);
    const ok = this.okSenha();

    const request$ = ok
      ? this.usuariosService.atualizarSenha(this.usuario.id, ok.id, { codigo: this.okCodigo.value })
      : this.usuariosService.criarSenha(this.usuario.id, { tipo: 'ok', codigo: this.okCodigo.value });

    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.atualizarSenhaLocal(updated);
          this.savingOk.set(false);
          this.okCodigo.markAsPristine();
          this.notification.success(ok ? 'Senha OK atualizada.' : 'Senha OK criada.');
        },
        error: (err) => {
          this.savingOk.set(false);
          console.error('[VigiaSenhasForm] Erro ao salvar senha OK:', err);
          this.notification.error(err.message ?? 'Erro ao salvar senha OK.');
        },
      });
  }

  salvarEmergencia(): void {
    if (this.emergenciaCodigo.invalid) {
      this.emergenciaCodigo.markAsTouched();
      return;
    }
    if (this.savingEmergencia()) return;

    this.savingEmergencia.set(true);
    const emergencia = this.emergenciaSenha();

    const request$ = emergencia
      ? this.usuariosService.atualizarSenha(this.usuario.id, emergencia.id, { codigo: this.emergenciaCodigo.value })
      : this.usuariosService.criarSenha(this.usuario.id, { tipo: 'emergencia', codigo: this.emergenciaCodigo.value });

    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.atualizarSenhaLocal(updated);
          this.savingEmergencia.set(false);
          this.emergenciaCodigo.markAsPristine();
          this.notification.success(emergencia ? 'Senha de emergência atualizada.' : 'Senha de emergência criada.');
        },
        error: (err) => {
          this.savingEmergencia.set(false);
          console.error('[VigiaSenhasForm] Erro ao salvar senha emergência:', err);
          this.notification.error(err.message ?? 'Erro ao salvar senha de emergência.');
        },
      });
  }

  salvarCustom(senhaId: string): void {
    const form = this.customForms[senhaId];
    if (!form) {
      this.notification.error('Senha customizada não encontrada. Recarregue o diálogo.');
      return;
    }
    if (form.codigo.invalid) {
      form.codigo.markAsTouched();
      return;
    }
    if (this.savingCustomId()) return;

    this.savingCustomId.set(senhaId);
    const payload: UpdateSenhaVigiaPayload = {
      codigo: form.codigo.value,
      descricao: form.descricao.value,
    };

    this.usuariosService
      .atualizarSenha(this.usuario.id, senhaId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.atualizarSenhaLocal(updated);
          this.savingCustomId.set(null);
          this.notification.success('Senha customizada atualizada.');
        },
        error: (err) => {
          this.savingCustomId.set(null);
          console.error('[VigiaSenhasForm] Erro ao salvar senha customizada:', err);
          this.notification.error(err.message ?? 'Erro ao atualizar senha customizada.');
        },
      });
  }

  removerCustom(senhaId: string): void {
    if (this.deletingSenhaId()) return;

    this.deletingSenhaId.set(senhaId);
    this.usuariosService
      .removerSenha(this.usuario.id, senhaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.senhas.update((list) => list.filter((s) => s.id !== senhaId));
          delete this.customForms[senhaId];
          this.deletingSenhaId.set(null);
          this.notification.success('Senha customizada removida.');
        },
        error: (err) => {
          this.deletingSenhaId.set(null);
          console.error('[VigiaSenhasForm] Erro ao remover senha customizada:', err);
          this.notification.error(err.message ?? 'Erro ao remover senha.');
        },
      });
  }

  criarCustom(): void {
    if (this.novoCustomForm.invalid) {
      this.novoCustomForm.markAllAsTouched();
      return;
    }
    if (this.savingNewCustom()) return;

    this.savingNewCustom.set(true);
    const raw = this.novoCustomForm.getRawValue();

    const payload: CreateSenhaVigiaPayload = {
      tipo: 'customizada',
      codigo: raw.codigo,
    };

    if (raw.descricao) {
      payload.descricao = raw.descricao;
    }

    this.usuariosService
      .criarSenha(this.usuario.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (nova) => {
          this.senhas.update((list) => [...list, nova]);
          this.customForms[nova.id] = this.buildCustomForm(nova);
          this.novoCustomForm.reset();
          this.showingNewCustom.set(false);
          this.savingNewCustom.set(false);
          this.notification.success('Senha customizada criada.');
        },
        error: (err) => {
          this.savingNewCustom.set(false);
          console.error('[VigiaSenhasForm] Erro ao criar senha customizada:', err);
          this.notification.error(err.message ?? 'Erro ao criar senha customizada.');
        },
      });
  }

  cancelarNovaCustom(): void {
    this.novoCustomForm.reset();
    this.showingNewCustom.set(false);
  }

  private atualizarSenhaLocal(updated: SenhaVigia): void {
    this.senhas.update((list) =>
      list.map((s) => (s.id === updated.id ? updated : s)),
    );
  }
}