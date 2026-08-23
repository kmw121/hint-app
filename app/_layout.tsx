// app/_layout.tsx
import useImmersiveMode from "@/hooks/useImmersiveMode";
import useSocketConnection from "@/hooks/useSocketConnection";
import { useHintStore } from "@/stores/hintStore";
import { useThemeStore } from "@/stores/themeStore";
import "@/tasks/notificationTaskPatch";
import { getSocket } from "@/utils/socketClient";
import "@react-native-firebase/app";
import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import TabBar from "../components/TabBar";
import FlashTorch from "./layout/flashTorch";

// 📢 알림 유틸
import {
  attachNotificationListeners,
  initNotificationsOnce,
} from "@/utils/notifications";

// ✅ 폰트 파일 불러오기 (세 가지 모두)
import PretendardBlack from "../assets/fonts/Pretendard-Black.ttf";
import PretendardBold from "../assets/fonts/Pretendard-Bold.ttf";
import PretendardRegular from "../assets/fonts/Pretendard-Regular.ttf";
import backgroundImage from "../assets/images/origin/background.png";

// 전역 패밀리 이름 (등록 키와 동일해야 함)
const FONT = {
  regular: "PretendardRegular",
  bold: "PretendardBold",
  black: "PretendardBlack",
};

function ForcedLightOffOverlay() {
  const { forcedLightOff } = useHintStore();
  if (!forcedLightOff) return null;
  return (
    <View
      pointerEvents="auto"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "black",
        zIndex: 9999,
        elevation: 9999,
      }}
    />
  );
}

function LayoutInner() {
  const { loadTheme, themeCode, isHorizontal } = useThemeStore();
  const { loadHints, hintCount, loadAppState } = useHintStore();

  useSocketConnection();

  // ✅ 훅 내부에서 초기 1회 적용, kick은 복귀/회전 시점에 사용
  const kickImmersive = useImmersiveMode();

  useEffect(() => {
    const prepare = async () => {
      await loadTheme();
      await loadHints();
      await loadAppState();
    };
    prepare();
  }, []);

  // 방향 잠금 후 immersive 재적용
  useEffect(() => {
    (async () => {
      if (isHorizontal) {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE
        );
      } else {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT
        );
      }
      // 방향 잠금 직후 한 번
      kickImmersive();
    })();
  }, [isHorizontal, kickImmersive]);

  // ⭐ AppState 리스너 개선: 다중 재시도 로직 추가
  useEffect(() => {
    let lastState = AppState.currentState;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let finalRetryTimer: ReturnType<typeof setTimeout> | null = null;

    const sub = AppState.addEventListener("change", (nextState) => {
      console.log(`[Layout] AppState changed: ${lastState} → ${nextState}`);
      
      // background/inactive → active로 전환될 때만
      if (
        (lastState === "background" || lastState === "inactive") &&
        nextState === "active"
      ) {
        // 즉시 한 번 실행
        kickImmersive();
        
        // ⭐ 500ms 후 재시도 (시스템 UI가 완전히 복구되기를 기다림)
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = setTimeout(() => {
          console.log("[Layout] First retry kick");
          kickImmersive();
        }, 500);
        
        // ⭐ 1.5초 후 최종 재시도
        if (finalRetryTimer) clearTimeout(finalRetryTimer);
        finalRetryTimer = setTimeout(() => {
          console.log("[Layout] Final retry kick");
          kickImmersive();
        }, 1500);
      }
      lastState = nextState;
    });

    return () => {
      sub.remove();
      if (retryTimer) clearTimeout(retryTimer);
      if (finalRetryTimer) clearTimeout(finalRetryTimer);
    };
  }, [kickImmersive]);

  useEffect(() => {
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit("toControl", {
        themeCode,
        status: "usedHint",
        data: hintCount,
      });
    }
  }, [hintCount, themeCode]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" hidden />
      <View style={styles.contentMain}>
        <ImageBackground
          source={backgroundImage}
          style={styles.contentBackground}
          imageStyle={styles.contentBackgroundImage}
          resizeMode="cover"
        >
          <View style={StyleSheet.absoluteFill}>
            <Slot />
          </View>
        </ImageBackground>
      </View>
      <FlashTorch />
      <ForcedLightOffOverlay />
    </View>
  );
}

export default function Layout() {
  const [notifReady, setNotifReady] = useState(false);
  const { flashlightEnabled } = useThemeStore();
  const { newChat, setIsChatTap } = useHintStore();

  const [fontsLoaded] = useFonts({
    [FONT.regular]: PretendardRegular,
    [FONT.bold]: PretendardBold,
    [FONT.black]: PretendardBlack,
  });

  useEffect(() => {
    let detach: (() => void) | undefined;
    (async () => {
      try {
        await initNotificationsOnce();
      } catch (e) {
        console.log(`알림 초기화 실패: ${e}`);
      } finally {
        detach = attachNotificationListeners();
        setNotifReady(true);
      }
    })();
    return () => {
      if (detach) detach();
    };
  }, []);

  if (!fontsLoaded || !notifReady) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View
            style={[
              styles.container,
              { alignItems: "center", justifyContent: "center" },
            ]}
          >
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ color: "#fff", marginTop: 12 }}>준비 중…</Text>
          </View>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LayoutInner />
        <TabBar
          newChat={newChat}
          flashlightEnabled={flashlightEnabled}
          setIsChatTap={setIsChatTap}
        />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#264d84",
  },
  headerText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    lineHeight: 15,
  },
  contentWrapper: {
    flex: 1,
  },
  contentMain: {
    flex: 1,
    margin: 35,
    marginLeft: "12%",
    borderCurve: "circular",
    borderRadius: 20,
    backgroundColor: "#ffffff",
  },
  contentBackground: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 20,
  },
  contentBackgroundImage: {
    borderRadius: 20,
  },
});
