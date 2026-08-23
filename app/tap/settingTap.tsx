import {
  pickAndRestoreHints,
  saveBackupToDevice,
} from "@/utils/backupUtils";
import { getSocket } from "@/utils/socketClient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useHintStore } from "../../stores/hintStore";
import { useThemeStore } from "../../stores/themeStore";

export default function SettingTapScreen() {
  const [inputValue, setInputValue] = useState("");
  const [fadeAnim] = useState(new Animated.Value(0));
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const router = useRouter();

  const {
    themeCode,
    flashlightEnabled,
    minutes,
    seconds,
    lightOffTime,
    title,
  } = useThemeStore();

  const { newChat, setIsChatTap } = useHintStore();

  useEffect(() => {
    const showListener = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true)
    );
    const hideListener = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false)
    );
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const showPopup = () => {
    Vibration.vibrate(100);
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 2000,
        delay: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSubmit = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (trimmed.toLowerCase() === "admin" + themeCode) {
      setTimeout(() => {
        router.push("../admin/admin");
      }, 100);
      setInputValue("");
      return;
    } else if (trimmed.toLowerCase() === "sync" + themeCode) {
      const socket = getSocket();

      let time = flashlightEnabled ? lightOffTime : 0;
      if (socket && socket.connected) {
        socket.emit("toControl", {
          themeCode: themeCode,
          status: "changeSetting",
          data: {
            themeTitle: title,
            durationMinutes: minutes,
            durationSeconds: seconds,
            lightOffTime: time,
          },
        });
      }
      setInputValue("");
      return;
    } else if (trimmed.toLowerCase() === "backup" + themeCode) {
      await saveBackupToDevice();
      setInputValue("");
      return;
    } else if (trimmed.toLowerCase() === "restore" + themeCode) {
      await pickAndRestoreHints();
      setInputValue("");
      return;
    }

    showPopup();
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={isKeyboardVisible ? 35 : -3}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.middleContent}>
            <Text
              style={[
                styles.label,
                {
                  fontFamily: "PretendardBold",
                  fontWeight: "normal",
                  color: "#E53935",
                },
              ]}
            >
              관리자 페이지 입니다.
            </Text>
            <Text
              style={[
                styles.label,
                {
                  fontFamily: "PretendardBold",
                  fontWeight: "normal",
                  color: "#E53935",
                },
              ]}
            >
              관리자 외 사용을 금지합니다.
            </Text>

            <Text
              style={[
                styles.label,
                {
                  fontFamily: "PretendardBold",
                  fontWeight: "normal",
                  color: "#2b2b2b",
                },
              ]}
            >
              관리자 코드를 입력하세요.
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.input,
                  {
                    fontFamily: "PretendardBold",
                    fontWeight: "normal",
                    color: "#2b2b2b",
                  },
                ]}
                value={inputValue}
                onChangeText={setInputValue}
                placeholderTextColor="#aaa"
              />
              <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                <Text
                  style={[
                    styles.buttonText,
                    {
                      fontFamily: "PretendardBold",
                      fontWeight: "normal",
                      color: "#ffffff",
                    },
                  ]}
                >
                  입력
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <Animated.View style={[styles.popup, { opacity: fadeAnim }]}>
          <Text
            style={[
              styles.popupText,
              {
                fontFamily: "PretendardBold",
                fontWeight: "normal",
              },
            ]}
          >
            잘못된 코드입니다.
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  middleContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 26,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: 400,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#2b2b2b",
    borderRadius: 15,
    paddingHorizontal: 12,
    height: 60,
    marginRight: 8,
    backgroundColor: "#fff",
    color: "#000",
    fontSize: 24,
  },
  button: {
    backgroundColor: "#2b2b2b",
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderRadius: 15,
    height: 60,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  popup: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    backgroundColor: "#FF4C4C",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  popupText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
