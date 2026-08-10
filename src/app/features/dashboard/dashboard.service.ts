import { Injectable, inject } from '@angular/core';
import { Observable, Subject, merge } from 'rxjs';
import { debounceTime, map, switchMap } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { DashboardTableResponse, DashboardTableResponseDto, DashboardSummaryDto, DashboardLinha } from './dashboard.types';
import { Alerta } from '../../core/models/alerta.model';

function normalizarTipo(raw: string): Alerta['tipo'] {
  if (raw.startsWith('atraso')) return 'atraso';
  if (raw === 'no_show') return 'ausencia';
  if (raw === 'sabotagem') return 'sabotagem';
  if (raw === 'senha_emergencia' || raw === 'senha_customizada' || raw === 'coacao') return 'coacao';
  return 'atraso';
}

function gravidadePorTipo(raw: string, nivel: number): Alerta['gravidade'] {
  if (raw === 'coacao' || raw === 'sabotagem' || raw === 'senha_emergencia' || raw === 'senha_customizada') return 'critica';
  if (raw === 'no_show') return 'alta';
  const nivelMap: Record<number, Alerta['gravidade']> = { 1: 'baixa', 2: 'media', 3: 'alta', 4: 'critica' };
  return nivelMap[nivel] ?? 'baixa';
}

function nivelDeTipo(raw: string): number {
  const match = raw.match(/_n(\d+)$/);
  return match ? Number(match[1]) : 1;
}

function mapAlertaRecente(dto: DashboardSummaryDto['alertas_recentes'][number]): Alerta {
  const tipo = normalizarTipo(dto.tipo);
  const nivel = nivelDeTipo(dto.tipo);
  return {
    id: dto.id,
    turnoId: dto.turno_id ?? '',
    tipo,
    gravidade: gravidadePorTipo(dto.tipo, nivel),
    status: 'aberto',
    mensagem: dto.mensagem ?? '',
    reconhecidoPor: null,
    encerradoPor: null,
    createdAt: dto.created_at,
    updatedAt: dto.created_at,
  };
}

function mapDashboardLinha(dto: DashboardTableResponseDto['linhas'][number]): DashboardLinha {
  return {
    turnoId: dto.turno_id,
    vigiaId: dto.vigia_id,
    vigiaNome: dto.vigia_nome,
    postoId: dto.posto_id,
    postoNome: dto.posto_nome,
    postoLatitude: dto.posto_latitude,
    postoLongitude: dto.posto_longitude,
    postoRaioM: dto.posto_raio_m,
    turnoStatus: dto.turno_status,
    inicioPrevisto: dto.inicio_previsto,
    fimPrevisto: dto.fim_previsto,
    inicioReal: dto.inicio_real,
    intervaloMin: dto.intervalo_min,
    ultimoCheckin: dto.ultimo_checkin,
    proximoCheckin: dto.proximo_checkin,
    atrasado: dto.atrasado,
  };
}

function mapDashboardTableDto(dto: DashboardTableResponseDto): DashboardTableResponse {
  const s = dto.summary ?? {
    turnos_ativos: 0,
    alertas_abertos: 0,
    checkins_ultima_hora: 0,
    desvios_rota: 0,
    alertas_recentes: [],
    turnos_por_posto: [],
  };

  return {
    linhas: (dto.linhas ?? []).map(mapDashboardLinha),
    summary: {
      kpis: {
        turnosAtivos: s.turnos_ativos,
        alertasAbertos: s.alertas_abertos,
        checkinsUltimaHora: s.checkins_ultima_hora,
        desviosRota: s.desvios_rota,
      },
      alertasRecentes: (s.alertas_recentes ?? []).map(mapAlertaRecente),
      turnosPorPosto: (s.turnos_por_posto ?? []).map((t) => ({
        postoNome: t.posto_nome,
        quantidade: t.quantidade,
      })),
    },
    total: dto.total,
    limit: dto.limit,
    offset: dto.offset,
  };
}

@Injectable()
export class DashboardService {
  private readonly api = inject(ApiService);
  private readonly ws = inject(WebSocketService);

  private readonly stopWsRefresh$ = new Subject<void>();

  fetchTable(limit: number, offset: number): Observable<DashboardTableResponse> {
    return this.api
      .get<DashboardTableResponseDto>('/dashboard/table', {
        limit: limit.toString(),
        offset: offset.toString(),
      } as Record<string, string>)
      .pipe(map((dto) => mapDashboardTableDto(dto)));
  }

  startWsRefresh(limit: number, offset: number): Observable<DashboardTableResponse> {
    this.stopWsRefresh$.next();

    return merge(
      this.ws.onEvent('new_alert'),
      this.ws.onEvent('status_change'),
    ).pipe(
      debounceTime(3000),
      switchMap(() => this.fetchTable(limit, offset)),
    );
  }

  stopWsRefresh(): void {
    this.stopWsRefresh$.next();
  }
}
