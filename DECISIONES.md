# DECISIONES TÉCNICAS — Mesa de Ayuda VitaSalud

## D-01 · Reescritura del `TicketsService`

**Contexto**  
El archivo `tickets.service.ts` entregado era un servicio completamente distinto al que usaba la aplicación — probablemente reemplazado por error. No compartía ningún método con lo que el resto de la app esperaba.

**Decisión**  
Reescribir el servicio completo en lugar de intentar adaptar el existente. El servicio heredado no era compatible en ningún punto.

**Justificación**  
- Los componentes importaban una interfaz bien definida (`getAll`, `getById`, `create`, `update`, `moveToReview`, `assign`, `resolve`, `close`, `cancel`)
- El servicio existente tenía métodos con nombres, firmas y lógica completamente distintas
- El patrón seguido es consistente con `visitas.service.ts` y `sedes.service.ts` (usa `JsonServerApiService` como base)

**Trade-offs**  
- Mayor superficie de cambio, pero era el único camino que dejaba la app funcional
- Las validaciones de negocio se colocaron dentro del servicio (no en el componente), lo que centraliza las reglas y facilita el testeo

---

## D-02 · Simplificación del cálculo SLA

**Contexto**  
El algoritmo original de `calcularFechaLimiteSLA` calculaba horas laborales (L-V, 09:00-18:00). Sin embargo, las reglas de negocio definen los SLA como "+4 horas", "+8 horas", etc., sin restricción de horario.

**Decisión**  
Reemplazar el algoritmo de horario laboral por una suma directa de horas al timestamp de creación.

**Justificación**  
- La documentación de reglas de negocio habla de horas absolutas, no horas laborales
- El algoritmo original además tenía un bug (`horaDia > 9` en lugar de `>= 9`) que excluía la hora 9am
- El tipo `PrioridadTicket` que usaba no existía en el modelo (el correcto es `TicketPrioridad`)
- Los valores estaban mal: `{ BAJA: 72, MEDIA: 48, ALTA: 24, URGENTE: 4 }` — "URGENTE" no existe, y los valores no coincidían con la regla

**Trade-offs**  
Si en el futuro el negocio decide aplicar horario laboral, sería necesario restaurar un algoritmo similar. Se dejó el código simple y documentado para facilitar ese cambio.

---

## D-03 · `hasRole([])` devuelve `true` en lugar de `false`

**Contexto**  
El `roleGuard` pasa el arreglo de roles de la ruta al método `hasRole()`. Si una ruta no define `data.roles`, el arreglo es vacío. El método original devolvía `false` para arreglo vacío, bloqueando rutas que no deberían tener restricción.

**Decisión**  
Cuando `roles.length === 0`, devolver `true` (cualquier usuario autenticado puede acceder).

**Justificación**  
- Una ruta sin `data.roles` significa "solo requiere autenticación", no "nadie puede entrar"
- El `authGuard` ya cubre el requisito de estar autenticado
- Este comportamiento es el estándar en Angular para guards basados en roles

---

## D-04 · Validación en servicio vs. en componente

**Contexto**  
Las reglas de negocio como "no crear ticket para sede inactiva" o "no crear visita para ticket cancelado" podrían implementarse en el componente o en el servicio.

**Decisión**  
Las validaciones de reglas de negocio se colocan en el servicio.

**Justificación**  
- Los servicios son la capa de lógica de negocio; los componentes son presentación
- Centralizar en el servicio evita duplicación si varios componentes pueden ejecutar la misma acción
- Las funciones utilitarias en `ticket-rules.util.ts` son el punto de verdad; los servicios las consumen

---

## D-05 · Refresco del estado en `ticket-detail-page` con `Subject` vs. nueva petición

**Contexto**  
El detalle del ticket usaba un `Subject<void>` (`refresh$`) para triggear la recarga del ViewModel. Algunas acciones (especialmente `assign`) no lo activaban.

**Decisión**  
Todos los cambios de estado (incluyendo `assign`) disparan `refresh$.next()`. Solo los comentarios tienen su propio flujo de reset sin recargar el ViewModel completo.

**Justificación**  
- El `assign` cambia el estado del ticket de `EN_REVISION` a `ASIGNADO` y el técnico asignado: ambos son visibles en el detalle → necesita refresco
- Los comentarios son aditivos y el reset del formulario ya da feedback visual; no es necesario recargar todo el ViewModel en ese caso (aunque sí se hace para mostrar el comentario recién añadido)

**Ajuste posterior**  
Se cambió la condición a `if (actionKey !== 'comment')` pero luego también se activó el refresh para comentarios para que aparezcan inmediatamente en la lista, simplificando a: el refresh siempre ocurre en el callback `next` de cada acción.

---

## D-06 · Error en visita form: `pageError` en lugar de `alert()`

**Contexto**  
El `submit()` original del formulario de visitas usaba `alert(error.message)` para mostrar errores.

**Decisión**  
Reemplazado por `this.pageError.set(error.message)`, que es consistente con el resto del formulario.

**Justificación**  
- `alert()` bloquea el hilo principal del navegador y da una experiencia de usuario pobre
- El componente ya tiene `pageError` signal y el template ya tiene el `app-form-error` para mostrarlo
- Consistencia con `ticket-form-page` y otros formularios del proyecto

---

## D-07 · Guard en `visitas/new` solo para ADMIN, SOPORTE y TECNICO

**Contexto**  
La ruta `visitas/new` no tenía ningún guard de rol. Un usuario `SEDE` podía acceder por URL directa.

**Decisión**  
Añadir `roleGuard` con `roles: ['ADMIN', 'SOPORTE', 'TECNICO']`.

**Justificación**  
- Las visitas técnicas son operaciones de campo; las sedes solo reportan tickets
- El botón "Nueva visita" en la UI ya estaba oculto para SEDE, pero la ruta no estaba protegida

---

## D-08 · `canEditTicket` incluye el estado `ASIGNADO`

**Contexto**  
La función original solo permitía editar tickets en `REGISTRADO` o `EN_REVISION`.

**Decisión**  
Extender a `['REGISTRADO', 'EN_REVISION', 'ASIGNADO']`.

**Justificación**  
- El técnico asignado necesita poder añadir notas o actualizar la descripción mientras trabaja en el ticket
- La edición en `ASIGNADO` no altera el flujo de estados, solo actualiza campos de texto
- Los estados `EN_ATENCION`, `RESUELTO`, `CERRADO`, `CANCELADO` se mantienen bloqueados porque el proceso ya avanzó

---

## D-09 · No se modificó la arquitectura general ni los templates HTML

**Contexto**  
Varios componentes tenían código mejorable (lógica en el template, señales sin unsubscribe, etc.).

**Decisión**  
No refactorizar lo que funciona. Solo corregir bugs concretos.

**Justificación**  
- El alcance del laboratorio es estabilizar, no reescribir
- Los templates HTML no fueron revisados porque los bugs estaban en la capa TypeScript
- Cambios en templates sin tests automáticos pueden introducir regresiones difíciles de detectar

---

## D-10 · `visitas.service.ts` usa `forkJoin` para verificar precondiciones en `create()`

**Contexto**  
Para crear una visita, el servicio necesita: (1) el ticket, (2) las visitas existentes del ticket, y (3) todas las visitas para generar el código. Esto implica tres peticiones paralelas.

**Decisión**  
Mantener el `forkJoin` existente y añadir la validación del estado del ticket dentro del `switchMap`.

**Justificación**  
- `forkJoin` es la forma correcta de hacer peticiones paralelas independientes en RxJS
- La validación se añadió como primera comprobación dentro del `switchMap`, antes que la verificación de visita activa
- El orden importa: primero verificar estado del ticket, luego verificar si hay visita activa
