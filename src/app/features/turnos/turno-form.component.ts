import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TurnosService } from './turnos.service';
import { PostosService } from '../postos/postos.service';
import { NotificationService } from '../../core/services/notification.service';
import { ZardDialogRef } from '@/shared/components/dialog/dialog-ref';
import { ZardInputDirective } from '@/shared/components/input';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { Posto } from '../../core/models/posto.model';

@Component({
  selector: 'gp-turno-form',
  imports: [
    ReactiveFormsModule,
    ZardInputDirective,
    LoadingSpinner,
  ],
  templateUrl: './turno-form.component.html',
  styleUrl: './turno-form.component.scss',
})
export class TurnoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly turnosService = inject(TurnosService);
  private readonly postosService = inject(PostosService);
  private readonly dialogRef = inject(ZardDialogRef<TurnoFormComponent>);
  private readonly notification = inject(NotificationService);

  readonly loading = signal(false);
  readonly loadingDeps = signal(false);

  readonly postos = signal<Posto[]>([]);

  form = this.fb.nonNullable.group({
    device_id: ['', [Validators.required]],
    posto_id: ['', [Validators.required]],
    intervalo_min: [0, [Validators.min(1), Validators.max(120)]],
  });

  ngOnInit(): void {
    this.carregarDependencias();
  }

  private carregarDependencias(): void {
    this.loadingDeps.set(true);

    this.postosService.listar().subscribe({
      next: (postos) => {
        this.postos.set(postos.filter((p) => p.ativo));
        this.loadingDeps.set(false);
      },
      error: (err) => {
        this.loadingDeps.set(false);
        this.notification.error(err.message ?? 'Erro ao carregar postos.');
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

    this.turnosService.iniciar(raw).subscribe({
      next: () => {
        this.loading.set(false);
        this.notification.success('Turno iniciado com sucesso.');
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.notification.error(err.message ?? 'Erro ao iniciar turno.');
      },
    });
  }
}
