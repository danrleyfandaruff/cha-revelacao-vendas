import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'landing',
    pathMatch: 'full',
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'redefinir-senha',
    loadComponent: () =>
      import('./pages/redefinir-senha/redefinir-senha.page').then((m) => m.RedefinirSenhaPage),
  },
  {
    path: 'comece',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
    data: { defaultTab: 'cadastrar' },
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
    path: 'comece2',
    loadComponent: () =>
      import('./pages/comece/comece.page').then((m) => m.ComecePage),
  },
  {
    path: 'landing',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/landing/landing.page').then((m) => m.LandingPage),
  },
  {
    path: 'convite',
    loadComponent: () =>
      import('./pages/convite/convite.page').then((m) => m.ConvitePage),
  },
  {
    path: 'pre-natal',
    loadComponent: () =>
      import('./pages/pre-natal/pre-natal.page').then((m) => m.PreNatalPage),
  },
  {
    path: '**',
    redirectTo: 'landing',
  },
];
