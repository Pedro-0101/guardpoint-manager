import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';
import { authGuard } from './core/auth/auth.guard';
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
        path: 'escalas',
        canActivate: [featureEscalasGuard], // TODO(F8): remover guard quando /api/escalas existir
        loadComponent: () =>
          import('./features/escalas/escalas-list.component').then(
            (m) => m.EscalasListComponent
          ),
      },
    ],
  },
];
