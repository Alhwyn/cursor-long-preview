import { useEffect } from "react";
import type { Action, Direction, GameState } from "../types";

interface UseShooterKeyboardInput {
  sessionId: string;
  playerId: string;
  state: GameState | null;
  facing?: Direction;
  onAction: (action: Action) => void;
}

export function useShooterKeyboard({ sessionId, playerId, state, facing = "up", onAction }: UseShooterKeyboardInput) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) {
        return;
      }
      if (!sessionId || !playerId || !state || state.status !== "active") {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "w" || key === "arrowup") {
        event.preventDefault();
        onAction({ type: "move", direction: "up" });
      } else if (key === "s" || key === "arrowdown") {
        event.preventDefault();
        onAction({ type: "move", direction: "down" });
      } else if (key === "a" || key === "arrowleft") {
        event.preventDefault();
        onAction({ type: "move", direction: "left" });
      } else if (key === "d" || key === "arrowright") {
        event.preventDefault();
        onAction({ type: "move", direction: "right" });
      } else if (key === " ") {
        event.preventDefault();
        onAction({ type: "shoot" });
      } else if (key === "f") {
        event.preventDefault();
        onAction({ type: "attack" });
      } else if (key === "1") {
        event.preventDefault();
        onAction({ type: "build", buildType: "barricade", direction: facing });
      } else if (key === "2") {
        event.preventDefault();
        onAction({ type: "build", buildType: "ally_robot", direction: facing });
      } else if (key === "3") {
        event.preventDefault();
        onAction({ type: "build", buildType: "turret", direction: facing });
      } else if (key === "enter") {
        event.preventDefault();
        onAction({ type: "wait" });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [facing, onAction, playerId, sessionId, state]);
}

export default useShooterKeyboard;
