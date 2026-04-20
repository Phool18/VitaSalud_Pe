# Mesa de Ayuda — VitaSalud Perú

Sistema interno para gestionar tickets de soporte TI, visitas técnicas y activos por sede.

## Cómo correr el proyecto

Necesitas dos terminales abiertas al mismo tiempo.

**Terminal 1 — API fake:**
```
npx json-server db.json --port 3000
```

**Terminal 2 — App Angular:**
```
npm start
```

Luego abre `http://localhost:4200` en el navegador.

## Usuarios de prueba

| Email | Contraseña | Rol |
|-------|-----------|-----|
| admin@vitasalud.pe | Admin123* | ADMIN |
| soporte1@vitasalud.pe | Admin123* | SOPORTE |
| tecnico1@vitasalud.pe | Admin123* | TECNICO |
| tecnico2@vitasalud.pe | Admin123* | TECNICO |
| sede.lima@vitasalud.pe | Admin123* | SEDE (Lima) |
| sede.arequipa@vitasalud.pe | Admin123* | SEDE (Arequipa) |

## Qué se corrigió

Este proyecto llegó con varios bugs intencionalmente inyectados como parte de un laboratorio. Esto es un resumen de lo que estaba roto y cómo se arregló.

### El servicio de tickets no existía realmente

El archivo `tickets.service.ts` tenía métodos completamente distintos a los que usaba la app. Ninguna pantalla de tickets cargaba. Se reescribió el servicio completo con todos los métodos que la app necesita: listar, ver detalle, crear, editar, cambiar estados, asignar técnico, resolver, cerrar y cancelar.

### Nadie podía iniciar sesión

El método de login recibía un array de usuarios de la API y lo trataba como si fuera un solo objeto. Resultado: la sesión se guardaba con todos los campos en `undefined`. Se corrigió tomando el primer elemento del array.

### Cerrar sesión no hacía nada

Al hacer logout, se borraba el localStorage pero el estado interno de la app no se actualizaba. Si el usuario volvía atrás con el botón del navegador, seguía viendo las pantallas como si estuviera logueado. Se corrigió notificando a todos los suscriptores que la sesión terminó.

### Las fechas límite de los tickets eran incorrectas

Los SLA estaban configurados con valores y nombres de prioridad incorrectos (`URGENTE` en lugar de `CRITICA`, horas mal asignadas). Un ticket CRITICA tenía 72 horas de plazo en lugar de 4. Se corrigieron los valores: CRITICA=4h, ALTA=8h, MEDIA=24h, BAJA=48h.

### La búsqueda en el listado de tickets era exacta

Si buscabas "lap" no encontrabas "Laptop". Solo funcionaba si escribías exactamente el texto completo. Se cambió a búsqueda parcial.

### Los filtros de estado y prioridad se anulaban entre sí

Si escribías algo en el buscador, el filtro de estado dejaba de funcionar. Si no había texto, el filtro de prioridad no hacía nada. Cada filtro ahora funciona de forma independiente.

### El filtro de prioridad no se guardaba en la URL

Al recargar la página con `?prioridad=ALTA` en la URL, el selector aparecía vacío. Se corrigió la rehidratación del formulario desde los query params.

### Editar un ticket borraba el activo asociado

Al guardar cualquier edición, el campo `activoId` se perdía y el ticket quedaba sin activo. Faltaba incluirlo en el payload de actualización.

### La app crasheaba antes de mostrar el login

El interceptor HTTP intentaba leer el ID del usuario antes de que hubiera sesión, causando un error de null. Se agregó una verificación antes de leer ese valor.

### Las acciones del detalle de ticket no actualizaban la pantalla

Después de asignar un técnico, la pantalla seguía mostrando el estado anterior. Los comentarios cortos tampoco aparecían en la lista hasta recargar. Ahora todas las acciones importantes refrescan la vista automáticamente.

### Se podía cerrar un ticket en el estado incorrecto

El botón "Cerrar" aparecía en tickets con estado ASIGNADO o EN_ATENCION, cuando solo debería verse en RESUELTO. Se corrigió usando la función de regla centralizada.

### Se podía crear una visita para tickets cancelados

Tanto en la UI como en el servicio, faltaba verificar que el ticket no estuviera CANCELADO o CERRADO antes de permitir crear una visita.

### La creación de visitas disparaba la petición dos veces

Cuando se llegaba al formulario desde un ticket (con `?ticketId` en la URL), la visita se creaba duplicada porque había dos `.subscribe()` al mismo observable. Se eliminó la suscripción redundante.

### Usuarios SEDE podían acceder a crear visitas por URL directa

La ruta `/visitas/new` no tenía restricción de rol, así que cualquier usuario podía acceder aunque el botón estuviera oculto en la UI. Se agregó el guard correspondiente.

### El dashboard no compilaba

El componente del dashboard era una versión antigua incompatible con el template. Se reescribió como componente standalone con los métodos que el HTML necesitaba.

### El formulario de tickets no filtraba activos por sede

El template llamaba a `filteredActivos()` pero ese método no existía en el componente. Se agregó el método que filtra los activos según la sede seleccionada en el formulario.
