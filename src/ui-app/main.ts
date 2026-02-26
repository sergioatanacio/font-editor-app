import "./styles.css";
import { createFontDesignApp } from "../context/font-design/main";
import type { UiRoute } from "../context/font-design/presentation/ui/routing/UiRoute";

const app = createFontDesignApp();
const rootNode = document.getElementById("app");
if (!rootNode) {
  throw new Error("Missing #app root");
}
const root: HTMLElement = rootNode;

type StatusKind = "success" | "error" | "warning";

const state = {
  route: "InicioProyecto" as UiRoute,
  projectId: "",
  previewId: "",
  status: "" as string,
  statusKind: "success" as StatusKind,
  previewSelection: "all" as "all" | "ok" | "warning" | "error" | "empty",
};

const routes: UiRoute[] = [
  "InicioProyecto",
  "ConfiguracionFuente",
  "PlantillaSvg",
  "ImportacionSvg",
  "PrevisualizacionImportacion",
  "EditorGlifos",
  "ValidacionExportacion",
  "ExportacionTtf",
  "GuardarAbrirProyecto",
  "PanelErrores",
];

function setStatus(kind: StatusKind, message: string): void {
  state.statusKind = kind;
  state.status = message;
}

function clearStatus(): void {
  state.status = "";
}

function htmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderStatus(): string {
  if (!state.status) return "";
  return `<div class="alert ${state.statusKind}">${htmlEscape(state.status)}</div>`;
}

function ensureProjectId(): string | null {
  if (state.projectId.trim()) return state.projectId;
  setStatus("error", "Primero crea o abre un proyecto en InicioProyecto.");
  render();
  return null;
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

function renderImportacionSvg(): string {
  return `
  <div class="panel">
    <h2>ImportacionSvg</h2>
    <div class="field"><label>Filename</label><input id="importFilename" value="template-editado.svg" /></div>
    <input id="importSvgFile" type="file" accept=".svg,image/svg+xml" style="display:none" />
    <div class="field"><label>SVG content</label><textarea id="importSvgContent"><svg xmlns="http://www.w3.org/2000/svg"></svg></textarea></div>
    <div class="field"><label>Glyph mapping default glyphId</label><input id="mappingGlyphId" value="A" /></div>
    <div class="actions">
      <button class="secondary" id="pickSvgFileBtn">Seleccionar archivo SVG</button>
      <button class="primary" id="previewImportBtn">Previsualizar importacion</button>
      <button class="secondary" id="cancelImportBtn">Cancelar</button>
    </div>
  </div>`;
}

function renderPrevisualizacionImportacion(): string {
  const vm = app.ui.screens.previsualizacionImportacion.getState().data;
  const items = vm?.glyphPreview ?? [];
  const cards = items
    .map((x) => `<div class="card" data-glyph-id="${htmlEscape(x.glyphId)}"><strong>${htmlEscape(x.glyphId)}</strong><br/><span class="badge ${x.status}">${x.status}</span><small>issues: ${x.issues.length}</small></div>`)
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
      <button class="primary" id="commitImportBtn">Confirmar aplicacion</button>
    </div>
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

function renderValidacionExportacion(): string {
  return `
  <div class="panel">
    <h2>ValidacionExportacion</h2>
    <div class="actions"><button class="primary" id="validateExportBtn">Validar readiness</button></div>
  </div>`;
}

function renderExportacionTtf(): string {
  return `
  <div class="panel">
    <h2>ExportacionTtf</h2>
    <div class="field"><label>Filename</label><input id="exportFilename" value="mi-fuente.ttf" /></div>
    <div class="actions"><button class="primary" id="exportTtfBtn">Exportar TTF</button></div>
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

function renderPanelErrores(): string {
  const errors = app.ui.screens.panelErrores.getState().data?.items ?? [];
  const list = errors.map((e) => `<li>[${e.severity}] ${htmlEscape(e.code)} - ${htmlEscape(e.message)}</li>`).join("");
  return `
  <div class="panel">
    <h2>PanelErrores</h2>
    <ul>${list || "<li>Sin errores registrados.</li>"}</ul>
  </div>`;
}

function renderMainPanel(): string {
  if (state.route === "InicioProyecto") return renderInicioProyecto();
  if (state.route === "ConfiguracionFuente") return renderConfiguracionFuente();
  if (state.route === "PlantillaSvg") return renderPlantillaSvg();
  if (state.route === "ImportacionSvg") return renderImportacionSvg();
  if (state.route === "PrevisualizacionImportacion") return renderPrevisualizacionImportacion();
  if (state.route === "EditorGlifos") return renderEditorGlifos();
  if (state.route === "ValidacionExportacion") return renderValidacionExportacion();
  if (state.route === "ExportacionTtf") return renderExportacionTtf();
  if (state.route === "GuardarAbrirProyecto") return renderGuardarAbrirProyecto();
  return renderPanelErrores();
}

function mountActions(): void {
  document.querySelectorAll<HTMLButtonElement>(".nav-btn").forEach((btn) => {
    btn.onclick = () => {
      clearStatus();
      state.route = btn.dataset.route as UiRoute;
      render();
    };
  });

  const createBtn = document.getElementById("createProjectBtn") as HTMLButtonElement | null;
  if (createBtn) {
    createBtn.onclick = async () => {
      const form = {
        familyName: (document.getElementById("familyName") as HTMLInputElement).value,
        styleName: (document.getElementById("styleName") as HTMLInputElement).value,
        unitsPerEm: Number((document.getElementById("unitsPerEm") as HTMLInputElement).value),
        exportPreset: (document.getElementById("exportPreset") as HTMLSelectElement).value as "minimal-latin" | "freeform",
        characterChecks: {
          includeLatamAlnum: (document.getElementById("includeLatam") as HTMLInputElement).checked,
          includeCodeChars: (document.getElementById("includeCode") as HTMLInputElement).checked,
        },
      };
      const vm = await app.ui.screens.inicioProyecto.create(form);
      if (vm.status === "success" && vm.data?.projectId) {
        state.projectId = vm.data.projectId;
        setStatus("success", `Proyecto creado: ${state.projectId}`);
      } else if (vm.status === "error" && vm.error) {
        setStatus("error", `${vm.error.code}: ${vm.error.message}`);
      }
      render();
    };
  }

  const openProjectBtn = document.getElementById("openProjectBtn") as HTMLButtonElement | null;
  if (openProjectBtn) {
    openProjectBtn.onclick = async () => {
      const vm = await app.ui.screens.inicioProyecto.openFromSnapshot();
      if (vm.status === "success" && vm.data?.projectId) {
        state.projectId = vm.data.projectId;
        setStatus("success", `Snapshot cargado: ${state.projectId}`);
      } else if (vm.status === "error" && vm.error) {
        setStatus("error", `${vm.error.code}: ${vm.error.message}`);
      }
      render();
    };
  }

  const saveConfigBtn = document.getElementById("saveConfigBtn") as HTMLButtonElement | null;
  if (saveConfigBtn) {
    saveConfigBtn.onclick = async () => {
      const pid = ensureProjectId(); if (!pid) return;
      const vm = await app.ui.screens.configuracionFuente.saveChanges({
        projectId: pid,
        familyName: (document.getElementById("cfgFamilyName") as HTMLInputElement).value,
        styleName: (document.getElementById("cfgStyleName") as HTMLInputElement).value,
        designer: (document.getElementById("cfgDesigner") as HTMLInputElement).value,
        version: (document.getElementById("cfgVersion") as HTMLInputElement).value,
        unitsPerEm: Number((document.getElementById("cfgUpm") as HTMLInputElement).value),
        ascender: Number((document.getElementById("cfgAsc") as HTMLInputElement).value),
        descender: Number((document.getElementById("cfgDesc") as HTMLInputElement).value),
        lineGap: Number((document.getElementById("cfgGap") as HTMLInputElement).value),
      });
      if (vm.status === "success") setStatus("success", "Configuracion guardada.");
      else if (vm.error) setStatus("error", `${vm.error.code}: ${vm.error.message}`);
      render();
    };
  }

  const generateTemplateBtn = document.getElementById("generateTemplateBtn") as HTMLButtonElement | null;
  if (generateTemplateBtn) {
    generateTemplateBtn.onclick = async () => {
      const pid = ensureProjectId(); if (!pid) return;
      const vm = await app.ui.screens.plantillaSvg.generateAndDownloadTemplate(pid, (document.getElementById("templateFilename") as HTMLInputElement).value);
      if (vm.status === "success") setStatus("success", `Plantilla generada (${vm.data?.glyphCount} glifos).`);
      else if (vm.error) setStatus("error", `${vm.error.code}: ${vm.error.message}`);
      render();
    };
  }

  const previewImportBtn = document.getElementById("previewImportBtn") as HTMLButtonElement | null;
  if (previewImportBtn) {
    previewImportBtn.onclick = async () => {
      const pid = ensureProjectId(); if (!pid) return;
      const vm = await app.ui.screens.importacionSvg.preview({
        projectId: pid,
        filename: (document.getElementById("importFilename") as HTMLInputElement).value,
        svgContent: (document.getElementById("importSvgContent") as HTMLTextAreaElement).value,
        mapping: { glyphId: (document.getElementById("mappingGlyphId") as HTMLInputElement).value },
      });
      if (vm.status === "success" && vm.data) {
        state.previewId = vm.data.previewId;
        app.ui.screens.previsualizacionImportacion.bindPreview(vm.data);
        state.route = "PrevisualizacionImportacion";
        setStatus(vm.data.isBlocking ? "warning" : "success", vm.data.isBlocking ? "Preview con bloqueos." : "Preview listo para aplicar.");
      } else if (vm.error) {
        setStatus("error", `${vm.error.code}: ${vm.error.message}`);
      }
      render();
    };
  }

  const pickSvgFileBtn = document.getElementById("pickSvgFileBtn") as HTMLButtonElement | null;
  const importSvgFileInput = document.getElementById("importSvgFile") as HTMLInputElement | null;
  if (pickSvgFileBtn && importSvgFileInput) {
    pickSvgFileBtn.onclick = () => {
      importSvgFileInput.click();
    };

    importSvgFileInput.onchange = async () => {
      const file = importSvgFileInput.files?.[0];
      if (!file) {
        return;
      }

      const content = await file.text();
      const filenameInput = document.getElementById("importFilename") as HTMLInputElement | null;
      const svgContentInput = document.getElementById("importSvgContent") as HTMLTextAreaElement | null;

      if (filenameInput) {
        filenameInput.value = file.name;
      }
      if (svgContentInput) {
        svgContentInput.value = content;
      }

      setStatus("success", `Archivo cargado: ${file.name}`);
      render();
    };
  }

  const cancelImportBtn = document.getElementById("cancelImportBtn") as HTMLButtonElement | null;
  if (cancelImportBtn) {
    cancelImportBtn.onclick = () => {
      app.ui.screens.importacionSvg.cancelImport();
      setStatus("warning", "Importacion cancelada.");
      render();
    };
  }

  const applyFilterBtn = document.getElementById("applyFilterBtn") as HTMLButtonElement | null;
  if (applyFilterBtn) {
    applyFilterBtn.onclick = () => {
      state.previewSelection = (document.getElementById("previewFilter") as HTMLSelectElement).value as any;
      app.ui.screens.previsualizacionImportacion.filter(state.previewSelection);
      render();
    };
  }

  document.querySelectorAll<HTMLElement>(".card[data-glyph-id]").forEach((card) => {
    card.onclick = () => {
      const glyphId = card.dataset.glyphId ?? "";
      const detail = app.ui.screens.previsualizacionImportacion.selectGlyph(glyphId);
      const detailEl = document.getElementById("glyphDetail");
      if (detailEl && detail) {
        detailEl.innerHTML = `<strong>${htmlEscape(detail.title)}</strong><br/>Issues: ${detail.issueCodes.join(", ") || "none"}`;
      }
    };
  });

  const commitImportBtn = document.getElementById("commitImportBtn") as HTMLButtonElement | null;
  if (commitImportBtn) {
    commitImportBtn.onclick = async () => {
      const pid = ensureProjectId(); if (!pid) return;
      const vm = await app.ui.screens.previsualizacionImportacion.confirm(pid, state.previewId);
      if (vm.status === "success") setStatus("success", "Importacion aplicada.");
      else if (vm.error) setStatus("error", `${vm.error.code}: ${vm.error.message}`);
      render();
    };
  }

  const assignUnicodeBtn = document.getElementById("assignUnicodeBtn") as HTMLButtonElement | null;
  if (assignUnicodeBtn) {
    assignUnicodeBtn.onclick = async () => {
      const pid = ensureProjectId(); if (!pid) return;
      const vm = await app.ui.screens.editorGlifos.assignUnicode({
        projectId: pid,
        glyphId: (document.getElementById("editGlyphId") as HTMLInputElement).value,
        codePoint: Number((document.getElementById("editCodePoint") as HTMLInputElement).value),
      });
      if (vm.status === "success") setStatus("success", vm.data?.lastOperation ?? "Unicode asignado.");
      else if (vm.error) setStatus("error", `${vm.error.code}: ${vm.error.message}`);
      render();
    };
  }

  const updateGlyphMetricsBtn = document.getElementById("updateGlyphMetricsBtn") as HTMLButtonElement | null;
  if (updateGlyphMetricsBtn) {
    updateGlyphMetricsBtn.onclick = async () => {
      const pid = ensureProjectId(); if (!pid) return;
      const vm = await app.ui.screens.editorGlifos.updateGlyphMetrics({
        projectId: pid,
        glyphId: (document.getElementById("editGlyphId") as HTMLInputElement).value,
        advanceWidth: Number((document.getElementById("editAdvance") as HTMLInputElement).value),
        leftSideBearing: Number((document.getElementById("editLsb") as HTMLInputElement).value),
      });
      if (vm.status === "success") setStatus("success", vm.data?.lastOperation ?? "Metricas actualizadas.");
      else if (vm.error) setStatus("error", `${vm.error.code}: ${vm.error.message}`);
      render();
    };
  }

  const replaceOutlineBtn = document.getElementById("replaceOutlineBtn") as HTMLButtonElement | null;
  if (replaceOutlineBtn) {
    replaceOutlineBtn.onclick = async () => {
      const pid = ensureProjectId(); if (!pid) return;
      let outline;
      try {
        outline = JSON.parse((document.getElementById("editOutline") as HTMLTextAreaElement).value);
      } catch {
        setStatus("error", "Outline JSON invalido.");
        render();
        return;
      }
      const vm = await app.ui.screens.editorGlifos.replaceOutline({
        projectId: pid,
        glyphId: (document.getElementById("editGlyphId") as HTMLInputElement).value,
        outline,
      });
      if (vm.status === "success") setStatus("success", vm.data?.lastOperation ?? "Outline actualizado.");
      else if (vm.error) setStatus("error", `${vm.error.code}: ${vm.error.message}`);
      render();
    };
  }

  const validateExportBtn = document.getElementById("validateExportBtn") as HTMLButtonElement | null;
  if (validateExportBtn) {
    validateExportBtn.onclick = async () => {
      const pid = ensureProjectId(); if (!pid) return;
      const vm = await app.ui.screens.validacionExportacion.validate(pid);
      if (vm.status === "success") setStatus("success", "Readiness valido.");
      else if (vm.error) setStatus("error", `${vm.error.code}: ${vm.error.message}`);
      render();
    };
  }

  const exportTtfBtn = document.getElementById("exportTtfBtn") as HTMLButtonElement | null;
  if (exportTtfBtn) {
    exportTtfBtn.onclick = async () => {
      const pid = ensureProjectId(); if (!pid) return;
      const vm = await app.ui.screens.exportacionTtf.export(pid, (document.getElementById("exportFilename") as HTMLInputElement).value);
      if (vm.status === "success") setStatus("success", `TTF exportado (${vm.data?.byteLength} bytes).`);
      else if (vm.error) setStatus("error", `${vm.error.code}: ${vm.error.message}`);
      render();
    };
  }

  const saveProjectBtn = document.getElementById("saveProjectBtn") as HTMLButtonElement | null;
  if (saveProjectBtn) {
    saveProjectBtn.onclick = async () => {
      const pid = ensureProjectId(); if (!pid) return;
      const vm = await app.ui.screens.guardarAbrirProyecto.save(pid, (document.getElementById("snapshotFilename") as HTMLInputElement).value);
      if (vm.status === "success") setStatus("success", "Snapshot guardado.");
      else if (vm.error) setStatus("error", `${vm.error.code}: ${vm.error.message}`);
      render();
    };
  }

  const openSnapshotBtn = document.getElementById("openSnapshotBtn") as HTMLButtonElement | null;
  if (openSnapshotBtn) {
    openSnapshotBtn.onclick = async () => {
      const vm = await app.ui.screens.guardarAbrirProyecto.open();
      if (vm.status === "success" && vm.data?.projectId) {
        state.projectId = vm.data.projectId;
        setStatus("success", `Proyecto abierto: ${state.projectId}`);
      } else if (vm.error) {
        setStatus("error", `${vm.error.code}: ${vm.error.message}`);
      }
      render();
    };
  }
}

function render(): void {
  root.innerHTML = `
    <div class="app">
      <aside class="sidebar">
        <h1 class="brand">Editor Tipografico</h1>
        ${routes
          .map((route) => `<button class="nav-btn ${route === state.route ? "active" : ""}" data-route="${route}">${route}</button>`)
          .join("")}
      </aside>
      <main class="main">
        <div class="panel"><strong>Proyecto:</strong> ${state.projectId || "(sin proyecto)"}</div>
        ${renderMainPanel()}
        ${renderStatus()}
      </main>
    </div>
  `;

  mountActions();
}

render();
