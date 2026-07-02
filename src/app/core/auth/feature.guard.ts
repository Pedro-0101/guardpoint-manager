import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { environment } from '../../../environments/environment';

export const featureEscalasGuard: CanActivateFn = () => {
  if (environment.featureEscalas) {
    return true;
  }
  return inject(Router).createUrlTree(['/dashboard']);
};
