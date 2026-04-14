import { AsyncPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EnumLabelPipe } from '../../pipes/enum-label.pipe';

interface NavigationItem {
  label: string;
  path: string;
  roles: string[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [AsyncPipe, EnumLabelPipe, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css'
})
export class AppShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly session$ = this.authService.session$;

  readonly navigation = computed<NavigationItem[]>(() => {
    const role = this.authService.snapshot?.rol;

    const items: NavigationItem[] = [
      { label: 'Dashboard', path: '/dashboard', roles: ['ADMIN', 'SOPORTE', 'TECNICO', 'SEDE'] },
      { label: 'Tickets', path: '/tickets', roles: ['ADMIN', 'SOPORTE', 'TECNICO', 'SEDE'] },
      { label: 'Visitas', path: '/visitas', roles: ['ADMIN', 'SOPORTE', 'TECNICO', 'SEDE'] },
      { label: 'Activos TI', path: '/activos', roles: ['ADMIN', 'SOPORTE', 'TECNICO', 'SEDE'] },
      { label: 'Sedes', path: '/sedes', roles: ['ADMIN', 'SOPORTE'] },
      { label: 'Perfil', path: '/perfil', roles: ['ADMIN', 'SOPORTE', 'TECNICO', 'SEDE'] }
    ];

    return items.filter((item) => item.roles.includes(role ?? ''));
  });

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }
}
