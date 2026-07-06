import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';

import { AlertasService } from '../alertas.service';
import { ZardDialogService } from '@/shared/components/dialog';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { NotificationService } from '../../../core/services/notification.service';
import { Alerta } from '../../../core/models/alerta.model';

const TIPO_ICON: Record<Alerta['tipo'], string> = {
  atraso: 'lucideClock',
  ausencia: 'lucideUserX',
  coacao: 'lucideTriangleAlert',
  sabotagem: 'lucideShieldAlert',
};

const TIPO_LABEL: Record<Alerta['tipo'], string> = {
  atraso: 'Atraso',
  ausencia: 'Ausência',
  coacao: 'Coação',
  sabotagem: 'Sabotagem',
};

const GRAVIDADE_LABEL: Record<Alerta['gravidade'], string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
};

@Component({
  selector: 'gp-alerta-detail',
  imports: [RouterLink, NgIcon, ZardButtonComponent, LoadingSpinner, StatusBadge],
  templateUrl: './alerta-detail.html',
  styleUrl: './alerta-detail.scss',
})
export class AlertaDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertasService = inject(AlertasService);
  private readonly dialog = inject(ZardDialogService);
  private readonly notification = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly alerta = signal<Alerta | null>(null);

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.carregarDados(id);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private carregarDados(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.alertasService
      .obterPorId(id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.error.set(err.message ?? 'Erro ao carregar alerta.');
          return of(undefined);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((alerta) => {
        if (alerta) {
          this.alerta.set(alerta);
        } else if (!this.error()) {
          this.error.set('Alerta não encontrado.');
        }
      });
  }

  confirmarReconhecer(alerta: Alerta): void {
    this.dialog.create({
      zTitle: 'Reconhecer alerta',
      zDescription: 'Deseja reconhecer este alerta?',
      zOkText: 'Reconhecer',
      zCancelText: 'Cancelar',
      zOnOk: () => this.reconhecer(alerta),
    });
  }

  confirmarEncerrar(alerta: Alerta): void {
    this.dialog.create({
      zTitle: 'Encerrar alerta',
      zDescription: 'Deseja encerrar este alerta?',
      zOkText: 'Encerrar',
      zCancelText: 'Cancelar',
      zOnOk: () => this.encerrar(alerta),
    });
  }

  private reconhecer(alerta: Alerta): void {
    this.alertasService.reconhecer(alerta.id).subscribe({
      next: () => {
        this.alertasService.atualizarStatusLocal(alerta.id, 'reconhecido');
        this.alerta.set({ ...alerta, status: 'reconhecido' });
        this.notification.success('Alerta reconhecido com sucesso.');
      },
      error: (err) => {
        this.notification.error(err.message ?? 'Erro ao reconhecer alerta.');
      },
    });
  }

  private encerrar(alerta: Alerta): void {
    this.alertasService.encerrar(alerta.id).subscribe({
      next: () => {
        this.alertasService.atualizarStatusLocal(alerta.id, 'encerrado');
        this.alerta.set({ ...alerta, status: 'encerrado' });
        this.notification.success('Alerta encerrado com sucesso.');
      },
      error: (err) => {
        this.notification.error(err.message ?? 'Erro ao encerrar alerta.');
      },
    });
  }

  tipoIcon(tipo: Alerta['tipo']): string {
    return TIPO_ICON[tipo] ?? 'lucideAlertCircle';
  }

  tipoLabel(tipo: Alerta['tipo']): string {
    return TIPO_LABEL[tipo] ?? tipo;
  }

  gravidadeLabel(g: Alerta['gravidade']): string {
    return GRAVIDADE_LABEL[g] ?? g;
  }

  formatarData(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  voltar(): void {
    this.router.navigate(['/alertas']);
  }
}
