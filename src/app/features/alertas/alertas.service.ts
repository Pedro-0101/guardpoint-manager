import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { NewAlertPayload } from '../../core/websocket/websocket.types';
import { Alerta } from '../../core/models/alerta.model';

export interface AlertasFiltros {
  tipo?: Alerta['tipo'];
  gravidade?: Alerta['gravidade'];
  status?: Alerta['status'];
  busca?: string;
}

export interface AlertasEstatisticas {
  porTipo: { tipo: string; total: number }[];
  porGravidade: { gravidade: string; total: number }[];
  porStatus: { status: string; total: number }[];
  porDia: { data: string; total: number }[];
}

/**
 * DTOs espelhando o contrato snake_case do backend (`internal/model/alerta.go`).
 * A REST não passa pela camelização do WebSocket, então o mapeamento é explícito
 * aqui — mesma convenção usada por `TurnosService`.
 */
interface AlertaDto {
  id: string;
  empresa_id: string;
  turno_id: string | null;
  tipo: string;
  nivel: number;
  status: string;
  mensagem?: string | null;
  resolvido_em?: string | null;
  created_at: string;
}

interface AlertaListResponse {
  data: AlertaDto[];
  total: number;
}

interface AlertaEstatisticasDto {
  total_abertos: number;
  total_reconhecidos: number;
  total_encerrados: number;
  por_tipo: { tipo: string; quantidade: number }[];
  por_hora: { hora: string; quantidade: number }[];
}

/**
 * O backend usa tipos com granularidade de escalonamento (`atraso_n1`, `atraso_n2`),
 * além de `no_show` e `sabotagem`. Normaliza para o domínio do painel.
 */
function normalizarTipo(raw: string): Alerta['tipo'] {
  if (raw.startsWith('atraso')) return 'atraso';
  if (raw === 'no_show') return 'ausencia';
  if (raw === 'coacao') return 'coacao';
  if (raw === 'sabotagem') return 'sabotagem';
  if (raw === 'bateria_baixa' || raw === 'fora_raio' || raw === 'sessao_expirada') {
    return raw;
  }
  return 'atraso';
}

/** Extrai o nível embutido em tipos como `atraso_n2` (default 1). */
function nivelDeTipo(raw: string): number {
  const match = raw.match(/_n(\d+)$/);
  return match ? Number(match[1]) : 1;
}

/** Deriva a gravidade a partir do tipo/nível — o backend não envia `gravidade`. */
function gravidadePorTipo(raw: string, nivel: number): Alerta['gravidade'] {
  if (raw === 'coacao' || raw === 'sabotagem') return 'critica';
  if (raw === 'no_show') return 'alta';
  const nivelMap: Record<number, Alerta['gravidade']> = {
    1: 'baixa',
    2: 'media',
    3: 'alta',
    4: 'critica',
  };
  return nivelMap[nivel] ?? 'baixa';
}

@Injectable({ providedIn: 'root' })
export class AlertasService {
  private readonly api = inject(ApiService);
  private readonly ws = inject(WebSocketService);

  private readonly alertasSubject = new BehaviorSubject<Alerta[]>([]);
  readonly alertas$ = this.alertasSubject.asObservable();

  constructor() {
    this.ws
      .onEvent<NewAlertPayload>('new_alert')
      .subscribe((payload) => this.handleNewAlert(payload));
  }

  listar(filtros?: AlertasFiltros): Observable<Alerta[]> {
    // Apenas `status` é filtrado no servidor; tipo/gravidade/busca são aplicados no
    // cliente (o `tipo` do domínio não corresponde 1:1 ao `tipo` do backend).
    const params: Record<string, string> = {};
    if (filtros?.status) params['status'] = filtros.status;
    return this.api
      .get<AlertaListResponse>('/alertas', params)
      .pipe(map((resp) => (resp?.data ?? []).map((dto) => this.mapAlertaFromDto(dto))));
  }

  reconhecer(id: string): Observable<{ status: string }> {
    return this.api.put<{ status: string }>(`/alertas/${id}/reconhecer`, {});
  }

  encerrar(id: string): Observable<{ status: string }> {
    return this.api.put<{ status: string }>(`/alertas/${id}/encerrar`, {});
  }

  listarEstatisticas(): Observable<AlertasEstatisticas> {
    return this.api
      .get<AlertaEstatisticasDto>('/alertas/estatisticas')
      .pipe(map((dto) => this.mapEstatisticasFromDto(dto)));
  }

  carregarLista(filtros?: AlertasFiltros): void {
    this.listar(filtros).subscribe({
      next: (alertas) => this.alertasSubject.next(alertas),
      error: (err) => console.error('[AlertasService] Erro ao listar:', err.message),
    });
  }

  atualizarStatusLocal(id: string, status: Alerta['status']): void {
    const current = this.alertasSubject.value;
    const updated = current.map((a) =>
      a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a,
    );
    this.alertasSubject.next(updated);
  }

  private mapAlertaFromDto(dto: AlertaDto): Alerta {
    return {
      id: dto.id,
      turnoId: dto.turno_id ?? '',
      tipo: normalizarTipo(dto.tipo),
      gravidade: gravidadePorTipo(dto.tipo, dto.nivel),
      status: dto.status as Alerta['status'],
      mensagem: dto.mensagem ?? '',
      reconhecidoPor: null,
      encerradoPor: null,
      createdAt: dto.created_at,
      updatedAt: dto.resolvido_em ?? dto.created_at,
    };
  }

  private mapEstatisticasFromDto(dto: AlertaEstatisticasDto): AlertasEstatisticas {
    const porTipoMap = new Map<string, number>();
    const porGravidadeMap = new Map<Alerta['gravidade'], number>();

    for (const item of dto.por_tipo ?? []) {
      const tipo = normalizarTipo(item.tipo);
      porTipoMap.set(tipo, (porTipoMap.get(tipo) ?? 0) + item.quantidade);

      const gravidade = gravidadePorTipo(item.tipo, nivelDeTipo(item.tipo));
      porGravidadeMap.set(gravidade, (porGravidadeMap.get(gravidade) ?? 0) + item.quantidade);
    }

    const porTipo = Array.from(porTipoMap, ([tipo, total]) => ({ tipo, total }));

    const ordemGravidade: Alerta['gravidade'][] = ['baixa', 'media', 'alta', 'critica'];
    const porGravidade = ordemGravidade
      .filter((g) => porGravidadeMap.has(g))
      .map((g) => ({ gravidade: g, total: porGravidadeMap.get(g) ?? 0 }));

    const porStatus = [
      { status: 'aberto', total: dto.total_abertos ?? 0 },
      { status: 'reconhecido', total: dto.total_reconhecidos ?? 0 },
      { status: 'encerrado', total: dto.total_encerrados ?? 0 },
    ].filter((s) => s.total > 0);

    const porDia = (dto.por_hora ?? []).map((h) => ({ data: h.hora, total: h.quantidade }));

    return { porTipo, porGravidade, porStatus, porDia };
  }

  private handleNewAlert(payload: NewAlertPayload): void {
    const current = this.alertasSubject.value;

    if (current.some((a) => a.id === payload.alertaId)) return;

    const alerta: Alerta = {
      id: payload.alertaId,
      turnoId: payload.turnoId ?? '',
      tipo: normalizarTipo(payload.tipo),
      gravidade: gravidadePorTipo(payload.tipo, payload.nivel),
      status: 'aberto',
      mensagem: '',
      reconhecidoPor: null,
      encerradoPor: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.alertasSubject.next([alerta, ...current]);
  }
}
