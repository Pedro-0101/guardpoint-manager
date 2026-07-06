import { Component, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'gp-header',
  imports: [NgIcon],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  toggleSidebar = output<void>();
  logout = output<void>();

  userName = input('');
  userRole = input<string | null>(null);
  notificationCount = input(0);
}
