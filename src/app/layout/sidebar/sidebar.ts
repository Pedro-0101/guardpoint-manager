import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { AuthService } from '../../core/auth/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: 'gp-sidebar',
  imports: [RouterLink, RouterLinkActive, NgIcon],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  collapsed = input(false);
  toggleSidebar = output<void>();

  private readonly authService = inject(AuthService);

  // Itens sem `roles` são visíveis a qualquer usuário autenticado,
  // espelhando as rotas sem roleGuard em app.routes.ts.
  private readonly allItems: NavItem[] = [
    { label: 'Dashboard', icon: 'lucideLayoutDashboard', route: '/dashboard' },
    { label: 'Mapa', icon: 'lucideMap', route: '/mapa', roles: ['admin', 'supervisor'] },
    { label: 'Turnos', icon: 'lucideClock', route: '/turnos', roles: ['admin', 'supervisor'] },
    { label: 'Alertas', icon: 'lucideBell', route: '/alertas', roles: ['admin', 'supervisor'] },
    { label: 'Postos', icon: 'lucideMapPin', route: '/postos' },
    { label: 'Escalas', icon: 'lucideCalendarDays', route: '/escalas', roles: ['admin', 'supervisor'] },
    { label: 'Substituições', icon: 'lucideArrowRightLeft', route: '/substituicoes', roles: ['admin'] },
    { label: 'Usuários', icon: 'lucideUsers', route: '/usuarios' },
    { label: 'Relatórios', icon: 'lucideBarChart3', route: '/relatorios', roles: ['admin', 'supervisor'] },
    { label: 'Configurações', icon: 'lucideSettings', route: '/configuracoes', roles: ['admin'] },
  ];

  readonly navItems = computed(() => {
    const role = this.authService.userRole();
    return this.allItems.filter(
      (item) => !item.roles || (role !== null && item.roles.includes(role))
    );
  });
}
