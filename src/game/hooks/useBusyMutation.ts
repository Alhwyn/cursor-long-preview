import { useCallback, useState } from "react";

export interface BusyMutationController {
  busy: boolean;
  error: string;
  setErrorMessage: (message: string) => void;
  runBusyMutation: (task: () => Promise<void>, onError?: (errorMessage: string) => void) => Promise<void>;
}

export function useBusyMutation(): BusyMutationController {
  const [pendingMutationCount, setPendingMutationCount] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const busy = pendingMutationCount > 0;

  const setErrorMessage = useCallback((message: string) => {
    setError(message);
  }, []);

  const runBusyMutation = useCallback(
    async (task: () => Promise<void>, onError?: (errorMessage: string) => void) => {
      setPendingMutationCount(previous => previous + 1);
      setError("");
      try {
        await task();
      } catch (errorValue) {
        const errorMessage = String(errorValue);
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setPendingMutationCount(previous => Math.max(0, previous - 1));
      }
    },
    [],
  );

  return {
    busy,
    error,
    setErrorMessage,
    runBusyMutation,
  };
}

export default useBusyMutation;
