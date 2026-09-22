"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SiteOrdersPage() {
  const params = useParams();
  const router = useRouter();

  const slug = params?.slug;

  const [website, setWebsite] = useState(null);
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    load();
  }, [slug]);

  async function load() {
    setLoading(true);

    try {
      const [
        websiteRes,
        userRes,
        ordersRes,
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
          `/api/sites/${slug}/orders`,
          {
            cache: "no-store",
          }
        ),
      ]);

      if (websiteRes.ok) {
        const data =
          await websiteRes.json();

        setWebsite(
          data.website || data
        );
      }

      if (userRes.ok) {
        const data =
          await userRes.json();

        setUser(
          data.user || null
        );
      }

      if (ordersRes.ok) {
        const data =
          await ordersRes.json();

        setOrders(
          data.orders || []
        );
      } else if (
        ordersRes.status === 401
      ) {
        setUser(null);
      }
    } catch (error) {
      console.error(
        "LOAD ORDERS ERROR:",
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
    await fetch(
      `/api/sites/${slug}/auth/logout`,
      {
        method: "POST",
      }
    );

    router.push(
      `/sites/${slug}/login`
    );
  }

  function formatMoney(value) {
    const number = Number(
      value || 0
    );

    return (
      number.toLocaleString(
        "vi-VN"
      ) + "đ"
    );
  }

  function formatDate(value) {
    if (!value) return "—";

    return new Date(
      value
    ).toLocaleString("vi-VN");
  }

  function statusText(status) {
    const map = {
      pending: "Chờ xử lý",
      paid: "Đã thanh toán",
      completed: "Hoàn thành",
      success: "Thành công",
      cancelled: "Đã hủy",
      canceled: "Đã hủy",
      failed: "Thất bại",
    };

    return (
      map[status] ||
      status ||
      "Không rõ"
    );
  }

  function statusClass(status) {
    if (
      status === "completed" ||
      status === "success" ||
      status === "paid"
    ) {
      return "status success";
    }

    if (
      status === "cancelled" ||
      status === "canceled" ||
      status === "failed"
    ) {
      return "status danger";
    }

    return "status pending";
  }

  const shopName =
    website?.name || "Shop";

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
              {shopName
                .charAt(0)
                .toUpperCase()}
            </div>
          )}

          <span>{shopName}</span>
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
              go("/keys")
            }
          >
            Kho KEY
          </button>

          <button className="active">
            Đơn hàng
          </button>

          <button
            onClick={() =>
              go("/deposit")
            }
          >
            Nạp tiền
          </button>
        </nav>

        <div className="account">
          {user ? (
            <>
              <button
                className="accountButton"
                onClick={() =>
                  go("/account")
                }
              >
                👤{" "}
                {user.username ||
                  user.email}
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
              onClick={() =>
                go("/login")
              }
            >
              Đăng nhập
            </button>
          )}
        </div>
      </header>

      <section className="content">
        <div className="title">
          <div>
            <h1>Đơn hàng</h1>

            <p>
              Lịch sử đơn hàng tại{" "}
              {shopName}
            </p>
          </div>

          <button
            className="back"
            onClick={() => go("")}
          >
            ← Cửa hàng
          </button>
        </div>

        {!user && !loading ? (
          <div className="empty">
            <div className="emptyIcon">
              🔐
            </div>

            <h2>
              Bạn chưa đăng nhập
            </h2>

            <p>
              Đăng nhập để xem đơn
              hàng.
            </p>

            <button
              className="primary"
              onClick={() =>
                go("/login")
              }
            >
              Đăng nhập
            </button>
          </div>
        ) : loading ? (
          <div className="empty">
            <div className="loader" />

            <p>
              Đang tải đơn hàng...
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty">
            <div className="emptyIcon">
              📦
            </div>

            <h2>
              Chưa có đơn hàng
            </h2>

            <p>
              Bạn chưa mua sản phẩm
              nào tại shop này.
            </p>

            <button
              className="primary"
              onClick={() => go("")}
            >
              Đi đến cửa hàng
            </button>
          </div>
        ) : (
          <div className="orders">
            {orders.map((order) => (
              <div
                className="order"
                key={order.id}
              >
                <div className="orderHead">
                  <div>
                    <div className="orderId">
                      Đơn #{order.id}
                    </div>

                    <div className="date">
                      {formatDate(
                        order.created_at
                      )}
                    </div>
                  </div>

                  <span
                    className={statusClass(
                      order.status
                    )}
                  >
                    {statusText(
                      order.status
                    )}
                  </span>
                </div>

                <div className="product">
                  <div className="productIcon">
                    🔑
                  </div>

                  <div className="productInfo">
                    <strong>
                      {order.product_name ||
                        "Sản phẩm"}
                    </strong>

                    <span>
                      Số lượng:{" "}
                      {order.quantity ||
                        1}
                    </span>
                  </div>

                  <div className="price">
                    {formatMoney(
                      order.total_amount
                    )}
                  </div>
                </div>

                <div className="orderBottom">
                  <span>
                    Đơn giá:{" "}
                    {formatMoney(
                      order.unit_price
                    )}
                  </span>

                  {order.key_value && (
                    <span className="hasKey">
                      ✓ Đã có KEY
                    </span>
                  )}

                  <button
                    onClick={() =>
                      go(
                        `/checkout/${order.id}`
                      )
                    }
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="bottomNav">
        <button
          onClick={() => go("")}
        >
          🏠
          <span>Trang chủ</span>
        </button>

        <button
          onClick={() =>
            go("/keys")
          }
        >
          🔑
          <span>Kho KEY</span>
        </button>

        <button
          className="bottomActive"
          onClick={() =>
            go("/orders")
          }
        >
          📦
          <span>Đơn hàng</span>
        </button>

        <button
          onClick={() =>
            go("/account")
          }
        >
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
              #fff0f7,
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

          background: rgba(
            255,
            255,
            255,
            0.94
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

          font-size: 17px;
          font-weight: 800;

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
          gap: 5px;
          flex: 1;
        }

        .nav button {
          border: 0;
          background: transparent;

          padding: 10px 13px;
          border-radius: 10px;

          color: #555;
          font-weight: 600;

          cursor: pointer;
        }

        .nav button:hover,
        .nav button.active {
          color: #ff3d91;
          background: #fff0f7;
        }

        .account {
          display: flex;
          gap: 7px;
          align-items: center;
        }

        .account button {
          border: 0;
          border-radius: 10px;
          padding: 9px 12px;
          cursor: pointer;
          font-weight: 600;
        }

        .accountButton {
          background: #fff0f7;
          color: #e62e82;
        }

        .logout {
          background: #f3f3f3;
          color: #555;
        }

        .login {
          background: #ff3d91;
          color: white;
        }

        .content {
          max-width: 1050px;
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

          box-shadow:
            0 10px 35px
              rgba(
                255,
                61,
                145,
                0.06
              );
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

        .orders {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .order {
          background: white;

          border: 1px solid
            #f0dbe5;

          border-radius: 18px;

          padding: 18px;

          box-shadow:
            0 10px 30px
              rgba(
                255,
                61,
                145,
                0.05
              );
        }

        .orderHead {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 15px;
        }

        .orderId {
          font-weight: 800;
          font-size: 16px;
        }

        .date {
          margin-top: 4px;
          color: #888;
          font-size: 13px;
        }

        .status {
          padding: 6px 10px;
          border-radius: 999px;

          font-size: 12px;
          font-weight: 800;
        }

        .status.pending {
          background: #fff6dc;
          color: #b87800;
        }

        .status.success {
          background: #e8fff1;
          color: #159651;
        }

        .status.danger {
          background: #fff0f0;
          color: #dc3a3a;
        }

        .product {
          display: flex;
          align-items: center;

          gap: 13px;

          margin-top: 18px;
          padding: 15px;

          border-radius: 13px;

          background: #faf7f9;
        }

        .productIcon {
          width: 45px;
          height: 45px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 12px;

          background: #fff0f7;

          font-size: 22px;
        }

        .productInfo {
          flex: 1;

          display: flex;
          flex-direction: column;

          gap: 4px;
        }

        .productInfo span {
          color: #888;
          font-size: 13px;
        }

        .price {
          font-weight: 900;
          color: #e72e83;
        }

        .orderBottom {
          display: flex;
          align-items: center;
          gap: 15px;

          margin-top: 15px;

          color: #777;
          font-size: 13px;
        }

        .orderBottom button {
          margin-left: auto;

          border: 0;
          border-radius: 9px;

          padding: 9px 12px;

          background: #fff0f7;
          color: #e52e81;

          font-weight: 800;
          cursor: pointer;
        }

        .hasKey {
          color: #159651;
          font-weight: 700;
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
          gap: 5px;

          padding: 7px;

          background: rgba(
            255,
            255,
            255,
            0.95
          );

          backdrop-filter: blur(15px);

          border: 1px solid
            #f0dbe5;

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
          .nav {
            display: none;
          }

          .header {
            padding: 9px 12px;
          }

          .accountButton {
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        @media (max-width: 600px) {
          .brand span {
            display: none;
          }

          .accountButton {
            display: none;
          }

          .title {
            flex-direction: column;
            align-items: flex-start;
          }

          .content {
            padding: 25px 12px;
          }

          .product {
            align-items: flex-start;
          }

          .price {
            font-size: 14px;
          }

          .orderBottom {
            flex-wrap: wrap;
          }

          .orderBottom button {
            margin-left: 0;
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
