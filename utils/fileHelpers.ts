import * as FileSystem from "expo-file-system";

type ImageAsset = {
  uri: string;
  fileName?: string;
};

export async function copyImageToAppStorage(
  asset: { uri: string },
  prefix: string // 예: "hint", "theme"
): Promise<string> {
  const ext = asset.uri.split(".").pop() || "jpg";
  const timestamp = Date.now();
  const documentDir = FileSystem.documentDirectory;
  if (!documentDir) throw new Error("documentDirectory is null");

  const newPath = `${documentDir}${prefix}_${timestamp}.${ext}`;
  await FileSystem.copyAsync({
    from: asset.uri,
    to: newPath,
  });
  return newPath;
}

export async function deleteImageIfExists(uri: string | null | undefined) {
  const documentDir = FileSystem.documentDirectory;
  if (!documentDir) {
    console.error("documentDirectory null");
    return;
  }

  if (!uri || !uri.startsWith(documentDir)) return;

  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) {
    await FileSystem.deleteAsync(uri);
  }
}
