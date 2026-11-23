import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Keyboard,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/* 아이콘 PNG (경로: ../assets/images/flight/taps/) */
import chatTap from "../assets/images/flight/taps/chatTap.png";
import chatTapActive from "../assets/images/flight/taps/chatTapActive.png";
import flashTap from "../assets/images/flight/taps/flashTap.png";
import flashTapActive from "../assets/images/flight/taps/flashTapActive.png";
import hintTap from "../assets/images/flight/taps/hintTap.png";
import hintTapActive from "../assets/images/flight/taps/hintTapActive.png";
import indexIcon from "../assets/images/flight/taps/index.png";
import indexActive from "../assets/images/flight/taps/indexActive.png";
import memoTap from "../assets/images/flight/taps/memoTap.png";
import memoTapActive from "../assets/images/flight/taps/memoTapActive.png";
import settingTap from "../assets/images/flight/taps/settingTap.png";
import settingTapActive from "../assets/images/flight/taps/settingTapActive.png";

const TabRoutes = {
  Main: "/",
  Hint: "/tap/hintTap",
  Chat: "/tap/chatTap",
  Memo: "/tap/memoTap",
  Flash: "/tap/flashTap",
  Setting: "/tap/settingTap",
} as const;

const TAB_BUTTON_MAX = 54;

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
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const newChatAnim = useRef(new Animated.Value(0)).current;
  const tabCount = flashlightEnabled ? 6 : 5;
  const buttonSize = Math.min(
    TAB_BUTTON_MAX,
    Math.floor((width - 24 - (tabCount - 1) * 4) / tabCount)
  );
  const iconSize = Math.floor(buttonSize * 0.68);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

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

  if (keyboardVisible) return null;

  return (
    <View style={[styles.tabBar, { height: 68 + insets.bottom, paddingBottom: Math.max(insets.bottom, 8) }]}>
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
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 12,
    paddingTop: 6,
    backgroundColor: "#264d84",
    position: "absolute",
    bottom: 0,
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
    backgroundColor: "#FFFFFF",
  },
  icon: {
    width: 60,
    height: 60,
  },
  iconInactive: {
    opacity: 0.5,
  },
});
