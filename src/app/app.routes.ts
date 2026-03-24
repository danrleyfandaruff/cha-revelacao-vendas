import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing.page').then((m) => m.LandingPage),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'configurar',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/configurar/configurar.page').then((m) => m.ConfigurarPage),
  },
  {
    path: 'pagar',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/pagar/pagar.page').then((m) => m.PagarPage),
  },
  {
    path: 'resultados',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/resultados/resultados.page').then((m) => m.ResultadosPage),
  },
  {
    path: 'cha',
    loadComponent: () =>
      import('./pages/cha/cha.page').then((m) => m.ChaPage),
  },
  {
    path: 'dicas',
    loadComponent: () =>
      import('./pages/dicas/dicas.page').then((m) => m.DicasPage),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
