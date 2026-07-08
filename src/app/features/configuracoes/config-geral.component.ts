import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { Subject, takeUntil } from 'rxjs';
import { ZardCardComponent } from '@/shared/components/card/card.component';
import { ZardSkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout';
import { NotificationService } from '../../core/services/notification.service';
import { ConfiguracoesService } from './configuracoes.service';
import { Empresa } from '../../core/models/empresa.model';

@Component({
  selector: 'gp-config-geral',
  imports: [DatePipe, NgIcon, ZardCardComponent, ZardSkeletonComponent, PageLayoutComponent],
  templateUrl: './config-geral.component.html',
  styleUrl: './config-geral.component.scss',
})
export class ConfigGeralComponent implements OnInit, OnDestroy {
  private readonly configuracoesService = inject(ConfiguracoesService);
  private readonly notification = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  readonly empresa = signal<Empresa | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.carregarEmpresa();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarEmpresa(): void {
    this.loading.set(true);
    this.error.set(null);

    this.configuracoesService
      .obterEmpresa()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (empresa) => {
          this.empresa.set(empresa);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.message ?? 'Erro ao carregar dados da empresa.');
          this.loading.set(false);
        },
      });
  }
}
