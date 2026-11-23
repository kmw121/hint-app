import { Camera } from "expo-camera";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useThemeStore } from "../../stores/themeStore";
import { useHintStore } from "../../stores/hintStore";

export default function FlashTapScreen() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const { flashlightEnabled, flashlightOn, setFlashlightOn } = useThemeStore();
  const forcedLightOff = useHintStore((state) => state.forcedLightOff);

  useEffect(() => {
    const requestPermission = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setPermissionGranted(status === "granted");
    };
    requestPermission();
  }, []);

  const toggleFlashlight = () => {
    if (forcedLightOff) return;
    if (!permissionGranted) {
      console.warn("카메라 권한이 필요해요!");
      return;
    }
    setFlashlightOn(!flashlightOn);
  };

  return (
    <View style={styles.container}>
      <View style={styles.middleContent}>
        <TouchableOpacity
          onPress={toggleFlashlight}
          disabled={forcedLightOff}
          style={[styles.button, flashlightOn && styles.buttonOn]}
        >
          <Text
            style={[
              styles.buttonText,
              {
                fontFamily: "PretendardBold",
                fontWeight: "normal",
              },
            ]}
          >
            {flashlightOn ? "플래시 on" : "플래시 off"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  middleContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 21,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#fff",
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: "#888",
    borderRadius: 999,
  },
  buttonOn: {
    backgroundColor: "#FFD700",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
});
