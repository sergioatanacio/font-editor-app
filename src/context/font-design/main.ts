import {
  CreateTypefaceUseCase,
  PreviewTemplateImportUseCase,
  CommitTemplateImportPreviewUseCase,
  ExportTypefaceToTtfUseCase,
  ProjectFacade,
  ImportFacade,
  ExportFacade,
} from "./application";
import {
  InMemoryImportPreviewStore,
  InMemoryProjectRepository,
  JsonProjectSerializer,
  IndexedDbProjectRepositoryAdapter,
  JsonProjectSerializerAdapter,
  BrowserFileSystemGatewayAdapter,
  InMemoryFileSystemGateway,
  SystemClock,
  FixedClock,
  WebCryptoIdGeneratorAdapter,
  IncrementalIdGenerator,
  SvgGlyphVectorImporterAdapter,
  StubGlyphVectorImporter,
  SvgImportWorkerAdapter,
  TtfExporterAdapter,
  StubFontBinaryExporter,
  ImportPreviewStoreAdapter,
} from "./infrastructure";
import {
  UiController,
  InicioProyectoScreen,
  ConfiguracionFuenteScreen,
  PlantillaSvgScreen,
  ImportacionSvgScreen,
  PrevisualizacionImportacionScreen,
  EditorGlifosScreen,
  ValidacionExportacionScreen,
  ExportacionTtfScreen,
  GuardarAbrirProyectoScreen,
  PanelErroresScreen,
} from "./presentation";

export interface FontDesignApp {
  ui: UiController;
  facades: {
    project: ProjectFacade;
    import: ImportFacade;
    export: ExportFacade;
  };
}

export function createFontDesignApp(): FontDesignApp {
  const isBrowser = typeof window !== "undefined";

  const projectRepository = isBrowser && typeof indexedDB !== "undefined"
    ? new IndexedDbProjectRepositoryAdapter()
    : new InMemoryProjectRepository();

  const previewStore = isBrowser
    ? new ImportPreviewStoreAdapter()
    : new InMemoryImportPreviewStore();

  const serializer = isBrowser
    ? new JsonProjectSerializerAdapter()
    : new JsonProjectSerializer();

  const fileSystemGateway = isBrowser
    ? new BrowserFileSystemGatewayAdapter()
    : new InMemoryFileSystemGateway();

  const clock = isBrowser
    ? new SystemClock()
    : new FixedClock("2026-01-01T00:00:00.000Z");

  const idGenerator = isBrowser && typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? new WebCryptoIdGeneratorAdapter()
    : new IncrementalIdGenerator(1, "local");

  const svgImporterBase = isBrowser ? new SvgGlyphVectorImporterAdapter() : new StubGlyphVectorImporter();
  const svgImporter = isBrowser && typeof Worker !== "undefined"
    ? new SvgImportWorkerAdapter(svgImporterBase)
    : svgImporterBase;

  const ttfExporter = isBrowser ? new TtfExporterAdapter() : new StubFontBinaryExporter();

  const createTypeface = new CreateTypefaceUseCase(projectRepository, clock, idGenerator);
  const previewTemplateImport = new PreviewTemplateImportUseCase(projectRepository, svgImporter, previewStore, clock);
  const commitTemplateImport = new CommitTemplateImportPreviewUseCase(projectRepository, previewStore, clock);
  const exportTypefaceToTtf = new ExportTypefaceToTtfUseCase(projectRepository, ttfExporter, fileSystemGateway);

  const projectFacade = new ProjectFacade(createTypeface, projectRepository, serializer, fileSystemGateway, clock);
  const importFacade = new ImportFacade(previewTemplateImport, commitTemplateImport);
  const exportFacade = new ExportFacade(exportTypefaceToTtf, projectRepository);

  const ui = new UiController({
    inicioProyecto: new InicioProyectoScreen(projectFacade),
    configuracionFuente: new ConfiguracionFuenteScreen(),
    plantillaSvg: new PlantillaSvgScreen(),
    importacionSvg: new ImportacionSvgScreen(importFacade),
    previsualizacionImportacion: new PrevisualizacionImportacionScreen(importFacade),
    editorGlifos: new EditorGlifosScreen(),
    validacionExportacion: new ValidacionExportacionScreen(exportFacade),
    exportacionTtf: new ExportacionTtfScreen(exportFacade),
    guardarAbrirProyecto: new GuardarAbrirProyectoScreen(projectFacade),
    panelErrores: new PanelErroresScreen(),
  });

  return {
    ui,
    facades: {
      project: projectFacade,
      import: importFacade,
      export: exportFacade,
    },
  };
}
