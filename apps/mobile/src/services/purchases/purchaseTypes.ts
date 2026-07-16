import type { Product, Purchase } from "expo-iap";

export type SupportPurchaseProductId =
  | "support_coffee_099"
  | "support_supporter_299"
  | "support_super_499";

export type PurchaseEnvironment = "development" | "production";

export type SupportPurchaseProductConfig = {
  id: SupportPurchaseProductId;
  title: string;
  description: string;
  fallbackPriceLabel: string;
  productionStoreProductId: string;
  developmentStoreProductId: string;
};

export type SupportPurchaseProduct = {
  id: SupportPurchaseProductId;
  title: string;
  description: string;
  displayPrice: string;
  storeProductId: string;
  source: "store" | "fallback";
  storeProduct?: Product | null;
};

export type PurchaseInitResult = {
  available: boolean;
  message: string | null;
};

export type SupportPurchaseResult = {
  status: "success" | "cancelled" | "error";
  productId: SupportPurchaseProductId;
  message: string;
  purchase?: Purchase | null;
};

export type SupportPurchaseLogEvent = {
  id: string;
  productId: SupportPurchaseProductId;
  storeProductId: string;
  purchasedAt: string;
  transactionId?: string | null;
};
