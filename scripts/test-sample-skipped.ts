import prisma from "../src/lib/prisma";
import { safeFetch } from "../src/lib/security";
import * as cheerio from "cheerio";

async function main() {
  const arts = await prisma.article.findMany({
    where: { content: { contains: "Nội dung chi tiết được cập nhật từ VnExpress" } },
    take: 5,
    select: { id: true, title: true, sourceUrl: true }
  });

  console.log("Sample articles still having placeholder:", arts.length);
  for (const a of arts) {
    console.log("---");
    console.log("Title:", a.title);
    console.log("URL:", a.sourceUrl);
    if (!a.sourceUrl) continue;
    try {
      const res = await safeFetch(a.sourceUrl);
      const $ = cheerio.load(res.text);
      console.log("HTML length:", res.text.length);
      console.log("article.fck_detail exists:", $("article.fck_detail").length);
      console.log(".fck_detail exists:", $(".fck_detail").length);
      console.log("article exists:", $("article").length);
      console.log(".sidebar-1 exists:", $(".sidebar-1").length);
      console.log("p tags in article:", $("article p").length);
      console.log("total p tags:", $("p").length);
    } catch (e: any) {
      console.log("Fetch error:", e.message);
    }
  }
}

main().finally(() => prisma.$disconnect());
