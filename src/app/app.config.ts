import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { NgxEchartsModule } from 'ngx-echarts';
import * as echarts from 'echarts'; // ✅ required for forRoot

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(withFetch()),
    importProvidersFrom(
      NgxEchartsModule.forRoot({ echarts }) // ✅ Register ngx-echarts globally
    )
  ]
};
