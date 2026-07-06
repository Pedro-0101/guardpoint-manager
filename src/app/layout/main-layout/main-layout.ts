import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { AuthService } from '../../core/auth/auth.service';
import { AlertasService } from '../../features/alertas/alertas.service';

@Component({
  selector: 'gp-main-layout',
  imports: [RouterOutlet, Sidebar, Header],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  readonly authService = inject(AuthService);

  // Injetar aqui (não só na tela de Alertas) garante que a assinatura WS de
  // `new_alert` e o badge de alertas abertos fiquem ativos assim que o shell
  // autenticado monta, independente da tela em que o usuário está.
  private readonly alertasService = inject(AlertasService);
  readonly alertasAbertosCount = this.alertasService.alertasAbertosCount;

  sidebarCollapsed = false;

  readonly userName = this.authService.userName;
  readonly userRole = this.authService.userRole;

  onToggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
}
