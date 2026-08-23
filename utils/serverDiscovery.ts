import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Network from "expo-network";

const STORAGE_KEY = "discovered_server_url";
const PORT = 3000;
const PROBE_TIMEOUT = 1200;

/** socket.io polling 엔드포인트로 서버 존재 여부 확인 */
async function probeServer(ip: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT);
    await fetch(`http://${ip}:${PORT}/socket.io/?EIO=4&transport=polling`, {
      signal: controller.signal,
      method: "GET",
    });
    clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
}

/** 우선순위 높은 IP 먼저 탐색 (낮은 옥텟, 흔한 서버 주소) */
function buildPriorityCandidates(
  subnet: string,
  selfLastOctet: number
): string[] {
  const priority = [1, 2, 3, 4, 5, 10, 11, 12, 15, 20, 50, 100, 150, 200];
  const rest: number[] = [];

  for (let i = 1; i <= 254; i++) {
    if (i === selfLastOctet) continue;
    if (!priority.includes(i)) rest.push(i);
  }

  const ordered = [
    ...priority.filter((p) => p !== selfLastOctet),
    ...rest,
  ];
  return ordered.map((i) => `${subnet}.${i}`);
}

/**
 * 서버 자동 탐색
 * 1. 캐시된 URL을 먼저 시도
 * 2. 실패 시 서브넷 전체 스캔 (병렬 배치)
 * 3. 발견된 URL은 캐시에 저장
 */
export async function discoverServerUrl(): Promise<string | null> {
  // 1) 캐시된 URL 먼저 시도
  const cached = await AsyncStorage.getItem(STORAGE_KEY);
  if (cached) {
    const match = cached.match(/http:\/\/(.+):\d+/);
    if (match) {
      const ok = await probeServer(match[1]);
      if (ok) {
        console.log("✅ 캐시된 서버 연결 성공:", cached);
        return cached;
      }
    }
  }

  // 2) 디바이스 IP로 서브넷 파악
  let deviceIp: string | null = null;
  try {
    deviceIp = await Network.getIpAddressAsync();
  } catch {
    return null;
  }
  if (!deviceIp) return null;

  const segments = deviceIp.split(".");
  if (segments.length !== 4) return null;

  const subnet = segments.slice(0, 3).join(".");
  const selfLastOctet = parseInt(segments[3], 10);
  const candidates = buildPriorityCandidates(subnet, selfLastOctet);

  // 3) 병렬 배치 스캔 (Promise.any로 첫 발견 시 즉시 반환)
  const BATCH_SIZE = 25;
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    try {
      const foundIp = await Promise.any(
        batch.map(async (ip) => {
          const ok = await probeServer(ip);
          if (ok) return ip;
          throw new Error("not found");
        })
      );
      const serverUrl = `http://${foundIp}:${PORT}`;
      await AsyncStorage.setItem(STORAGE_KEY, serverUrl);
      console.log("✅ 서버 자동 탐색 성공:", serverUrl);
      return serverUrl;
    } catch {
      // 이 배치에서 못 찾음 → 다음 배치
    }
  }

  console.warn("❌ 서브넷에서 서버를 찾지 못했습니다.");
  return null;
}

/** 캐시된 서버 URL 삭제 (재탐색 강제) */
export async function clearServerUrl(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
