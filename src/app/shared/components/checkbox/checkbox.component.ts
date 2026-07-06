import { ChangeDetectionStrategy, Component, computed, forwardRef, input, model, signal, ViewEncapsulation } from '@angular/core';
import type { ClassValue } from 'clsx';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { mergeClasses } from '@/shared/utils/merge-classes';
import { checkboxVariants } from './checkbox.variants';

@Component({
  selector: 'z-checkbox',
  template: `
    <button
      type="button"
      role="checkbox"
      [attr.aria-checked]="checked()"
      [attr.data-state]="checked() ? 'checked' : 'unchecked'"
      [class]="classes()"
      [disabled]="disabled()"
      (click)="toggle()"
    >
      @if (checked()) {
        <span class="material-symbols-outlined text-current" style="font-size:14px;width:14px;height:14px;">check</span>
      }
    </button>
  `,
  styles: `
    :host { display: inline-flex; align-items: center; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ZardCheckboxComponent), multi: true }],
  exportAs: 'zCheckbox',
})
export class ZardCheckboxComponent implements ControlValueAccessor {
  readonly checked = model(false);
  readonly zDisabled = input(false);
  readonly class = input<ClassValue>('');

  protected readonly disabled = signal(false);
  protected readonly classes = computed(() => mergeClasses(checkboxVariants(), this.class()));

  private _onChange: (value: boolean) => void = () => {};
  private _onTouched: () => void = () => {};

  toggle(): void {
    if (this.disabled() || this.zDisabled()) return;
    const value = !this.checked();
    this.checked.set(value);
    this._onChange(value);
    this._onTouched();
  }

  writeValue(value: boolean): void { this.checked.set(value ?? false); }
  registerOnChange(fn: (value: boolean) => void): void { this._onChange = fn; }
  registerOnTouched(fn: () => void): void { this._onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled.set(isDisabled); }
}
