import { useHintStore } from "@/stores/hintStore";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import * as Zip from "react-native-zip-archive";

const BACKUP_MIME_TYPE = "application/zip";

const requireDocumentDirectory = () => {
  if (!FileSystem.documentDirectory) {
    throw new Error("앱 문서 저장소를 사용할 수 없습니다.");
  }
  return FileSystem.documentDirectory;
};

const getTimestamp = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "_",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
};

const getImageExtension = (uri: string) => {
  const cleanUri = uri.split("?")[0];
  const extension = cleanUri.split(".").pop()?.toLowerCase();
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : "jpg";
};

export const backupAllHintsToExternal = async () => {
  const documentDirectory = requireDocumentDirectory();
  const backupDir = documentDirectory + "backup/";
  const imagesDir = backupDir + "images/";
  const hintFile = backupDir + "hintData.json";

  await FileSystem.deleteAsync(backupDir, { idempotent: true });
  await FileSystem.makeDirectoryAsync(imagesDir, { intermediates: true });

  const { hints } = useHintStore.getState();
  const hintsWithImages = await Promise.all(
    hints.map(async (hint, index) => {
      let backupImageUri: string | null = null;

      if (hint.imageUri) {
        const safeHintId = String(hint.id || index).replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        );
        const filename = `${safeHintId}_${index}.${getImageExtension(
          hint.imageUri
        )}`;
        const destination = imagesDir + filename;

        await FileSystem.copyAsync({
          from: hint.imageUri,
          to: destination,
        });
        backupImageUri = `images/${filename}`;
      }

      return { ...hint, imageUri: backupImageUri };
    })
  );

  await FileSystem.writeAsStringAsync(
    hintFile,
    JSON.stringify(hintsWithImages, null, 2)
  );

  const zipPath = documentDirectory + "hint_backup.zip";
  await FileSystem.deleteAsync(zipPath, { idempotent: true });
  await Zip.zip(backupDir, zipPath);

  return zipPath;
};

export const saveBackupToDevice = async () => {
  try {
    if (Platform.OS !== "android") {
      alert("현재 직접 폴더 저장 기능은 Android에서만 사용할 수 있어요.");
      return;
    }

    const internalZipPath = await backupAllHintsToExternal();
    const initialDirectory =
      FileSystem.StorageAccessFramework.getUriForDirectoryInRoot("Download");
    const permission =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
        initialDirectory
      );

    if (!permission.granted) {
      return;
    }

    const filenameWithoutExtension = `hint_backup_${getTimestamp()}`;
    const destinationUri =
      await FileSystem.StorageAccessFramework.createFileAsync(
        permission.directoryUri,
        filenameWithoutExtension,
        BACKUP_MIME_TYPE
      );
    const zipBase64 = await FileSystem.readAsStringAsync(internalZipPath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await FileSystem.StorageAccessFramework.writeAsStringAsync(
      destinationUri,
      zipBase64,
      { encoding: FileSystem.EncodingType.Base64 }
    );

    alert(
      `${filenameWithoutExtension}.zip 파일로 힌트와 사진을 저장했어요.`
    );
  } catch (err) {
    console.error("백업 저장 중 오류 발생:", err);
    alert("백업 파일 저장에 실패했어요.");
  }
};

export const pickAndRestoreHints = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: [BACKUP_MIME_TYPE, "application/x-zip-compressed"],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const selected = result.assets[0];
    if (!selected.name.toLowerCase().endsWith(".zip")) {
      alert("ZIP 형식의 힌트 백업 파일을 선택해 주세요.");
      return;
    }

    await restoreHintsFromZip(selected.uri);
  } catch (err) {
    console.error("힌트 복원 중 오류 발생:", err);
    alert("백업 파일을 복원하지 못했어요.");
  }
};

export const restoreHintsFromZip = async (zipUri: string) => {
  const documentDirectory = requireDocumentDirectory();
  const restoreDir = documentDirectory + "restore/";
  const restoredImagesDir = documentDirectory + "hint-images/";

  await FileSystem.deleteAsync(restoreDir, { idempotent: true });
  await FileSystem.makeDirectoryAsync(restoreDir, { intermediates: true });
  await Zip.unzip(zipUri, restoreDir);

  const jsonPath = restoreDir + "hintData.json";
  const jsonInfo = await FileSystem.getInfoAsync(jsonPath);
  if (!jsonInfo.exists) {
    throw new Error("hintData.json이 없는 올바르지 않은 백업 파일입니다.");
  }

  const parsed = JSON.parse(await FileSystem.readAsStringAsync(jsonPath));
  if (!Array.isArray(parsed)) {
    throw new Error("힌트 백업 데이터 형식이 올바르지 않습니다.");
  }

  await FileSystem.makeDirectoryAsync(restoredImagesDir, {
    intermediates: true,
  });

  const hints = await Promise.all(
    parsed.map(async (hint: any) => {
      let restoredImageUri: string | null = null;

      if (hint.imageUri) {
        const source = restoreDir + hint.imageUri;
        const sourceInfo = await FileSystem.getInfoAsync(source);
        if (!sourceInfo.exists) {
          throw new Error(`백업 이미지가 없습니다: ${hint.imageUri}`);
        }

        const filename = source.split("/").pop();
        const destination = restoredImagesDir + filename;
        await FileSystem.copyAsync({ from: source, to: destination });
        restoredImageUri = destination;
      }

      return { ...hint, imageUri: restoredImageUri };
    })
  );

  await FileSystem.writeAsStringAsync(
    documentDirectory + "hintData.json",
    JSON.stringify(hints)
  );

  const store = useHintStore.getState();
  store.clearEditHints();
  store.clearDuplicateHintIds();
  await store.loadHints();

  alert("힌트와 사진 복원이 완료됐어요.");
};
