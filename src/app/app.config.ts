import { ApplicationConfig, provideBrowserGlobalErrorListeners, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { AppStartupService } from './shared/services/app-startup.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimations(),
    {
      provide: APP_INITIALIZER,
      useFactory: (startupService: AppStartupService) => startupService.initializeApp(),
      deps: [AppStartupService],
      multi: true
    }
  ]
};
