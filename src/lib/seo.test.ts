import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  organizationJsonLd,
  vehicleJsonLd,
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
      url: SITE.url,
    });
  });

  it("builds vehicle JSON-LD", () => {
    const data = vehicleJsonLd({
      make: "Ferrari",
      model: "Roma",
      year: 2021,
      description: "GT coupe",
      image: "https://example.com/car.jpg",
      path: "/makes/ferrari/roma/2021",
    });

    expect(data).toMatchObject({
      "@type": "Vehicle",
      name: "2021 Ferrari Roma",
      vehicleModelDate: "2021",
      url: `${SITE.url}/makes/ferrari/roma/2021`,
    });
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
