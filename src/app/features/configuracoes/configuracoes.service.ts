import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Empresa } from '../../core/models/empresa.model';
import {
  ConfigEscalonamento,
  CreateEscalonamentoPayload,
  UpdateEscalonamentoPayload,
  UpdateEscalonamentoUsuariosPayload,
} from '../../core/models/config.model';

interface ConfigEscalonamentoDto {
  id: string;
  empresa_id: string;
  atraso_minutos: number;
  descricao?: string;
  usuario_ids: string[];
  sistema: boolean;
  em_uso: boolean;
  created_at: string;
}

interface EmpresaDto {
  id: string;
  nome: string;
  cnpj: string;
  codigo: string;
  ativa: boolean;
  alerta_sonoro: boolean;
  created_at: string;
  updated_at: string;
}

function mapEscalonamentoFromDto(dto: ConfigEscalonamentoDto): ConfigEscalonamento {
  return {
    id: dto.id,
    empresaId: dto.empresa_id,
    atrasoMinutos: dto.atraso_minutos,
    descricao: dto.descricao,
    usuarioIds: dto.usuario_ids ?? [],
    sistema: dto.sistema,
    emUso: dto.em_uso,
    createdAt: dto.created_at,
  };
}

function mapEmpresaFromDto(dto: EmpresaDto): Empresa {
  return {
    id: dto.id,
    nome: dto.nome,
    cnpj: dto.cnpj,
    codigo: dto.codigo,
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

  listarEscalonamentos(): Observable<ConfigEscalonamento[]> {
    return this.api
      .get<ConfigEscalonamentoDto[]>('/config/escalonamento')
      .pipe(map((dtos) => dtos.map(mapEscalonamentoFromDto)));
  }

  obterEscalonamento(id: string): Observable<ConfigEscalonamento> {
    return this.api
      .get<ConfigEscalonamentoDto>(`/config/escalonamento/${id}`)
      .pipe(map(mapEscalonamentoFromDto));
  }

  criarEscalonamento(data: CreateEscalonamentoPayload): Observable<ConfigEscalonamento> {
    const body: Record<string, unknown> = {
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

  atualizarEscalonamento(id: string, data: UpdateEscalonamentoPayload): Observable<ConfigEscalonamento> {
    const body: Record<string, unknown> = {
      atraso_minutos: data.atrasoMinutos,
      usuario_ids: data.usuarioIds,
    };
    if (data.descricao !== undefined) {
      body['descricao'] = data.descricao;
    }
    return this.api
      .put<ConfigEscalonamentoDto>(`/config/escalonamento/${id}`, body)
      .pipe(map(mapEscalonamentoFromDto));
  }

  excluirEscalonamento(id: string): Observable<void> {
    return this.api.delete<void>(`/config/escalonamento/${id}`);
  }

  atualizarUsuariosEscalonamento(id: string, data: UpdateEscalonamentoUsuariosPayload): Observable<ConfigEscalonamento> {
    return this.api
      .put<ConfigEscalonamentoDto>(`/config/escalonamento/${id}/usuarios`, { usuario_ids: data.usuarioIds })
      .pipe(map(mapEscalonamentoFromDto));
  }
}