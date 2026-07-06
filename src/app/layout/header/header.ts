import { Component, input, output, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'gp-header',
  imports: [NgIcon],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly themeService = inject(ThemeService);

  toggleSidebar = output<void>();
  logout = output<void>();

  userName = input('');
  userRole = input<string | null>(null);
  notificationCount = input(0);

  readonly theme = this.themeService.theme;

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
