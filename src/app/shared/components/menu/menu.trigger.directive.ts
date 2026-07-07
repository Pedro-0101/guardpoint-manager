import {
  ConnectedPosition,
  Overlay,
  OverlayConfig,
  OverlayRef,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  Directive,
  ElementRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  signal,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Directive({
  selector: '[z-menu]',
  exportAs: 'zMenu',
  host: {
    '[attr.aria-expanded]': 'isOpen()',
    '[attr.aria-haspopup]': '"true"',
  },
})
export class ZardMenuTriggerDirective implements OnDestroy {
  private readonly overlay = inject(Overlay);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly viewContainerRef = inject(ViewContainerRef);

  readonly zMenuTriggerFor = input.required<TemplateRef<unknown>>();
  readonly zTrigger = input<'click' | 'hover'>('click');
  readonly zPlacement = input<string>('bottom');

  readonly isOpen = signal(false);

  private overlayRef: OverlayRef | null = null;
  private portal: TemplatePortal | null = null;
  private readonly destroy$ = new Subject<void>();
  private closeTimeout: ReturnType<typeof setTimeout> | null = null;
  private openTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy(): void {
    this.clearTimeouts();
    this.destroy$.next();
    this.destroy$.complete();
    this.closeMenu();
  }

  @HostListener('click', ['$event'])
  onHostClick(event: MouseEvent): void {
    if (this.zTrigger() !== 'click') return;
    event.stopPropagation();
    this.toggle();
  }

  @HostListener('mouseenter')
  onHostMouseEnter(): void {
    if (this.zTrigger() !== 'hover') return;
    this.clearCloseTimeout();
    this.scheduleOpen();
  }

  @HostListener('mouseleave')
  onHostMouseLeave(): void {
    if (this.zTrigger() !== 'hover') return;
    this.clearOpenTimeout();
    this.scheduleClose();
  }

  open(): void {
    if (this.isOpen()) return;
    this.isOpen.set(true);
    this.createOverlay();
  }

  close(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.closeMenu();
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  private createOverlay(): void {
    if (this.overlayRef) return;

    const positions = this.getPositions();
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.elementRef)
      .withPositions(positions)
      .withPush(false)
      .withViewportMargin(8);

    const config = new OverlayConfig({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
    });

    this.overlayRef = this.overlay.create(config);

    this.overlayRef.backdropClick().pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.close();
    });

    this.overlayRef.detachments().pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.close();
    });

    this.portal = new TemplatePortal(this.zMenuTriggerFor(), this.viewContainerRef);
    this.overlayRef.attach(this.portal);

    this.overlayRef.overlayElement.addEventListener('mouseenter', () => {
      this.clearCloseTimeout();
    });

    this.overlayRef.overlayElement.addEventListener('mouseleave', () => {
      if (this.zTrigger() === 'hover') {
        this.scheduleClose();
      }
    });
  }

  private closeMenu(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
      this.portal = null;
    }
  }

  private getPositions(): ConnectedPosition[] {
    const placement = this.zPlacement();

    switch (placement) {
      case 'rightTop':
        return [
          {
            originX: 'end',
            originY: 'top',
            overlayX: 'start',
            overlayY: 'top',
            offsetX: 4,
          } as ConnectedPosition,
          {
            originX: 'start',
            originY: 'top',
            overlayX: 'end',
            overlayY: 'top',
            offsetX: -4,
          } as ConnectedPosition,
        ];
      case 'right':
        return [
          {
            originX: 'end',
            originY: 'center',
            overlayX: 'start',
            overlayY: 'center',
            offsetX: 4,
          } as ConnectedPosition,
        ];
      case 'left':
        return [
          {
            originX: 'start',
            originY: 'center',
            overlayX: 'end',
            overlayY: 'center',
            offsetX: -4,
          } as ConnectedPosition,
        ];
      case 'top':
        return [
          {
            originX: 'center',
            originY: 'top',
            overlayX: 'center',
            overlayY: 'bottom',
            offsetY: -4,
          } as ConnectedPosition,
        ];
      case 'bottom':
      default:
        return [
          {
            originX: 'start',
            originY: 'bottom',
            overlayX: 'start',
            overlayY: 'top',
            offsetY: 4,
          } as ConnectedPosition,
          {
            originX: 'end',
            originY: 'bottom',
            overlayX: 'end',
            overlayY: 'top',
            offsetY: 4,
          } as ConnectedPosition,
        ];
    }
  }

  private scheduleClose(): void {
    this.closeTimeout = setTimeout(() => {
      this.close();
    }, 150);
  }

  private scheduleOpen(): void {
    this.openTimeout = setTimeout(() => {
      this.open();
    }, 100);
  }

  private clearCloseTimeout(): void {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
  }

  private clearOpenTimeout(): void {
    if (this.openTimeout) {
      clearTimeout(this.openTimeout);
      this.openTimeout = null;
    }
  }

  private clearTimeouts(): void {
    this.clearCloseTimeout();
    this.clearOpenTimeout();
  }
}
