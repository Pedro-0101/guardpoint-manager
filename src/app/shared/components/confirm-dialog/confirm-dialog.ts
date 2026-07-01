import { Component, input } from '@angular/core';
import { MatDialogClose } from '@angular/material/dialog';

@Component({
  selector: 'gp-confirm-dialog',
  imports: [MatDialogClose],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
  title = input('Confirmar ação');
  message = input('Tem certeza que deseja prosseguir?');
  confirmLabel = input('Confirmar');
  cancelLabel = input('Cancelar');
}
