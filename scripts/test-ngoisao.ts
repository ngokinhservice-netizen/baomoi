import { safeFetch } from "../src/lib/security";
import * as cheerio from "cheerio";

async function main() {
  const url = "https://vnexpress.net/bigbang-ve-den-han-quoc-5137157.html";
  const res = await safeFetch(url);
  const $ = cheerio.load(res.text);

  console.log("Canonical:", $('link[rel="canonical"]').attr("href"));
  console.log("Classes of parent of first long p:");
  $("p").each((_, p) => {
    if ($(p).text().length > 60) {
      console.log("Tag:", (p as any).tagName, "Parent:", (p.parent as any)?.tagName, "Parent class:", $(p.parent).attr("class"));
    }
  });
}

main().catch(console.error);
