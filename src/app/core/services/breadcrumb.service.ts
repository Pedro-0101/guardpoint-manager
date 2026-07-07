import { inject, Injectable } from '@angular/core';
import { type ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

export interface BreadcrumbItem {
  label: string;
  url: string;
}

@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private readonly router = inject(Router);

  readonly breadcrumbs = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.buildBreadcrumbs()),
    ),
    { initialValue: [] as BreadcrumbItem[] },
  );

  private buildBreadcrumbs(): BreadcrumbItem[] {
    return this.resolveBreadcrumbs(this.router.routerState.snapshot.root);
  }

  private resolveBreadcrumbs(route: ActivatedRouteSnapshot, parentUrl = ''): BreadcrumbItem[] {
    const children = route.children;
    const result: BreadcrumbItem[] = [];

    for (const child of children) {
      const routeUrl = child.url.map((segment) => segment.path).join('/');

      if (routeUrl) {
        const url = `${parentUrl}/${routeUrl}`;
        const label = child.data['breadcrumb'] as string | undefined;

        if (label) {
          result.push({ label, url });
        }

        const childItems = this.resolveBreadcrumbs(child, url);
        result.push(...childItems);
      } else {
        const childItems = this.resolveBreadcrumbs(child, parentUrl);
        result.push(...childItems);
      }
    }

    return result;
  }
}
