import { ImageResponse } from "next/og";
import { SITE } from "@/data/catalog";

export const dynamic = "force-static";

/** Neutral brand card for Open Graph / Twitter — intentionally no specific vehicle. */
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background:
            "linear-gradient(135deg, #0b0d11 0%, #101722 60%, #0b0d11 100%)",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "0.28em",
            color: "#3d9cf0",
          }}
        >
          {SITE.shortName}
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          {SITE.name}
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 36,
            lineHeight: 1.3,
            color: "rgba(255,255,255,0.75)",
            maxWidth: 900,
          }}
        >
          {SITE.tagline}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
