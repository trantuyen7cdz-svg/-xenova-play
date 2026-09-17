"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [keys, setKeys] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/";
      return;
    }

    setUser(user);

    const [keysRes, productsRes] = await Promise.all([
      supabase
        .from("keys")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
    ]);

    if (keysRes.data) {
      setKeys(keysRes.data);
    }

    if (productsRes.data) {
      setProducts(productsRes.data);
    }

    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  function formatDate(date) {
    if (!date) return "Không giới hạn";

    return new Date(date).toLocaleString("vi-VN");
  }

  function getKeyStatus(key) {
    if (key.status !== "available") {
      return {
        text: "ĐÃ KHÓA",
        className: "locked",
      };
    }

    if (
      key.expires_at &&
      new Date(key.expires_at) < new Date()
    ) {
      return {
        text: "HẾT HẠN",
        className: "expired",
      };
    }

    return {
      text: "ĐANG HOẠT ĐỘNG",
      className: "active",
    };
  }

  if (loading) {
    return (
      <main className="loadingPage">
        ĐANG TẢI DASHBOARD...
      </main>
    );
  }

  return (
    <main className="page">

      <div className="container">

        <header className="header">

          <div>
            <div className="logo">
              XENOVA PLAY
            </div>

            <h1>
              DASHBOARD
            </h1>

            <p>
              Xin chào, {user?.email}
            </p>
          </div>

          <button
            className="logout"
            onClick={logout}
          >
            ĐĂNG XUẤT
          </button>

        </header>

        <section className="stats">

          <div className="stat">
            <span>KEY CỦA BẠN</span>
            <strong>{keys.length}</strong>
          </div>

          <div className="stat">
            <span>SẢN PHẨM</span>
            <strong>{products.length}</strong>
          </div>

          <div className="stat">
            <span>TÀI KHOẢN</span>
            <strong>USER</strong>
          </div>

        </section>

        <section className="actions">

          <button
            onClick={() => {
              window.location.href =
                "/dashboard/activate";
            }}
          >
            🔑 KÍCH HOẠT KEY
          </button>

          <button
            onClick={() => {
              window.location.href = "/";
            }}
          >
            🛒 MUA KEY
          </button>

        </section>

        <section className="card">

          <div className="cardHeader">
            <div>
              <h2>
                🔐 KEY CỦA TÔI
              </h2>

              <p>
                Danh sách KEY đã kích hoạt
              </p>
            </div>
          </div>

          {keys.length === 0 ? (

            <div className="empty">

              <div className="emptyIcon">
                🔑
              </div>

              <h3>
                CHƯA CÓ KEY
              </h3>

              <p>
                Bạn chưa kích hoạt KEY nào.
              </p>

              <button
                onClick={() => {
                  window.location.href =
                    "/dashboard/activate";
                }}
              >
                KÍCH HOẠT KEY
              </button>

            </div>

          ) : (

            <div className="keyList">

              {keys.map((key) => {

                const status =
                  getKeyStatus(key);

                return (
                  <div
                    className="keyItem"
                    key={key.id}
                  >

                    <div className="keyTop">

                      <code>
                        {key.key_code}
                      </code>

                      <span
                        className={`status ${status.className}`}
                      >
                        {status.text}
                      </span>

                    </div>

                    <div className="keyInfo">

                      <div>
                        <span>
                          HẠN SỬ DỤNG
                        </span>

                        <strong>
                          {formatDate(
                            key.expires_at
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          KÍCH HOẠT
                        </span>

                        <strong>
                          {formatDate(
                            key.created_at
                          )}
                        </strong>
                      </div>

                    </div>

                  </div>
                );
              })}

            </div>

          )}

        </section>

      </div>

      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top,
              #240914 0%,
              #080808 42%,
              #030303 100%
            );
          color: white;
          padding: 30px 16px 60px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .loadingPage {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #050505;
          color: #ff1744;
          font-weight: 900;
        }

        .container {
          max-width: 1100px;
          margin: auto;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 30px;
        }

        .logo {
          color: #ff1744;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 3px;
          margin-bottom: 8px;
        }

        h1 {
          margin: 0;
          font-size: 32px;
          font-weight: 900;
        }

        .header p {
          color: #777;
          margin-top: 8px;
        }

        .logout {
          background: #111;
          color: white;
          border: 1px solid #333;
          border-radius: 10px;
          padding: 12px 16px;
          font-weight: 800;
          cursor: pointer;
        }

        .stats {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }

        .stat {
          background: #0d0d0d;
          border: 1px solid #242424;
          border-radius: 15px;
          padding: 22px;
        }

        .stat span {
          display: block;
          color: #777;
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 10px;
        }

        .stat strong {
          font-size: 25px;
          color: #ff1744;
        }

        .actions {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .actions button {
          flex: 1;
          background:
            linear-gradient(
              90deg,
              #ff1744,
              #d50032
            );
          border: none;
          color: white;
          padding: 15px;
          border-radius: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .card {
          background: #0c0c0c;
          border: 1px solid #242424;
          border-radius: 18px;
          padding: 24px;
        }

        .cardHeader h2 {
          margin: 0;
          font-size: 20px;
        }

        .cardHeader p {
          color: #777;
          margin-top: 7px;
        }

        .empty {
          text-align: center;
          padding: 50px 20px;
          color: #777;
        }

        .emptyIcon {
          font-size: 45px;
        }

        .empty h3 {
          color: white;
          margin-bottom: 5px;
        }

        .empty button {
          margin-top: 15px;
          background: #ff1744;
          border: none;
          color: white;
          padding: 12px 20px;
          border-radius: 9px;
          font-weight: 900;
          cursor: pointer;
        }

        .keyList {
          display: grid;
          gap: 12px;
          margin-top: 20px;
        }

        .keyItem {
          background: #070707;
          border: 1px solid #222;
          border-radius: 13px;
          padding: 18px;
        }

        .keyTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        code {
          color: #ff1744;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .status {
          padding: 6px 9px;
          border-radius: 6px;
          font-size: 9px;
          font-weight: 900;
        }

        .active {
          background: rgba(0, 200, 83, .12);
          color: #00c853;
        }

        .expired,
        .locked {
          background: rgba(255, 23, 68, .12);
          color: #ff1744;
        }

        .keyInfo {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 18px;
          padding-top: 15px;
          border-top: 1px solid #1b1b1b;
        }

        .keyInfo span {
          display: block;
          color: #666;
          font-size: 9px;
          font-weight: 800;
          margin-bottom: 5px;
        }

        .keyInfo strong {
          font-size: 12px;
          color: #ccc;
        }

        @media (max-width: 650px) {

          .header {
            align-items: flex-start;
            flex-direction: column;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .actions {
            flex-direction: column;
          }

          .keyTop {
            align-items: flex-start;
            flex-direction: column;
          }

          .keyInfo {
            grid-template-columns: 1fr;
          }

        }

      `}</style>

    </main>
  );
}
