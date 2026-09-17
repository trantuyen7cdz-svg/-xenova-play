"use client";

export default function ShopPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "#fff",
        padding: "30px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <a
          href="/orders"
          style={{
            color: "#aaa",
            textDecoration: "none",
          }}
        >
          ← Đơn hàng
        </a>

        <h1
          style={{
            marginTop: "30px",
            fontSize: "40px",
          }}
        >
          🛒 MUA KEY
        </h1>

        <div
          style={{
            marginTop: "25px",
            background: "#111",
            border: "1px solid #292929",
            borderRadius: "15px",
            padding: "25px",
          }}
        >
          <div
            style={{
              color: "#ff3030",
              fontSize: "13px",
              fontWeight: "bold",
              letterSpacing: "2px",
            }}
          >
            XENOVA KEY
          </div>

          <h2>KEY ADR 1 NGÀY</h2>

          <p style={{ color: "#888" }}>
            Key sử dụng trong 1 ngày
          </p>

          <div
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              margin: "20px 0",
            }}
          >
            10.000₫
          </div>

          <p style={{ color: "#777" }}>
            Thời hạn: 1 ngày
          </p>

          <button
            style={{
              width: "100%",
              marginTop: "15px",
              padding: "15px",
              border: "none",
              borderRadius: "10px",
              background: "#ff3030",
              color: "#fff",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            MUA NGAY
          </button>
        </div>
      </div>
    </main>
  );
}
