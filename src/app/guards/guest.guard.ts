import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthFlowService } from '../services/auth-flow.service';

export const guestGuard: CanActivateFn = async route => {
  const auth = inject(AuthFlowService);
  const router = inject(Router);
  const destination = await auth.entryDestination(route.queryParamMap.get('next'));
  return destination ? router.parseUrl(destination) : true;
};
