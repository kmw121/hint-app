import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";

const TASK = "NOTIFICATION_BACKGROUND_TASK"; // ← 같은 이름 유지 (덮어쓰기)

function logKeys(tag: string, obj: any) {
  try {
    const o = obj ?? {};
    console.log(`[PATCH] ${tag}:`, Object.keys(typeof o === "object" ? o : {}));
  } catch {}
}

(async () => {
  // 0) 혹시 남아있을 기존 등록 해제 (있으면 시도, 없어도 무시)
  try {
    await (Notifications as any).unregisterTaskAsync?.(TASK);
  } catch {}
  try {
    await (TaskManager as any).unregisterTaskAsync?.(TASK);
  } catch {}

  // 1) 안전한 핸들러 정의 (중복 define 방지)
  if (!TaskManager.isTaskDefined(TASK)) {
    TaskManager.defineTask(TASK, async ({ data, error }) => {
      if (error) {
        console.warn("[PATCH] task error:", error);
        return;
      }

      try {
        const payload: any = data ?? {};
        logKeys("payload-keys", payload);

        // A) 사용자 탭/액션 응답 (NotificationResponse)
        if (
          payload &&
          typeof payload === "object" &&
          "actionIdentifier" in payload
        ) {
          const resp = payload as Notifications.NotificationResponse;
          const content = resp?.notification?.request?.content;
          if (content) {
            console.log(
              "[PATCH] response:",
              resp.actionIdentifier,
              content.title ?? "(no title)"
            );
          } else {
            console.log("[PATCH] response without content");
          }
          return;
        }

        // B) 일반 알림(Notification) 객체
        if (
          payload &&
          typeof payload === "object" &&
          "notification" in payload &&
          payload.notification
        ) {
          const notif = payload.notification as Notifications.Notification;
          const content = notif?.request?.content;
          if (content) {
            console.log("[PATCH] notification:", content.title ?? "(no title)");
          } else {
            console.log("[PATCH] notification without content");
          }
          return;
        }

        // C) data-only (알림 UI 없이 데이터만)
        let message: any = payload;
        if (typeof payload?.data === "string") {
          try {
            message = JSON.parse(payload.data);
          } catch {
            message = payload.data;
          }
        } else if (payload?.data && typeof payload.data === "object") {
          message = payload.data;
        }
        console.log("[PATCH] headless data-only:", message);
      } catch (e) {
        console.warn("[PATCH] handler crashed:", e);
      }
    });
  }

  // 2) 태스크 연결 (중복이어도 조용히 무시)
  try {
    await (Notifications as any).registerTaskAsync(TASK);
  } catch (e) {
    console.warn("[PATCH] registerTaskAsync failed:", e);
  }

  console.log("[PATCH] registered safe handler for", TASK);
})();
