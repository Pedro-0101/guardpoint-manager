import { Directive, ElementRef, OnDestroy, Renderer2, computed, effect, inject, input } from '@angular/core';

import type { ClassValue } from 'clsx';

import { mergeClasses } from '@/shared/utils/merge-classes';

import { inputVariants, type ZardInputVariants } from './input.variants';

/**
 * Diretiva que estiliza inputs, textareas e selects com o design system do GuardPoint.
 *
 * Basta adicionar o atributo `z-input` a qualquer `<input>`, `<textarea>` ou `<select>`.
 * Todas as propriedades são opcionais e têm valores padrão que não quebram os inputs
 * já existentes no sistema.
 *
 * @example Uso básico
 * ```html
 * <input z-input placeholder="Nome" />
 * ```
 *
 * @example Tamanhos disponíveis
 * ```html
 * <input z-input zSize="sm" placeholder="Pequeno" />
 * <input z-input zSize="default" placeholder="Padrão" />
 * <input z-input zSize="lg" placeholder="Grande" />
 * ```
 *
 * @example Status de validação
 * ```html
 * <input z-input zStatus="error" placeholder="Erro" />
 * <input z-input zStatus="warning" placeholder="Aviso" />
 * <input z-input zStatus="success" placeholder="Sucesso" />
 * ```
 *
 * @example Input sem borda
 * ```html
 * <input z-input zBorderless placeholder="Sem borda" />
 * ```
 *
 * @example Input numérico com spinner
 * ```html
 * <input z-input [zNumeric]="true" [zStep]="5" [zMin]="0" [zMax]="100" placeholder="0-100, passo 5" />
 * ```
 *
 * @example Input com limite de caracteres
 * ```html
 * <input z-input [zMaxlength]="50" placeholder="Máximo 50 caracteres" />
 * ```
 *
 * @example Textarea
 * ```html
 * <textarea z-input rows="4" placeholder="Descrição"></textarea>
 * ```
 *
 * @example Combinando com formulários reativos
 * ```html
 * <input z-input formControlName="email" placeholder="seu@email.com" />
 * <input z-input [zNumeric]="true" [zMin]="1" [zMax]="120" formControlName="intervalo" />
 * ```
 */
@Directive({
  selector: 'input[z-input], textarea[z-input], select[z-input]',
  host: {
    '[class]': 'classes()',
  },
  exportAs: 'zInput',
})
export class ZardInputDirective implements OnDestroy {
  /**
   * Exibe o input em estado de erro (borda e anel vermelhos).
   * Mantido para compatibilidade com código existente.
   * Prefira `zStatus="error"` para novos componentes.
   */
  readonly zError = input<ZardInputVariants['zError']>(false);

  /**
   * Classes CSS adicionais mescladas às classes geradas pela diretiva.
   * Útil para ajustes pontuais de largura, margem etc.
   *
   * @example
   * ```html
   * <input z-input class="w-full max-w-sm" placeholder="Largura limitada" />
   * ```
   */
  readonly class = input<ClassValue>('');

  /**
   * Tamanho do input: `default` (médio), `sm` (pequeno) ou `lg` (grande).
   * @default 'default'
   */
  readonly zSize = input<ZardInputVariants['zSize']>('default');

  /**
   * Status visual do input: `error` (vermelho), `warning` (âmbar) ou `success` (verde).
   * Sobrepõe `zError` quando ambos são usados, pois aplica classes no mesmo elemento.
   */
  readonly zStatus = input<ZardInputVariants['zStatus']>(undefined);

  /**
   * Remove a borda e a sombra do input (estilo borderless).
   * @default false
   */
  readonly zBorderless = input<ZardInputVariants['zBorderless']>(false);

  /**
   * Ativa o comportamento de input numérico: define `type="number"` automaticamente
   * e reabilita o spinner nativo (setas de aumentar/diminuir) que é oculto por padrão
   * no design system. Use junto com `zStep`, `zMin` e `zMax` para controlar o intervalo.
   *
   * @default false
   *
   * @example
   * ```html
   * <input z-input [zNumeric]="true" [zStep]="10" [zMin]="0" [zMax]="5000" />
   * ```
   */
  readonly zNumeric = input<boolean>(false);

  /**
   * Incremento/decremento do spinner numérico. Só tem efeito quando `zNumeric` é `true`.
   * @default 1
   */
  readonly zStep = input<number>(1);

  /**
   * Valor mínimo permitido para input numérico. Só tem efeito quando `zNumeric` é `true`.
   */
  readonly zMin = input<number | undefined>(undefined);

  /**
   * Valor máximo permitido para input numérico. Só tem efeito quando `zNumeric` é `true`.
   */
  readonly zMax = input<number | undefined>(undefined);

  /**
   * Número máximo de caracteres permitidos (atributo `maxlength` nativo).
   * Funciona para qualquer input de texto, independente de `zNumeric`.
   *
   * @example
   * ```html
   * <input z-input [zMaxlength]="100" placeholder="Máximo 100 caracteres" />
   * ```
   */
  readonly zMaxlength = input<number | undefined>(undefined);

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly unlisteners: (() => void)[] = [];
  private wheelUnlistener: (() => void) | null = null;

  constructor() {
    effect(() => {
      const native = this.el.nativeElement;
      if (this.zNumeric() && native instanceof HTMLInputElement) {
        this.renderer.setAttribute(native, 'type', 'number');
        this.renderer.setAttribute(native, 'step', String(this.zStep()));
        if (this.zMin() !== undefined) {
          this.renderer.setAttribute(native, 'min', String(this.zMin()));
        }
        if (this.zMax() !== undefined) {
          this.renderer.setAttribute(native, 'max', String(this.zMax()));
        }
      }
    });

    effect(() => {
      const maxlength = this.zMaxlength();
      if (maxlength !== undefined && maxlength !== null) {
        this.renderer.setAttribute(this.el.nativeElement, 'maxlength', String(maxlength));
      }
    });

    effect(() => {
      if (this.wheelUnlistener) {
        this.wheelUnlistener();
        this.wheelUnlistener = null;
      }

      if (this.zNumeric()) {
        const native = this.el.nativeElement;
        const handler = (event: WheelEvent) => this.onWheel(event);
        native.addEventListener('wheel', handler, { passive: false });
        this.wheelUnlistener = () => native.removeEventListener('wheel', handler);
      }
    });

    this.unlisteners.push(
      this.renderer.listen(this.el.nativeElement, 'blur', () => this.clampAndShake()),
    );

    this.unlisteners.push(
      this.renderer.listen(this.el.nativeElement, 'change', () => this.clampAndShake()),
    );

    this.unlisteners.push(
      this.renderer.listen(this.el.nativeElement, 'keydown', (event: KeyboardEvent) => this.onKeydown(event)),
    );
  }

  ngOnDestroy(): void {
    if (this.wheelUnlistener) {
      this.wheelUnlistener();
      this.wheelUnlistener = null;
    }
    for (const unlisten of this.unlisteners) {
      unlisten();
    }
  }

  private onKeydown(event: KeyboardEvent): void {
    if (!this.zNumeric()) return;
    const native = this.el.nativeElement;
    if (!(native instanceof HTMLInputElement)) return;

    const min = this.zMin();
    const max = this.zMax();
    const value = parseFloat(native.value);
    if (isNaN(value)) return;

    if (event.key === 'ArrowUp' && max !== undefined && value >= max) {
      event.preventDefault();
      this.shake();
    }
    if (event.key === 'ArrowDown' && min !== undefined && value <= min) {
      event.preventDefault();
      this.shake();
    }
  }

  private onWheel(event: WheelEvent): void {
    if (!this.zNumeric()) return;
    const native = this.el.nativeElement;
    if (!(native instanceof HTMLInputElement)) return;

    const min = this.zMin();
    const max = this.zMax();
    const value = parseFloat(native.value);
    if (isNaN(value)) return;

    if (event.deltaY < 0 && min !== undefined && value <= min) {
      event.preventDefault();
      this.shake();
    }
    if (event.deltaY > 0 && max !== undefined && value >= max) {
      event.preventDefault();
      this.shake();
    }
  }

  private clampAndShake(): void {
    if (!this.zNumeric()) return;
    const native = this.el.nativeElement;
    if (!(native instanceof HTMLInputElement)) return;

    const value = parseFloat(native.value);
    if (isNaN(value)) return;

    const min = this.zMin();
    const max = this.zMax();

    let clamped = false;
    if (min !== undefined && value < min) {
      native.value = String(min);
      clamped = true;
    } else if (max !== undefined && value > max) {
      native.value = String(max);
      clamped = true;
    }

    if (clamped) {
      native.dispatchEvent(new Event('input', { bubbles: true }));
      this.shake();
    }
  }

  private shake(): void {
    const native = this.el.nativeElement;
    this.renderer.addClass(native, 'shake');
    setTimeout(() => {
      this.renderer.removeClass(native, 'shake');
    }, 400);
  }

  protected readonly classes = computed(() =>
    mergeClasses(
      inputVariants({
        zSize: this.zSize(),
        zStatus: this.zStatus(),
        zBorderless: this.zBorderless(),
        zError: this.zError(),
        zNumeric: this.zNumeric(),
      }),
      this.class(),
    ),
  );
}
