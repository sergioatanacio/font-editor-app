import type { FontDesignApp } from "../context/font-design/main";
import type { AppState } from "./types";
import { htmlEscape } from "./utils";
import type { GlyphOutlineSnapshot } from "../context/font-design/domain/ports";

function buildPathData(outline?: GlyphOutlineSnapshot): string {
  if (!outline || outline.contours.length === 0) {
    return "";
  }
  const parts: string[] = [];
  for (const contour of outline.contours) {
    for (const cmd of contour) {
      if (cmd.type === "M" || cmd.type === "L") {
        parts.push(`${cmd.type}${cmd.values[0]} ${-cmd.values[1]}`);
      } else if (cmd.type === "Q") {
        parts.push(`Q${cmd.values[0]} ${-cmd.values[1]} ${cmd.values[2]} ${-cmd.values[3]}`);
      } else if (cmd.type === "C") {
        parts.push(`C${cmd.values[0]} ${-cmd.values[1]} ${cmd.values[2]} ${-cmd.values[3]} ${cmd.values[4]} ${-cmd.values[5]}`);
      } else if (cmd.type === "Z") {
        parts.push("Z");
      }
    }
  }
  return parts.join(" ");
}

function previewViewBox(
  bounds?: { xMin: number; yMin: number; xMax: number; yMax: number },
): string {
  if (!bounds) {
    return "0 0 1000 1000";
  }
  const xMin = bounds.xMin;
  const xMax = bounds.xMax;
  const yMin = -bounds.yMax;
  const yMax = -bounds.yMin;
  const w = Math.max(1, xMax - xMin);
  const h = Math.max(1, yMax - yMin);
  const pad = Math.max(w, h) * 0.12;
  return `${xMin - pad} ${yMin - pad} ${w + pad * 2} ${h + pad * 2}`;
}

function renderGlyphThumb(params: {
  outline?: GlyphOutlineSnapshot;
  bounds?: { xMin: number; yMin: number; xMax: number; yMax: number };
  glyphId: string;
}): string {
  const d = buildPathData(params.outline);
  if (!d) {
    return `<div class="glyph-thumb empty">vacio</div>`;
  }
  return `<div class="glyph-thumb"><svg viewBox="${previewViewBox(params.bounds)}" preserveAspectRatio="xMidYMid meet" aria-label="preview-${htmlEscape(params.glyphId)}"><path d="${htmlEscape(d)}" fill="currentColor"/></svg></div>`;
}

function renderStatus(state: AppState): string {
  if (!state.status) return "";
  return `<div class="alert ${state.statusKind}">${htmlEscape(state.status)}</div>`;
}

function renderInicioProyecto(): string {
  return `
  <div class="panel">
    <h2>InicioProyecto</h2>
    <div class="grid">
      <div class="field"><label>Family name</label><input id="familyName" value="Atlas Sans" /></div>
      <div class="field"><label>Style name</label><input id="styleName" value="Regular" /></div>
      <div class="field"><label>unitsPerEm</label><input id="unitsPerEm" type="number" value="1000" /></div>
      <div class="field"><label>Export preset</label>
        <select id="exportPreset"><option value="minimal-latin">minimal-latin</option><option value="freeform">freeform</option></select>
      </div>
    </div>
    <div class="actions">
      <label><input id="includeLatam" type="checkbox" checked /> includeLatamAlnum</label>
      <label><input id="includeCode" type="checkbox" /> includeCodeChars</label>
    </div>
    <div class="actions">
      <button class="primary" id="createProjectBtn">Crear proyecto</button>
      <button class="secondary" id="openProjectBtn">Abrir snapshot</button>
    </div>
  </div>`;
}

function renderConfiguracionFuente(): string {
  return `
  <div class="panel">
    <h2>ConfiguracionFuente</h2>
    <div class="grid">
      <div class="field"><label>Family name</label><input id="cfgFamilyName" value="Atlas Sans" /></div>
      <div class="field"><label>Style name</label><input id="cfgStyleName" value="Regular" /></div>
      <div class="field"><label>Designer</label><input id="cfgDesigner" value="Sergio" /></div>
      <div class="field"><label>Version</label><input id="cfgVersion" value="1.0" /></div>
      <div class="field"><label>unitsPerEm</label><input id="cfgUpm" type="number" value="1000" /></div>
      <div class="field"><label>Ascender</label><input id="cfgAsc" type="number" value="800" /></div>
      <div class="field"><label>Descender</label><input id="cfgDesc" type="number" value="-200" /></div>
      <div class="field"><label>LineGap</label><input id="cfgGap" type="number" value="200" /></div>
      <div class="field"><label>Baseline (fijo)</label><input value="0" disabled /></div>
    </div>
    <div class="actions"><button class="primary" id="saveConfigBtn">Guardar cambios</button></div>
  </div>`;
}

function renderPlantillaSvg(): string {
  return `
  <div class="panel">
    <h2>PlantillaSvg</h2>
    <div class="field"><label>Nombre de archivo</label><input id="templateFilename" value="template.svg" /></div>
    <div class="actions"><button class="primary" id="generateTemplateBtn">Generar y descargar plantilla</button></div>
  </div>`;
}

function renderImportacionSvg(state: AppState): string {
  return `
  <div class="panel">
    <h2>ImportacionSvg</h2>
    <div class="field"><label>Filename</label><input id="importFilename" value="${htmlEscape(state.importFilename)}" /></div>
    <input id="importSvgFile" type="file" accept=".svg,image/svg+xml" style="display:none" />
    <div class="field"><label>SVG content</label><textarea id="importSvgContent">${htmlEscape(state.importSvgContent)}</textarea></div>
    <div class="field"><label>Glyph mapping default glyphId</label><input id="mappingGlyphId" value="A" /></div>
    <div class="actions">
      <button class="secondary" id="pickSvgFileBtn">Seleccionar archivo SVG</button>
      <button class="primary" id="previewImportBtn">Previsualizar importacion</button>
      <button class="secondary" id="cancelImportBtn">Cancelar</button>
    </div>
  </div>`;
}

function renderPrevisualizacionImportacion(app: FontDesignApp, state: AppState): string {
  const vm = app.ui.screens.previsualizacionImportacion.getState().data;
  const items = vm?.glyphPreview ?? [];
  const hasPreview = !!vm?.previewId;
  const canCommit = hasPreview && !vm?.isBlocking && items.length > 0;
  const issueCodes = (vm?.issues ?? []).map((x) => x.code);
  const issueSummary = issueCodes.length > 0
    ? `<small>Issues: ${htmlEscape(issueCodes.slice(0, 8).join(", "))}${issueCodes.length > 8 ? "..." : ""}</small>`
    : "";
  const cards = items
    .map((x) => `<div class="card" data-glyph-id="${htmlEscape(x.glyphId)}">${renderGlyphThumb({ outline: x.outline, bounds: x.bounds, glyphId: x.glyphId })}<strong>${htmlEscape(x.glyphId)}</strong><br/><span class="badge ${x.status}">${x.status}</span><small>issues: ${x.issues.length}</small></div>`)
    .join("");

  return `
  <div class="panel">
    <h2>PrevisualizacionImportacion</h2>
    <div class="actions">
      <select id="previewFilter">
        <option value="all" ${state.previewSelection === "all" ? "selected" : ""}>all</option>
        <option value="ok" ${state.previewSelection === "ok" ? "selected" : ""}>ok</option>
        <option value="warning" ${state.previewSelection === "warning" ? "selected" : ""}>warning</option>
        <option value="error" ${state.previewSelection === "error" ? "selected" : ""}>error</option>
        <option value="empty" ${state.previewSelection === "empty" ? "selected" : ""}>empty</option>
      </select>
      <button class="secondary" id="applyFilterBtn">Filtrar</button>
      <button class="primary" id="commitImportBtn" ${canCommit ? "" : "disabled"}>Confirmar aplicacion</button>
    </div>
    ${vm ? `<small>Preview: total=${vm.summary.total}, ok=${vm.summary.ok}, warning=${vm.summary.warning}, error=${vm.summary.error}, empty=${vm.summary.empty}, blocking=${vm.summary.blockingCount}</small><br/>${issueSummary}` : ""}
    <div class="preview-layout">
      <div class="preview-grid">${cards || "<small>Sin preview cargado.</small>"}</div>
      <div id="glyphDetail">Selecciona un glifo para ver detalle.</div>
    </div>
  </div>`;
}

function renderEditorGlifos(): string {
  return `
  <div class="panel">
    <h2>EditorGlifos</h2>
    <div class="grid">
      <div class="field"><label>glyphId</label><input id="editGlyphId" value="A" /></div>
      <div class="field"><label>Unicode code point</label><input id="editCodePoint" type="number" value="65" /></div>
      <div class="field"><label>advanceWidth</label><input id="editAdvance" type="number" value="600" /></div>
      <div class="field"><label>leftSideBearing</label><input id="editLsb" type="number" value="0" /></div>
      <div class="field"><label>Outline JSON</label><textarea id="editOutline">{"contours":[[{"type":"M","values":[0,0]},{"type":"L","values":[500,700]},{"type":"L","values":[1000,0]},{"type":"Z","values":[]}]]}</textarea></div>
    </div>
    <div class="actions">
      <button class="secondary" id="assignUnicodeBtn">Asignar Unicode</button>
      <button class="secondary" id="updateGlyphMetricsBtn">Actualizar metricas</button>
      <button class="primary" id="replaceOutlineBtn">Reemplazar outline</button>
    </div>
  </div>`;
}

function renderValidacionExportacion(app: FontDesignApp): string {
  const vm = app.ui.screens.validacionExportacion.getState();
  const report = vm.data;
  const errors = report?.errors ?? [];
  const warnings = report?.warnings ?? [];
  const issueLines = [...errors.map((x) => `ERROR ${x.glyphId ?? "-"} ${x.code}`), ...warnings.map((x) => `WARN ${x.glyphId ?? "-"} ${x.code}`)]
    .slice(0, 20)
    .map((line) => `<li>${htmlEscape(line)}</li>`)
    .join("");
  return `
  <div class="panel">
    <h2>ValidacionExportacion</h2>
    <div class="actions"><button class="primary" id="validateExportBtn">Validar readiness</button></div>
    ${report ? `<small>Readiness: ${report.isReady ? "OK" : "BLOCKED"} | errors=${errors.length} warnings=${warnings.length}</small>` : ""}
    ${issueLines ? `<ul>${issueLines}</ul>` : ""}
  </div>`;
}

function renderExportacionTtf(app: FontDesignApp): string {
  const vm = app.ui.screens.exportacionTtf.getState();
  const report = vm.data?.report;
  const lines = (report?.errors ?? []).map((x) => `ERROR ${x.glyphId ?? "-"} ${x.code}`)
    .concat((report?.warnings ?? []).map((x) => `WARN ${x.glyphId ?? "-"} ${x.code}`))
    .slice(0, 20)
    .map((line) => `<li>${htmlEscape(line)}</li>`)
    .join("");
  return `
  <div class="panel">
    <h2>ExportacionTtf</h2>
    <div class="field"><label>Filename</label><input id="exportFilename" value="mi-fuente.ttf" /></div>
    <div class="actions"><button class="primary" id="exportTtfBtn">Exportar TTF</button></div>
    ${report ? `<small>Readiness previo: ${report.isReady ? "OK" : "BLOCKED"} | errors=${report.errors.length} warnings=${report.warnings.length}</small>` : ""}
    ${lines ? `<ul>${lines}</ul>` : ""}
  </div>`;
}

function renderGuardarAbrirProyecto(): string {
  return `
  <div class="panel">
    <h2>GuardarAbrirProyecto</h2>
    <div class="field"><label>Filename</label><input id="snapshotFilename" value="proyecto-tipografia.json" /></div>
    <div class="actions">
      <button class="primary" id="saveProjectBtn">Guardar snapshot</button>
      <button class="secondary" id="openSnapshotBtn">Abrir snapshot</button>
    </div>
  </div>`;
}

function renderPanelErrores(app: FontDesignApp): string {
  const errors = app.ui.screens.panelErrores.getState().data?.items ?? [];
  const list = errors.map((e) => `<li>[${e.severity}] ${htmlEscape(e.code)} - ${htmlEscape(e.message)}</li>`).join("");
  return `
  <div class="panel">
    <h2>PanelErrores</h2>
    <ul>${list || "<li>Sin errores registrados.</li>"}</ul>
  </div>`;
}

function renderMainPanel(app: FontDesignApp, state: AppState): string {
  if (state.route === "InicioProyecto") return renderInicioProyecto();
  if (state.route === "ConfiguracionFuente") return renderConfiguracionFuente();
  if (state.route === "PlantillaSvg") return renderPlantillaSvg();
  if (state.route === "ImportacionSvg") return renderImportacionSvg(state);
  if (state.route === "PrevisualizacionImportacion") return renderPrevisualizacionImportacion(app, state);
  if (state.route === "EditorGlifos") return renderEditorGlifos();
  if (state.route === "ValidacionExportacion") return renderValidacionExportacion(app);
  if (state.route === "ExportacionTtf") return renderExportacionTtf(app);
  if (state.route === "GuardarAbrirProyecto") return renderGuardarAbrirProyecto();
  return renderPanelErrores(app);
}

export function renderLayout(params: {
  app: FontDesignApp;
  state: AppState;
  routes: readonly string[];
}): string {
  const { app, state, routes } = params;
  return `
    <div class="app">
      <aside class="sidebar">
        <h1 class="brand">Editor Tipografico</h1>
        ${routes
          .map((route) => `<button class="nav-btn ${route === state.route ? "active" : ""}" data-route="${route}">${route}</button>`)
          .join("")}
      </aside>
      <main class="main">
        <div class="panel"><strong>Proyecto:</strong> ${state.projectId || "(sin proyecto)"}</div>
        ${renderMainPanel(app, state)}
        ${renderStatus(state)}
      </main>
    </div>
  `;
}
