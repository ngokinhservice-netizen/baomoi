import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 32,
  height: 32,
};
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
          background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
          borderRadius: "7px",
          position: "relative",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <div
          style={{
            position: "absolute",
            top: "2px",
            right: "2px",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: "#fbbf24",
            border: "1px solid #ffffff",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
