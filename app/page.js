import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "#fff",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "14px",
            color: "#ff3b3b",
            fontWeight: "bold",
            letterSpacing: "4px",
            marginBottom: "15px",
          }}
        >
          XENOVA PLAY
        </div>

        <h1
          style={{
            fontSize: "clamp(42px, 10vw, 90px)",
            margin: 0,
            fontWeight: 900,
            letterSpacing: "-3px",
          }}
        >
          XENOVA
        </h1>

        <p
          style={{
            color: "#aaa",
            fontSize: "18px",
            marginTop: "15px",
          }}
        >
          Hệ thống quản lý KEY & dịch vụ
        </p>

        <div
          style={{
            display: "flex",
            gap: "15px",
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: "35px",
          }}
        >
          <Link
            href="/dashboard"
            style={{
              textDecoration: "none",
              background: "#ff3030",
              color: "#fff",
              padding: "15px 30px",
              borderRadius: "10px",
              fontWeight: "bold",
            }}
          >
            VÀO DASHBOARD
          </Link>

          <Link
            href="/shop"
            style={{
              textDecoration: "none",
              background: "#181818",
              color: "#fff",
              padding: "15px 30px",
              borderRadius: "10px",
              border: "1px solid #333",
              fontWeight: "bold",
            }}
          >
            🛒 CỬA HÀNG
          </Link>
        </div>

        <div
          style={{
            marginTop: "60px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "15px",
          }}
        >
          <div
            style={{
              background: "#111",
              border: "1px solid #222",
              borderRadius: "12px",
              padding: "25px",
            }}
          >
            <div style={{ fontSize: "28px" }}>🔑</div>
            <h3>KEY</h3>
            <p style={{ color: "#888", fontSize: "14px" }}>
              Quản lý và kích hoạt KEY
            </p>
          </div>

          <div
            style={{
              background: "#111",
              border: "1px solid #222",
              borderRadius: "12px",
              padding: "25px",
            }}
          >
            <div style={{ fontSize: "28px" }}>🛒</div>
            <h3>SHOP</h3>
            <p style={{ color: "#888", fontSize: "14px" }}>
              Mua sản phẩm nhanh chóng
            </p>
          </div>

          <div
            style={{
              background: "#111",
              border: "1px solid #222",
              borderRadius: "12px",
              padding: "25px",
            }}
          >
            <div style={{ fontSize: "28px" }}>⚡</div>
            <h3>NHANH</h3>
            <p style={{ color: "#888", fontSize: "14px" }}>
              Hệ thống xử lý tự động
            </p>
          </div>
        </div>

        <p
          style={{
            marginTop: "50px",
            color: "#555",
            fontSize: "13px",
          }}
        >
          © 2026 XENOVA PLAY
        </p>
      </div>
    </main>
  );
}
