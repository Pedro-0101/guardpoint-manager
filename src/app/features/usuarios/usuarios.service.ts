import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Usuario } from '../../core/models/usuario.model';
import { SenhaVigia } from '../../core/models/senha.model';

export interface CreateUsuarioPayload {
  nome: string;
  email: string;
  cargo: Usuario['cargo'];
  senha: string;
  ativo?: boolean;
}

export interface UpdateUsuarioPayload {
  nome?: string;
  email?: string;
  cargo?: Usuario['cargo'];
  senha?: string;
  ativo?: boolean;
}

export interface CreateSenhaVigiaPayload {
  tipo: SenhaVigia['tipo'];
  codigo: string;
  descricao?: string;
  escalonamentoId?: string;
}

export interface UpdateSenhaVigiaPayload {
  codigo?: string;
  descricao?: string;
  escalonamentoId?: string;
}

interface SenhaVigiaDto {
  id: string;
  usuario_id: string;
  empresa_id: string;
  tipo: string;
  codigo: string;
  descricao?: string;
  escalonamento_id?: string;
  created_at: string;
  updated_at: string;
}

function mapSenhaFromDto(dto: SenhaVigiaDto): SenhaVigia {
  return {
    id: dto.id,
    tipo: dto.tipo as SenhaVigia['tipo'],
    codigo: dto.codigo,
    descricao: dto.descricao,
    escalonamentoId: dto.escalonamento_id,
    usuarioId: dto.usuario_id,
    empresaId: dto.empresa_id,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly api = inject(ApiService);

  listar(): Observable<Usuario[]> {
    return this.api.get<Usuario[]>('/usuarios');
  }

  obter(id: string): Observable<Usuario> {
    return this.api.get<Usuario>(`/usuarios/${id}`);
  }

  criar(data: CreateUsuarioPayload): Observable<Usuario> {
    return this.api.post<Usuario>('/usuarios', data);
  }

  atualizar(id: string, data: UpdateUsuarioPayload): Observable<Usuario> {
    return this.api.put<Usuario>(`/usuarios/${id}`, data);
  }

  inativar(id: string): Observable<void> {
    return this.api.delete<void>(`/usuarios/${id}`);
  }

  listarSenhas(userId: string): Observable<SenhaVigia[]> {
    return this.api
      .get<SenhaVigiaDto[]>(`/usuarios/${userId}/senhas`)
      .pipe(map((dtos) => dtos.map(mapSenhaFromDto)));
  }

  criarSenha(userId: string, data: CreateSenhaVigiaPayload): Observable<SenhaVigia> {
    const body: Record<string, unknown> = {
      tipo: data.tipo,
      codigo: data.codigo,
    };
    if (data.descricao !== undefined) {
      body['descricao'] = data.descricao;
    }
    if (data.escalonamentoId !== undefined) {
      body['escalonamento_id'] = data.escalonamentoId;
    }
    return this.api
      .post<SenhaVigiaDto>(`/usuarios/${userId}/senhas`, body)
      .pipe(map(mapSenhaFromDto));
  }

  atualizarSenha(userId: string, senhaId: string, data: UpdateSenhaVigiaPayload): Observable<SenhaVigia> {
    const body: Record<string, unknown> = {};
    if (data.codigo !== undefined) {
      body['codigo'] = data.codigo;
    }
    if (data.descricao !== undefined) {
      body['descricao'] = data.descricao;
    }
    if (data.escalonamentoId !== undefined) {
      body['escalonamento_id'] = data.escalonamentoId;
    }
    return this.api
      .put<SenhaVigiaDto>(`/usuarios/${userId}/senhas/${senhaId}`, body)
      .pipe(map(mapSenhaFromDto));
  }

  removerSenha(userId: string, senhaId: string): Observable<void> {
    return this.api.delete<void>(`/usuarios/${userId}/senhas/${senhaId}`);
  }
}
