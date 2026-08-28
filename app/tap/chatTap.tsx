import type { ChatMessage } from "@/stores/hintStore";
import { useHintStore } from "@/stores/hintStore";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function ChatTapScreen() {
  const [message, setMessage] = useState("");
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const { chatData, setChatData } = useHintStore();

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const formatKoreanTime = (utcString: string) => {
    const date = new Date(utcString); // 이미 UTC → 로컬(KST) 자동 변환됨
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const handleSend = () => {
    if (!message.trim()) return;

    const newMessage: ChatMessage = {
      type: "client",
      data: message.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated: ChatMessage[] = [...chatData, newMessage];

    setChatData(updated, true);
    setMessage("");

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={isKeyboardVisible ? 35 : -3}
      >
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.chatBox}
            ref={scrollViewRef}
            onContentSizeChange={() =>
              scrollViewRef.current?.scrollToEnd({ animated: true })
            }
          >
            {chatData.length === 0 ? (
              <Text
                style={[
                  styles.chatPlaceholder,
                  {
                    fontFamily: "PretendardBold",
                    fontWeight: "normal",
                  },
                ]}
              ></Text>
            ) : (
              chatData.map((msg, index) =>
                msg.type === "server" ? (
                  // 서버 메시지: 왼쪽 정렬 + 시간은 오른쪽
                  <View
                    key={index}
                    style={[styles.messageLine, styles.leftLine]}
                  >
                    <View style={styles.serverRow}>
                      <Text
                        style={[
                          styles.messageText,
                          {
                            fontFamily: "PretendardBold",
                            fontWeight: "normal",
                          },
                          styles.incomingText,
                        ]}
                      >
                        {msg.data}
                      </Text>
                      <Text style={[styles.timeText, styles.serverTimeText]}>
                        {formatKoreanTime(msg.createdAt)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  // 클라이언트 메시지: 오른쪽 정렬 (기존 방식 유지)
                  <View
                    key={index}
                    style={[styles.messageLine, styles.rightLine]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        {
                          fontFamily: "PretendardBold",
                          fontWeight: "normal",
                        },
                        styles.outgoingText,
                      ]}
                    >
                      <Text style={styles.timeText}>
                        {formatKoreanTime(msg.createdAt)}
                      </Text>
                      {"  "}
                      {msg.data}
                    </Text>
                  </View>
                )
              )
            )}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.input,
                {
                  fontFamily: "PretendardBold",
                  fontWeight: "normal",
                },
              ]}
              value={message}
              onChangeText={setMessage}
              placeholderTextColor="#aaa"
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
              <Text
                style={[
                  styles.sendText,
                  {
                    fontFamily: "PretendardBold",
                    fontWeight: "normal",
                    color: "#fff",
                  },
                ]}
              >
                전송
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatBox: {
    flexGrow: 1,
    padding: 16,
    justifyContent: "flex-end",
  },
  chatPlaceholder: {
    color: "#888",
    textAlign: "center",
    marginTop: 20,
  },

  // ✅ 버블/배경 없이 좌우 정렬
  messageLine: {
    marginVertical: 6,
    maxWidth: "92%",
  },
  leftLine: {
    alignSelf: "flex-start", // server 왼쪽
  },
  rightLine: {
    alignSelf: "flex-end", // client 오른쪽
  },

  // 서버 한 줄 (메시지 왼쪽, 시간 오른쪽)
  serverRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  messageText: {
    fontSize: 22,
    lineHeight: 28,
    flexShrink: 1,
  },
  incomingText: {
    color: "#E53935", // 수신 → 빨간 글씨
    textAlign: "left",
  },
  outgoingText: {
    color: "#2b2b2b", // 송신 → 검정 글씨
    textAlign: "right",
  },
  timeText: {
    fontSize: 14,
    color: "#999",
  },
  serverTimeText: {
    marginLeft: 8,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#2b2b2b",
    borderRadius: 15,
    paddingHorizontal: 10,
    height: 60,
    marginRight: 8,
    color: "#2b2b2b",
    fontSize: 24,
    backgroundColor: "#fff",
  },
  sendButton: {
    backgroundColor: "#2b2b2b",
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 15,
    height: 60,
  },
  sendText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
