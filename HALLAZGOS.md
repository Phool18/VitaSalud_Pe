# HALLAZGOS — Mesa de Ayuda VitaSalud

## H-01 · Servicio de tickets completamente falso

**Síntoma observado**  
La aplicación no podía listar, crear, editar ni cambiar el estado de ningún ticket. Todas las pantallas de tickets quedaban en blanco o con errores de consola sobre métodos inexistentes.

**Reproducción**  
Ingresar con cualquier usuario → navegar a `/tickets`. La página no carga. En consola: `this.ticketsService.getAll is not a function`.

**Regla / expectativa incumplida**  
El sistema debe poder gestionar el ciclo de vida completo de tickets (CRUD + transiciones de estado).

**Causa encontrada**  
`src/app/core/services/tickets.service.ts` contenía una implementación completamente distinta con solo dos métodos (`getTickets` y `actualizarEstado`) que no eran usados por ningún componente. Todos los componentes importaban métodos inexistentes: `getAll()`, `getById()`, `create()`, `update()`, `moveToReview()`, `assign()`, `resolve()`, `close()`, `cancel()`.

**Solución aplicada**  
Reescrito el servicio completo con todos los métodos necesarios, incluyendo validación de reglas de negocio en cada operación (estado de sede, estado de activo, transiciones de estado válidas).

---

## H-02 · Funciones faltantes en `ticket-rules.util.ts`

**Síntoma observado**  
Error de compilación: `canMoveTicketToReview`, `canAssignTicket`, `canCreateVisit`, `nextTicketStateAfterVisitStart`, `nextTicketStateAfterVisitCancellation` no estaban definidas.

**Reproducción**  
`ng build` o iniciar el servidor de desarrollo: errores de compilación TypeScript en `ticket-detail-page` y `visitas.service.ts`.

**Regla / expectativa incumplida**  
Las transiciones de estado deben ser controladas de forma centralizada por funciones de utilidad.

**Causa encontrada**  
El archivo `ticket-rules.util.ts` solo tenía una parte de las funciones. Los módulos que las importaban fallaban en compilación/runtime.

**Solución aplicada**  
Añadidas las funciones faltantes con la lógica correcta:
- `canMoveTicketToReview`: solo desde `REGISTRADO`
- `canAssignTicket`: solo desde `EN_REVISION`
- `canCreateVisit`: bloquea `CANCELADO` y `CERRADO`
- `nextTicketStateAfterVisitStart`: devuelve `EN_ATENCION`
- `nextTicketStateAfterVisitCancellation`: devuelve `ASIGNADO` si hay técnico, si no `EN_REVISION`

---

## H-03 · Login: array tratado como objeto (nadie podía autenticarse)

**Síntoma observado**  
Al iniciar sesión con credenciales correctas, el login fallaba o iniciaba sesión con datos corruptos (`nombreCompleto: undefined`, `rol: undefined`).

**Reproducción**  
Ingresar con `admin@vitasalud.pe / Admin123*` → observar la sesión guardada en localStorage: todos los campos son `undefined`.

**Regla / expectativa incumplida**  
El login debe autenticar correctamente al usuario y establecer su sesión.

**Causa encontrada**  
En `auth.service.ts`, el método `login()` hacía:
```ts
const usuario = usuarios; // usuarios es Usuario[], no Usuario
return this.toSession(usuario); // toSession espera un objeto, recibe array
```

**Solución aplicada**  
```ts
const usuario = usuarios[0]; // tomar el primer (y único) resultado
if (!usuario) throw new Error('Credenciales inválidas');
```

---

## H-04 · Zombie Session: logout no limpiaba el estado reactivo

**Síntoma observado**  
Al cerrar sesión, la URL navegaba al login pero si el usuario volvía con el botón "atrás" del navegador, seguía viendo las pantallas protegidas. Los guards seguían devolviendo `true`.

**Reproducción**  
Login → logout → presionar "atrás" en el navegador → la app no redirige al login.

**Regla / expectativa incumplida**  
Al cerrar sesión, ningún componente ni guard debe seguir viendo la sesión como activa.

**Causa encontrada**  
En `auth.service.ts`, el método `logout()` tenía comentada la línea `this.sessionSubject.next(null)`. El `BehaviorSubject` nunca emitía el cierre de sesión aunque el localStorage estuviera limpio.

**Solución aplicada**  
Descomentada y restaurada la línea `this.sessionSubject.next(null)`.

---

## H-05 · SLA: tipo incorrecto y valores de horas incorrectos

**Síntoma observado**  
Las fechas límite de atención no correspondían a la prioridad del ticket. Un ticket CRITICA tenía 72 horas de plazo en lugar de 4.

**Reproducción**  
Crear un ticket con prioridad CRITICA → observar `fechaLimiteAtencion`: está 72 horas en el futuro en lugar de 4.

**Regla / expectativa incumplida**  
- CRITICA: +4 horas
- ALTA: +8 horas  
- MEDIA: +24 horas  
- BAJA: +48 horas

**Causa encontrada**  
`sla.util.ts` tenía tres bugs:
1. Importaba el tipo `PrioridadTicket` que no existe (el correcto es `TicketPrioridad`)
2. Los valores eran `{ BAJA: 72, MEDIA: 48, ALTA: 24, URGENTE: 4 }` — la prioridad `URGENTE` no existe en el modelo, y los valores eran incorrectos
3. El algoritmo de horario laboral era innecesariamente complejo y tenía un bug (`horaDia > 9` excluía la hora 9am exacta)

**Solución aplicada**  
Corregidos los valores a `{ CRITICA: 4, ALTA: 8, MEDIA: 24, BAJA: 48 }` con tipo `TicketPrioridad`. Simplificado el cálculo a suma directa de horas (las reglas de negocio hablan de horas absolutas, no de horario laboral). Añadidas funciones `isTicketOverdue` e `isTicketOpen` que faltaban y eran usadas por `dashboard.service` y `ticket-list-page`.

---

## H-06 · NPE en interceptor cuando no hay sesión activa

**Síntoma observado**  
Al cargar la pantalla de login (antes de autenticarse), la app crasheaba con `Cannot read properties of null (reading 'id')`.

**Reproducción**  
Abrir la app sin sesión previa en localStorage → error en consola antes de renderizar el login.

**Regla / expectativa incumplida**  
La app no debe crashear si el usuario no está autenticado.

**Causa encontrada**  
`api-prefix.interceptor.ts` accedía a `authService.snapshot.id` sin verificar si `snapshot` era null. Al hacer la petición de login (cuando no hay sesión), el interceptor fallaba.

**Solución aplicada**  
```ts
if (authService.snapshot) {
  headers['X-User-Id'] = `${authService.snapshot.id}`;
}
```

---

## H-07 · Búsqueda de tickets: coincidencia exacta en lugar de parcial

**Síntoma observado**  
En el listado de tickets, buscar "Lap" no encontraba tickets cuyo título contenía "Laptop". Solo funcionaba si el término de búsqueda era idéntico al valor del campo.

**Reproducción**  
Listado de tickets → escribir "lap" en el campo de búsqueda → resultado vacío aunque existan tickets con "Laptop".

**Regla / expectativa incumplida**  
La búsqueda debe ser parcial (tipo "contains").

**Causa encontrada**  
`query-filter.util.ts` usaba `===` en lugar de `.includes()`:
```ts
return values.some((value) => toSearchValue(value) === normalizedSearch); // ❌
```

**Solución aplicada**  
```ts
return values.some((value) => toSearchValue(value).includes(normalizedSearch)); // ✅
```

---

## H-08 · Filtros de tickets: estado y prioridad mutuamente excluyentes

**Síntoma observado**  
Si se escribía en el campo de búsqueda, el filtro de estado dejaba de funcionar. Si no había texto en búsqueda, el filtro de prioridad era ignorado.

**Reproducción**  
Listado → seleccionar estado "REGISTRADO" → escribir algo en búsqueda → el filtro de estado se ignora. O: seleccionar prioridad "ALTA" sin texto en búsqueda → el filtro no filtra.

**Regla / expectativa incumplida**  
Los filtros deben funcionar de forma independiente y acumulativa.

**Causa encontrada**  
La lógica de filtrado tenía condiciones con `search` mezcladas en los filtros de estado y prioridad:
```ts
.filter((t) => !search || !estado || t.estado === estado)  // si hay search, ignora estado
.filter((t) => search || !prioridad || t.prioridad === prioridad)  // si NO hay search, ignora prioridad
```

**Solución aplicada**  
```ts
.filter((t) => !estado || t.estado === estado)
.filter((t) => !prioridad || t.prioridad === prioridad)
```

---

## H-09 · Filtro de prioridad no se rehidrataba desde query params

**Síntoma observado**  
Al compartir o recargar una URL con `?prioridad=ALTA`, el selector de prioridad aparecía vacío y los resultados no estaban filtrados.

**Reproducción**  
Seleccionar prioridad ALTA → copiar la URL → abrir en nueva pestaña → el selector no refleja el filtro.

**Regla / expectativa incumplida**  
Los query params deben restaurar el estado del formulario al cargar la página.

**Causa encontrada**  
En el constructor de `ticket-list-page`, la rehidratación del formulario hardcodeaba `prioridad: ''` ignorando el query param:
```ts
prioridad: '', // ❌ siempre vacío
```

**Solución aplicada**  
```ts
prioridad: params.get('prioridad') ?? '',
```

---

## H-10 · Edición de ticket perdía el activo asignado (data loss)

**Síntoma observado**  
Al editar un ticket que tenía un activo asociado y guardar, el campo `activoId` quedaba como `null` en el servidor.

**Reproducción**  
Crear ticket con activo → editar cualquier campo → guardar → ver detalle: el activo desapareció.

**Regla / expectativa incumplida**  
La edición debe preservar todos los campos del ticket, incluyendo el activo.

**Causa encontrada**  
En `ticket-form-page`, el `updatePayload` excluía explícitamente `activoId`:
```ts
const updatePayload: TicketUpdatePayload = {
  // activoId: basePayload.activoId, ← línea eliminada intencionalmente como bug
  categoria: basePayload.categoria, ...
};
```

**Solución aplicada**  
Restaurado `activoId` en el payload de actualización.

---

## H-11 · `canClose` incorrecto: permitía cerrar desde estados no válidos

**Síntoma observado**  
El botón "Cerrar ticket" aparecía visible en tickets con estado `ASIGNADO` o `EN_ATENCION`, cuando solo debería ser visible en `RESUELTO`.

**Reproducción**  
Login como ADMIN → ver detalle de un ticket en estado ASIGNADO → el botón "Cerrar" es visible.

**Regla / expectativa incumplida**  
Un ticket solo puede cerrarse desde `RESUELTO`.

**Causa encontrada**  
En `ticket-detail-page`, `canClose` usaba:
```ts
canClose: isPrivilegedUser(session) && ['ASIGNADO', 'EN_ATENCION', 'RESUELTO'].includes(ticket.estado)
```
En lugar de la función centralizada `canCloseTicket()`.

**Solución aplicada**  
Reemplazado por `canClose: isPrivilegedUser(session) && canCloseTicket(ticket)`.

---

## H-12 · `canCreateVisit` en detalle de ticket no validaba estado

**Síntoma observado**  
Para un ticket en estado `CANCELADO` o `CERRADO`, el botón "Nueva visita" seguía apareciendo.

**Reproducción**  
Cancelar un ticket → ver su detalle → el botón "Crear visita" sigue visible.

**Regla / expectativa incumplida**  
No se debe crear una visita para un ticket CANCELADO o CERRADO.

**Causa encontrada**  
`canCreateVisit: Boolean(session)` — solo verificaba si había sesión, no el estado del ticket.

**Solución aplicada**  
`canCreateVisit: Boolean(session) && canCreateVisit(ticket)`.

---

## H-13 · Assign no refrescaba la UI del detalle

**Síntoma observado**  
Después de asignar un técnico a un ticket, la pantalla de detalle no se actualizaba. El estado seguía mostrando `EN_REVISION` y el campo técnico seguía vacío.

**Reproducción**  
Detalle de ticket EN_REVISION → asignar técnico → guardar → la UI no cambia.

**Regla / expectativa incumplida**  
Después de cualquier acción importante, la interfaz debe reflejar el nuevo estado.

**Causa encontrada**  
`runAction()` excluía `assign` del refresh: `if (actionKey !== 'assign') this.refresh$.next()`.

**Solución aplicada**  
Cambiado a `if (actionKey !== 'comment') this.refresh$.next()` — todos los cambios de estado refrescan, solo los comentarios tienen su propio manejo.

---

## H-14 · Comentarios no refrescaban la lista inmediatamente

**Síntoma observado**  
Al agregar un comentario corto (menos de 80 caracteres), el comentario se guardaba en el servidor pero no aparecía en la lista hasta recargar la página.

**Reproducción**  
Detalle de ticket → escribir "Ok, revisado" → enviar → el comentario no aparece en la lista.

**Regla / expectativa incumplida**  
Después de agregar un comentario, la lista debe actualizarse inmediatamente.

**Causa encontrada**  
```ts
if (submittedMessage.length > 80) {
  this.refresh$.next(); // ❌ solo refresca si el mensaje es largo
}
```

**Solución aplicada**  
Eliminada la condición. `this.refresh$.next()` se llama siempre tras agregar un comentario.

---

## H-15 · Visita form: doble suscripción duplicaba la petición de creación

**Síntoma observado**  
Al crear una visita desde un ticket (con `?ticketId=X`), la visita se creaba dos veces: aparecían dos registros en el servidor.

**Reproducción**  
Detalle de ticket → "Nueva visita" (con ticketId en la URL) → completar formulario → guardar → en el listado de visitas aparecen dos visitas idénticas.

**Regla / expectativa incumplida**  
Una acción de guardado no debe ejecutarse dos veces.

**Causa encontrada**  
```ts
if (!id && this.route.snapshot.queryParamMap.has('ticketId')) {
  request$.pipe(take(1)).subscribe(); // primera suscripción ❌
}
request$.pipe(take(1)).subscribe({ ... }); // segunda suscripción ❌
```
El `request$` se ejecutaba dos veces cuando la ruta tenía `?ticketId`.

**Solución aplicada**  
Eliminada la primera suscripción redundante. Solo existe una suscripción al observable.

---

## H-16 · Ruta `visitas/new` sin roleGuard

**Síntoma observado**  
Un usuario con rol `SEDE` podía navegar directamente a `/visitas/new` y crear visitas técnicas, acción que solo debería estar disponible para `ADMIN`, `SOPORTE` y `TECNICO`.

**Reproducción**  
Login como `sede.lima@vitasalud.pe` → navegar a `/visitas/new` → el formulario carga sin restricción.

**Regla / expectativa incumplida**  
El acceso por URL manual también debe respetar restricciones por rol.

**Causa encontrada**  
En `app.routes.ts`, la ruta `visitas/new` no tenía `canActivate: [roleGuard]` ni `data: { roles: [...] }`.

**Solución aplicada**  
```ts
{
  path: 'new',
  canActivate: [roleGuard],
  data: { roles: ['ADMIN', 'SOPORTE', 'TECNICO'] },
  ...
}
```

---

## H-17 · `visitas.service.create` no validaba estado del ticket

**Síntoma observado**  
Era posible crear una visita para un ticket CANCELADO o CERRADO directamente desde la API (aunque la UI lo bloqueara en algunos casos), ya que el servicio no validaba el estado del ticket.

**Reproducción**  
Manipular el formulario o llamar directamente al servicio con un `ticketId` de ticket cancelado.

**Regla / expectativa incumplida**  
No se debe crear una visita para un ticket CANCELADO o CERRADO.

**Causa encontrada**  
`visitas.service.ts` verificaba si había visita activa pero no si el ticket estaba en estado que permita nuevas visitas.

**Solución aplicada**  
Añadida validación con `canCreateVisit(ticket)` antes de crear la visita.

---

## H-18 · `canEditTicket` excluía estado ASIGNADO (técnicos no podían editar sus tickets)

**Síntoma observado**  
Un técnico con un ticket asignado no podía editar ni añadir información al ticket.

**Regla / expectativa incumplida**  
Los técnicos deben poder operar sobre los tickets que les fueron asignados.

**Causa encontrada**  
```ts
return ['REGISTRADO', 'EN_REVISION'].includes(ticket.estado); // ❌ falta ASIGNADO
```

**Solución aplicada**  
```ts
return ['REGISTRADO', 'EN_REVISION', 'ASIGNADO'].includes(ticket.estado);
```
