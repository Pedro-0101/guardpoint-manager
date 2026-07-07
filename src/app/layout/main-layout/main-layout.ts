import { Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHouse } from '@ng-icons/lucide';

import { Navbar } from '../navbar/navbar';
import { AuthService } from '../../core/auth/auth.service';
import { AlertasService } from '../../features/alertas/alertas.service';
import { BreadcrumbService } from '../../core/services/breadcrumb.service';
import { ZardBreadcrumbImports } from '../../shared/components/breadcrumb/breadcrumb.imports';

const HIDDEN_BREADCRUMB_ROUTES = ['/dashboard', '/mapa'];

@Component({
  selector: 'gp-main-layout',
  imports: [RouterOutlet, Navbar, NgIcon, ...ZardBreadcrumbImports],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
  viewProviders: [provideIcons({ lucideHouse })],
})
export class MainLayout {
  private readonly router = inject(Router);

  readonly authService = inject(AuthService);

  private readonly alertasService = inject(AlertasService);
  readonly alertasAbertosCount = this.alertasService.alertasAbertosCount;

  readonly userName = this.authService.userName;
  readonly userRole = this.authService.userRole;

  readonly breadcrumbService = inject(BreadcrumbService);
  readonly breadcrumbs = this.breadcrumbService.breadcrumbs;

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly showBreadcrumb = computed(() => {
    const url = this.currentUrl();
    return !HIDDEN_BREADCRUMB_ROUTES.includes(url);
  });
}
