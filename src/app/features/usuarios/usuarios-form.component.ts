import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators, type ValidatorFn } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { UsuariosService, CreateUsuarioPayload, UpdateUsuarioPayload } from './usuarios.service';
import { ConfiguracoesService } from '../configuracoes/configuracoes.service';
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
import { ZardSelectComponent, ZardSelectItemComponent } from '@/shared/components/select';
import { ZardDialogRef } from '@/shared/components/dialog/dialog-ref';
import { Z_MODAL_DATA } from '@/shared/components/dialog/dialog.service';
import { Usuario } from '../../core/models/usuario.model';
import { ConfigEscalonamento } from '../../core/models/config.model';
import { Subject, forkJoin, map, switchMap } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface CustomSenhaEntry {
  id: number;
  codigo: FormControl<string>;
  escalonamentoId: FormControl<string | null>;
}

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
    ZardSelectComponent,
    ZardSelectItemComponent,
  ],
  templateUrl: './usuarios-form.component.html',
})
export class UsuariosFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly usuariosService = inject(UsuariosService);
  private readonly configuracoesService = inject(ConfiguracoesService);
  private readonly dialogRef = inject(ZardDialogRef<UsuariosFormComponent>);
  private readonly notification = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();
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

  readonly escalonamentos = signal<ConfigEscalonamento[]>([]);
  readonly escalonamentosSistema = computed(() =>
    this.escalonamentos().filter((e) => e.sistema),
  );
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

  private customSenhaIdCounter = 0;
  readonly customSenhas = signal<CustomSenhaEntry[]>([]);

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
    this.carregarEscalonamentos();
    if (!this.isEdit()) {
      this.setupCrossValidation();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private carregarEscalonamentos(): void {
    this.configuracoesService
      .listarEscalonamentos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => this.escalonamentos.set(list),
        error: (err) =>
          console.error('[UsuariosForm] Erro ao carregar escalonamentos:', err),
      });
  }

  private setupCrossValidation(): void {
    this.okCodigo.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.revalidarSenhas());
    this.emergenciaCodigo.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.revalidarSenhas());
  }

  private revalidarSenhas(): void {
    interface CodeEntry { control: FormControl<string>; value: string }
    const entries: CodeEntry[] = [];

    const okValue = this.okCodigo.value.trim();
    if (okValue) entries.push({ control: this.okCodigo, value: okValue });

    const emergValue = this.emergenciaCodigo.value.trim();
    if (emergValue) entries.push({ control: this.emergenciaCodigo, value: emergValue });

    for (const entry of this.customSenhas()) {
      const val = entry.codigo.value.trim();
      if (val) entries.push({ control: entry.codigo, value: val });
    }

    for (const entry of entries) {
      const duplicates = entries.filter((e) => e.control !== entry.control && e.value === entry.value);
      const currentErrors = { ...entry.control.errors };
      if (duplicates.length > 0) {
        currentErrors['senhaDuplicada'] = true;
      } else {
        delete currentErrors['senhaDuplicada'];
      }
      entry.control.setErrors(Object.keys(currentErrors).length > 0 ? currentErrors : null);
    }
  }

  addCustomSenha(): void {
    const id = this.customSenhaIdCounter++;
    const entry: CustomSenhaEntry = {
      id,
      codigo: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2), Validators.maxLength(6), this.atLeastTwoNumbers],
    });
    entry.codigo.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.revalidarSenhas());
    this.customSenhas.update((list) => [...list, entry]);
  }

  removeCustomSenha(id: number): void {
    this.customSenhas.update((list) => list.filter((e) => e.id !== id));
    this.revalidarSenhas();
  }

  escalonamentosDisponiveis(escalonamentoAtualId: string | null): ConfigEscalonamento[] {
    return this.escalonamentos().filter((e) => {
      if (e.id === escalonamentoAtualId) return true;
      if (e.sistema || e.atrasoMinutos !== 0) return false;
      return !e.emUso;
    });
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

  private validaSenhasVigia(): boolean {
    let valid = true;

    if (this.okCodigo.invalid) {
      this.okCodigo.markAsTouched();
      valid = false;
    }
    if (this.emergenciaCodigo.invalid) {
      this.emergenciaCodigo.markAsTouched();
      valid = false;
    }

    if (!this.escalonamentoSistemaId()) {
      this.notification.error('Nível de escalonamento do sistema não encontrado. Configure-o antes de criar o vigia.');
      valid = false;
    }

    for (const entry of this.customSenhas()) {
      if (entry.codigo.invalid) {
        entry.codigo.markAsTouched();
        valid = false;
      }
      if (entry.escalonamentoId.invalid) {
        entry.escalonamentoId.markAsTouched();
        valid = false;
      }
    }

    return valid;
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

    if (!this.isEdit() && this.form.controls.cargo.value === 'vigia') {
      if (!this.validaSenhasVigia()) return;
    }

    this.loading.set(true);
    const { nome, email, cargo, ativo, senha } = this.form.getRawValue();

    if (this.isEdit()) {
      this.usuariosService
        .atualizar(this.data!.id, {
          nome,
          email,
          cargo,
          ativo,
          ...(senha ? { senha } : {}),
        } as UpdateUsuarioPayload)
        .subscribe({
          next: () => {
            this.loading.set(false);
            this.notification.success('Usuário atualizado com sucesso.');
            this.dialogRef.close(true);
          },
          error: (err) => {
            this.loading.set(false);
            this.notification.error(err.message ?? 'Erro ao atualizar usuário.');
          },
        });
      return;
    }

    const createPayload: CreateUsuarioPayload = { nome, email, cargo, senha, ativo };

    if (cargo === 'vigia') {
      this.usuariosService
        .criar(createPayload)
        .pipe(
          switchMap((usuario) => {
            const passwordReqs = [
              this.usuariosService.criarSenha(usuario.id, {
                tipo: 'ok',
                codigo: this.okCodigo.getRawValue(),
              }),
              this.usuariosService.criarSenha(usuario.id, {
                tipo: 'emergencia',
                codigo: this.emergenciaCodigo.getRawValue(),
                escalonamentoId: this.escalonamentoSistemaId() as string,
              }),
            ];

            for (const entry of this.customSenhas()) {
              if (entry.codigo.valid && entry.escalonamentoId.valid) {
                passwordReqs.push(
                  this.usuariosService.criarSenha(usuario.id, {
                    tipo: 'customizada',
                    codigo: entry.codigo.getRawValue(),
                    escalonamentoId: entry.escalonamentoId.getRawValue() ?? undefined,
                  }),
                );
              }
            }

            return forkJoin(passwordReqs).pipe(
              map(() => undefined),
            );
          }),
        )
        .subscribe({
          next: () => {
            this.loading.set(false);
            this.notification.success('Usuário criado com sucesso.');
            this.dialogRef.close(true);
          },
          error: (err) => {
            this.loading.set(false);
            this.notification.error(
              'Usuário criado, mas houve erro ao configurar as senhas vinculativas. Configure-as manualmente na tela de senhas do vigia.',
            );
            this.dialogRef.close(true);
          },
        });
      return;
    }

    this.usuariosService.criar(createPayload).subscribe({
      next: () => {
        this.loading.set(false);
        this.notification.success('Usuário criado com sucesso.');
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.notification.error(err.message ?? 'Erro ao salvar usuário.');
      },
    });
  }
}
