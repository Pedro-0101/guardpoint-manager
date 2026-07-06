import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { NivelEscalonamento } from '../../core/models/config.model';
import { Empresa } from '../../core/models/empresa.model';

export interface NivelEscalonamentoInput {
  nivel: number;
  atrasoMinutos: number;
  whatsappPara: string;
  cargoAlvo?: string | null;
}

/** DTOs espelhando o contrato snake_case do backend (`internal/model/alerta.go`, `internal/model/empresa.go`). */
interface NivelEscalonamentoDto {
  id: string;
  empresa_id: string;
  nivel: number;
  atraso_minutos: number;
  cargo_alvo?: string | null;
  whatsapp_para: string;
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

@Injectable({ providedIn: 'root' })
export class ConfiguracoesService {
  private readonly api = inject(ApiService);

  listarNiveisEscalonamento(): Observable<NivelEscalonamento[]> {
    return this.api
      .get<NivelEscalonamentoDto[]>('/config/escalonamento')
      .pipe(map((dtos) => dtos.map((d) => this.mapNivelFromDto(d))));
  }

  salvarNiveisEscalonamento(niveis: NivelEscalonamentoInput[]): Observable<NivelEscalonamento[]> {
    const body = niveis.map((n) => this.mapNivelToDto(n));
    return this.api
      .put<NivelEscalonamentoDto[]>('/config/escalonamento', body)
      .pipe(map((dtos) => dtos.map((d) => this.mapNivelFromDto(d))));
  }

  obterEmpresa(): Observable<Empresa> {
    return this.api.get<EmpresaDto>('/empresa').pipe(map((d) => this.mapEmpresaFromDto(d)));
  }

  atualizarEmpresa(data: { nome: string; alertaSonoro: boolean }): Observable<Empresa> {
    return this.api
      .put<EmpresaDto>('/empresa', { nome: data.nome, alerta_sonoro: data.alertaSonoro })
      .pipe(map((d) => this.mapEmpresaFromDto(d)));
  }

  private mapNivelFromDto(dto: NivelEscalonamentoDto): NivelEscalonamento {
    return {
      id: dto.id,
      empresaId: dto.empresa_id,
      nivel: dto.nivel,
      atrasoMinutos: dto.atraso_minutos,
      cargoAlvo: dto.cargo_alvo ?? null,
      whatsappPara: dto.whatsapp_para,
      createdAt: dto.created_at,
    };
  }

  private mapNivelToDto(
    n: NivelEscalonamentoInput
  ): Pick<NivelEscalonamentoDto, 'nivel' | 'atraso_minutos' | 'whatsapp_para' | 'cargo_alvo'> {
    return {
      nivel: n.nivel,
      atraso_minutos: n.atrasoMinutos,
      whatsapp_para: n.whatsappPara,
      cargo_alvo: n.cargoAlvo || null,
    };
  }

  private mapEmpresaFromDto(dto: EmpresaDto): Empresa {
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
}
