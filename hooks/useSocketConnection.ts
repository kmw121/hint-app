// hooks/useSocketConnection.ts
import { useHintStore } from "@/stores/hintStore";
import { useThemeStore } from "@/stores/themeStore";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";

import { usePushStore } from "@/stores/pushStore";
import { discoverServerUrl } from "@/utils/serverDiscovery";
import { getOrCreateSocket } from "@/utils/socketClient";
import type { Socket } from "socket.io-client";

type ChatMsg = { type: "client" | "server" | "app"; data: string; createdAt: string };

export default function useSocketConnection() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const urlRef = useRef<string | null>(null);

  const { themeCode } = useThemeStore();

  const {
    startTimer,
    stopTimer,
    changerTimer,
    setChatData,
    setProgress,
    getChatData,
    getHintCount,
    resetHintState,
    getSyncSnapshot,
    applyServerSnapshot,
    stateLoaded,
    setForcedLightOff,
    setIsNewChat,
    getIsChatTap,
  } = useHintStore();

  const { pushToken, platform: storedPlatform } = usePushStore();

  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const discoveryDone = useRef(false);
  const reconnectFailCount = useRef(0);
  const MAX_RECONNECT_FAILS = 5;

  const ensureChannels = async () => {
    if (Platform.OS !== "android") return;
    await Notifications.setNotificationChannelAsync("chat-loud", {
      name: "Chat (Loud)",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      vibrationPattern: [0, 250, 150, 250],
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    await Notifications.setNotificationChannelAsync("silent", {
      name: "Silent",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  };

  const notify = useCallback(
    async (title: string, body: string, data?: Record<string, any>, soundOn = true) => {
      try {
        if (Platform.OS === "android") await ensureChannels();
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: data ?? {},
            ...(Platform.OS === "ios" ? { sound: soundOn ? "default" : undefined } : {}),
            ...(Platform.OS === "android"
              ? { channelId: soundOn ? "chat-loud" : "silent" }
              : {}),
          },
          trigger: null,
        });
      } catch (e) {
        console.log("notify error:", e);
      }
    },
    [themeCode]
  );

  const handleIncomingPush = useCallback(
    async (payload: { title?: string; body?: string; data?: any }) => {
      try {
        const { data, body } = payload ?? {};
        const kind = data?.kind as "chat" | "lightOff" | "lightOffEnd" | undefined;

        if (kind === "chat") {
          const isTap = getIsChatTap();
          if (!isTap) setIsNewChat(true);
          await notify(
            "새 메시지 도착",
            body ?? data?.message ?? "메시지를 확인하세요.",
            { kind: "chat", themeCode },
            true
          );
          return;
        }

        if (kind === "lightOff") {
          const duration = Number(data?.duration ?? 5);
          setForcedLightOff(true);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => setForcedLightOff(false), duration * 1000);
          return;
        }

        if (kind === "lightOffEnd") {
          setForcedLightOff(false);
          return;
        }

        if (body) {
          const isTap = getIsChatTap();
          if (!isTap) setIsNewChat(true);
        }
      } catch (e) {
        console.log("handleIncomingPush error:", e);
      }
    },
    [getIsChatTap, notify, setForcedLightOff, setIsNewChat, themeCode]
  );


  const getPlatformSafe = () => {
    if (storedPlatform === "android" || storedPlatform === "ios") return storedPlatform;
    return Platform.OS === "android" ? "android" : "ios";
  };

  const registerAndSync = useCallback((s: Socket) => {
    if (!stateLoaded) return;
    s.emit(
      "register",
      {
        type: "app",
        themeCode,
        pushToken: pushToken || undefined,
        platform: getPlatformSafe(),
      },
      (registration: any) => {
        if (registration?.status !== "registered") return;
        s.emit(
          "appSync",
          { themeCode, ...getSyncSnapshot() },
          async (response: any) => {
            if (response?.snapshot) await applyServerSnapshot(response.snapshot);
          }
        );
      }
    );
  }, [themeCode, pushToken, stateLoaded, getSyncSnapshot, applyServerSnapshot]);

  const attachHandlers = useCallback(
    (s: Socket) => {
      // 중복 핸들러 방지
      s.off("connect");
      s.off("disconnect");
      s.off("connect_error");
      s.off("command");
      s.off("stateSnapshot");

      s.on("connect", () => {
        console.log("✅ 소켓 연결 성공:", s.id);
        reconnectFailCount.current = 0;
        registerAndSync(s);
      });

      s.on("disconnect", (reason) => {
        console.log("❌ 서버 연결 끊김 (이유:", reason, ")");
      });

      s.on("connect_error", (err: any) => {
        const msg = err?.message || err?.description || JSON.stringify(err) || "알 수 없는 오류";
        console.log("❌ 소켓 연결 실패:", msg);
        reconnectFailCount.current += 1;
        if (reconnectFailCount.current >= MAX_RECONNECT_FAILS) {
          console.log("🔄 재연결 실패 횟수 초과 → 서버 재탐색 시작");
          reconnectFailCount.current = 0;
          triggerRediscovery();
        }
      });

      s.on("stateSnapshot", async ({ snapshot }: { snapshot: any }) => {
        await applyServerSnapshot(snapshot);
        s.emit("snapshotAck", {
          themeCode,
          generation: snapshot?.generation,
          revision: snapshot?.revision,
        });
      });

      s.on("command", ({ command, data }: { command: string; data: any }) => {
        if (command === "startTimer") {
          startTimer(0, data.remainingTime);
          s.emit("toControl", { themeCode, status: "completeSync", data: "스타트" });
          return;
        }
        if (command === "stopTimer") {
          stopTimer();
          s.emit("toControl", { themeCode, status: "completeSync", data: "정지" });
          return;
        }
        if (command === "changeTime") {
          changerTimer(data.remainingTime, data.isRunning);
          s.emit("toControl", { themeCode, status: "completeSync", data: "시간" });
          return;
        }
        if (command === "changeProgress") {
          setProgress(data.progress);
          s.emit("toControl", { themeCode, status: "completeSync", data: "진행률" });
          return;
        }
        if (command === "reset") {
          resetHintState();
          s.emit("toControl", { themeCode, status: "completeSync", data: "리셋" });
          return;
        }
        if (command === "lightOff") {
          setForcedLightOff(true);
          const duration = data?.duration ?? 5;

          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => setForcedLightOff(false), duration * 1000);

          s.emit("toControl", { themeCode, status: "completeSync", data: "암전" });
          return;
        }

        if (command === "changeChat") {
          const chatData = Array.isArray(data?.chatData) ? (data.chatData as ChatMsg[]) : [];
          chatData.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          setChatData(chatData, false);

          const isTap = getIsChatTap();
          if (!isTap) setIsNewChat(true);
          return;
        }

        if (command === "requestSync") {
          registerAndSync(s); // 최신상태로 다시 보내기
          return;
        }

        if (command === "doSync") {
          // 서버에서 내려준 전체 스냅샷 반영
          const nextChat = Array.isArray(data?.chatData) ? (data.chatData as ChatMsg[]) : [];
          setChatData(nextChat, false);

          changerTimer(
            data.isRunning === 1 ? data.remainingTime - 2000 : data.remainingTime,
            data.isRunning
          );
          setProgress(data.progress);

          const myChat = getChatData();
          const prevServerCount = myChat.filter((m) => m.type === "server").length;
          const nextServerCount = nextChat.filter((m) => m.type === "server").length;
          if (nextServerCount > prevServerCount) {
            const isTap = getIsChatTap();
            if (!isTap) setIsNewChat(true);
          }

          s.emit("toControl", { themeCode, status: "completeSync", data: "전체" });
          return;
        }
      });
    },
    [
      themeCode,
      registerAndSync,
      startTimer,
      stopTimer,
      changerTimer,
      setChatData,
      setProgress,
      resetHintState,
      setForcedLightOff,
      setIsNewChat,
      getIsChatTap,
      getChatData,
      applyServerSnapshot,
    ]
  );

  // ✅ 서버 재탐색 트리거 (연결 실패 시 호출)
  const triggerRediscovery = useCallback(async () => {
    const { clearServerUrl } = await import("@/utils/serverDiscovery");
    await clearServerUrl();
    const url = await discoverServerUrl();
    if (url && url !== serverUrl) {
      setServerUrl(url);
    }
  }, [serverUrl]);

  // ✅ 서버 자동 탐색 (마운트 시 1회)
  useEffect(() => {
    if (!stateLoaded) return;
    if (discoveryDone.current) return;
    discoveryDone.current = true;

    let cancelled = false;
    (async () => {
      const url = await discoverServerUrl();
      if (!cancelled && url) setServerUrl(url);
      else if (!cancelled) console.warn("서버 자동 탐색 실패");
    })();
    return () => { cancelled = true; };
  }, [stateLoaded]);

  // ✅ 서버 URL 확보 후 소켓 연결/핸들러 부착
  useEffect(() => {
    if (!serverUrl || !stateLoaded) return;

    if (urlRef.current === serverUrl && socketRef.current) {
      attachHandlers(socketRef.current);
      if (!socketRef.current.connected) {
        socketRef.current.connect();
      }
      return;
    }

    urlRef.current = serverUrl;
    const s = getOrCreateSocket(serverUrl);
    socketRef.current = s;

    attachHandlers(s);

    if (!s.connected) s.connect();
  }, [serverUrl, stateLoaded, attachHandlers]);


  // ✅ pushToken이 나중에 생겨도 "재등록"만 (새 소켓 생성 X)
  useEffect(() => {
    const s = socketRef.current;
    if (!s || !s.connected) return;

    if (pushToken) {
      s.emit("register", {
        type: "app",
        themeCode,
        pushToken,
        platform: getPlatformSafe(),
      });
      console.log("🔁 re-register with pushToken");
    }
  }, [pushToken, themeCode, storedPlatform]);

  // ✅ 푸시 리스너
  useEffect(() => {
    const sub1 = Notifications.addNotificationReceivedListener((n) => {
      const content: any = n.request?.content ?? {};
      handleIncomingPush({
        title: (content.title as string | null) || undefined,
        body: (content.body as string | null) || undefined,
        data: content.data,
      });
    });

    const sub2 = Notifications.addNotificationResponseReceivedListener((resp) => {
      const content: any = resp.notification?.request?.content ?? {};
      handleIncomingPush({
        title: (content.title as string | null) || undefined,
        body: (content.body as string | null) || undefined,
        data: content.data,
      });
    });

    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, [handleIncomingPush]);

  // ✅ 앱이 포그라운드로 돌아올 때 소켓 연결 상태 확인 → 끊겼으면 재연결/재탐색
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        const s = socketRef.current;
        if (s && !s.connected) {
          console.log("🔄 앱 복귀 → 소켓 재연결 시도");
          s.connect();
        } else if (!s) {
          // 소켓 자체가 없으면 재탐색
          triggerRediscovery();
        }
      }
    });
    return () => sub.remove();
  }, [triggerRediscovery]);
}
