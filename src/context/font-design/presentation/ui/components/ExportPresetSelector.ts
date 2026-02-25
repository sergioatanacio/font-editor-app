export type ExportPresetOption = "minimal-latin" | "freeform";

export interface ExportPresetSelectorModel {
  selected: ExportPresetOption;
  options: readonly ExportPresetOption[];
}

export function createExportPresetSelector(selected: ExportPresetOption): ExportPresetSelectorModel {
  return {
    selected,
    options: ["minimal-latin", "freeform"],
  };
}
