import type { Action, Direction } from "../types";

interface ShooterControlsProps {
  onAction: (action: Action) => void;
  onTick: () => void;
  onRefresh: () => void;
  facing?: Direction;
}

export function ShooterControls({ onAction, onTick, onRefresh, facing = "up" }: ShooterControlsProps) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
      <h2 className="font-semibold text-lg mb-3">Shooter Controls</h2>
      <div className="grid grid-cols-3 gap-2 max-w-[280px]">
        <button type="button" onClick={() => onAction({ type: "move", direction: "up" })} className="col-start-2 rounded bg-slate-800 hover:bg-slate-700 px-3 py-2">
          ↑
        </button>
        <button type="button" onClick={() => onAction({ type: "move", direction: "left" })} className="rounded bg-slate-800 hover:bg-slate-700 px-3 py-2">
          ←
        </button>
        <button type="button" onClick={() => onAction({ type: "wait" })} className="rounded bg-slate-700 hover:bg-slate-600 px-3 py-2">
          Wait
        </button>
        <button type="button" onClick={() => onAction({ type: "move", direction: "right" })} className="rounded bg-slate-800 hover:bg-slate-700 px-3 py-2">
          →
        </button>
        <button type="button" onClick={() => onAction({ type: "move", direction: "down" })} className="col-start-2 rounded bg-slate-800 hover:bg-slate-700 px-3 py-2">
          ↓
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          onClick={() => onAction({ type: "shoot" })}
          className="rounded bg-rose-500 hover:bg-rose-400 text-slate-950 font-medium px-4 py-2"
        >
          Shoot Forward
        </button>
        <button
          type="button"
          onClick={() => onAction({ type: "attack" })}
          className="rounded bg-orange-400 hover:bg-orange-300 text-slate-950 font-medium px-4 py-2"
        >
          Attack Nearest
        </button>
        <button
          type="button"
          onClick={() => onAction({ type: "build", buildType: "barricade", direction: facing })}
          className="rounded bg-violet-400 hover:bg-violet-300 text-slate-950 font-medium px-4 py-2"
        >
          Build Barricade
        </button>
        <button
          type="button"
          onClick={() => onAction({ type: "build", buildType: "ally_robot", direction: facing })}
          className="rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-medium px-4 py-2"
        >
          Deploy Helper Bot
        </button>
        <button
          type="button"
          onClick={() => onAction({ type: "build", buildType: "turret", direction: facing })}
          className="rounded bg-fuchsia-400 hover:bg-fuchsia-300 text-slate-950 font-medium px-4 py-2"
        >
          Build Turret
        </button>
        <button type="button" onClick={onTick} className="rounded bg-indigo-500 hover:bg-indigo-400 px-4 py-2">
          Manual Tick
        </button>
        <button type="button" onClick={onRefresh} className="rounded bg-slate-700 hover:bg-slate-600 px-4 py-2">
          Refresh
        </button>
      </div>
      <div className="mt-3 text-xs text-slate-400">
        Keyboard: <span className="text-slate-200">WASD / Arrows</span> move, <span className="text-slate-200">Space</span> shoot,{" "}
        <span className="text-slate-200">F</span> attack nearest, <span className="text-slate-200">1/2/3</span> build,{" "}
        <span className="text-slate-200">Enter</span> wait.
      </div>
    </div>
  );
}

export default ShooterControls;
