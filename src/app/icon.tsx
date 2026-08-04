import { ImageResponse } from "next/og";

// Ícone gerado em build time — não precisamos versionar arquivo .png.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #131a23 0%, #0b0f14 100%)",
          color: "#4f9dfd",
          fontSize: 320,
          fontWeight: 700,
        }}
      >
        Σ
      </div>
    ),
    size,
  );
}
