import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const envText = fs.readFileSync(".env.local", "utf8");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.log(JSON.stringify({ error: "missing_env" }, null, 2));
  process.exit(0);
}

const supabase = createClient(url, key);

const books = await supabase.from("books").select("id").limit(1);
const images = await supabase.from("book_images").select("id").limit(1);
const storageBookAssets = await supabase.storage.from("book-assets").list("", { limit: 1 });
const storageBookAssetsUnderscore = await supabase.storage.from("book_assets").list("", { limit: 1 });

console.log(
  JSON.stringify(
    {
      books: books.error
        ? { code: books.error.code, message: books.error.message, details: books.error.details }
        : { ok: true, count: books.data?.length ?? 0 },
      book_images: images.error
        ? { code: images.error.code, message: images.error.message, details: images.error.details }
        : { ok: true, count: images.data?.length ?? 0 },
      book_assets: storageBookAssets.error
        ? {
            statusCode: storageBookAssets.error.statusCode,
            error: storageBookAssets.error.error,
            message: storageBookAssets.error.message,
          }
        : { ok: true, count: storageBookAssets.data?.length ?? 0 },
      book_assets_underscore: storageBookAssetsUnderscore.error
        ? {
            statusCode: storageBookAssetsUnderscore.error.statusCode,
            error: storageBookAssetsUnderscore.error.error,
            message: storageBookAssetsUnderscore.error.message,
          }
        : { ok: true, count: storageBookAssetsUnderscore.data?.length ?? 0 },
    },
    null,
    2,
  ),
);
