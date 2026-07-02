import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogClose } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

@Component({
  selector: 'gp-confirm-dialog',
  imports: [MatDialogClose],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
  private readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly title = this.data.title ?? 'Confirmar ação';
  readonly message = this.data.message ?? 'Tem certeza que deseja prosseguir?';
  readonly confirmLabel = this.data.confirmLabel ?? 'Confirmar';
  readonly cancelLabel = this.data.cancelLabel ?? 'Cancelar';
}
