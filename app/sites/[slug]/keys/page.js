"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SiteKeysPage() {
  const params = useParams();
  const router = useRouter();

  const slug = params?.slug;

  const [website, setWebsite] = useState(null);
  const [user, setUser] = useState(null);
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    loadData();
  }, [slug]);

  async function loadData() {
    setLoading(true);

    try {
      const [websiteRes, userRes, keysRes] = await Promise.all([
        fetch(`/api/sites/${slug}`, {
          cache: "no-store",
        }),

        fetch(`/api/sites/${slug}/auth/me`, {
          cache: "no-store",
        }),

        fetch(`/api/sites/${slug}/keys`, {
          cache: "no-store",
        }),
      ]);

      if (websiteRes.ok) {
        const websiteData = await websiteRes.json();
        setWebsite(websiteData.website || websiteData);
      }

      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData.user || null);
      }

      if (keysRes.ok) {
        const keysData = await keysRes.json();
        setKeys(keysData.keys || []);
      }
    } catch (error) {
      console.error("LOAD SITE KEYS ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  function go(path) {
    router.push(`/sites/${slug}${path}`);
  }

  async function logout() {
    try {
      await fetch(`/api/sites/${slug}/auth/logout`, {
        method: "POST",
      });
    } catch {}

    router.push(`/sites/${slug}/login`);
  }

  const shopName =
    website?.name ||
    "Shop";

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
              className="logo"
            />
          ) : (
            <div className="logoFallback">
              {shopName.charAt(0).toUpperCase()}
            </div>
          )}

          <span>{shopName}</span>
        </button>

        <nav className="nav">
          <button onClick={() => go("")}>
            Trang chủ
          </button>

          <button onClick={() => go("/shop")}>
            Cửa hàng
          </button>

          <button className="active">
            Kho KEY
          </button>

          <button onClick={() => go("/orders")}>
            Đơn hàng
          </button>

          <button onClick={() => go("/deposit")}>
            Nạp tiền
          </button>
        </nav>

        <div className="account">
          {user ? (
            <>
              <button
                className="accountButton"
                onClick={() => go("/account")}
              >
                👤 {user.username || user.email}
              </button>

              <button
                className="logout"
                onClick={logout}
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <button
              className="login"
              onClick={() => go("/login")}
            >
              Đăng nhập
            </button>
          )}
        </div>
      </header>

      <section className="content">
        <div className="title">
          <div>
            <h1>Kho KEY</h1>
            <p>
              Các key bạn đã mua tại {shopName}
            </p>
          </div>

          <button
            className="back"
            onClick={() => go("/shop")}
          >
            ← Cửa hàng
          </button>
        </div>

        {!user && !loading ? (
          <div className="empty">
            <div className="emptyIcon">
              🔐
            </div>

            <h2>Bạn chưa đăng nhập</h2>

            <p>
              Đăng nhập để xem kho key của bạn.
            </p>

            <button
              className="primary"
              onClick={() => go("/login")}
            >
              Đăng nhập
            </button>
          </div>
        ) : loading ? (
          <div className="empty">
            <div className="loader" />
            <p>Đang tải kho key...</p>
          </div>
        ) : keys.length === 0 ? (
          <div className="empty">
            <div className="emptyIcon">
              🔑
            </div>

            <h2>Chưa có KEY</h2>

            <p>
              Bạn chưa có key nào trong kho.
            </p>

            <button
              className="primary"
              onClick={() => go("/shop")}
            >
              Mua KEY
            </button>
          </div>
        ) : (
          <div className="keys">
            {keys.map((item) => (
              <div
                className="keyCard"
                key={item.id}
              >
                <div className="keyTop">
                  <div>
                    <div className="productName">
                      {item.product_name ||
                        item.product?.name ||
                        "KEY"}
                    </div>

                    <div className="date">
                      Mua ngày:{" "}
                      {item.created_at
                        ? new Date(
                            item.created_at
                          ).toLocaleString("vi-VN")
                        : "—"}
                    </div>
                  </div>

                  <span
                    className={
                      item.status === "active" ||
                      item.status === "sold"
                        ? "status activeStatus"
                        : "status"
                    }
                  >
                    {item.status || "available"}
                  </span>
                </div>

                <div className="keyBox">
                  <span>
                    {item.key_code || "—"}
                  </span>

                  <button
                    onClick={() => {
                      if (!item.key_code) return;

                      navigator.clipboard
                        ?.writeText(item.key_code)
                        .catch(() => {});
                    }}
                  >
                    Sao chép
                  </button>
                </div>

                <div className="keyInfo">
                  <div>
                    <span>Hạn sử dụng</span>
                    <strong>
                      {item.expires_at
                        ? new Date(
                            item.expires_at
                          ).toLocaleString("vi-VN")
                        : "Không giới hạn"}
                    </strong>
                  </div>

                  <div>
                    <span>Ngày bán</span>
                    <strong>
                      {item.sold_at
                        ? new Date(
                            item.sold_at
                          ).toLocaleString("vi-VN")
                        : "—"}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="bottomNav">
        <button onClick={() => go("")}>
          🏠
          <span>Trang chủ</span>
        </button>

        <button
          className="bottomActive"
          onClick={() => go("/keys")}
        >
          🔑
          <span>Kho KEY</span>
        </button>

        <button onClick={() => go("/orders")}>
          📦
          <span>Đơn hàng</span>
        </button>

        <button onClick={() => go("/account")}>
          👤
          <span>Tài khoản</span>
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
              #fff0f7 0,
              transparent 35%
            ),
            #fff;
          color: #242424;
          padding-bottom: 100px;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 50;

          display: flex;
          align-items: center;
          gap: 20px;

          min-height: 70px;
          padding: 10px 22px;

          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(15px);

          border-bottom: 1px solid #f1dbe5;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;

          border: 0;
          background: transparent;

          font-size: 17px;
          font-weight: 800;

          cursor: pointer;

          white-space: nowrap;
        }

        .logo {
          width: 42px;
          height: 42px;
          object-fit: contain;
          border-radius: 12px;
        }

        .logoFallback {
          width: 42px;
          height: 42px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 12px;

          background: linear-gradient(
            135deg,
            #ff4f9a,
            #ff77b5
          );

          color: white;
          font-size: 20px;
          font-weight: 900;
        }

        .nav {
          display: flex;
          align-items: center;
          gap: 5px;
          flex: 1;
        }

        .nav button {
          border: 0;
          background: transparent;

          padding: 10px 13px;

          border-radius: 10px;

          cursor: pointer;

          color: #555;
          font-weight: 600;
        }

        .nav button:hover,
        .nav button.active {
          color: #ff3d91;
          background: #fff0f7;
        }

        .account {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .account button {
          border: 0;
          cursor: pointer;
          border-radius: 10px;
          padding: 9px 12px;
          font-weight: 600;
        }

        .accountButton {
          background: #fff0f7;
          color: #e62e82;
        }

        .logout {
          background: #f4f4f4;
          color: #555;
        }

        .login {
          background: #ff3d91;
          color: white;
        }

        .content {
          max-width: 1150px;
          margin: auto;
          padding: 35px 18px;
        }

        .title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 25px;
        }

        h1 {
          margin: 0 0 5px;
          font-size: 30px;
        }

        .title p {
          margin: 0;
          color: #777;
        }

        .back {
          border: 1px solid #ffd0e4;
          background: white;
          color: #e52e81;
          padding: 10px 15px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 700;
        }

        .empty {
          min-height: 330px;

          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;

          text-align: center;

          border: 1px solid #f2dce6;
          border-radius: 20px;

          background: white;
          box-shadow: 0 10px 35px rgba(255, 61, 145, 0.06);
        }

        .emptyIcon {
          font-size: 45px;
          margin-bottom: 10px;
        }

        .empty h2 {
          margin: 5px 0;
        }

        .empty p {
          color: #777;
          margin: 5px 0 18px;
        }

        .primary {
          border: 0;
          border-radius: 11px;

          background: #ff3d91;
          color: white;

          padding: 12px 20px;

          font-weight: 800;
          cursor: pointer;
        }

        .keys {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .keyCard {
          background: white;
          border: 1px solid #f0dbe5;
          border-radius: 18px;
          padding: 18px;

          box-shadow:
            0 10px 30px
              rgba(255, 61, 145, 0.06);
        }

        .keyTop {
          display: flex;
          justify-content: space-between;
          gap: 15px;
        }

        .productName {
          font-size: 17px;
          font-weight: 800;
        }

        .date {
          margin-top: 5px;
          color: #888;
          font-size: 13px;
        }

        .status {
          height: fit-content;
          padding: 6px 9px;
          border-radius: 999px;
          background: #f2f2f2;
          color: #777;
          font-size: 12px;
          font-weight: 700;
        }

        .activeStatus {
          background: #e9fff2;
          color: #14964f;
        }

        .keyBox {
          display: flex;
          align-items: center;
          gap: 10px;

          margin-top: 18px;
          padding: 12px;

          border-radius: 12px;

          background: #faf7f9;
          border: 1px dashed #e7cbd8;
        }

        .keyBox span {
          flex: 1;
          min-width: 0;

          overflow-wrap: anywhere;

          font-family: monospace;
          font-weight: 700;
        }

        .keyBox button {
          border: 0;
          background: #ff3d91;
          color: white;

          border-radius: 8px;

          padding: 8px 10px;

          cursor: pointer;
          font-weight: 700;
        }

        .keyInfo {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;

          margin-top: 15px;
        }

        .keyInfo div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .keyInfo span {
          font-size: 12px;
          color: #888;
        }

        .keyInfo strong {
          font-size: 13px;
        }

        .loader {
          width: 30px;
          height: 30px;

          border: 3px solid #ffd5e7;
          border-top-color: #ff3d91;

          border-radius: 50%;

          animation: spin 0.8s linear infinite;

          margin-bottom: 12px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .bottomNav {
          position: fixed;
          left: 50%;
          bottom: 14px;
          transform: translateX(-50%);

          z-index: 100;

          display: flex;
          align-items: center;
          gap: 5px;

          padding: 7px;

          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(15px);

          border: 1px solid #f0dbe5;
          border-radius: 18px;

          box-shadow:
            0 10px 35px
              rgba(0, 0, 0, 0.1);
        }

        .bottomNav button {
          min-width: 75px;

          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;

          border: 0;
          background: transparent;

          padding: 8px 10px;

          border-radius: 12px;

          color: #777;

          cursor: pointer;
          font-size: 17px;
        }

        .bottomNav span {
          font-size: 10px;
          font-weight: 700;
        }

        .bottomNav button:hover,
        .bottomNav .bottomActive {
          color: #ff3d91;
          background: #fff0f7;
        }

        @media (max-width: 850px) {
          .header {
            padding: 9px 12px;
          }

          .nav {
            display: none;
          }

          .accountButton {
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .keys {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 500px) {
          .brand span {
            display: none;
          }

          .accountButton {
            display: none;
          }

          .title {
            align-items: flex-start;
            flex-direction: column;
          }

          .content {
            padding: 25px 12px;
          }

          .bottomNav {
            width: calc(100% - 20px);
            justify-content: space-around;
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
