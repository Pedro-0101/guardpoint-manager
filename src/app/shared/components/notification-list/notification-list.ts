import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheckCircle, lucideX } from '@ng-icons/lucide';
import { ZardDividerComponent } from '../divider/divider.component';
import { ZardButtonComponent } from '../button/button.component';
import { ZardTooltipDirective } from '../tooltip/tooltip.directive';
import { AlertasService } from '../../../features/alertas/alertas.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Alerta } from '../../../core/models/alerta.model';

export interface NotificationItem {
  id: string;
  tipo: Alerta['tipo'];
  gravidade: Alerta['gravidade'];
  status: Alerta['status'];
  mensagem: string;
  tempo: string;
  createdAt: string;
}

function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const segundos = Math.floor(diff / 1000);
  if (segundos < 60) return 'agora';
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `há ${dias}d`;
  const semanas = Math.floor(dias / 7);
  return `há ${semanas} sem`;
}

function mensagemPadrao(tipo: Alerta['tipo']): string {
  const map: Record<Alerta['tipo'], string> = {
    atraso: 'Atraso na ronda detectado.',
    ausencia: 'Alerta de ausência — vigia não iniciou o turno.',
    sabotagem: 'Sabotagem reportada pelo vigia.',
    coacao: 'Senha de emergência utilizada pelo vigia.',
  };
  return map[tipo] ?? 'Sem mensagem registrada';
}

function toNotificationItem(a: Alerta): NotificationItem {
  return {
    id: a.id,
    tipo: a.tipo,
    gravidade: a.gravidade,
    status: a.status,
    mensagem: a.mensagem || mensagemPadrao(a.tipo),
    tempo: tempoRelativo(a.createdAt),
    createdAt: a.createdAt,
  };
}

@Component({
  selector: 'gp-notification-list',
  imports: [NgIcon, RouterLink, ZardDividerComponent, ZardButtonComponent, ZardTooltipDirective],
  templateUrl: './notification-list.html',
  styleUrl: './notification-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ lucideCheckCircle, lucideX })],
})
export class NotificationListComponent {
  private readonly alertasService = inject(AlertasService);
  private readonly notification = inject(NotificationService);

  private readonly alertasRaw = signal<Alerta[]>([]);

  readonly notifications = computed<NotificationItem[]>(() =>
    this.alertasRaw()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(toNotificationItem),
  );

  readonly openCount = computed(() =>
    this.alertasRaw().filter((a) => a.status === 'aberto').length,
  );

  constructor() {
    this.alertasService.alertas$.subscribe((alertas) =>
      this.alertasRaw.set(alertas),
    );
  }

  reconhecer(item: NotificationItem): void {
    this.alertasService.reconhecer(item.id).subscribe({
      next: () => {
        this.alertasService.atualizarStatusLocal(item.id, 'reconhecido');
        this.notification.success('Alerta reconhecido com sucesso.');
      },
      error: (err) => {
        this.notification.error(err.message ?? 'Erro ao reconhecer alerta.');
      },
    });
  }

  encerrar(item: NotificationItem): void {
    this.alertasService.encerrar(item.id).subscribe({
      next: () => {
        this.alertasService.atualizarStatusLocal(item.id, 'encerrado');
        this.notification.success('Alerta encerrado com sucesso.');
      },
      error: (err) => {
        this.notification.error(err.message ?? 'Erro ao encerrar alerta.');
      },
    });
  }

  tipoIcon(tipo: Alerta['tipo']): string {
    const map: Record<Alerta['tipo'], string> = {
      atraso: 'lucideClock',
      ausencia: 'lucideUserX',
      coacao: 'lucideTriangleAlert',
      sabotagem: 'lucideShieldAlert',
    };
    return map[tipo] ?? 'lucideAlertCircle';
  }

  tipoLabel(tipo: Alerta['tipo']): string {
    const map: Record<Alerta['tipo'], string> = {
      atraso: 'Atraso',
      ausencia: 'Ausência',
      coacao: 'Coação',
      sabotagem: 'Sabotagem',
    };
    return map[tipo] ?? tipo;
  }

  iconBg(gravidade: Alerta['gravidade']): string {
    const map: Record<Alerta['gravidade'], string> = {
      critica: 'color-mix(in oklch, var(--color-destructive), transparent 85%)',
      alta: 'color-mix(in oklch, #f97316, transparent 85%)',
      media: 'color-mix(in oklch, #f59e0b, transparent 85%)',
      baixa: 'color-mix(in oklch, var(--color-primary), transparent 85%)',
    };
    return map[gravidade] ?? 'color-mix(in oklch, var(--color-muted), transparent 85%)';
  }

  statusLabel(status: Alerta['status']): string {
    const map: Record<Alerta['status'], string> = {
      aberto: 'Aberto',
      reconhecido: 'Visto',
      encerrado: 'Encerrado',
    };
    return map[status] ?? status;
  }

  iconColor(gravidade: Alerta['gravidade']): string {
    const map: Record<Alerta['gravidade'], string> = {
      critica: 'var(--color-destructive)',
      alta: '#f97316',
      media: '#f59e0b',
      baixa: 'var(--color-primary)',
    };
    return map[gravidade] ?? 'var(--muted-foreground)';
  }
}
