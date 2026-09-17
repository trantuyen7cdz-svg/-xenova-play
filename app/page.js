import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#070707",
        color: "#fff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: "#ff3333",
            fontSize: "13px",
            fontWeight: "900",
            letterSpacing: "5px",
            marginBottom: "12px",
          }}
        >
          XENOVA PLAY
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "42px",
            fontWeight: "900",
          }}
        >
          XENOVA
        </h1>

        <p
          style={{
            color: "#888",
            marginTop: "12px",
            marginBottom: "30px",
          }}
        >
          Hệ thống quản lý KEY & dịch vụ
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <Link
            href="/login"
            style={{
              display: "block",
              padding: "16px",
              background: "#ff3030",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "12px",
              fontWeight: "800",
            }}
          >
            ĐĂNG NHẬP
          </Link>

          <Link
            href="/register"
            style={{
              display: "block",
              padding: "16px",
              background: "#171717",
              color: "#fff",
              textDecoration: "none",
              border: "1px solid #333",
              borderRadius: "12px",
              fontWeight: "800",
            }}
          >
            ĐĂNG KÝ TÀI KHOẢN
          </Link>

          <Link
            href="/dashboard"
            style={{
              display: "block",
              padding: "16px",
              background: "#171717",
              color: "#fff",
              textDecoration: "none",
              border: "1px solid #333",
              borderRadius: "12px",
              fontWeight: "800",
            }}
          >
            VÀO DASHBOARD
          </Link>

          <Link
            href="/shop"
            style={{
              display: "block",
              padding: "16px",
              background: "#171717",
              color: "#fff",
              textDecoration: "none",
              border: "1px solid #333",
              borderRadius: "12px",
              fontWeight: "800",
            }}
          >
            🛒 CỬA HÀNG
          </Link>
        </div>

        <div
          style={{
            marginTop: "35px",
            padding: "20px",
            background: "#101010",
            border: "1px solid #222",
            borderRadius: "15px",
          }}
        >
          <div style={{ fontSize: "30px" }}>🔑</div>

          <h3>KEY</h3>

          <p
            style={{
              color: "#777",
              margin: 0,
            }}
          >
            Quản lý và kích hoạt KEY
          </p>
        </div>

        <div
          style={{
            marginTop: "15px",
            padding: "20px",
            background: "#101010",
            border: "1px solid #222",
            borderRadius: "15px",
          }}
        >
          <div style={{ fontSize: "30px" }}>🛒</div>

          <h3>SHOP</h3>

          <p
            style={{
              color: "#777",
              margin: 0,
            }}
          >
            Mua sản phẩm nhanh chóng
          </p>
        </div>

        <div
          style={{
            marginTop: "30px",
            color: "#555",
            fontSize: "12px",
          }}
        >
          © 2026 XENOVA PLAY
        </div>
      </div>
    </main>
  );
}
