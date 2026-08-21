import {
  decryptAccessCode,
  encryptAccessCode,
  generateAccessCode,
  hashAccessCode,
} from "./accessCodeCore";

export type CheckoutSessionForFulfillment = {
  id: string;
  mode: string | null;
  status: string | null;
  payment_status: string | null;
  amount_total: number | null;
  currency: string | null;
  payment_link: string | null;
  payment_intent: string | { id: string } | null;
  customer_details: { email?: string | null } | null;
  line_items: {
    data: Array<{
      price: { id?: string | null } | null;
    }>;
  } | null;
};

export type SaleSettingsRecord = {
  book_id: string;
  stripe_payment_link_id: string;
  stripe_price_id: string;
  amount: number;
  currency: string;
  enabled: boolean;
};

export type PurchaseRecord = {
  id?: string;
  book_id: string;
  stripe_checkout_session_id: string;
  stripe_payment_intent_id: string | null;
  buyer_email: string | null;
  amount: number;
  currency: string;
  payment_status: "paid";
  access_code_hash: string;
  access_code_ciphertext: string;
};

export type PurchaseDatabase = {
  findSaleSettings(paymentLinkId: string): Promise<SaleSettingsRecord | null>;
  findBookSlug(bookId: string): Promise<string | null>;
  findPurchase(sessionId: string): Promise<PurchaseRecord | null>;
  insertPurchase(record: PurchaseRecord): Promise<{ data: PurchaseRecord | null; error: unknown | null }>;
};

export type FulfillmentDependencies = {
  retrieveSession(sessionId: string): Promise<CheckoutSessionForFulfillment>;
  database: PurchaseDatabase;
};

export type FulfillmentResult = {
  accessCode: string;
  bookId: string;
  bookSlug: string;
  reused: boolean;
};

export type FulfillmentErrorCode =
  | "invalid_session"
  | "session_not_paid"
  | "sales_settings_not_found"
  | "payment_mismatch"
  | "purchase_unavailable"
  | "purchase_code_unavailable";

export class FulfillmentError extends Error {
  readonly code: FulfillmentErrorCode;

  constructor(code: FulfillmentErrorCode, message = "Purchase verification failed.") {
    super(message);
    this.name = "FulfillmentError";
    this.code = code;
  }
}

const SESSION_ID_PATTERN = /^cs_[A-Za-z0-9_]{10,255}$/u;

export function validateCheckoutSessionId(value: unknown): value is string {
  return typeof value === "string" && SESSION_ID_PATTERN.test(value);
}

function paymentIntentId(value: CheckoutSessionForFulfillment["payment_intent"]): string | null {
  if (typeof value === "string") return value;
  return value?.id || null;
}

function priceId(session: CheckoutSessionForFulfillment): string | null {
  const item = session.line_items?.data?.[0];
  const id = item?.price?.id;
  return typeof id === "string" && id ? id : null;
}

function normalizedCurrency(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function restoreExistingPurchase(
  purchase: PurchaseRecord,
  database: PurchaseDatabase,
): Promise<FulfillmentResult> {
  let accessCode: string;
  try {
    accessCode = decryptAccessCode(purchase.access_code_ciphertext);
  } catch {
    throw new FulfillmentError("purchase_code_unavailable");
  }

  const bookSlug = await database.findBookSlug(purchase.book_id);
  if (!bookSlug) throw new FulfillmentError("purchase_unavailable");
  return { accessCode, bookId: purchase.book_id, bookSlug, reused: true };
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: unknown; message?: unknown };
  return record.code === "23505" || (typeof record.message === "string" && /duplicate key|unique constraint/iu.test(record.message));
}

export async function fulfillCheckoutSession(
  rawSessionId: string,
  dependencies: FulfillmentDependencies,
): Promise<FulfillmentResult> {
  if (!validateCheckoutSessionId(rawSessionId)) throw new FulfillmentError("invalid_session");

  const session = await dependencies.retrieveSession(rawSessionId);
  if (session.id !== rawSessionId || session.mode !== "payment" || session.status !== "complete" || session.payment_status !== "paid") {
    throw new FulfillmentError("session_not_paid");
  }

  const existingPurchase = await dependencies.database.findPurchase(rawSessionId);
  if (existingPurchase) return restoreExistingPurchase(existingPurchase, dependencies.database);

  const paymentLinkId = session.payment_link;
  const sessionPriceId = priceId(session);
  const sessionCurrency = normalizedCurrency(session.currency);
  const sessionAmount = session.amount_total;
  if (!paymentLinkId || !sessionPriceId || sessionAmount === null || !sessionCurrency) {
    throw new FulfillmentError("payment_mismatch");
  }

  const settings = await dependencies.database.findSaleSettings(paymentLinkId);
  if (!settings || !settings.enabled) throw new FulfillmentError("sales_settings_not_found");
  if (
    settings.stripe_payment_link_id !== paymentLinkId ||
    settings.stripe_price_id !== sessionPriceId ||
    settings.amount !== sessionAmount ||
    normalizedCurrency(settings.currency) !== sessionCurrency
  ) {
    throw new FulfillmentError("payment_mismatch");
  }

  const bookSlug = await dependencies.database.findBookSlug(settings.book_id);
  if (!bookSlug) throw new FulfillmentError("purchase_unavailable");

  const accessCode = generateAccessCode();
  const record: PurchaseRecord = {
    book_id: settings.book_id,
    stripe_checkout_session_id: rawSessionId,
    stripe_payment_intent_id: paymentIntentId(session.payment_intent),
    buyer_email: session.customer_details?.email || null,
    amount: sessionAmount,
    currency: sessionCurrency,
    payment_status: "paid",
    access_code_hash: hashAccessCode(accessCode),
    access_code_ciphertext: encryptAccessCode(accessCode),
  };

  const { data, error } = await dependencies.database.insertPurchase(record);
  if (error) {
    if (isUniqueViolation(error)) {
      const concurrentPurchase = await dependencies.database.findPurchase(rawSessionId);
      if (concurrentPurchase) return restoreExistingPurchase(concurrentPurchase, dependencies.database);
    }
    throw new FulfillmentError("purchase_unavailable");
  }

  if (!data) throw new FulfillmentError("purchase_unavailable");
  return { accessCode, bookId: settings.book_id, bookSlug, reused: false };
}
