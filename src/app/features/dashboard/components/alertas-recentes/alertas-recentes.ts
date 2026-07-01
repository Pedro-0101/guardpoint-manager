import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Alerta } from '../../../../core/models/alerta.model';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'gp-alertas-recentes',
  imports: [DatePipe, StatusBadge],
  templateUrl: './alertas-recentes.html',
  styleUrl: './alertas-recentes.scss',
})
export class AlertasRecentes {
  alertas = input.required<Alerta[]>();

  gravidadeLabel(g: Alerta['gravidade']): string {
    const map: Record<Alerta['gravidade'], string> = {
      baixa: 'Baixa',
      media: 'Média',
      alta: 'Alta',
      critica: 'Crítica',
    };
    return map[g] ?? g;
  }

  gravidadeClass(g: Alerta['gravidade']): string {
    return `alertas-recentes__gravidade--${g}`;
  }

  tipoIcon(t: Alerta['tipo']): string {
    const icons: Record<Alerta['tipo'], string> = {
      atraso: 'schedule',
      ausencia: 'person_off',
      coacao: 'warning',
      bateria_baixa: 'battery_alert',
      fora_raio: 'location_off',
      sessao_expirada: 'timer_off',
    };
    return icons[t] ?? 'error';
  }
}
