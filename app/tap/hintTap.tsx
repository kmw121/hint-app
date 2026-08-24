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

export default function HintTapScreen() {
  const [inputValue, setInputValue] = useState("");
  const [fadeAnim] = useState(new Animated.Value(0));
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const router = useRouter();

  const {
    hints,
    newChat,
    addUsedHintCode,
    setLastUsedCode,
    saveAppState,
    resetHintState,
    setIsChatTap,
  } = useHintStore();

  const { flashlightEnabled, resetCode } = useThemeStore();

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

    if (trimmed.toLowerCase() === resetCode.toLowerCase()) {
      await resetHintState();
      setInputValue("");
      return;
    }

    const match = hints.find(
      (hint) => hint.code.toLowerCase() === trimmed.toLowerCase()
    );
    if (match) {
      setLastUsedCode(trimmed);
      addUsedHintCode(trimmed);

      await saveAppState();
      router.push({ pathname: "/hint", params: { code: match.code } });
    } else {
      showPopup();
    }
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
                  color: "#2b2b2b",
                },
              ]}
            >
              힌트코드를 입력하세요.
            </Text>
            <View style={[styles.inputRow]}>
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
                      color: "#fff",
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
          <Text style={styles.popupText}>잘못된 코드입니다.</Text>
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
    color: "#2b2b2b",
    fontWeight: "bold",
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
    color: "#2B2B2B",
    fontSize: 24,
  },
  button: {
    backgroundColor: "#2b2b2b",
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 15,
    height: 60,
  },
  buttonText: {
    fontWeight: "bold",
    color: "#ffffff",
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
