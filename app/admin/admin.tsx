import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useHintStore } from "../../stores/hintStore";

export default function AdminMainScreen() {
  const router = useRouter();
  const { clearEditHints } = useHintStore();

  useEffect(() => {
    clearEditHints();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.middleContent}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => router.push("../admin/themeAdmin")}
        >
          <Text
            style={[
              styles.buttonText,
              { fontFamily: "PretendardRegular", fontWeight: "normal" },
            ]}
          >
            테마 설정
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => router.push("../admin/hintAdmin")}
        >
          <Text
            style={[
              styles.buttonText,
              { fontFamily: "PretendardRegular", fontWeight: "normal" },
            ]}
          >
            힌트 설정
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text
            style={[
              styles.backButtonText,
              { fontFamily: "PretendardRegular", fontWeight: "normal" },
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
  container: {
    flex: 1,
    justifyContent: "space-between",
    padding: 20,
  },
  middleContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  menuButton: {
    backgroundColor: "#2B2B2B",
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginVertical: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
  },
  footer: {
    alignItems: "center",
    paddingBottom: 20,
  },
  backButton: {
    backgroundColor: "#888",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
