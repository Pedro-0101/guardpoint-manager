import { Component, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronDown,
  lucideBell,
  lucideMoon,
  lucideSun,
  lucideUser,
  lucideLogOut,
  lucideLayoutDashboard,
  lucideMap,
  lucideClock,
  lucideMapPin,
  lucideCalendarDays,
  lucideUsers,
  lucideBarChart3,
  lucideSettings,
  lucideShieldAlert,
} from '@ng-icons/lucide';

import { ZardButtonComponent } from '../../shared/components/button/button.component';
import { ZardBadgeComponent } from '../../shared/components/badge/badge.component';
import { ZardMenuImports } from '../../shared/components/menu/menu.imports';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'gp-navbar',
  imports: [
    RouterLink,
    RouterLinkActive,
    NgIcon,
    ZardButtonComponent,
    ZardBadgeComponent,
    ...ZardMenuImports,
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  viewProviders: [
    provideIcons({
      lucideChevronDown,
      lucideBell,
      lucideMoon,
      lucideSun,
      lucideUser,
      lucideLogOut,
      lucideLayoutDashboard,
      lucideMap,
      lucideClock,
      lucideMapPin,
      lucideCalendarDays,
      lucideUsers,
      lucideBarChart3,
      lucideSettings,
      lucideShieldAlert,
    }),
  ],
})
export class Navbar {
  private readonly themeService = inject(ThemeService);

  logout = output<void>();

  userName = input('');
  userRole = input<string | null>(null);
  notificationCount = input(0);

  readonly theme = this.themeService.theme;

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
