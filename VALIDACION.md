# EVIDENCIA DE VALIDACIÓN — Mesa de Ayuda VitaSalud

## Metodología

Cada corrección fue validada en dos etapas:
1. **Análisis estático**: lectura del código antes y después del fix, comparación con la regla de negocio
2. **Trazado lógico manual**: simulación del flujo de datos a través de los observables y servicios corregidos

---

## VL-01 · Login funciona con todos los roles

**Credenciales probadas:**
| Usuario | Rol | Resultado esperado |
|---------|-----|--------------------|
| admin@vitasalud.pe | ADMIN | Sesión con rol ADMIN, sedeId null |
| soporte1@vitasalud.pe | SOPORTE | Sesión con rol SOPORTE |
| tecnico1@vitasalud.pe | TECNICO | Sesión con rol TECNICO |
| sede.lima@vitasalud.pe | SEDE | Sesión con rol SEDE, sedeId=1 |

**Validación del fix (H-03):**  
La API de json-server devuelve un array para `/usuarios?email=...`. El fix `usuarios[0]` toma el primer elemento. Si el array está vacío (credenciales incorrectas), `usuario` es `undefined` y se lanza el error correcto.

---

## VL-02 · SLA calculado correctamente para cada prioridad

**Caso de prueba:** Ticket creado el `2026-04-10T10:00:00`

| Prioridad | Horas SLA | Fecha límite esperada |
|-----------|-----------|----------------------|
| CRITICA | 4 | 2026-04-10T14:00:00 |
| ALTA | 8 | 2026-04-10T18:00:00 |
| MEDIA | 24 | 2026-04-11T10:00:00 |
| BAJA | 48 | 2026-04-12T10:00:00 |

**Verificación del código:**
```ts
// SLA_HORAS = { CRITICA: 4, ALTA: 8, MEDIA: 24, BAJA: 48 }
const limite = new Date('2026-04-10T10:00:00');
limite.setHours(limite.getHours() + 4); // → 2026-04-10T14:00:00 ✅
```

---

## VL-03 · Reglas de creación de tickets

**Caso: Sede inactiva**
- `db.json` tiene sede id=3 (Trujillo) con estado `INACTIVA` y sede id=4 (Cusco) con estado `SUSPENDIDA`
- `canCreateTicketForSede(sede)` devuelve `false` si `sede.estado !== 'ACTIVA'`
- `tickets.service.create()` hace `getById('sedes', sedeId)` y verifica con esa función → lanza error ✅

**Caso: Activo DE_BAJA**
- `canCreateTicketForActivo(activo)` devuelve `false` si `estado === 'DE_BAJA' || estado === 'FUERA_SERVICIO'`
- Verificado en el servicio antes de proceder con la creación ✅

**Caso: Ticket inicia en REGISTRADO**
```ts
this.api.create('tickets', {
  ...payload,
  estado: 'REGISTRADO', // ✅ siempre
  tecnicoAsignadoId: null,
  ...
})
```

---

## VL-04 · Transiciones de estado de ticket

**Flujo esperado:** REGISTRADO → EN_REVISION → ASIGNADO → EN_ATENCION → RESUELTO → CERRADO

| Transición | Función guardiana | Verificación |
|------------|-------------------|--------------|
| → EN_REVISION | `canMoveTicketToReview` | solo desde REGISTRADO ✅ |
| → ASIGNADO | `canAssignTicket` | solo desde EN_REVISION ✅ |
| → RESUELTO | `canResolveTicket` | desde ASIGNADO/EN_ATENCION + visita FINALIZADA ✅ |
| → CERRADO | `canCloseTicket` | solo desde RESUELTO ✅ |
| → CANCELADO | `canCancelTicket` | desde cualquier estado excepto CERRADO/CANCELADO ✅ |

**Validación de `canClose` (H-11):**  
Antes: `['ASIGNADO', 'EN_ATENCION', 'RESUELTO'].includes(ticket.estado)` → permitía cerrar desde ASIGNADO ❌  
Después: `canCloseTicket(ticket)` que verifica `ticket.estado === 'RESUELTO'` ✅

---

## VL-05 · Visitas técnicas: restricciones

**Caso: Crear visita para ticket CANCELADO**
```ts
// visitas.service.ts create()
if (!canCreateVisit(ticket)) {
  return throwError(() => new Error('No se puede crear una visita para un ticket cancelado o cerrado.'));
}
// canCreateVisit: !['CANCELADO', 'CERRADO'].includes(ticket.estado)
```
✅

**Caso: Doble visita activa**
```ts
if (hasActiveVisit(visitas)) {
  return throwError(() => new Error('Ya existe una visita activa...'));
}
// hasActiveVisit: some visita con estado PROGRAMADA o EN_CURSO
```
✅

**Caso: Doble suscripción (H-15)**  
Código anterior tenía dos `.subscribe()` para la misma `request$`. Eliminada la primera suscripción redundante. Ahora hay exactamente un `.pipe(take(1), takeUntilDestroyed(...)).subscribe({...})`. ✅

---

## VL-06 · Permisos por rol

**Rutas protegidas verificadas en `app.routes.ts`:**

| Ruta | Roles permitidos | Antes | Después |
|------|-----------------|-------|---------|
| `/tickets/new` | ADMIN, SOPORTE, SEDE | ✅ correcto | ✅ |
| `/tickets/:id/edit` | ADMIN, SOPORTE | ✅ correcto | ✅ |
| `/visitas/new` | — (sin guard) | ❌ cualquiera | ✅ ADMIN, SOPORTE, TECNICO |
| `/visitas/:id/edit` | ADMIN, SOPORTE, TECNICO | ✅ correcto | ✅ |
| `/sedes/*` | ADMIN, SOPORTE | ✅ correcto | ✅ |

**Visibilidad de acciones en detalle de ticket:**

| Acción | Condición anterior | Condición corregida |
|--------|--------------------|---------------------|
| Crear visita | `Boolean(session)` | `Boolean(session) && canCreateVisit(ticket)` |
| Cerrar ticket | estado en [ASIGNADO, EN_ATENCION, RESUELTO] | `canCloseTicket(ticket)` → solo RESUELTO |
| Editar ticket | [REGISTRADO, EN_REVISION] | [REGISTRADO, EN_REVISION, ASIGNADO] |

---

## VL-07 · Filtros del listado de tickets

**Caso: Buscar + filtrar por estado simultáneamente**

Antes:
```ts
.filter((t) => !search || !estado || t.estado === estado) // si hay search → ignora estado ❌
```

Después:
```ts
.filter((t) => !estado || t.estado === estado)   // independiente ✅
.filter((t) => !prioridad || t.prioridad === prioridad) // independiente ✅
```

**Rehidratación de query params verificada:**
```ts
// constructor — antes:
prioridad: '',  // ❌ siempre vacío
// después:
prioridad: params.get('prioridad') ?? '',  // ✅ desde URL
```

---

## VL-08 · Logout limpia la sesión reactiva

**Código antes:**
```ts
logout(): void {
  localStorage.removeItem(STORAGE_KEY);
  // this.sessionSubject.next(null); ← comentado = zombie session
}
```

**Código después:**
```ts
logout(): void {
  localStorage.removeItem(STORAGE_KEY);
  this.sessionSubject.next(null); // ✅ notifica a todos los suscriptores
}
```

El `authGuard` suscribe a `session$` indirectamente a través de `authService.snapshot`. Con el Subject emitiendo null, en el próximo ciclo de navegación el guard redirigirá al login. ✅

---

## VL-09 · Interceptor no crashea sin sesión

**Código antes:**
```ts
setHeaders: { 'X-User-Id': `${authService.snapshot.id}` } // NPE si snapshot=null
```

**Código después:**
```ts
const headers: Record<string, string> = {};
if (authService.snapshot) {
  headers['X-User-Id'] = `${authService.snapshot.id}`;
}
```

La petición de login se hace antes de tener sesión → el interceptor ya no falla. ✅

---

## VL-10 · Data loss en edición de ticket

**Código antes:**
```ts
const updatePayload: TicketUpdatePayload = {
  // activoId ausente
  categoria, prioridad, titulo, descripcion
};
```

**Código después:**
```ts
const updatePayload: TicketUpdatePayload = {
  activoId: basePayload.activoId,  // ✅ incluido
  categoria, prioridad, titulo, descripcion
};
```

El tipo `TicketUpdatePayload` en el modelo incluye `activoId: number | null`, por lo que el campo es parte del contrato. ✅

---

## Resumen de correcciones aplicadas

| # | Archivo modificado | Bug corregido |
|---|-------------------|---------------|
| 1 | `core/services/tickets.service.ts` | Servicio completamente reescrito |
| 2 | `core/utils/ticket-rules.util.ts` | Funciones faltantes añadidas |
| 3 | `core/utils/sla.util.ts` | Tipo, valores SLA y funciones corregidos |
| 4 | `core/services/auth.service.ts` | Login array bug + zombie session |
| 5 | `core/interceptors/api-prefix.interceptor.ts` | NPE con snapshot null |
| 6 | `core/utils/query-filter.util.ts` | Búsqueda parcial con `.includes()` |
| 7 | `features/tickets/pages/ticket-list-page/ticket-list-page.component.ts` | Filtros independientes + rehidratación prioridad |
| 8 | `features/tickets/pages/ticket-form-page/ticket-form-page.component.ts` | activoId en update + validación trim |
| 9 | `features/tickets/pages/ticket-detail-page/ticket-detail-page.component.ts` | canClose, canCreateVisit, assign refresh, comment refresh |
| 10 | `features/visitas/pages/visita-form-page/visita-form-page.component.ts` | Doble suscripción, alert→pageError, saving guard |
| 11 | `core/services/visitas.service.ts` | Validación estado ticket al crear visita |
| 12 | `app.routes.ts` | roleGuard en visitas/new |
