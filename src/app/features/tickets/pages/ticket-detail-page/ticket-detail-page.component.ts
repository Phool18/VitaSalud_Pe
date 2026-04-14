import { AsyncPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, combineLatest, distinctUntilChanged, map, of, startWith, Subject, switchMap, take } from 'rxjs';
import { ActivoTi } from '../../../../core/models/activo-ti.model';
import { AppSession } from '../../../../core/models/app-session.model';
import { ComentarioTicket } from '../../../../core/models/comentario-ticket.model';
import { Sede } from '../../../../core/models/sede.model';
import { TicketSoporte } from '../../../../core/models/ticket-soporte.model';
import { Usuario } from '../../../../core/models/usuario.model';
import { VisitaTecnica } from '../../../../core/models/visita-tecnica.model';
import { ActivosService } from '../../../../core/services/activos.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ComentariosService } from '../../../../core/services/comentarios.service';
import { SedesService } from '../../../../core/services/sedes.service';
import { TicketsService } from '../../../../core/services/tickets.service';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { VisitasService } from '../../../../core/services/visitas.service';
import {
  canAssignTicket,
  canCancelTicket,
  canCloseTicket,
  canCreateVisit,
  canEditTicket,
  canMoveTicketToReview,
  canResolveTicket
} from '../../../../core/utils/ticket-rules.util';
import { filterTicketsBySession, isPrivilegedUser } from '../../../../core/utils/visibility.util';
import { DataPanelComponent } from '../../../../shared/components/data-panel/data-panel.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { EnumLabelPipe } from '../../../../shared/pipes/enum-label.pipe';

type TicketMutation = ReturnType<TicketsService['moveToReview']>;
type DetailState = 'loading' | 'ready' | 'not-found' | 'error';

interface TicketDetailViewModel {
  state: DetailState;
  message?: string;
  session?: AppSession | null;
  ticket?: TicketSoporte;
  sede?: Sede | null;
  activo?: ActivoTi | null;
  tecnico?: Usuario | null;
  tecnicos: Usuario[];
  visitas: VisitaTecnica[];
  comentarios: ComentarioTicket[];
  canReview: boolean;
  canAssign: boolean;
  canResolve: boolean;
  canClose: boolean;
  canCancel: boolean;
  canEdit: boolean;
  canCreateVisit: boolean;
}

@Component({
  selector: 'app-ticket-detail-page',
  standalone: true,
  imports: [
    AsyncPipe,
    DataPanelComponent,
    DatePipe,
    EmptyStateComponent,
    EnumLabelPipe,
    FormErrorComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    ReactiveFormsModule,
    RouterLink,
    StatusBadgeComponent
  ],
  templateUrl: './ticket-detail-page.component.html',
  styleUrl: './ticket-detail-page.component.css'
})
export class TicketDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly activosService = inject(ActivosService);
  private readonly authService = inject(AuthService);
  private readonly ticketsService = inject(TicketsService);
  private readonly visitasService = inject(VisitasService);
  private readonly comentariosService = inject(ComentariosService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly sedesService = inject(SedesService);
  private readonly refresh$ = new Subject<void>();

  readonly actionError = signal<string | null>(null);
  readonly actionSuccess = signal<string | null>(null);
  readonly busyAction = signal<string | null>(null);

  readonly assignForm = this.formBuilder.nonNullable.group({
    tecnicoId: ['', Validators.required]
  });

  readonly resolveForm = this.formBuilder.nonNullable.group({
    solucion: ['', Validators.required]
  });

  readonly commentForm = this.formBuilder.nonNullable.group({
    mensaje: ['', [Validators.required, Validators.maxLength(400)]]
  });

  readonly vm$ = combineLatest([
    this.route.paramMap.pipe(
      map((params) => Number(params.get('id'))),
      distinctUntilChanged()
    ),
    this.refresh$.pipe(startWith(undefined))
  ]).pipe(switchMap(([id]) => this.loadViewModel(id)));

  moveToReview(ticketId: number): void {
    this.runAction('review', () => this.ticketsService.moveToReview(ticketId), 'Ticket enviado a revision.');
  }

  closeTicket(ticketId: number): void {
    this.runAction('close', () => this.ticketsService.close(ticketId), 'Ticket cerrado correctamente.');
  }

  cancelTicket(ticketId: number): void {
    this.runAction('cancel', () => this.ticketsService.cancel(ticketId), 'Ticket cancelado.');
  }

  assign(ticketId: number): void {
    if (this.assignForm.invalid) {
      this.assignForm.markAllAsTouched();
      return;
    }

    const tecnicoId = Number(this.assignForm.getRawValue().tecnicoId);
    this.runAction('assign', () => this.ticketsService.assign(ticketId, tecnicoId), 'Ticket asignado correctamente.');
  }

  resolve(ticketId: number): void {
    if (this.resolveForm.invalid) {
      this.resolveForm.markAllAsTouched();
      return;
    }

    const solucion = this.resolveForm.getRawValue().solucion;
    this.runAction('resolve', () => this.ticketsService.resolve(ticketId, solucion), 'Ticket resuelto correctamente.');
  }

  addComment(ticketId: number): void {
    const session = this.authService.snapshot;

    if (!session || this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }

    this.actionError.set(null);
    this.actionSuccess.set(null);
    this.busyAction.set('comment');
    const submittedMessage = this.commentForm.getRawValue().mensaje.trim();

    this.comentariosService
      .create({
        ticketId,
        autorUsuarioId: session.id,
        autorNombre: session.nombreCompleto,
        autorRol: session.rol,
        mensaje: submittedMessage
      })
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.commentForm.reset({ mensaje: '' });
          this.actionSuccess.set('Comentario agregado.');
          this.refresh$.next();
        },
        error: (error: Error) => {
          this.actionError.set(error.message);
          this.busyAction.set(null);
        },
        complete: () => this.busyAction.set(null)
      });
  }

  actionLoading(key: string): boolean {
    return this.busyAction() === key;
  }

  commentError(): string | null {
    const control = this.commentForm.controls.mensaje;

    if (!control.touched || !control.invalid) {
      return null;
    }

    if (control.hasError('required')) {
      return 'El comentario es obligatorio.';
    }

    return 'El comentario excede el largo permitido.';
  }

  resolveError(): string | null {
    const control = this.resolveForm.controls.solucion;
    return control.touched && control.invalid ? 'La solucion es obligatoria.' : null;
  }

  assignError(): string | null {
    const control = this.assignForm.controls.tecnicoId;
    return control.touched && control.invalid ? 'Selecciona un tecnico.' : null;
  }

  private runAction(actionKey: string, requestFactory: () => TicketMutation, successMessage: string): void {
    this.actionError.set(null);
    this.actionSuccess.set(null);
    this.busyAction.set(actionKey);

    requestFactory()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.actionSuccess.set(successMessage);
          if (actionKey !== 'comment') {
            this.refresh$.next();
          }
        },
        error: (error: Error) => {
          this.actionError.set(error.message);
          this.busyAction.set(null);
        },
        complete: () => this.busyAction.set(null)
      });
  }

  private loadViewModel(id: number) {
    if (!Number.isInteger(id) || id <= 0) {
      return of(this.createState('not-found', 'El identificador del ticket no es valido.'));
    }

    return this.buildReadyState(id).pipe(startWith(this.createState('loading')));
  }

  private buildReadyState(id: number) {
    return this.authService.session$.pipe(
      take(1),
      switchMap((session) =>
        this.ticketsService.getById(id).pipe(
          map((ticket) => {
            const visibleTicket =
              session?.rol === 'TECNICO'
                ? filterTicketsBySession([ticket], session)[0] ?? null
                : ticket;

            if (!visibleTicket) {
              throw new HttpErrorResponse({ status: 404, statusText: 'Ticket no accesible' });
            }

            return { session, ticket: visibleTicket };
          }),
          switchMap(({ session, ticket }) =>
            combineLatest([
              this.safeSede(ticket.sedeId),
              this.safeActivo(ticket.activoId),
              this.safeTecnico(ticket.tecnicoAsignadoId),
              this.usuariosService.getTecnicosActivos().pipe(catchError(() => of([]))),
              this.visitasService.getByTicket(ticket.id).pipe(catchError(() => of([]))),
              this.comentariosService.getByTicket(ticket.id).pipe(catchError(() => of([])))
            ]).pipe(
              map(([sede, activo, tecnico, tecnicos, visitas, comentarios]): TicketDetailViewModel => {
                this.assignForm.patchValue(
                  {
                    tecnicoId: ticket.tecnicoAsignadoId ? `${ticket.tecnicoAsignadoId}` : ''
                  },
                  { emitEvent: false }
                );

                return {
                  state: 'ready',
                  session,
                  ticket,
                  sede,
                  activo,
                  tecnico,
                  tecnicos,
                  visitas,
                  comentarios,
                  canReview: isPrivilegedUser(session) && canMoveTicketToReview(ticket),
                  canAssign: isPrivilegedUser(session) && canAssignTicket(ticket),
                  canResolve: isPrivilegedUser(session) && canResolveTicket(ticket, visitas),
                  canClose: isPrivilegedUser(session) && canCloseTicket(ticket),
                  canCancel: isPrivilegedUser(session) && canCancelTicket(ticket),
                  canEdit: session?.rol !== 'TECNICO' && canEditTicket(ticket),
                  canCreateVisit: Boolean(session) && canCreateVisit(ticket)
                };
              })
            )
          ),
          catchError((error: unknown) => {
            if (error instanceof HttpErrorResponse && error.status === 404) {
              return of(this.createState('not-found', 'No se encontro el ticket solicitado o no tienes acceso a este caso.'));
            }

            return of(this.createState('error', 'No se pudo cargar el ticket en este momento. Intenta nuevamente.'));
          })
        )
      )
    );
  }

  private safeSede(sedeId: number) {
    return this.sedesService.getById(sedeId).pipe(catchError(() => of(null)));
  }

  private safeActivo(activoId: number | null) {
    if (!activoId) {
      return of(null);
    }

    return this.activosService.getById(activoId).pipe(catchError(() => of(null)));
  }

  private safeTecnico(tecnicoId: number | null) {
    if (!tecnicoId) {
      return of(null);
    }

    return this.usuariosService.getById(tecnicoId).pipe(catchError(() => of(null)));
  }

  private createState(state: DetailState, message?: string): TicketDetailViewModel {
    return {
      state,
      message,
      session: null,
      ticket: undefined,
      sede: null,
      activo: null,
      tecnico: null,
      tecnicos: [],
      visitas: [],
      comentarios: [],
      canReview: false,
      canAssign: false,
      canResolve: false,
      canClose: false,
      canCancel: false,
      canEdit: false,
      canCreateVisit: false
    };
  }
}
