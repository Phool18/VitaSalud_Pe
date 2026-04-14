# Lab 06 - Estabilización de frontend para Mesa de Ayuda TI

## Contexto

Has ingresado como frontend developer a **VitaSalud Perú**, una cadena de clínicas con varias sedes en el país.

La empresa ya cuenta con una aplicación Angular interna para gestionar:

- autenticación y sesión
- dashboard operativo
- tickets de soporte TI
- visitas técnicas
- activos TI
- sedes
- perfil de usuario

La aplicación **ya existe** y **ya funciona parcialmente**. No debes crear el sistema desde cero.

Sin embargo, el área usuaria, QA y el equipo técnico han reportado comportamientos inconsistentes, reglas de negocio mal aplicadas, problemas de permisos por rol, refresco visual incompleto y algunos defectos de experiencia técnica.

Tu trabajo en este laboratorio es:

- entender cómo está organizado
- reproducir problemas reales
- corregir errores
- reforzar reglas visibles del negocio
- mejorar la consistencia del frontend
- dejar la aplicación en un estado más estable

---

## Objetivo del laboratorio

Debes estabilizar la aplicación existente y corregir problemas funcionales y técnicos en los flujos más importantes del sistema.

Se espera que trabajes sobre:

- navegación y routing
- guards y visibilidad por rol
- formularios reactivos
- filtros y query params
- detalle y edición de tickets
- creación y seguimiento de visitas
- sincronización de estado visual
- manejo de errores y loading
- calidad mínima del código en puntos críticos

---

## Tecnologías y forma de trabajo

Proyecto base:

- Angular standalone
- TypeScript
- Angular Router
- HttpClient
- Reactive Forms
- RxJS
- JSON Server como fake API

No se espera que rehagas toda la arquitectura ni que conviertas el proyecto en algo completamente distinto.

Se espera que:

- entiendas primero
- reproduzcas después
- corrijas con criterio
- y refactorices solo donde aporte valor real

---

## Cómo ejecutar el proyecto

### 1. Instalar dependencias

```bash
npm install
```

### 2. Levantar la fake API

```bash
npx json-server --watch db.json --port 3000
```

La fake API quedará disponible en:

```text
http://localhost:3000
```

### 3. Levantar la aplicación Angular

```bash
ng serve -o
```

La aplicación quedará disponible en:

```text
http://localhost:4200
```

---

## Credenciales de prueba

Usa estos usuarios para probar distintos flujos y permisos.

- `admin@vitasalud.pe / Admin123*`
- `soporte1@vitasalud.pe / Admin123*`
- `tecnico1@vitasalud.pe / Admin123*`
- `tecnico2@vitasalud.pe / Admin123*`
- `sede.lima@vitasalud.pe / Admin123*`
- `sede.arequipa@vitasalud.pe / Admin123*`

Tu validación debe incluir al menos más de un rol. No pruebes todo solo con `ADMIN`.

---

## Dominios principales del sistema

La aplicación trabaja con estas entidades:

- `Sede`
- `Usuario`
- `ActivoTi`
- `TicketSoporte`
- `VisitaTecnica`
- `ComentarioTicket`

---

## Roles del sistema

### SEDE
Puede operar sobre información asociada a su sede y reportar tickets.

### SOPORTE
Puede gestionar la operación general de tickets y visitas.

### TECNICO
Puede ver y operar trabajo técnico que le haya sido asignado.

### ADMIN
Tiene visibilidad completa del sistema.

---

## Reglas de negocio esperadas

Estas reglas representan el comportamiento esperado del sistema. Si el comportamiento actual no coincide con ellas, debes considerarlo un problema a investigar.

### Tickets

- una sede `INACTIVA` o `SUSPENDIDA` no debe registrar tickets nuevos
- no se debe registrar ticket para un activo en estado `DE_BAJA` o `FUERA_SERVICIO`
- un ticket debe iniciar en estado `REGISTRADO`
- la fecha límite de atención debe calcularse automáticamente según prioridad:
  - `CRITICA`: +4 horas
  - `ALTA`: +8 horas
  - `MEDIA`: +24 horas
  - `BAJA`: +48 horas
- un ticket solo puede pasar a `EN_REVISION` desde `REGISTRADO`
- un ticket solo puede asignarse desde `EN_REVISION`
- un ticket solo debería avanzar de estado cuando corresponda según el flujo esperado
- un ticket solo debería poder cerrarse cuando realmente ya cumplió las condiciones previas del proceso

### Visitas técnicas

- no se debe crear una visita para un ticket `CANCELADO` o `CERRADO`
- solo debería existir una visita activa no cancelada por ticket cuando la regla del flujo así lo exige
- iniciar, finalizar y cerrar debe respetar el ciclo de trabajo esperado

### Permisos y visibilidad

- un usuario `SEDE` solo debería ver tickets y activos asociados a su propia sede
- un usuario `TECNICO` solo debería ver tickets o visitas que le correspondan
- la visibilidad de acciones en pantalla debería ser coherente con el rol y con el estado del registro
- el acceso por URL manual también debe respetar restricciones, no solo el listado

### Formularios y experiencia técnica

- los formularios no deberían aceptar datos vacíos reales aunque el usuario haya escrito solo espacios
- una acción de guardar no debería ejecutarse dos veces por error
- si ocurre un error, la pantalla no debería quedar en estado inconsistente o bloqueado
- después de una acción importante, la interfaz debería refrescarse correctamente

### Filtros y navegación

- los filtros principales deberían combinarse bien entre sí
- si una pantalla usa query params, al volver o refrescar la URL los filtros deberían mantenerse de forma coherente
- la navegación no debería dejar páginas en blanco ni estados difíciles de recuperar

---

## Síntomas reportados por negocio, QA y usuarios internos

La organización ha reportado comportamientos extraños en la aplicación. Esta lista no necesariamente cubre todo, pero sí representa las zonas donde deberías mirar primero.

### Sobre tickets

- algunas fechas límite no parecen coherentes con la prioridad elegida
- ciertos tickets avanzan en estados de manera dudosa
- algunas acciones siguen apareciendo visibles cuando no debería ser posible usarlas
- al volver a una lista o aplicar filtros, los resultados a veces no coinciden con lo esperado
- después de ciertas acciones, la pantalla no siempre refleja de inmediato el estado actualizado
- algunos comentarios se registran, pero el detalle no siempre se actualiza como se esperaría

### Sobre visitas

- se sospecha que ciertas visitas pueden programarse cuando ya no deberían
- en algunos casos el flujo de guardado o error deja una sensación de comportamiento inestable
- QA reportó comportamientos raros cuando la creación de una visita se hace desde un flujo contextual ligado a ticket

### Sobre permisos

- algunas restricciones por rol parecen correctas en listados, pero no necesariamente en todos los accesos directos
- ciertas rutas o acciones podrían no estar tan blindadas como aparentan

### Sobre experiencia técnica

- algunos errores se muestran de forma inconsistente
- ciertas pantallas reaccionan distinto frente a fallos de carga o guardado
- hay señales de que parte del comportamiento reactivo podría estar mal manejado
- hay código que probablemente funciona, pero no necesariamente de la forma más mantenible

Tu trabajo consiste en transformar estos síntomas en hallazgos concretos, reproducibles y corregidos.

---

## Estructura general del proyecto

El proyecto ya viene organizado por áreas. Antes de tocar código, recórrelo y entiende dónde vive cada responsabilidad.

```text
src/app/
  core/
    guards/
    interceptors/
    models/
    services/
    utils/
  shared/
    components/
    pipes/
  features/
    auth/
    dashboard/
    sedes/
    activos/
    tickets/
    visitas/
    perfil/
  app.routes.ts
```

### Pistas de exploración

No son respuestas directas, pero sí puntos razonables desde donde empezar:

- si un problema parece de acceso o navegación, revisa `app.routes.ts` y `core/guards`
- si un problema parece de datos o fake API, revisa `core/services` y `db.json`
- si un problema parece de cálculo o regla compartida, revisa `core/utils`
- si un problema ocurre solo en una pantalla concreta, empieza por el componente page correspondiente
- si la UI no se actualiza bien después de una acción, revisa cómo se refresca el estado local después del submit o cambio de estado
- si el problema combina filtros, revisa el manejo de formulario + query params + carga de datos
- si una acción no debería verse para cierto rol, revisa tanto la visibilidad en el componente como la protección por ruta

---

## Ruta sugerida de trabajo

No modifiques código al azar. Sigue una secuencia.

### Paso 1. Levanta y recorre la aplicación

Antes de corregir:

- inicia sesión con varios roles
- recorre dashboard, tickets, visitas, activos, sedes y perfil
- observa qué acciones son visibles según cada rol
- identifica pantallas clave y flujos principales

### Paso 2. Reproduce los flujos críticos

Empieza por probar:

- login con cada tipo de usuario
- listado y detalle de tickets
- creación y edición de tickets
- filtros del listado de tickets
- creación de visita desde flujos distintos
- cambio de estado de ticket
- navegación directa por URL a pantallas sensibles
- listado y detalle de visitas

### Paso 3. Contrasta comportamiento vs regla de negocio

Cada vez que veas algo raro, pregúntate:

- ¿esto contradice una regla de negocio?
- ¿esto contradice el rol del usuario?
- ¿esto contradice lo que la pantalla promete?
- ¿esto contradice la consistencia esperada del frontend?

### Paso 4. Prioriza por impacto

Corrige primero esto:

1. acceso indebido por rol o por URL
2. transiciones inválidas del flujo
3. guardados duplicados o acciones que disparan efectos incorrectos
4. errores visibles en filtros y navegación
5. refresco visual inconsistente tras acciones
6. validaciones débiles de formularios
7. deuda técnica visible y código mejorable

### Paso 5. Refactoriza solo cuando ayude

No reescribas toda la app. Refactoriza cuando te sirva para:

- centralizar reglas repetidas
- unificar criterios de visibilidad
- mejorar tipado
- limpiar suscripciones
- volver consistente el manejo de errores
- hacer más claro el flujo de una pantalla

### Paso 6. Verifica siempre después de corregir

Cada corrección importante debe ir acompañada de una validación concreta. No asumas que arreglar una cosa no rompió otra.

---

## Qué se espera de tu trabajo

Debes trabajar como un ingeniero que entra a un sistema real ya existente.

Eso implica:

- leer antes de tocar
- reproducir antes de corregir
- justificar cada cambio
- no “parchar” sin entender
- dejar evidencia clara de lo que hallaste y arreglaste

---

## Entregables

### 1. Código corregido

Debes dejar la aplicación en un estado más estable que el recibido.

### 2. Archivo `HALLAZGOS.md`

Debes documentar los problemas que encontraste.

Cada hallazgo debe incluir al menos:

- nombre breve
- síntoma observado
- forma de reproducirlo
- regla o expectativa que incumple
- causa encontrada
- solución aplicada

### 3. Archivo `DECISIONES.md`

Debes documentar decisiones técnicas relevantes.

Incluye, por ejemplo:

- por qué moviste cierta lógica
- por qué ajustaste un guard o visibilidad
- cómo mejoraste un flujo de formulario
- por qué cambiaste el manejo de estados o errores
- qué trade-offs encontraste

### 4. Evidencia de validación

Debes dejar evidencia de que probaste tus correcciones.

Puede ser mediante:

- pruebas automáticas
- una colección de requests o pasos de prueba
- capturas o notas de validación manual bien explicadas

No basta con decir “ya funciona”.

---

## Checklist mínimo

Tu entrega debe cumplir como mínimo con lo siguiente:

- el proyecto sigue levantando correctamente
- la fake API sigue funcionando con `db.json`
- el login sigue funcionando con los usuarios de prueba
- las rutas principales siguen navegables
- un usuario no puede acceder por URL a pantallas o datos que no le corresponden según su rol
- las reglas visibles del flujo de tickets y visitas están mejor alineadas con lo esperado
- las fechas límite por prioridad se calculan correctamente
- crear, editar y operar tickets ya no permite inconsistencias evidentes del flujo
- crear una visita respeta las restricciones del estado del ticket
- el guardado de formularios importantes no se dispara de forma duplicada
- los filtros principales del listado de tickets funcionan de forma coherente entre sí
- los query params relevantes se rehidratan correctamente cuando corresponde
- después de acciones importantes, la UI refresca correctamente o deja el estado local consistente
- los comentarios o acciones asociadas al detalle reflejan mejor el resultado esperado
- los errores ya no dejan pantallas claramente bloqueadas o sin salida razonable
- mejoraste al menos una parte de la calidad técnica del código
- entregaste `HALLAZGOS.md`
- entregaste `DECISIONES.md`
- dejaste evidencia de validación

---

## Criterios de evaluación

Se evaluará principalmente:

- capacidad de diagnóstico
- comprensión del flujo de negocio
- corrección funcional
- manejo de Angular y RxJS
- uso correcto de routing y guards
- calidad de formularios y validaciones
- consistencia de la UI después de acciones
- calidad técnica del refactor
- claridad de la documentación entregada

---

## Recomendaciones finales

### No empieces por donde “parece más fácil”
Empieza por donde el impacto es mayor:
- permisos
- rutas
- detalle de tickets
- creación de visitas
- transiciones de estado
- filtros principales

### Usa varios roles
Muchos problemas no se ven con `ADMIN`.

### Observa los síntomas pequeños
A veces el bug no es que “reviente”, sino que:
- se muestra una acción que no debería verse
- el filtro se pierde al volver
- el comentario no aparece de inmediato
- la UI no refresca aunque el backend sí cambió
- el botón queda bloqueado después de error

### No te quedes solo en el síntoma
Busca la causa real:
- route
- guard
- service
- util compartido
- manejo de estado local
- validación de formulario
- inconsistencia entre vista y lógica

---

## Nota final

Este laboratorio no evalúa únicamente si encontraste errores visibles.

También evalúa si puedes trabajar con criterio sobre un frontend heredado:

- entendiendo primero
- reproduciendo con método
- corrigiendo lo importante
- y dejando el sistema en mejor estado técnico que antes
