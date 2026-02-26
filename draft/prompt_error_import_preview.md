# Diagnostico Extendido para IA Externa: Error `IMPORT_BLOCKED_BY_VALIDATION` en `PrevisualizacionImportacion`

Necesito que analices un bug de una app web TypeScript/Vite para editor tipografico. Debes trabajar solo con la informacion de este prompt (no asumas contexto adicional). Tu objetivo es encontrar la causa raiz de por qué, aun despues de fixes recientes, el usuario sigue viendo:

`IMPORT_BLOCKED_BY_VALIDATION: No se puede aplicar un preview bloqueante.`

en la pantalla `PrevisualizacionImportacion`, junto con el texto `Sin preview cargado.`

## 1) Contexto del proyecto

- Repo local: `F:\desarrollo\generador_tipogr-fico`
- Stack: TypeScript + Vite + Vitest + jsdom
- Flujo relevante:
  - Pantalla `ImportacionSvg` carga un archivo SVG
  - Boton `Previsualizar importacion` ejecuta preview
  - Pantalla `PrevisualizacionImportacion` muestra cards por glifo
  - Boton `Confirmar aplicacion` hace commit del preview

## 2) Sintoma reportado por usuario

El usuario sigue viendo en UI:
- `Sin preview cargado.`
- Luego pulsa `Confirmar aplicacion`
- Sale: `IMPORT_BLOCKED_BY_VALIDATION: No se puede aplicar un preview bloqueante.`

Captura textual de estado visual:
- Ruta activa: `PrevisualizacionImportacion`
- Filtro en `all`
- Grid vacio (sin cards)
- Mensaje inferior rojo con el error anterior

## 3) Hallazgos previos ya verificados

### 3.1. Sobre el SVG del usuario
Archivo: `test_usuario/template.svg`

- Tiene `g#ctf-template-root`
- Tiene `metadata` con `templateSchemaVersion: 1.0.0`
- Tiene celdas `g[data-role="glyph-cell"]`
- Tiene grupos `g[data-role="drawing"]`
- Tiene muchos `path` dibujados al final del documento, fuera de `ctf-template-root`

### 3.2. Cambio ya implementado en importador
Se implemento fallback posicional para paths fuera de `drawing`:

Archivo modificado:
- `src/context/font-design/infrastructure/adapters/SvgGlyphVectorImporterAdapter.ts`

Logica agregada:
- primera pasada: strict (paths dentro de cada `drawing`)
- segunda pasada: paths no consumidos se reasignan por posicion a celda
- si no caen dentro de celda interna, se asignan a celda mas cercana
- issue warning nuevo: `POSITIONAL_FALLBACK_APPLIED`

Prueba directa ejecutada con script local sobre `test_usuario/template.svg`:
- `isBlocking=false`
- `items=92`
- `errors=0`
- warnings esperados (`EMPTY_DRAWING` y `POSITIONAL_FALLBACK_APPLIED`)

### 3.3. Cambio ya implementado en UI (persistencia de contenido)
Archivo modificado:
- `src/ui-app/main.ts`

Se guarda en estado:
- `state.importFilename`
- `state.importSvgContent`

Motivo:
- evitar que al hacer `render()` se resetee el textarea `importSvgContent` a `<svg ...></svg>`

### 3.4. Guard agregado en Confirmar
Archivo modificado:
- `src/ui-app/main.ts`

Se agrego validacion en click de `commitImportBtn`:
- si `state.previewId` esta vacio, debe mostrar warning:
  - `Primero ejecuta 'Previsualizar importacion' desde ImportacionSvg.`
- y debe abortar commit

## 4) Pruebas automatizadas actuales

Se ejecutaron y pasaron:
- `npm test -- SvgGlyphVectorImporterAdapter.test.ts` (6 tests OK)
- `npm run -s build` (OK)

Tests del adaptador incluyen casos nuevos de fallback posicional.

## 5) Archivos clave para inspeccionar

1. `src/ui-app/main.ts`
2. `src/context/font-design/application/facades/ImportFacade.ts`
3. `src/context/font-design/presentation/ui/screens/ImportacionSvgScreen.ts`
4. `src/context/font-design/presentation/ui/screens/PrevisualizacionImportacionScreen.ts`
5. `src/context/font-design/application/fsm/import-preview/importPreviewFsm.ts`
6. `src/context/font-design/infrastructure/adapters/SvgGlyphVectorImporterAdapter.ts`
7. `src/context/font-design/application/use-cases/PreviewTemplateImportUseCase.ts`

## 6) Comportamiento esperado (criterio funcional)

Al cargar `test_usuario/template.svg` y previsualizar:
- Debe existir preview con glifos (aunque haya warnings)
- `state.previewId` debe quedar seteado
- `PrevisualizacionImportacion` debe mostrar cards de preview
- `Confirmar aplicacion` no debe fallar por bloqueo si preview no tiene errores severidad `error`

Si se entra a `PrevisualizacionImportacion` sin preview:
- No debe intentar commit real
- Debe advertir al usuario que primero previsualice

## 7) Problema actual a resolver

A pesar de lo anterior, el usuario aun reporta exactamente:
- `Sin preview cargado.`
- `IMPORT_BLOCKED_BY_VALIDATION: No se puede aplicar un preview bloqueante.`

Necesito que detectes por qué sigue ocurriendo eso.

## 8) Hipotesis tecnicas que debes validar

Valida todas, no solo una:

1. La app en ejecucion no incluye los cambios recientes (cache/hot reload/build obsoleto)
2. `state.previewId` queda vacio por un flujo de navegacion no contemplado
3. `ImportacionSvg.preview(...)` retorna error y nunca hace bindPreview
4. `bindPreview(...)` se hace pero luego se pisa `viewState` al filtrar o navegar
5. `confirm(...)` en `PrevisualizacionImportacionScreen` se ejecuta con `previewId` invalido
6. `ImportFacade` conserva estado FSM inconsistente entre intents
7. Existe ruta alterna que llega a `commitImport` sin pasar por `previewImport`
8. El guard de `state.previewId` no se ejecuta (archivo distinto, build viejo, listener reemplazado)
9. `state.previewId` se pierde en `render()` por mutacion lateral
10. Mensaje mostrado es stale (status global viejo no limpiado)

## 9) Lo que debes entregar

Quiero una respuesta de ingenieria con:

1. Causa raiz mas probable (con evidencia y trazabilidad de codigo)
2. Causas secundarias posibles (ordenadas por probabilidad)
3. Plan de reproduccion deterministico (paso a paso)
4. Instrumentacion recomendada (logs exactos a insertar y en que lineas/funciones)
5. Patch propuesto concreto (diff o cambios por archivo)
6. Verificacion post-fix (manual + automatizada)
7. Riesgos/regresiones

## 10) Restricciones

- No propongas rediseño grande ni reescritura total.
- Solucion incremental, precisa y de bajo riesgo.
- Mantener FSM existente, salvo cambio minimo estrictamente necesario.

## 11) Evidencia extra relevante

- El error `IMPORT_BLOCKED_BY_VALIDATION` lo genera `ImportFacade.commitImport(...)` cuando, tras `APPLY_REQUESTED`, el estado FSM cae en `error` por `isBlocking===true`.
- En la captura, la vista muestra `Sin preview cargado`, lo cual sugiere que ni siquiera hay datos de preview en `PrevisualizacionImportacionScreen`.
- Eso hace sospechar que se esta intentando confirmar sin preview valido, o con estado inconsistente/stale.

## 12) Solicitud final

Dame una solucion accionable para aplicar de inmediato en este repo, con el minimo numero de cambios y alta confiabilidad.
