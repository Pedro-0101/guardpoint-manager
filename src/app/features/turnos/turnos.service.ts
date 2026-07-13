import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Turno, TurnoComPosicao, TurnoDetalhe, TurnoFilter, TurnoListResponse } from '../../core/models/turno.model';
import { Checkin } from '../../core/models/checkin.model';
import { Posto } from '../../core/models/posto.model';
import { Usuario } from '../../core/models/usuario.model';

export interface RevogarSessaoResponse {
  pin_novo_dispositivo: string;
  validade_minutos: number;
}

interface TurnoDto {
  id: string | null;
  empresa_id: string;
  usuario_id: string;
  posto_id: string;
  posto_nome?: string;
  usuario_nome?: string;
  status: string;
  inicio_previsto: string;
  fim_previsto: string;
  inicio_real: string | null;
  fim_real: string | null;
  intervalo_min: number;
  substituicao_id?: string;
  created_at: string;
  posto?: PostoDto;
  usuario?: UsuarioDto;
  checkins?: CheckinDto[];
  ultimo_checkin?: CheckinDto;
}

interface TurnoListResponseDto {
  data: TurnoDto[];
  total: number;
}

interface CheckinDto {
  id: string;
  turno_id: string;
  latitude: number;
  longitude: number;
  timestamp_criacao: string;
  timestamp_recebimento: string;
  tipo_senha: string;
  flag_geofence: string;
  origem_rede: string;
}

interface PostoDto {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  raio_m: number;
  ativo: boolean;
  empresa_id: string;
  created_at: string;
  updated_at: string;
}

interface UsuarioDto {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  empresa_id: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface TurnoMapaDto {
  id: string;
  usuario_nome: string;
  posto_id: string;
  posto_nome: string;
  status: string;
  posto_latitude: number;
  posto_longitude: number;
  posto_raio_m: number;
  ultimo_checkin: CheckinDto | null;
}

@Injectable({ providedIn: 'root' })
export class TurnosService {
  private readonly api = inject(ApiService);

  listar(params?: TurnoFilter): Observable<TurnoListResponse> {
    return this.api
      .get<TurnoListResponseDto>('/turnos/', params as Record<string, string | number | boolean>)
      .pipe(
        map((response) => ({
          data: response.data.map((dto) => this.mapTurnoFromDto(dto)),
          total: response.total,
        })),
      );
  }

  listarMapa(): Observable<TurnoComPosicao[]> {
    return this.api
      .get<TurnoMapaDto[]>('/turnos/mapa')
      .pipe(map((dtos) => dtos.map((dto) => this.mapTurnoMapaFromDto(dto))));
  }

  obter(id: string): Observable<TurnoDetalhe> {
    return this.api
      .get<TurnoDto>(`/turnos/${id}`)
      .pipe(map((dto) => this.mapTurnoDetalheFromDto(dto)));
  }

  revogarSessao(turnoId: string): Observable<RevogarSessaoResponse> {
    return this.api.post<RevogarSessaoResponse>(`/turnos/${turnoId}/revogar`, {});
  }

  private mapTurnoFromDto(dto: TurnoDto): Turno {
    return {
      id: dto.id,
      empresaId: dto.empresa_id,
      usuarioId: dto.usuario_id,
      postoId: dto.posto_id,
      postoNome: dto.posto_nome ?? dto.posto?.nome ?? '',
      usuarioNome: dto.usuario_nome ?? dto.usuario?.nome ?? '',
      status: dto.status as Turno['status'],
      inicioPrevisto: dto.inicio_previsto,
      fimPrevisto: dto.fim_previsto,
      inicioReal: dto.inicio_real,
      fimReal: dto.fim_real,
      intervaloMin: dto.intervalo_min,
      substituicaoId: dto.substituicao_id,
      createdAt: dto.created_at,
    };
  }

  private mapCheckinFromDto(dto: CheckinDto): Checkin {
    return {
      id: dto.id,
      turnoId: dto.turno_id,
      latitude: dto.latitude,
      longitude: dto.longitude,
      timestampCriacao: dto.timestamp_criacao,
      timestampRecebimento: dto.timestamp_recebimento,
      tipoSenha: dto.tipo_senha as Checkin['tipoSenha'],
      flagGeofence: dto.flag_geofence as Checkin['flagGeofence'],
      origemRede: dto.origem_rede as Checkin['origemRede'],
    };
  }

  private mapPostoFromDto(dto: PostoDto): Posto {
    return {
      id: dto.id,
      nome: dto.nome,
      latitude: dto.latitude,
      longitude: dto.longitude,
      raioM: dto.raio_m,
      ativo: dto.ativo,
      empresaId: dto.empresa_id,
      createdAt: dto.created_at,
      updatedAt: dto.updated_at,
    };
  }

  private mapUsuarioFromDto(dto: UsuarioDto): Usuario {
    return {
      id: dto.id,
      nome: dto.nome,
      email: dto.email,
      cargo: dto.cargo as Usuario['cargo'],
      empresaId: dto.empresa_id,
      ativo: dto.ativo,
      createdAt: dto.created_at,
      updatedAt: dto.updated_at,
    };
  }

  private mapTurnoDetalheFromDto(dto: TurnoDto): TurnoDetalhe {
    return {
      ...this.mapTurnoFromDto(dto),
      posto: dto.posto ? this.mapPostoFromDto(dto.posto) : null,
      usuario: dto.usuario ? this.mapUsuarioFromDto(dto.usuario) : null,
      checkins: (dto.checkins ?? []).map((c) => this.mapCheckinFromDto(c)),
    };
  }

  private mapTurnoComPosicaoFromDto(dto: TurnoDto): TurnoComPosicao {
    const ultimoCheckin = dto.ultimo_checkin
      ? this.mapCheckinFromDto(dto.ultimo_checkin)
      : this.derivarUltimoCheckin(dto.checkins ?? []);

    return {
      ...this.mapTurnoFromDto(dto),
      posto: dto.posto ? this.mapPostoFromDto(dto.posto) : null,
      usuario: dto.usuario ? this.mapUsuarioFromDto(dto.usuario) : null,
      ultimoCheckin,
    };
  }

  private mapTurnoMapaFromDto(dto: TurnoMapaDto): TurnoComPosicao {
    return {
      id: dto.id,
      empresaId: '',
      usuarioId: '',
      postoId: dto.posto_id,
      postoNome: dto.posto_nome,
      usuarioNome: dto.usuario_nome,
      status: dto.status as Turno['status'],
      inicioPrevisto: '',
      fimPrevisto: '',
      inicioReal: null,
      fimReal: null,
      intervaloMin: 0,
      createdAt: '',
      posto: {
        id: dto.posto_id,
        nome: dto.posto_nome,
        latitude: dto.posto_latitude,
        longitude: dto.posto_longitude,
        raioM: dto.posto_raio_m,
        ativo: true,
        empresaId: '',
        createdAt: '',
        updatedAt: '',
      },
      usuario: null,
      ultimoCheckin: dto.ultimo_checkin ? this.mapCheckinFromDto(dto.ultimo_checkin) : null,
    };
  }

  private derivarUltimoCheckin(dtos: CheckinDto[]): Checkin | null {
    if (dtos.length === 0) return null;
    const checkins = dtos.map((c) => this.mapCheckinFromDto(c));
    return checkins.reduce((a, b) =>
      new Date(a.timestampCriacao).getTime() >
      new Date(b.timestampCriacao).getTime()
        ? a
        : b,
    );
  }
}
