const staticConfig = require("./app.json");

module.exports = () => {
  const expo = staticConfig.expo;
  const themeCode = process.env.HINT_THEME_CODE?.trim();
  const resolvedThemeCode = themeCode || expo.extra?.theme?.code || "story";
  const themeName = themeCode ? `${themeCode} Hint` : expo.name;

  return {
    ...expo,
    name: themeName,
    extra: {
      ...expo.extra,
      theme: {
        ...expo.extra?.theme,
        name: themeName,
        code: resolvedThemeCode,
      },
    },
  };
};
