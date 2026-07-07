import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { AuthService } from '../../core/auth/auth.service';
import { AlertasService } from '../../features/alertas/alertas.service';

@Component({
  selector: 'gp-main-layout',
  imports: [RouterOutlet, Navbar],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  readonly authService = inject(AuthService);

  private readonly alertasService = inject(AlertasService);
  readonly alertasAbertosCount = this.alertasService.alertasAbertosCount;

  readonly userName = this.authService.userName;
  readonly userRole = this.authService.userRole;
}
