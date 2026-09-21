"use client";

import { useEffect, useState } from "react";

export default function WebsiteShopPage({ website }) {
  const [bannerIndex, setBannerIndex] = useState(0);

  const banners =
    Array.isArray(website?.settings?.banners)
      ? website.settings.banners.filter(
          (b) => b?.image_url && b.enabled !== false
        )
      : website?.banner_url
        ? [{ image_url: website.banner_url }]
        : [];

  useEffect(() => {
    if (banners.length <= 1) return;

    const timer = setInterval(() => {
      setBannerIndex((i) => (i + 1) % banners.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [banners.length]);

  const theme =
    website?.theme === "blue"
      ? "#2563eb"
      : website?.theme === "purple"
        ? "#7c3aed"
        : website?.theme === "green"
          ? "#16a34a"
          : website?.theme === "dark"
            ? "#111827"
            : "#e83d94";

  return (
    <main className="page" style={{ "--site-color": theme }}>
      {/* HIỆU ỨNG CÁNH HOA */}
      <div className="petals">
        {Array.from({ length: 25 }).map((_, i) => (
          <span
            className="petal"
            key={i}
            style={{
              left: `${(i * 37) % 100}%`,
              animationDuration: `${7 + (i % 7)}s`,
              animationDelay: `-${i % 9}s`,
            }}
          />
        ))}
      </div>

      {/* HEADER */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            {website?.logo_url ? (
              <img src={website.logo_url} alt={website.name} />
            ) : (
              <span className="logo-fallback">X</span>
            )}

            <strong>{website?.name || "SHOP"}</strong>
          </div>

          <nav>
            <a
              className="active"
              href={`/sites/${website.slug}`}
            >
              Cửa hàng
            </a>

            <a href="/login">
              Đăng nhập
            </a>
          </nav>
        </div>
      </header>

      {/* BANNER */}
      {banners.length > 0 && (
        <section className="banner-section">
          <div className="banner">
            <img
              src={banners[bannerIndex]?.image_url}
              alt={website?.name || "Banner"}
            />

            {banners.length > 1 && (
              <>
                <button
                  className="arrow left"
                  onClick={() =>
                    setBannerIndex(
                      (i) =>
                        (i - 1 + banners.length) %
                        banners.length
                    )
                  }
                >
                  ‹
                </button>

                <button
                  className="arrow right"
                  onClick={() =>
                    setBannerIndex(
                      (i) => (i + 1) % banners.length
                    )
                  }
                >
                  ›
                </button>

                <div className="dots">
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      className={
                        i === bannerIndex
                          ? "dot active"
                          : "dot"
                      }
                      onClick={() => setBannerIndex(i)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* NỘI DUNG */}
      <div className="container">
        <div className="heading">
          <div>
            <span className="eyebrow">
              WELCOME
            </span>

            <h1>
              {website?.name || "SHOP"}
            </h1>

            {website?.description && (
              <p>{website.description}</p>
            )}
          </div>

          <span className="count">
            CỬA HÀNG
          </span>
        </div>

        {/* SẢN PHẨM */}
        <section className="empty">
          <div className="empty-icon">
            🛒
          </div>

          <h2>Sản phẩm</h2>

          <p>
            Website riêng đã sẵn sàng.
          </p>

          <small>
            Sản phẩm, danh mục và giá riêng sẽ được
            kết nối ở bước tiếp theo.
          </small>
        </section>

        {/* THANH TOÁN */}
        {(website?.bank_name ||
          website?.bank_account_number ||
          website?.bank_account_name ||
          website?.payment_qr_url) && (
          <section className="payment">
            <h2>
              Thông tin thanh toán
            </h2>

            {website.bank_name && (
              <p>
                <b>Ngân hàng:</b>{" "}
                {website.bank_name}
              </p>
            )}

            {website.bank_account_number && (
              <p>
                <b>Số tài khoản:</b>{" "}
                {website.bank_account_number}
              </p>
            )}

            {website.bank_account_name && (
              <p>
                <b>Chủ tài khoản:</b>{" "}
                {website.bank_account_name}
              </p>
            )}

            {website.payment_qr_url && (
              <img
                src={website.payment_qr_url}
                alt="QR thanh toán"
              />
            )}
          </section>
        )}
      </div>

      {/* ZALO */}
      <a
        className="zalo"
        href="https://zalo.me/84365717262"
        target="_blank"
        rel="noreferrer"
      >
        💬 <span>Hỗ trợ Zalo</span>
      </a>

      {/* THANH MENU DƯỚI */}
      <div className="bottom">
        <a
          href={`/sites/${website.slug}`}
          className="active"
        >
          ⌂
          <small>Trang chủ</small>
        </a>

        <a href={`/sites/${website.slug}`}>
          🛒
          <small>Cửa hàng</small>
        </a>

        <a href="/login">
          👤
          <small>Tài khoản</small>
        </a>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 10% 5%,
              color-mix(
                in srgb,
                var(--site-color) 12%,
                transparent
              ),
              transparent 28%
            ),
            #f7f8fc;
          color: #222;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
          padding-bottom: 88px;
        }

        .petals {
          position: fixed;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 80;
        }

        .petal {
          position: absolute;
          top: -30px;
          width: 8px;
          height: 13px;
          border-radius: 75% 25% 70% 30%;
          background: linear-gradient(
            135deg,
            #ff5a91,
            #d71955
          );
          opacity: 0.4;
          animation: fall linear infinite;
        }

        @keyframes fall {
          0% {
            transform:
              translateY(-50px)
              rotate(0);
            opacity: 0;
          }

          10% {
            opacity: 0.5;
          }

          50% {
            transform:
              translateY(55vh)
              translateX(-35px)
              rotate(220deg);
          }

          100% {
            transform:
              translateY(110vh)
              translateX(30px)
              rotate(400deg);
            opacity: 0;
          }
        }

        .topbar {
          height: 64px;
          background: rgba(
            255,
            255,
            255,
            0.96
          );
          border-bottom: 1px solid #eee;
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(15px);
        }

        .topbar-inner {
          max-width: 1220px;
          height: 100%;
          margin: auto;
          padding: 0 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
        }

        .brand img,
        .logo-fallback {
          width: 42px;
          height: 42px;
          object-fit: contain;
          border-radius: 10px;
        }

        .logo-fallback {
          display: grid;
          place-items: center;
          background:
            linear-gradient(
              135deg,
              var(--site-color),
              #8d54ff
            );
          color: white;
          font-weight: 900;
        }

        nav {
          display: flex;
          gap: 5px;
        }

        nav a {
          padding: 10px 13px;
          border-radius: 9px;
          color: #666;
          text-decoration: none;
          font-weight: 700;
          font-size: 13px;
        }

        nav a.active,
        nav a:hover {
          color: var(--site-color);
          background: #fff0f7;
        }

        .banner-section {
          padding: 12px 18px 4px;
        }

        .banner {
          max-width: 1220px;
          margin: auto;
          position: relative;
          overflow: hidden;
          border-radius: 20px;
          aspect-ratio: 1200 / 380;
          background: #eee;
          box-shadow:
            0 18px 50px
            rgba(30, 20, 50, 0.14);
        }

        .banner img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          animation: fade 0.4s ease;
        }

        @keyframes fade {
          from {
            opacity: 0.4;
            transform: scale(1.02);
          }

          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 42px;
          height: 42px;
          border: 0;
          border-radius: 50%;
          background: rgba(
            255,
            255,
            255,
            0.88
          );
          color: var(--site-color);
          font-size: 29px;
          cursor: pointer;
        }

        .arrow.left {
          left: 14px;
        }

        .arrow.right {
          right: 14px;
        }

        .dots {
          position: absolute;
          left: 50%;
          bottom: 12px;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
          padding: 6px 9px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.28);
        }

        .dot {
          width: 7px;
          height: 7px;
          border: 0;
          border-radius: 50%;
          background: rgba(
            255,
            255,
            255,
            0.55
          );
          padding: 0;
        }

        .dot.active {
          width: 21px;
          border-radius: 999px;
          background: #fff;
        }

        .container {
          max-width: 1220px;
          margin: auto;
          padding: 20px 18px 30px;
        }

        .heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 15px;
          margin-bottom: 18px;
        }

        .eyebrow {
          color: var(--site-color);
          font-size: 10px;
          font-weight: 900;
        }

        h1 {
          margin: 6px 0 0;
          font-size: 24px;
        }

        .heading p {
          margin: 5px 0 0;
          color: #999;
          font-size: 12px;
        }

        .count {
          background: white;
          border: 1px solid #eee;
          border-radius: 999px;
          padding: 8px 12px;
          color: var(--site-color);
          font-size: 11px;
          font-weight: 900;
        }

        .empty,
        .payment {
          border: 1px solid #eee;
          border-radius: 16px;
          background: white;
          padding: 35px 20px;
          text-align: center;
          box-shadow:
            0 10px 30px
            rgba(40, 20, 60, 0.05);
        }

        .empty-icon {
          font-size: 45px;
        }

        .empty h2 {
          margin: 10px 0 5px;
        }

        .empty p,
        .empty small {
          color: #888;
          font-size: 12px;
        }

        .payment {
          margin-top: 18px;
          text-align: left;
        }

        .payment h2 {
          margin-top: 0;
          font-size: 18px;
        }

        .payment p {
          color: #555;
          font-size: 13px;
        }

        .payment img {
          display: block;
          width: 220px;
          max-width: 100%;
          margin-top: 14px;
          border-radius: 12px;
          border: 1px solid #eee;
        }

        .zalo {
          position: fixed;
          right: 18px;
          bottom: 84px;
          z-index: 90;
          padding: 11px 15px;
          border-radius: 999px;
          background: var(--site-color);
          color: #fff;
          text-decoration: none;
          font-size: 12px;
          font-weight: 900;
          box-shadow:
            0 8px 25px
            rgba(232, 61, 148, 0.3);
        }

        .bottom {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 110;
          height: 64px;
          background: rgba(
            255,
            255,
            255,
            0.97
          );
          border-top: 1px solid #eee;
          display: flex;
          justify-content: center;
          gap: 45px;
          backdrop-filter: blur(15px);
        }

        .bottom a {
          min-width: 70px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          color: #777;
          text-decoration: none;
          font-size: 18px;
        }

        .bottom a small {
          font-size: 9px;
          font-weight: 700;
        }

        .bottom a.active {
          color: var(--site-color);
        }

        @media (max-width: 760px) {
          .topbar {
            height: 58px;
          }

          .topbar-inner {
            padding: 0 11px;
          }

          .brand {
            font-size: 15px;
          }

          .brand img,
          .logo-fallback {
            width: 36px;
            height: 36px;
          }

          nav a {
            padding: 8px;
            font-size: 11px;
          }

          .banner-section {
            padding: 8px 10px 2px;
          }

          .banner {
            border-radius: 13px;
            aspect-ratio: 1200 / 430;
          }

          .container {
            padding: 12px 12px 25px;
          }

          .heading {
            align-items: flex-start;
          }

          .count {
            display: none;
          }

          .zalo {
            right: 12px;
            bottom: 76px;
          }

          .bottom {
            gap: 15px;
          }

          .bottom a {
            min-width: 60px;
          }
        }
      `}</style>
    </main>
  );
}
