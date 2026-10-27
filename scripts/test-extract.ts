import { safeFetch } from "../src/lib/security";
import * as cheerio from "cheerio";

async function testCleanExtract() {
  const url = "https://vnexpress.net/carrick-tiep-tuc-dan-dat-man-utd-sau-cuoc-hop-khan-5137351.html";
  const res = await safeFetch(url);
  const $ = cheerio.load(res.text);

  const container = $("article.fck_detail, .fck_detail, .detail-content, .article-body, .detail__content").first();

  // Clean ads, embeds, social widgets
  container.find("script, style, .box_social, .box-embed, .ads, .inner-article, .list_link, .footer-content").remove();

  const formattedElements: string[] = [];

  container.children().each((_, el) => {
    const tagName = (el as any).tagName?.toLowerCase();
    const $el = $(el);

    if (tagName === "p") {
      const text = $el.text().trim();
      if (text) {
        formattedElements.push(`<p>${$el.html()}</p>`);
      }
    } else if (["h2", "h3", "h4"].includes(tagName)) {
      formattedElements.push(`<${tagName} class="font-bold text-gray-900 mt-6 mb-3">${$el.html()}</${tagName}>`);
    } else if (tagName === "figure") {
      const img = $el.find("img");
      let imgSrc = img.attr("data-src") || img.attr("src") || "";
      const caption = $el.find("figcaption, .desc_cation").text().trim();
      if (imgSrc) {
        formattedElements.push(`
          <figure class="my-6">
            <img src="${imgSrc}" alt="${caption}" class="w-full rounded-lg shadow-sm" loading="lazy" />
            ${caption ? `<figcaption class="text-xs text-gray-500 text-center mt-2 italic">${caption}</figcaption>` : ""}
          </figure>
        `);
      }
    } else if (tagName === "blockquote") {
      formattedElements.push(`<blockquote>${$el.html()}</blockquote>`);
    }
  });

  const fullContent = formattedElements.join("\n");
  console.log("Full Clean Content length:", fullContent.length);
  console.log("Formatted elements count:", formattedElements.length);
  console.log("Sample first 300 chars:\n", fullContent.slice(0, 300));
}

testCleanExtract();
