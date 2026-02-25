import type { ProjectSerializer, TypefaceProjectSnapshot } from "../../domain/ports";

export class JsonProjectSerializer implements ProjectSerializer {
  serialize(project: TypefaceProjectSnapshot): string {
    return JSON.stringify(project, null, 2);
  }

  deserialize(raw: string): TypefaceProjectSnapshot {
    return JSON.parse(raw) as TypefaceProjectSnapshot;
  }
}
