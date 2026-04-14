import { AsyncPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest, map, of, switchMap, take } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { TicketsService } from '../../../../core/services/tickets.service';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { VisitasService } from '../../../../core/services/visitas.service';
import { filterTicketsBySession, isPrivilegedUser } from '../../../../core/utils/visibility.util';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-visita-form-page',
  standalone: true,
  imports: [AsyncPipe, FormErrorComponent, PageHeaderComponent, ReactiveFormsModule, RouterLink],
  templateUrl: './visita-form-page.component.html',
  styleUrl: './visita-form-page.component.css'
})
export class VisitaFormPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly ticketsService = inject(TicketsService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly visitasService = inject(VisitasService);

  readonly saving = signal(false);
  readonly pageError = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    ticketId: ['', Validators.required],
    tecnicoId: ['', Validators.required],
    fechaProgramada: ['', Validators.required],
    observacion: ['']
  });

  readonly vm$ = combineLatest([
    this.authService.session$,
    this.ticketsService.getAll(),
    this.usuariosService.getTecnicosActivos(),
    this.route.paramMap,
    this.route.queryParamMap
  ]).pipe(
    switchMap(([session, tickets, tecnicos, paramMap, queryParams]) => {
      const id = Number(paramMap.get('id') ?? 0);
      const requestedTicketId = queryParams.get('ticketId') ?? '';
      const visibleTickets = filterTicketsBySession(tickets, session);

      if (!id) {
        if (requestedTicketId) {
          this.form.patchValue({ ticketId: requestedTicketId }, { emitEvent: false });
        }

        if (session?.rol === 'TECNICO') {
          this.form.patchValue({ tecnicoId: `${session.id}` }, { emitEvent: false });
        }

        return of({
          session,
          canChooseTecnico: isPrivilegedUser(session),
          tickets: visibleTickets,
          tecnicos,
          title: 'Nueva visita tecnica',
          subtitle: 'Programa una visita para un ticket habilitado.',
          submitLabel: 'Crear visita'
        });
      }

      return this.visitasService.getById(id).pipe(
        map((visita) => {
          this.form.patchValue(
            {
              ticketId: `${visita.ticketId}`,
              tecnicoId: `${visita.tecnicoId}`,
              fechaProgramada: visita.fechaProgramada,
              observacion: visita.observacion ?? ''
            },
            { emitEvent: false }
          );

          if (!isPrivilegedUser(session)) {
            this.form.controls.tecnicoId.disable({ emitEvent: false });
          }

          return {
            session,
            canChooseTecnico: isPrivilegedUser(session),
            tickets: visibleTickets,
            tecnicos,
            title: `Editar ${visita.codigo}`,
            subtitle: 'Solo las visitas programadas pueden editarse.',
            submitLabel: 'Guardar cambios'
          };
        })
      );
    })
  );

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // FIX: evitar doble submit con saving guard
    if (this.saving()) return;

    this.pageError.set(null);
    this.saving.set(true);

    const id = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    const raw = this.form.getRawValue();

    // FIX: eliminada la doble suscripción que disparaba la petición dos veces
    const request$ = id
      ? this.visitasService.update(id, {
          tecnicoId: Number(raw.tecnicoId),
          fechaProgramada: raw.fechaProgramada,
          observacion: raw.observacion.trim() || null
        })
      : this.visitasService.create({
          ticketId: Number(raw.ticketId),
          tecnicoId: Number(raw.tecnicoId),
          fechaProgramada: raw.fechaProgramada,
          observacion: raw.observacion || null
        });

    request$.pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (visita) => void this.router.navigate(['/visitas', visita.id]),
      error: (error: Error) => {
        this.pageError.set(error.message);
        this.saving.set(false);
      },
      complete: () => this.saving.set(false)
    });
  }

  error(controlName: 'ticketId' | 'tecnicoId' | 'fechaProgramada'): string | null {
    const control = this.form.controls[controlName];
    return control.touched && control.invalid ? 'Este campo es obligatorio.' : null;
  }
}
