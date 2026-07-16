import { Platform } from "react-native";

import {
  PurchaseEnvironment,
  SupportPurchaseProductConfig,
  SupportPurchaseProductId,
} from "@/services/purchases/purchaseTypes";

export const PURCHASE_ENVIRONMENT: PurchaseEnvironment = __DEV__
  ? "development"
  : "production";

const ANDROID_TEST_PRODUCT_ID = "android.test.purchased";

export const supportPurchaseProducts: SupportPurchaseProductConfig[] = [
  {
    id: "support_coffee_099",
    title: "Buy me a coffee",
    description: "A small thank-you that helps keep StitchForecast growing.",
    fallbackPriceLabel: "$0.99",
    productionStoreProductId: "support_coffee_099",
    developmentStoreProductId: ANDROID_TEST_PRODUCT_ID,
  },
  {
    id: "support_supporter_299",
    title: "Supporter",
    description: "A little extra support for new features and polish.",
    fallbackPriceLabel: "$2.99",
    productionStoreProductId: "support_supporter_299",
    developmentStoreProductId: ANDROID_TEST_PRODUCT_ID,
  },
  {
    id: "support_super_499",
    title: "Super supporter",
    description: "A generous boost for ongoing maintenance and updates.",
    fallbackPriceLabel: "$4.99",
    productionStoreProductId: "support_super_499",
    developmentStoreProductId: ANDROID_TEST_PRODUCT_ID,
  },
];

export function getPurchaseConfigById(productId: SupportPurchaseProductId) {
  return supportPurchaseProducts.find((product) => product.id === productId) ?? null;
}

export function getStoreProductId(productId: SupportPurchaseProductId) {
  const product = getPurchaseConfigById(productId);
  if (!product) {
    return null;
  }

  return PURCHASE_ENVIRONMENT === "production"
    ? product.productionStoreProductId
    : product.developmentStoreProductId;
}

export function getProductIdFromStoreProductId(storeProductId: string) {
  const matches = supportPurchaseProducts.filter((product) => {
    const configuredId =
      PURCHASE_ENVIRONMENT === "production"
        ? product.productionStoreProductId
        : product.developmentStoreProductId;
    return configuredId === storeProductId;
  });

  if (matches.length !== 1) {
    return null;
  }

  return matches[0].id;
}

export function getConfiguredStoreProductIds() {
  return Array.from(
    new Set(
      supportPurchaseProducts
        .map((product) => getStoreProductId(product.id))
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

export function isPurchasePlatformSupported() {
  return Platform.OS === "android";
}
