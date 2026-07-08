import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { HttpErrorResponse } from '@angular/common/http';

import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { ZardCardComponent } from '@/shared/components/card/card.component';
import { ZardCheckboxComponent } from '@/shared/components/checkbox/checkbox.component';
import { ZardInputDirective } from '@/shared/components/input/input.directive';
import {
  ZardFormFieldComponent,
  ZardFormLabelComponent,
  ZardFormControlComponent,
  ZardFormMessageComponent,
} from '@/shared/components/form/form.component';
import { ZardAlertDialogService } from '@/shared/components/alert-dialog';

@Component({
  selector: 'gp-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ZardButtonComponent,
    ZardCardComponent,
    ZardCheckboxComponent,
    ZardInputDirective,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardFormMessageComponent,
  ],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notification = inject(NotificationService);
  private readonly alertDialog = inject(ZardAlertDialogService);

  protected readonly isLoading = signal(false);
  protected readonly loginError = signal<string | null>(null);

  protected readonly loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    senha: new FormControl('', [Validators.required, Validators.minLength(6)]),
    rememberMe: new FormControl(false),
  });

  constructor() {
    this.route.queryParams.subscribe((params) => {
      if (params['expired'] === 'true') {
        this.notification.warning('Sua sessão expirou. Faça login novamente.');
      }
    });

    if (this.authService.isAuthenticated()) {
      this.alertDialog.confirm({
        zTitle: 'Sessão ativa encontrada',
        zDescription: `Você já está conectado como ${this.authService.userName()}. Deseja continuar nessa conta?`,
        zOkText: 'Continuar',
        zCancelText: 'Entrar com outra conta',
        zOnOk: () => {
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
          this.router.navigateByUrl(returnUrl);
        },
        zOnCancel: () => this.authService.logout(),
      });
    }
  }

  submit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.loginError.set(null);

    const { email, senha, rememberMe } = this.loginForm.getRawValue() as { email: string; senha: string; rememberMe: boolean };

    this.authService.login({ email, senha }, rememberMe).subscribe({
      next: () => {
        this.isLoading.set(false);
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (err.status === 401) {
          this.loginError.set('Email ou senha inválidos.');
        } else if (err.status === 0) {
          this.loginError.set('Servidor indisponível. Verifique sua conexão.');
        } else {
          this.loginError.set(err.error?.message ?? 'Erro ao realizar login. Tente novamente.');
        }
      },
    });
  }
}
