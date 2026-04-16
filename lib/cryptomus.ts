import crypto from "crypto";

const API_BASE = "https://api.cryptomus.com";

function getConfig() {
  const merchant = process.env.CRYPTOMUS_MERCHANT_ID || "";
  const apiKey = process.env.CRYPTOMUS_PAYMENT_API_KEY || "";
  const callbackUrl = process.env.CRYPTOMUS_CALLBACK_URL || "";
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  if (!merchant || !apiKey) throw new Error("Missing Cryptomus env vars");
  return { merchant, apiKey, callbackUrl, appUrl };
}

export function cryptomusSignFromObject(payload: Record<string, unknown>, apiKey?: string) {
  const key = apiKey || getConfig().apiKey;
  const json = JSON.stringify(payload);
  return crypto.createHash("md5").update(Buffer.from(json).toString("base64") + key).digest("hex");
}

export async function createCryptomusInvoice(input: {
  amountUsd: number;
  orderId: string;
  planName: string;
  userId: string;
  userEmail: string;
}) {
  const { merchant, callbackUrl, appUrl } = getConfig();
  const body = {
    amount: String(input.amountUsd),
    currency: "USD",
    order_id: input.orderId,
    url_return: `${appUrl}/dashboard/billing?payment=success`,
    url_callback: callbackUrl,
    additional_data: JSON.stringify({
      userId: input.userId,
      userEmail: input.userEmail,
      planName: input.planName
    })
  };
  const sign = cryptomusSignFromObject(body);

  const res = await fetch(`${API_BASE}/v1/payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      merchant,
      sign
    },
    body: JSON.stringify(body)
  });

  const json = await res.json();
  if (!res.ok || !json?.result) {
    throw new Error(json?.message || "Failed to create Cryptomus invoice");
  }

  return json.result;
}

export function verifyCryptomusWebhook(raw: any) {
  const apiKey = getConfig().apiKey;
  const incoming = raw?.sign;
  if (!incoming) return false;
  const copy = { ...raw };
  delete copy.sign;
  const expected = cryptomusSignFromObject(copy, apiKey);
  return expected === incoming;
}
