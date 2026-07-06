import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';
import { featureEscalasGuard } from './core/auth/feature.guard';

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
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'mapa',
        canActivate: [roleGuard(['admin', 'supervisor'])],
        loadComponent: () =>
          import('./features/mapa/mapa.component').then(
            (m) => m.MapaComponent
          ),
      },
      {
        path: 'turnos',
        canActivate: [roleGuard(['admin', 'supervisor'])],
        loadComponent: () =>
          import('./features/turnos/turnos-list/turnos-list.component').then(
            (m) => m.TurnosListComponent
          ),
      },
      {
        path: 'turnos/:id',
        canActivate: [roleGuard(['admin', 'supervisor'])],
        loadComponent: () =>
          import('./features/turnos/turno-detail/turno-detail').then(
            (m) => m.TurnoDetailComponent
          ),
      },
      {
        path: 'postos',
        loadComponent: () =>
          import('./features/postos/postos-list.component').then(
            (m) => m.PostosListComponent
          ),
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./features/usuarios/usuarios-list.component').then(
            (m) => m.UsuariosListComponent
          ),
      },
      {
        path: 'alertas',
        canActivate: [roleGuard(['admin', 'supervisor'])],
        loadComponent: () =>
          import('./features/alertas/alertas-list/alertas-list.component').then(
            (m) => m.AlertasListComponent
          ),
      },
      {
        path: 'alertas/:id',
        canActivate: [roleGuard(['admin', 'supervisor'])],
        loadComponent: () =>
          import('./features/alertas/alerta-detail/alerta-detail').then(
            (m) => m.AlertaDetailComponent
          ),
      },
      {
        path: 'escalas',
        canActivate: [featureEscalasGuard], // TODO(F8): remover guard quando /api/escalas existir
        loadComponent: () =>
          import('./features/escalas/escalas-list.component').then(
            (m) => m.EscalasListComponent
          ),
      },
      {
        path: 'configuracoes',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () =>
          import('./features/configuracoes/config-geral.component').then(
            (m) => m.ConfigGeralComponent
          ),
      },
      {
        path: 'configuracoes/escalonamento',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () =>
          import('./features/configuracoes/config-escalonamento.component').then(
            (m) => m.ConfigEscalonamentoComponent
          ),
      },
    ],
  },
];
