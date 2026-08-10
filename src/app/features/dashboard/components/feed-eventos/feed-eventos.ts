import { Component, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { FeedEvento } from '../../dashboard.types';

const ICONE_MAP: Record<FeedEvento['tipo'], string> = {
  inicio_turno: 'lucidePlay',
  fim_turno: 'lucideStopCircle',
  checkin: 'lucideMapPin',
  alerta_aberto: 'lucideBellRing',
  alerta_reconhecido: 'lucideBellOff',
  sabotagem: 'lucideShieldAlert',
};

const COR_MAP: Record<FeedEvento['tipo'], string> = {
  inicio_turno: 'var(--success)',
  fim_turno: 'var(--muted-foreground)',
  checkin: 'var(--info)',
  alerta_aberto: 'var(--destructive)',
  alerta_reconhecido: 'var(--warning)',
  sabotagem: '#7f1d1d',
};

const LABEL_MAP: Record<FeedEvento['tipo'], string> = {
  inicio_turno: 'iniciou turno em',
  fim_turno: 'finalizou turno em',
  checkin: 'fez check-in em',
  alerta_aberto: 'disparou alerta em',
  alerta_reconhecido: 'reconheceu alerta em',
  sabotagem: 'detectou sabotagem em',
};

@Component({
  selector: 'gp-feed-eventos',
  imports: [NgIcon],
  templateUrl: './feed-eventos.html',
  styleUrl: './feed-eventos.scss',
})
export class FeedEventos {
  eventos = input.required<FeedEvento[]>();

  icone(tipo: FeedEvento['tipo']): string {
    return ICONE_MAP[tipo] ?? 'lucideAlertCircle';
  }

  cor(tipo: FeedEvento['tipo']): string {
    return COR_MAP[tipo] ?? 'var(--muted-foreground)';
  }

  descricao(evento: FeedEvento): string {
    const acao = LABEL_MAP[evento.tipo] ?? 'evento em';
    return `${evento.usuarioNome} ${acao} ${evento.postoNome}`;
  }

  tempoRelativo(timestamp: string): string {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutos = Math.floor(diff / 60000);

    if (minutos < 1) return 'agora';
    if (minutos === 1) return 'há 1 min';
    if (minutos < 60) return `há ${minutos} min`;

    const horas = Math.floor(minutos / 60);
    if (horas === 1) return 'há 1 h';
    return `há ${horas} h`;
  }
}
