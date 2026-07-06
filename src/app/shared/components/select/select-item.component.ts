import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'z-select-item',
  template: `<option [value]="value()" [disabled]="disabled()" [selected]="selected()"><ng-content /></option>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    style: 'display: none;',
  },
})
export class ZardSelectItemComponent {
  readonly value = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly selected = input<boolean>(false);
}
