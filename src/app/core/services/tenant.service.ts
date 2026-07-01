import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly authService = inject(AuthService);

  readonly empresaId = this.authService.empresaId;
}
