import { useEffect } from "react";

export interface UseSessionPollingOptions {
  enabled: boolean;
  intervalMs?: number;
  onPoll: () => void | Promise<void>;
}

export function useSessionPolling({ enabled, intervalMs = 350, onPoll }: UseSessionPollingOptions): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const interval = window.setInterval(() => {
      void onPoll();
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [enabled, intervalMs, onPoll]);
}

export default useSessionPolling;
