import prisma from "../src/lib/prisma";
import { safeFetch } from "../src/lib/security";
import { extractArticleFromHtml } from "../src/lib/scraper/htmlParser";
import { slugify } from "../src/lib/utils";

async function main() {
  const targetUrl = "https://vnexpress.net/carrick-tiep-tuc-dan-dat-man-utd-sau-cuoc-hop-khan-5137351.html";
  
  let article = await prisma.article.findFirst({
    where: {
      OR: [
        { sourceUrl: targetUrl },
        { title: { contains: "Carrick" } },
        { slug: { contains: "carrick" } }
      ]
    },
    include: { category: true }
  });

  console.log("Checking target article...");
  if (article) {
    console.log("Found existing article:", article.title);
    console.log("Current content length:", article.content?.length);
    console.log("Slug:", article.slug);
    console.log("Category:", article.category.name, `(${article.category.slug})`);
  }

  // Always fetch full details from VnExpress for this exact article to ensure 100% perfection
  console.log("Fetching full body from VnExpress:", targetUrl);
  const fetched = await safeFetch(targetUrl);
  const extracted = extractArticleFromHtml(fetched.text, targetUrl);

  console.log("Extracted title:", extracted.title);
  console.log("Extracted body length:", extracted.extractedContent?.length);
  console.log("Extracted image:", extracted.imageUrl);

  const theThaoCategory = await prisma.category.findFirst({
    where: { slug: "the-thao" }
  });

  if (article) {
    const updated = await prisma.article.update({
      where: { id: article.id },
      data: {
        title: extracted.title || article.title,
        content: extracted.extractedContent || article.content,
        excerpt: extracted.excerpt || article.excerpt,
        featuredImage: extracted.imageUrl || article.featuredImage,
        sourceUrl: targetUrl,
      }
    });
    console.log("Updated article id:", updated.id, "Slug:", updated.slug);
  } else {
    const slugBase = slugify(extracted.title || "carrick-tiep-tuc-dan-dat-man-utd-sau-cuoc-hop-khan");
    const uniqueSlug = `${slugBase}-${Date.now().toString().slice(-6)}`;
    const created = await prisma.article.create({
      data: {
        title: extracted.title || "Carrick tiếp tục dẫn dắt Man Utd sau cuộc họp khẩn",
        slug: uniqueSlug,
        excerpt: extracted.excerpt || "Ban lãnh đạo Man Utd quyết định giữ HLV Michael Carrick...",
        content: extracted.extractedContent || "",
        featuredImage: extracted.imageUrl,
        categoryId: theThaoCategory!.id,
        status: "PUBLISHED",
        sourceType: "IMPORTED",
        sourceUrl: targetUrl,
        sourceName: "VnExpress",
        publishedAt: extracted.sourcePublishedAt || new Date(),
      }
    });
    console.log("Created brand new article id:", created.id, "Slug:", created.slug);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
