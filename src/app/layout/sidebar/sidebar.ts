import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { environment } from '../../../environments/environment';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'gp-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  collapsed = input(false);
  toggleSidebar = output<void>();

  private readonly allItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Mapa', icon: 'map', route: '/mapa' },
    { label: 'Turnos', icon: 'schedule', route: '/turnos' },
    { label: 'Alertas', icon: 'notifications', route: '/alertas' },
    { label: 'Postos', icon: 'location_on', route: '/postos' },
    { label: 'Escalas', icon: 'event', route: '/escalas' },
    { label: 'Usuários', icon: 'people', route: '/usuarios' },
    { label: 'Relatórios', icon: 'assessment', route: '/relatorios' },
    { label: 'Configurações', icon: 'settings', route: '/configuracoes' },
  ];

  navItems = this.allItems.filter((item) => {
    if (item.route === '/escalas' && !environment.featureEscalas) {
      return false; // TODO(F8): reabilitar quando /api/escalas existir
    }
    return true;
  });
}
