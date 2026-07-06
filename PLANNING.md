# guardpoint-manager — Plano de Desenvolvimento (Painel Gerencial Angular)

## 1. Visão Geral do Módulo

O `guardpoint-manager` é o painel web gerencial (frontend) da plataforma GuardPoint, construído em Angular. Destinado a supervisores e gestores de empresas de segurança privada, o painel oferece visualização em tempo real de todos os vigias em campo sobre um mapa interativo, dashboards de alertas, gestão de escalas, controle de turnos e configuração de regras de escalonamento.

## 2. Stack Tecnológica

| Componente          | Tecnologia                                  |
| ------------------- | ------------------------------------------- |
| Framework           | Angular 21+                                 |
| Linguagem           | TypeScript 5+                               |
| Estado / Reativo    | RxJS (Observables, Subjects, BehaviorSubject) |
| UI Components       | Angular Material ou PrimeNG                 |
| Mapas               | Leaflet + OpenStreetMap (ou Google Maps)    |
| WebSocket           | RxJS WebSocket (nativo)                     |
| HTTP                | HttpClient (Angular)                        |
| Autenticação        | JWT + HTTP Interceptor + AuthGuard          |
| Roteamento          | Angular Router com Lazy Loading             |
| Testes              | Jasmine + Karma / Jest                      |
| Build               | Angular CLI                                 |
| Deploy              | Nginx (Docker) ou CDN estático              |

## 3. Estrutura de Diretórios

```
guardpoint-manager/
├── src/
│   ├── app/
│   │   ├── core/                              # Singleton services e guards
│   │   │   ├── auth/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.guard.ts
│   │   │   │   ├── role.guard.ts
│   │   │   │   └── jwt.interceptor.ts
│   │   │   ├── websocket/
│   │   │   │   └── websocket.service.ts
│   │   │   ├── services/
│   │   │   │   ├── api.service.ts             # HttpClient wrapper
│   │   │   │   ├── notification.service.ts
│   │   │   │   └── tenant.service.ts          # empresa_id context
│   │   │   └── models/
│   │   │       ├── usuario.model.ts
│   │   │       ├── turno.model.ts
│   │   │       ├── checkin.model.ts
│   │   │       ├── alerta.model.ts
│   │   │       ├── posto.model.ts
│   │   │       ├── escala.model.ts
│   │   │       └── config.model.ts
│   │   ├── shared/                            # Componentes reutilizáveis
│   │   │   ├── components/
│   │   │   │   ├── loading-spinner/
│   │   │   │   ├── confirm-dialog/
│   │   │   │   ├── status-badge/
│   │   │   │   ├── alerta-toast/
│   │   │   │   └── empty-state/
│   │   │   ├── directives/
│   │   │   └── pipes/
│   │   ├── features/                          # Módulos lazy-loaded
│   │   │   ├── login/
│   │   │   │   ├── login.component.ts
│   │   │   │   ├── login.component.html
│   │   │   │   └── login.component.scss
│   │   │   ├── dashboard/
│   │   │   │   ├── dashboard.component.ts     # Visão geral (KPIs)
│   │   │   │   ├── dashboard.component.html
│   │   │   │   ├── dashboard.component.scss
│   │   │   │   └── components/
│   │   │   │       ├── kpi-card/
│   │   │   │       ├── alertas-recentes/
│   │   │   │       └── turnos-resumo/
│   │   │   ├── mapa/                          # Monitoramento em tempo real
│   │   │   │   ├── mapa.component.ts
│   │   │   │   ├── mapa.component.html
│   │   │   │   ├── mapa.component.scss
│   │   │   │   └── services/
│   │   │   │       └── mapa-websocket.service.ts
│   │   │   ├── turnos/                        # Gestão de turnos
│   │   │   │   ├── turnos-list/
│   │   │   │   ├── turno-detail/
│   │   │   │   ├── turno-revogar-dialog/
│   │   │   │   └── turnos.service.ts
│   │   │   ├── escalas/                       # Gestão de escalas
│   │   │   │   ├── escalas-list/
│   │   │   │   ├── escala-form/
│   │   │   │   └── escalas.service.ts
│   │   │   ├── alertas/                       # Gestão de alertas
│   │   │   │   ├── alertas-list/
│   │   │   │   ├── alerta-detail/
│   │   │   │   └── alertas.service.ts
│   │   │   ├── postos/                        # Gestão de postos/obras
│   │   │   │   ├── postos-list/
│   │   │   │   ├── posto-form/
│   │   │   │   └── postos.service.ts
│   │   │   ├── usuarios/                      # Gestão de usuários
│   │   │   │   ├── usuarios-list/
│   │   │   │   ├── usuario-form/
│   │   │   │   └── usuarios.service.ts
│   │   │   ├── configuracoes/                 # Configurações da empresa
│   │   │   │   ├── config-escalonamento/
│   │   │   │   ├── config-geral/
│   │   │   │   └── configuracoes.service.ts
│   │   │   └── relatorios/                    # Histórico e relatórios
│   │   │       ├── relatorios.component.ts
│   │   │       └── relatorios.service.ts
│   │   └── app.module.ts
│   ├── assets/
│   │   ├── images/
│   │   ├── icons/
│   │   └── styles/
│   │       ├── _variables.scss
│   │       ├── _mixins.scss
│   │       └── themes/
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   ├── index.html
│   └── styles.scss
├── angular.json
├── package.json
├── tsconfig.json
├── Dockerfile
└── nginx.conf
```

## 4. Rotas e Lazy Loading

```
/                        → redirect para /dashboard
/login                   → LoginComponent (público)
/dashboard               → DashboardComponent (admin, supervisor)
/mapa                    → MapaComponent (admin, supervisor)
/turnos                  → TurnosListComponent (admin, supervisor)
/turnos/:id              → TurnoDetailComponent (admin, supervisor)
/escalas                 → EscalasListComponent (admin)
/escalas/nova            → EscalaFormComponent (admin)
/escalas/:id/editar      → EscalaFormComponent (admin)
/alertas                 → AlertasListComponent (admin, supervisor)
/alertas/:id             → AlertaDetailComponent (admin, supervisor)
/postos                  → PostosListComponent (admin)
/postos/novo             → PostoFormComponent (admin)
/postos/:id/editar       → PostoFormComponent (admin)
/usuarios                → UsuariosListComponent (admin)
/usuarios/novo           → UsuarioFormComponent (admin)
/usuarios/:id/editar     → UsuarioFormComponent (admin)
/configuracoes           → ConfigGeralComponent (admin)
/configuracoes/escalonamento → ConfigEscalonamentoComponent (admin)
/relatorios              → RelatoriosComponent (admin, supervisor)
```

## 5. Modelos de Dados (TypeScript)

### 5.1. Turno
```typescript
export interface Turno {
  id: string;
  empresaId: string;
  usuarioId: string;
  usuarioNome: string;
  postoId: string;
  postoNome: string;
  postoLatitude: number;
  postoLongitude: number;
  status: 'agendado' | 'em_andamento' | 'pausado' | 'finalizado' | 'critico';
  inicioPrevisto: string;    // ISO 8601
  fimPrevisto: string;
  inicioReal?: string;
  fimReal?: string;
  intervaloMin: number;
  ultimoCheckin?: Checkin;
  createdAt: string;
}
```

### 5.2. Checkin
```typescript
export interface Checkin {
  id: string;
  turnoId: string;
  latitude: number;
  longitude: number;
  timestampCriacao: string;
  timestampRecebimento: string;
  tipoSenha: 'padrao' | 'coacao' | 'finalizacao';
  flagGeofence: 'ok' | 'desvio_rota';
  origemRede: 'online' | 'offline_sincronizado';
}
```

### 5.3. Alerta
```typescript
export interface Alerta {
  id: string;
  turnoId: string;
  tipo: 'atraso_n1' | 'atraso_n2' | 'atraso_n3' | 'coacao' | 'sabotagem' | 'desvio_rota' | 'offline' | 'falha_infra';
  nivel: number;
  status: 'aberto' | 'reconhecido' | 'encerrado' | 'falso_positivo';
  mensagem: string;
  resolvidoEm?: string;
  createdAt: string;
}
```

### 5.4. Posto
```typescript
export interface Posto {
  id: string;
  empresaId: string;
  nome: string;
  latitude: number;
  longitude: number;
  raioM: number;
  ativo: boolean;
}
```

### 5.5. Escala
```typescript
export interface Escala {
  id: string;
  empresaId: string;
  postoId: string;
  postoNome: string;
  usuarioId: string;
  usuarioNome: string;
  data: string;          // YYYY-MM-DD
  periodo: 'diurno' | 'noturno' | 'integral';
  horaInicio: string;    // HH:mm
  horaFim: string;       // HH:mm
  excecao?: string;      // motivo de ausência
}
```

### 5.6. ConfigEscalonamento
```typescript
export interface ConfigEscalonamento {
  id: string;
  nivel: number;
  atrasoMinutos: number;
  whatsappPara: string;
  cargoAlvo: string;
}
```

### 5.7. WebSocket Event
```typescript
export interface WsEvent {
  type: 'gps_update' | 'status_change' | 'new_alert' | 'sync_resolved';
  payload: any;
}
```

## 6. Componentes Críticos e Comportamento

### 6.1. Mapa em Tempo Real (`MapaComponent`)
- Renderiza o mapa Leaflet com tiles do OpenStreetMap (gratuito, sem chave de API).
- Cada vigia com turno ativo é exibido como um **marcador (pin)**:
  - **Verde**: check-in dentro do prazo, dentro do raio do posto.
  - **Amarelo**: `flag_geofence = 'desvio_rota'` (fora do raio, mas check-in OK).
  - **Vermelho**: turno em atraso ou status `'critico'` (senha de coação).
  - **Cinza**: sem atualização recente (offline).
- Ao receber evento WebSocket `gps_update`, o marcador se move suavemente (animação CSS transition).
- Ao receber `status_change`, o ícone e a cor do pin são atualizados instantaneamente.
- Ao clicar em um pin, abre popup com:
  - Nome do vigia, posto, último check-in (há quantos minutos).
  - Link para `/turnos/:id` (detalhes completos).

### 6.2. Dashboard (`DashboardComponent`)
KPIs exibidos em cards:
- **Turnos ativos**: contagem de turnos `em_andamento`.
- **Alertas abertos**: contagem de alertas com status `'aberto'`.
- **Check-ins na última hora**: total.
- **Desvios de rota**: contagem de check-ins com `flag_geofence = 'desvio_rota'`.

Além disso: gráfico de barras (turnos por posto), lista dos últimos 10 alertas.

### 6.3. Detalhe do Turno (`TurnoDetailComponent`)
- Timeline cronológica de todos os check-ins do turno.
- Cada check-in mostra: hora, coordenadas, tipo de senha, flag geofence.
- Mapa mini centralizado no posto com a rota percorrida (polyline dos check-ins).
- Botão "Revogar Sessão" (apenas admin): chama `POST /api/turnos/{id}/revogar` e exibe PIN temporário para novo dispositivo.

### 6.4. Lista de Alertas (`AlertasListComponent`)
- Tabela com filtros por: tipo, nível, status, período.
- Ações: "Reconhecer" (PUT `/alertas/{id}/reconhecer`) e "Encerrar" (PUT `/alertas/{id}/encerrar`).
- Alertas de tipo `coacao` piscam em vermelho e emitem notificação sonora (opcional, configurável).
- Atualização em tempo real: novos alertas chegam via WebSocket `new_alert` e são inseridos no topo da tabela.

### 6.5. Escalonamento (`ConfigEscalonamentoComponent`)
- Lista dinâmica de níveis (N1, N2, N3...) com:
  - Atraso em minutos para disparo.
  - Número WhatsApp do destinatário.
  - Cargo alvo (supervisor, gerente).
- Botão "Adicionar Nível" cria nova linha.
- Salvamento via `PUT /api/config/escalonamento`.

## 7. Autenticação e RBAC

### 7.1. Fluxo de Login
1. Usuário acessa `/login`, digita email + senha.
2. `AuthService.login()` chama `POST /api/auth/login`.
3. Resposta contém JWT (`access_token`, `refresh_token`, `expires_in`).
4. JWT é armazenado em `localStorage` (ou `sessionStorage` se "lembrar-me" desmarcado).
5. `JwtInterceptor` anexa `Authorization: Bearer <token>` a toda requisição HTTP.
6. `AuthGuard` (implementa `CanActivate`) verifica existência e validade do token antes de ativar qualquer rota protegida.

### 7.2. Role Guard
- `RoleGuard` lê a claim `role` do payload do JWT decodificado.
- Rotas admin (`/usuarios`, `/configuracoes`, `/escalas/nova`) exigem `role = 'admin'`.
- Rotas de supervisor (`/dashboard`, `/mapa`, `/turnos`, `/alertas`) aceitam `role = 'admin'` ou `'supervisor'`.

### 7.3. Tenant Context
- `TenantService` extrai `empresa_id` do JWT e armazena em `BehaviorSubject<string>`.
- Toda chamada de API já inclui `empresa_id` no JWT (o backend extrai do token), então o frontend não precisa passá-lo explicitamente nos parâmetros de query.

### 7.4. Token Expiry e Refresh
- `JwtInterceptor` intercepta HTTP 401 e chama `AuthService.refreshToken()`.
- Se o refresh falhar, redireciona para `/login` com query param `?expired=true`.

## 8. WebSocket Service

### 8.1. Conexão
- `WebSocketService` utiliza `webSocket` do RxJS.
- Conecta em `wss://<host>/ws?token=<jwt>` (token como query param para handshake).
- Reconexão automática com backoff exponencial: 1s → 2s → 4s → 8s → 16s (max).
- Durante reconexão, exibe toast "Reconectando ao servidor...".

### 8.2. Fluxo de Dados via RxJS
```typescript
// websocket.service.ts (esboço)
private ws$: WebSocketSubject<WsEvent>;

connect(token: string): void {
  this.ws$ = webSocket({
    url: `${environment.wsUrl}?token=${token}`,
    openObserver: { next: () => console.log('WS connected') },
    closeObserver: { next: () => this.reconnect() },
    deserializer: (e) => JSON.parse(e.data)
  });
}

onEvent<T>(type: string): Observable<T> {
  return this.ws$.pipe(
    filter(event => event.type === type),
    map(event => event.payload as T)
  );
}
```

- `MapaWebSocketService` injeta `WebSocketService` e expõe Observables específicos:
  - `gpsUpdates$: Observable<GpsUpdatePayload>`
  - `statusChanges$: Observable<StatusChangePayload>`
  - `newAlerts$: Observable<Alerta>`

- Componentes subscrevem a esses Observables com `AsyncPipe` no template (evita memory leaks).

## 9. Tratamento de Estado

### 9.1. Padrão
- Cada Feature Module tem um **Service** dedicado que expõe `BehaviorSubject` ou `Subject` para o estado.
- Componentes injetam o service e usam `AsyncPipe` no template.
- Exemplo:

```typescript
// turnos.service.ts
@Injectable({ providedIn: 'root' })
export class TurnosService {
  private turnosSubject = new BehaviorSubject<Turno[]>([]);
  turnos$ = this.turnosSubject.asObservable();

  constructor(private api: ApiService, private ws: WebSocketService) {
    this.ws.onEvent<StatusChangePayload>('status_change')
      .subscribe(payload => this.updateTurnoStatus(payload));
  }

  carregarAtivos(): void {
    this.api.get<Turno[]>('/turnos/ativos').subscribe(turnos =>
      this.turnosSubject.next(turnos)
    );
  }
}
```

### 9.2. Estratégia de Change Detection
- `ChangeDetectionStrategy.OnPush` em todos os componentes (padrão gerado pelo Angular CLI).
- Isso garante que apenas dados que realmente mudaram disparem re-renderização, essencial para performance no mapa com múltiplos pins.

## 10. Notificações no Painel

- `NotificationService` utiliza Angular Material `SnackBar` ou biblioteca de toast (ex: `ngx-toastr`).
- Eventos WebSocket que exigem atenção imediata (ex: `new_alert` do tipo `'coacao'`) disparam:
  - Toast persistente (não some automaticamente).
  - Som de alerta (Web Audio API, toggle nas configurações).
  - Badge no menu lateral com contagem de alertas abertos.

## 11. Fases de Desenvolvimento

### Fase 1 — Fundação
- [x] Scaffold do projeto Angular (`ng new`)
- [x] Configurar Angular Material
- [x] Tema base (paleta de cores, tipografia)
- [x] Layout shell: sidebar + toolbar + router-outlet
- [x] Configurar `ApiService` (HttpClient wrapper com base URL)
- [x] Configurar ESLint + script lint
- [x] Rota `/login` standalone (fora do MainLayout)
- [x] Ajustar porta 8080 + prefixo `/api`

### Fase 2 — Autenticação
- [x] Login page (formulário email + senha)
- [x] `AuthService` com login, logout, refresh
- [x] `JwtInterceptor` para anexar token nas requisições
- [x] `AuthGuard` e `RoleGuard`
- [x] `TenantService` para contexto de empresa
- [x] Tratamento de token expirado (redirect /login?expired=true)

### Fase 3 — Dashboard
- [x] KPIs (cards com contagens: turnos ativos, alertas, check-ins/hora)
- [ ] Gráficos (ngx-charts ou Chart.js)
- [x] Lista de alertas recentes
- [x] Polling inicial (substituído por WebSocket na Fase 7)

### Fase 4 — CRUDs Administrativos
- [x] Gestão de Postos (listar, criar, editar, inativar) — inativar usa DELETE (soft-delete no server)
- [x] Gestão de Usuários (listar, criar, editar, inativar) — inativar usa DELETE (soft-delete no server); payload envia "cargo"
- [ ] Gestão de Escalas — REPRESADA aguardando Fase 8 do server (feature flag `featureEscalas: false`)
- [x] Validações de formulário (required, patterns, etc.)

### Fase 5 — Monitoramento de Turnos
- [x] Lista de turnos ativos com filtros
- [x] Detalhe do turno (timeline de check-ins, rota no mini-mapa)
- [x] Ação "Revogar Sessão" (admin)
- [x] Status badges por estado do turno

### Fase 6 — Mapa Interativo
- [x] Integração Leaflet + OpenStreetMap
- [x] Renderização de pins dos vigias com turno ativo
- [x] Cores por status (verde, amarelo, vermelho, cinza)
- [x] Popup ao clicar no pin (dados resumidos, link para detalhe)
- [x] Polyline da rota no detalhe do turno

### Fase 7 — WebSocket e Tempo Real
- [x] `WebSocketService` com RxJS `webSocket`
- [x] Lógica de reconexão com backoff
- [x] Atualização dos pins no mapa em tempo real (gps_update)
- [x] Atualização de status dos turnos (status_change)
- [x] Inserção de novos alertas na lista (new_alert)
- [x] Substituir polling do dashboard por dados em tempo real

### Fase 8 — Alertas
- [x] Lista de alertas com filtros
- [x] Ações reconhecer/encerrar
- [x] Destaque visual e sonoro para alertas de coação (global — funciona em qualquer tela, com toast persistente e badge no header)
- [x] Estatísticas e gráficos de alertas

### Fase 9 — Configurações e Escalonamento
- [ ] Tela de configuração de níveis de escalonamento
- [ ] CRUD dinâmico de níveis (adicionar/remover linhas)
- [ ] Configurações gerais da empresa

### Fase 10 — Relatórios e Histórico
- [ ] Histórico de turnos com filtros (data, posto, vigia)
- [ ] Exportação CSV/PDF de relatórios
- [ ] Gráficos de tendências (turnos/dia, alertas/mês)

### Fase 11 — Testes, Build e Deploy
- [ ] Testes unitários nos services e guards
- [ ] Testes de integração nos componentes principais
- [ ] Dockerfile multi-stage (build Angular + serve Nginx)
- [ ] Configuração de CI/CD (GitHub Actions → Railway)
- [ ] Otimizações: lazy loading, bundle size, compression

## 12. Requisitos Não-Funcionais

| Requisito                | Meta                          |
| ------------------------ | ----------------------------- |
| Tempo de carregamento    | < 2s (first contentful paint) |
| Tamanho de bundle        | < 500KB (gzip)                |
| Atualização do mapa      | < 500ms após evento WS        |
| Suporte a navegadores    | Chrome, Firefox, Edge (2 últimas versões) |
| Responsividade           | Desktop-first (1024px+), tablet suportado |
| Acessibilidade           | Contraste WCAG AA, navegação por teclado |
| Tratamento de erro       | Toda chamada HTTP exibe feedback (erro ou sucesso) |

## 13. Convenções de Código

- **Idioma**: nomes de classes, métodos, variáveis em inglês; templates e mensagens em português.
- **RxJS**: usar `AsyncPipe` no template sempre que possível. Evitar `.subscribe()` manual em componentes; delegar ao template.
- **Destruição**: usar `takeUntil(this.destroy$)` com `Subject<void>` no `ngOnDestroy`.
- **Modularização**: cada feature é um módulo lazy-loaded com rota própria.
- **Estilos**: SCSS com variáveis globais em `_variables.scss`. Usar `ViewEncapsulation.None` com moderação.
- **Formulários**: Reactive Forms (não Template-Driven).
- **Tipagem estrita**: `strict: true` no `tsconfig.json`.
- **Lint**: ESLint + Prettier configurados, rodando no pre-commit hook (Husky + lint-staged).
