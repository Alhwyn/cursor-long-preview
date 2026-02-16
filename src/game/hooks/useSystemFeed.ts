import { useCallback, useState } from "react";

export interface SystemFeedController {
  systemFeed: string[];
  pushSystemFeed: (message: string) => void;
}

export function useSystemFeed(limit = 16): SystemFeedController {
  const [systemFeed, setSystemFeed] = useState<string[]>([]);

  const pushSystemFeed = useCallback(
    (message: string) => {
      setSystemFeed(previous => [message, ...previous].slice(0, limit));
    },
    [limit],
  );

  return {
    systemFeed,
    pushSystemFeed,
  };
}

export default useSystemFeed;
