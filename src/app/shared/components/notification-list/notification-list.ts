import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { ZardDividerComponent } from '../divider/divider.component';

export interface NotificationItem {
  id: string;
  tipo: string;
  gravidade: string;
  status: string;
  mensagem: string;
  tempo: string;
  createdAt: string;
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    tipo: 'coacao',
    gravidade: 'critica',
    status: 'aberto',
    mensagem: 'Vigilante João Silva acionou botão de coação no Posto 3',
    tempo: 'há 2 min',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    tipo: 'atraso',
    gravidade: 'alta',
    status: 'aberto',
    mensagem: 'Carlos Santos não registrou início do turno no Posto 1',
    tempo: 'há 15 min',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    tipo: 'ausencia',
    gravidade: 'media',
    status: 'aberto',
    mensagem: 'Ausência não justificada no posto Noturno',
    tempo: 'há 1h',
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    tipo: 'sabotagem',
    gravidade: 'critica',
    status: 'aberto',
    mensagem: 'Tentativa de acesso não autorizado detectada no Posto 2',
    tempo: 'há 3h',
    createdAt: new Date().toISOString(),
  },
  {
    id: '5',
    tipo: 'atraso',
    gravidade: 'baixa',
    status: 'reconhecido',
    mensagem: 'Atraso de 5 min no início do turno',
    tempo: 'há 5h',
    createdAt: new Date().toISOString(),
  },
  {
    id: '6',
    tipo: 'ausencia',
    gravidade: 'media',
    status: 'encerrado',
    mensagem: 'Falta justificada com atestado',
    tempo: 'ontem',
    createdAt: new Date().toISOString(),
  },
];

@Component({
  selector: 'gp-notification-list',
  imports: [NgIcon, RouterLink, ZardDividerComponent],
  templateUrl: './notification-list.html',
  styleUrl: './notification-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationListComponent {
  readonly notifications = signal<NotificationItem[]>(MOCK_NOTIFICATIONS);
  readonly openCount = computed(() => this.notifications().filter(n => n.status === 'aberto').length);

  tipoIcon(tipo: string): string {
    const map: Record<string, string> = {
      atraso: 'lucideClock',
      ausencia: 'lucideUserX',
      coacao: 'lucideTriangleAlert',
      sabotagem: 'lucideShieldAlert',
    };
    return map[tipo] ?? 'lucideAlertCircle';
  }

  tipoLabel(tipo: string): string {
    const map: Record<string, string> = {
      atraso: 'Atraso',
      ausencia: 'Ausência',
      coacao: 'Coação',
      sabotagem: 'Sabotagem',
    };
    return map[tipo] ?? tipo;
  }

  iconBg(gravidade: string): string {
    const map: Record<string, string> = {
      critica: 'color-mix(in oklch, var(--color-destructive), transparent 85%)',
      alta: 'color-mix(in oklch, #f97316, transparent 85%)',
      media: 'color-mix(in oklch, #f59e0b, transparent 85%)',
      baixa: 'color-mix(in oklch, var(--color-primary), transparent 85%)',
    };
    return map[gravidade] ?? 'color-mix(in oklch, var(--color-muted), transparent 85%)';
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      aberto: 'Aberto',
      reconhecido: 'Visto',
      encerrado: 'Encerrado',
    };
    return map[status] ?? status;
  }

  iconColor(gravidade: string): string {
    const map: Record<string, string> = {
      critica: 'var(--color-destructive)',
      alta: '#f97316',
      media: '#f59e0b',
      baixa: 'var(--color-primary)',
    };
    return map[gravidade] ?? 'var(--muted-foreground)';
  }
}
