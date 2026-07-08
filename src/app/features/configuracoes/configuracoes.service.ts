import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { NivelEscalonamento } from '../../core/models/config.model';
import { Empresa } from '../../core/models/empresa.model';

interface ConfigEscalonamentoDto {
  id: string;
  empresa_id: string;
  nivel: number;
  atraso_minutos: number;
  descricao?: string;
  sistema: boolean;
  usuario_ids: string[];
  created_at: string;
}

interface EmpresaDto {
  id: string;
  nome: string;
  cnpj: string;
  ativa: boolean;
  alerta_sonoro: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEscalonamentoPayload {
  nivel: number;
  atrasoMinutos: number;
  descricao?: string;
  usuarioIds: string[];
}

export interface UpdateEscalonamentoPayload {
  atrasoMinutos?: number;
  descricao?: string;
  usuarioIds?: string[];
}

function mapEscalonamentoFromDto(dto: ConfigEscalonamentoDto): NivelEscalonamento {
  return {
    id: dto.id,
    empresaId: dto.empresa_id,
    nivel: dto.nivel,
    atrasoMinutos: dto.atraso_minutos,
    descricao: dto.descricao,
    sistema: dto.sistema,
    usuarioIds: dto.usuario_ids ?? [],
    createdAt: dto.created_at,
  };
}

function mapEmpresaFromDto(dto: EmpresaDto): Empresa {
  return {
    id: dto.id,
    nome: dto.nome,
    cnpj: dto.cnpj,
    ativa: dto.ativa,
    alertaSonoro: dto.alerta_sonoro,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

@Injectable({ providedIn: 'root' })
export class ConfiguracoesService {
  private readonly api = inject(ApiService);

  obterEmpresa(): Observable<Empresa> {
    return this.api.get<EmpresaDto>('/empresa').pipe(map(mapEmpresaFromDto));
  }

  listarEscalonamento(): Observable<NivelEscalonamento[]> {
    return this.api
      .get<ConfigEscalonamentoDto[]>('/config/escalonamento')
      .pipe(map((dtos) => dtos.map(mapEscalonamentoFromDto)));
  }

  criarEscalonamento(data: CreateEscalonamentoPayload): Observable<NivelEscalonamento> {
    const body: Record<string, unknown> = {
      nivel: data.nivel,
      atraso_minutos: data.atrasoMinutos,
      usuario_ids: data.usuarioIds,
    };
    if (data.descricao !== undefined) {
      body['descricao'] = data.descricao;
    }
    return this.api
      .post<ConfigEscalonamentoDto>('/config/escalonamento', body)
      .pipe(map(mapEscalonamentoFromDto));
  }

  atualizarEscalonamento(id: string, data: UpdateEscalonamentoPayload): Observable<NivelEscalonamento> {
    const body: Record<string, unknown> = {};
    if (data.atrasoMinutos !== undefined) {
      body['atraso_minutos'] = data.atrasoMinutos;
    }
    if (data.descricao !== undefined) {
      body['descricao'] = data.descricao;
    }
    if (data.usuarioIds !== undefined) {
      body['usuario_ids'] = data.usuarioIds;
    }
    return this.api
      .put<ConfigEscalonamentoDto>(`/config/escalonamento/${id}`, body)
      .pipe(map(mapEscalonamentoFromDto));
  }

  removerEscalonamento(id: string): Observable<void> {
    return this.api.delete<void>(`/config/escalonamento/${id}`);
  }
}
