import { useEffect, useMemo, useRef } from "react";
import type { GameState, ObservationEntity } from "./types";

interface IsometricCanvasProps {
  state: GameState | null;
  width?: number;
  height?: number;
}

const TILE_WIDTH = 48;
const TILE_HEIGHT = 24;

function toScreen(x: number, y: number, originX: number, originY: number): { sx: number; sy: number } {
  return {
    sx: (x - y) * (TILE_WIDTH / 2) + originX,
    sy: (x + y) * (TILE_HEIGHT / 2) + originY,
  };
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  fill: string,
  stroke: string,
  alpha = 1,
): void {
  const halfW = TILE_WIDTH / 2;
  const halfH = TILE_HEIGHT / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - halfH);
  ctx.lineTo(centerX + halfW, centerY);
  ctx.lineTo(centerX, centerY + halfH);
  ctx.lineTo(centerX - halfW, centerY);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.restore();
}

function drawEntity(
  ctx: CanvasRenderingContext2D,
  entity: ObservationEntity,
  centerX: number,
  centerY: number,
  isDead: boolean,
): void {
  const bodyWidth = entity.kind === "player" ? 14 : 12;
  const bodyHeight = entity.kind === "player" ? 18 : 14;
  const fill = entity.kind === "player" ? "#62d2a2" : "#ff6b7f";
  const deadFill = "#7f8899";
  const px = centerX - bodyWidth / 2;
  const py = centerY - bodyHeight - 6;

  ctx.save();
  ctx.fillStyle = isDead ? deadFill : fill;
  ctx.fillRect(px, py, bodyWidth, bodyHeight);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(px + 2, py + 4, bodyWidth - 4, 2);
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(centerX - 8, centerY - 2, 16, 4);
  ctx.restore();
}

export function IsometricCanvas({ state, width = 920, height = 560 }: IsometricCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const entities = useMemo(() => {
    if (!state) {
      return [];
    }

    const players = Object.values(state.players).map(entity => ({
      ...entity,
      kind: "player" as const,
    }));
    const zombies = Object.values(state.zombies).map(entity => ({
      ...entity,
      kind: "zombie" as const,
    }));

    return [...players, ...zombies].sort((a, b) => {
      const depthA = a.position.x + a.position.y;
      const depthB = b.position.x + b.position.y;
      if (depthA !== depthB) {
        return depthA - depthB;
      }
      return a.id.localeCompare(b.id);
    });
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !state) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0a0f1f";
    ctx.fillRect(0, 0, width, height);

    const originX = width / 2;
    const originY = 84;

    for (const tile of state.map.tiles) {
      const { sx, sy } = toScreen(tile.x, tile.y, originX, originY);
      if (tile.type === "wall") {
        drawTile(ctx, sx, sy, "#30374a", "#111827", 0.9);
      } else {
        drawTile(ctx, sx, sy, "#1f8a5b", "#0e5a39", 0.92);
      }
    }

    for (const entity of entities) {
      const { sx, sy } = toScreen(entity.position.x, entity.position.y, originX, originY);
      drawEntity(
        ctx,
        {
          id: entity.id,
          kind: entity.kind,
          name: "name" in entity ? entity.name : undefined,
          x: entity.position.x,
          y: entity.position.y,
          hp: entity.hp,
          maxHp: entity.maxHp,
          alive: entity.alive,
        },
        sx,
        sy,
        !entity.alive,
      );
    }
  }, [entities, height, state, width]);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 p-2 overflow-auto">
      {!state ? (
        <div className="h-[520px] w-full min-w-[820px] flex items-center justify-center text-slate-400">
          Join a session to render the world.
        </div>
      ) : (
        <canvas ref={canvasRef} width={width} height={height} className="min-w-[820px] rounded-lg bg-slate-900" />
      )}
    </div>
  );
}

export default IsometricCanvas;
