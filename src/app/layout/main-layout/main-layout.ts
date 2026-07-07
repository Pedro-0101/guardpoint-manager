import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHouse } from '@ng-icons/lucide';

import { Navbar } from '../navbar/navbar';
import { AuthService } from '../../core/auth/auth.service';
import { AlertasService } from '../../features/alertas/alertas.service';
import { BreadcrumbService } from '../../core/services/breadcrumb.service';
import { ZardBreadcrumbImports } from '../../shared/components/breadcrumb/breadcrumb.imports';

@Component({
  selector: 'gp-main-layout',
  imports: [RouterOutlet, Navbar, NgIcon, ...ZardBreadcrumbImports],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
  viewProviders: [provideIcons({ lucideHouse })],
})
export class MainLayout {
  readonly authService = inject(AuthService);

  private readonly alertasService = inject(AlertasService);
  readonly alertasAbertosCount = this.alertasService.alertasAbertosCount;

  readonly userName = this.authService.userName;
  readonly userRole = this.authService.userRole;

  readonly breadcrumbService = inject(BreadcrumbService);
  readonly breadcrumbs = this.breadcrumbService.breadcrumbs;
}
