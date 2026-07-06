import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { NgIcon } from '@ng-icons/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ZardAlertComponent } from '@/shared/components/alert/alert.component';

@Component({
  selector: 'gp-login',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    NgIcon,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatCardModule,
    ZardAlertComponent,
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
