import type { GlyphOutlineSnapshot } from "../context/font-design/domain/ports";

export interface DraftTransform {
  moveX: number;
  moveY: number;
  scale: number;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function transformPoint(
  x: number,
  y: number,
  t: DraftTransform,
  pivotX: number,
  pivotY: number,
): [number, number] {
  const sx = pivotX + (x - pivotX) * t.scale + t.moveX;
  const sy = pivotY + (y - pivotY) * t.scale + t.moveY;
  return [round4(sx), round4(sy)];
}

export function applyTransformToOutline(
  outline: GlyphOutlineSnapshot,
  transform: DraftTransform,
  pivotX: number,
  pivotY: number,
): GlyphOutlineSnapshot {
  if (Math.abs(transform.moveX) < 1e-6 && Math.abs(transform.moveY) < 1e-6 && Math.abs(transform.scale - 1) < 1e-6) {
    return outline;
  }
  return {
    contours: outline.contours.map((contour) =>
      contour.map((cmd) => {
        if (cmd.type === "Z" || cmd.values.length === 0) {
          return { type: cmd.type, values: [] };
        }
        const values: number[] = [];
        for (let i = 0; i + 1 < cmd.values.length; i += 2) {
          const [nx, ny] = transformPoint(cmd.values[i], cmd.values[i + 1], transform, pivotX, pivotY);
          values.push(nx, ny);
        }
        return { type: cmd.type, values };
      }),
    ),
  };
}

