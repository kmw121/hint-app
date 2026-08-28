// src/utils/notifications.ts  (전체 교체)
import { usePushStore } from "@/stores/pushStore";
import { useHintStore } from "@/stores/hintStore";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

const ANDROID_CHANNEL_ID = "chat-messages-v2";
const BG_TASK_NAME = "NOTIFICATION_BACKGROUND_TASK";

// iOS (SDK 53) 포그라운드 표시 정책
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// 안드로이드 채널 보장 (서버가 보내는 channelId와 동일해야 한다.)
async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "채팅 메시지",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });
}

// 안전한 content 추출
function getContentSafe(n?: Notifications.Notification | null) {
  return n?.request?.content as Notifications.NotificationContent | undefined;
}

// data-only 형태 정규화 (payload → object)
function normalizeDataOnly(payload: any) {
  let message: any = payload ?? {};
  if (typeof message?.data === "string") {
    try {
      message = JSON.parse(message.data);
    } catch {
      message = message.data;
    }
  } else if (message?.data && typeof message.data === "object") {
    message = message.data;
  }
  return message;
}

function markNewChatFromNotification(payload: any) {
  const message = normalizeDataOnly(payload);
  const isChat =
    message?.kind === "chat" ||
    (message?.kind === "command" && message?.command === "changeChat");
  if (!isChat) return;

  const hintStore = useHintStore.getState();
  if (!hintStore.getIsChatTap()) hintStore.setIsNewChat(true);
}

// Expo Push Token 획득
async function getPushTokenAsync() {
  if (!Device.isDevice) throw new Error("실기기에서 테스트해줘!");

  // Android 13 이상에서는 권한 요청 전에 채널이 있어야 안정적으로 등록된다.
  await ensureAndroidChannel();

  // 권한
  const perm = await Notifications.getPermissionsAsync();
  let status = perm.status;
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") throw new Error("알림 권한이 필요해!");

  // 프로젝트 ID
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  // Expo Push Token
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  return token;
}

/**
 * 백그라운드 태스크 (헤드리스 실행 포함)
 * ⚠️ 절대 구조분해 금지, 항상 ?. 로만 접근
 */
if (!TaskManager.isTaskDefined(BG_TASK_NAME)) {
  TaskManager.defineTask(BG_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.log("BG Task error:", error);
      return;
    }

    try {
      const payload: any = data ?? {};
      // 케이스 A) 알림 탭/액션 응답 (NotificationResponse)
      if (
        payload &&
        typeof payload === "object" &&
        "actionIdentifier" in payload
      ) {
        const resp = payload as Notifications.NotificationResponse;
        const content = getContentSafe(resp?.notification);
        if (content) {
          markNewChatFromNotification(content.data);
          console.log("📩 BG 응답:", {
            action: resp.actionIdentifier,
            title: content.title,
            body: content.body,
            data: content.data,
          });
        } else {
          console.log("📩 BG 응답: content 없음");
        }
        return;
      }

      // 케이스 B) 일반 알림 객체
      if (
        payload &&
        typeof payload === "object" &&
        "notification" in payload &&
        payload.notification
      ) {
        const notif = payload.notification as Notifications.Notification;
        const content = getContentSafe(notif);
        if (content) {
          markNewChatFromNotification(content.data);
          console.log("📩 BG 알림:", {
            title: content.title,
            body: content.body,
            data: content.data,
          });
        } else {
          console.log("📩 BG 알림: content 없음");
        }
        return;
      }

      // 케이스 C) data-only (알림 UI 없이 데이터만)
      const message = normalizeDataOnly(payload);
      markNewChatFromNotification(message);
      console.log("📩 BG data-only:", message);
    } catch (e) {
      console.log("BG handler crashed:", e);
    }
  });
}

// 태스크 등록 (이미 등록되어 있으면 조용히 무시)
async function registerBackgroundTask() {
  try {
    await Notifications.registerTaskAsync(BG_TASK_NAME);
  } catch (e) {
    // 중복 등록 등은 무시
    // console.log("registerTaskAsync:", String(e));
  }
}

let _initialized = false;

/** 레이아웃에서 1회 호출. 토큰을 pushStore에 저장. */
export async function initNotificationsOnce(): Promise<string | null> {
  if (_initialized) return usePushStore.getState().pushToken;

  const token = await getPushTokenAsync();
  const platform =
    Platform.OS === "android"
      ? "android"
      : Platform.OS === "ios"
      ? "ios"
      : "unknown";

  usePushStore.getState().setPushInfo(token, platform);
  await registerBackgroundTask();
  _initialized = true;

  console.log("ExpoPushToken:", token, "platform:", platform);
  return token;
}

/**
 * 포그라운드/탭 리스너
 * ⚠️ 여기서도 content 접근은 항상 ?. 로만
 */
export function attachNotificationListeners() {
  const sub1 = Notifications.addNotificationReceivedListener((n) => {
    const content = getContentSafe(n);
    markNewChatFromNotification(content?.data);
    console.log("🔔 포그라운드 수신:", {
      title: content?.title,
      body: content?.body,
      data: content?.data,
    });
  });

  const sub2 = Notifications.addNotificationResponseReceivedListener((resp) => {
    const content = getContentSafe(resp?.notification);
    markNewChatFromNotification(content?.data);
    console.log("👉 알림 탭:", {
      action: resp.actionIdentifier,
      title: content?.title,
      body: content?.body,
      data: content?.data,
    });
  });

  return () => {
    try {
      sub1.remove();
    } catch {}
    try {
      sub2.remove();
    } catch {}
  };
}

// (옵션) 즉시 알림 헬퍼
export async function notifyNow(
  title: string,
  body: string,
  data?: Record<string, any>
) {
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: "default",
      data: data ?? {},
      ...(Platform.OS === "android" ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
    trigger: null, // 즉시
  });
}
