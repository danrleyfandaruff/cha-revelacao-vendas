import { APP_INITIALIZER, ApplicationConfig, isDevMode } from '@angular/core';
import { AuthFlowService } from './services/auth-flow.service';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: APP_INITIALIZER, multi: true, deps: [AuthFlowService], useFactory: (auth: AuthFlowService) => () => auth.initialize() },
    provideIonicAngular({ mode: 'ios', animated: true }),
    provideRouter(routes),
    provideServiceWorker('ngsw-worker.js', {
        enabled: !isDevMode(),
        registrationStrategy: 'registerWhenStable:30000'
    })
],
};
