import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export function roleGuard(roles: string[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const userRole = authService.userRole();
    if (userRole && roles.includes(userRole)) {
      return true;
    }

    return router.createUrlTree(['/dashboard']);
  };
}
