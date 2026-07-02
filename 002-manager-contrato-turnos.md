# Prompt de Correção — guardpoint-manager — Fase 5 (Monitoramento de Turnos)

> **Para o executor:** você trabalha SOMENTE no repositório `guardpoint-manager` (Angular). Não altere `guardpoint-server` nem `guardpoint-android`. Você não tem o contexto da conversa que gerou este prompt — tudo que precisa está aqui. Trate o contrato REAL do backend (descrito abaixo, extraído do código Go) como a fonte da verdade.

## Contexto

A **Fase 5** do Manager (ver `PLANNING.md` §11) é o "Monitoramento de Turnos": lista de turnos ativos, detalhe do turno (timeline de check-ins + rota no mini-mapa Leaflet), ação "Revogar Sessão" e status badges. Os componentes existem, mas **consomem um contrato divergente do que o backend realmente expõe** — a lista não carrega, o detalhe fica vazio e o diálogo de revogação mostra um PIN inexistente.

## Contrato REAL do backend (fonte da verdade — extraído do Go)

Rotas de turnos que EXISTEM (`guardpoint-server/cmd/server/main.go`), todas sob `/api`:

```
GET  /api/turnos/ativos        -> []TurnoDetalhe   (turnos em andamento da empresa)
GET  /api/turnos/historico     -> { data: []Turno, total }
GET  /api/turnos/{id}          -> TurnoDetalhe      (turno + posto + usuario + checkins EMBUTIDOS)
POST /api/turnos/{id}/revogar  -> { "message": "turno revogado com sucesso" }
```

> **NÃO existem** as rotas `GET /api/turnos` (sem sufixo) nem `GET /api/turnos/{id}/checkins`. Chamá-las resulta em 404.

Formato JSON do backend — **snake_case**, campos de domínio (Go `internal/model/turno.go` e `checkin.go`):

```jsonc
// Turno (base) / dentro de TurnoDetalhe
{
  "id": "uuid",
  "empresa_id": "uuid",
  "usuario_id": "uuid",
  "posto_id": "uuid",
  "posto_nome": "Obra Central",      // pode vir omitido
  "status": "agendado|em_andamento|pausado|finalizado|critico",
  "inicio_previsto": "2026-07-02T20:00:00Z",
  "fim_previsto":    "2026-07-03T06:00:00Z",
  "inicio_real":     "…|null",
  "fim_real":        "…|null",
  "intervalo_min":   30,
  "created_at":      "…"
}

// TurnoDetalhe = Turno + estes campos aninhados:
{
  "posto":    { … Posto … },
  "usuario":  { "id": "…", "nome": "…", "email": "…", "role": "…", … },
  "checkins": [ Checkin, … ]
}

// Checkin (guardpoint-server/internal/model/checkin.go — confira os json tags reais nesse arquivo)
{
  "id": "uuid",
  "turno_id": "uuid",
  "latitude": -23.5,
  "longitude": -46.6,
  "timestamp_criacao": "…",       // hora do celular
  "timestamp_recebimento": "…",
  "tipo_senha": "padrao|coacao|finalizacao|sabotagem",
  "flag_geofence": "ok|desvio_rota",
  "origem_rede": "online|offline_sincronizado"
}
```

> **Passo 0 obrigatório:** abra `guardpoint-server/internal/model/checkin.go` e `posto.go`/`user.go` e confirme os `json:"..."` tags exatos antes de tipar os modelos Angular. Os nomes acima são o contrato, mas valide.

## O que está ERRADO hoje no Manager

`src/app/features/turnos/turnos.service.ts`
```ts
listar(params?): Observable<Turno[]> {
  return this.api.get<Turno[]>('/turnos', params);          // ❌ rota inexistente -> 404
}
listarCheckins(turnoId): Observable<Checkin[]> {
  return this.api.get<Checkin[]>(`/turnos/${turnoId}/checkins`);  // ❌ rota inexistente -> 404
}
revogarSessao(turnoId): Observable<RevogarSessaoResponse> {  // ❌ espera { pin, validadeMinutos }
  return this.api.post<RevogarSessaoResponse>(`/turnos/${turnoId}/revogar`, {});
}
```

`src/app/core/models/turno.model.ts` — camelCase e campos que o backend NÃO envia (`usuarioNome`, `escalaId`, `inicio`, `fim`, `updatedAt`) e status `'cancelado'` (o backend usa `'critico'`, não existe `'cancelado'`):
```ts
export interface Turno {
  id: string; usuarioId: string; usuarioNome: string; postoId: string; postoNome: string;
  escalaId: string; status: 'em_andamento'|'pausado'|'finalizado'|'cancelado';
  inicio: string; fim: string|null; createdAt: string; updatedAt: string;
}
```

`src/app/core/models/checkin.model.ts` — campo `timestamp`/`tipo` com valores errados:
```ts
export interface Checkin {
  id: string; turnoId: string; latitude: number; longitude: number; precisao: number;
  tipo: 'inicio'|'periodico'|'fim'|'manual'; timestamp: string; createdAt: string;
}
```

`src/app/core/services/api.service.ts` — **não faz** conversão snake_case↔camelCase (o `get<T>` devolve o JSON cru). Então os componentes que leem `t.usuarioNome`, `t.inicio`, `c.timestamp` recebem `undefined`.

Consumidores afetados (Fase 5):
- `features/turnos/turnos-list/turnos-list.component.ts` — lê `t.usuarioNome`, `t.postoNome`, `t.status`, `t.inicio`; `STATUS_FILTERS` inclui `'cancelado'` e omite `'critico'`/`'agendado'`.
- `features/turnos/turno-detail/turno-detail.ts` — usa `listarCheckins(id)` (404 → timeline e rota sempre vazias); `TIPO_CHECKIN_MAP` usa chaves `inicio/periodico/fim/manual`; ordena por `c.timestamp`.
- `features/turnos/turno-revogar-dialog/turno-revogar-dialog.ts` — exibe `resultado.pin` que nunca chega.

## Correção exigida

Decida uma **estratégia de mapeamento** e aplique de forma consistente. Recomendado: **manter os modelos Angular em camelCase** (convenção do front) e **mapear no service** os campos snake_case do backend, em vez de espalhar snake_case pelos componentes. Escolha UMA e documente.

1. **`turno.model.ts`** — alinhe ao contrato real:
   - `status`: `'agendado' | 'em_andamento' | 'pausado' | 'finalizado' | 'critico'` (remova `'cancelado'`).
   - Substitua `inicio/fim` por `inicioPrevisto/fimPrevisto` (+ `inicioReal/fimReal` opcionais), `intervaloMin`, `postoNome`. Remova `escalaId`/`updatedAt` (o backend não os envia nesta fase).
   - `usuarioNome` só existe via `usuario.nome` aninhado no `TurnoDetalhe`/`Ativos` — modele um campo derivado no mapeamento (ex.: `usuarioNome = dto.usuario?.nome ?? ''`) OU adicione um tipo `TurnoDetalhe` separado com `usuario`, `posto`, `checkins`.

2. **`checkin.model.ts`** — `timestampCriacao` (não `timestamp`), `tipoSenha: 'padrao'|'coacao'|'finalizacao'|'sabotagem'`, `flagGeofence: 'ok'|'desvio_rota'`, `origemRede`. Remova `precisao` (o backend não envia).

3. **`turnos.service.ts`:**
   - `listar()` → `GET /turnos/ativos` (retorna `[]TurnoDetalhe`), mapeando cada item para o modelo do front.
   - `obter(id)` → `GET /turnos/{id}` já traz `checkins` embutidos: exponha `obterDetalhe(id): Observable<TurnoDetalhe>` e **elimine `listarCheckins`** (ou faça-o derivar de `obterDetalhe`). Ajuste `turno-detail.ts` para ler `detalhe.checkins` em vez de uma segunda chamada.
   - `revogarSessao()` → tipar a resposta como `{ message: string }` (ver seção "PIN" abaixo).

4. **`turno-detail.ts`:** trocar `TIPO_CHECKIN_MAP` para as chaves reais (`padrao`, `coacao`, `finalizacao`, `sabotagem`) e ordenar/rotular por `timestampCriacao`. A rota (polyline) passa a usar os `checkins` embutidos.

5. **`turnos-list.component.ts`:** `STATUS_FILTERS` com os status reais; a coluna de "início" lê `inicioPrevisto` (ou `inicioReal ?? inicioPrevisto`).

### PIN de revogação (contrato incompleto no backend)

O `PLANNING.md`/`AGENTS.md` (§7.4) especificam que `POST /api/turnos/{id}/revogar` deve retornar um **PIN** para cadastrar novo dispositivo, mas o backend **hoje retorna apenas `{ "message": "..." }`** (o PIN não é gerado). Portanto:
- **Não invente** o campo `pin`. Ajuste o `turno-revogar-dialog` para exibir a confirmação de revogação com base em `{ message }` e ocultar a UI de PIN enquanto o backend não o fornecer.
- Registre no PR um TODO apontando que a exibição do PIN depende da correção do backend (ver `plans/003-server-fase5-hardening.md`, item Revogar/PIN). **Não** altere o backend a partir deste repo.

## Escopo

- **Em escopo:** `src/app/features/turnos/**` e `src/app/core/models/{turno,checkin}.model.ts`. Se optar por mapeamento centralizado, um helper de mapeamento em `turnos.service.ts` (ou `core/services`).
- **Fora de escopo:** não altere `api.service.ts` para conversão global automática de case (mudança de grande raio que afetaria dashboard, postos, usuários já funcionando) — a menos que o revisor peça. Não toque em `escalas` (represada, Fase 8). Não altere o backend.

## Verificação

1. `cd guardpoint-manager && ng build` — compila sem erros de tipo (o `tsconfig` é `strict`).
2. `ng lint` — sem novos erros.
3. **Teste manual** com backend rodando (`guardpoint-server`: `docker compose up -d && air`) e um turno ativo semeado:
   - `/turnos` (lista): as linhas mostram nome do vigia, posto, status e início preenchidos (nenhuma célula vazia por `undefined`). A rede mostra `GET /api/turnos/ativos` com 200 (não 404 em `/api/turnos`).
   - `/turnos/:id` (detalhe): a timeline lista os check-ins com rótulos corretos e a polyline aparece no mini-mapa; nenhuma chamada 404 a `/checkins`.
   - "Revogar Sessão" (admin): exibe confirmação de sucesso sem campo de PIN quebrado; `POST /api/turnos/{id}/revogar` retorna 200.
4. Se houver testes: `ng test` dos specs de `turnos`.

## Escape hatch

Se, ao abrir `api.service.ts`, você descobrir que **já existe** um interceptor/transformador snake_case→camelCase global (ex.: um `HttpInterceptor` que renomeia chaves), **pare e reporte** — a estratégia de mapeamento muda completamente e o diagnóstico deste prompt precisa ser revisado antes de prosseguir.
