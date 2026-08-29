import { getSocket } from "@/utils/socketClient";
import * as FileSystem from "expo-file-system";
import { create } from "zustand";
import { deleteImageIfExists } from "../utils/fileHelpers";
import { useMemoStore } from "./memoStore";
import { useThemeStore } from "./themeStore";

let intervalRef: ReturnType<typeof setInterval> | null = null;

export interface Hint {
  id: string;
  code: string;
  text: string;
  imageUri: string | null | undefined;
  answer: string;
}

export interface ChatMessage {
  id?: string;
  generation?: string;
  type: "server" | "client" | "app";
  data: string;
  createdAt: string;
}

const HINT_FILE = FileSystem.documentDirectory + "hintData.json";
const STATE_FILE = FileSystem.documentDirectory + "appState.json";

const getChatMessageKey = (message: ChatMessage) =>
  message.id || `${message.type}:${message.createdAt}:${message.data}`;

interface HintState {
  generation: string;
  revision: number;
  baseGeneration: string | null;
  baseRevision: number;
  localBranchId: string | null;
  localResetAt: number | null;
  startedAt: number | null;
  stateLoaded: boolean;
  hints: Hint[];
  editHints: Hint[];
  duplicateHintIds: string[];
  loadHints: () => Promise<void>;
  editHint: (index: number, updated: Partial<Hint>) => void;
  addHint: () => void;
  moveHint: (index: number, direction: "up" | "down") => void;
  updateHintsFromEdit: () => Promise<void>;
  getEditHintByCode: (code: string) => Hint | undefined;
  removeHint: (id: string) => void;

  usedHintCodes: string[];
  hintCount: number;
  getHintCount: () => number;
  addUsedHintCode: (code: string) => void;
  lastUsedCode: string | null;
  setLastUsedCode: (code: string | null) => void;

  isRunning: boolean;
  endTime: number | null;
  remainingTime: number;
  startTimer: (durationSec?: number, remainingTime?: number) => void;
  stopTimer: () => void;
  changerTimer: (remainingTime: number, isRunning: number) => void;
  tick: () => void;

  isChatTap: boolean;
  setIsChatTap: (val: boolean) => void;
  getIsChatTap: () => boolean;

  newChat: boolean;
  setIsNewChat: (val: boolean) => void;

  progress: number;
  setProgress: (value: number) => void;

  forcedLightOff: boolean;
  setForcedLightOff: (value: boolean) => void;

  chatData: ChatMessage[];
  setChatData: (messages: ChatMessage[], isClient?: boolean) => void;
  getChatData: () => ChatMessage[];

  saveAppState: (attr?: string) => Promise<void>;
  loadAppState: () => Promise<void>;
  resetHintState: () => Promise<void>;
  applyServerSnapshot: (snapshot: any) => Promise<void>;
  getSyncSnapshot: () => Record<string, any>;
  clearEditHints: () => void;
  clearDuplicateHintIds: () => void;
}

export const useHintStore = create<HintState>((set, get) => ({
  generation: "legacy",
  revision: 0,
  baseGeneration: null,
  baseRevision: 0,
  localBranchId: null,
  localResetAt: null,
  startedAt: null,
  stateLoaded: false,
  hints: [],
  editHints: [],
  duplicateHintIds: [],
  isChatTap: false,
  setIsChatTap: (value: boolean) => {
    const current = get();
    if (current.isChatTap === value && (!value || !current.newChat)) return;
    set((state) => ({
      isChatTap: value,
      newChat: value ? false : state.newChat,
    }));
    if (current.stateLoaded) void get().saveAppState("newChat");
  },
  getIsChatTap: () => {
    return get().isChatTap;
  },
  newChat: false,
  setIsNewChat: (value: boolean) => {
    if (get().newChat === value) return;
    set({ newChat: value });
    if (get().stateLoaded) void get().saveAppState("newChat");
  },

  clearEditHints: () => set({ editHints: get().hints }),
  clearDuplicateHintIds: () => set({ duplicateHintIds: [] }),

  loadHints: async () => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(HINT_FILE);
      if (fileInfo.exists) {
        const json = await FileSystem.readAsStringAsync(HINT_FILE);
        const parsed: Hint[] = JSON.parse(json).map((item: any) => ({
          ...item,
          answer: item.answer ?? "",
        }));
        set({ hints: parsed, editHints: [...parsed], duplicateHintIds: [] });
      } else {
        set({ hints: [], editHints: [], duplicateHintIds: [] });
      }
    } catch (err) {
      console.error("힌트 불러오기 실패!", err);
    }
  },

  editHint: (index, updated) => {
    const current = [...get().editHints];
    current[index] = { ...current[index], ...updated };
    set({ editHints: current });
  },

  addHint: () => {
    const newHint: Hint = {
      id: Date.now().toString(),
      code: "",
      text: "",
      imageUri: "",
      answer: "",
    };
    const current = [...get().editHints, newHint];
    set({ editHints: current });
  },

  moveHint: (index, direction) => {
    const current = [...get().editHints];
    if (direction === "up" && index > 0) {
      [current[index - 1], current[index]] = [
        current[index],
        current[index - 1],
      ];
    } else if (direction === "down" && index < current.length - 1) {
      [current[index + 1], current[index]] = [
        current[index],
        current[index + 1],
      ];
    }
    set({ editHints: current });
  },

  updateHintsFromEdit: async () => {
    const current = get().editHints;

    const codeCount: Record<string, string[]> = {};
    current.forEach((hint) => {
      if (!hint.code) return;
      if (!codeCount[hint.code]) codeCount[hint.code] = [];
      codeCount[hint.code].push(hint.id);
    });

    const duplicateIds = Object.values(codeCount)
      .filter((ids) => ids.length > 1)
      .flat();

    if (duplicateIds.length > 0) {
      set({ duplicateHintIds: duplicateIds });
      alert("중복된 힌트코드가 있습니다!");
      return;
    } else {
      set({ duplicateHintIds: [] });
    }

    const prevHints = get().hints;
    for (const prev of prevHints) {
      const isStillExist = current.find((h) => h.id === prev.id);
      const imageChanged =
        isStillExist && prev.imageUri !== isStillExist.imageUri;
      const imageDeleted = !isStillExist;

      if (imageChanged || imageDeleted) {
        await deleteImageIfExists(prev.imageUri);
      }
    }

    set({ hints: [...current] });
    try {
      await FileSystem.writeAsStringAsync(HINT_FILE, JSON.stringify(current));
      console.log("힌트 저장 완료!");
    } catch (err) {
      console.error("힌트 저장 실패!", err);
    }
  },

  getEditHintByCode: (code) =>
    get().editHints.find((hint) => hint.code === code),

  removeHint: (id) => {
    const filtered = get().editHints.filter((hint) => hint.id !== id);
    set({ editHints: filtered });
  },

  usedHintCodes: [],
  hintCount: 0,

  getHintCount: () => {
    return get().hintCount;
  },

  addUsedHintCode: (code) => {
    const { usedHintCodes, hintCount } = get();
    if (!usedHintCodes.includes(code) && code !== "a1234" && code !== "A1234") {
      set({
        usedHintCodes: [...usedHintCodes, code],
        hintCount: hintCount + 1,
      });
    }
  },

  lastUsedCode: null,
  setLastUsedCode: (code) => set({ lastUsedCode: code }),

  isRunning: false,
  endTime: null,
  remainingTime: 0,

  startTimer: (durationSec, remainingTime) => {
    let localStartedAt: number | null = null;
    if (remainingTime) {
      set({
        isRunning: true,
        endTime: Date.now() + remainingTime,
        remainingTime: Math.max(0, Math.floor(remainingTime / 1000)),
      });
    } else if (durationSec) {
      localStartedAt = Date.now();
      const end = localStartedAt + durationSec * 1000;
      set({
        isRunning: true,
        startedAt: localStartedAt,
        endTime: end,
        remainingTime: durationSec,
      });
    } else {
      return;
    }

    get().saveAppState();

    if (durationSec && localStartedAt) {
      const socket = getSocket();
      const { themeCode } = useThemeStore.getState();
      if (socket?.connected) {
        socket.emit("stateAction", {
          themeCode,
          requestId: `start:${themeCode}:${localStartedAt}`,
          action: {
            type: "start",
            durationMs: durationSec * 1000,
            startedAt: localStartedAt,
          },
        });
      }
    }

    if (intervalRef) clearInterval(intervalRef);
    intervalRef = setInterval(() => {
      get().tick();
    }, 1000);
  },

  stopTimer: () => {
    if (intervalRef) {
      clearInterval(intervalRef);
      intervalRef = null;
    }
    let endTime = get().endTime;
    if (endTime != null) {
      set({
        isRunning: false,
        remainingTime: Math.max(0, Math.floor((endTime - Date.now()) / 1000)),
      });
    } else {
      set({ isRunning: false });
    }

    get().saveAppState();
  },

  changerTimer: (remainingTime, isRunning) => {
    if (isRunning === 2 || isRunning === 0) {
      if (intervalRef) {
        clearInterval(intervalRef);
        intervalRef = null;
      }
    } else {
      if (intervalRef) {
        clearInterval(intervalRef);
        intervalRef = null;
      }
      intervalRef = setInterval(() => {
        get().tick();
      }, 1000);
    }

    const { minutes, seconds } = useThemeStore.getState();
    const duration = minutes * 60 + seconds;

    if (isRunning === 2) {
      set({
        isRunning: false,
        endTime: Date.now() + remainingTime,
        remainingTime: Math.max(0, Math.floor(remainingTime / 1000)),
      });
    } else {
      set({
        isRunning: isRunning === 1,
        endTime: Date.now() + remainingTime,
        remainingTime:
          isRunning === 0
            ? duration
            : Math.max(0, Math.floor(remainingTime / 1000)),
      });
    }

    get().saveAppState();
  },

  tick: () => {
    const now = Date.now();
    const { endTime } = get();
    if (!endTime) return;
    const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
    set({ remainingTime: remaining });
  },

  progress: 0,
  setProgress: (value) => {
    set({ progress: value });
    get().saveAppState();
  },

  forcedLightOff: false,
  setForcedLightOff: (value) => {
    set({ forcedLightOff: value });
  },

  chatData: [],
  setChatData: (messages, isClient) => {
    const generation = get().generation;
    const normalized = messages.map((message) => ({
      ...message,
      id:
        message.id ||
        `${message.type}:${message.createdAt}:${message.data}`,
      generation: message.generation || generation,
    }));
    set({ chatData: normalized });
    get().saveAppState();

    const socket = getSocket();
    const { themeCode } = useThemeStore.getState();
    if (socket && socket.connected && isClient) {
      const message = normalized[normalized.length - 1];
      socket.emit("stateAction", {
        themeCode,
        requestId: `chat:${message?.id || Date.now()}`,
        action: { type: "appendChat", message },
      });
    }
  },

  getChatData: () => {
    return get().chatData;
  },

  saveAppState: async (attr) => {
    const {
      hintCount,
      lastUsedCode,
      isRunning,
      endTime,
      usedHintCodes,
      remainingTime,
      progress,
      chatData,
      generation,
      revision,
      baseGeneration,
      baseRevision,
      localBranchId,
      localResetAt,
      startedAt,
      newChat,
    } = get();
    const data = {
      hintCount,
      lastUsedCode,
      isRunning,
      endTime,
      usedHintCodes,
      remainingTime,
      progress,
      chatData,
      generation,
      revision,
      baseGeneration,
      baseRevision,
      localBranchId,
      localResetAt,
      startedAt,
      newChat,
    };

    try {
      await FileSystem.writeAsStringAsync(STATE_FILE, JSON.stringify(data));
      const info = await FileSystem.getInfoAsync(STATE_FILE);
      if (!info.exists) {
        set({ stateLoaded: true });
        return;
      }
    } catch (err) {
      console.error("앱 상태 저장 실패!", err);
    }
  },

  loadAppState: async () => {
    try {
      const info = await FileSystem.getInfoAsync(STATE_FILE);
      if (!info.exists) {
        set({ stateLoaded: true });
        return;
      }

      const { minutes, seconds } = useThemeStore.getState();
      const duration = minutes * 60 + seconds;

      const json = await FileSystem.readAsStringAsync(STATE_FILE);
      const data = JSON.parse(json);
      const now = Date.now();
      let remaining = 0;
      if (data.isRunning) {
        remaining = data.endTime
          ? Math.max(0, Math.floor((data.endTime - now) / 1000))
          : duration;
      } else {
        remaining = data.remainingTime ? data.remainingTime : duration;
      }

      set({
        hintCount: data.hintCount ?? 0,
        lastUsedCode: data.lastUsedCode ?? null,
        usedHintCodes: data.usedHintCodes ?? [],
        isRunning: data.isRunning ?? false,
        endTime: data.endTime ?? null,
        remainingTime: remaining,
        progress: data.progress ?? 0,
        chatData: data.chatData ?? [],
        generation: data.generation ?? "legacy",
        revision: data.revision ?? 0,
        baseGeneration: data.baseGeneration ?? null,
        baseRevision: data.baseRevision ?? 0,
        localBranchId: data.localBranchId ?? null,
        localResetAt: data.localResetAt ?? null,
        startedAt: data.startedAt ?? null,
        newChat:
          get().newChat || (!get().isChatTap && (data.newChat ?? false)),
        stateLoaded: true,
      });

      if (data.isRunning && remaining > 0) {
        get().startTimer(0, remaining * 1000);
      }
    } catch (err) {
      set({ stateLoaded: true });
      console.error("앱 상태 불러오기 실패!", err);
    }
  },

  resetHintState: async () => {
    const { minutes, seconds, themeCode } = useThemeStore.getState();
    const duration = minutes * 60 + seconds;
    const current = get();
    const localBranchId = current.localBranchId || `local:${Date.now()}:${Math.random()}`;
    const localResetAt = current.localResetAt || Date.now();
    if (intervalRef) {
      clearInterval(intervalRef);
      intervalRef = null;
    }
    set({
      hintCount: 0,
      usedHintCodes: [],
      lastUsedCode: null,
      isRunning: false,
      remainingTime: duration,
      endTime: null,
      progress: 0,
      chatData: [],
      newChat: false,
      generation: localBranchId,
      baseGeneration: current.localBranchId ? current.baseGeneration : current.generation,
      baseRevision: current.localBranchId ? current.baseRevision : current.revision,
      localBranchId,
      localResetAt,
      startedAt: null,
    });
    useMemoStore.getState().clearStrokes();
    await get().saveAppState();

    const socket = getSocket();
    if (socket?.connected) {
      socket.emit(
        "stateAction",
        {
          themeCode,
          requestId: `reset:${localBranchId}`,
          action: { type: "reset", durationMs: duration * 1000 },
        },
        async (response: any) => {
          if (response?.snapshot) await get().applyServerSnapshot(response.snapshot);
        }
      );
    }
  },

  applyServerSnapshot: async (snapshot) => {
    if (!snapshot) return;
    const current = get();
    const resetGenerationChanged =
      Number(snapshot.resetAt || 0) > 0 &&
      Boolean(snapshot.generation) &&
      snapshot.generation !== current.generation;
    if (resetGenerationChanged) {
      useMemoStore.getState().clearStrokes();
    }
    const previousServerMessageKeys = new Set(
      current.chatData
        .filter((message) => message.type === "server")
        .map(getChatMessageKey)
    );
    const chatData = (Array.isArray(snapshot.chatData) ? snapshot.chatData : []).map(
      (message: ChatMessage) => ({ ...message, generation: snapshot.generation })
    );
    const hasNewServerMessage = chatData.some(
      (message: ChatMessage) =>
        message.type === "server" &&
        !previousServerMessageKeys.has(getChatMessageKey(message))
    );
    const isRunning = snapshot.isRunning === 1;
    const remainingMs = isRunning
      ? Math.max(0, Number(snapshot.endTime || 0) - Date.now())
      : Number(snapshot.remainingTime || snapshot.endTime || 0);
    if (intervalRef) clearInterval(intervalRef);
    intervalRef = isRunning ? setInterval(() => get().tick(), 1000) : null;
    set({
      generation: snapshot.generation,
      revision: Number(snapshot.revision || 0),
      baseGeneration: null,
      baseRevision: 0,
      localBranchId: null,
      localResetAt: null,
      startedAt: snapshot.startedAt || null,
      hintCount: Number(snapshot.hintCount || 0),
      usedHintCodes: Array.isArray(snapshot.usedHintCodes) ? snapshot.usedHintCodes : [],
      chatData,
      progress: Number(snapshot.progress || 0),
      isRunning,
      endTime: isRunning ? Number(snapshot.endTime || 0) : null,
      remainingTime: Math.max(0, Math.floor(remainingMs / 1000)),
      newChat:
        current.newChat || (!current.isChatTap && hasNewServerMessage),
    });
    await get().saveAppState();
  },

  getSyncSnapshot: () => {
    const state = get();
    return {
      generation: state.generation,
      revision: state.revision,
      baseGeneration: state.baseGeneration,
      baseRevision: state.baseRevision,
      localBranchId: state.localBranchId,
      localResetAt: state.localResetAt,
      isRunning: state.isRunning ? 1 : 0,
      startedAt: state.startedAt,
      endTime: state.endTime || 0,
      remainingTime: state.remainingTime * 1000,
      progress: state.progress,
      hintCount: state.hintCount,
      usedHintCodes: state.usedHintCodes,
      chatData: state.chatData,
    };
  },
}));
