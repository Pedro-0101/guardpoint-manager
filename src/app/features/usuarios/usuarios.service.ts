import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Usuario } from '../../core/models/usuario.model';

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
}
