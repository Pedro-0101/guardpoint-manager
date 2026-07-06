import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const hadRefreshToken = !!authService.getRefreshToken();

  return authService.ensureAuthenticated().pipe(
    map((ok) => {
      if (ok) {
        return true;
      }
      if (!hadRefreshToken) {
        return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
      }
      return false;
    }),
  );
};
