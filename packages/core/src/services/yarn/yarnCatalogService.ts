import { getBuiltInYarnBrands, getBuiltInYarnColors } from "../../data/yarn";
import { YarnBrand, YarnColor } from "../../types/models";

export type YarnCatalogService = {
  getBrands: () => YarnBrand[];
  getBrandById: (brandId: string | null | undefined) => YarnBrand | null;
  getColorsByBrandId: (brandId: string | null | undefined) => YarnColor[];
  getColorById: (colorId: string | null | undefined) => YarnColor | null;
};

class BuiltInYarnCatalogService implements YarnCatalogService {
  private readonly brands = getBuiltInYarnBrands();

  private readonly colors = getBuiltInYarnColors();

  getBrands() {
    return this.brands.slice();
  }

  getBrandById(brandId: string | null | undefined) {
    if (!brandId) {
      return null;
    }

    return this.brands.find((brand) => brand.id === brandId) ?? null;
  }

  getColorsByBrandId(brandId: string | null | undefined) {
    if (!brandId) {
      return [];
    }

    return this.colors.filter((color) => color.brandId === brandId);
  }

  getColorById(colorId: string | null | undefined) {
    if (!colorId) {
      return null;
    }

    return this.colors.find((color) => color.id === colorId) ?? null;
  }
}

export const yarnCatalogService: YarnCatalogService = new BuiltInYarnCatalogService();
