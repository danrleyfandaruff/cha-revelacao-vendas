import { bootstrapApplication } from '@angular/platform-browser';
import { inject } from '@vercel/analytics';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// Initialize Vercel Web Analytics
inject({ mode: 'production' });

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err)
);
