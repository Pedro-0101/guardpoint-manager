import { Component, inject, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { finalize } from 'rxjs/operators';
import { TurnosService, RevogarSessaoResponse } from '../turnos.service';
import { ZardDialogRef } from '@/shared/components/dialog/dialog-ref';
import { Z_MODAL_DATA } from '@/shared/components/dialog/dialog.service';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { Turno } from '../../../core/models/turno.model';

export interface TurnoRevogarDialogData {
  turno: Turno;
}

@Component({
  selector: 'gp-turno-revogar-dialog',
  imports: [NgIcon, ZardButtonComponent, LoadingSpinner],
  templateUrl: './turno-revogar-dialog.html',
  styleUrl: './turno-revogar-dialog.scss',
})
export class TurnoRevogarDialog {
  private readonly data = inject<TurnoRevogarDialogData>(Z_MODAL_DATA);
  private readonly dialogRef = inject(ZardDialogRef<TurnoRevogarDialog>);
  private readonly turnosService = inject(TurnosService);

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
