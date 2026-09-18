"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HERO */}
        <section style={styles.hero}>
          <div style={styles.logo}>
            XENOVA
          </div>

          <div style={styles.play}>
            PLAY
          </div>

          <h1 style={styles.title}>
            XENOVA PLAY
          </h1>

          <p style={styles.description}>
            Hệ thống mua KEY nhanh chóng, quản lý tài khoản
            và nạp tiền trực tiếp trên website.
          </p>

          <div style={styles.actions}>
            <Link
              href="/shop"
              style={styles.primaryButton}
            >
              🛒 MUA KEY NGAY
            </Link>

            <Link
              href="/dashboard"
              style={styles.secondaryButton}
            >
              👤 TÀI KHOẢN
            </Link>
          </div>
        </section>

        {/* FEATURES */}
        <section style={styles.features}>

          <Feature
            icon="⚡"
            title="Xử lý nhanh"
            text="Mua KEY trực tiếp bằng số dư trong ví."
          />

          <Feature
            icon="💰"
            title="Nạp tiền"
            text="Nạp tiền qua QR và chờ Admin duyệt."
          />

          <Feature
            icon="🔑"
            title="KEY tự động"
            text="KEY được cấp ngay sau khi mua thành công."
          />

          <Feature
            icon="🔒"
            title="Tài khoản riêng"
            text="Quản lý KEY và đơn hàng trong tài khoản."
          />

        </section>

        {/* HOW IT WORKS */}
        <section style={styles.section}>
          <div style={styles.sectionTitle}>
            🚀 CÁCH SỬ DỤNG
          </div>

          <div style={styles.steps}>

            <Step
              number="01"
              title="Đăng ký tài khoản"
              text="Tạo tài khoản XENOVA PLAY."
            />

            <Step
              number="02"
              title="Nạp tiền"
              text="Chuyển khoản theo thông tin trên trang nạp tiền."
            />

            <Step
              number="03"
              title="Chờ Admin duyệt"
              text="Số tiền sẽ được cộng vào ví sau khi duyệt."
            />

            <Step
              number="04"
              title="Mua KEY"
              text="Chọn sản phẩm và thanh toán bằng số dư."
            />

            <Step
              number="05"
              title="Nhận KEY"
              text="KEY được cấp trực tiếp vào tài khoản."
            />

          </div>
        </section>

        {/* MAIN LINKS */}
        <section style={styles.section}>
          <div style={styles.sectionTitle}>
            📌 TRUY CẬP NHANH
          </div>

          <div style={styles.grid}>

            <HomeCard
              href="/shop"
              icon="🛒"
              title="Cửa hàng"
              text="Xem các sản phẩm KEY"
            />

            <HomeCard
              href="/deposit"
              icon="💰"
              title="Nạp tiền"
              text="Nạp tiền vào ví"
            />

            <HomeCard
              href="/keys"
              icon="🔑"
              title="KEY của tôi"
              text="Xem KEY đã mua"
            />

            <HomeCard
              href="/orders"
              icon="📦"
              title="Đơn hàng"
              text="Xem lịch sử mua hàng"
            />

          </div>
        </section>

        {/* ACCOUNT */}
        <section style={styles.accountBox}>
          <div>
            <div style={styles.accountTitle}>
              👤 Đã có tài khoản?
            </div>

            <div style={styles.accountText}>
              Đăng nhập để quản lý số dư, KEY và đơn hàng.
            </div>
          </div>

          <div style={styles.accountActions}>
            <Link
              href="/login"
              style={styles.loginButton}
            >
              ĐĂNG NHẬP
            </Link>

            <Link
              href="/register"
              style={styles.registerButton}
            >
              ĐĂNG KÝ
            </Link>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={styles.footer}>
          <div style={styles.footerLogo}>
            XENOVA PLAY
          </div>

          <div>
            Hệ thống quản lý KEY
          </div>

          <div style={styles.footerLinks}>
            <Link href="/shop">
              Cửa hàng
            </Link>

            <Link href="/dashboard">
              Tài khoản
            </Link>

            <Link href="/settings">
              Cài đặt
            </Link>
          </div>
        </footer>

      </div>
    </main>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div style={styles.feature}>
      <div style={styles.featureIcon}>
        {icon}
      </div>

      <div>
        <strong style={styles.featureTitle}>
          {title}
        </strong>

        <p style={styles.featureText}>
          {text}
        </p>
      </div>
    </div>
  );
}

function Step({ number, title, text }) {
  return (
    <div style={styles.step}>
      <div style={styles.stepNumber}>
        {number}
      </div>

      <div>
        <strong style={styles.stepTitle}>
          {title}
        </strong>

        <p style={styles.stepText}>
          {text}
        </p>
      </div>
    </div>
  );
}

function HomeCard({ href, icon, title, text }) {
  return (
    <Link
      href={href}
      style={styles.homeCard}
    >
      <div style={styles.homeIcon}>
        {icon}
      </div>

      <div>
        <strong style={styles.homeTitle}>
          {title}
        </strong>

        <p style={styles.homeText}>
          {text}
        </p>
      </div>

      <span style={styles.arrow}>
        ›
      </span>
    </Link>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 50% 0%, #142544 0%, #080d16 38%, #05070b 100%)",
    color: "#fff",
    padding: "40px 15px 70px",
  },

  container: {
    width: "100%",
    maxWidth: "1050px",
    margin: "0 auto",
  },

  hero: {
    textAlign: "center",
    padding:
      "55px 15px 45px",
  },

  logo: {
    display: "inline-block",
    color: "#72a9ff",
    fontSize: "clamp(35px, 10vw, 65px)",
    fontWeight: "1000",
    letterSpacing: "7px",
    lineHeight: 1,
    textShadow:
      "0 0 35px rgba(83,145,255,.3)",
  },

  play: {
    marginTop: "6px",
    color: "#6b7890",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "8px",
  },

  title: {
    margin:
      "25px 0 12px",
    fontSize: "clamp(27px, 6vw, 45px)",
    fontWeight: "950",
  },

  description: {
    maxWidth: "600px",
    margin: "0 auto",
    color: "#7d8ba1",
    fontSize: "14px",
    lineHeight: 1.7,
  },

  actions: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "25px",
  },

  primaryButton: {
    padding: "13px 20px",
    borderRadius: "11px",
    background: "#fff",
    color: "#000",
    textDecoration: "none",
    fontSize: "12px",
    fontWeight: "950",
  },

  secondaryButton: {
    padding: "13px 20px",
    borderRadius: "11px",
    background: "#101b2c",
    border: "1px solid #29405f",
    color: "#9ec4ff",
    textDecoration: "none",
    fontSize: "12px",
    fontWeight: "900",
  },

  features: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "11px",
    marginTop: "15px",
  },

  feature: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    padding: "17px",
    borderRadius: "15px",
    background: "#0c131f",
    border: "1px solid #1e2b3e",
  },

  featureIcon: {
    width: "39px",
    height: "39px",
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: "10px",
    background: "#142238",
    fontSize: "18px",
  },

  featureTitle: {
    fontSize: "13px",
  },

  featureText: {
    margin: "5px 0 0",
    color: "#69778d",
    fontSize: "10px",
    lineHeight: 1.5,
  },

  section: {
    marginTop: "35px",
  },

  sectionTitle: {
    marginBottom: "13px",
    fontSize: "15px",
    fontWeight: "950",
    letterSpacing: ".5px",
  },

  steps: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "10px",
  },

  step: {
    display: "flex",
    gap: "10px",
    padding: "14px",
    background: "#0b111b",
    border: "1px solid #1b283a",
    borderRadius: "13px",
  },

  stepNumber: {
    color: "#72a9ff",
    fontSize: "11px",
    fontWeight: "950",
  },

  stepTitle: {
    fontSize: "12px",
  },

  stepText: {
    margin: "4px 0 0",
    color: "#65748a",
    fontSize: "10px",
    lineHeight: 1.5,
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "10px",
  },

  homeCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px",
    background: "#0d1420",
    border: "1px solid #202d42",
    borderRadius: "14px",
    color: "#fff",
    textDecoration: "none",
  },

  homeIcon: {
    width: "42px",
    height: "42px",
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: "11px",
    background: "#151f30",
    fontSize: "19px",
  },

  homeTitle: {
    display: "block",
    fontSize: "13px",
  },

  homeText: {
    margin: "4px 0 0",
    color: "#69778d",
    fontSize: "10px",
  },

  arrow: {
    marginLeft: "auto",
    color: "#526177",
    fontSize: "23px",
  },

  accountBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    marginTop: "35px",
    padding: "20px",
    borderRadius: "17px",
    background:
      "linear-gradient(135deg, #101b2b, #0b111c)",
    border: "1px solid #263852",
  },

  accountTitle: {
    fontSize: "15px",
    fontWeight: "900",
  },

  accountText: {
    marginTop: "5px",
    color: "#718097",
    fontSize: "11px",
  },

  accountActions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },

  loginButton: {
    padding: "10px 13px",
    borderRadius: "9px",
    background: "#fff",
    color: "#000",
    textDecoration: "none",
    fontSize: "10px",
    fontWeight: "900",
  },

  registerButton: {
    padding: "10px 13px",
    borderRadius: "9px",
    background: "#17263c",
    border: "1px solid #2b4262",
    color: "#9fc4ff",
    textDecoration: "none",
    fontSize: "10px",
    fontWeight: "900",
  },

  footer: {
    textAlign: "center",
    marginTop: "45px",
    paddingTop: "25px",
    borderTop: "1px solid #172131",
    color: "#3f4d61",
    fontSize: "10px",
  },

  footerLogo: {
    color: "#5a6d88",
    fontWeight: "950",
    letterSpacing: "2px",
    marginBottom: "6px",
  },

  footerLinks: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "18px",
    marginTop: "13px",
  },
};
