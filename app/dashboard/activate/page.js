"use client";

export default function ActivatePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "white",
        padding: "40px",
        fontFamily: "Arial",
      }}
    >
      <h1>🔑 KÍCH HOẠT KEY</h1>

      <p>Trang kích hoạt KEY đang hoạt động.</p>

      <a
        href="/dashboard"
        style={{ color: "#ff1744" }}
      >
        ← Quay lại Dashboard
      </a>
    </main>
  );
}
