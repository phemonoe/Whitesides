import Link from "next/link";
import { notFound } from "next/navigation";
import { PaperReader } from "@/components/paper-reader";
import { loadPaperBySlug } from "@/lib/paper-store";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PaperPage({ params }: PageProps) {
  const { slug } = await params;
  const paper = loadPaperBySlug(slug);

  if (!paper) {
    notFound();
  }

  return (
    <>
      <nav className="reader-nav-wrap">
        <div className="reader-nav-main">
          <Link href="/" className="reader-nav-link">
            Back to Library
          </Link>
          <span className="reader-nav-slug">Reader: {slug}</span>
        </div>
      </nav>
      <PaperReader data={paper} />
    </>
  );
}
