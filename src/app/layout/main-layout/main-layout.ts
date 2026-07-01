import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'gp-main-layout',
  imports: [RouterOutlet, Sidebar, Header],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  readonly authService = inject(AuthService);

  sidebarCollapsed = false;

  readonly userName = this.authService.userName;
  readonly userRole = this.authService.userRole;

  onToggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
}
