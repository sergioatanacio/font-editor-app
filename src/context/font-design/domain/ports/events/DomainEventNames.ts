export const DomainEventNames = {
  ProjectCreated: "ProjectCreated",
  ProjectLoaded: "ProjectLoaded",
  ProjectSavedToFile: "ProjectSavedToFile",
  ImportPreviewGenerated: "ImportPreviewGenerated",
  ImportCommitted: "ImportCommitted",
  ExportReadinessEvaluated: "ExportReadinessEvaluated",
  TypefaceExported: "TypefaceExported",
} as const;

export type DomainEventName = typeof DomainEventNames[keyof typeof DomainEventNames];

