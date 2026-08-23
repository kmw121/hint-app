import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  ImageLoadEventData,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useHintStore } from "../stores/hintStore";

export default function HintPreviewScreen() {
  const { width, height } = useWindowDimensions();
  const FOOTER_HEIGHT = height * 0.1;

  const { code } = useLocalSearchParams();
  const router = useRouter();
  const { editHints, getEditHintByCode } = useHintStore();

  const [matched, setMatched] = useState<{
    text: string;
    imageUri: string | null | undefined;
    answer: string;
  } | null>(null);

  const [imageRatio, setImageRatio] = useState<number | null>(null); // h/w
  const [showAnswer, setShowAnswer] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (typeof code === "string") {
      const found = getEditHintByCode(code);
      if (found) {
        setMatched({
          text: found.text,
          imageUri: found.imageUri,
          answer: found.answer ?? "",
        });
      } else {
        setMatched(null);
      }
      setImageRatio(null);
    }
  }, [code, editHints, getEditHintByCode]);

  const handleImageLoad = useCallback(
    (e: NativeSyntheticEvent<ImageLoadEventData>) => {
      const { width: w, height: h } = e.nativeEvent.source;
      if (w && h) setImageRatio(h / w);
    },
    []
  );

  useEffect(() => {
    if (matched?.imageUri && imageRatio == null) {
      Image.getSize(
        matched.imageUri,
        (ow, oh) => setImageRatio(oh / ow),
        () => {}
      );
    }
  }, [matched?.imageUri, imageRatio]);

  const toggleAnswer = useCallback(() => {
    setShowAnswer((prev) => {
      const next = !prev;
      if (!prev) {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        });
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 50);
      }
      return next;
    });
  }, []);

  const targetWidth = Math.max(0, width * 0.8);
  const computedImageWidth = targetWidth;
  const computedImageHeight = imageRatio
    ? targetWidth * imageRatio
    : targetWidth * 0.5;

  if (!matched) {
    return (
      <View style={styles.containerWithFooter}>
        <View style={styles.centerContent}>
          <Text style={styles.message}>해당 힌트를 찾을 수 없습니다.</Text>
        </View>
        <View style={[styles.footerFixed, { height: FOOTER_HEIGHT }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.containerWithFooter}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }} // ✅ 스크롤뷰가 화면 전체 높이를 가지게
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: FOOTER_HEIGHT },
        ]}
        onContentSizeChange={() => {
          if (showAnswer) scrollRef.current?.scrollToEnd({ animated: true });
        }}
      >
        {/* 이미지 + 힌트 텍스트 영역 */}
        {matched.imageUri ? (
          <Image
            source={{ uri: matched.imageUri }}
            style={{
              width: computedImageWidth,
              height: computedImageHeight,
              resizeMode: "contain",
              borderRadius: 10,
              marginBottom: 20,
              opacity: imageRatio ? 1 : 0.001,
            }}
            onLoad={handleImageLoad}
          />
        ) : null}

        <Text
          style={[
            styles.hintText,
            {
              fontFamily: "PretendardBold",
              fontWeight: "normal",
              color: "#2b2b2b",
            },
          ]}
        >
          {matched.text}
        </Text>

        {/* 정답 영역 (길어지면 자동으로 아래로 늘어남) */}
        <View style={styles.answerContainer}>
          <TouchableOpacity style={styles.answerButton} onPress={toggleAnswer}>
            <Text
              style={[
                styles.answerButtonText,
                {
                  fontFamily: "PretendardBold",
                  fontWeight: "normal",
                },
              ]}
            >
              {showAnswer ? "정답 숨기기" : "정답 보기"}
            </Text>
          </TouchableOpacity>

          {showAnswer && (
            <Text
              style={[
                styles.answerText,
                {
                  fontFamily: "PretendardBold",
                  fontWeight: "normal",
                  color: "#2b2b2b",
                },
              ]}
            >
              정답 : {matched.answer || "없음"}
            </Text>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footerFixed, { height: FOOTER_HEIGHT }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  containerWithFooter: { flex: 1 },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: {
    flexGrow: 1, // ✅ 내용 적을 때는 위로, 많아지면 스크롤 영역 확장
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  hintText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
    color: "#000",
  },
  answerContainer: {
    alignItems: "center",
    width: "100%",
    marginTop: 10,
    marginBottom: 20, // 푸터랑 살짝 여유
  },
  answerButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#2b2b2b",
    marginBottom: 10,
  },
  answerButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  answerText: {
    fontSize: 18,
    color: "#e67e22",
    fontWeight: "bold",
    marginTop: 10,
    textAlign: "center",
  },
  message: { fontSize: 16, color: "#333", margin: 20, textAlign: "center" },
  footerFixed: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  backButton: {
    backgroundColor: "#888",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
