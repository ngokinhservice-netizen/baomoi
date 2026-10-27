import prisma from "@/lib/prisma";
import ArticleForm from "@/components/admin/ArticleForm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface EditArticlePageProps {
  params: { id: string };
}

export default async function EditArticlePage({ params }: EditArticlePageProps) {
  const article = await prisma.article.findUnique({
    where: { id: params.id },
  });

  if (!article) {
    notFound();
  }

  return <ArticleForm initialData={article} isEdit={true} />;
}
