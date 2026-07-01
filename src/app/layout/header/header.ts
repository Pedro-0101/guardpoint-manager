import { Component, input, output } from '@angular/core';

@Component({
  selector: 'gp-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  toggleSidebar = output<void>();

  userName = input('');
  userRole = input('');
  notificationCount = input(0);
}
