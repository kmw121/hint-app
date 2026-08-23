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

export default function HintDetailScreen() {
  const { width, height } = useWindowDimensions();
  const FOOTER_HEIGHT = height * 0.1;

  const { code } = useLocalSearchParams();
  const { hints } = useHintStore();
  const router = useRouter();

  const [matched, setMatched] = useState<{
    text: string;
    imageUri: string | null | undefined;
    answer: string;
  } | null>(null);

  const [imageRatio, setImageRatio] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (typeof code === "string") {
      const found = hints.find((hint) => hint.code === code);
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
  }, [code, hints]);

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
        // 정답 열릴 때 아래로 스크롤
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
      <View style={[styles.containerWithFooter]}>
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

  const hasImage = !!matched.imageUri;

  return (
    <View style={styles.containerWithFooter}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          {
            minHeight: height - FOOTER_HEIGHT * 0.3,
            paddingBottom: matched.answer || matched.text ? FOOTER_HEIGHT : 0,
            // ✅ 이미지 없을 때 세로 중앙 정렬
            justifyContent: hasImage ? "flex-start" : "center",
            // ✅ 이미지 있을 때만 위쪽 패딩
            paddingTop: hasImage ? 20 : 0,
          },
        ]}
        onContentSizeChange={() => {
          if (showAnswer) {
            scrollRef.current?.scrollToEnd({ animated: true });
          }
        }}
      >
        {/* 위쪽: 이미지 + 힌트 텍스트 */}
        <View style={styles.fillAndSplit}>
          <View style={styles.topBlock}>
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
          </View>
        </View>

        {/* 아래쪽: 정답 버튼 + 정답 텍스트 */}
        {matched.answer && (
          <View style={styles.bottomBlock}>
            <TouchableOpacity
              style={styles.answerButton}
              onPress={toggleAnswer}
            >
              <Text
                style={[
                  styles.answerButtonText,
                  { fontFamily: "PretendardBold", fontWeight: "normal" },
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
        )}
      </ScrollView>

      <View style={[styles.footerFixed, { height: FOOTER_HEIGHT }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text
            style={[
              styles.buttonText,
              { fontFamily: "PretendardBold", fontWeight: "normal" },
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
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    // paddingTop 는 여기서 제거하고 위에서 조건부로 넣음
  },
  fillAndSplit: {
    width: "100%",
    alignItems: "center",
  },
  topBlock: {
    alignItems: "center",
    width: "100%",
  },
  bottomBlock: {
    alignItems: "center",
    width: "100%",
    marginTop: 20,
    marginBottom: 20,
  },
  hintText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
    color: "#2B2B2B",
  },
  answerButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#2B2B2B",
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
    backgroundColor: "#fff",
    borderTopWidth: 2,
    borderColor: "#2b2b2b",
  },
  backButton: {
    backgroundColor: "#888",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
