"use client";
import Link from "next/link";
const products = [
  {
    type: "ANDROID",
    title: "KEY ANDROID",
    description: "KEY dành cho thiết bị Android",
  },
  {
    type: "IPHONE",
    title: "KEY IPHONE",
    description: "KEY dành cho thiết bị iPhone",
  },
  {
    type: "PC",
    title: "KEY PC",
    description: "KEY dành cho máy tính",
  },
];
const features = [
  {
    icon: "⚡",
    title: "Nhanh chóng",
    description: "Mua và nhận KEY thuận tiện.",
  },
  {
    icon: "🔐",
    title: "Tài khoản riêng",
    description: "Quản lý KEY và đơn hàng của bạn.",
  },
  {
    icon: "💳",
    title: "Thanh toán",
    description: "Nạp tiền trực tiếp vào tài khoản.",
  },
  {
    icon: "💬",
    title: "Hỗ trợ",
    description: "Liên hệ Admin khi cần hỗ trợ.",
  },
];
export default function Home() {
  return (
    <main className="home">
      <section className="hero">
        <div className="heroGlow heroGlowOne" />
        <div className="heroGlow heroGlowTwo" />
        <div className="heroInner">
          <div className="brand">
            <span>XENOVA PLAY</span>
          </div>
          <div className="heroVisual">
            <div className="visualCard">
              <div className="visualSmall">✦ XENOVA</div>
              <div className="visualMain">
                DIGITAL
                <br />
                STORE
              </div>
              <div className="visualBottom">
                <span>KEY 24/7</span>
                <span>SHOP</span>
              </div>
            </div>
          </div>
          <div className="heroText">
            <div className="eyebrow">XENOVA PLAY</div>
            <h1>
              DIGITAL
              <br />
              <span>KEY STORE</span>
            </h1>
            <p>
              Kho KEY và sản phẩm số.
              <br />
              Mua nhanh · Thanh toán tiện lợi · Hỗ trợ trực tiếp
            </p>
            <div className="heroActions">
              <Link href="/shop" className="primaryButton">
                Mua ngay
              </Link>
              <Link href="/dashboard" className="secondaryButton">
                Tài khoản
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="section productsSection">
        <div className="sectionHeading">
          <div>
            <span className="sectionEyebrow">SHOP</span>
            <h2>Sản phẩm nổi bật</h2>
          </div>
          <Link href="/shop" className="viewAll">
            Xem tất cả →
          </Link>
        </div>
        <div className="productGrid">
          {products.map((product) => (
            <Link
              href="/shop"
              className="productCard"
              key={product.type}
            >
              <div className="productImage">
                <div className="productGlow" />
                <span>{product.type}</span>
              </div>
              <div className="productContent">
                <h3>{product.title}</h3>
                <p>{product.description}</p>
                <span className="productLink">
                  Xem sản phẩm →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="section featureSection">
        <div className="featureGrid">
          {features.map((feature) => (
            <div className="featureCard" key={feature.title}>
              <div className="featureIcon">{feature.icon}</div>
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="section stepsSection">
        <div className="stepsHeader">
          <span className="sectionEyebrow">HOW IT WORKS</span>
          <h2>Mua KEY chỉ với 3 bước</h2>
        </div>
        <div className="stepsGrid">
          <div className="step">
            <span className="stepNumber">01</span>
            <h3>Tạo tài khoản</h3>
            <p>Đăng ký tài khoản XENOVA PLAY.</p>
          </div>
          <div className="step">
            <span className="stepNumber">02</span>
            <h3>Nạp tiền</h3>
            <p>Nạp tiền vào ví và chờ Admin duyệt.</p>
          </div>
          <div className="step">
            <span className="stepNumber">03</span>
            <h3>Nhận KEY</h3>
            <p>Chọn sản phẩm và nhận KEY ngay.</p>
          </div>
        </div>
      </section>
      <section className="ctaSection">
        <div className="ctaBox">
          <span className="sectionEyebrow">XENOVA PLAY</span>
          <h2>Sẵn sàng bắt đầu?</h2>
          <p>
            Khám phá các sản phẩm đang có trên cửa hàng.
          </p>
          <Link href="/shop" className="primaryButton">
            Khám phá Shop
          </Link>
        </div>
      </section>
      <footer className="footer">
        <div className="footerBrand">
          <strong>XENOVA PLAY</strong>
          <span>Digital Key Store</span>
        </div>
        <div className="footerLinks">
          <Link href="/shop">Shop</Link>
          <Link href="/orders">Đơn hàng</Link>
          <Link href="/keys">KEY của tôi</Link>
          <Link href="/settings">Cài đặt</Link>
        </div>
        <p>© 2026 XENOVA PLAY. All rights reserved.</p>
      </footer>
      <a
        href="https://zalo.me/84365717262"
        target="_blank"
        rel="noopener noreferrer"
        className="zaloButton"
        aria-label="Chat Admin"
      >
        💬
      </a>
      <style jsx>{`
        .home {
          min-height: 100vh;
          background: #f6f9fd;
          color: #0f172a;
          overflow: hidden;
        }
        .hero {
          position: relative;
          min-height: 690px;
          display: flex;
          align-items: center;
          background:
            radial-gradient(
              circle at 75% 35%,
              rgba(37, 99, 235, 0.1),
              transparent 34%
            ),
            linear-gradient(180deg, #ffffff 0%, #f5f8fc 100%);
          border-bottom: 1px solid #e8edf5;
        }
        .heroInner {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          position: relative;
          z-index: 2;
          padding: 100px 0 80px;
        }
        .brand {
          position: absolute;
          top: 32px;
          left: 0;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 2px;
          color: #111827;
        }
        .heroText {
          position: relative;
          z-index: 3;
          max-width: 600px;
        }
        .eyebrow,
        .sectionEyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2.5px;
          color: #2563eb;
        }
        h1 {
          margin: 14px 0 18px;
          font-size: clamp(54px, 8vw, 92px);
          line-height: 0.9;
          letter-spacing: -5px;
          font-weight: 950;
        }
        h1 span {
          color: #2563eb;
        }
        .heroText p {
          color: #64748b;
          line-height: 1.8;
          font-size: 15px;
          margin: 0;
        }
        .heroActions {
          display: flex;
          gap: 10px;
          margin-top: 28px;
        }
        .primaryButton,
        .secondaryButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 18px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
          transition: 0.2s ease;
        }
        .primaryButton {
          color: white;
          background: #2563eb;
          box-shadow: 0 8px 22px rgba(37, 99, 235, 0.2);
        }
        .secondaryButton {
          color: #334155;
          background: white;
          border: 1px solid #dbe3ef;
        }
        .primaryButton:hover,
        .secondaryButton:hover {
          transform: translateY(-2px);
        }
        .heroVisual {
          position: absolute;
          right: 0;
          top: 100px;
          width: 480px;
          height: 480px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .visualCard {
          width: 310px;
          height: 380px;
          border-radius: 28px;
          padding: 28px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          color: white;
          background:
            linear-gradient(
              145deg,
              rgba(37, 99, 235, 0.96),
              rgba(15, 23, 42, 0.98)
            );
          box-shadow: 0 30px 80px rgba(15, 23, 42, 0.2);
          transform: rotate(5deg);
        }
        .visualSmall {
          font-size: 11px;
          letter-spacing: 2px;
          font-weight: 800;
        }
        .visualMain {
          font-size: 42px;
          line-height: 0.9;
          letter-spacing: -2px;
          font-weight: 950;
        }
        .visualBottom {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          letter-spacing: 1.5px;
          font-weight: 800;
          opacity: 0.8;
        }
        .heroGlow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        .heroGlowOne {
          width: 280px;
          height: 280px;
          background: rgba(37, 99, 235, 0.13);
          right: 18%;
          top: 20%;
        }
        .heroGlowTwo {
          width: 180px;
          height: 180px;
          background: rgba(14, 165, 233, 0.08);
          left: 10%;
          bottom: 10%;
        }
        .section {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 85px 0;
        }
        .sectionHeading {
          display: flex;
          justify-content: space-between;
          align-items: end;
          margin-bottom: 28px;
        }
        h2 {
          margin: 7px 0 0;
          font-size: 34px;
          letter-spacing: -1.5px;
        }
        .viewAll {
          color: #2563eb;
          font-size: 13px;
          font-weight: 800;
          text-decoration: none;
        }
        .productGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        .productCard {
          overflow: hidden;
          background: white;
          border: 1px solid #e5eaf2;
          border-radius: 20px;
          text-decoration: none;
          color: inherit;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
          transition: 0.2s ease;
        }
        .productCard:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.09);
        }
        .productImage {
          height: 190px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: linear-gradient(135deg, #eaf2ff, #f8fbff);
        }
        .productImage span {
          position: relative;
          z-index: 2;
          font-size: 30px;
          font-weight: 950;
          letter-spacing: -1px;
          color: #2563eb;
        }
        .productGlow {
          position: absolute;
          width: 150px;
          height: 150px;
          border-radius: 50%;
          background: rgba(37, 99, 235, 0.14);
          filter: blur(35px);
        }
        .productContent {
          padding: 20px;
        }
        .productContent h3 {
          margin: 0 0 7px;
          font-size: 17px;
        }
        .productContent p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }
        .productLink {
          display: inline-block;
          margin-top: 18px;
          color: #2563eb;
          font-size: 12px;
          font-weight: 800;
        }
        .featureSection {
          padding-top: 20px;
          padding-bottom: 85px;
        }
        .featureGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
        }
        .featureCard {
          display: flex;
          gap: 13px;
          padding: 20px;
          background: white;
          border: 1px solid #e5eaf2;
          border-radius: 16px;
        }
        .featureIcon {
          font-size: 22px;
        }
        .featureCard h3 {
          margin: 0 0 5px;
          font-size: 14px;
        }
        .featureCard p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
        }
        .stepsSection {
          border-top: 1px solid #e8edf5;
        }
        .stepsHeader {
          text-align: center;
          margin-bottom: 45px;
        }
        .stepsGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 35px;
        }
        .step {
          position: relative;
          padding: 25px;
          background: white;
          border: 1px solid #e5eaf2;
          border-radius: 18px;
        }
        .stepNumber {
          display: block;
          margin-bottom: 25px;
          color: #2563eb;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 2px;
        }
        .step h3 {
          margin: 0 0 8px;
          font-size: 18px;
        }
        .step p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }
        .ctaSection {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 20px 0 80px;
        }
        .ctaBox {
          text-align: center;
          padding: 70px 25px;
          border-radius: 26px;
          color: white;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(96, 165, 250, 0.35),
              transparent 45%
            ),
            #0f172a;
        }
        .ctaBox .sectionEyebrow {
          color: #60a5fa;
        }
        .ctaBox h2 {
          margin-top: 10px;
          font-size: 40px;
        }
        .ctaBox p {
          color: #94a3b8;
          margin-bottom: 25px;
        }
        .footer {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 35px 0 100px;
          border-top: 1px solid #e5eaf2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
          color: #64748b;
        }
        .footerBrand {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .footerBrand strong {
          color: #0f172a;
          font-size: 13px;
        }
        .footerBrand span,
        .footer p,
        .footerLinks a {
          font-size: 11px;
        }
        .footerLinks {
          display: flex;
          gap: 18px;
        }
        .footerLinks a {
          color: #64748b;
          text-decoration: none;
        }
        .zaloButton {
          position: fixed;
          right: 18px;
          bottom: 18px;
          width: 54px;
          height: 54px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          text-decoration: none;
          background: #1687ff;
          box-shadow: 0 10px 30px rgba(37, 99, 235, 0.3);
          z-index: 999;
          font-size: 23px;
        }
        @media (max-width: 850px) {
          .hero {
            min-height: auto;
          }
          .heroInner {
            padding-top: 105px;
          }
          .heroVisual {
            position: relative;
            top: auto;
            right: auto;
            width: 100%;
            height: 350px;
            margin: 30px auto 0;
          }
          .visualCard {
            width: 260px;
            height: 315px;
          }
          .productGrid {
            grid-template-columns: 1fr;
          }
          .featureGrid {
            grid-template-columns: repeat(2, 1fr);
          }
          .stepsGrid {
            grid-template-columns: 1fr;
          }
          .footer {
            flex-direction: column;
            align-items: flex-start;
          }
        }
        @media (max-width: 520px) {
          .heroInner,
          .section,
          .ctaSection,
          .footer {
            width: min(100% - 28px, 1180px);
          }
          .brand {
            top: 24px;
          }
          h1 {
            font-size: 55px;
            letter-spacing: -3px;
          }
          h2 {
            font-size: 28px;
          }
          .sectionHeading {
            align-items: start;
            flex-direction: column;
            gap: 10px;
          }
          .featureGrid {
            grid-template-columns: 1fr;
          }
          .heroVisual {
            height: 300px;
          }
          .visualCard {
            width: 235px;
            height: 285px;
          }
          .visualMain {
            font-size: 34px;
          }
          .footerLinks {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </main>
  );
}
