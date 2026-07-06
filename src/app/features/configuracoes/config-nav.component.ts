import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'gp-config-nav',
  imports: [RouterLink, RouterLinkActive, MatTabsModule],
  templateUrl: './config-nav.component.html',
  styleUrl: './config-nav.component.scss',
})
export class ConfigNavComponent {}
