"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SiteAccountPage() {
  const params = useParams();
  const router = useRouter();

  const slug = params?.slug;

  const [website, setWebsite] = useState(null);
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    loadData();
  }, [slug]);

  async function loadData() {
    setLoading(true);

    try {
      const [
        websiteResult,
        userResult,
        walletResult,
      ] = await Promise.all([
        fetch(`/api/sites/${slug}`, {
          cache: "no-store",
        }),

        fetch(
          `/api/sites/${slug}/auth/me`,
          {
            cache: "no-store",
          }
        ),

        fetch(
          `/api/sites/${slug}/wallet`,
          {
            cache: "no-store",
          }
        ),
      ]);

      if (websiteResult.ok) {
        const data =
          await websiteResult.json();

        setWebsite(
          data?.website || data || null
        );
      }

      if (userResult.ok) {
        const data =
          await userResult.json();

        if (
          data?.success &&
          data?.user
        ) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }

      if (walletResult.ok) {
        const data =
          await walletResult.json();

        if (data?.success) {
          setWallet(
            data?.wallet || null
          );
        }
      }
    } catch (error) {
      console.error(
        "SITE ACCOUNT LOAD ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  function go(path = "") {
    router.push(
      `/sites/${slug}${path}`
    );
  }

  async function logout() {
    try {
      await fetch(
        `/api/sites/${slug}/auth/logout`,
        {
          method: "POST",
        }
      );
    } catch (error) {
      console.error(
        "SITE ACCOUNT LOGOUT ERROR:",
        error
      );
    }

    setUser(null);
    setWallet(null);

    router.push(
      `/sites/${slug}/login`
    );

    router.refresh();
  }

  function formatPrice(value) {
    return (
      Number(value || 0).toLocaleString(
        "vi-VN"
      ) + "đ"
    );
  }

  if (loading) {
    return (
      <main className="page">
        <div className="loading">
          <div className="spinner" />
          <div>
            Đang tải tài khoản...
          </div>
        </div>

        <style jsx>{`
          .page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background:
              radial-gradient(
                circle at top,
                #fff0f7,
                transparent 40%
              ),
              #fff;
            color: #333;
          }

          .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            color: #777;
            font-size: 14px;
          }

          .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid #ffd5e7;
            border-top-color: #ff3d91;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page">
        <section className="loginCard">
          <div className="icon">
            👤
          </div>

          <h1>
            Chưa đăng nhập
          </h1>

          <p>
            Vui lòng đăng nhập để
            xem thông tin tài khoản
            trên website này.
          </p>

          <div className="buttons">
            <button
              className="primary"
              onClick={() =>
                go("/login")
              }
            >
              ĐĂNG NHẬP
            </button>

            <button
              className="secondary"
              onClick={() => go("")}
            >
              VỀ CỬA HÀNG
            </button>
          </div>
        </section>

        <style jsx>{`
          .page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background:
              radial-gradient(
                circle at top,
                #fff0f7,
                transparent 42%
              ),
              #fff;
            color: #222;
          }

          .loginCard {
            width: 100%;
            max-width: 450px;
            padding: 35px 25px;
            text-align: center;
            border: 1px solid #f1dbe5;
            border-radius: 22px;
            background: #fff;
            box-shadow:
              0 15px 50px
                rgba(
                  255,
                  61,
                  145,
                  0.08
                );
          }

          .icon {
            font-size: 48px;
            margin-bottom: 10px;
          }

          h1 {
            margin: 0 0 8px;
            font-size: 27px;
          }

          p {
            margin: 0 auto 22px;
            max-width: 340px;
            color: #777;
            line-height: 1.6;
          }

          .buttons {
            display: flex;
            flex-direction: column;
            gap: 9px;
          }

          button {
            width: 100%;
            height: 46px;
            border-radius: 11px;
            cursor: pointer;
            font-weight: 800;
          }

          .primary {
            border: 0;
            background: #ff3d91;
            color: #fff;
          }

          .secondary {
            border: 1px solid #ffd0e4;
            background: #fff;
            color: #e62e82;
          }
        `}</style>
      </main>
    );
  }

  const shopName =
    website?.name || "Shop";

  const balance =
    wallet?.balance || 0;

  return (
    <main className="page">
      <header className="header">
        <button
          className="brand"
          onClick={() => go("")}
        >
          {website?.logo_url ? (
            <img
              src={website.logo_url}
              alt={shopName}
            />
          ) : (
            <span className="logoFallback">
              {shopName
                .charAt(0)
                .toUpperCase()}
            </span>
          )}

          <span className="brandName">
            {shopName}
          </span>
        </button>

        <nav className="nav">
          <button
            onClick={() => go("")}
          >
            Trang chủ
          </button>

          <button
            onClick={() => go("")}
          >
            Cửa hàng
          </button>

          <button
            onClick={() =>
              go("/deposit")
            }
          >
            Nạp tiền
          </button>

          <button
            onClick={() =>
              go("/keys")
            }
          >
            KEY của tôi
          </button>

          <button
            onClick={() =>
              go("/orders")
            }
          >
            Đơn hàng
          </button>
        </nav>

        <button
          className="logoutTop"
          onClick={logout}
        >
          Đăng xuất
        </button>
      </header>

      <section className="content">
        <div className="heading">
          <button
            className="back"
            onClick={() => go("")}
          >
            ← Cửa hàng
          </button>

          <h1>
            Tài khoản
          </h1>

          <p>
            Quản lý thông tin tài khoản
            của bạn trên {shopName}.
          </p>
        </div>

        <div className="grid">
          <section className="card profileCard">
            <div className="cardTitle">
              👤 Thông tin tài khoản
            </div>

            <div className="profile">
              <div className="avatar">
                {(user.username ||
                  user.email ||
                  "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <div className="username">
                  {user.username ||
                    "Tài khoản"}
                </div>

                <div className="email">
                  {user.email ||
                    "Không có email"}
                </div>
              </div>
            </div>

            <div className="infoList">
              <div className="info">
                <span>
                  Tên tài khoản
                </span>

                <strong>
                  {user.username ||
                    "—"}
                </strong>
              </div>

              <div className="info">
                <span>
                  Email
                </span>

                <strong>
                  {user.email ||
                    "—"}
                </strong>
              </div>

              <div className="info">
                <span>
                  Vai trò
                </span>

                <strong>
                  {user.role ===
                  "admin"
                    ? "Quản trị viên"
                    : "Thành viên"}
                </strong>
              </div>

              <div className="info">
                <span>
                  Trạng thái
                </span>

                <strong className="active">
                  {user.active
                    ? "Đang hoạt động"
                    : "Đã khóa"}
                </strong>
              </div>
            </div>
          </section>

          <section className="card walletCard">
            <div className="cardTitle">
              💰 Ví của tôi
            </div>

            <div className="balance">
              {formatPrice(balance)}
            </div>

            <div className="balanceText">
              Số dư hiện tại
            </div>

            <button
              className="primaryButton"
              onClick={() =>
                go("/deposit")
              }
            >
              NẠP TIỀN
            </button>
          </section>

          <section className="card">
            <div className="cardTitle">
              ⚡ Truy cập nhanh
            </div>

            <div className="links">
              <button
                onClick={() => go("")}
              >
                <span>🛍️</span>
                <span>
                  Cửa hàng
                </span>
                <b>›</b>
              </button>

              <button
                onClick={() =>
                  go("/deposit")
                }
              >
                <span>💰</span>
                <span>
                  Nạp tiền
                </span>
                <b>›</b>
              </button>

              <button
                onClick={() =>
                  go("/keys")
                }
              >
                <span>🔑</span>
                <span>
                  KEY của tôi
                </span>
                <b>›</b>
              </button>

              <button
                onClick={() =>
                  go("/orders")
                }
              >
                <span>📦</span>
                <span>
                  Đơn hàng
                </span>
                <b>›</b>
              </button>
            </div>
          </section>

          <section className="card dangerCard">
            <div className="cardTitle">
              🚪 Đăng xuất
            </div>

            <p>
              Đăng xuất tài khoản khỏi
              website này.
            </p>

            <button
              className="logoutButton"
              onClick={logout}
            >
              ĐĂNG XUẤT
            </button>
          </section>
        </div>
      </section>

      <div className="bottomNav">
        <button
          onClick={() => go("")}
        >
          <span>🏠</span>
          <small>Trang chủ</small>
        </button>

        <button
          onClick={() =>
            go("/keys")
          }
        >
          <span>🔑</span>
          <small>KEY</small>
        </button>

        <button
          onClick={() =>
            go("/orders")
          }
        >
          <span>📦</span>
          <small>Đơn hàng</small>
        </button>

        <button className="active">
          <span>👤</span>
          <small>Tài khoản</small>
        </button>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top left,
              #fff0f7,
              transparent 38%
            ),
            #fff;
          color: #222;
          padding-bottom: 105px;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 50;

          min-height: 70px;
          padding: 10px 22px;

          display: flex;
          align-items: center;
          gap: 20px;

          background: rgba(
            255,
            255,
            255,
            0.95
          );

          backdrop-filter: blur(15px);

          border-bottom: 1px solid
            #f1dbe5;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;

          border: 0;
          background: transparent;

          cursor: pointer;

          font-weight: 900;
        }

        .brand img,
        .logoFallback {
          width: 42px;
          height: 42px;
          border-radius: 12px;
        }

        .brand img {
          object-fit: contain;
        }

        .logoFallback {
          display: grid;
          place-items: center;
          background: #ff3d91;
          color: #fff;
          font-size: 19px;
        }

        .brandName {
          font-size: 16px;
        }

        .nav {
          flex: 1;
          display: flex;
          gap: 4px;
        }

        .nav button {
          border: 0;
          background: transparent;
          color: #666;
          padding: 10px 12px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 650;
        }

        .nav button:hover {
          background: #fff0f7;
          color: #e62e82;
        }

        .logoutTop {
          border: 0;
          background: #fff0f7;
          color: #e62e82;
          padding: 10px 13px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 800;
        }

        .content {
          max-width: 1000px;
          margin: auto;
          padding: 32px 16px;
        }

        .heading {
          margin-bottom: 22px;
        }

        .back {
          border: 0;
          background: transparent;
          padding: 0;
          color: #e62e82;
          cursor: pointer;
          font-weight: 800;
          margin-bottom: 15px;
        }

        h1 {
          margin: 0 0 5px;
          font-size: 31px;
        }

        .heading p {
          margin: 0;
          color: #777;
        }

        .grid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 16px;
        }

        .card {
          padding: 20px;
          background: #fff;
          border: 1px solid #f0dbe5;
          border-radius: 18px;
          box-shadow:
            0 10px 35px
              rgba(
                255,
                61,
                145,
                0.05
              );
        }

        .profileCard {
          grid-column: span 2;
        }

        .cardTitle {
          font-size: 16px;
          font-weight: 900;
          margin-bottom: 16px;
        }

        .profile {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 14px;
          border-radius: 13px;
          background: #fff8fb;
          border: 1px solid #ffe2ed;
        }

        .avatar {
          width: 52px;
          height: 52px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 15px;
          background: #ff3d91;
          color: #fff;
          font-size: 21px;
          font-weight: 900;
        }

        .username {
          font-size: 17px;
          font-weight: 900;
        }

        .email {
          margin-top: 4px;
          color: #777;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .infoList {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 10px;
          margin-top: 13px;
        }

        .info {
          padding: 12px;
          border-radius: 11px;
          background: #faf8f9;
        }

        .info span {
          display: block;
          color: #888;
          font-size: 11px;
          margin-bottom: 5px;
        }

        .info strong {
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .active {
          color: #159651;
        }

        .balance {
          color: #e62e82;
          font-size: 30px;
          font-weight: 950;
        }

        .balanceText {
          color: #888;
          font-size: 12px;
          margin: 3px 0 17px;
        }

        .primaryButton {
          width: 100%;
          height: 43px;
          border: 0;
          border-radius: 10px;
          background: #ff3d91;
          color: #fff;
          cursor: pointer;
          font-weight: 900;
        }

        .links {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .links button {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 47px;
          padding: 0 11px;
          border: 1px solid #f0e0e7;
          border-radius: 10px;
          background: #fffafa;
          cursor: pointer;
          text-align: left;
          color: #333;
          font-weight: 700;
        }

        .links button span:nth-child(2) {
          flex: 1;
        }

        .links b {
          color: #aaa;
          font-size: 20px;
        }

        .dangerCard p {
          color: #888;
          font-size: 12px;
          margin: -5px 0 15px;
        }

        .logoutButton {
          width: 100%;
          height: 43px;
          border: 1px solid #ffcbd8;
          border-radius: 10px;
          background: #fff4f6;
          color: #d83a57;
          cursor: pointer;
          font-weight: 900;
        }

        .bottomNav {
          position: fixed;
          left: 50%;
          bottom: 13px;
          transform: translateX(-50%);
          z-index: 100;

          display: flex;
          gap: 5px;

          padding: 7px;

          background: rgba(
            255,
            255,
            255,
            0.95
          );

          backdrop-filter: blur(15px);

          border: 1px solid #f0dbe5;
          border-radius: 18px;

          box-shadow:
            0 10px 35px
              rgba(
                0,
                0,
                0,
                0.1
              );
        }

        .bottomNav button {
          min-width: 75px;
          padding: 8px 10px;

          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;

          border: 0;
          border-radius: 12px;

          background: transparent;
          color: #777;

          cursor: pointer;
        }

        .bottomNav button span {
          font-size: 17px;
        }

        .bottomNav small {
          font-size: 10px;
          font-weight: 800;
        }

        .bottomNav button:hover,
        .bottomNav button.active {
          background: #fff0f7;
          color: #ff3d91;
        }

        @media (max-width: 800px) {
          .nav {
            display: none;
          }

          .grid {
            grid-template-columns: 1fr;
          }

          .profileCard {
            grid-column: span 1;
          }
        }

        @media (max-width: 500px) {
          .header {
            padding: 9px 12px;
          }

          .brandName {
            display: none;
          }

          .logoutTop {
            margin-left: auto;
          }

          .content {
            padding: 25px 12px;
          }

          .infoList {
            grid-template-columns: 1fr;
          }

          .bottomNav {
            width: calc(100% - 20px);
          }

          .bottomNav button {
            flex: 1;
            min-width: 0;
          }
        }
      `}</style>
    </main>
  );
}
