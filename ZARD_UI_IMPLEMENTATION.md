# Zard UI — Status de Implementação no GuardPoint Manager

**Biblioteca**: [zardui](https://github.com/zard-ui/zardui) — componentes Angular baseados em shadcn/ui, TailwindCSS v4, Signals.

---

## 1. Status por Componente

| Componente | Status | Substitui | Fase |
|---|---|---|---|
| **Table** | ✅ Implementado e em uso | Todas as 6 list pages já usam `<table z-table>` | 2 ✅ |
| **Toast** | ✅ Implementado | `NotificationService` → `ngx-sonner` | 1 ✅ |
| **Badge** | ✅ Implementado | `gp-status-badge` (delegate interno) | 1 ✅ |
| **Loader** | ✅ Implementado | `gp-loading-spinner` (delegate interno) | 1 ✅ |
| **Empty** | ✅ Implementado | `gp-empty-state` (delegate interno) | 1 ✅ |
| **Alert** | ✅ Implementado | Banners do login → `<z-alert>` | 1 ✅ |
| **Button** | ✅ Implementado e em uso | `mat-button`/`mat-flat-button`/etc | 3 ✅ |
| **Dialog** | ✅ Implementado e em uso | `MatDialog` + `gp-confirm-dialog` | 3 ✅ |
| **Card** | ✅ Implementado | `mat-card` | 3 ✅ |
| **Input** | ✅ Implementado (`z-input` directive) | `mat-form-field` + `matInput` | 3 ✅ |
| **Select** | ✅ Implementado (`z-select`) | `mat-select` | 3 ✅ |
| **Checkbox** | ✅ Implementado (`z-checkbox`) | `mat-checkbox` | 3 ✅ |
| **Switch** | ✅ Implementado (`z-switch`) | `mat-slide-toggle` | 4 ✅ |
| **Pagination** | ✅ Implementado (`z-pagination`) | Paginação manual | 4 ✅ |
| **Tooltip** | ✅ Implementado (`z-tooltip` directive) | `matTooltip` | 4 ✅ |
| **Progress** | ✅ Implementado (`z-progress`) | `mat-progress-bar` | 4 ✅ |
| Tabs / Calendar / Avatar / Breadcrumb | ❌ | Material components pontuais | 4 |
| Dropdown/Menu / Sheet / Skeleton | ❌ | Oportunidades futuras | 5 |

---

## 2. Componentes Zard criados

```
src/app/shared/components/
├── toast/         — ngx-sonner wrapper com z-toaster
├── badge/         — z-badge (default|secondary|destructive|outline, default|square|pill)
├── loader/        — z-loader (sm|default|lg)
├── empty/         — z-empty (icon, title, description)
├── alert/         — z-alert (default|destructive, icon+title+description)
├── button/        — z-button (default|destructive|outline|secondary|ghost|link, sm|default|lg|icon)
├── dialog/        — z-dialog (service + component + ref, suporta conteúdo como componente)
├── table/         — z-table (já existia, em uso em 6 list pages)
├── card/          — z-card (default|interactive)
├── input/         — input[z-input], textarea[z-input], select[z-input]
├── select/        — z-select + z-select-item
├── checkbox/      — z-checkbox (ControlValueAccessor)
├── switch/        — z-switch (ControlValueAccessor, default|sm)
├── pagination/    — z-pagination (páginas visíveis, pageChange)
├── tooltip/       — [z-tooltip] directive (top|bottom|left|right)
├── progress/      — z-progress (0-100)
├── status-badge/  — gp-status-badge (legacy, mantido)
├── confirm-dialog/— gp-confirm-dialog (legado, mantido)
├── loading-spinner/— gp-loading-spinner (legacy, mantido)
└── empty-state/   — gp-empty-state (legacy, mantido)
```

## 3. Migração concluída

### Features sem nenhum Material Angular

| Feature | Status |
|---|---|
| **alertas** | ✅ 100% Zard (z-button, ZardDialog, z-table) |
| **configuracoes** | ✅ 100% Zard (z-button) |
| **dashboard** | ✅ 100% Zard (sem Material) |
| **escalas** | ✅ 100% Zard (z-button, ZardDialog, z-table) |
| **login** | ✅ 100% Zard (migrado em Jul/2026) |
| **mapa** | ✅ 100% Zard (sem Material) |
| **postos** | ✅ 100% Zard (z-button, ZardDialog, z-table) |
| **relatorios** | ✅ 100% Zard (z-button) |
| **turnos** | ✅ 100% Zard (z-button, ZardDialog, z-table) |
| **usuarios** | ✅ 100% Zard (z-button, ZardDialog, z-table) |

## 4. Para usar Zard Button (exemplos)

```html
<!-- Substitui mat-flat-button color="primary" -->
<button z-button (click)="onClick()">Salvar</button>

<!-- Substitui mat-stroked-button -->
<button z-button zType="outline">Cancelar</button>

<!-- Substitui mat-icon-button -->
<button z-button zType="ghost" zSize="icon">
  <mat-icon>edit</mat-icon>
</button>

<!-- Destrutivo (substitui color="warn") -->
<button z-button zType="destructive">Excluir</button>
```

## 5. Para usar Zard Dialog

```typescript
// Injetar o serviço
private readonly dialog = inject(ZardDialogService);

// Abrir diálogo
this.dialog.create({
  zTitle: 'Confirmar exclusão',
  zDescription: 'Tem certeza que deseja prosseguir?',
  zOkText: 'Confirmar',
  zCancelText: 'Cancelar',
  zOkDestructive: true,
  zOnOk: () => this.excluir(),
});
```

## 6. Próximos passos

1. **Remover dependência @angular/material** — verificar se ainda há imports residuais
2. **Migrar gp-confirm-dialog** para usar ZardDialogService internamente
3. **Componentes pendentes**: Tabs, Calendar, Avatar, Breadcrumb (quando necessário)
4. **Remover componentes legacy**: status-badge, loading-spinner, empty-state (substituídos pelos Zard equivalentes)
