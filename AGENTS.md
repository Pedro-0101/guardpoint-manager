# AGENTS.md — guardpoint-manager (Angular / TypeScript)

Instruções e boas práticas para agentes de IA e desenvolvedores trabalhando no painel gerencial Angular do GuardPoint.

---

## 1. Extensões e Ferramentas Recomendadas (VS Code)

| Extensão | Descrição |
|---|---|
| `Angular.ng-template` | Angular Language Service (oficial) |
| `esbenp.prettier-vscode` | Formatador Prettier |
| `dbaeumer.vscode-eslint` | Lint ESLint integrado |
| `bradlc.vscode-tailwindcss` | Tailwind CSS IntelliSense (se usado) |
| `EditorConfig.EditorConfig` | Consistência de formatação |
| `eamodio.gitlens` | Git avançado |
| `johnpapa.angular2` | Snippets Angular |
| `cyrilletuzi.angular-schematics` | Geradores Angular via UI |

---

## 2. Configuração do Ambiente

- **Node.js**: 20 LTS
- **npm**: 10+ ou **pnpm** 9+
- **Angular CLI**: 17+ (`npm i -g @angular/cli`)
- **TypeScript**: 5.3+
- **Angular**: 17+

```bash
npm install -g @angular/cli
ng version
```

---

## 3. Estrutura do Projeto (Standalone Components)

```
src/
├── app/
│   ├── core/                              # Singleton: serviços, guards, interceptors
│   │   ├── auth/
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.guard.ts
│   │   │   ├── role.guard.ts
│   │   │   └── jwt.interceptor.ts
│   │   ├── services/
│   │   │   ├── api.service.ts
│   │   │   ├── notification.service.ts
│   │   │   └── tenant.service.ts
│   │   ├── models/                        # Interfaces e tipos
│   │   └── websocket/
│   │       └── websocket.service.ts
│   ├── shared/                            # Componentes, directives, pipes reutilizáveis
│   │   ├── components/
│   │   │   ├── loading-spinner/
│   │   │   ├── confirm-dialog/
│   │   │   ├── status-badge/
│   │   │   └── empty-state/
│   │   ├── directives/
│   │   └── pipes/
│   ├── features/                          # Módulos lazy-loaded (um por feature)
│   │   ├── login/
│   │   ├── dashboard/
│   │   ├── mapa/
│   │   ├── turnos/
│   │   ├── escalas/
│   │   ├── alertas/
│   │   ├── postos/
│   │   ├── usuarios/
│   │   ├── configuracoes/
│   │   └── relatorios/
│   ├── layout/                            # Shell: header, sidebar, footer
│   │   ├── main-layout/
│   │   ├── sidebar/
│   │   └── header/
│   ├── app.config.ts                      # Config standalone (providers, routes)
│   └── app.routes.ts                      # Rotas raiz
├── assets/
│   ├── images/
│   └── i18n/                              # Arquivos de tradução (pt-BR)
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
├── styles/
│   ├── _variables.scss
│   ├── _mixins.scss
│   └── _typography.scss
└── index.html
```

---

## 4. Convenções de Código TypeScript / Angular

### 4.1. Nomenclatura
- **Arquivos**: `kebab-case.component.ts`, `kebab-case.service.ts`, `kebab-case.model.ts`
- **Classes**: PascalCase (`AuthService`, `DashboardComponent`)
- **Métodos e propriedades**: camelCase (`loadTurnos()`, `turnosAtivos$`)
- **Interfaces**: PascalCase, prefixo `I` é opcional e desencorajado pela style guide oficial (`Turno`, não `ITurno`)
- **Enums**: PascalCase (`TurnoStatus`, não `TURNO_STATUS`)
- **Constantes**: UPPER_SNAKE_CASE (`DEFAULT_POLL_INTERVAL`, `MAX_RETRY_COUNT`)
- **Observables**: sufixo `$` (`turnos$`, `alertas$`, `user$`)
- **Seletores de componente**: `kebab-case` com prefixo do projeto (`gp-loading-spinner`, `gp-status-badge`)

### 4.2. RxJS: Boas Práticas

#### Assinatura e Unsubscribe
```typescript
// PADRÃO: AsyncPipe no template (zero unsubscribe manual)
// template: *ngFor="let turno of turnos$ | async"

// Quando precisar de subscribe manual:
private readonly destroy$ = new Subject<void>();

ngOnInit(): void {
  this.turnosService.turnos$
    .pipe(takeUntil(this.destroy$))
    .subscribe(turnos => this.turnos = turnos);
}

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}
```

#### Operadores Essenciais
```typescript
// switchMap: cancela requisição anterior (ex: busca ao digitar)
this.searchControl.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  filter(term => term.length >= 3),
  switchMap(term => this.api.search(term))
);

// combineLatest: combina múltiplos streams
const filtro$ = combineLatest([this.filtroStatus$, this.filtroPosto$]);

// shareReplay: evita múltiplas requisições HTTP idênticas
this.turnosAtivos$ = this.api.get<Turno[]>('/turnos/ativos').pipe(shareReplay(1));

// catchError: trata erro sem quebrar o stream
this.api.getData().pipe(
  catchError(err => {
    this.notification.error('Falha ao carregar dados');
    return of([]);  // fallback
  })
);
```

#### HTTP com Estado de Carregamento
```typescript
export type Resource<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

loadTurnos(): void {
  this.state = { data: null, loading: true, error: null };
  this.api.get<Turno[]>('/turnos/ativos').pipe(
    finalize(() => this.state.loading = false)
  ).subscribe({
    next: (data) => this.state.data = data,
    error: (err) => this.state.error = err.message
  });
}
```

### 4.3. Gerenciamento de Estado

```typescript
// PADRÃO: Service como store (BehaviorSubject)
@Injectable({ providedIn: 'root' })
export class TurnosService {
  private readonly turnosSubject = new BehaviorSubject<Turno[]>([]);
  readonly turnos$ = this.turnosSubject.asObservable();

  constructor(
    private readonly api: ApiService,
    private readonly ws: WebSocketService
  ) {
    this.ws.onEvent<StatusChangePayload>('status_change').pipe(
      takeUntilDestroyed() // Angular 16+, ou use service destroy pattern
    ).subscribe(payload => this.updateStatus(payload));
  }

  loadAtivos(): void {
    this.api.get<Turno[]>('/turnos/ativos')
      .subscribe(turnos => this.turnosSubject.next(turnos));
  }

  private updateStatus(payload: StatusChangePayload): void {
    const current = this.turnosSubject.value;
    const updated = current.map(t => t.id === payload.turnoId ? { ...t, status: payload.status } : t);
    this.turnosSubject.next(updated);
  }
}
```

### 4.4. WebSocket (RxJS)
```typescript
@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private ws$: WebSocketSubject<WsEvent> | null = null;

  connect(token: string): void {
    this.ws$ = webSocket<WsEvent>({
      url: `${environment.wsUrl}?token=${token}`,
      openObserver: { next: () => console.log('[WS] Connected') },
      closeObserver: { next: () => this.scheduleReconnect() },
      deserializer: (e) => JSON.parse(e.data),
    });
  }

  onEvent<T>(type: string): Observable<T> {
    if (!this.ws$) return EMPTY;
    return this.ws$.pipe(
      filter(event => event.type === type),
      map(event => event.payload as T)
    );
  }

  private scheduleReconnect(): void {
    // Backoff: 1s, 2s, 4s, 8s, 16s (max)
    // Reconecta automaticamente
  }
}
```

### 4.5. Auth & Interceptors
```typescript
@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem('access_token');
    if (!token) return next.handle(req);

    const authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next.handle(authReq).pipe(
      catchError(err => {
        if (err instanceof HttpErrorResponse && err.status === 401) {
          return this.handleUnauthorized(req, next);
        }
        return throwError(() => err);
      })
    );
  }

  private handleUnauthorized(req: HttpRequest<unknown>, next: HttpHandler) {
    return this.authService.refreshToken().pipe(
      switchMap(newToken => next.handle(req.clone({
        setHeaders: { Authorization: `Bearer ${newToken}` }
      })))
    );
  }
}
```

### 4.6. Guards e Rotas
```typescript
// AuthGuard: verifica se usuário está autenticado
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (authService.isAuthenticated()) return true;
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

// RoleGuard: verifica permissão do cargo
export const roleGuard = (roles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    if (roles.includes(authService.getUserRole() ?? '')) return true;
    return inject(Router).createUrlTree(['/dashboard']);
  };
};

// Uso em rotas
export const routes: Routes = [
  {
    path: 'usuarios',
    loadComponent: () => import('./features/usuarios/usuarios-list/usuarios-list.component'),
    canActivate: [authGuard, roleGuard(['admin'])]
  }
];
```

### 4.7. Formulários (Reactive Forms)
```typescript
// Tipagem estrita com FormBuilder
@Component({ ... })
export class PostoFormComponent implements OnInit {
  form: FormGroup<{
    nome: FormControl<string>;
    latitude: FormControl<number>;
    longitude: FormControl<number>;
    raioM: FormControl<number>;
  }>;

  constructor(private readonly fb: NonNullableFormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      latitude: [0, [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: [0, [Validators.required, Validators.min(-180), Validators.max(180)]],
      raioM: [100, [Validators.required, Validators.min(10)]],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.postosService.criar(this.form.getRawValue()).subscribe();
  }
}
```

### 4.8. Change Detection e Performance
- Usar `OnPush` em todos os componentes (padrão gerado pelo CLI).
- `trackBy` em todos os `*ngFor` com listas grandes.
- Evitar funções complexas no template (extrair para pipe puro ou calcular no componente).
- Lazy loading de módulos/componentes para reduzir bundle inicial.
- `runOutsideAngular` para eventos de alta frequência (ex: WebSocket updates em mapa).

```html
<!-- trackBy em listas -->
<div *ngFor="let turno of turnos$ | async; trackBy: trackById">
  {{ turno.usuarioNome }}
</div>
```

```typescript
trackById(_: number, item: Turno): string {
  return item.id;
}
```

### 4.9. Segurança
- Sanitizar dados dinâmicos no template com `DomSanitizer` (evitar XSS).
- Tokens NUNCA no localStorage em produção — usar `sessionStorage` ou serviço de auth com refresh.
- Nunca expor chaves de API no frontend. Tudo passa pelo backend.
- Validar TODOS os inputs de formulário (frontend + backend).

### 4.10. Testes
- **Unitários**: Jasmine/Karma ou Jest
- **Services**: testar lógica de estado, chamadas HTTP mockadas
- **Components**: testar renderização e interações com `TestBed`
- **Guards/Interceptors**: testar cenários de autorização e refresh de token

```typescript
// Exemplo: teste de service com HttpTestingController
describe('TurnosService', () => {
  let service: TurnosService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TurnosService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(TurnosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('deve carregar turnos ativos', (done) => {
    const mockTurnos: Turno[] = [{ id: '1', status: 'em_andamento' } as Turno];

    service.loadAtivos();
    service.turnos$.pipe(skip(1)).subscribe(turnos => {
      expect(turnos).toEqual(mockTurnos);
      done();
    });

    httpMock.expectOne('/api/turnos/ativos').flush(mockTurnos);
  });
});
```

---

## 5. Comandos Úteis

```bash
# Servidor de desenvolvimento
ng serve

# Gerar componente standalone
ng generate component features/nome --standalone

# Gerar service
ng generate service core/services/nome

# Gerar guard funcional
ng generate guard core/auth/auth

# Lint
ng lint

# Testes unitários
ng test

# Testes com coverage
ng test --code-coverage

# Build de produção
ng build --configuration production

# Bundle analyzer
ng build --stats-json && npx webpack-bundle-analyzer dist/stats.json

# Formatar código
npx prettier --write "src/**/*.{ts,html,scss}"
```

---

## 6. Anti-Padrões (NÃO FAZER)

- `subscribe()` sem `unsubscribe` ou `takeUntil` (memory leaks).
- `subscribe` dentro de outro `subscribe` (usar `switchMap`/`mergeMap`/`concatMap`).
- Lógica complexa no template (mover para o componente ou pipe).
- Modificar o estado do `@Input()` diretamente (imutabilidade).
- Usar `any` como tipo. Definir interfaces ou usar `unknown` + type guards.
- Acessar o DOM diretamente com `document.getElementById` (usar `@ViewChild` ou `Renderer2`).
- Chamar HTTP no construtor de um service (usar método explícito iniciado pelo componente).
- `ngOnChanges` para lógica que pode ser resolvida com setter do `@Input`.
- Ignorar `HttpErrorResponse` (todo erro HTTP deve ter feedback visual ao usuário).
- Estilizar com `::ng-deep` (deprecated, usar ViewEncapsulation.None com moderação ou CSS custom properties).

---

## 7. Referências

- [Angular Style Guide](https://angular.io/guide/styleguide)
- [RxJS Best Practices](https://angular.io/guide/rx-library)
- [Angular Coding Style Guide (Adrian Fâciu)](https://github.com/Adrian-Faciu/angular-coding-style-guide)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [ESLint Rules for Angular](https://github.com/angular-eslint/angular-eslint)
