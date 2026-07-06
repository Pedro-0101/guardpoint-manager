import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon } from '@ng-icons/core';

interface NavItem {
  label: string;
  icon: string;
  route: string;
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

  private readonly allItems: NavItem[] = [
    { label: 'Dashboard', icon: 'lucideLayoutDashboard', route: '/dashboard' },
    { label: 'Mapa', icon: 'lucideMap', route: '/mapa' },
    { label: 'Turnos', icon: 'lucideClock', route: '/turnos' },
    { label: 'Alertas', icon: 'lucideBell', route: '/alertas' },
    { label: 'Postos', icon: 'lucideMapPin', route: '/postos' },
    { label: 'Escalas', icon: 'lucideCalendarDays', route: '/escalas' },
    { label: 'Usuários', icon: 'lucideUsers', route: '/usuarios' },
    { label: 'Relatórios', icon: 'lucideBarChart3', route: '/relatorios' },
    { label: 'Configurações', icon: 'lucideSettings', route: '/configuracoes' },
  ];

  navItems = this.allItems;
}
