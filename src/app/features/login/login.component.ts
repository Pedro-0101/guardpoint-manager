import { Component } from '@angular/core';
import { EmptyState } from '../../shared/components/empty-state/empty-state';

@Component({
  selector: 'gp-login',
  imports: [EmptyState],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {}
