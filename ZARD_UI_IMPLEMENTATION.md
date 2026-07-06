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
| **Button** | ✅ Componente criado | `mat-button`/`mat-flat-button`/etc | 3 ✅ |
| **Dialog** | ✅ Componente + Service criados | `MatDialog` + `gp-confirm-dialog` | 3 ✅ |
| Input / Select / Form | ❌ | `mat-form-field` + `matInput` + `mat-select` | 3 |
| Tabs / Calendar / Switch / Checkbox / Pagination / Avatar / Tooltip / Breadcrumb | ❌ | Material components pontuais | 4 |
| Dropdown/Menu / Sheet / Skeleton / Card / etc | ❌ | Oportunidades futuras | 5 |

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
└── table/         — z-table (já existia, em uso em 6 list pages)
```

## 3. Para usar Zard Button (exemplos)

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

## 4. Para usar Zard Dialog

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

## 5. Migração pendente (próximos passos)

1. **Feature por feature**: migrar `mat-button` → `z-button` nos templates (prioridade: postos-list)
2. **Feature por feature**: migrar `MatDialog.open()` → `ZardDialogService.create()` 
3. **Input + Select**: criar componentes + migrar `mat-form-field`
4. **Componentes pontuais**: Tabs, Calendar, Switch, Checkbox, Pagination, Avatar, Tooltip
