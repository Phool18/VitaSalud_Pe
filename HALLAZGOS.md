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

