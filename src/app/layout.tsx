import type { Metadata } from "next";
import { Outfit, Syne } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE } from "@/data/catalog";
import { getCatalog } from "@/data/catalog.server";
import { JsonLd, organizationJsonLd } from "@/lib/seo";
import "./globals.css";

const display = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = Outfit({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const catalogSnapshot = getCatalog();
const defaultOgImage =
  catalogSnapshot
    .flatMap((make) =>
      make.models.flatMap((model) =>
        model.years.flatMap((year) => year.images),
      ),
    )
    .find((img) => img?.src && !img.src.endsWith(".svg")) ??
  catalogSnapshot[0]?.coverImage;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} · car photos by make, model, and year`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: SITE.name,
    description: SITE.description,
    url: SITE.url,
    images: defaultOgImage
      ? [{ url: defaultOgImage.src, alt: defaultOgImage.alt }]
      : undefined,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.name,
    description: SITE.description,
    images: defaultOgImage ? [defaultOgImage.src] : undefined,
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${body.variable} h-full`}
    >
      <body className="flex min-h-full flex-col antialiased">
        <JsonLd data={organizationJsonLd()} />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
