/**
 * Theme Neutralizer
 *
 * Transforms GitHub's blue-tinted dark palettes into neutral grayscale
 * by detecting low-lightness blues and remapping them to gray.
 *
 * This preserves structure and contrast while removing blue bias.
 */

const lightColors = require("@primer/primitives/dist/json/colors/light.json");
const darkColors = require("@primer/primitives/dist/json/colors/dark.json");
const dimmedColors = require("@primer/primitives/dist/json/colors/dark_dimmed.json");

/**
 * Converts hex → HSL so we can reason about hue/lightness
 * when detecting blue-tinted dark colors.
 */
function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Detects blue-tinted dark colors using HSL thresholds.
 * Used to neutralize GitHub's dark blue backgrounds.
 */
function isDarkBlue(hex) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return false;
  const { h, s, l } = hexToHsl(hex);
  return h >= 190 && h <= 260 && l < 25 && s > 8;
}

/**
 * Maps a dark blue color to a dark gray anchored around #1e1e1e,
 * nudging slightly lighter/darker based on the original lightness.
 */
function toNeutralDarkGray(hex) {
  const { l } = hexToHsl(hex);

  // Base is #1e1e1e (30). Offset ±10 levels based on original lightness (0–25%).
  const base = 0x1e; // 30
  const offset = Math.round((l / 25 - 0.5) * 10); // maps 0–25% → -5 to +5
  const clamped = Math.max(0x10, Math.min(0x30, base + offset));

  const grayHex = clamped.toString(16).padStart(2, "0");
  return `#${grayHex}${grayHex}${grayHex}`;
}

/**
 * Recursively replaces blue-tinted dark colors with neutral grays.
 * Border tokens are treated differently to preserve contrast.
 */
function neutralizeBlues(obj, keyPath = "") {
  if (typeof obj === "string") {
    if (!isDarkBlue(obj)) return obj;
    const isBorder = keyPath.includes("border") || keyPath.includes("outline");
    return isBorder ? toBorderGray(obj) : toBackgroundGray(obj);
  }
  if (typeof obj === "object" && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k,
        neutralizeBlues(v, `${keyPath}.${k}`),
      ]),
    );
  }
  return obj;
}

/** Background blues → anchored tightly to #1e1e1e */
function toBackgroundGray(hex) {
  const { l } = hexToHsl(hex);
  const base = 0x1e;
  const offset = Math.round((l / 25 - 0.5) * 10);
  const clamped = Math.max(0x10, Math.min(0x30, base + offset));
  const g = clamped.toString(16).padStart(2, "0");
  return `#${g}${g}${g}`;
}

/** Border blues → brighter, more visible gray */
function toBorderGray(hex) {
  const { l } = hexToHsl(hex);
  const base = 0x3c;
  const offset = Math.round((l / 25 - 0.5) * 14);
  const clamped = Math.max(0x3a, Math.min(0x55, base + offset));
  const g = clamped.toString(16).padStart(2, "0");
  return `#${g}${g}${g}`;
}

function getColors(theme) {
  lightColors.bg.canvasInset = "#ffffff";
  dimmedColors.bg.canvasInset = "#22272E";
  darkColors.bg.canvasInset = "#0D1117";

  if (theme === "light") {
    return lightColors;
  } else if (theme === "dark") {
    return neutralizeBlues(darkColors);
  } else if (theme === "dimmed") {
    return neutralizeBlues(dimmedColors);
  }
}

module.exports = {
  getColors,
};

