import { Component, computed, inject, signal, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SubstituicoesService } from './substituicoes.service';
import { PostosService } from '../postos/postos.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { NotificationService } from '../../core/services/notification.service';
import { ZardInputDirective } from '@/shared/components/input';
import { ZardComboboxImports, type ZardComboboxOption } from '@/shared/components/combobox';
import { ZardCheckboxComponent } from '@/shared/components/checkbox/checkbox.component';
import {
  ZardFormFieldComponent,
  ZardFormLabelComponent,
  ZardFormControlComponent,
  ZardFormMessageComponent,
} from '@/shared/components/form';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { ZardDialogRef } from '@/shared/components/dialog/dialog-ref';
import { Z_MODAL_DATA } from '@/shared/components/dialog/dialog.service';
import {
  Substituicao,
  CreateSubstituicaoPayload,
  UpdateSubstituicaoPayload,
} from '../../core/models/substituicao.model';
import { Posto } from '../../core/models/posto.model';
import { Usuario } from '../../core/models/usuario.model';

// Hora fim menor que hora início é válido (turno noturno que cruza a
// meia-noite); apenas o intervalo de datas precisa ser consistente.
function periodoValidator(group: AbstractControl): ValidationErrors | null {
  const inicio = group.get('dataInicio')?.value;
  const fim = group.get('dataFim')?.value;
  return inicio && fim && fim < inicio ? { periodoInvalido: true } : null;
}

@Component({
  selector: 'gp-substituicoes-form',
  imports: [
    ReactiveFormsModule,
    ZardInputDirective,
    ZardComboboxImports,
    ZardCheckboxComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardFormMessageComponent,
    LoadingSpinner,
  ],
  templateUrl: './substituicoes-form.component.html',
  styleUrl: './substituicoes-form.component.scss',
})
export class SubstituicoesFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly substituicoesService = inject(SubstituicoesService);
  private readonly postosService = inject(PostosService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly dialogRef = inject(ZardDialogRef<SubstituicoesFormComponent>);
  private readonly notification = inject(NotificationService);
  readonly data = inject<Substituicao | null>(Z_MODAL_DATA, { optional: true }) ?? null;

  readonly loading = signal(false);
  readonly loadingDeps = signal(false);
  readonly isEdit = signal(false);

  readonly postos = signal<Posto[]>([]);
  readonly vigias = signal<Usuario[]>([]);

  readonly vigiaOptions = computed<ZardComboboxOption[]>(() =>
    this.vigias().map((v) => ({ value: v.id, label: v.nome }))
  );
  readonly postoOptions = computed<ZardComboboxOption[]>(() =>
    this.postos().map((p) => ({ value: p.id, label: p.nome }))
  );

  form = this.fb.nonNullable.group(
    {
      usuarioId: ['', [Validators.required]],
      postoId: ['', [Validators.required]],
      dataInicio: ['', [Validators.required]],
      dataFim: ['', [Validators.required]],
      horaInicio: ['', [Validators.required]],
      horaFim: ['', [Validators.required]],
      motivo: [''],
      toleranciaMin: [5, [Validators.min(0), Validators.max(120)]],
      ativo: [true],
    },
    { validators: [periodoValidator] }
  );

  ngOnInit(): void {
    if (this.data) {
      this.isEdit.set(true);
      this.form.patchValue({
        usuarioId: this.data.usuarioId,
        postoId: this.data.postoId,
        dataInicio: this.data.dataInicio,
        dataFim: this.data.dataFim,
        horaInicio: this.data.horaInicio,
        horaFim: this.data.horaFim,
        motivo: this.data.motivo,
        toleranciaMin: this.data.toleranciaMin,
        ativo: this.data.ativo,
      });
    }

    this.carregarDependencias();
  }

  private carregarDependencias(): void {
    this.loadingDeps.set(true);

    forkJoin({
      postos: this.postosService.listar({ ativos: 'true' }),
      usuarios: this.usuariosService.listar(),
    }).subscribe({
      next: ({ postos, usuarios }) => {
        this.postos.set(postos);
        this.vigias.set(usuarios.filter((u) => u.ativo && u.cargo === 'vigia'));
        this.loadingDeps.set(false);
      },
      error: (err) => {
        this.loadingDeps.set(false);
        this.notification.error(err.message ?? 'Erro ao carregar vigias e postos.');
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

    if (this.isEdit()) {
      const payload: UpdateSubstituicaoPayload = {
        usuario_id: raw.usuarioId,
        posto_id: raw.postoId,
        data_inicio: raw.dataInicio,
        data_fim: raw.dataFim,
        hora_inicio: raw.horaInicio,
        hora_fim: raw.horaFim,
        motivo: raw.motivo.trim(),
        tolerancia_min: raw.toleranciaMin,
        ativo: raw.ativo,
      };

      this.substituicoesService.atualizar(this.data!.id, payload).subscribe({
        next: () => {
          this.loading.set(false);
          this.notification.success('Substituição atualizada com sucesso.');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading.set(false);
          this.notification.error(err.message ?? 'Erro ao atualizar substituição.');
        },
      });
      return;
    }

    const payload: CreateSubstituicaoPayload = {
      usuario_id: raw.usuarioId,
      posto_id: raw.postoId,
      data_inicio: raw.dataInicio,
      data_fim: raw.dataFim,
      hora_inicio: raw.horaInicio,
      hora_fim: raw.horaFim,
      motivo: raw.motivo.trim(),
      tolerancia_min: raw.toleranciaMin,
    };

    this.substituicoesService.criar(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.notification.success('Substituição criada com sucesso.');
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.notification.error(err.message ?? 'Erro ao criar substituição.');
      },
    });
  }
}
