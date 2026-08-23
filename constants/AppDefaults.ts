import Constants from "expo-constants";

type ThemeExtra = {
  name?: string;
  code?: string;
};

type AppExtra = {
  theme?: ThemeExtra;
};

const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;

export const DEFAULT_THEME_NAME = extra.theme?.name ?? "";
export const DEFAULT_THEME_CODE = extra.theme?.code ?? "story";
