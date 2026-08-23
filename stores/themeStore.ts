import * as FileSystem from "expo-file-system";
import { create } from "zustand";
import {
  DEFAULT_THEME_CODE,
  DEFAULT_THEME_NAME,
} from "../constants/AppDefaults";
import { deleteImageIfExists } from "../utils/fileHelpers";

const THEME_FILE = (FileSystem.documentDirectory ?? "") + "themeData.json";

interface ThemeState {
  title: string;
  minutes: number;
  seconds: number;
  resetCode: string;
  flashlightEnabled: boolean;
  themeImage: string | null | undefined;
  flashlightOn: boolean;
  canConnect: boolean;
  themeCode: string;
  buildThemeName: string;
  lightOffTime: number;
  isHorizontal: boolean;
  showProgress: boolean; // ✅ 진행률 보기

  setIsHorizontal: (val: boolean) => void;
  setTitle: (value: string) => void;
  setMinutes: (value: number) => void;
  setSeconds: (value: number) => void;
  setResetCode: (value: string) => void;
  toggleFlashlight: () => void;
  setThemeImage: (uri: string | null | undefined) => void;
  setFlashlightOn: (value: boolean) => void;
  setCanConnect: (value: boolean) => void;
  setLightOffTime: (value: number) => void;
  setShowProgress: (value: boolean) => void; // ✅

  loadTheme: () => Promise<void>;
  saveTheme: () => Promise<void>;
}

type ThemePersistShape = {
  title: string;
  minutes: number;
  seconds: number;
  resetCode: string;
  flashlightEnabled: boolean;
  themeImage: string | null | undefined;
  canConnect: boolean;
  themeCode: string;
  buildThemeName: string;
  lightOffTime: number;
  isHorizontal: boolean;
  showProgress: boolean; // ✅
};

const defaultPersist: ThemePersistShape = {
  title: DEFAULT_THEME_NAME,
  minutes: 60,
  seconds: 0,
  resetCode: "qwerasdf",
  flashlightEnabled: false,
  themeImage: "",
  canConnect: true,
  themeCode: DEFAULT_THEME_CODE,
  buildThemeName: DEFAULT_THEME_NAME,
  lightOffTime: 0,
  isHorizontal: true,
  showProgress: true, // 기본값 노출
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  // ===== 초기 Zustand 상태(메모리) =====
  title: DEFAULT_THEME_NAME,
  minutes: 60,
  seconds: 0,
  resetCode: "qwerasdf",
  flashlightEnabled: false,
  themeImage: "",
  flashlightOn: false,
  canConnect: true,
  themeCode: DEFAULT_THEME_CODE,
  buildThemeName: DEFAULT_THEME_NAME,
  lightOffTime: 0,
  isHorizontal: true,
  showProgress: true, // ✅

  // ===== 액션 =====
  setTitle: (value) => set({ title: value }),
  setMinutes: (value) => set({ minutes: Math.max(0, Math.floor(value)) }),
  setSeconds: (value) =>
    set({ seconds: Math.min(59, Math.max(0, Math.floor(value))) }),
  setResetCode: (value) => set({ resetCode: value }),
  setFlashlightOn: (value) => set({ flashlightOn: value }),
  toggleFlashlight: () =>
    set((state) => ({ flashlightEnabled: !state.flashlightEnabled })),
  setThemeImage: (uri) => set({ themeImage: uri }),
  setCanConnect: (value) => set({ canConnect: value }),
  setLightOffTime: (value) =>
    set({ lightOffTime: Math.max(0, Math.floor(value)) }),
  setIsHorizontal: (value) => set({ isHorizontal: value }),
  setShowProgress: (value) => set({ showProgress: value }), // ✅

  // ===== 파일 로드 =====
  loadTheme: async () => {
    const fileInfo = await FileSystem.getInfoAsync(THEME_FILE);
    if (!fileInfo.exists) {
      await FileSystem.writeAsStringAsync(
        THEME_FILE,
        JSON.stringify(defaultPersist)
      );
      set({ ...defaultPersist, flashlightOn: false });
      return;
    }

    const content = await FileSystem.readAsStringAsync(THEME_FILE);
    const parsed = JSON.parse(content) as Partial<ThemePersistShape>;
    const shouldApplyBuildTitle =
      parsed?.buildThemeName !== defaultPersist.buildThemeName ||
      parsed?.themeCode !== defaultPersist.themeCode;

    // 누락 키 안전 머지 (이전 버전 호환)
    const merged: ThemePersistShape = {
      ...defaultPersist,
      ...parsed,
      title: shouldApplyBuildTitle
        ? defaultPersist.title
        : parsed?.title ?? defaultPersist.title,
      // seconds, minutes 같은 숫자들 안전 처리
      minutes: Math.max(
        0,
        Math.floor(parsed?.minutes ?? defaultPersist.minutes)
      ),
      seconds: Math.min(
        59,
        Math.max(0, Math.floor(parsed?.seconds ?? defaultPersist.seconds))
      ),
      lightOffTime: Math.max(
        0,
        Math.floor(parsed?.lightOffTime ?? defaultPersist.lightOffTime)
      ),
      canConnect: parsed?.canConnect ?? defaultPersist.canConnect,
      themeCode: defaultPersist.themeCode,
      buildThemeName: defaultPersist.buildThemeName,
      isHorizontal: parsed?.isHorizontal ?? defaultPersist.isHorizontal,
      showProgress: parsed?.showProgress ?? defaultPersist.showProgress, // ✅
    };

    set({
      ...merged,
      flashlightOn: false, // 런타임 상태(저장 X)
    });
  },

  // ===== 파일 저장 =====
  saveTheme: async () => {
    const state = get();

    // 기존 이미지 정리
    const fileInfo = await FileSystem.getInfoAsync(THEME_FILE);
    if (fileInfo.exists) {
      const prevData = JSON.parse(
        await FileSystem.readAsStringAsync(THEME_FILE)
      ) as Partial<ThemePersistShape>;
      if (prevData.themeImage && prevData.themeImage !== state.themeImage) {
        await deleteImageIfExists(prevData.themeImage as string);
      }
    }

    const data: ThemePersistShape = {
      title: state.title,
      minutes: Math.max(0, Math.floor(state.minutes)),
      seconds: Math.min(59, Math.max(0, Math.floor(state.seconds))),
      resetCode: state.resetCode,
      flashlightEnabled: state.flashlightEnabled,
      themeImage: state.themeImage ?? "",
      canConnect: state.canConnect,
      themeCode: state.themeCode,
      buildThemeName: defaultPersist.buildThemeName,
      lightOffTime: Math.max(0, Math.floor(state.lightOffTime)),
      isHorizontal: state.isHorizontal,
      showProgress: state.showProgress, // ✅
    };

    try {
      await FileSystem.writeAsStringAsync(THEME_FILE, JSON.stringify(data));
      console.log("테마 저장 완료!");
    } catch (err) {
      console.error("테마 저장 실패!", err);
    }
  },
}));
