import { YarnBrand, YarnColor } from "../../types/models";

import { builtInYarnBrands } from "./brands";
import { bernatColors } from "./colors.bernat";
import { iLoveThisYarnColors } from "./colors.iLoveThisYarn";
import { lionBrandColors } from "./colors.lionBrand";
import { redHeartColors } from "./colors.redHeart";

export const builtInYarnColors: YarnColor[] = [
  ...redHeartColors,
  ...lionBrandColors,
  ...bernatColors,
  ...iLoveThisYarnColors,
];

export function getBuiltInYarnBrands(): YarnBrand[] {
  return builtInYarnBrands.slice();
}

export function getBuiltInYarnColors(): YarnColor[] {
  return builtInYarnColors.slice();
}
