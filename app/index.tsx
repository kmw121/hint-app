import * as Battery from "expo-battery";
import * as Network from "expo-network";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useHintStore } from "../stores/hintStore";
import { useThemeStore } from "../stores/themeStore";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function IndexScreen() {
  const [containerHeight, setContainerHeight] = useState(0);
  const [calculatedSize, setCalculatedSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const {
    newChat,
    hintCount,
    remainingTime,
    isRunning,
    startTimer,
    loadAppState,
    progress,
    setIsChatTap,
  } = useHintStore();

  const {
    showProgress,
    title,
    themeImage,
    flashlightEnabled,
    minutes,
    seconds,
    canConnect,
  } = useThemeStore();

  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [connectionType, setConnectionType] = useState<string | null>(null);

  useEffect(() => {
    //loadAppState();
    if (Platform.OS === "android") {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA).then(
        (granted) => {
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn("카메라 권한이 필요해요 🔒");
          }
        }
      );
    }

    const fetchInfo = async () => {
      try {
        const battery = await Battery.getBatteryLevelAsync();
        const net = await Network.getNetworkStateAsync();
        const type = net.type ?? "unknown";

        setBatteryLevel(Math.round(battery * 100));
        setConnectionType(
          type === Network.NetworkStateType.WIFI ? "연결됨" : "연결 실패"
        );
      } catch (e) {
        console.warn("배터리 또는 네트워크 상태를 호출 불가", e);
      }
    };

    fetchInfo();
    const interval = setInterval(fetchInfo, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!themeImage || containerHeight <= 0) return;

    Image.getSize(
      themeImage,
      (originalWidth, originalHeight) => {
        let displayWidth = SCREEN_WIDTH - 90;
        let displayHeight = (originalHeight / originalWidth) * displayWidth;

        if (displayHeight > containerHeight) {
          displayHeight = containerHeight;
          displayWidth = (originalWidth / originalHeight) * displayHeight;
        }

        setCalculatedSize({ width: displayWidth, height: displayHeight });
      },
      (error) => console.warn("이미지 크기 계산 실패", error)
    );
  }, [themeImage, containerHeight]);

  const handleTimerPress = () => {
    if (!canConnect && !isRunning) {
      startTimer(minutes * 60 + seconds);
    }
  };

  const formatTime = (t: number) =>
    `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(
      2,
      "0"
    )}`;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={35}
      >
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <View style={styles.TemaName}>
            <Text
              style={{
                fontFamily: "PretendardBold",
                fontSize: 100,
                color: "#2b2b2b",
              }}
            >
              {title}
            </Text>
          </View>

          <View style={styles.fixedBottomBox}>
            <TouchableOpacity onPress={handleTimerPress} disabled={canConnect}>
              <Text
                style={[
                  styles.timerText,
                  {
                    fontFamily: "PretendardBold",
                    fontWeight: "normal",
                    color: "#2b2b2b",
                  },
                ]}
              >
                {formatTime(remainingTime)}
              </Text>
            </TouchableOpacity>
            <Text
              style={[
                styles.countText,
                {
                  fontFamily: "PretendardBold",
                  fontWeight: "normal",
                  color: "#2b2b2b",
                },
              ]}
            >
              힌트 사용: {hintCount}회{canConnect}{" "}
              {showProgress && `  •  진행률: ${progress}%`}
            </Text>
          </View>
          <View style={styles.statusBar}>
            <Text
              style={[
                styles.statusText,
                {
                  fontFamily: "PretendardBold",
                  fontWeight: "normal",
                },
              ]}
            >
              <Text>배터리</Text>{" "}
              <Text
                style={{
                  color:
                    batteryLevel != null && batteryLevel > 50 ? "blue" : "red",
                }}
              >
                {batteryLevel ?? "--"}
              </Text>
              % <Text>와이파이</Text>{" "}
              <Text
                style={{
                  color:
                    connectionType != null && connectionType === "연결됨"
                      ? "blue"
                      : "red",
                }}
              >
                {connectionType ?? "--"}
              </Text>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  TemaName: {
    justifyContent: "center",
    alignItems: "center",
    margin: 10,
    fontSize: 200,
    flex: 1,
  },
  statusBar: {
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  statusText: {
    height: 100,
    fontSize: 50,
    fontWeight: "bold",
    textAlign: "center",
    color: "#2b2b2b",
  },
  fixedBottomBox: {
    height: 150,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  timerText: {
    fontSize: 80,
    fontWeight: "bold",
    color: "#2b2b2b",
  },
  countText: {
    fontSize: 30,
    fontWeight: "bold",
    marginTop: 5,
    color: "#2b2b2b",
  },
});
