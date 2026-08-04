import { ImageResponse } from "next/og";

// O iOS não aceita transparência nem SVG no ícone da tela de início.
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
          background: "#0b0f14",
          color: "#4f9dfd",
          fontSize: 112,
          fontWeight: 700,
        }}
      >
        Σ
      </div>
    ),
    size,
  );
}
