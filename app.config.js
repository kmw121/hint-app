const staticConfig = require("./app.json");

module.exports = () => {
  const expo = staticConfig.expo;
  const themeCode = process.env.HINT_THEME_CODE?.trim();

  return {
    ...expo,
    extra: {
      ...expo.extra,
      theme: {
        ...expo.extra?.theme,
        code: themeCode || expo.extra?.theme?.code || "story",
      },
    },
  };
};
