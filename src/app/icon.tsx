import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#05070a",
        color: "#f8fafc",
        display: "flex",
        fontSize: 13,
        fontWeight: 700,
        height: "100%",
        justifyContent: "center",
        letterSpacing: 0,
        width: "100%",
      }}
    >
      QE
    </div>,
    size,
  );
}
