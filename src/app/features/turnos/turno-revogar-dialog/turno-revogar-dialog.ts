import { Component, inject, signal } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';
import { TurnosService, RevogarSessaoResponse } from '../turnos.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Turno } from '../../../core/models/turno.model';

export interface TurnoRevogarDialogData {
  turno: Turno;
}

@Component({
  selector: 'gp-turno-revogar-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './turno-revogar-dialog.html',
  styleUrl: './turno-revogar-dialog.scss',
})
export class TurnoRevogarDialog {
  private readonly data = inject<TurnoRevogarDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<TurnoRevogarDialog>);
  private readonly turnosService = inject(TurnosService);
  private readonly notification = inject(NotificationService);

  readonly turno = this.data.turno;

  readonly revogando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly resultado = signal<RevogarSessaoResponse | null>(null);

  revogar(): void {
    this.revogando.set(true);
    this.erro.set(null);

    this.turnosService
      .revogarSessao(this.turno.id)
      .pipe(finalize(() => this.revogando.set(false)))
      .subscribe({
        next: (res) => {
          this.resultado.set(res);
          this.notification.success('Sessão revogada com sucesso.');
        },
        error: (err) => {
          this.erro.set(err.message ?? 'Erro ao revogar sessão.');
        },
      });
  }

  fechar(): void {
    this.dialogRef.close(this.resultado() !== null);
  }
}
