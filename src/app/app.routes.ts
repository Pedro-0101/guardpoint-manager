import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        data: { breadcrumb: 'Dashboard' },
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'mapa',
        data: { breadcrumb: 'Mapa' },
        canActivate: [roleGuard(['admin', 'supervisor'])],
        loadComponent: () =>
          import('./features/mapa/mapa.component').then(
            (m) => m.MapaComponent
          ),
      },
      {
        path: 'turnos',
        data: { breadcrumb: 'Turnos' },
        canActivate: [roleGuard(['admin', 'supervisor'])],
        loadComponent: () =>
          import('./features/turnos/turnos-list/turnos-list.component').then(
            (m) => m.TurnosListComponent
          ),
      },
      {
        path: 'turnos/:id',
        data: { breadcrumb: 'Detalhe' },
        canActivate: [roleGuard(['admin', 'supervisor'])],
        loadComponent: () =>
          import('./features/turnos/turno-detail/turno-detail').then(
            (m) => m.TurnoDetailComponent
          ),
      },
      {
        path: 'postos',
        data: { breadcrumb: 'Postos' },
        loadComponent: () =>
          import('./features/postos/postos-list.component').then(
            (m) => m.PostosListComponent
          ),
      },
      {
        path: 'usuarios',
        data: { breadcrumb: 'Usuários' },
        loadComponent: () =>
          import('./features/usuarios/usuarios-list.component').then(
            (m) => m.UsuariosListComponent
          ),
      },
      {
        path: 'alertas',
        data: { breadcrumb: 'Alertas' },
        canActivate: [roleGuard(['admin', 'supervisor'])],
        loadComponent: () =>
          import('./features/alertas/alertas-list/alertas-list.component').then(
            (m) => m.AlertasListComponent
          ),
      },
      {
        path: 'alertas/:id',
        data: { breadcrumb: 'Detalhe' },
        canActivate: [roleGuard(['admin', 'supervisor'])],
        loadComponent: () =>
          import('./features/alertas/alerta-detail/alerta-detail').then(
            (m) => m.AlertaDetailComponent
          ),
      },
      {
        path: 'escalas',
        data: { breadcrumb: 'Escalas' },
        canActivate: [roleGuard(['admin', 'supervisor'])],
        loadComponent: () =>
          import('./features/escalas/escalas-list.component').then(
            (m) => m.EscalasListComponent
          ),
      },
      {
        path: 'relatorios',
        data: { breadcrumb: 'Relatórios' },
        canActivate: [roleGuard(['admin', 'supervisor'])],
        loadComponent: () =>
          import('./features/relatorios/relatorios.component').then(
            (m) => m.RelatoriosComponent
          ),
      },
      {
        path: 'configuracoes',
        data: { breadcrumb: 'Configurações' },
        canActivate: [roleGuard(['admin'])],
        loadComponent: () =>
          import('./features/configuracoes/config-geral.component').then(
            (m) => m.ConfigGeralComponent
          ),
      },
      {
        path: 'configuracoes/escalonamento',
        data: { breadcrumb: 'Escalonamento' },
        canActivate: [roleGuard(['admin'])],
        loadComponent: () =>
          import('./features/configuracoes/config-escalonamento.component').then(
            (m) => m.ConfigEscalonamentoComponent
          ),
      },
    ],
  },
];
