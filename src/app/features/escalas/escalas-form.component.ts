import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { forkJoin } from 'rxjs';
import { EscalasService } from './escalas.service';
import { PostosService } from '../postos/postos.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { NotificationService } from '../../core/services/notification.service';
import { Escala } from '../../core/models/escala.model';
import { Posto } from '../../core/models/posto.model';
import { Usuario } from '../../core/models/usuario.model';

@Component({
  selector: 'gp-escalas-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './escalas-form.component.html',
  styleUrl: './escalas-form.component.scss',
})
export class EscalasFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly escalasService = inject(EscalasService);
  private readonly postosService = inject(PostosService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly dialogRef = inject(MatDialogRef<EscalasFormComponent>);
  private readonly notification = inject(NotificationService);
  readonly data = inject<Escala | null>(MAT_DIALOG_DATA, { optional: true }) ?? null;

  readonly loading = signal(false);
  readonly loadingDeps = signal(false);
  readonly isEdit = signal(false);

  readonly postos = signal<Posto[]>([]);
  readonly usuarios = signal<Usuario[]>([]);

  readonly diasSemana = [
    { value: 1, label: 'Seg' },
    { value: 2, label: 'Ter' },
    { value: 3, label: 'Qua' },
    { value: 4, label: 'Qui' },
    { value: 5, label: 'Sex' },
    { value: 6, label: 'Sáb' },
    { value: 0, label: 'Dom' },
  ];

  form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    postoId: ['', [Validators.required]],
    usuarioId: ['', [Validators.required]],
    diasSemana: [[] as number[], [Validators.required, Validators.minLength(1)]],
    horaInicio: ['08:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    horaFim: ['18:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    dataInicio: [new Date(), [Validators.required]],
    dataFim: [new Date(), [Validators.required]],
    toleranciaMin: [0, [Validators.required, Validators.min(0), Validators.max(120)]],
    ativo: [true],
  });

  ngOnInit(): void {
    this.carregarDependencias();

    if (this.data) {
      this.isEdit.set(true);
      this.form.patchValue({
        nome: this.data.nome,
        postoId: this.data.postoId,
        usuarioId: this.data.usuarioId,
        diasSemana: this.data.diasSemana,
        horaInicio: this.data.horaInicio,
        horaFim: this.data.horaFim,
        dataInicio: new Date(this.data.dataInicio + 'T00:00:00'),
        dataFim: new Date(this.data.dataFim + 'T00:00:00'),
        toleranciaMin: this.data.toleranciaMin,
        ativo: this.data.ativo,
      });
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
        this.usuarios.set(usuarios.filter((u) => u.ativo));
        this.loadingDeps.set(false);
      },
      error: (err) => {
        this.loadingDeps.set(false);
        this.notification.error(err.message ?? 'Erro ao carregar postos e usuários.');
      },
    });
  }

  toggleDia(dia: number): void {
    const current = this.form.controls.diasSemana.value;
    const index = current.indexOf(dia);
    if (index === -1) {
      this.form.controls.diasSemana.setValue([...current, dia].sort((a, b) => a - b));
    } else {
      this.form.controls.diasSemana.setValue(current.filter((d) => d !== dia));
    }
    this.form.controls.diasSemana.markAsTouched();
  }

  isDiaSelecionado(dia: number): boolean {
    return this.form.controls.diasSemana.value.includes(dia);
  }

  private toDateString(date: Date): string {
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const raw = this.form.getRawValue();

    const payload = {
      nome: raw.nome,
      posto_id: raw.postoId,
      usuario_id: raw.usuarioId,
      dias_semana: raw.diasSemana,
      hora_inicio: raw.horaInicio,
      hora_fim: raw.horaFim,
      data_inicio: this.toDateString(raw.dataInicio),
      data_fim: this.toDateString(raw.dataFim),
      tolerancia_min: raw.toleranciaMin,
      ativo: raw.ativo,
    };

    const request$ = this.isEdit()
      ? this.escalasService.atualizar(this.data!.id, payload)
      : this.escalasService.criar(payload);

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.notification.success(
          this.isEdit() ? 'Escala atualizada com sucesso.' : 'Escala criada com sucesso.'
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
