import "./styles.css";
import { createFontDesignApp } from "../context/font-design/main";
import { mountActions } from "./actions";
import { clearStatus, createInitialState, routes, setStatus } from "./state";
import { renderLayout } from "./render";

const app = createFontDesignApp();
const rootNode = document.getElementById("app");
if (!rootNode) {
  throw new Error("Missing #app root");
}

const root: HTMLElement = rootNode;
const state = createInitialState();

function render(): void {
  root.innerHTML = renderLayout({
    app,
    state,
    routes,
  });

  mountActions({
    app,
    state,
    routes,
    render,
    setStatus: (kind, message) => setStatus(state, kind, message),
    clearStatus: () => clearStatus(state),
    ensureProjectId,
  });
}

function ensureProjectId(): string | null {
  if (state.projectId.trim()) return state.projectId;
  setStatus(state, "error", "Primero crea o abre un proyecto en InicioProyecto.");
  render();
  return null;
}

render();
