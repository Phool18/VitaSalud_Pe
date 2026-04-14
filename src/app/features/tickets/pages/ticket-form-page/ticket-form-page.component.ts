/**
 * @fileoverview Componente visual para la creación y edición de Tickets de Soporte.
 * Integra validaciones reactivas y lógica de dependencias en cascada (Sede -> Activo).
 */

import { AsyncPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest, map, of, switchMap, take } from 'rxjs';
import { AppSession } from '../../../../core/models/app-session.model';
import {
  TICKET_CATEGORIAS,
  TICKET_PRIORIDADES,
  TicketCategoria,
  TicketCreatePayload,
  TicketPrioridad,
  TicketUpdatePayload
} from '../../../../core/models/ticket-soporte.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ActivosService } from '../../../../core/services/activos.service';
import { SedesService } from '../../../../core/services/sedes.service';
import { TicketsService } from '../../../../core/services/tickets.service';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EnumLabelPipe } from '../../../../shared/pipes/enum-label.pipe';

@Component({
  selector: 'app-ticket-form-page',
  standalone: true,
  imports: [
    AsyncPipe,
    EnumLabelPipe,
    FormErrorComponent,
    PageHeaderComponent,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './ticket-form-page.component.html',
  styleUrl: './ticket-form-page.component.css'
})
export class TicketFormPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly sedesService = inject(SedesService);
  private readonly activosService = inject(ActivosService);
  private readonly ticketsService = inject(TicketsService);

  readonly categorias = TICKET_CATEGORIAS;
  readonly prioridades = TICKET_PRIORIDADES;
  readonly saving = signal(false);
  readonly pageError = signal<string | null>(null);
  
  /** @public {Signal<boolean>} Indica si el formulario está en modo edición (ID presente en la ruta) */
  readonly isEditMode = computed(() => Boolean(this.route.snapshot.paramMap.get('id')));

  readonly form = this.formBuilder.nonNullable.group({
    sedeId: ['', Validators.required],
    activoId: [''],
    categoria: ['', Validators.required],
    prioridad: ['', Validators.required],
    titulo: ['', [Validators.required, Validators.maxLength(120), (c: import('@angular/forms').AbstractControl) => c.value?.trim() ? null : { required: true }]],
    descripcion: ['', [Validators.required, Validators.maxLength(1200), (c: import('@angular/forms').AbstractControl) => c.value?.trim() ? null : { required: true }]]
  });

  /** * ViewModel Reactivo: Combina los datos maestros (Sedes, Activos) 
   * y configura los valores iniciales dependiendo del modo (Creación vs Edición).
   */
  readonly vm$ = combineLatest([
    this.authService.session$,
    this.sedesService.getAll(),
    this.activosService.getAll(),
    this.route.paramMap
  ]).pipe(
    switchMap(([session, sedes, activos, paramMap]) => {
      const id = Number(paramMap.get('id') ?? 0);
      const sedesVisibles = session?.rol === 'SEDE' ? sedes.filter((sede) => sede.id === session.sedeId) : sedes;
      const activosVisibles = session?.rol === 'SEDE' ? activos.filter((activo) => activo.sedeId === session.sedeId) : activos;

      if (!id) {
        this.prepareCreateForm(session);
        return of({
          session,
          sedes: sedesVisibles,
          activos: activosVisibles,
          title: 'Nuevo ticket',
          subtitle: 'Registra una incidencia respetando sede, activo y prioridad.',
          submitLabel: 'Registrar ticket'
        });
      }

      return this.ticketsService.getById(id).pipe(
        map((ticket) => {
          this.form.patchValue({
            sedeId: `${ticket.sedeId}`,
            activoId: ticket.activoId ? `${ticket.activoId}` : '',
            categoria: ticket.categoria,
            prioridad: ticket.prioridad,
            titulo: ticket.titulo,
            descripcion: ticket.descripcion
          }, { emitEvent: false });

          if (session?.rol === 'SEDE') {
            this.form.controls.sedeId.disable({ emitEvent: false });
          }

          return {
            session,
            sedes: sedesVisibles,
            activos: activosVisibles.filter((activo) => activo.sedeId === ticket.sedeId),
            title: `Editar ${ticket.codigo}`,
            subtitle: 'Actualiza solo campos permitidos antes de la resolucion.',
            submitLabel: 'Guardar cambios'
          };
        })
      );
    })
  );

  constructor() {
    // Al cambiar la sede, limpiamos el activo seleccionado
    this.form.controls.sedeId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.form.controls.activoId.setValue('');
    });
  }

  /**
   * Ejecuta el guardado del formulario, discriminando entre Creación y Edición.
   * @param {AppSession | null} session - La sesión del usuario actual.
   */
  submit(session: AppSession | null): void {
    if (!session) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.pageError.set(null);
    this.saving.set(true);

    const id = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    const raw = this.form.getRawValue();
    const basePayload = {
      sedeId: Number(raw.sedeId),
      activoId: raw.activoId ? Number(raw.activoId) : null,
      categoria: raw.categoria as TicketCategoria,
      prioridad: raw.prioridad as TicketPrioridad,
      titulo: raw.titulo,
      descripcion: raw.descripcion
    };

    const updatePayload: TicketUpdatePayload = {
      activoId: basePayload.activoId,
      categoria: basePayload.categoria,
      prioridad: basePayload.prioridad,
      titulo: basePayload.titulo,
      descripcion: basePayload.descripcion
    };

    const request$ = id
      ? this.ticketsService.update(id, updatePayload)
      : this.ticketsService.create({
          ...basePayload,
          reportadoPor: session.nombreCompleto
        } as TicketCreatePayload);

    request$.pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (ticket) => void this.router.navigate(['/tickets', ticket.id]),
      error: (error: Error) => {
        this.pageError.set(error.message);
        this.saving.set(false);
      },
      complete: () => this.saving.set(false)
    });
  }

  error(controlName: 'sedeId' | 'categoria' | 'prioridad' | 'titulo' | 'descripcion'): string | null {
    // Lógica de UI de errores omitida por brevedad
    const control = this.form.controls[controlName];
    if (!control.touched || !control.invalid) return null;
    if (control.hasError('required')) return 'Este campo es obligatorio.';
    if (control.hasError('maxlength')) return 'Se excedio el maximo de caracteres permitido.';
    return 'Revisa el valor ingresado.';
  }

  private prepareCreateForm(session: AppSession | null): void {
    if (session?.rol === 'SEDE' && session.sedeId) {
      this.form.patchValue({ sedeId: `${session.sedeId}` }, { emitEvent: false });
      this.form.controls.sedeId.disable({ emitEvent: false });
    }
  }
}
