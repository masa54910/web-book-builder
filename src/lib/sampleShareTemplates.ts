import {
  SAMPLE_BOOK_DESCRIPTION,
  SAMPLE_BOOK_ROUTE,
  SAMPLE_BOOK_TITLE,
} from "@/lib/sampleBookConstants";
import { buildShareTemplate, buildXShareTemplate } from "@/lib/shareTemplates";

export { SAMPLE_BOOK_DESCRIPTION };

export const SAMPLE_BOOK_URL = `https://webbookmaker.vercel.app${SAMPLE_BOOK_ROUTE}`;

export const SAMPLE_X_TEMPLATE = buildXShareTemplate({
  title: SAMPLE_BOOK_TITLE,
  description: SAMPLE_BOOK_DESCRIPTION,
  url: SAMPLE_BOOK_URL,
  hashtags: ["WebBookMaker", "Webブック", SAMPLE_BOOK_TITLE],
});

export const SAMPLE_NOTE_TEMPLATE = buildShareTemplate({
  platform: "note",
  title: SAMPLE_BOOK_TITLE,
  description: SAMPLE_BOOK_DESCRIPTION,
  url: SAMPLE_BOOK_URL,
});
