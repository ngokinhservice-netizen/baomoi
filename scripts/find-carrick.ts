import prisma from "../src/lib/prisma";

async function main() {
  const allCarrick = await prisma.article.findMany({
    where: {
      OR: [
        { title: { contains: "Carrick" } },
        { slug: { contains: "carrick" } },
        { sourceUrl: { contains: "5137351" } }
      ]
    },
    include: { category: true }
  });

  console.log(`Found ${allCarrick.length} articles matching:`);
  for (const a of allCarrick) {
    console.log(`ID: ${a.id}`);
    console.log(`Title: ${a.title}`);
    console.log(`Slug: ${a.slug}`);
    console.log(`Category: ${a.category.slug}`);
    console.log(`URL: /${a.category.slug}/${a.slug}`);
    console.log(`Content length: ${a.content?.length}`);
    console.log(`---`);
  }
}

main().finally(() => prisma.$disconnect());
