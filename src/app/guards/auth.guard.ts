import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  const session = await supabase.getSession();
  if (session) return true;

  router.navigate(['/login'], {
    queryParams: {
      mode: 'entrar',
      next: state.url || '/configurar',
    },
    replaceUrl: true,
  });
  return false;
};
