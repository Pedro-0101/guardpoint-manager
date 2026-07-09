import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { EscalasService } from './escalas.service';
import { PostosService } from '../postos/postos.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { NotificationService } from '../../core/services/notification.service';
import { ZardInputDirective } from '@/shared/components/input';
import { ZardComboboxImports, type ZardComboboxOption } from '@/shared/components/combobox';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { ZardDialogRef } from '@/shared/components/dialog/dialog-ref';
import { Z_MODAL_DATA } from '@/shared/components/dialog/dialog.service';
import { WeeklyGridComponent } from './weekly-grid/weekly-grid.component';
import { Escala, DiaEscalaEntry } from '../../core/models/escala.model';
import { Posto } from '../../core/models/posto.model';
import { Usuario } from '../../core/models/usuario.model';

interface EditData {
  usuarioId: string;
  postoId: string;
}

@Component({
  selector: 'gp-escalas-form',
  imports: [
    ReactiveFormsModule,
    ZardInputDirective,
    ZardComboboxImports,
    LoadingSpinner,
    WeeklyGridComponent,
  ],
  templateUrl: './escalas-form.component.html',
  styleUrl: './escalas-form.component.scss',
})
export class EscalasFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly escalasService = inject(EscalasService);
  private readonly postosService = inject(PostosService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly dialogRef = inject(ZardDialogRef<EscalasFormComponent>);
  private readonly notification = inject(NotificationService);
  readonly data = inject<EditData | null>(Z_MODAL_DATA, { optional: true }) ?? null;

  readonly loading = signal(false);
  readonly loadingDeps = signal(false);
  readonly loadingEscalas = signal(false);
  readonly isEdit = signal(false);

  readonly postos = signal<Posto[]>([]);
  readonly vigias = signal<Usuario[]>([]);

  readonly vigiaOptions = computed<ZardComboboxOption[]>(() =>
    this.vigias().map((v) => ({ value: v.id, label: v.nome }))
  );
  readonly postoOptions = computed<ZardComboboxOption[]>(() =>
    this.postos().map((p) => ({ value: p.id, label: p.nome }))
  );

  readonly entries = signal<DiaEscalaEntry[]>([]);
  readonly totalHoras = computed(() => {
    let total = 0;
    for (const e of this.entries()) {
      const inicio = timeToMinutes(e.hora_inicio);
      const fim = timeToMinutes(e.hora_fim);
      if (e.dia_semana_inicio === e.dia_semana_fim) {
        total += fim - inicio;
      } else {
        total += (24 * 60 - inicio) + fim;
      }
    }
    return total / 60;
  });
  private existingEscalas: Escala[] = [];

  form = this.fb.nonNullable.group({
    postoId: ['', [Validators.required]],
    usuarioId: ['', [Validators.required]],
    toleranciaMin: [
      5,
      [Validators.required, Validators.min(0), Validators.max(120)],
    ],
  });

  ngOnInit(): void {
    this.carregarDependencias();

    if (this.data) {
      this.isEdit.set(true);
      this.form.patchValue({
        usuarioId: this.data.usuarioId,
        postoId: this.data.postoId,
      });
      this.carregarEscalasExistentes();
    }
  }

  carregarDependencias(): void {
    this.loadingDeps.set(true);
    forkJoin({
      postos: this.postosService.listar(),
      usuarios: this.usuariosService.listar(),
    }).subscribe({
      next: ({ postos, usuarios }) => {
        this.postos.set(postos.filter((p) => p.ativo));
        this.vigias.set(
          usuarios.filter((u) => u.ativo && u.cargo === 'vigia')
        );
        this.loadingDeps.set(false);
      },
      error: (err) => {
        this.loadingDeps.set(false);
        this.notification.error(
          err.message ?? 'Erro ao carregar postos e usuários.'
        );
      },
    });
  }

  carregarEscalasExistentes(): void {
    if (!this.data) return;
    this.loadingEscalas.set(true);
    this.escalasService
      .listar({
        usuario_id: this.data.usuarioId,
        posto_id: this.data.postoId,
        ativos: 'true',
      })
      .subscribe({
        next: (escalas) => {
          this.existingEscalas = escalas;
          this.entries.set(
            escalas
              .filter((e) => e.ativo)
              .map((e) => ({
                dia_semana_inicio: e.diaSemanaInicio,
                dia_semana_fim: e.diaSemanaFim,
                hora_inicio: e.horaInicio,
                hora_fim: e.horaFim,
              }))
          );
          if (escalas.length > 0) {
            this.form.controls.toleranciaMin.setValue(
              escalas[0].toleranciaMin
            );
          }
          this.loadingEscalas.set(false);
        },
        error: (err) => {
          this.loadingEscalas.set(false);
          this.notification.error(
            err.message ?? 'Erro ao carregar escalas existentes.'
          );
        },
      });
  }

  onEntriesChange(entries: DiaEscalaEntry[]): void {
    this.entries.set(entries);
  }

  submit(): void {
    if (this.loading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const currentEntries = this.entries();
    if (currentEntries.length === 0) {
      this.notification.warning(
        'Selecione pelo menos um período na grade semanal.'
      );
      return;
    }

    this.loading.set(true);
    const raw = this.form.getRawValue();

    const payload = {
      usuario_id: raw.usuarioId,
      posto_id: raw.postoId,
      tolerancia_min: raw.toleranciaMin,
      dias: currentEntries,
    };

    if (this.isEdit()) {
      this.atualizarEscalas(payload);
    } else {
      this.criarNovasEscalas(payload);
    }
  }

  private atualizarEscalas(payload: {
    usuario_id: string;
    posto_id: string;
    tolerancia_min: number;
    dias: DiaEscalaEntry[];
  }): void {
    if (payload.dias.length <= 7) {
      this.escalasService.substituirLote(payload).subscribe({
        next: () => {
          this.loading.set(false);
          this.notification.success('Escala atualizada com sucesso.');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading.set(false);
          this.notification.error(err.message ?? 'Erro ao atualizar escala.');
        },
      });
      return;
    }

    const ativas = this.existingEscalas.filter((e) => e.ativo);
    if (ativas.length > 0) {
      const deletes = ativas.map((e) => this.escalasService.excluir(e.id));
      forkJoin(deletes).subscribe({
        next: () => this.criarNovasEscalas(payload),
        error: (err) => {
          this.loading.set(false);
          this.notification.error(err.message ?? 'Erro ao remover escalas antigas.');
        },
      });
    } else {
      this.criarNovasEscalas(payload);
    }
  }

  private criarNovasEscalas(payload: {
    usuario_id: string;
    posto_id: string;
    tolerancia_min: number;
    dias: DiaEscalaEntry[];
  }): void {
    const batchSize = 7;
    const batches: DiaEscalaEntry[][] = [];
    for (let i = 0; i < payload.dias.length; i += batchSize) {
      batches.push(payload.dias.slice(i, i + batchSize));
    }

    const requests = batches.map((dias) =>
      this.escalasService.criarLote({ ...payload, dias })
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.loading.set(false);
        this.notification.success(
          this.isEdit()
            ? 'Escala atualizada com sucesso.'
            : 'Escala criada com sucesso.'
        );
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.notification.error(err.message ?? 'Erro ao salvar escala.');
      },
    });
  }
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
