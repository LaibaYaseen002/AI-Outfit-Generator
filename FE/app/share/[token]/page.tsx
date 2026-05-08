import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicShare, type PublicShare } from "@/lib/share";

interface PageProps {
  params: { token: string };
}

const TONE_LABELS: Record<string, string> = {
  light: "Light",
  medium: "Medium",
  dark: "Deep"
};

async function loadShare(token: string): Promise<PublicShare | null> {
  try {
    return await getPublicShare(token);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params
}: PageProps): Promise<Metadata> {
  const share = await loadShare(params.token);
  if (!share) {
    return {
      title: "Outfit not found · AI Outfit Generator",
      description: "This shared outfit link is no longer available."
    };
  }
  const title = `${capitalize(share.occasion)} outfit · AI Outfit Generator`;
  const description = share.explanation.slice(0, 200);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: share.imageUrl ? [{ url: share.imageUrl }] : undefined
    },
    twitter: {
      card: share.imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: share.imageUrl ? [share.imageUrl] : undefined
    }
  };
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

export default async function SharedOutfitPage({ params }: PageProps) {
  const share = await loadShare(params.token);
  if (!share) notFound();

  return (
    <main className="page">
      <div className="container-narrow space-y-6 animate-fade-in-up">
        <div className="page-header">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-500">
              Shared outfit
            </p>
            <h1 className="page-title mt-1">A look picked by AI</h1>
          </div>
          <Link href="/" className="btn btn-sm btn-secondary">
            Make your own →
          </Link>
        </div>

        {share.imageUrl && (
          <div className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-black/5">
            <div className="relative aspect-[2/3] w-full bg-brand-gradient-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={share.imageUrl}
                alt={`Outfit for ${share.occasion}`}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        )}

        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                Skin tone · Occasion
              </p>
              <p className="font-semibold text-neutral-800">
                {TONE_LABELS[share.skinTone] ?? share.skinTone} ·{" "}
                <span className="capitalize">{share.occasion}</span>
              </p>
            </div>
            <div className="flex gap-2">
              {share.colors.map((c) => (
                <div
                  key={c}
                  title={c}
                  className="h-9 w-9 rounded-full border-2 border-white shadow-soft ring-1 ring-black/5"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <OutfitItem label="Top" value={share.outfit.top} />
          <OutfitItem label="Bottom" value={share.outfit.bottom} />
          <OutfitItem label="Footwear" value={share.outfit.footwear} />
          <div className="card-flat">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
              Accessories
            </p>
            <ul className="mt-2 space-y-1 text-neutral-800">
              {share.outfit.accessories.map((a, i) => (
                <li key={i}>• {a}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-brand-800">
            Why this works
          </h2>
          <p className="mt-2 leading-relaxed text-neutral-700">
            {share.explanation}
          </p>
        </div>

        <div className="text-center">
          <Link href="/" className="btn btn-md btn-primary">
            Generate your own outfit
          </Link>
        </div>
      </div>
    </main>
  );
}

function OutfitItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-flat">
      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-neutral-800">{value}</p>
    </div>
  );
}
