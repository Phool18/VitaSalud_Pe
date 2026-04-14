import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BehaviorSubject, combineLatest, map, of, switchMap, take } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { TicketsService } from '../../../../core/services/tickets.service';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { VisitasService } from '../../../../core/services/visitas.service';
import { filterTicketsBySession, filterVisitasBySession, isPrivilegedUser } from '../../../../core/utils/visibility.util';
import { DataPanelComponent } from '../../../../shared/components/data-panel/data-panel.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

type VisitaMutation = ReturnType<VisitasService['start']>;

@Component({
  selector: 'app-visita-detail-page',
  standalone: true,
  imports: [
    AsyncPipe,
    DataPanelComponent,
    DatePipe,
    EmptyStateComponent,
    FormErrorComponent,
    PageHeaderComponent,
    ReactiveFormsModule,
    RouterLink,
    StatusBadgeComponent
  ],
  templateUrl: './visita-detail-page.component.html',
  styleUrl: './visita-detail-page.component.css'
})
export class VisitaDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly visitasService = inject(VisitasService);
  private readonly ticketsService = inject(TicketsService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly actionError = signal<string | null>(null);
  readonly actionSuccess = signal<string | null>(null);
  readonly busyAction = signal<string | null>(null);

  readonly finishForm = this.formBuilder.nonNullable.group({
    diagnostico: [''],
    solucionAplicada: ['', Validators.required],
    observacion: ['']
  });

  readonly vm$ = combineLatest([this.route.paramMap, this.refresh$]).pipe(
    switchMap(([params]) => {
      const id = Number(params.get('id') ?? 0);

      if (!id) {
        return of(null);
      }

      return combineLatest([
        this.authService.session$,
        this.visitasService.getAll(),
        this.ticketsService.getAll(),
        this.usuariosService.getTecnicosActivos()
      ]).pipe(
        map(([session, visitas, tickets, tecnicos]) => {
          const visibleTickets = filterTicketsBySession(tickets, session);
          const visibleVisitas = filterVisitasBySession(visitas, visibleTickets, session);
          const visita = visibleVisitas.find((item) => item.id === id) ?? null;

          if (!visita) {
            return null;
          }

          const ticket = tickets.find((item) => item.id === visita.ticketId) ?? null;
          const tecnico = tecnicos.find((item) => item.id === visita.tecnicoId) ?? null;

          this.finishForm.patchValue(
            {
              diagnostico: visita.diagnostico ?? '',
              solucionAplicada: visita.solucionAplicada ?? '',
              observacion: visita.observacion ?? ''
            },
            { emitEvent: false }
          );

          return {
            session,
            visita,
            ticket,
            tecnico,
            canEdit: isPrivilegedUser(session) && visita.estado === 'PROGRAMADA',
            canStart:
              (isPrivilegedUser(session) || session?.id === visita.tecnicoId) && visita.estado === 'PROGRAMADA',
            canFinish:
              (isPrivilegedUser(session) || session?.id === visita.tecnicoId) && visita.estado === 'EN_CURSO',
            canCancel:
              (isPrivilegedUser(session) || session?.id === visita.tecnicoId) &&
              ['PROGRAMADA', 'EN_CURSO'].includes(visita.estado)
          };
        })
      );
    })
  );

  start(id: number): void {
    this.runAction('start', () => this.visitasService.start(id), 'Visita iniciada correctamente.');
  }

  finish(id: number): void {
    if (this.finishForm.invalid) {
      this.finishForm.markAllAsTouched();
      return;
    }

    const raw = this.finishForm.getRawValue();
    this.runAction(
      'finish',
      () =>
        this.visitasService.finish(
          id,
          raw.diagnostico.trim(),
          raw.solucionAplicada.trim(),
          raw.observacion.trim() || null
        ),
      'Visita finalizada correctamente.'
    );
  }

  cancel(id: number): void {
    this.runAction('cancel', () => this.visitasService.cancel(id), 'Visita cancelada.');
  }

  finishError(): string | null {
    const control = this.finishForm.controls.solucionAplicada;
    return control.touched && control.invalid ? 'La solucion aplicada es obligatoria.' : null;
  }

  actionLoading(key: string): boolean {
    return this.busyAction() === key;
  }

  private runAction(actionKey: string, requestFactory: () => VisitaMutation, successMessage: string): void {
    this.actionError.set(null);
    this.actionSuccess.set(null);
    this.busyAction.set(actionKey);

    requestFactory()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.actionSuccess.set(successMessage);
          this.refresh$.next();
        },
        error: (error: Error) => {
          this.actionError.set(error.message);
          this.busyAction.set(null);
        },
        complete: () => this.busyAction.set(null)
      });
  }
}
