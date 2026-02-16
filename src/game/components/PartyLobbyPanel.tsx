import type { PartySnapshot } from "../api";

interface PartyLobbyPanelProps {
  busy: boolean;
  playerName: string;
  onPlayerNameChange: (next: string) => void;
  partyCodeInput: string;
  onPartyCodeInputChange: (next: string) => void;
  party: PartySnapshot | null;
  playerId: string;
  realtimeStatus: "offline" | "connecting" | "live" | "degraded";
  selfReady?: boolean;
  canStartParty: boolean;
  onCreateParty: () => void;
  onJoinParty: () => void;
  onToggleReady: () => void;
  onStartParty: () => void;
  onLeaveParty: () => void;
}

export function PartyLobbyPanel({
  busy,
  playerName,
  onPlayerNameChange,
  partyCodeInput,
  onPartyCodeInputChange,
  party,
  playerId,
  realtimeStatus,
  selfReady,
  canStartParty,
  onCreateParty,
  onJoinParty,
  onToggleReady,
  onStartParty,
  onLeaveParty,
}: PartyLobbyPanelProps) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
      <h2 className="font-semibold text-lg">Party Lobby (4 players)</h2>
      <div className="grid gap-2">
        <input
          value={playerName}
          onChange={event => onPlayerNameChange(event.target.value)}
          className="rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
          placeholder="Display name"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCreateParty}
            className="rounded bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 px-3 py-2 font-medium"
          >
            Create Party
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onJoinParty}
            className="rounded bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 px-3 py-2 font-medium"
          >
            Join by Code
          </button>
        </div>
        <input
          value={partyCodeInput}
          onChange={event => onPartyCodeInputChange(event.target.value.toUpperCase())}
          className="rounded-md bg-slate-950 border border-slate-700 px-3 py-2 tracking-[0.25em] uppercase"
          placeholder="PARTY CODE"
          maxLength={8}
        />
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 space-y-2">
        <div className="text-xs uppercase tracking-wide text-slate-400">Realtime</div>
        <div
          className={`text-sm font-medium ${
            realtimeStatus === "live"
              ? "text-emerald-300"
              : realtimeStatus === "connecting"
                ? "text-amber-300"
                : realtimeStatus === "degraded"
                  ? "text-rose-300"
                  : "text-slate-400"
          }`}
        >
          {realtimeStatus}
        </div>
        <div className="text-xs text-slate-500">Status auto-updates for party and match events.</div>
      </div>

      {party ? (
        <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 space-y-2">
          <div className="text-xs uppercase tracking-wide text-slate-400">Party</div>
          <div className="text-sm">
            Code: <span className="font-semibold tracking-[0.2em]">{party.partyCode}</span>
          </div>
          <div className="text-sm">
            Members: {party.members.length}/{party.maxPlayers} | Ready: {party.readyCount}/{party.members.length}
          </div>
          <div className="space-y-1">
            {party.members.map(member => (
              <div key={member.playerId} className="flex items-center justify-between text-sm">
                <span className="truncate">
                  {member.playerName}
                  {member.playerId === party.leaderPlayerId ? " (Leader)" : ""}
                  {member.playerId === playerId ? " (You)" : ""}
                </span>
                <span className={member.ready ? "text-emerald-300" : "text-amber-300"}>{member.ready ? "Ready" : "Not Ready"}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={busy || party.status !== "open"}
              onClick={onToggleReady}
              className="rounded bg-violet-500 hover:bg-violet-400 disabled:opacity-60 px-3 py-1 text-sm font-medium text-slate-950"
            >
              {selfReady ? "Unready" : "Ready Up"}
            </button>
            <button
              type="button"
              disabled={busy || !canStartParty}
              onClick={onStartParty}
              className="rounded bg-amber-400 hover:bg-amber-300 disabled:opacity-60 px-3 py-1 text-sm font-medium text-slate-950"
            >
              Start Match
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onLeaveParty}
              className="rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-60 px-3 py-1 text-sm"
            >
              Leave Party
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default PartyLobbyPanel;
