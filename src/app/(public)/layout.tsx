import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getCategories } from "@/lib/data";
import { checkAndTriggerAutoScrape } from "@/lib/scraper/jitScraper";

export const dynamic = "force-dynamic";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Always keep news fresh from VnExpress automatically on visitor traffic
  checkAndTriggerAutoScrape();

  const categories = await getCategories();

  return (
    <div className="flex flex-col min-h-screen">
      <Header categories={categories} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
      <Footer />
    </div>
  );
}
