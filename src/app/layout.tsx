import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Outfit, Syne } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE } from "@/data/catalog";
import { JsonLd, buildMetadata, organizationJsonLd } from "@/lib/seo";
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

/** Explicit viewport so Next does not emit an empty `next-size-adjust` meta. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  // Neutral brand OG/Twitter defaults (no catalog car photo).
  ...buildMetadata({
    title: SITE.name,
    description: SITE.description,
    path: "/",
  }),
  title: {
    default: `${SITE.name} \u00b7 compare used model years`,
    template: `%s \u00b7 ${SITE.name}`,
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
        <Analytics />
      </body>
    </html>
  );
}
