import assert from "node:assert/strict";

import {
  fulfillCheckoutSession,
  type CheckoutSessionForFulfillment,
  type PurchaseDatabase,
  type PurchaseRecord,
  type SaleSettingsRecord,
} from "../src/lib/server/purchaseFulfillmentCore";

process.env.PURCHASE_CODE_PEPPER = "gatec-step2b-test-pepper";
process.env.PURCHASE_CODE_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const sessionId = "cs_test_gatec_step2b_001";
const saleSettings: SaleSettingsRecord = {
  book_id: "book-1",
  stripeLivemode: false,
  stripe_payment_link_id: "plink_test_gatec",
  stripe_price_id: "price_test_gatec",
  amount: 980,
  currency: "jpy",
  enabled: true,
};

function validSession(overrides: Partial<CheckoutSessionForFulfillment> = {}): CheckoutSessionForFulfillment {
  return {
    id: sessionId,
    livemode: false,
    mode: "payment",
    status: "complete",
    payment_status: "paid",
    amount_total: 980,
    currency: "jpy",
    payment_link: "plink_test_gatec",
    payment_intent: "pi_test_gatec",
    customer_details: { email: "buyer@example.test" },
    line_items: { data: [{ price: { id: "price_test_gatec" } }] },
    ...overrides,
  };
}

function setup(options: { session?: CheckoutSessionForFulfillment; settings?: SaleSettingsRecord | null; race?: boolean } = {}) {
  let purchase: PurchaseRecord | null = null;
  let raceOnce = options.race ?? false;
  const database: PurchaseDatabase = {
    async findSaleSettings(paymentLinkId, stripeLivemode) {
      const settings = options.settings === undefined ? saleSettings : options.settings;
      if (!settings || settings.stripe_payment_link_id !== paymentLinkId || settings.stripeLivemode !== stripeLivemode) return null;
      return settings;
    },
    async findBookSlug(bookId) { return bookId === "book-1" ? "gatec-sample-book" : null; },
    async findPurchase() { return purchase; },
    async insertPurchase(record) {
      if (raceOnce) {
        raceOnce = false;
        purchase = record;
        return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
      }
      purchase = record;
      return { data: record, error: null };
    },
  };
  return {
    database,
    dependencies: {
      retrieveSession: async () => options.session || validSession(),
      database,
      expectedLivemode: false,
    },
  };
}

async function main() {
  const first = setup();
  const created = await fulfillCheckoutSession(sessionId, first.dependencies);
  assert.equal(created.reused, false);
  assert.match(created.accessCode, /^WBK-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}(?:-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}){3}$/);
  assert.equal(created.bookSlug, "gatec-sample-book");

  const repeated = await fulfillCheckoutSession(sessionId, first.dependencies);
  assert.equal(repeated.reused, true, "a repeated verify must reuse the purchase");
  assert.equal(repeated.accessCode, created.accessCode, "a repeated verify must reuse the code");

  const cases: Array<{ label: string; overrides: Partial<CheckoutSessionForFulfillment> }> = [
    { label: "unpaid", overrides: { payment_status: "unpaid" } },
    { label: "wrong price", overrides: { line_items: { data: [{ price: { id: "price_other" } }] } } },
    { label: "wrong amount", overrides: { amount_total: 981 } },
    { label: "wrong currency", overrides: { currency: "usd" } },
    { label: "wrong Stripe environment", overrides: { livemode: true } },
  ];
  for (const { label, overrides } of cases) {
    await assert.rejects(() => fulfillCheckoutSession(sessionId, setup({ session: validSession(overrides) }).dependencies), label);
  }
  await assert.rejects(() => fulfillCheckoutSession(sessionId, setup({ settings: { ...saleSettings, enabled: false } }).dependencies), "disabled");
  await assert.rejects(() => fulfillCheckoutSession(sessionId, setup({ settings: { ...saleSettings, stripeLivemode: true } }).dependencies), "settings environment mismatch");
  await assert.rejects(() => fulfillCheckoutSession("not-a-session", first.dependencies), "invalid session");

  const raced = setup({ race: true });
  const raceResult = await fulfillCheckoutSession(sessionId, raced.dependencies);
  assert.equal(raceResult.reused, true, "a unique violation must restore the existing purchase");
  assert.equal((await fulfillCheckoutSession(sessionId, raced.dependencies)).accessCode, raceResult.accessCode);

  console.log("Gate C Step 2-B fulfillment checks passed.");
}

void main();
