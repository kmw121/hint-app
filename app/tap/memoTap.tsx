import { useMemo, useRef } from "react";
import {
  Image,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Svg, { Path } from "react-native-svg";
import { useMemoStore } from "../../stores/memoStore";
import { useThemeStore } from "../../stores/themeStore";

/** 아이콘 (현재 파일 위치 기준: app/tap/..., 루트의 asset/ 폴더) */
import eraserIcon from "../../assets/images/origin/eraser.png";
import resetIcon from "../../assets/images/origin/reset.png";

export default function MemoTapScreen() {
  const { flashlightEnabled } = useThemeStore();

  const {
    strokes,
    currentStroke,
    addPointToCurrent,
    commitCurrentStroke,
    currentColor,
    setColor,
    isEraser,
    toggleEraser,
    clearStrokes,
  } = useMemoStore();

  // ✅ 최신 함수 참조를 항상 유지 (스테일 클로저 방지)
  const fnRef = useRef({ addPointToCurrent, commitCurrentStroke });
  fnRef.current = { addPointToCurrent, commitCurrentStroke };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          fnRef.current.addPointToCurrent({ x: locationX, y: locationY });
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          fnRef.current.addPointToCurrent({ x: locationX, y: locationY });
        },
        onPanResponderRelease: () => {
          fnRef.current.commitCurrentStroke();
        },
        onPanResponderTerminate: () => {
          fnRef.current.commitCurrentStroke();
        },
      }),
    []
  );

  const createPathD = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return "";
    const path = [`M ${points[0].x} ${points[0].y}`];
    for (let i = 1; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      path.push(`Q ${p1.x} ${p1.y} ${midX} ${midY}`);
    }
    return path.join(" ");
  };

  /** 공통 색상 버튼 렌더러 (선택 상태일 때 확대) */
  const renderColorButton = (hex: string) => {
    const selected = !isEraser && currentColor === hex;
    return (
      <TouchableOpacity
        key={hex}
        style={[
          styles.colorButtonBase,
          { backgroundColor: hex },
          selected && styles.buttonSelected,
        ]}
        onPress={() => setColor(hex)}
        activeOpacity={0.9}
      />
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.drawingArea} {...panResponder.panHandlers}>
          <Svg style={{ flex: 1 }}>
            {strokes.map((stroke, idx) => (
              <Path
                key={idx}
                d={createPathD(stroke.points)}
                fill="none"
                stroke={stroke.color}
                strokeWidth={stroke.isEraser ? 12 : 4}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {currentStroke.length > 1 && (
              <Path
                d={createPathD(currentStroke)}
                fill="none"
                stroke={isEraser ? "#fff" : currentColor}
                strokeWidth={isEraser ? 12 : 4}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
          </Svg>
        </View>

        <View style={styles.buttonRow}>
          {renderColorButton("#000")}
          {renderColorButton("red")}
          {renderColorButton("blue")}
          {renderColorButton("green")}

          {/* 지우개 아이콘 버튼 */}
          <TouchableOpacity
            style={[
              styles.iconButton,
              { borderWidth: 1, borderColor: "black" },
              isEraser && styles.buttonSelected,
            ]}
            onPress={toggleEraser}
            activeOpacity={0.8}
          >
            <Image
              source={eraserIcon}
              style={[styles.icon, { tintColor: "#2b2b2b" }]}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* 초기화 아이콘 버튼 */}
          <TouchableOpacity
            style={[styles.iconButton, styles.resetButton]}
            onPress={clearStrokes}
            activeOpacity={0.8}
          >
            <Image
              source={resetIcon}
              style={[styles.icon, { tintColor: "#fff" }]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const BTN_SIZE = 50;
const ICON_SIZE = 36;
const styles = StyleSheet.create({
  container: { flex: 1 },
  drawingArea: { flex: 1, backgroundColor: "#ffffff" },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    height: 90,
  },

  colorButtonBase: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  buttonSelected: {
    transform: [{ scale: 1.5 }],
  },

  iconButton: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  /** 초기화 버튼 */
  resetButton: {
    backgroundColor: "#2b2b2b",
  },

  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },

  toolText: {
    color: "#fff",
    fontWeight: "bold",
  },
  clearText: { color: "#fff", fontWeight: "bold" },
});
