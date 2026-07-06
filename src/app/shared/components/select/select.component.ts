import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  model,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { type ClassValue } from 'clsx';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

import { mergeClasses } from '@/shared/utils/merge-classes';
import { selectVariants, type ZardSelectVariants } from './select.variants';

@Component({
  selector: 'z-select',
  template: `
    <select
      [class]="selectClasses()"
      [value]="zValue()"
      [disabled]="disabled()"
      (change)="onValueChange($event)"
      (blur)="onTouched()"
    >
      <ng-content select="z-select-item, option" />
    </select>
  `,
  styles: `
    :host {
      display: inline-block;
      position: relative;
      width: 100%;
    }
    :host::after {
      content: '';
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 5px solid currentColor;
      pointer-events: none;
      opacity: 0.5;
    }
    select {
      appearance: none;
      width: 100%;
      padding-right: 2rem !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ZardSelectComponent),
      multi: true,
    },
  ],
  exportAs: 'zSelect',
})
export class ZardSelectComponent implements ControlValueAccessor {
  readonly zValue = model<string>('');
  readonly zError = input<ZardSelectVariants['zError']>(false);
  readonly zDisabled = input<boolean>(false);
  readonly class = input<ClassValue>('');

  protected readonly disabled = signal(false);

  protected readonly selectClasses = computed(() =>
    mergeClasses(selectVariants({ zError: this.zError() }), this.class()),
  );

  private _onChange: (value: string) => void = () => {};
  private _onTouched: () => void = () => {};

  protected onValueChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.zValue.set(value);
    this._onChange(value);
  }

  protected onTouched(): void {
    this._onTouched();
  }

  writeValue(value: string): void {
    this.zValue.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
