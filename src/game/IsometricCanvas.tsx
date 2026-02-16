import { useEffect, useMemo, useRef } from "react";
import type { GameState, ObservationEntity } from "./types";

interface IsometricCanvasProps {
  state: GameState | null;
  width?: number;
  height?: number;
}

const TILE_WIDTH = 52;
const TILE_HEIGHT = 26;

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
  topFill: string,
  leftFill: string,
  rightFill: string,
  stroke: string,
  height = 10,
): void {
  const halfW = TILE_WIDTH / 2;
  const halfH = TILE_HEIGHT / 2;

  // Top face
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - halfH - height);
  ctx.lineTo(centerX + halfW, centerY - height);
  ctx.lineTo(centerX, centerY + halfH - height);
  ctx.lineTo(centerX - halfW, centerY - height);
  ctx.closePath();
  ctx.fillStyle = topFill;
  ctx.fill();

  // Left face
  ctx.beginPath();
  ctx.moveTo(centerX - halfW, centerY - height);
  ctx.lineTo(centerX, centerY + halfH - height);
  ctx.lineTo(centerX, centerY + halfH);
  ctx.lineTo(centerX - halfW, centerY);
  ctx.closePath();
  ctx.fillStyle = leftFill;
  ctx.fill();

  // Right face
  ctx.beginPath();
  ctx.moveTo(centerX + halfW, centerY - height);
  ctx.lineTo(centerX, centerY + halfH - height);
  ctx.lineTo(centerX, centerY + halfH);
  ctx.lineTo(centerX + halfW, centerY);
  ctx.closePath();
  ctx.fillStyle = rightFill;
  ctx.fill();

  ctx.lineWidth = 1;
  ctx.strokeStyle = stroke;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - halfH - height);
  ctx.lineTo(centerX + halfW, centerY - height);
  ctx.lineTo(centerX, centerY + halfH - height);
  ctx.lineTo(centerX - halfW, centerY - height);
  ctx.closePath();
  ctx.stroke();
}

function drawEntity(
  ctx: CanvasRenderingContext2D,
  entity: ObservationEntity,
  centerX: number,
  centerY: number,
  isDead: boolean,
): void {
  const bodyWidth = entity.kind === "player" ? 16 : entity.kind === "agent" ? 18 : 14;
  const baseZombieSize = entity.zombieType === "giant" ? 22 : entity.zombieType === "fast" ? 12 : 14;
  const bodyHeight =
    entity.kind === "player" ? 22 : entity.kind === "agent" ? 20 : entity.zombieType === "giant" ? 28 : 18;
  const fill =
    entity.kind === "player"
      ? "#5eead4"
      : entity.kind === "agent"
        ? "#fde68a"
        : entity.zombieType === "fast"
          ? "#f59e0b"
          : entity.zombieType === "explosive"
            ? "#f97316"
            : entity.zombieType === "giant"
              ? "#dc2626"
              : "#fb7185";
  const resolvedBodyWidth = entity.kind === "zombie" ? baseZombieSize : bodyWidth;
  const deadFill = "#6b7280";
  const px = centerX - resolvedBodyWidth / 2;
  const py = centerY - bodyHeight - 18;
  const hpRatio = Math.max(0, Math.min(1, entity.hp / Math.max(1, entity.maxHp)));

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#020617";
  ctx.beginPath();
  ctx.ellipse(centerX, centerY - 4, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.fillStyle = isDead ? deadFill : fill;
  ctx.fillRect(px, py, resolvedBodyWidth, bodyHeight);
  ctx.fillStyle = isDead ? "#475569" : "#0f172a";
  ctx.fillRect(px + 2, py + 5, resolvedBodyWidth - 4, 2);
  ctx.fillRect(px + 2, py + bodyHeight - 4, resolvedBodyWidth - 4, 2);
  if (entity.kind === "agent" && !isDead) {
    ctx.fillStyle = "#111827";
    ctx.fillRect(px + 3, py + 8, 2, 2);
    ctx.fillRect(px + resolvedBodyWidth - 5, py + 8, 2, 2);
    ctx.fillRect(px + Math.floor(resolvedBodyWidth / 2) - 2, py + 13, 4, 2);
  }

  // HP bar
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(px - 1, py - 8, resolvedBodyWidth + 2, 4);
  ctx.fillStyle = hpRatio > 0.5 ? "#22c55e" : hpRatio > 0.25 ? "#f59e0b" : "#f43f5e";
  ctx.fillRect(px, py - 7, resolvedBodyWidth * hpRatio, 2.5);
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
    const companion = state.companion
      ? [
          {
            ...state.companion,
            kind: "agent" as const,
          },
        ]
      : [];

    return [...players, ...zombies, ...companion].sort((a, b) => {
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
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#0b1220");
    sky.addColorStop(1, "#040814");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.1;
    for (let line = 0; line < height; line += 4) {
      ctx.fillStyle = line % 8 === 0 ? "#0f172a" : "#111827";
      ctx.fillRect(0, line, width, 1);
    }
    ctx.globalAlpha = 1;

    const originX = width / 2;
    const originY = 112;

    for (const tile of state.map.tiles) {
      const { sx, sy } = toScreen(tile.x, tile.y, originX, originY);
      if (tile.type === "wall") {
        drawTile(ctx, sx, sy, "#546177", "#3f4a5f", "#313a4a", "#111827", 18);
      } else {
        const hueShift = ((tile.x + tile.y) % 3) - 1;
        const top = hueShift === -1 ? "#2a8f63" : hueShift === 0 ? "#2f9e6d" : "#35ad78";
        drawTile(ctx, sx, sy, top, "#246f51", "#2a7f5c", "#0f4f3a", 8);
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
        sy - 2,
        !entity.alive,
      );
    }
  }, [entities, height, state, width]);

  return (
    <div className="rounded-xl border border-emerald-400/20 bg-slate-950 p-2 overflow-auto shadow-[0_0_45px_rgba(16,185,129,0.08)]">
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
