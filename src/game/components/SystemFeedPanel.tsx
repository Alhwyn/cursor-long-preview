interface SystemFeedPanelProps {
  systemFeed: string[];
  error: string;
}

export function SystemFeedPanel({ systemFeed, error }: SystemFeedPanelProps) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
      <h2 className="font-semibold text-lg mb-2">System Feed</h2>
      <div className="space-y-1 max-h-[160px] overflow-auto pr-1 text-xs">
        {systemFeed.length === 0 ? <div className="text-slate-500">No events yet.</div> : null}
        {systemFeed.map((message, index) => (
          <div key={`${message}-${index}`} className="text-slate-300">
            • {message}
          </div>
        ))}
      </div>
      <h3 className="font-semibold text-sm mt-3 mb-1">Errors</h3>
      <div className={`text-sm ${error ? "text-rose-300" : "text-slate-500"}`}>{error || "No errors."}</div>
    </div>
  );
}

export default SystemFeedPanel;
