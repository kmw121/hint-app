const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const androidRoot = path.join(projectRoot, "android");
const gradleCommand = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const sourceApk = path.join(
  androidRoot,
  "app",
  "build",
  "outputs",
  "apk",
  "release",
  "app-release.apk"
);
const outputRoot = path.join(projectRoot, "builds", "android");

const themeCodes = process.argv
  .slice(2)
  .flatMap((value) => value.split(","))
  .map((value) => value.trim())
  .filter(Boolean);

if (themeCodes.length === 0) {
  console.error("사용법: npm run build:themes -- theme1 theme2 theme3");
  process.exit(1);
}

const invalidCode = themeCodes.find((code) => !/^[A-Za-z0-9_-]+$/.test(code));
if (invalidCode) {
  console.error(
    `잘못된 테마 코드: ${invalidCode} (영문, 숫자, _ 및 -만 사용할 수 있습니다.)`
  );
  process.exit(1);
}

const uniqueThemeCodes = [...new Set(themeCodes)];

function run(command, args, options = {}) {
  const isWindowsBatch =
    process.platform === "win32" && command.toLowerCase().endsWith(".bat");
  const executable = isWindowsBatch ? process.env.ComSpec ?? "cmd.exe" : command;
  const executableArgs = isWindowsBatch
    ? ["/d", "/s", "/c", command, ...args]
    : args;
  const result = spawnSync(executable, executableArgs, {
    cwd: options.cwd ?? projectRoot,
    env: options.env ?? process.env,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} 실행 실패 (종료 코드 ${result.status})`);
  }
}

function main() {
  if (!fs.existsSync(androidRoot)) {
    throw new Error(
      "android 폴더가 없습니다. 먼저 npx expo prebuild --platform android를 실행하세요."
    );
  }

  fs.mkdirSync(outputRoot, { recursive: true });
  run(process.execPath, [path.join(projectRoot, "scripts", "sync-native-assets.js")]);

  const results = [];

  for (const [index, themeCode] of uniqueThemeCodes.entries()) {
    console.log(
      `\n[${index + 1}/${uniqueThemeCodes.length}] 테마 ${themeCode} 빌드 시작`
    );

    const env = {
      ...process.env,
      NODE_ENV: "production",
      HINT_THEME_CODE: themeCode,
    };

    // 테마 코드가 들어가는 Expo 설정과 JS 번들만 강제로 다시 만듭니다.
    // 네이티브 컴파일 결과는 재사용해 두 번째 빌드부터 시간을 줄입니다.
    run(
      gradleCommand,
      [
        "expo-constants:createExpoConfig",
        "app:createBundleReleaseJsAndAssets",
        "--rerun-tasks",
        "-x",
        "lint",
        "-x",
        "test",
      ],
      { cwd: androidRoot, env }
    );
    run(gradleCommand, ["app:assembleRelease", "-x", "lint", "-x", "test"], {
      cwd: androidRoot,
      env,
    });

    if (!fs.existsSync(sourceApk)) {
      throw new Error(`APK를 찾을 수 없습니다: ${sourceApk}`);
    }

    const destination = path.join(outputRoot, `${themeCode}.apk`);
    fs.copyFileSync(sourceApk, destination);
    results.push({ themeCode, apk: destination });
    console.log(`완료: ${destination}`);
  }

  const manifestPath = path.join(outputRoot, "build-manifest.json");
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        builtAt: new Date().toISOString(),
        builds: results.map(({ themeCode, apk }) => ({
          themeCode,
          apk: path.relative(projectRoot, apk).replace(/\\/g, "/"),
        })),
      },
      null,
      2
    )}\n`
  );

  console.log(`\n총 ${results.length}개 빌드 완료: ${outputRoot}`);
}

try {
  main();
} catch (error) {
  console.error(`\n빌드 중단: ${error.message}`);
  process.exit(1);
}
