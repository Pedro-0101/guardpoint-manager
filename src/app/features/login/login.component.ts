import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { HttpErrorResponse } from '@angular/common/http';

import { ZardAlertComponent } from '@/shared/components/alert/alert.component';
import { ZardCardComponent } from '@/shared/components/card/card.component';
import { ZardInputDirective } from '@/shared/components/input/input.directive';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { ZardCheckboxComponent } from '@/shared/components/checkbox/checkbox.component';

@Component({
  selector: 'gp-login',
  imports: [
    ReactiveFormsModule,
    NgIcon,
    ZardAlertComponent,
    ZardCardComponent,
    ZardInputDirective,
    ZardButtonComponent,
    ZardCheckboxComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notification = inject(NotificationService);

  readonly loading = signal(false);
  readonly hidePassword = signal(true);
  readonly loginError = signal<string | null>(null);
  readonly expiredSession = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false],
  });

  constructor() {
    this.route.queryParams.subscribe((params) => {
      if (params['expired'] === 'true') {
        this.expiredSession.set(true);
        this.notification.warning('Sua sessão expirou. Faça login novamente.');
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.loginError.set(null);

    const { email, senha, rememberMe } = this.form.getRawValue();

    this.authService.login({ email, senha }, rememberMe).subscribe({
      next: () => {
        this.loading.set(false);
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
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

  get emailControl() {
    return this.form.controls.email;
  }

  get senhaControl() {
    return this.form.controls.senha;
  }
}
