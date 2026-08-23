import { useHintStore } from "@/stores/hintStore";
import { CameraView } from "expo-camera";
import { useRef } from "react";
import { Platform, StyleSheet } from "react-native";
import { useThemeStore } from "../../stores/themeStore";

export default function FlashTorch() {
  const { flashlightOn } = useThemeStore();
  const { forcedLightOff } = useHintStore();
  const cameraRef = useRef<CameraView | null>(null);

  if (Platform.OS !== "android") return null;

  return (
    <CameraView
      ref={cameraRef}
      style={styles.hiddenCamera}
      enableTorch={flashlightOn && !forcedLightOff}
    />
  );
}

const styles = StyleSheet.create({
  hiddenCamera: {
    position: "absolute",
    width: 1,
    height: 1,
    top: -9999,
    left: -9999,
    zIndex: -9999,
    opacity: 0,
  },
});
