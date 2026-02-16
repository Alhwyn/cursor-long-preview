import { useEffect, useMemo, useRef } from "react";
import type { Direction, GameState, Vec2 } from "./types";

interface RaycastShooterCanvasProps {
  state: GameState | null;
  focusPlayerId?: string;
  width?: number;
  height?: number;
}

const FOV = Math.PI / 2.8;
const MAX_VIEW_DEPTH = 24;
const RAY_STEP = 0.05;

function facingToAngle(direction: Direction): number {
  switch (direction) {
    case "up":
      return -Math.PI / 2;
    case "down":
      return Math.PI / 2;
    case "left":
      return Math.PI;
    case "right":
      return 0;
    default:
      return 0;
  }
}

function normalizeAngle(angle: number): number {
  let value = angle;
  while (value <= -Math.PI) {
    value += Math.PI * 2;
  }
  while (value > Math.PI) {
    value -= Math.PI * 2;
  }
  return value;
}

function lineOfSightDistance(state: GameState, from: Vec2, angle: number): number {
  for (let depth = 0; depth <= MAX_VIEW_DEPTH; depth += RAY_STEP) {
    const x = from.x + Math.cos(angle) * depth;
    const y = from.y + Math.sin(angle) * depth;
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    if (tileX < 0 || tileY < 0 || tileX >= state.map.width || tileY >= state.map.height) {
      return depth;
    }
    const tile = state.map.tiles[tileY * state.map.width + tileX];
    if (!tile || tile.type === "wall") {
      return depth;
    }
  }
  return MAX_VIEW_DEPTH;
}

function colorForEntity(kind: "player" | "zombie" | "agent" | "turret", zombieType?: string): string {
  if (kind === "player") {
    return "#67e8f9";
  }
  if (kind === "agent") {
    return "#fef08a";
  }
  if (kind === "turret") {
    return "#f9a8d4";
  }
  if (zombieType === "mech") {
    return "#ef4444";
  }
  if (zombieType === "explosive") {
    return "#fb923c";
  }
  if (zombieType === "flying") {
    return "#facc15";
  }
  return "#f87171";
}

export function RaycastShooterCanvas({ state, focusPlayerId, width = 980, height = 560 }: RaycastShooterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const focusPlayer = useMemo(() => {
    if (!state) {
      return null;
    }
    const selected = focusPlayerId ? state.players[focusPlayerId] : undefined;
    if (selected?.alive) {
      return selected;
    }
    return (
      Object.values(state.players)
        .filter(player => player.alive)
        .sort((a, b) => a.id.localeCompare(b.id))[0] ?? null
    );
  }, [focusPlayerId, state]);

  const spriteEntities = useMemo(() => {
    if (!state || !focusPlayer) {
      return [];
    }
    const playerId = focusPlayer.id;
    return [
      ...Object.values(state.players)
        .filter(player => player.id !== playerId && player.alive)
        .map(player => ({ kind: "player" as const, id: player.id, x: player.position.x + 0.5, y: player.position.y + 0.5, hp: player.hp })),
      ...Object.values(state.zombies)
        .filter(robot => robot.alive)
        .map(robot => ({
          kind: "zombie" as const,
          id: robot.id,
          zombieType: robot.zombieType,
          x: robot.position.x + 0.5,
          y: robot.position.y + 0.5,
          hp: robot.hp,
        })),
      ...Object.values(state.builtRobots)
        .filter(robot => robot.alive)
        .map(robot => ({ kind: "agent" as const, id: robot.id, x: robot.position.x + 0.5, y: robot.position.y + 0.5, hp: robot.hp })),
      ...Object.values(state.turrets)
        .filter(turret => turret.alive)
        .map(turret => ({ kind: "turret" as const, id: turret.id, x: turret.position.x + 0.5, y: turret.position.y + 0.5, hp: turret.hp })),
      ...(state.companion?.alive
        ? [{ kind: "agent" as const, id: state.companion.id, x: state.companion.position.x + 0.5, y: state.companion.position.y + 0.5, hp: state.companion.hp }]
        : []),
    ];
  }, [focusPlayer, state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !state || !focusPlayer) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const playerX = focusPlayer.position.x + 0.5;
    const playerY = focusPlayer.position.y + 0.5;
    const playerAngle = facingToAngle(focusPlayer.facing);

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);

    const sky = ctx.createLinearGradient(0, 0, 0, height * 0.55);
    sky.addColorStop(0, "#091528");
    sky.addColorStop(1, "#132347");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height * 0.55);

    const floor = ctx.createLinearGradient(0, height * 0.5, 0, height);
    floor.addColorStop(0, "#10131d");
    floor.addColorStop(1, "#05070d");
    ctx.fillStyle = floor;
    ctx.fillRect(0, height * 0.5, width, height * 0.5);

    const depthBuffer = new Array<number>(width).fill(MAX_VIEW_DEPTH);
    const projectionPlane = width / (2 * Math.tan(FOV / 2));

    for (let column = 0; column < width; column += 1) {
      const cameraOffset = column / width - 0.5;
      const rayAngle = playerAngle + cameraOffset * FOV;
      const rawDistance = lineOfSightDistance(state, { x: playerX, y: playerY }, rayAngle);
      const correctedDistance = Math.max(0.001, rawDistance * Math.cos(rayAngle - playerAngle));
      depthBuffer[column] = correctedDistance;

      const wallHeight = Math.min(height * 0.9, (projectionPlane * 1.1) / correctedDistance);
      const wallTop = Math.max(0, height * 0.5 - wallHeight * 0.5);
      const shade = Math.max(28, 210 - correctedDistance * 16);
      ctx.fillStyle = `rgb(${shade}, ${Math.max(20, shade - 18)}, ${Math.max(35, shade - 52)})`;
      ctx.fillRect(column, wallTop, 1, wallHeight);
    }

    const sortedSprites = spriteEntities
      .map(sprite => {
        const dx = sprite.x - playerX;
        const dy = sprite.y - playerY;
        const distance = Math.hypot(dx, dy);
        const angle = normalizeAngle(Math.atan2(dy, dx) - playerAngle);
        return {
          ...sprite,
          distance,
          angle,
        };
      })
      .filter(sprite => Math.abs(sprite.angle) <= FOV * 0.58 && sprite.distance > 0.01)
      .sort((a, b) => b.distance - a.distance);

    for (const sprite of sortedSprites) {
      const projectedX = (sprite.angle / FOV + 0.5) * width;
      const spriteScale = projectionPlane / Math.max(0.2, sprite.distance);
      const spriteWidth = Math.max(8, spriteScale * 0.42);
      const spriteHeight = Math.max(10, spriteScale * 0.76);
      const left = Math.floor(projectedX - spriteWidth / 2);
      const top = Math.floor(height * 0.5 - spriteHeight / 2);
      const columnIndex = Math.max(0, Math.min(width - 1, Math.floor(projectedX)));
      const occlusionDepth = depthBuffer[columnIndex] ?? MAX_VIEW_DEPTH;
      if (sprite.distance >= occlusionDepth) {
        continue;
      }

      ctx.fillStyle = colorForEntity(sprite.kind, "zombieType" in sprite ? sprite.zombieType : undefined);
      ctx.fillRect(left, top, spriteWidth, spriteHeight);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(left + 2, top + 5, Math.max(2, spriteWidth - 4), 2);
      ctx.fillStyle = "#dcfce7";
      ctx.font = "10px monospace";
      ctx.fillText(sprite.id, left, top - 4);
    }

    const miniMapScale = 5;
    const miniX = 18;
    const miniY = 18;
    const miniW = state.map.width * miniMapScale;
    const miniH = state.map.height * miniMapScale;
    ctx.fillStyle = "rgba(2, 6, 23, 0.78)";
    ctx.fillRect(miniX - 6, miniY - 6, miniW + 12, miniH + 12);

    for (const tile of state.map.tiles) {
      ctx.fillStyle = tile.type === "wall" ? "#334155" : "#14532d";
      ctx.fillRect(miniX + tile.x * miniMapScale, miniY + tile.y * miniMapScale, miniMapScale, miniMapScale);
    }
    const miniPlayerX = miniX + playerX * miniMapScale;
    const miniPlayerY = miniY + playerY * miniMapScale;
    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(miniPlayerX - 2, miniPlayerY - 2, 4, 4);
    ctx.strokeStyle = "#22d3ee";
    ctx.beginPath();
    ctx.moveTo(miniPlayerX, miniPlayerY);
    ctx.lineTo(miniPlayerX + Math.cos(playerAngle) * 8, miniPlayerY + Math.sin(playerAngle) * 8);
    ctx.stroke();

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "12px monospace";
    ctx.fillText("3D Terminator View", 16, height - 16);
  }, [focusPlayer, height, spriteEntities, state, width]);

  return (
    <div className="rounded-xl border border-cyan-400/30 bg-slate-950 p-2 shadow-[0_0_45px_rgba(34,211,238,0.12)]">
      {!state || !focusPlayer ? (
        <div className="h-[520px] flex items-center justify-center text-slate-400">Join a session to enter the 3D battlefield.</div>
      ) : (
        <canvas ref={canvasRef} width={width} height={height} className="w-full rounded-lg bg-slate-900" />
      )}
    </div>
  );
}

export default RaycastShooterCanvas;
