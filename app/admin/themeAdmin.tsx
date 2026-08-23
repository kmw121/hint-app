import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { useThemeStore } from "../../stores/themeStore";
import {
  copyImageToAppStorage,
  deleteImageIfExists,
} from "../../utils/fileHelpers";

export default function TemaAdminScreen() {
  const router = useRouter();
  const {
    title,
    minutes,
    seconds,
    resetCode,
    flashlightEnabled,
    themeImage,
    canConnect,
    lightOffTime,
    isHorizontal,
    showProgress, // ✅ 추가
    setIsHorizontal,
    setTitle,
    setMinutes,
    setSeconds,
    setResetCode,
    toggleFlashlight,
    setThemeImage,
    saveTheme,
    setCanConnect,
    setLightOffTime,
    setShowProgress, // ✅ 추가
  } = useThemeStore();

  const [tempTitle, setTempTitle] = useState(title);
  const [tempMinutes, setTempMinutes] = useState(minutes.toString());
  const [tempSeconds, setTempSeconds] = useState(seconds.toString());
  const [tempResetCode, setTempResetCode] = useState(resetCode);
  const [tempFlashlight, setTempFlashlight] = useState(flashlightEnabled);
  const [tempImage, setTempImage] = useState(themeImage);
  const [tempHorizontal, setTempHorizontal] = useState(isHorizontal);
  const [tempCanConnect, setTempCanConnect] = useState(canConnect);
  const [tempLightOffTime, setTempLightOffTime] = useState(
    lightOffTime.toString()
  );
  const [tempShowProgress, setTempShowProgress] = useState(showProgress); // ✅ 추가

  const [fadeAnim] = useState(new Animated.Value(0));
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    setTempTitle(title);
    setTempMinutes(minutes.toString());
    setTempSeconds(seconds.toString());
    setTempResetCode(resetCode);
    setTempFlashlight(flashlightEnabled);
    setTempImage(themeImage);
    setTempHorizontal(isHorizontal);
    setTempCanConnect(canConnect);
    setTempLightOffTime(lightOffTime.toString());
    setTempShowProgress(showProgress); // ✅ 동기화
  }, [
    title,
    minutes,
    seconds,
    resetCode,
    flashlightEnabled,
    themeImage,
    isHorizontal,
    canConnect,
    lightOffTime,
    showProgress, // ✅
  ]);

  const showSavedPopup = () => {
    Vibration.vibrate(100);
    fadeAnim.setValue(1);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 2000,
      useNativeDriver: true,
    }).start();
  };

  const handleSave = async () => {
    if (tempImage !== themeImage && themeImage) {
      await deleteImageIfExists(themeImage);
    }

    const sanitizedSeconds = Math.min(59, Math.max(0, Number(tempSeconds)));

    setTitle(tempTitle);
    setMinutes(Math.max(0, Number(tempMinutes)));
    setSeconds(sanitizedSeconds);
    setResetCode(tempResetCode);
    if (tempFlashlight !== flashlightEnabled) toggleFlashlight();
    if (tempHorizontal !== isHorizontal) setIsHorizontal(tempHorizontal);
    setThemeImage(tempImage ?? null);
    setCanConnect(tempCanConnect);
    setLightOffTime(Number(tempLightOffTime));
    setShowProgress(!!tempShowProgress); // ✅ 저장
    await saveTheme();
    showSavedPopup();
  };

  const handleBack = () => {
    const isModified =
      tempTitle !== title ||
      tempMinutes !== minutes.toString() ||
      tempSeconds !== seconds.toString() ||
      tempResetCode !== resetCode ||
      tempFlashlight !== flashlightEnabled ||
      tempImage !== themeImage ||
      tempHorizontal !== isHorizontal ||
      tempCanConnect !== canConnect ||
      tempLightOffTime !== lightOffTime.toString() ||
      tempShowProgress !== showProgress; // ✅ 변경감지

    if (isModified) {
      setShowConfirmModal(true);
    } else {
      router.back();
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const newUri = await copyImageToAppStorage(
        { uri: result.assets[0].uri },
        "theme"
      );
      setTempImage(newUri);
    }
  };

  const handleDeleteImage = async () => {
    setTempImage(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
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
            테마 제목
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                fontFamily: "PretendardRegular",
                fontWeight: "normal",
                color: "#2b2b2b",
              },
            ]}
            value={tempTitle}
            onChangeText={setTempTitle}
            placeholder="테마 제목 입력"
            placeholderTextColor="#2B2B2B"
          />

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
            제한 시간
          </Text>
          <View style={styles.row}>
            <TextInput
              style={[
                styles.input,
                styles.timeInput,
                {
                  fontFamily: "PretendardRegular",
                  fontWeight: "normal",
                  color: "#2b2b2b",
                },
              ]}
              value={tempMinutes}
              onChangeText={setTempMinutes}
              keyboardType="numeric"
              placeholder="분"
              placeholderTextColor="#2B2B2B"
            />
            <Text style={styles.timeDivider}>:</Text>
            <TextInput
              style={[
                styles.input,
                styles.timeInput,
                {
                  fontFamily: "PretendardRegular",
                  fontWeight: "normal",
                  color: "#2b2b2b",
                },
              ]}
              value={tempSeconds}
              onChangeText={(text) => {
                const num = Number(text);
                if (!isNaN(num)) {
                  const safe = Math.min(59, Math.max(0, num));
                  setTempSeconds(safe.toString());
                } else {
                  setTempSeconds("0");
                }
              }}
              keyboardType="numeric"
              placeholder="초"
              placeholderTextColor="#2B2B2B"
            />
          </View>

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
            힌트 초기화 코드
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                fontFamily: "PretendardRegular",
                fontWeight: "normal",
                color: "#2b2b2b",
              },
            ]}
            value={tempResetCode}
            onChangeText={setTempResetCode}
            placeholder="힌트 초기화 코드"
            placeholderTextColor="#2B2B2B"
          />

          <View style={styles.switchRow}>
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
              손전등 사용 여부
            </Text>
            <Switch value={tempFlashlight} onValueChange={setTempFlashlight} />
          </View>

          {tempFlashlight && (
            <>
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
                자동 꺼짐 시간 (초)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    fontFamily: "PretendardRegular",
                    fontWeight: "normal",
                    color: "#2b2b2b",
                  },
                ]}
                value={tempLightOffTime.toString()}
                onChangeText={(text) => {
                  const num = Number(text);
                  if (!isNaN(num) && num >= 0) {
                    setTempLightOffTime(num.toString());
                  }
                }}
                keyboardType="numeric"
                placeholder="예: 10"
                placeholderTextColor="#2B2B2B"
              />
            </>
          )}

          <View style={styles.switchRow}>
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
              가로모드 사용
            </Text>
            <Switch value={tempHorizontal} onValueChange={setTempHorizontal} />
          </View>

          {/* 대표 이미지 영역(주석 유지) */}

          <View style={styles.switchRow}>
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
              접속 허용 여부
            </Text>
            <Switch value={tempCanConnect} onValueChange={setTempCanConnect} />
          </View>

          {/* ✅ 진행률 보기 토글 */}
          <View style={styles.switchRow}>
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
              진행률 보기
            </Text>
            <Switch
              value={tempShowProgress}
              onValueChange={setTempShowProgress}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerButton, { backgroundColor: "#2B2B2B" }]}
            onPress={handleBack}
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
              돌아가기
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.footerButton, { backgroundColor: "#28a745" }]}
            onPress={handleSave}
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
              저장하기
            </Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.popup, { opacity: fadeAnim }]}>
          <Text
            style={[
              styles.popupText,
              {
                fontFamily: "PretendardBold",
                fontWeight: "normal",
                color: "#fff",
              },
            ]}
          >
            저장 완료!
          </Text>
        </Animated.View>

        <Modal
          visible={showConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowConfirmModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text
                style={[
                  styles.modalText,
                  {
                    fontFamily: "PretendardBold",
                    fontWeight: "normal",
                    color: "#fff",
                  },
                ]}
              >
                저장되지 않은 정보는 삭제됩니다{"\n"}정말 돌아가시겠습니까?
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.footerButton, { backgroundColor: "gray" }]}
                  onPress={() => setShowConfirmModal(false)}
                >
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
                    아니오
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.footerButton, { backgroundColor: "#e74c3c" }]}
                  onPress={() => {
                    setShowConfirmModal(false);
                    router.back();
                  }}
                >
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
                    예
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "rgba(255, 255, 255, 0.2)" },
  scrollContent: { padding: 16, paddingBottom: 120 },
  label: { fontSize: 16, fontWeight: "bold", marginTop: 20, color: "#2B2B2B" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
    color: "#2B2B2B",
  },
  row: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  timeInput: { flex: 1 },
  timeDivider: { marginHorizontal: 8, fontSize: 20, color: "#2B2B2B" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  imageContainer: { alignSelf: "center", marginTop: 12 },
  image: { width: 120, height: 120, borderRadius: 10 },
  imageBlock: { alignItems: "center", marginTop: 12 },
  imagePlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
  },
  footerButton: {
    flex: 1,
    marginHorizontal: 5,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },
  popup: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    backgroundColor: "#333",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  popupText: { color: "#2B2B2B", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#2B2B2B",
    padding: 20,
    borderRadius: 10,
    width: "80%",
  },
  modalText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "bold",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
