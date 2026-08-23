import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Vibration,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import type { Hint } from "../../stores/hintStore";
import { useHintStore } from "../../stores/hintStore";
import { copyImageToAppStorage } from "../../utils/fileHelpers";

export default function AdminHintScreen() {
  const router = useRouter();
  const {
    hints,
    editHints,
    editHint,
    addHint,
    moveHint,
    updateHintsFromEdit,
    removeHint,
    duplicateHintIds,
    clearDuplicateHintIds,
  } = useHintStore();

  const [fadeAnim] = useState(new Animated.Value(0));
  const listRef = useRef<FlatList>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  React.useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const showSavedPopup = () => {
    Vibration.vibrate(100);
    fadeAnim.setValue(1);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 2000,
      useNativeDriver: true,
    }).start();
  };

  const areHintsEqual = () => {
    if (hints.length !== editHints.length) return false;
    for (let i = 0; i < hints.length; i++) {
      const a = hints[i];
      const b = editHints[i];
      if (
        a.code !== b.code ||
        a.text !== b.text ||
        a.imageUri !== b.imageUri ||
        a.answer !== b.answer
      )
        return false;
    }
    return true;
  };

  const pickImage = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const selected = result.assets[0];
      const currentHint = editHints[index];

      const newImageUri = await copyImageToAppStorage(
        { uri: selected.uri },
        currentHint.id
      );

      editHint(index, { imageUri: newImageUri });
    }
  };

  const handleAddHint = () => {
    addHint();
    setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollToOffset({ offset: 9999, animated: true });
      }
    }, 100);
  };

  const handleBack = () => {
    if (areHintsEqual()) {
      clearDuplicateHintIds();
      router.back();
    } else {
      setShowConfirmModal(true);
    }
  };

  const renderHintItem = ({ item, index }: { item: Hint; index: number }) => (
    <Pressable
      style={[
        styles.hintBox,
        { borderWidth: 0, backgroundColor: "rgba(255,255,255,0)" },
      ]}
      onPress={() => Keyboard.dismiss()}
    >
      <View
        style={[
          styles.hintBox,
          duplicateHintIds.includes(item.id) && {
            borderColor: "red",
            borderWidth: 2,
          },
        ]}
      >
        <View style={styles.imageWrapper}>
          <TouchableOpacity onPress={() => pickImage(index)}>
            {item.imageUri ? (
              <Image source={{ uri: item.imageUri }} style={styles.image} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text
                  style={{
                    fontFamily: "PretendardRegular",
                    fontWeight: "normal",
                  }}
                >
                  이미지 선택
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {item.imageUri && (
          <TouchableOpacity
            onPress={() => editHint(index, { imageUri: null })}
            style={[
              styles.footerButton,
              { backgroundColor: "#e74c3c", marginBottom: 10 },
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                { fontFamily: "PretendardRegular", fontWeight: "normal" },
              ]}
            >
              이미지 삭제
            </Text>
          </TouchableOpacity>
        )}

        <TextInput
          placeholder="힌트 코드"
          value={item.code || ""}
          onChangeText={(text) => editHint(index, { code: text })}
          onFocus={() =>
            listRef.current?.scrollToIndex?.({ index, animated: true })
          }
          style={[
            styles.input,
            { fontFamily: "PretendardRegular", fontWeight: "normal" },
          ]}
        />

        <TextInput
          placeholder="힌트 내용"
          value={item.text || ""}
          onChangeText={(text) => editHint(index, { text })}
          onFocus={() =>
            listRef.current?.scrollToIndex?.({ index, animated: true })
          }
          style={[
            styles.multilineInput,
            { fontFamily: "PretendardRegular", fontWeight: "normal" },
          ]}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* ✅ 정답 입력도 여러 줄 + 줄바꿈 가능하도록 변경 */}
        <TextInput
          placeholder="정답 입력"
          value={item.answer || ""}
          onChangeText={(answer) => editHint(index, { answer })}
          onFocus={() =>
            listRef.current?.scrollToIndex?.({ index, animated: true })
          }
          style={[
            styles.multilineInput,
            { fontFamily: "PretendardRegular", fontWeight: "normal" },
          ]}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <View style={styles.arrowBox}>
          {index > 0 && (
            <TouchableOpacity onPress={() => moveHint(index, "up")}>
              <Text style={styles.arrow}>⬆</Text>
            </TouchableOpacity>
          )}
          {index < editHints.length - 1 && (
            <TouchableOpacity onPress={() => moveHint(index, "down")}>
              <Text style={styles.arrow}>⬇</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionBox}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#e74c3c" }]}
            onPress={() => removeHint(item.id)}
          >
            <Text
              style={[
                styles.actionText,
                { fontFamily: "PretendardRegular", fontWeight: "normal" },
              ]}
            >
              삭제
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#3498db" }]}
            onPress={() =>
              router.push({
                pathname: "/hintPreview",
                params: { code: item.code },
              })
            }
          >
            <Text
              style={[
                styles.actionText,
                { fontFamily: "PretendardRegular", fontWeight: "normal" },
              ]}
            >
              미리보기
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <FlatList
            ref={listRef}
            data={editHints}
            keyExtractor={(item) => item.id}
            renderItem={renderHintItem}
            contentContainerStyle={{
              paddingBottom: isKeyboardVisible ? 250 : 80,
            }}
            keyboardShouldPersistTaps="handled"
          />

          <View style={styles.fixedFooter}>
            <TouchableOpacity
              style={[styles.footerButton, { backgroundColor: "gray" }]}
              onPress={handleBack}
            >
              <Text
                style={[
                  styles.buttonText,
                  { fontFamily: "PretendardRegular", fontWeight: "normal" },
                ]}
              >
                돌아가기
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={handleAddHint}
            >
              <Text
                style={[
                  styles.buttonText,
                  { fontFamily: "PretendardRegular", fontWeight: "normal" },
                ]}
              >
                힌트 추가
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, { backgroundColor: "green" }]}
              onPress={() => {
                updateHintsFromEdit();
                showSavedPopup();
              }}
            >
              <Text
                style={[
                  styles.buttonText,
                  { fontFamily: "PretendardRegular", fontWeight: "normal" },
                ]}
              >
                힌트 저장
              </Text>
            </TouchableOpacity>
          </View>

          <Animated.View style={[styles.popup, { opacity: fadeAnim }]}>
            <Text style={styles.popupText}>저장 완료!</Text>
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
                    { fontFamily: "PretendardRegular", fontWeight: "normal" },
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
                          fontFamily: "PretendardRegular",
                          fontWeight: "normal",
                        },
                      ]}
                    >
                      아니오
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.footerButton,
                      { backgroundColor: "#e74c3c" },
                    ]}
                    onPress={() => {
                      setShowConfirmModal(false);
                      clearDuplicateHintIds();
                      router.back();
                    }}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        {
                          fontFamily: "PretendardRegular",
                          fontWeight: "normal",
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
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  hintBox: {
    padding: 10,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 1)",
  },
  imageWrapper: {
    alignSelf: "center",
    borderColor: "#000",
    borderWidth: 1,
    borderRadius: 5,
    marginVertical: 10,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 5,
    alignSelf: "center",
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eee",
    borderRadius: 5,
    alignSelf: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 8,
    marginBottom: 5,
  },
  multilineInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 8,
    marginBottom: 10,
    minHeight: 80,
    textAlignVertical: "top",
  },
  arrowBox: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 5,
  },
  arrow: {
    fontSize: 20,
    marginHorizontal: 10,
  },
  actionBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#000",
  },
  actionText: {
    color: "#fff",
    fontWeight: "bold",
  },
  fixedFooter: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
  },
  footerButton: {
    flex: 1,
    marginHorizontal: 5,
    padding: 10,
    backgroundColor: "#007AFF",
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  popup: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    backgroundColor: "#333",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  popupText: {
    color: "#fff",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
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
