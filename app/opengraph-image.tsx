import { ImageResponse } from "next/og";

export const alt = "Bunkmeter: how many classes can you skip?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 90, background: "#f2efe7", color: "#171614", fontFamily: "Georgia, serif" }}>
        <div style={{ display: "flex", fontSize: 190, lineHeight: 1 }}>
          Bunk<span style={{ color: "#d9481e", fontStyle: "italic" }}>meter</span>
        </div>
        <div style={{ marginTop: 32, fontSize: 52, display: "flex" }}>How many classes can you actually skip?</div>
        <div style={{ marginTop: 28, fontSize: 30, color: "#75705f", display: "flex" }}>Free attendance calculator for college students</div>
      </div>
    ),
    size,
  );
}
