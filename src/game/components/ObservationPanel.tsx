import type { Observation } from "../types";

interface ObservationPanelProps {
  observation: Observation | null;
}

export function ObservationPanel({ observation }: ObservationPanelProps) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
      <h2 className="font-semibold text-lg mb-2">Observation</h2>
      <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs overflow-auto max-h-[320px]">
        {observation ? JSON.stringify(observation, null, 2) : "No observation yet."}
      </pre>
    </div>
  );
}

export default ObservationPanel;
