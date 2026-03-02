import type { UiRoute } from "../context/font-design/presentation/ui/routing/UiRoute";
import type { UiContext } from "./types";
import { htmlEscape } from "./utils";
import { applyTransformToOutline } from "./outlineTransform";
import { outlineBounds } from "./specimen";
import type { GlyphOutlineSnapshot, GlyphSnapshot } from "../context/font-design/domain/ports";

let pendingEditorSave: ReturnType<typeof setTimeout> | null = null;

function findGlyphById(glyphs: readonly GlyphSnapshot[], glyphId: string): GlyphSnapshot | null {
  return glyphs.find((x) => x.id === glyphId) ?? null;
}

function parseNumberInput(id: string, fallback: number): number {
  const element = document.getElementById(id) as HTMLInputElement | null;
  if (!element) return fallback;
  const parsed = Number(element.value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

export function mountActions(ctx: UiContext): void {
  const { app, state, clearStatus, setStatus, ensureProjectId, render } = ctx;
  state.linkedProjectSupported = app.facades.project.supportsLinkedProjectFile();
  state.linkedProjectFilename = app.facades.project.getLinkedProjectFilename() ?? state.linkedProjectFilename;

  const downloadDiagnostic = (label: string, payload: unknown): void => {
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = URL.createObjectURL(blob);
    a.download = `diagnostic-${label}-${ts}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const applyGlyphTransform = async () => {
    const pid = ensureProjectId(); if (!pid) return;
    const model = app.ui.screens.editorGlifos.getState().data?.typeface;
    if (!model || model.glyphs.length === 0) return;

    const glyphId = state.selectedGlyphId.trim() || (document.getElementById("editGlyphId") as HTMLInputElement | null)?.value.trim() || "";
    const glyph = findGlyphById(model.glyphs, glyphId);
    if (!glyph) {
      setStatus("warning", "No hay glifo seleccionado para aplicar.");
      render();
      return;
    }

    const moveX = state.editMoveX;
    const moveY = state.editMoveY;
    const scale = state.editScale;
    const bounds = outlineBounds(glyph.outline);
    const pivotX = bounds ? (bounds.xMin + bounds.xMax) * 0.5 : 0;
    const pivotY = bounds ? (bounds.yMin + bounds.yMax) * 0.5 : 0;

    state.autosaveSaving = true;
    state.autosaveDirty = false;
    state.autosaveError = "";
    render();

    if (Math.abs(moveX) > 1e-6) {
      const metricsVm = await app.ui.screens.editorGlifos.updateGlyphMetrics({
        projectId: pid,
        glyphId: glyph.id,
        advanceWidth: glyph.metrics.advanceWidth,
        leftSideBearing: glyph.metrics.leftSideBearing + moveX,
      });
      if (metricsVm.status !== "success" && metricsVm.error) {
        state.autosaveSaving = false;
        state.autosaveError = metricsVm.error.message;
        setStatus("error", `${metricsVm.error.code}: ${metricsVm.error.message}`);
        render();
        return;
      }
    }

    if (Math.abs(moveY) > 1e-6 || Math.abs(scale - 1) > 1e-6) {
      const transformedOutline: GlyphOutlineSnapshot = applyTransformToOutline(
        glyph.outline,
        { moveX: 0, moveY, scale },
        pivotX,
        pivotY,
      );
      const outline = {
        contours: transformedOutline.contours.map((contour) =>
          contour.map((command) => ({ type: command.type, values: [...command.values] })),
        ),
      };
      const outlineVm = await app.ui.screens.editorGlifos.replaceOutline({
        projectId: pid,
        glyphId: glyph.id,
        outline,
      });
      if (outlineVm.status !== "success" && outlineVm.error) {
        state.autosaveSaving = false;
        state.autosaveError = outlineVm.error.message;
        setStatus("error", `${outlineVm.error.code}: ${outlineVm.error.message}`);
        render();
        return;
      }
    }

    await app.ui.screens.editorGlifos.loadTypeface(pid);
    if (state.linkedProjectFilename) {
      const linkedSave = await app.facades.project.saveProjectToLinkedFile(pid);
      if (!linkedSave.ok) {
        state.autosaveError = linkedSave.error.message;
        setStatus("warning", `Glifo guardado en proyecto, pero no en archivo vinculado: ${linkedSave.error.message}`);
      } else {
        state.linkedProjectFilename = linkedSave.value.filename;
      }
    }
    state.autosaveSaving = false;
    state.autosaveDirty = false;
    state.autosaveError = "";
    state.autosaveLastSavedAt = new Date().toLocaleTimeString();
    state.editMoveX = 0;
    state.editMoveY = 0;
    state.editScale = 1;
    setStatus("success", `Transformacion aplicada a ${glyph.id}.`);
    render();
  };

  const flushPendingEditorSave = async (): Promise<void> => {
    if (pendingEditorSave) {
      clearTimeout(pendingEditorSave);
      pendingEditorSave = null;
      await applyGlyphTransform();
      return;
    }
    if (state.autosaveDirty && !state.autosaveSaving) {
      await applyGlyphTransform();
    }
  };

  const scheduleGlyphTransform = () => {
    state.autosaveDirty = true;
    state.autosaveError = "";
    if (pendingEditorSave) {
      clearTimeout(pendingEditorSave);
      pendingEditorSave = null;
    }
    pendingEditorSave = setTimeout(() => {
      pendingEditorSave = null;
      void applyGlyphTransform();
    }, 500);
    render();
  };

  window.onbeforeunload = () => {
    if (state.autosaveDirty || state.autosaveSaving || pendingEditorSave) {
      return "Hay cambios de glifos pendientes de guardar.";
    }
    return null;
  };

  document.querySelectorAll<HTMLButtonElement>(".nav-btn").forEach((btn) => {
    btn.onclick = async () => {
      await flushPendingEditorSave();
      clearStatus();
      state.route = btn.dataset.route as UiRoute;
      if (state.route === "PrevisualizacionImportacion") {
        const preVm = app.ui.screens.previsualizacionImportacion.getState();
        if (!preVm.data) {
          const importVm = app.ui.screens.importacionSvg.getState();
          if (importVm.status === "success" && importVm.data) {
            app.ui.screens.previsualizacionImportacion.bindPreview(importVm.data);
            state.previewId = importVm.data.previewId;
          }
        }
      }
      if (state.route === "EditorGlifos" && state.projectId.trim()) {
        const vm = await app.ui.screens.editorGlifos.loadTypeface(state.projectId);
        if (vm.status === "success") {
          state.editMoveX = 0;
          state.editMoveY = 0;
          state.editScale = 1;
        } else if (vm.error) {
          setStatus("error", `${vm.error.code}: ${vm.error.message}`);
        }
      }
      render();
    };
  });

  const createBtn = document.getElementById("createProjectBtn") as HTMLButtonElement | null;
  if (createBtn) {
    createBtn.onclick = async () => {
      await flushPendingEditorSave();
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
      await flushPendingEditorSave();
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
      await flushPendingEditorSave();
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
      await flushPendingEditorSave();
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
      await flushPendingEditorSave();
      const pid = ensureProjectId(); if (!pid) return;
      const filename = (document.getElementById("importFilename") as HTMLInputElement).value;
      const svgContent = (document.getElementById("importSvgContent") as HTMLTextAreaElement).value;
      state.importFilename = filename;
      state.importSvgContent = svgContent;
      console.info("[IMPORT_TRACE][UI] preview-click", {
        projectId: pid,
        filename,
        svgLength: svgContent.length,
        hasSvgTag: svgContent.includes("<svg"),
        hasTemplateRootMarker: svgContent.includes("ctf-template-root"),
      });
      const vm = await app.ui.screens.importacionSvg.preview({
        projectId: pid,
        filename,
        svgContent,
        mapping: { glyphId: (document.getElementById("mappingGlyphId") as HTMLInputElement).value },
      });
      console.info("[IMPORT_TRACE][UI] preview-result", {
        status: vm.status,
        errorCode: vm.error?.code,
        hasData: !!vm.data,
        previewId: vm.data?.previewId ?? "",
        total: vm.data?.summary.total ?? 0,
        blocking: vm.data?.summary.blockingCount ?? 0,
      });
      if (vm.status === "success" && vm.data) {
        state.previewId = vm.data.previewId;
        app.ui.screens.previsualizacionImportacion.bindPreview(vm.data);
        state.route = "PrevisualizacionImportacion";
        setStatus(
          vm.data.isBlocking ? "warning" : "success",
          vm.data.isBlocking ? "Preview con bloqueos." : "Preview generado. Falta confirmar aplicacion.",
        );
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
      state.importFilename = file.name;
      state.importSvgContent = content;

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
      state.previewSelection = (document.getElementById("previewFilter") as HTMLSelectElement).value as typeof state.previewSelection;
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
      await flushPendingEditorSave();
      const pid = ensureProjectId(); if (!pid) return;
      const activePreviewId = app.ui.screens.previsualizacionImportacion.getState().data?.previewId?.trim() ?? "";
      console.info("[IMPORT_TRACE][UI] commit-click", {
        projectId: pid,
        statePreviewId: state.previewId,
        activePreviewId,
      });
      if (!activePreviewId) {
        setStatus("warning", "Primero ejecuta 'Previsualizar importacion' desde ImportacionSvg.");
        render();
        return;
      }
      const vm = await app.ui.screens.previsualizacionImportacion.confirm(pid);
      console.info("[IMPORT_TRACE][UI] commit-result", {
        status: vm.status,
        errorCode: vm.error?.code,
      });
      if (vm.status === "success") {
        state.previewId = "";
        setStatus("success", "Importacion aplicada.");
      }
      else if (vm.error) setStatus("error", `${vm.error.code}: ${vm.error.message}`);
      render();
    };
  }

  const refreshGlyphEditorBtn = document.getElementById("refreshGlyphEditorBtn") as HTMLButtonElement | null;
  if (refreshGlyphEditorBtn) {
    refreshGlyphEditorBtn.onclick = async () => {
      const pid = ensureProjectId(); if (!pid) return;
      const vm = await app.ui.screens.editorGlifos.loadTypeface(pid);
      if (vm.status === "success") {
        state.editMoveX = 0;
        state.editMoveY = 0;
        state.editScale = 1;
        setStatus("success", "Glifos cargados.");
      } else if (vm.error) {
        setStatus("error", `${vm.error.code}: ${vm.error.message}`);
      }
      render();
    };
  }

  const specimenTextInput = document.getElementById("specimenTextInput") as HTMLInputElement | null;
  if (specimenTextInput) {
    specimenTextInput.oninput = () => {
      state.specimenText = specimenTextInput.value;
      render();
    };
  }

  document.querySelectorAll<SVGGElement>("#specimenCanvas g[data-run-index]").forEach((glyphNode) => {
    glyphNode.onclick = () => {
      state.selectedRunIndex = Number(glyphNode.dataset.runIndex ?? "0");
      state.selectedGlyphId = glyphNode.dataset.glyphId ?? "";
      state.editMoveX = 0;
      state.editMoveY = 0;
      state.editScale = 1;
      render();
    };
  });

  const specimenCanvas = document.getElementById("specimenCanvas") as SVGSVGElement | null;
  if (specimenCanvas) {
    let drag: { pointerId: number; startX: number; startY: number; baseX: number; baseY: number } | null = null;

    specimenCanvas.onpointerdown = (event) => {
      const target = event.target as Element | null;
      const group = target?.closest("g[data-run-index]") as SVGGElement | null;
      if (!group) return;
      const runIndex = Number(group.dataset.runIndex ?? "0");
      state.selectedRunIndex = runIndex;
      state.selectedGlyphId = group.dataset.glyphId ?? "";
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        baseX: state.editMoveX,
        baseY: state.editMoveY,
      };
      specimenCanvas.setPointerCapture(event.pointerId);
      render();
    };

    specimenCanvas.onpointermove = (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      state.editMoveX = Math.round(drag.baseX + dx);
      state.editMoveY = Math.round(drag.baseY - dy);
      state.autosaveDirty = true;
      render();
    };

    specimenCanvas.onpointerup = (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      drag = null;
      scheduleGlyphTransform();
    };

    specimenCanvas.onpointercancel = () => {
      drag = null;
    };
  }

  const glyphMoveX = document.getElementById("glyphMoveX") as HTMLInputElement | null;
  if (glyphMoveX) {
    glyphMoveX.oninput = () => {
      state.editMoveX = parseNumberInput("glyphMoveX", 0);
      scheduleGlyphTransform();
    };
  }

  const glyphMoveY = document.getElementById("glyphMoveY") as HTMLInputElement | null;
  if (glyphMoveY) {
    glyphMoveY.oninput = () => {
      state.editMoveY = parseNumberInput("glyphMoveY", 0);
      scheduleGlyphTransform();
    };
  }

  const glyphScale = document.getElementById("glyphScale") as HTMLInputElement | null;
  if (glyphScale) {
    glyphScale.oninput = () => {
      const scale = parseNumberInput("glyphScale", 1);
      state.editScale = Math.max(0.1, scale);
      scheduleGlyphTransform();
    };
  }

  const resetGlyphTransformBtn = document.getElementById("resetGlyphTransformBtn") as HTMLButtonElement | null;
  if (resetGlyphTransformBtn) {
    resetGlyphTransformBtn.onclick = () => {
      state.editMoveX = 0;
      state.editMoveY = 0;
      state.editScale = 1;
      state.autosaveDirty = false;
      if (pendingEditorSave) {
        clearTimeout(pendingEditorSave);
        pendingEditorSave = null;
      }
      render();
    };
  }

  const applyGlyphTransformNowBtn = document.getElementById("applyGlyphTransformNowBtn") as HTMLButtonElement | null;
  if (applyGlyphTransformNowBtn) {
    applyGlyphTransformNowBtn.onclick = async () => {
      if (pendingEditorSave) {
        clearTimeout(pendingEditorSave);
        pendingEditorSave = null;
      }
      await applyGlyphTransform();
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
      if (vm.status === "success") {
        await app.ui.screens.editorGlifos.loadTypeface(pid);
        setStatus("success", vm.data?.lastOperation ?? "Unicode asignado.");
      }
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
      if (vm.status === "success") {
        await app.ui.screens.editorGlifos.loadTypeface(pid);
        setStatus("success", vm.data?.lastOperation ?? "Metricas actualizadas.");
      }
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
      if (vm.status === "success") {
        await app.ui.screens.editorGlifos.loadTypeface(pid);
        setStatus("success", vm.data?.lastOperation ?? "Outline actualizado.");
      }
      else if (vm.error) setStatus("error", `${vm.error.code}: ${vm.error.message}`);
      render();
    };
  }

  const validateExportBtn = document.getElementById("validateExportBtn") as HTMLButtonElement | null;
  if (validateExportBtn) {
    validateExportBtn.onclick = async () => {
      await flushPendingEditorSave();
      const pid = ensureProjectId(); if (!pid) return;
      const before = {
        projectId: pid,
        route: state.route,
        status: state.status,
        exportFsm: app.ui.screens.exportacionTtf.getFsmState(),
        validacionScreen: app.ui.screens.validacionExportacion.getState(),
      };
      const vm = await app.ui.screens.validacionExportacion.validate(pid);
      const after = {
        projectId: pid,
        route: state.route,
        status: state.status,
        exportFsm: app.ui.screens.exportacionTtf.getFsmState(),
        validacionScreen: vm,
      };
      console.info("[EXPORT_TRACE][UI] validate-readiness", {
        projectId: pid,
        vmStatus: vm.status,
        errorCode: vm.error?.code,
        errors: vm.data?.errors.map((x) => x.code).slice(0, 20) ?? [],
        warnings: vm.data?.warnings.map((x) => x.code).slice(0, 20) ?? [],
      });
      downloadDiagnostic("validate-readiness", { before, after });
      const blockedByMissingImport =
        vm.status === "error" &&
        vm.error?.code === "EXPORT_BLOCKED_BY_READINESS" &&
        (vm.data?.errors ?? []).some((x) => x.code === "NO_OUTLINED_GLYPHS");
      if (vm.status === "success") {
        setStatus("success", "Readiness valido.");
      } else if (blockedByMissingImport) {
        state.route = "PrevisualizacionImportacion";
        setStatus(
          "warning",
          "Paso previo faltante: importa SVG y pulsa 'Confirmar aplicacion' antes de validar/exportar.",
        );
      } else if (vm.error) {
        setStatus("error", `${vm.error.code}: ${vm.error.message}`);
      }
      render();
    };
  }

  const exportTtfBtn = document.getElementById("exportTtfBtn") as HTMLButtonElement | null;
  if (exportTtfBtn) {
    exportTtfBtn.onclick = async () => {
      await flushPendingEditorSave();
      const pid = ensureProjectId(); if (!pid) return;
      const filename = (document.getElementById("exportFilename") as HTMLInputElement).value;
      const before = {
        projectId: pid,
        filename,
        route: state.route,
        status: state.status,
        exportFsm: app.ui.screens.exportacionTtf.getFsmState(),
        validacionScreen: app.ui.screens.validacionExportacion.getState(),
      };
      const vm = await app.ui.screens.exportacionTtf.export(pid, filename);
      const after = {
        projectId: pid,
        filename,
        route: state.route,
        status: state.status,
        exportFsm: app.ui.screens.exportacionTtf.getFsmState(),
        exportScreen: vm,
      };
      console.info("[EXPORT_TRACE][UI] export-ttf", {
        projectId: pid,
        filename,
        vmStatus: vm.status,
        errorCode: vm.error?.code,
        reportErrors: vm.data?.report?.errors.map((x) => x.code).slice(0, 20) ?? [],
        reportWarnings: vm.data?.report?.warnings.map((x) => x.code).slice(0, 20) ?? [],
      });
      downloadDiagnostic("export-ttf", { before, after });
      if (vm.status === "success") {
        const outName = vm.data?.filename ?? filename;
        setStatus("success", `Fuente exportada: ${outName} (${vm.data?.byteLength} bytes).`);
      } else if (vm.error?.code === "EXPORT_BLOCKED_BY_READINESS") {
        state.route = "PrevisualizacionImportacion";
        setStatus(
          "warning",
          "Exportacion bloqueada por flujo incompleto. Vuelve a PrevisualizacionImportacion y confirma la aplicacion.",
        );
      }
      else if (vm.error) setStatus("error", `${vm.error.code}: ${vm.error.message}`);
      render();
    };
  }

  const saveProjectBtn = document.getElementById("saveProjectBtn") as HTMLButtonElement | null;
  if (saveProjectBtn) {
    saveProjectBtn.onclick = async () => {
      await flushPendingEditorSave();
      const pid = ensureProjectId(); if (!pid) return;
      const vm = await app.ui.screens.guardarAbrirProyecto.save(pid, (document.getElementById("snapshotFilename") as HTMLInputElement).value);
      if (vm.status === "success") setStatus("success", "Snapshot guardado.");
      else if (vm.error) setStatus("error", `${vm.error.code}: ${vm.error.message}`);
      render();
    };
  }

  const linkSnapshotBtn = document.getElementById("linkSnapshotBtn") as HTMLButtonElement | null;
  if (linkSnapshotBtn) {
    linkSnapshotBtn.onclick = async () => {
      const suggested = (document.getElementById("snapshotFilename") as HTMLInputElement | null)?.value || "proyecto-tipografia.json";
      const linked = await app.facades.project.linkProjectFile(suggested);
      if (!linked.ok) {
        setStatus("error", `${linked.error.code}: ${linked.error.message}`);
        render();
        return;
      }
      state.linkedProjectFilename = linked.value.filename;
      setStatus("success", `Archivo vinculado: ${linked.value.filename}`);
      render();
    };
  }

  const openSnapshotBtn = document.getElementById("openSnapshotBtn") as HTMLButtonElement | null;
  if (openSnapshotBtn) {
    openSnapshotBtn.onclick = async () => {
      await flushPendingEditorSave();
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
