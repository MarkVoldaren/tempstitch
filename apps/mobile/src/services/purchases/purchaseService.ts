import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  endConnection as closePurchaseConnection,
  ErrorCode,
  fetchProducts,
  finishTransaction,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Product,
  type ProductOrSubscription,
  type Purchase,
} from "expo-iap";

import {
  getConfiguredStoreProductIds,
  getProductIdFromStoreProductId,
  getStoreProductId,
  isPurchasePlatformSupported,
  supportPurchaseProducts,
} from "@/config/purchases";

import {
  PurchaseInitResult,
  SupportPurchaseLogEvent,
  SupportPurchaseProduct,
  SupportPurchaseProductId,
  SupportPurchaseResult,
} from "./purchaseTypes";

type PendingPurchase = {
  appProductId: SupportPurchaseProductId;
  storeProductId: string;
  resolve: (result: SupportPurchaseResult) => void;
  timeoutHandle: ReturnType<typeof setTimeout>;
};

const PURCHASE_EVENT_LOG_KEY = "temperature-blanket:support-purchases";
const PURCHASE_TIMEOUT_MS = 60_000;
const MAX_LOG_ENTRIES = 20;

function getPurchaseMessage(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";

  if (code === ErrorCode.UserCancelled) {
    return "Purchase canceled";
  }

  if (
    code === ErrorCode.BillingUnavailable ||
    code === ErrorCode.IapNotAvailable ||
    code === ErrorCode.InitConnection ||
    code === ErrorCode.ServiceDisconnected
  ) {
    return "Store not available";
  }

  if (code === ErrorCode.NetworkError || code === ErrorCode.RemoteError) {
    return "Something went wrong. Please try again.";
  }

  return "Something went wrong. Please try again.";
}

function getTransactionKey(purchase: Purchase) {
  return [
    purchase.productId,
    purchase.transactionId ?? "",
    purchase.purchaseToken ?? "",
    purchase.transactionDate,
  ].join(":");
}

async function appendSupportPurchaseLog(event: SupportPurchaseLogEvent) {
  try {
    const raw = await AsyncStorage.getItem(PURCHASE_EVENT_LOG_KEY);
    const existing = raw ? (JSON.parse(raw) as SupportPurchaseLogEvent[]) : [];
    const next = [event, ...existing].slice(0, MAX_LOG_ENTRIES);
    await AsyncStorage.setItem(PURCHASE_EVENT_LOG_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("Unable to save support purchase event", error);
  }
}

function mergeProducts(storeProducts: Product[] = []): SupportPurchaseProduct[] {
  const byStoreId = new Map(storeProducts.map((product) => [product.id, product]));

  return supportPurchaseProducts.map((product) => {
    const storeProductId = getStoreProductId(product.id) ?? product.productionStoreProductId;
    const storeProduct = byStoreId.get(storeProductId);

    return {
      id: product.id,
      title: product.title,
      description: product.description,
      displayPrice: storeProduct?.displayPrice ?? product.fallbackPriceLabel,
      storeProductId,
      source: storeProduct ? "store" : "fallback",
      storeProduct: storeProduct ?? null,
    };
  });
}

class PurchaseService {
  private connected = false;

  private cachedProducts: SupportPurchaseProduct[] = mergeProducts();

  private pendingPurchase: PendingPurchase | null = null;

  private readonly processedTransactions = new Set<string>();

  private purchaseUpdatedSubscription: { remove: () => void } | null = null;

  private purchaseErrorSubscription: { remove: () => void } | null = null;

  async initPurchases(): Promise<PurchaseInitResult> {
    if (!isPurchasePlatformSupported()) {
      return {
        available: false,
        message: "Store not available",
      };
    }

    if (this.connected) {
      return {
        available: true,
        message: null,
      };
    }

    this.ensureListeners();

    try {
      await initConnection();
      this.connected = true;
      await this.getProducts();

      return {
        available: true,
        message: null,
      };
    } catch (error) {
      this.connected = false;
      return {
        available: false,
        message: getPurchaseMessage(error),
      };
    }
  }

  async getProducts(): Promise<SupportPurchaseProduct[]> {
    if (!this.connected) {
      this.cachedProducts = mergeProducts();
      return this.cachedProducts;
    }

    try {
      const products = await fetchProducts({
        skus: getConfiguredStoreProductIds(),
        type: "in-app",
      });
      const normalized: Product[] = [];
      if (Array.isArray(products)) {
        products.forEach((product: ProductOrSubscription) => {
          if (product.type === "in-app") {
            normalized.push(product as Product);
          }
        });
      }

      this.cachedProducts = mergeProducts(normalized);
      return this.cachedProducts;
    } catch (error) {
      console.warn("Unable to fetch purchase products", error);
      this.cachedProducts = mergeProducts();
      return this.cachedProducts;
    }
  }

  async purchaseProduct(productId: SupportPurchaseProductId): Promise<SupportPurchaseResult> {
    const initResult = await this.initPurchases();
    if (!initResult.available || !this.connected) {
      return {
        status: "error",
        productId,
        message: initResult.message ?? "Store not available",
      };
    }

    if (this.pendingPurchase) {
      return {
        status: "error",
        productId,
        message: "Something went wrong. Please try again.",
      };
    }

    const storeProductId = getStoreProductId(productId);
    if (!storeProductId) {
      return {
        status: "error",
        productId,
        message: "Something went wrong. Please try again.",
      };
    }

    return new Promise((resolve) => {
      const timeoutHandle = setTimeout(() => {
        if (this.pendingPurchase?.appProductId === productId) {
          this.clearPendingPurchase();
          resolve({
            status: "error",
            productId,
            message: "Something went wrong. Please try again.",
          });
        }
      }, PURCHASE_TIMEOUT_MS);

      this.pendingPurchase = {
        appProductId: productId,
        storeProductId,
        resolve,
        timeoutHandle,
      };

      requestPurchase({
        request: {
          google: {
            skus: [storeProductId],
          },
        },
        type: "in-app",
      }).catch((error) => {
        if (this.pendingPurchase?.appProductId !== productId) {
          return;
        }

        this.clearPendingPurchase();
        resolve({
          status: error?.code === ErrorCode.UserCancelled ? "cancelled" : "error",
          productId,
          message: getPurchaseMessage(error),
        });
      });
    });
  }

  async endConnection() {
    if (this.pendingPurchase) {
      clearTimeout(this.pendingPurchase.timeoutHandle);
      this.pendingPurchase = null;
    }

    this.purchaseUpdatedSubscription?.remove();
    this.purchaseUpdatedSubscription = null;
    this.purchaseErrorSubscription?.remove();
    this.purchaseErrorSubscription = null;

    if (this.connected) {
      try {
        await closePurchaseConnection();
      } catch (error) {
        console.warn("Unable to close purchase connection", error);
      } finally {
        this.connected = false;
      }
    }
  }

  private clearPendingPurchase() {
    if (!this.pendingPurchase) {
      return;
    }

    clearTimeout(this.pendingPurchase.timeoutHandle);
    this.pendingPurchase = null;
  }

  private ensureListeners() {
    if (!this.purchaseUpdatedSubscription) {
      this.purchaseUpdatedSubscription = purchaseUpdatedListener((purchase) => {
        void this.handlePurchaseUpdated(purchase);
      });
    }

    if (!this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription = purchaseErrorListener((error) => {
        this.handlePurchaseError(error);
      });
    }
  }

  private async handlePurchaseUpdated(purchase: Purchase) {
    const pending = this.pendingPurchase;
    const appProductId =
      pending?.appProductId ?? getProductIdFromStoreProductId(purchase.productId);

    if (!appProductId || purchase.purchaseState === "pending") {
      return;
    }

    const transactionKey = getTransactionKey(purchase);
    if (this.processedTransactions.has(transactionKey)) {
      return;
    }

    try {
      await finishTransaction({
        purchase,
        isConsumable: true,
      });

      this.processedTransactions.add(transactionKey);
      await appendSupportPurchaseLog({
        id: transactionKey,
        productId: appProductId,
        storeProductId: purchase.productId,
        purchasedAt: new Date().toISOString(),
        transactionId: purchase.transactionId ?? null,
      });

      if (pending && pending.appProductId === appProductId) {
        this.clearPendingPurchase();
        pending.resolve({
          status: "success",
          productId: appProductId,
          message: "Thank you for supporting StitchForecast ❤️",
          purchase,
        });
      }
    } catch (error) {
      if (pending && pending.appProductId === appProductId) {
        this.clearPendingPurchase();
        pending.resolve({
          status: "error",
          productId: appProductId,
          message: getPurchaseMessage(error),
        });
      }
    }
  }

  private handlePurchaseError(error: { code?: string }) {
    const pending = this.pendingPurchase;
    if (!pending) {
      return;
    }

    this.clearPendingPurchase();
    pending.resolve({
      status: error.code === ErrorCode.UserCancelled ? "cancelled" : "error",
      productId: pending.appProductId,
      message: getPurchaseMessage(error),
    });
  }
}

export const purchaseService = new PurchaseService();
