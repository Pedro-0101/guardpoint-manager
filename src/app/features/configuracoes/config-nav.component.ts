import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'gp-config-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './config-nav.component.html',
  styleUrl: './config-nav.component.scss',
})
export class ConfigNavComponent {}
