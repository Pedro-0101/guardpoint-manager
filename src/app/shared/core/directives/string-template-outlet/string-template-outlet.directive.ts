import { Directive, EmbeddedViewRef, Input, OnChanges, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[zStringTemplateOutlet]',
  standalone: true,
})
export class ZardStringTemplateOutletDirective implements OnChanges {
  private embeddedViewRef: EmbeddedViewRef<void> | null = null;

  @Input() zStringTemplateOutlet: unknown = null;

  constructor(
    private readonly viewContainer: ViewContainerRef,
    private readonly templateRef: TemplateRef<void>,
  ) {}

  ngOnChanges(): void {
    this.viewContainer.clear();

    if (this.embeddedViewRef) {
      this.embeddedViewRef.destroy();
      this.embeddedViewRef = null;
    }

    if (this.zStringTemplateOutlet instanceof TemplateRef) {
      this.embeddedViewRef = this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
