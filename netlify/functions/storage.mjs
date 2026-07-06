// netlify/functions/storage.mjs
//
// A minimal key-value storage API for the 75 Soft app's SHARED data
// (Soft Street board, chat messages, nudges). Personal data (each
// person's own profile and daily check-ins) never touches this function —
// it lives in that person's own browser via localStorage instead.
//
// Backed by Netlify Blobs, which works automatically on Netlify with no
// extra setup or credentials once this site is deployed.

import { getStore } from "@netlify/blobs";

const STORE_NAME = "soft75-shared";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      // Allow this site's own pages to call the function. Same-origin by
      // default anyway, but harmless to be explicit.
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

export default async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  const store = getStore(STORE_NAME);

  if (req.method === "GET") {
    const url = new URL(req.url);
    const key = url.searchParams.get("key");
    if (!key) return jsonResponse({ error: "missing key" }, 400);

    const value = await store.get(key);
    if (value === null) return jsonResponse({ error: "not found" }, 404);
    return jsonResponse({ key, value });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return jsonResponse({ error: "invalid JSON body" }, 400);
    }
    const { key, value } = body || {};
    if (!key) return jsonResponse({ error: "missing key" }, 400);
    if (typeof value !== "string") return jsonResponse({ error: "value must be a string" }, 400);
    if (key.length > 200) return jsonResponse({ error: "key too long" }, 400);
    if (value.length > 4_500_000) return jsonResponse({ error: "value too large" }, 400);

    await store.set(key, value);
    return jsonResponse({ key, value });
  }

  return jsonResponse({ error: "method not allowed" }, 405);
};

export const config = {
  path: "/.netlify/functions/storage"
};
