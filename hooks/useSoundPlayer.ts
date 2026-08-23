import { Audio } from "expo-av";
import { useEffect, useRef } from "react";

export default function useSoundPlayer() {
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    const loadSound = async () => {
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/sounds/chat.mp3") // ← 이 파일 경로는 프로젝트 내부
      );
      soundRef.current = sound;
    };

    loadSound();

    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const playSound = async () => {
    try {
      await soundRef.current?.replayAsync(); // currentTime 0에서 재생
    } catch (e) {
      console.warn("사운드 재생 실패", e);
    }
  };

  return { playSound };
}
