import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';
import { AppShellComponent } from './shared/components/app-shell/app-shell.component';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page.component').then((m) => m.LoginPageComponent)
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard-page/dashboard-page.component').then(
            (m) => m.DashboardPageComponent
          )
      },
      {
        path: 'tickets',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/tickets/pages/ticket-list-page/ticket-list-page.component').then(
                (m) => m.TicketListPageComponent
              )
          },
          {
            path: 'new',
            canActivate: [roleGuard],
            data: { roles: ['ADMIN', 'SOPORTE', 'SEDE'] },
            loadComponent: () =>
              import('./features/tickets/pages/ticket-form-page/ticket-form-page.component').then(
                (m) => m.TicketFormPageComponent
              )
          },
          {
            path: ':id/edit',
            canActivate: [roleGuard],
            data: { roles: ['ADMIN', 'SOPORTE'] },
            loadComponent: () =>
              import('./features/tickets/pages/ticket-form-page/ticket-form-page.component').then(
                (m) => m.TicketFormPageComponent
              )
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/tickets/pages/ticket-detail-page/ticket-detail-page.component').then(
                (m) => m.TicketDetailPageComponent
              )
          }
        ]
      },
      {
        path: 'visitas',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/visitas/pages/visita-list-page/visita-list-page.component').then(
                (m) => m.VisitaListPageComponent
              )
          },
          {
            path: 'new',
            canActivate: [roleGuard],
            data: { roles: ['ADMIN', 'SOPORTE', 'TECNICO'] },
            loadComponent: () =>
              import('./features/visitas/pages/visita-form-page/visita-form-page.component').then(
                (m) => m.VisitaFormPageComponent
              )
          },
          {
            path: ':id/edit',
            canActivate: [roleGuard],
            data: { roles: ['ADMIN', 'SOPORTE', 'TECNICO'] },
            loadComponent: () =>
              import('./features/visitas/pages/visita-form-page/visita-form-page.component').then(
                (m) => m.VisitaFormPageComponent
              )
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/visitas/pages/visita-detail-page/visita-detail-page.component').then(
                (m) => m.VisitaDetailPageComponent
              )
          }
        ]
      },
      {
        path: 'activos',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/activos/pages/activo-list-page/activo-list-page.component').then(
                (m) => m.ActivoListPageComponent
              )
          },
          {
            path: 'new',
            canActivate: [roleGuard],
            data: { roles: ['ADMIN', 'SOPORTE', 'TECNICO'] },
            loadComponent: () =>
              import('./features/activos/pages/activo-form-page/activo-form-page.component').then(
                (m) => m.ActivoFormPageComponent
              )
          },
          {
            path: ':id/edit',
            canActivate: [roleGuard],
            data: { roles: ['ADMIN', 'SOPORTE', 'TECNICO'] },
            loadComponent: () =>
              import('./features/activos/pages/activo-form-page/activo-form-page.component').then(
                (m) => m.ActivoFormPageComponent
              )
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/activos/pages/activo-detail-page/activo-detail-page.component').then(
                (m) => m.ActivoDetailPageComponent
              )
          }
        ]
      },
      {
        path: 'sedes',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'SOPORTE'] },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/sedes/pages/sede-list-page/sede-list-page.component').then(
                (m) => m.SedeListPageComponent
              )
          },
          {
            path: 'new',
            loadComponent: () =>
              import('./features/sedes/pages/sede-form-page/sede-form-page.component').then(
                (m) => m.SedeFormPageComponent
              )
          },
          {
            path: ':id/edit',
            loadComponent: () =>
              import('./features/sedes/pages/sede-form-page/sede-form-page.component').then(
                (m) => m.SedeFormPageComponent
              )
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/sedes/pages/sede-detail-page/sede-detail-page.component').then(
                (m) => m.SedeDetailPageComponent
              )
          }
        ]
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/perfil/pages/perfil-page/perfil-page.component').then((m) => m.PerfilPageComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
