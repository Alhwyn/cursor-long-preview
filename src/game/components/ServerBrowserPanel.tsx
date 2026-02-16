interface LobbyServer {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  maxPlayers: number;
  currentPlayers: number;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
}

interface ServerBrowserPanelProps {
  supabaseMode: "enabled" | "disabled";
  authToken: string;
  onAuthTokenChange: (next: string) => void;
  serverName: string;
  onServerNameChange: (next: string) => void;
  servers: LobbyServer[];
  onCreateServer: () => void;
  onRefreshServers: () => void;
  onJoinServer: (serverId: string) => void;
}

export function ServerBrowserPanel({
  supabaseMode,
  authToken,
  onAuthTokenChange,
  serverName,
  onServerNameChange,
  servers,
  onCreateServer,
  onRefreshServers,
  onJoinServer,
}: ServerBrowserPanelProps) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
      <h2 className="font-semibold text-lg">Servers ({supabaseMode})</h2>
      <label className="text-sm text-slate-300 block">
        Supabase Bearer Token (optional, required in enabled mode for create)
        <input
          value={authToken}
          onChange={event => onAuthTokenChange(event.target.value)}
          className="mt-1 w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
        />
      </label>
      <div className="grid gap-2">
        <input
          value={serverName}
          onChange={event => onServerNameChange(event.target.value)}
          className="rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
          placeholder="Server name"
        />
        <div className="flex gap-2">
          <button type="button" onClick={onCreateServer} className="rounded bg-amber-400 text-slate-950 px-3 py-2 font-medium">
            Create Server
          </button>
          <button type="button" onClick={onRefreshServers} className="rounded bg-slate-700 hover:bg-slate-600 px-3 py-2">
            Refresh List
          </button>
        </div>
      </div>
      <div className="space-y-2 max-h-[280px] overflow-auto pr-1">
        {servers.length === 0 ? (
          <div className="text-sm text-slate-400">No servers yet.</div>
        ) : (
          servers.map(server => (
            <div key={server.id} className="border border-slate-700 rounded-lg p-2">
              <div className="font-medium">{server.name}</div>
              <div className="text-xs text-slate-400 break-all">ID: {server.id}</div>
              <div className="text-xs text-slate-400">
                Players: {server.currentPlayers}/{server.maxPlayers}
              </div>
              <button
                type="button"
                onClick={() => onJoinServer(server.id)}
                className="mt-2 rounded bg-cyan-500 text-slate-950 px-3 py-1 text-sm font-medium"
              >
                Join Server
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ServerBrowserPanel;
