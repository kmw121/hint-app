import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

/* 아이콘 PNG (경로: ../assets/images/origin/taps/) */
import chatTap from "../assets/images/origin/taps/chatTap.png";
import chatTapActive from "../assets/images/origin/taps/chatTapActive.png";
import flashTap from "../assets/images/origin/taps/flashTap.png";
import flashTapActive from "../assets/images/origin/taps/flashTapActive.png";
import hintTap from "../assets/images/origin/taps/hintTap.png";
import hintTapActive from "../assets/images/origin/taps/hintTapActive.png";
import indexIcon from "../assets/images/origin/taps/index.png";
import indexActive from "../assets/images/origin/taps/indexActive.png";
import memoTap from "../assets/images/origin/taps/memoTap.png";
import memoTapActive from "../assets/images/origin/taps/memoTapActive.png";
import settingTap from "../assets/images/origin/taps/settingTap.png";
import settingTapActive from "../assets/images/origin/taps/settingTapActive.png";

const TabRoutes = {
  Main: "/",
  Hint: "/tap/hintTap",
  Chat: "/tap/chatTap",
  Memo: "/tap/memoTap",
  Flash: "/tap/flashTap",
  Setting: "/tap/settingTap",
} as const;

const TAB_BAR_WIDTH_RATIO = 0.12;
const TAB_BAR_EDGE_GAP = 35;
const TAB_BAR_SIDE_GAP = 12;
const TAB_GAP_MIN = 8;
const TAB_BUTTON_MAX = 86;
const TAB_BUTTON_MIN = 52;
const ICON_SCALE = 0.78;

interface Props {
  newChat: boolean;
  flashlightEnabled: boolean;
  setIsChatTap?: (v: boolean) => void;
}

export default function TabBar({
  newChat,
  flashlightEnabled,
  setIsChatTap,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();
  const newChatAnim = useRef(new Animated.Value(0)).current;
  const tabCount = flashlightEnabled ? 6 : 5;
  const tabBarWidth = width * TAB_BAR_WIDTH_RATIO;
  const buttonSize = Math.floor(
    Math.max(
      TAB_BUTTON_MIN,
      Math.min(
        TAB_BUTTON_MAX,
        tabBarWidth - TAB_BAR_SIDE_GAP * 2,
        (height - TAB_BAR_EDGE_GAP * 2 - TAB_GAP_MIN * (tabCount - 1)) /
          tabCount
      )
    )
  );
  const iconSize = Math.floor(buttonSize * ICON_SCALE);

  useEffect(() => {
    if (!newChat) {
      newChatAnim.stopAnimation();
      newChatAnim.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(newChatAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(newChatAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();

    return () => {
      animation.stop();
      newChatAnim.setValue(0);
    };
  }, [newChat, newChatAnim]);

  useEffect(() => {
    const isChatActive = pathname === TabRoutes.Chat;
    setIsChatTap?.(isChatActive);
  }, [pathname, setIsChatTap]);

  const renderTab = (
    key: keyof typeof TabRoutes,
    icon: any,
    iconActive: any,
    path: (typeof TabRoutes)[keyof typeof TabRoutes]
  ) => {
    const isActive = pathname === path;

    // Chat 탭만 비활성 시 반짝이
    const animatedStyle =
      key === "Chat" && !isActive && newChat
        ? {
            backgroundColor: newChatAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ["#FFFFFF", "#FFDD00"],
            }),
          }
        : {};

    return (
      <TouchableOpacity
        key={key}
        style={[styles.tabTouchable, { width: buttonSize, height: buttonSize }]}
        onPress={() => {
          router.push(path);
        }}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.tabButton,
            isActive ? styles.tabButtonActive : styles.tabButtonInactive,
            animatedStyle,
          ]}
        >
          <Image
            source={isActive ? iconActive : icon}
            style={[
              styles.icon,
              { width: iconSize, height: iconSize },
              !isActive && styles.iconInactive,
            ]}
            resizeMode="contain"
          />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.tabBar}>
      {renderTab("Main", indexIcon, indexActive, TabRoutes.Main)}
      {renderTab("Hint", hintTap, hintTapActive, TabRoutes.Hint)}
      {renderTab("Chat", chatTap, chatTapActive, TabRoutes.Chat)}
      {renderTab("Memo", memoTap, memoTapActive, TabRoutes.Memo)}
      {flashlightEnabled &&
        renderTab("Flash", flashTap, flashTapActive, TabRoutes.Flash)}
      {renderTab("Setting", settingTap, settingTapActive, TabRoutes.Setting)}
    </View>
  );
}
const styles = StyleSheet.create({
  tabBar: {
    height: "100%",
    width: "12%",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: TAB_BAR_EDGE_GAP,
    paddingHorizontal: TAB_BAR_SIDE_GAP,
    paddingTop: 35, // 👉 위아래 여백 줄임
    backgroundColor: "#2B2B2B",
    position: "absolute",
  },
  tabTouchable: {
    borderRadius: 10,
  },
  tabButton: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: "#FFFFFF",
  },
  tabButtonInactive: {
    backgroundColor: "#2B2B2B",
  },
  icon: {
    width: 60,
    height: 60,
  },
  iconInactive: {
    opacity: 0.5,
  },
});
