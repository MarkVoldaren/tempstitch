export function normalizeHexColor(value: string) {
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) {
    return "#000000";
  }

  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  const valid = /^#([0-9A-F]{6})$/.test(withHash);

  return valid ? withHash : "#000000";
}

export function hexToRgb(hex: string) {
  const value = normalizeHexColor(hex).replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

export function hexToRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getColorLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function getColorSaturation(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) {
    return 0;
  }

  return (max - min) / max;
}

export function getWarmthScore(hex: string) {
  const { r, b } = hexToRgb(hex);
  return (r - b) / 255;
}

export function getRgbDistance(leftHex: string, rightHex: string) {
  const left = hexToRgb(leftHex);
  const right = hexToRgb(rightHex);

  return Math.sqrt(
    (left.r - right.r) ** 2 +
      (left.g - right.g) ** 2 +
      (left.b - right.b) ** 2,
  );
}

export function areHexColorsEqual(leftHex: string, rightHex: string) {
  return normalizeHexColor(leftHex) === normalizeHexColor(rightHex);
}

export function areHexColorsNearSimilar(
  leftHex: string,
  rightHex: string,
  threshold: number,
) {
  return getRgbDistance(leftHex, rightHex) <= threshold;
}

export function getColorSimilarityBucket(
  leftHex: string,
  rightHex: string,
  nearThreshold: number,
) {
  if (areHexColorsEqual(leftHex, rightHex)) {
    return "exact";
  }

  if (areHexColorsNearSimilar(leftHex, rightHex, nearThreshold)) {
    return "near";
  }

  return "distinct";
}

export function getReadableTextColor(hex: string) {
  const luminance = getColorLuminance(hex);
  return luminance > 0.6 ? "#2B241F" : "#FFFDF8";
}

export function getYarnOutlineColor(hex: string, darkUi: boolean, fallback: string) {
  const luminance = getColorLuminance(hex);

  if (darkUi && luminance < 0.18) {
    return "rgba(255,255,255,0.28)";
  }

  if (!darkUi && luminance > 0.88) {
    return "rgba(43,36,31,0.12)";
  }

  return fallback;
}

export function describeColorMatch(targetHex: string, matchHex: string) {
  const luminanceDelta = getColorLuminance(matchHex) - getColorLuminance(targetHex);
  const saturationDelta = getColorSaturation(matchHex) - getColorSaturation(targetHex);
  const warmthDelta = getWarmthScore(matchHex) - getWarmthScore(targetHex);
  const distance = getRgbDistance(targetHex, matchHex);

  if (distance < 32) {
    return "Closest match";
  }

  if (Math.abs(luminanceDelta) > 0.18) {
    return luminanceDelta > 0 ? "Slightly lighter" : "Slightly darker";
  }

  if (Math.abs(warmthDelta) > 0.16) {
    return warmthDelta > 0 ? "Slightly warmer" : "Slightly cooler";
  }

  if (Math.abs(saturationDelta) > 0.16) {
    return saturationDelta > 0 ? "Slightly brighter" : "Slightly muted";
  }

  return "Nearby palette match";
}
