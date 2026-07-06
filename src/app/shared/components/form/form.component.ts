import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'z-form-field',
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { 'class': 'block space-y-2' },
  exportAs: 'zFormField',
})
export class ZardFormFieldComponent {}

@Component({
  selector: 'z-form-label',
  template: `
    <ng-content />
    @if (zRequired()) {
      <span class="text-destructive ml-0.5">*</span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
  },
  exportAs: 'zFormLabel',
})
export class ZardFormLabelComponent {
  readonly zRequired = input(false);
}

@Component({
  selector: 'z-form-control',
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { 'class': 'block pt-1' },
  exportAs: 'zFormControl',
})
export class ZardFormControlComponent {}
