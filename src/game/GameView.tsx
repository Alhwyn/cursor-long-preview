import RaycastShooterCanvas from "./RaycastShooterCanvas";
import DirectSessionPanel from "./components/DirectSessionPanel";
import HudPanel from "./components/HudPanel";
import ObservationPanel from "./components/ObservationPanel";
import PartyLobbyPanel from "./components/PartyLobbyPanel";
import ServerBrowserPanel from "./components/ServerBrowserPanel";
import ShooterControls from "./components/ShooterControls";
import SystemFeedPanel from "./components/SystemFeedPanel";
import { useGameViewController } from "./hooks/useGameViewController";

export function GameView() {
  const {
    busy,
    playerName,
    setPlayerName,
    sessionInput,
    setSessionInput,
    serverInput,
    setServerInput,
    sessionId,
    playerId,
    state,
    observation,
    error,
    systemFeed,
    realtimeStatus,
    servers,
    supabaseMode,
    serverName,
    setServerName,
    authToken,
    setAuthToken,
    partyCodeInput,
    setPartyCodeInput,
    party,
    self,
    selfPartyMember,
    canStartParty,
    aliveTerminators,
    callJoin,
    sendAction,
    tick,
    refreshState,
    createLobby,
    loadServers,
    joinServer,
    createPartyLobby,
    joinPartyLobby,
    togglePartyReady,
    startPartyMatch,
    leavePartyLobby,
  } = useGameViewController();

  return (
    <div className="w-full max-w-[1500px] mx-auto p-4 md:p-6 text-slate-100">
      <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-5 mb-4 shadow-[0_0_60px_rgba(16,185,129,0.08)]">
        <h1 className="text-3xl md:text-4xl font-semibold mb-2 tracking-tight">Terminator Robot Defense 3D</h1>
        <p className="text-slate-300">
          Cute co-op shooter where survivors, Claude Bot, and your buildables fight off hostile terminator robots.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
        <section className="space-y-4">
          <DirectSessionPanel
            busy={busy}
            playerName={playerName}
            onPlayerNameChange={setPlayerName}
            sessionInput={sessionInput}
            onSessionInputChange={setSessionInput}
            serverInput={serverInput}
            onServerInputChange={setServerInput}
            sessionId={sessionId}
            playerId={playerId}
            onJoinGame={() => {
              void callJoin({
                playerName,
                session: sessionInput || undefined,
                serverId: serverInput || undefined,
              });
            }}
          />

          <RaycastShooterCanvas state={state} focusPlayerId={playerId} />

          <ShooterControls
            onAction={action => {
              void sendAction(action);
            }}
            onTick={() => {
              void tick();
            }}
            onRefresh={() => {
              void refreshState();
            }}
            facing={self?.facing}
          />
        </section>

        <section className="space-y-4">
          <PartyLobbyPanel
            busy={busy}
            playerName={playerName}
            onPlayerNameChange={setPlayerName}
            partyCodeInput={partyCodeInput}
            onPartyCodeInputChange={setPartyCodeInput}
            party={party}
            playerId={playerId}
            realtimeStatus={realtimeStatus}
            selfReady={selfPartyMember?.ready}
            canStartParty={canStartParty}
            onCreateParty={() => {
              void createPartyLobby();
            }}
            onJoinParty={() => {
              void joinPartyLobby();
            }}
            onToggleReady={() => {
              void togglePartyReady();
            }}
            onStartParty={() => {
              void startPartyMatch();
            }}
            onLeaveParty={() => {
              void leavePartyLobby();
            }}
          />

          <HudPanel state={state} self={self} aliveTerminators={aliveTerminators} partyMemberCount={party?.members.length} />

          <ServerBrowserPanel
            supabaseMode={supabaseMode}
            authToken={authToken}
            onAuthTokenChange={setAuthToken}
            serverName={serverName}
            onServerNameChange={setServerName}
            servers={servers}
            onCreateServer={() => {
              void createLobby();
            }}
            onRefreshServers={() => {
              void loadServers();
            }}
            onJoinServer={serverId => {
              void joinServer(serverId);
            }}
          />

          <ObservationPanel observation={observation} />

          <SystemFeedPanel systemFeed={systemFeed} error={error} />
        </section>
      </div>
    </div>
  );
}

export default GameView;
