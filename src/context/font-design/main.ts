import {
  CreateTypefaceUseCase,
  PreviewTemplateImportUseCase,
  CommitTemplateImportPreviewUseCase,
  ExportTypefaceToTtfUseCase,
  ProjectFacade,
  ImportFacade,
  ExportFacade,
  UpdateTypefaceMetadataUseCase,
  UpdateTypefaceMetricsUseCase,
  AssignUnicodeToGlyphUseCase,
  ReplaceGlyphOutlineUseCase,
  UpdateGlyphMetricsUseCase,
  GenerateTemplateSvgUseCase,
  SaveProjectToFileUseCase,
  LoadProjectFromFileUseCase,
  ValidateTypefaceForExportUseCase,
  TypefaceFacade,
  TemplateFacade,
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
  SvgTemplateExporterAdapter,
  StubTemplateExporter,
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
    typeface: TypefaceFacade;
    template: TemplateFacade;
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
  const templateExporter = isBrowser ? new SvgTemplateExporterAdapter() : new StubTemplateExporter();

  const createTypeface = new CreateTypefaceUseCase(projectRepository, clock, idGenerator);
  const updateTypefaceMetadata = new UpdateTypefaceMetadataUseCase(projectRepository, clock);
  const updateTypefaceMetrics = new UpdateTypefaceMetricsUseCase(projectRepository, clock);

  const assignUnicode = new AssignUnicodeToGlyphUseCase(projectRepository, clock);
  const replaceGlyphOutline = new ReplaceGlyphOutlineUseCase(projectRepository, clock);
  const updateGlyphMetrics = new UpdateGlyphMetricsUseCase(projectRepository, clock);

  const generateTemplateSvg = new GenerateTemplateSvgUseCase(projectRepository, templateExporter, clock);

  const saveProjectToFile = new SaveProjectToFileUseCase(projectRepository, serializer, fileSystemGateway);
  const loadProjectFromFile = new LoadProjectFromFileUseCase(fileSystemGateway, serializer, projectRepository);

  const previewTemplateImport = new PreviewTemplateImportUseCase(projectRepository, svgImporter, previewStore, clock);
  const commitTemplateImport = new CommitTemplateImportPreviewUseCase(projectRepository, previewStore, clock);

  const validateTypefaceForExport = new ValidateTypefaceForExportUseCase(projectRepository);
  const exportTypefaceToTtf = new ExportTypefaceToTtfUseCase(projectRepository, ttfExporter, fileSystemGateway);

  const projectFacade = new ProjectFacade(
    createTypeface,
    updateTypefaceMetadata,
    updateTypefaceMetrics,
    saveProjectToFile,
    loadProjectFromFile,
    projectRepository,
    serializer,
    fileSystemGateway,
    clock,
  );

  const typefaceFacade = new TypefaceFacade(assignUnicode, replaceGlyphOutline, updateGlyphMetrics);
  const templateFacade = new TemplateFacade(generateTemplateSvg, fileSystemGateway);

  const importFacade = new ImportFacade(previewTemplateImport, commitTemplateImport);
  const exportFacade = new ExportFacade(exportTypefaceToTtf, validateTypefaceForExport);

  const ui = new UiController({
    inicioProyecto: new InicioProyectoScreen(projectFacade),
    configuracionFuente: new ConfiguracionFuenteScreen(projectFacade),
    plantillaSvg: new PlantillaSvgScreen(templateFacade),
    importacionSvg: new ImportacionSvgScreen(importFacade),
    previsualizacionImportacion: new PrevisualizacionImportacionScreen(importFacade),
    editorGlifos: new EditorGlifosScreen(typefaceFacade),
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
      typeface: typefaceFacade,
      template: templateFacade,
    },
  };
}
