// hooks/useImmersiveMode.ts
import * as NavigationBar from "expo-navigation-bar";
import { useCallback, useEffect, useRef } from "react";
import { AppState, InteractionManager, Platform } from "react-native";

type ImmersiveApi = {
  setImmersive: (v: boolean) => Promise<void> | void;
};

type KickImmersive = () => void;

let ImmersiveMode: ImmersiveApi | null = null;
try {
  ImmersiveMode = require("react-native-immersive").default;
} catch {}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function afterUISettled(fn: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      InteractionManager.runAfterInteractions(fn);
    });
  });
}

async function forceApplyImmersive() {
  if (Platform.OS !== "android") return;

  try {
    await ImmersiveMode?.setImmersive(true);
  } catch (error) {
    console.warn("react-native-immersive application failed:", error);
  }

  try {
    await NavigationBar.setVisibilityAsync("hidden");
  } catch (error) {
    console.warn("Navigation bar hide failed:", error);
  }
}

async function applyWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await forceApplyImmersive();
      await delay(200);

      const current = await NavigationBar.getVisibilityAsync();
      if (current === "hidden") {
        console.log(`[Immersive] Successfully applied on attempt ${i + 1}`);
        return true;
      }
    } catch (error) {
      console.warn(`[Immersive] Retry ${i + 1}/${maxRetries} failed:`, error);
    }

    if (i < maxRetries - 1) {
      await delay(300);
    }
  }

  console.warn("[Immersive] All retry attempts failed");
  return false;
}

export default function useImmersiveMode(): KickImmersive {
  const appliedOnceRef = useRef(false);
  const pendingRef = useRef(false);
  const queuedRef = useRef(false);

  const kick = useCallback(() => {
    if (pendingRef.current) {
      queuedRef.current = true;
      return;
    }

    const execute = async () => {
      pendingRef.current = true;
      queuedRef.current = false;

      await new Promise<void>((resolve) => {
        afterUISettled(async () => {
          await applyWithRetry();
          resolve();
        });
      });

      pendingRef.current = false;
      appliedOnceRef.current = true;

      if (queuedRef.current) {
        setTimeout(() => execute(), 100);
      }
    };

    execute();
  }, []);

  useEffect(() => {
    if (appliedOnceRef.current) return;

    afterUISettled(async () => {
      const success = await applyWithRetry();
      appliedOnceRef.current = success;
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const timers = new Set<ReturnType<typeof setTimeout>>();
    const scheduleKick = (delayMs: number) => {
      if (delayMs === 0) {
        kick();
        return;
      }

      const timer = setTimeout(() => {
        timers.delete(timer);
        kick();
      }, delayMs);
      timers.add(timer);
    };

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        scheduleKick(0);
        scheduleKick(300);
        scheduleKick(1200);
      }
    });

    const visibilitySub = NavigationBar.addVisibilityListener(
      ({ visibility }) => {
        if (visibility === "visible") {
          scheduleKick(250);
        }
      }
    );

    return () => {
      appStateSub.remove();
      visibilitySub.remove();
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, [kick]);

  return kick;
}

export async function setImmersiveFunction() {
  await applyWithRetry();
}
