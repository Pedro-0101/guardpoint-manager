import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormBuilder, ReactiveFormsModule, Validators, ValidationErrors, type ValidatorFn } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UsuariosService, CreateSenhaVigiaPayload, UpdateSenhaVigiaPayload } from './usuarios.service';
import { ConfiguracoesService } from '../configuracoes/configuracoes.service';
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
import { ZardDialogService, Z_MODAL_DATA } from '@/shared/components/dialog/dialog.service';
import { VigiaSenhasExportDialog } from './vigia-senhas-export-dialog.component';
import { Usuario } from '../../core/models/usuario.model';
import { SenhaVigia } from '../../core/models/senha.model';
import { ConfigEscalonamento } from '../../core/models/config.model';

interface CustomFormControls {
  codigo: FormControl<string>;
  escalonamentoId: FormControl<string | null>;
}

@Component({
  selector: 'gp-vigia-senhas-form',
  imports: [
    ReactiveFormsModule,
    ZardInputDirective,
    ZardButtonComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardFormMessageComponent,
    ZardSkeletonComponent,
    ZardSelectComponent,
    ZardSelectItemComponent,
    NgIcon,
  ],
  templateUrl: './vigia-senhas-form.component.html',
})
export class VigiaSenhasFormComponent implements OnInit, OnDestroy {
  private readonly usuariosService = inject(UsuariosService);
  private readonly configuracoesService = inject(ConfiguracoesService);
  private readonly notification = inject(NotificationService);
  private readonly dialogRef = inject(ZardDialogRef<VigiaSenhasFormComponent>);
  private readonly dialog = inject(ZardDialogService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();
  readonly usuario = inject<Usuario>(Z_MODAL_DATA);

  readonly loading = signal(true);
  readonly senhas = signal<SenhaVigia[]>([]);
  readonly escalonamentos = signal<ConfigEscalonamento[]>([]);

  readonly okSenha = computed(() => this.senhas().find((s) => s.tipo === 'ok') ?? null);
  readonly emergenciaSenha = computed(() => this.senhas().find((s) => s.tipo === 'emergencia') ?? null);
  readonly customSenhas = computed(() => this.senhas().filter((s) => s.tipo === 'customizada'));
  readonly escalonamentosSistema = computed(() => this.escalonamentos().filter((e) => e.sistema));
  readonly escalonamentoSistemaId = computed(() => this.escalonamentosSistema()[0]?.id ?? null);

  private readonly atLeastTwoNumbers: ValidatorFn = (control) => {
    const value = String(control.value ?? '');
    const digitCount = (value.match(/\d/g) ?? []).length;
    return digitCount >= 2 ? null : { atLeastTwoNumbers: { required: 2, actual: digitCount } };
  };

  readonly okCodigo = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2), Validators.maxLength(6), this.atLeastTwoNumbers],
  });
  readonly emergenciaCodigo = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2), Validators.maxLength(6), this.atLeastTwoNumbers],
  });

  customForms: Record<string, CustomFormControls> = {};

  readonly savingOk = signal(false);
  readonly savingEmergencia = signal(false);
  readonly savingCustomId = signal<string | null>(null);
  readonly deletingSenhaId = signal<string | null>(null);

  readonly showingNewCustom = signal(false);
  readonly savingNewCustom = signal(false);

  novoCustomForm = this.fb.group({
    codigo: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(6), this.atLeastTwoNumbers]),
    escalonamentoId: this.fb.control<string | null>(null, [Validators.required]),
  });

  ngOnInit(): void {
    this.carregarDados();
    this.carregarEscalonamentos();
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

  private carregarEscalonamentos(): void {
    this.configuracoesService
      .listarEscalonamentos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => {
          this.escalonamentos.set(list);
        },
        error: (err) => {
          console.error('[VigiaSenhasForm] Erro ao carregar escalonamentos:', err);
          this.notification.error(err.message ?? 'Erro ao carregar escalonamentos.');
        },
      });
  }

  escalonamentosDisponiveis(escalonamentoAtualId: string | null): ConfigEscalonamento[] {
    return this.escalonamentos().filter((e) => {
      if (e.id === escalonamentoAtualId) return true;
      if (e.sistema || e.atrasoMinutos !== 0) return false;
      return !e.emUso;
    });
  }

  private buildCustomForm(senha: SenhaVigia): CustomFormControls {
    return {
      codigo: new FormControl(senha.codigo, {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2), Validators.maxLength(6), this.atLeastTwoNumbers],
      }),
      escalonamentoId: new FormControl(senha.escalonamentoId, {
        validators: [Validators.required],
      }),
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
    if (!this.escalonamentoSistemaId()) {
      this.notification.error('Nível de escalonamento do sistema não encontrado.');
      return;
    }
    if (this.savingEmergencia()) return;

    this.savingEmergencia.set(true);
    const emergencia = this.emergenciaSenha();
    const escalonamentoId = this.escalonamentoSistemaId() ?? undefined;

    const request$ = emergencia
      ? this.usuariosService.atualizarSenha(this.usuario.id, emergencia.id, { codigo: this.emergenciaCodigo.value, escalonamentoId })
      : this.usuariosService.criarSenha(this.usuario.id, { tipo: 'emergencia', codigo: this.emergenciaCodigo.value, escalonamentoId });

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
    if (form.codigo.invalid || form.escalonamentoId.invalid) {
      form.codigo.markAsTouched();
      form.escalonamentoId.markAsTouched();
      return;
    }
    if (this.savingCustomId()) return;

    this.savingCustomId.set(senhaId);
    const payload: UpdateSenhaVigiaPayload = {
      codigo: form.codigo.value,
      escalonamentoId: form.escalonamentoId.value ?? undefined,
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
      escalonamentoId: raw.escalonamentoId ?? undefined,
    };

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

  exportar(): void {
    this.dialog.create({
      zTitle: `Exportar senhas — ${this.usuario.nome}`,
      zContent: VigiaSenhasExportDialog,
      zWidth: '600px',
      zData: {
        usuarioNome: this.usuario.nome,
        senhas: this.senhas(),
        escalonamentos: this.escalonamentos(),
      },
      zCancelText: 'Fechar',
      zOkText: null,
    });
  }

  private atualizarSenhaLocal(updated: SenhaVigia): void {
    this.senhas.update((list) =>
      list.map((s) => (s.id === updated.id ? updated : s)),
    );
  }
}