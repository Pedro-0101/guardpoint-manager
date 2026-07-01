import { Component, input } from '@angular/core';

@Component({
  selector: 'gp-empty-state',
  imports: [],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EmptyState {
  icon = input('inbox');
  title = input('Nenhum registro encontrado');
  description = input<string>();
}
