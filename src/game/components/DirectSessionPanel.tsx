interface DirectSessionPanelProps {
  busy: boolean;
  playerName: string;
  onPlayerNameChange: (next: string) => void;
  sessionInput: string;
  onSessionInputChange: (next: string) => void;
  serverInput: string;
  onServerInputChange: (next: string) => void;
  sessionId: string;
  playerId: string;
  onJoinGame: () => void;
}

export function DirectSessionPanel({
  busy,
  playerName,
  onPlayerNameChange,
  sessionInput,
  onSessionInputChange,
  serverInput,
  onServerInputChange,
  sessionId,
  playerId,
  onJoinGame,
}: DirectSessionPanelProps) {
  return (
    <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-4 space-y-3">
      <h2 className="font-semibold text-lg">Direct Session (quick shooter join)</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm text-slate-300">
          Player Name
          <input
            value={playerName}
            onChange={event => onPlayerNameChange(event.target.value)}
            className="mt-1 w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
          />
        </label>
        <label className="text-sm text-slate-300">
          Existing Session (optional)
          <input
            value={sessionInput}
            onChange={event => onSessionInputChange(event.target.value)}
            className="mt-1 w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
          />
        </label>
        <label className="text-sm text-slate-300 sm:col-span-2">
          Server ID (optional)
          <input
            value={serverInput}
            onChange={event => onServerInputChange(event.target.value)}
            className="mt-1 w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={onJoinGame}
        className="rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-4 py-2 font-medium text-slate-950"
      >
        {busy ? "Working..." : "Join Game"}
      </button>
      <div className="text-sm text-slate-400">
        Session: <span className="text-slate-200">{sessionId || "—"}</span> | Player: <span className="text-slate-200">{playerId || "—"}</span>
      </div>
    </div>
  );
}

export default DirectSessionPanel;
