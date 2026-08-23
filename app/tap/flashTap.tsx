import { Camera } from "expo-camera";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useThemeStore } from "../../stores/themeStore";

export default function FlashTapScreen() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const { flashlightEnabled, flashlightOn, setFlashlightOn } = useThemeStore();

  useEffect(() => {
    const requestPermission = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setPermissionGranted(status === "granted");
    };
    requestPermission();
  }, []);

  const toggleFlashlight = () => {
    if (!permissionGranted) {
      console.warn("카메라 권한이 필요해요!");
      return;
    }
    setFlashlightOn(!flashlightOn);
  };

  return (
    <View style={styles.container}>
      <View style={styles.middleContent}>
        <Text
          style={[
            styles.title,
            {
              fontFamily: "PretendardBold",
              fontWeight: "normal",
            },
          ]}
        >
          플래시 제어
        </Text>

        <TouchableOpacity
          onPress={toggleFlashlight}
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
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#fff",
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 28,
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
