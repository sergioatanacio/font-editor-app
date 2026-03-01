# Playbook Extra Detallado

## Implementacion de Event Bus + Strategy + Vertical Slices en `crear_tipografias`

## 1) Objetivo

Implementar de forma incremental tres elementos compatibles entre si:

1. `Event Bus` de dominio para reducir acoplamiento entre modulos.
2. `Strategy` para encapsular reglas variables (presets y readiness).
3. `Vertical Slices` para organizar el codigo por feature end-to-end.

Condicion clave: no romper comportamiento actual ni la FSM existente durante la migracion.

---

## 2) Estado actual (baseline real del repo)

Hoy el sistema esta organizado por capas dentro de `src/context/font-design`:

1. `domain/`
2. `application/`
3. `infrastructure/`
4. `presentation/`

Puntos importantes:

1. Hay eventos de FSM en fachadas (`ImportFacade`, `ExportFacade`), no hay bus pub/sub compartido.
2. Hay logica variable por preset, pero implementada con funciones y condicionales (`characterCatalog.ts`), no como Strategy formal por interfaz.
3. La composicion principal esta centralizada en `src/context/font-design/main.ts`.

---

## 3) Arquitectura objetivo (sin romper v1)

Se adopta una arquitectura hibrida:

1. Vertical slices como estructura principal.
2. Contratos compartidos minimos en `shared/` (eventos, resultado, errores).
3. Event bus como puerto compartido inyectado.
4. Strategies por slice donde exista variabilidad de reglas.

### 3.1 Estructura objetivo

```text
src/context/font-design/
  shared/
    errors/
    result/
    events/
      DomainEvent.ts
      DomainEventBus.ts
      DomainEventHandler.ts
      EventNames.ts
  slices/
    project/
      domain/
      application/
      infrastructure/
      presentation/
    import/
      domain/
      application/
      infrastructure/
      presentation/
    export/
      domain/
      application/
      infrastructure/
      presentation/
    typeface/
      domain/
      application/
      infrastructure/
      presentation/
    template/
      domain/
      application/
      infrastructure/
      presentation/
  infrastructure/
    events/
      NoOpDomainEventBus.ts
      InMemoryDomainEventBus.ts
      EventHandlerRegistry.ts
  main.ts
```

Nota: en etapa de transicion pueden coexistir rutas antiguas (`application`, `domain`, etc.) con `slices/`.

---

## 4) Principios de diseno y limites

1. Los casos de uso no llaman directamente otros slices.
2. La comunicacion cruzada entre slices se hace por:
   1. contratos (puertos) o
   2. eventos de dominio.
3. Las estrategias se usan solo para variacion real de reglas.
4. La FSM permanece como orquestador de estado de UI.
5. El bus inicia con implementacion `NoOp` y luego `InMemory`.
6. Nada de side effects fuera de handlers o adaptadores.

---

## 5) Diseno de Event Bus

### 5.1 Contratos base

Crear en `shared/events/`:

```ts
// DomainEvent.ts
export interface DomainEvent<TPayload = unknown> {
  name: string;
  occurredAt: string; // ISO
  version: number;
  aggregateId?: string;
  payload: TPayload;
  metadata?: Readonly<Record<string, unknown>>;
}
```

```ts
// DomainEventHandler.ts
import type { DomainEvent } from "./DomainEvent";

export interface DomainEventHandler<TEvent extends DomainEvent = DomainEvent> {
  canHandle(event: DomainEvent): event is TEvent;
  handle(event: TEvent): Promise<void>;
}
```

```ts
// DomainEventBus.ts
import type { DomainEvent } from "./DomainEvent";
import type { DomainEventHandler } from "./DomainEventHandler";

export interface DomainEventBus {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: readonly DomainEvent[]): Promise<void>;
  subscribe(handler: DomainEventHandler): () => void;
}
```

### 5.2 Implementaciones

1. `NoOpDomainEventBus`:
   1. `publish` no hace nada.
   2. `publishAll` no hace nada.
   3. `subscribe` devuelve un `unsubscribe` vacio.

2. `InMemoryDomainEventBus`:
   1. guarda handlers en memoria.
   2. invoca handlers secuencialmente para mantener orden.
   3. captura errores de handlers y los reporta por logger.
   4. no revienta el caso de uso por falla de un handler no critico.

### 5.3 Politica de entrega v1

1. Semantica `at-most-once` in-process.
2. Sin persistencia ni outbox en v1.
3. Solo para desacople interno de la aplicacion.

---

## 6) Catalogo inicial de eventos

Definir nombres en `shared/events/EventNames.ts`:

1. `ProjectCreated`
2. `ProjectLoaded`
3. `ProjectSavedToFile`
4. `ImportPreviewGenerated`
5. `ImportCommitted`
6. `ExportReadinessEvaluated`
7. `TypefaceExported`

### 6.1 Contratos de payload (v1)

1. `ImportPreviewGenerated`:
   1. `projectId: string`
   2. `previewId: string`
   3. `isBlocking: boolean`
   4. `summary: { total, ok, warning, error, empty, blockingCount }`
   5. `expiresAt: string`

2. `ImportCommitted`:
   1. `projectId: string`
   2. `previewId: string`
   3. `importedCount: number`

3. `TypefaceExported`:
   1. `projectId: string`
   2. `filename: string`
   3. `byteLength: number`
   4. `warningCodes: string[]`

### 6.2 Productores y consumidores

1. Productor `ImportFacade` o caso de uso de commit:
   1. publica `ImportPreviewGenerated` y `ImportCommitted`.
2. Productor `ExportFacade` o caso de uso de export:
   1. publica `ExportReadinessEvaluated` y `TypefaceExported`.
3. Consumidores iniciales (infra):
   1. logger estructurado.
   2. metricas basicas (contador por evento).

---

## 7) Diseno de Strategy

### 7.1 Variaciones actuales candidatas

1. Seleccion de caracteres plantilla (`latam-alnum`, `code-dev`, `latam-plus-code`).
2. Reglas de readiness para export (`minimal-latin`, `freeform`).

### 7.2 Contratos Strategy

#### 7.2.1 TemplateCharacterStrategy

```ts
export interface TemplateCharacterStrategy {
  preset: "latam-alnum" | "code-dev" | "latam-plus-code";
  buildCharacters(selection: { includeLatamAlnum: boolean; includeCodeChars: boolean }): CharacterSpec[];
}
```

Implementaciones:

1. `LatamAlnumCharacterStrategy`
2. `CodeDevCharacterStrategy`
3. `LatamPlusCodeCharacterStrategy`

Selector:

1. `TemplateCharacterStrategySelector` recibe preset y devuelve estrategia.

#### 7.2.2 ExportReadinessStrategy

```ts
export interface ExportReadinessStrategy {
  preset: "minimal-latin" | "freeform";
  validate(typeface: Typeface): {
    errors: Array<{ code: string; message: string; glyphId?: string }>;
    warnings: Array<{ code: string; message: string; glyphId?: string }>;
  };
}
```

Implementaciones:

1. `MinimalLatinReadinessStrategy`
2. `FreeformReadinessStrategy`

Selector:

1. `ExportReadinessStrategySelector`

### 7.3 Regla de adopcion

1. Primero envolver logica existente en estrategias.
2. Luego mover condicionales a selector unico.
3. Eliminar `if` dispersos en casos de uso/fachadas.

---

## 8) Vertical Slices propuestos para este repo

## 8.1 Slice `project`

Responsabilidades:

1. Crear proyecto.
2. Guardar/cargar snapshot.
3. Gestion metadata/metrics generales de fuente.

Entradas actuales a migrar:

1. `CreateTypefaceUseCase`
2. `UpdateTypefaceMetadataUseCase`
3. `UpdateTypefaceMetricsUseCase`
4. `SaveProjectToFileUseCase`
5. `LoadProjectFromFileUseCase`
6. `ProjectFacade`

## 8.2 Slice `import`

Responsabilidades:

1. Preview de import SVG.
2. Commit de preview.
3. FSM de import.

Entradas actuales:

1. `PreviewTemplateImportUseCase`
2. `CommitTemplateImportPreviewUseCase`
3. `ImportFacade`
4. `application/fsm/import-preview/*`

## 8.3 Slice `export`

Responsabilidades:

1. Validar readiness.
2. Exportar TTF.
3. FSM de export.

Entradas actuales:

1. `ValidateTypefaceForExportUseCase`
2. `ExportTypefaceToTtfUseCase`
3. `ExportFacade`
4. `application/fsm/export-ttf/*`

## 8.4 Slice `template`

Responsabilidades:

1. Generar SVG plantilla.
2. Resolver set de caracteres por estrategia.

Entradas actuales:

1. `GenerateTemplateSvgUseCase`
2. `characterCatalog.ts` (parte de builder de caracteres)
3. `TemplateFacade`

## 8.5 Slice `typeface`

Responsabilidades:

1. Editar glifos.
2. Asignar unicode.
3. Ajustar metricas de glifo.

Entradas actuales:

1. `AssignUnicodeToGlyphUseCase`
2. `ReplaceGlyphOutlineUseCase`
3. `UpdateGlyphMetricsUseCase`
4. `TypefaceFacade`

---

## 9) Plan de migracion detallado por fases

## Fase 0 - Baseline de seguridad

Objetivo: congelar comportamiento antes de tocar arquitectura.

Tareas:

1. Correr test suite actual y guardar baseline.
2. Agregar smoke tests de:
   1. crear proyecto
   2. preview+commit import
   3. validate+export
3. Capturar salida de warning/error esperada.

Done:

1. baseline reproducible en CI local.

## Fase 1 - Introducir Event Bus sin impacto funcional

Objetivo: agregar contratos y `NoOpDomainEventBus` sin side effects.

Tareas:

1. Crear `shared/events/*` con contratos.
2. Crear `infrastructure/events/NoOpDomainEventBus.ts`.
3. Inyectar `DomainEventBus` en:
   1. `ImportFacade`
   2. `ExportFacade`
   3. (opcional) casos de uso clave.
4. Publicar eventos solo en puntos finales exitosos.
5. Mantener default en `main.ts`: `new NoOpDomainEventBus()`.

Done:

1. Todos los tests pasan igual.
2. Sin cambio de comportamiento observable.

## Fase 2 - InMemory bus y handlers basicos

Objetivo: desacoplar observabilidad y efectos secundarios no criticos.

Tareas:

1. Crear `InMemoryDomainEventBus`.
2. Crear handlers:
   1. `ImportMetricsHandler`
   2. `ExportMetricsHandler`
3. Registrar handlers en `main.ts` cuando no sea test.
4. Validar que falla de handler no rompe caso de uso.

Done:

1. Handlers ejecutan en orden.
2. Casos de uso siguen siendo deterministas.

## Fase 3 - Extraer Strategy de template chars

Objetivo: remover condicionales de preset desde `characterCatalog.ts`.

Tareas:

1. Crear estrategias de caracteres en `slices/template/domain/strategies`.
2. Crear selector de estrategia.
3. Adaptar `GenerateTemplateSvgUseCase` para usar selector.
4. Mantener funciones antiguas como wrapper temporal con deprecacion.

Done:

1. Mismo output de glyph set para cada preset.
2. Tests equivalentes pasan.

## Fase 4 - Extraer Strategy de export readiness

Objetivo: encapsular validaciones por preset.

Tareas:

1. Crear `ExportReadinessStrategy` + dos implementaciones.
2. Modificar `ValidateTypefaceForExportUseCase` para delegar.
3. Eliminar `requiredGlyphNamesForExportPreset` como punto central unico o dejarlo interno por estrategia.

Done:

1. Reportes de readiness iguales al baseline.
2. Nuevos tests por estrategia.

## Fase 5 - Introducir vertical slice `export` completo

Objetivo: mover export end-to-end a `slices/export`.

Tareas:

1. Crear nueva ruta:
   1. `slices/export/domain`
   2. `slices/export/application`
   3. `slices/export/infrastructure`
   4. `slices/export/presentation`
2. Mover:
   1. `ValidateTypefaceForExportUseCase`
   2. `ExportTypefaceToTtfUseCase`
   3. `ExportFacade`
   4. `fsm/export-ttf`
3. Mantener re-exports compatibles desde rutas viejas.
4. Ajustar imports en `main.ts`.

Done:

1. Export funciona igual.
2. Sin imports rotos en build.

## Fase 6 - Introducir vertical slice `import` completo

Objetivo: mover import end-to-end a `slices/import`.

Tareas:

1. Mover use cases + facade + fsm import.
2. Publicar eventos `ImportPreviewGenerated` e `ImportCommitted`.
3. Ajustar pantalla y controller sin cambiar UI behavior.

Done:

1. Flujo preview->commit estable.
2. TTL y bloqueos intactos.

## Fase 7 - Introducir slices `project`, `template`, `typeface`

Objetivo: completar reorganizacion por features.

Tareas:

1. Migrar casos de uso/facades restantes.
2. Dejar `shared/` solo para contratos transversales.
3. Reducir capa antigua a re-export temporal.

Done:

1. Codigo principal ya no depende de carpetas por capa antigua.

## Fase 8 - Limpieza final

Objetivo: remover deuda de compatibilidad.

Tareas:

1. Borrar wrappers deprecados.
2. Borrar rutas legacy si no se usan.
3. Actualizar docs de arquitectura.

Done:

1. Estructura final limpia y consistente.

---

## 10) Cambios concretos por archivo (primer incremento util)

Primer incremento recomendado: introducir bus + strategy de export readiness sin mover carpetas aun.

Archivos nuevos:

1. `src/context/font-design/shared/events/DomainEvent.ts`
2. `src/context/font-design/shared/events/DomainEventBus.ts`
3. `src/context/font-design/shared/events/DomainEventHandler.ts`
4. `src/context/font-design/shared/events/EventNames.ts`
5. `src/context/font-design/infrastructure/events/NoOpDomainEventBus.ts`
6. `src/context/font-design/infrastructure/events/InMemoryDomainEventBus.ts`
7. `src/context/font-design/application/strategies/export/ExportReadinessStrategy.ts`
8. `src/context/font-design/application/strategies/export/MinimalLatinReadinessStrategy.ts`
9. `src/context/font-design/application/strategies/export/FreeformReadinessStrategy.ts`
10. `src/context/font-design/application/strategies/export/ExportReadinessStrategySelector.ts`

Archivos editados:

1. `src/context/font-design/main.ts`
2. `src/context/font-design/application/facades/ImportFacade.ts`
3. `src/context/font-design/application/facades/ExportFacade.ts`
4. `src/context/font-design/application/use-cases/ValidateTypefaceForExportUseCase.ts`
5. `src/context/font-design/application/use-cases/index.ts`
6. `src/context/font-design/infrastructure/index.ts`
7. `src/context/font-design/shared/index.ts`

---

## 11) Testing plan detallado

## 11.1 Unit tests Event Bus

1. `NoOpDomainEventBus` no falla y no ejecuta handlers.
2. `InMemoryDomainEventBus`:
   1. ejecuta handlers compatibles.
   2. respeta orden de registro.
   3. `unsubscribe` funciona.
   4. si un handler falla, el bus sigue con el resto.

## 11.2 Unit tests Strategy

1. `MinimalLatinReadinessStrategy`:
   1. detecta faltantes requeridos.
   2. marca outlines vacios.
2. `FreeformReadinessStrategy`:
   1. exige solo `.notdef`.
   2. warnings de baja densidad cuando aplique.

## 11.3 Integration tests slices

1. Import facade publica `ImportPreviewGenerated`.
2. Commit publica `ImportCommitted`.
3. Export exitoso publica `TypefaceExported`.
4. Sin subscribers, comportamiento funcional es identico.

## 11.4 Regression tests

1. End-to-end actual (`EndToEndFlow.test.ts`) sin cambios de resultado.
2. Snapshots de proyecto no cambian schema sin migracion explicita.

---

## 12) Riesgos y mitigaciones

1. Riesgo: duplicar reglas entre legacy y strategy.
   1. Mitigacion: usar wrappers temporales y pruebas de equivalencia 1:1.

2. Riesgo: sobreuso de eventos para flujo critico.
   1. Mitigacion: dejar comandos sincronos para flujo core; eventos solo para desacople lateral.

3. Riesgo: migracion de imports rompe build.
   1. Mitigacion: re-exports temporales + migracion por slice, no big-bang.

4. Riesgo: event storm con payload inconsistente.
   1. Mitigacion: `EventNames.ts` y tipos de payload centralizados.

---

## 13) Definition of Done global

1. Event bus integrado y usado en hitos de import/export.
2. Strategies activas para presets/readiness con selector central.
3. Al menos slices `import` y `export` migrados end-to-end.
4. `main.ts` con wiring claro por slice.
5. Cobertura de pruebas nueva para bus+strategy.
6. Cero regresiones funcionales en flujos existentes.

---

## 14) Secuencia recomendada de ejecucion (orden exacto)

1. Fase 0 (baseline).
2. Fase 1 (bus no-op).
3. Fase 4 (strategy export readiness).
4. Fase 3 (strategy template chars).
5. Fase 5 (slice export).
6. Fase 6 (slice import).
7. Fase 7 (resto de slices).
8. Fase 8 (limpieza final).

Razon del orden:

1. Entrega valor temprano (desacople) sin reorganizar carpetas de golpe.
2. Minimiza riesgo porque estrategia se valida antes de mover estructura.
3. Migra primero slices mas autocontenidos (`export`, `import`).

---

## 15) Criterios de revision tecnica por PR

Checklist por PR:

1. Explica que acoplamiento elimina.
2. Muestra contratos nuevos y ownership del slice.
3. Incluye pruebas unitarias e integracion relevantes.
4. No mezcla refactor estructural con cambios de logica de negocio en el mismo PR si no es necesario.
5. Conserva compatibilidad de API interna mientras dure la migracion.

Tamanio recomendado:

1. PR de infraestructura base (bus/contratos): pequeno.
2. PR por strategy: pequeno-mediano.
3. PR por slice: mediano.

---

## 16) Resultado esperado

Al finalizar, el sistema tendra:

1. Menor acoplamiento entre flujos y componentes.
2. Reglas de negocio variables encapsuladas y testeables.
3. Estructura por feature mas mantenible para evolucion futura.
4. Camino limpio para agregar eventos reales (telemetria, auditoria, sincronizacion) sin invadir casos de uso.

