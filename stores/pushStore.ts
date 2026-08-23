import { create } from "zustand";

type PushState = {
  pushToken: string | null;
  platform: "android" | "ios" | "unknown";
  setPushInfo: (token: string, platform: PushState["platform"]) => void;
  reset: () => void;
};

export const usePushStore = create<PushState>((set) => ({
  pushToken: null,
  platform: "unknown",
  setPushInfo: (token, platform) => set({ pushToken: token, platform }),
  reset: () => set({ pushToken: null, platform: "unknown" }),
}));
