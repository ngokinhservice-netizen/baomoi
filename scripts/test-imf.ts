import { safeFetch } from "../src/lib/security";
import { extractArticleFromHtml } from "../src/lib/scraper/htmlParser";

async function main() {
  const url = "https://vnexpress.net/chuyen-gia-imf-viet-nam-can-cai-thien-nang-suat-va-du-lieu-5137075.html";
  const res = await safeFetch(url);
  const extracted = extractArticleFromHtml(res.text, url);

  console.log("Title:", extracted.title);
  console.log("Extracted Content Length:", extracted.extractedContent?.length);
  console.log("Excerpt:", extracted.excerpt?.slice(0, 100));
}

main().catch(console.error);
