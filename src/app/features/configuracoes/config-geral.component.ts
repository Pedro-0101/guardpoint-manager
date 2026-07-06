import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ConfiguracoesService } from './configuracoes.service';
import { ConfigNavComponent } from './config-nav.component';
import { NgIcon } from '@ng-icons/core';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { ZardInputDirective } from '@/shared/components/input';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { NotificationService } from '../../core/services/notification.service';
import { Empresa } from '../../core/models/empresa.model';

@Component({
  selector: 'gp-config-geral',
  imports: [
    ReactiveFormsModule,
    MatSlideToggleModule,
    ZardInputDirective,
    ZardButtonComponent,
    ConfigNavComponent,
    NgIcon,
    LoadingSpinner,
    StatusBadge,
  ],
  templateUrl: './config-geral.component.html',
  styleUrl: './config-geral.component.scss',
})
export class ConfigGeralComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly configuracoesService = inject(ConfiguracoesService);
  private readonly notification = inject(NotificationService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly empresa = signal<Empresa | null>(null);

  form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(255)]],
    alertaSonoro: [true],
  });

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.error.set(null);

    this.configuracoesService.obterEmpresa().subscribe({
      next: (empresa) => {
        this.empresa.set(empresa);
        this.form.patchValue({ nome: empresa.nome, alertaSonoro: empresa.alertaSonoro });
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Erro ao carregar configurações da empresa.');
        this.loading.set(false);
      },
    });
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const { nome, alertaSonoro } = this.form.getRawValue();

    this.configuracoesService.atualizarEmpresa({ nome, alertaSonoro }).subscribe({
      next: (empresa) => {
        this.empresa.set(empresa);
        this.saving.set(false);
        this.notification.success('Configurações salvas com sucesso.');
      },
      error: (err) => {
        this.saving.set(false);
        this.notification.error(err.message ?? 'Erro ao salvar configurações.');
      },
    });
  }
}
