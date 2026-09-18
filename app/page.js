"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home">
      {/* HERO */}
      <section className="hero">
        <div className="heroGlow"></div>

        <div className="heroContent">
          <div className="badge">
            XENOVA PLAY
          </div>

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

        <div className="heroVisual">
          <div className="orb orbOne"></div>
          <div className="orb orbTwo"></div>

          <div className="glassCard">
            <div className="cardTop">
              <span>✦</span>
              XENOVA
            </div>

            <div className="cardTitle">
              DIGITAL
              <br />
              STORE
            </div>

            <div className="cardLine"></div>

            <div className="cardBottom">
              <span>KEY</span>
              <span>24/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="section">
        <div className="sectionHead">
          <div>
            <span className="sectionLabel">
              SHOP
            </span>

            <h2>Sản phẩm nổi bật</h2>
          </div>

          <Link href="/shop" className="viewAll">
            Xem tất cả →
          </Link>
        </div>

        <div className="products">
          <ProductCard
            icon="ANDROID"
            title="KEY ANDROID"
            description="KEY dành cho thiết bị Android"
            href="/shop"
          />

          <ProductCard
            icon="IPHONE"
            title="KEY IPHONE"
            description="KEY dành cho thiết bị iPhone"
            href="/shop"
          />

          <ProductCard
            icon="PC"
            title="KEY PC"
            description="KEY dành cho máy tính"
            href="/shop"
          />
        </div>
      </section>

      {/* FEATURES */}
      <section className="features">
        <Feature
          icon="⚡"
          title="Nhanh chóng"
          text="Mua và nhận KEY thuận tiện."
        />

        <Feature
          icon="🔐"
          title="Tài khoản riêng"
          text="Quản lý KEY và đơn hàng của bạn."
        />

        <Feature
          icon="💳"
          title="Thanh toán"
          text="Nạp tiền trực tiếp vào tài khoản."
        />

        <Feature
          icon="💬"
          title="Hỗ trợ"
          text="Liên hệ Admin khi cần hỗ trợ."
        />
      </section>

      {/* HOW IT WORKS */}
      <section className="how">
        <div className="sectionHead center">
          <div>
            <span className="sectionLabel">
              HOW IT WORKS
            </span>

            <h2>Mua KEY chỉ với 3 bước</h2>
          </div>
        </div>

        <div className="steps">
          <Step
            number="01"
            title="Tạo tài khoản"
            text="Đăng ký tài khoản XENOVA PLAY."
          />

          <Step
            number="02"
            title="Nạp tiền"
            text="Nạp tiền vào ví và chờ Admin duyệt."
          />

          <Step
            number="03"
            title="Nhận KEY"
            text="Chọn sản phẩm và nhận KEY ngay."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div>
          <span className="sectionLabel">
            XENOVA PLAY
          </span>

          <h2>Sẵn sàng bắt đầu?</h2>

          <p>
            Khám phá các sản phẩm đang có trên cửa hàng.
          </p>
        </div>

        <Link href="/shop" className="primaryButton">
          Khám phá Shop
        </Link>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footerLogo">
          XENOVA<span> PLAY</span>
        </div>

        <p>
          Digital Key Store
        </p>

        <div className="footerLinks">
          <Link href="/shop">Shop</Link>
          <Link href="/orders">Đơn hàng</Link>
          <Link href="/keys">KEY của tôi</Link>
          <Link href="/settings">Cài đặt</Link>
        </div>

        <div className="copyright">
          © 2026 XENOVA PLAY. All rights reserved.
        </div>
      </footer>

      <style jsx>{`
        .home {
          min-height: 100vh;
          background: #f6f9fd;
          color: #111827;
          overflow: hidden;
        }

        .hero {
          position: relative;
          min-height: 650px;
          display: flex;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
          padding: 100px 28px 70px;
        }

        .heroGlow {
          position: absolute;
          width: 600px;
          height: 600px;
          right: -180px;
          top: -120px;
          border-radius: 50%;
          background: rgba(37, 99, 235, 0.09);
          filter: blur(20px);
          pointer-events: none;
        }

        .heroContent {
          position: relative;
          z-index: 2;
          width: 55%;
        }

        .badge,
        .sectionLabel {
          color: #2563eb;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        h1 {
          margin: 15px 0;
          font-size: clamp(48px, 7vw, 82px);
          line-height: 0.95;
          letter-spacing: -4px;
          font-weight: 950;
        }

        h1 span {
          color: #2563eb;
        }

        .heroContent p {
          color: #64748b;
          font-size: 16px;
          line-height: 1.7;
          margin: 0 0 25px;
        }

        .heroActions {
          display: flex;
          gap: 9px;
        }

        .primaryButton,
        .secondaryButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 38px;
          padding: 0 17px;
          border-radius: 9px;
          text-decoration: none;
          font-size: 12px;
          font-weight: 850;
          transition: 0.2s;
        }

        .primaryButton {
          color: white;
          background: #2563eb;
          box-shadow: 0 8px 22px rgba(37, 99, 235, 0.2);
        }

        .secondaryButton {
          color: #334155;
          background: white;
          border: 1px solid #e2e8f0;
        }

        .primaryButton:hover,
        .secondaryButton:hover {
          transform: translateY(-2px);
        }

        .heroVisual {
          position: absolute;
          right: 30px;
          width: 43%;
          height: 430px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(1px);
        }

        .orbOne {
          width: 300px;
          height: 300px;
          background: linear-gradient(
            135deg,
            rgba(37, 99, 235, 0.16),
            rgba(6, 182, 212, 0.08)
          );
        }

        .orbTwo {
          width: 170px;
          height: 170px;
          background: rgba(6, 182, 212, 0.1);
          transform: translate(100px, 100px);
        }

        .glassCard {
          position: relative;
          z-index: 2;
          width: 260px;
          height: 330px;
          padding: 25px;
          border-radius: 25px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.9);
          box-shadow:
            0 30px 80px rgba(15, 23, 42, 0.12),
            inset 0 1px 0 white;
          backdrop-filter: blur(20px);
          transform: rotate(5deg);
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          color: #2563eb;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .cardTitle {
          margin-top: 105px;
          font-size: 31px;
          line-height: 0.95;
          font-weight: 950;
          letter-spacing: -1px;
        }

        .cardLine {
          height: 1px;
          margin: 25px 0;
          background: #dbe5f0;
        }

        .cardBottom {
          display: flex;
          justify-content: space-between;
          color: #64748b;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 60px 28px;
        }

        .sectionHead {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 22px;
        }

        h2 {
          margin: 7px 0 0;
          font-size: 28px;
          letter-spacing: -1px;
        }

        .viewAll {
          color: #2563eb;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
        }

        .products {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .product {
          position: relative;
          min-height: 220px;
          padding: 20px;
          border-radius: 18px;
          background: white;
          border: 1px solid #e7edf5;
          box-shadow: 0 12px 35px rgba(15, 23, 42, 0.045);
          overflow: hidden;
        }

        .productImage {
          height: 105px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: -20px -20px 18px;
          background: linear-gradient(
            135deg,
            #eff6ff,
            #ecfeff
          );
          color: #2563eb;
          font-size: 20px;
          font-weight: 950;
          letter-spacing: 1px;
        }

        .product h3 {
          margin: 0 0 5px;
          font-size: 15px;
        }

        .product p {
          margin: 0 0 14px;
          color: #64748b;
          font-size: 11px;
        }

        .smallButton {
          display: inline-flex;
          padding: 7px 11px;
          border-radius: 7px;
          color: #2563eb;
          background: #eff6ff;
          text-decoration: none;
          font-size: 11px;
          font-weight: 850;
        }

        .features {
          max-width: 1145px;
          margin: 15px auto 70px;
          padding: 0 28px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .feature {
          padding: 18px;
          background: white;
          border: 1px solid #e7edf5;
          border-radius: 14px;
        }

        .featureIcon {
          font-size: 20px;
        }

        .feature h3 {
          margin: 10px 0 4px;
          font-size: 13px;
        }

        .feature p {
          margin: 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.5;
        }

        .how {
          background: white;
          border-top: 1px solid #edf1f6;
          border-bottom: 1px solid #edf1f6;
          padding: 65px 28px;
        }

        .center {
          justify-content: center;
          text-align: center;
        }

        .steps {
          max-width: 900px;
          margin: 35px auto 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 35px;
        }

        .stepNumber {
          color: #2563eb;
          font-size: 12px;
          font-weight: 900;
        }

        .step h3 {
          margin: 8px 0 5px;
          font-size: 15px;
        }

        .step p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.6;
        }

        .cta {
          max-width: 1145px;
          margin: 65px auto;
          padding: 30px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          background: linear-gradient(
            120deg,
            #eff6ff,
            #ecfeff
          );
          border: 1px solid #dbeafe;
        }

        .cta h2 {
          font-size: 24px;
        }

        .cta p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        footer {
          padding: 35px 25px;
          text-align: center;
          background: #fff;
          border-top: 1px solid #edf1f6;
        }

        .footerLogo {
          font-size: 16px;
          font-weight: 950;
        }

        .footerLogo span {
          color: #2563eb;
        }

        footer p {
          color: #94a3b8;
          font-size: 11px;
        }

        .footerLinks {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin: 18px 0;
        }

        .footerLinks a {
          color: #64748b;
          text-decoration: none;
          font-size: 11px;
          font-weight: 700;
        }

        .copyright {
          color: #a1aab8;
          font-size: 10px;
        }

        @media (max-width: 750px) {
          .hero {
            min-height: auto;
            padding: 100px 18px 50px;
          }

          .heroContent {
            width: 100%;
          }

          .heroVisual {
            display: none;
          }

          h1 {
            font-size: 55px;
          }

          .products {
            grid-template-columns: 1fr;
          }

          .features {
            grid-template-columns: repeat(2, 1fr);
            padding: 0 18px;
          }

          .steps {
            grid-template-columns: 1fr;
            gap: 22px;
          }

          .cta {
            margin: 40px 18px;
            flex-direction: column;
            align-items: flex-start;
          }

          .section {
            padding-left: 18px;
            padding-right: 18px;
          }
        }

        @media (max-width: 420px) {
          h1 {
            font-size: 46px;
          }

          .features {
            grid-template-columns: 1fr 1fr;
          }

          .footerLinks {
            gap: 12px;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </main>
  );
}

function ProductCard({
  icon,
  title,
  description,
  href,
}) {
  return (
    <div className="product">
      <div className="productImage">
        {icon}
      </div>

      <h3>{title}</h3>

      <p>{description}</p>

      <Link href={href} className="smallButton">
        Xem sản phẩm →
      </Link>
    </div>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="feature">
      <div className="featureIcon">{icon}</div>

      <h3>{title}</h3>

      <p>{text}</p>
    </div>
  );
}

function Step({ number, title, text }) {
  return (
    <div className="step">
      <div className="stepNumber">
        {number}
      </div>

      <h3>{title}</h3>

      <p>{text}</p>
    </div>
  );
}
