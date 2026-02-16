import { useCallback, useState } from "react";

export interface BusyMutationController {
  busy: boolean;
  error: string;
  setErrorMessage: (message: string) => void;
  runBusyMutation: (task: () => Promise<void>, onError?: (errorMessage: string) => void) => Promise<void>;
}

export function useBusyMutation(): BusyMutationController {
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const setErrorMessage = useCallback((message: string) => {
    setError(message);
  }, []);

  const runBusyMutation = useCallback(
    async (task: () => Promise<void>, onError?: (errorMessage: string) => void) => {
      setBusy(true);
      setError("");
      try {
        await task();
      } catch (errorValue) {
        const errorMessage = String(errorValue);
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setBusy(false);
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
