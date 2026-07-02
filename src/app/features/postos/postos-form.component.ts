import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PostosService } from './postos.service';
import { NotificationService } from '../../core/services/notification.service';
import { Posto } from '../../core/models/posto.model';

@Component({
  selector: 'gp-postos-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  ],
  templateUrl: './postos-form.component.html',
  styleUrl: './postos-form.component.scss',
})
export class PostosFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly postosService = inject(PostosService);
  private readonly dialogRef = inject(MatDialogRef<PostosFormComponent>);
  private readonly notification = inject(NotificationService);
  readonly data = inject<Posto | null>(MAT_DIALOG_DATA, { optional: true }) ?? null;

  readonly loading = signal(false);
  readonly isEdit = signal(false);

  form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    latitude: [0, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: [0, [Validators.required, Validators.min(-180), Validators.max(180)]],
    raioM: [100, [Validators.required, Validators.min(10), Validators.max(5000)]],
    ativo: [true],
  });

  ngOnInit(): void {
    if (this.data) {
      this.isEdit.set(true);
      this.form.patchValue({
        nome: this.data.nome,
        latitude: this.data.latitude,
        longitude: this.data.longitude,
        raioM: this.data.raioM,
        ativo: this.data.ativo,
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const data = this.form.getRawValue();

    const request$ = this.isEdit()
      ? this.postosService.atualizar(this.data!.id, data)
      : this.postosService.criar(data);

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.notification.success(
          this.isEdit() ? 'Posto atualizado com sucesso.' : 'Posto criado com sucesso.'
        );
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.notification.error(
          err.message ?? 'Erro ao salvar posto.'
        );
      },
    });
  }
}
