import { ImageResponse } from "next/og";
import { SITE } from "@/data/catalog";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0d11",
          color: "#3d9cf0",
          fontSize: 52,
          fontWeight: 800,
          letterSpacing: "0.14em",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {SITE.shortName}
      </div>
    ),
    { ...size },
  );
}
