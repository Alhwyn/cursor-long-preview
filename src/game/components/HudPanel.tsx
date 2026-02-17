import type { GameState, Player } from "../types";

interface HudPanelProps {
  state: GameState | null;
  self: Player | null;
  aliveTerminators: number;
  partyMemberCount?: number;
}

export function HudPanel({ state, self, aliveTerminators, partyMemberCount }: HudPanelProps) {
  const activeRobots = state ? Object.values(state.builtRobots).filter(robot => robot.alive).length : 0;
  const activeTurrets = state ? Object.values(state.turrets).filter(turret => turret.alive).length : 0;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-2">
      <h2 className="font-semibold text-lg">HUD</h2>
      <div className="text-sm text-slate-300">Status: {state?.status ?? "idle"}</div>
      <div className="text-sm text-slate-300">Tick: {state?.tick ?? 0}</div>
      <div className="text-sm text-slate-300">Mode: {state?.mode ?? "—"}</div>
      <div className="text-sm text-slate-300">Wave: {state?.wave ?? 0}</div>
      <div className="text-sm text-slate-300">Map: {state ? `${state.map.width}×${state.map.height}` : "—"}</div>
      <div className="text-sm text-slate-300">Scrap: {state?.scrap ?? 0}</div>
      <div className="text-sm text-slate-300">Built Robots: {activeRobots}</div>
      <div className="text-sm text-slate-300">Turrets: {activeTurrets}</div>
      <div className="text-sm text-slate-300">HP: {self ? `${self.hp}/${self.maxHp}` : "—"}</div>
      <div className="text-sm text-slate-300">Facing: {self?.facing ?? "—"}</div>
      <div className="text-sm text-slate-300">Terminators Active: {aliveTerminators}</div>
      <div className="text-sm text-slate-300">
        Claude Bot Companion:{" "}
        {state?.companion
          ? `${state.companion.alive ? "active" : "down"} (${state.companion.hp}/${state.companion.maxHp}) • ${state.companion.emote}`
          : "off"}
      </div>
      <div className="text-sm text-slate-300">
        Party Mode: {partyMemberCount !== undefined ? `${partyMemberCount}/4` : "No active party"}
      </div>
      {state?.status === "won" ? <div className="text-emerald-400 font-medium">You survived. Terminator robot wave cleared.</div> : null}
      {state?.status === "lost" ? <div className="text-rose-400 font-medium">All survivors are down.</div> : null}
    </div>
  );
}

export default HudPanel;
