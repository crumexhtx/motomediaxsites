import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  organizationJsonLd,
  vehicleJsonLd,
  yearPageJsonLd,
} from "@/lib/seo";
import { SITE } from "@/data/catalog";

describe("seo helpers", () => {
  it("builds absolute urls from site origin", () => {
    expect(absoluteUrl("/")).toBe(SITE.url);
    expect(absoluteUrl("/makes")).toBe(`${SITE.url}/makes`);
    expect(absoluteUrl("about")).toBe(`${SITE.url}/about`);
  });

  it("builds breadcrumb JSON-LD with absolute item urls", () => {
    const data = breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Makes", path: "/makes" },
    ]);

    expect(data["@type"]).toBe("BreadcrumbList");
    expect(data.itemListElement).toHaveLength(2);
    expect(data.itemListElement[1]).toMatchObject({
      position: 2,
      name: "Makes",
      item: `${SITE.url}/makes`,
    });
  });

  it("builds organization JSON-LD", () => {
    const data = organizationJsonLd();
    expect(data).toMatchObject({
      "@type": "Organization",
      name: SITE.name,
      alternateName: SITE.shortName,
      url: SITE.url,
    });
  });

  it("builds year-page WebPage JSON-LD (not Product/Vehicle)", () => {
    const data = yearPageJsonLd({
      make: "Ferrari",
      model: "Roma",
      year: 2021,
      description: "GT coupe",
      image: "https://example.com/car.jpg",
      path: "/makes/ferrari/roma/2021",
    });

    expect(data).toMatchObject({
      "@type": "WebPage",
      name: "2021 Ferrari Roma",
      url: `${SITE.url}/makes/ferrari/roma/2021`,
      about: { "@type": "Thing", name: "2021 Ferrari Roma" },
    });
    expect(data).not.toHaveProperty("offers");
    expect(JSON.stringify(data)).not.toMatch(/"@type":"Vehicle"/);
  });

  it("keeps vehicleJsonLd as an alias of yearPageJsonLd", () => {
    const input = {
      make: "Ford",
      model: "Bronco",
      year: 2024,
      description: "SUV",
      image: "https://example.com/bronco.jpg",
      path: "/makes/ford/bronco/2024",
    };
    expect(vehicleJsonLd(input)).toEqual(yearPageJsonLd(input));
  });

  it("escapes script breakouts in JsonLd payload", async () => {
    const { JsonLd } = await import("@/lib/seo");
    const element = JsonLd({
      data: { description: 'safe</script><script>alert(1)' },
    });
    const html = (element.props as { dangerouslySetInnerHTML: { __html: string } })
      .dangerouslySetInnerHTML.__html;
    expect(html).toContain("\\u003c/script>");
    expect(html).not.toContain("</script>");
  });
});
