const fs = require("fs");
const path = require("path");
const Jimp = require("jimp-compact");

const projectRoot = path.resolve(__dirname, "..");
const androidRoot = path.join(projectRoot, "android", "app", "src", "main");
const resRoot = path.join(androidRoot, "res");
const appJsonPath = path.join(projectRoot, "app.json");
const { expo } = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
const manifestPath = path.join(androidRoot, "AndroidManifest.xml");
const stringsPath = path.join(resRoot, "values", "strings.xml");
const colorsPath = path.join(resRoot, "values", "colors.xml");
const settingsGradlePath = path.join(projectRoot, "android", "settings.gradle");
const autolinkingCachePath = path.join(
  projectRoot,
  "android",
  "build",
  "generated",
  "autolinking"
);
const autolinkingJsonPath = path.join(autolinkingCachePath, "autolinking.json");

const legacyIconSizes = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

const adaptiveForegroundSizes = {
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432,
};

const notificationIconSizes = {
  mdpi: 24,
  hdpi: 36,
  xhdpi: 48,
  xxhdpi: 72,
  xxxhdpi: 96,
};

const splashLogoSizes = {
  mdpi: 288,
  hdpi: 432,
  xhdpi: 576,
  xxhdpi: 864,
  xxxhdpi: 1152,
};

function resolveProjectPath(value) {
  if (!value) return null;
  return path.resolve(projectRoot, value);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeGradleString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function writeTextIfChanged(filePath, content) {
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === content) {
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function replaceInFile(filePath, replacer) {
  const previous = fs.readFileSync(filePath, "utf8");
  const next = replacer(previous);
  if (next !== previous) {
    fs.writeFileSync(filePath, next);
  }
}

function removePathInsideProject(targetPath) {
  const relativePath = path.relative(projectRoot, targetPath);
  const isInsideProject =
    relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);

  if (isInsideProject && fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function removeStaleAutolinkingCache() {
  if (!fs.existsSync(autolinkingJsonPath)) return;

  try {
    const config = JSON.parse(fs.readFileSync(autolinkingJsonPath, "utf8"));
    if (path.resolve(config.root ?? "") !== projectRoot) {
      removePathInsideProject(autolinkingCachePath);
    }
  } catch {
    removePathInsideProject(autolinkingCachePath);
  }
}

function updateColors(colorName, colorValue) {
  if (!colorValue) return;
  replaceInFile(colorsPath, (content) => {
    const escaped = escapeXml(colorValue);
    const pattern = new RegExp(
      `<color name="${colorName}">[^<]*</color>`,
      "g"
    );
    if (pattern.test(content)) {
      return content.replace(pattern, `<color name="${colorName}">${escaped}</color>`);
    }
    return content.replace(
      "</resources>",
      `  <color name="${colorName}">${escaped}</color>\n</resources>`
    );
  });
}

function getExpoNotificationsConfig() {
  const plugins = Array.isArray(expo.plugins) ? expo.plugins : [];
  const entry = plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === "expo-notifications"
  );
  return Array.isArray(entry) ? entry[1] ?? {} : {};
}

async function resizePng(sourcePath, destinationPath, size) {
  if (!sourcePath || !fs.existsSync(sourcePath)) return;
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  const image = await Jimp.read(sourcePath);
  image.resize(size, size);
  await image.writeAsync(destinationPath);
}

async function writeDensityImages(sourcePath, densitySizes, folderPrefix, fileName) {
  if (!sourcePath || !fs.existsSync(sourcePath)) return;
  for (const [density, size] of Object.entries(densitySizes)) {
    await resizePng(
      sourcePath,
      path.join(resRoot, `${folderPrefix}-${density}`, fileName),
      size
    );
  }
}

async function main() {
  if (
    !fs.existsSync(manifestPath) ||
    !fs.existsSync(stringsPath) ||
    !fs.existsSync(colorsPath) ||
    !fs.existsSync(settingsGradlePath)
  ) {
    console.log("Android native project not found. Expo prebuild will use app.json.");
    return;
  }

  const appName = expo.name ?? "HintApp";
  const iconPath = resolveProjectPath(expo.icon);
  const adaptiveIcon = expo.android?.adaptiveIcon ?? {};
  const adaptiveForegroundPath =
    resolveProjectPath(adaptiveIcon.foregroundImage) ?? iconPath;
  const notificationConfig = getExpoNotificationsConfig();
  const notificationIconPath = resolveProjectPath(notificationConfig.icon);
  const splash = expo.splash ?? {};
  const splashImagePath = resolveProjectPath(splash.image);

  replaceInFile(stringsPath, (content) =>
    content.replace(
      /<string name="app_name">[^<]*<\/string>/,
      `<string name="app_name">${escapeXml(appName)}</string>`
    )
  );

  replaceInFile(settingsGradlePath, (content) =>
    content.replace(
      /rootProject\.name = '.*'/,
      `rootProject.name = '${escapeGradleString(appName)}'`
    )
  );

  replaceInFile(manifestPath, (content) =>
    content
      .replace(/android:icon="@mipmap\/[^"]*"/, 'android:icon="@mipmap/ic_launcher_story"')
      .replace(
        /android:roundIcon="@mipmap\/[^"]*"/,
        'android:roundIcon="@mipmap/ic_launcher_story_round"'
      )
  );

  updateColors("iconBackground", adaptiveIcon.backgroundColor ?? "#ffffff");
  updateColors("splashscreen_background", splash.backgroundColor ?? "#ffffff");
  updateColors("notification_icon_color", notificationConfig.color ?? "#FFFFFF");

  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/iconBackground"/>\n    <foreground android:drawable="@mipmap/ic_launcher_story_foreground"/>\n</adaptive-icon>\n`;
  writeTextIfChanged(
    path.join(resRoot, "mipmap-anydpi-v26", "ic_launcher_story.xml"),
    adaptiveXml
  );
  writeTextIfChanged(
    path.join(resRoot, "mipmap-anydpi-v26", "ic_launcher_story_round.xml"),
    adaptiveXml
  );

  await writeDensityImages(iconPath, legacyIconSizes, "mipmap", "ic_launcher_story.png");
  await writeDensityImages(
    iconPath,
    legacyIconSizes,
    "mipmap",
    "ic_launcher_story_round.png"
  );
  await writeDensityImages(
    adaptiveForegroundPath,
    adaptiveForegroundSizes,
    "mipmap",
    "ic_launcher_story_foreground.png"
  );
  await writeDensityImages(
    notificationIconPath,
    notificationIconSizes,
    "drawable",
    "notification_icon.png"
  );
  await writeDensityImages(
    splashImagePath,
    splashLogoSizes,
    "drawable",
    "splashscreen_logo.png"
  );

  removeStaleAutolinkingCache();

  console.log(`Synced Android native assets for ${appName}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
