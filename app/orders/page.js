"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function OrdersPage() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/";
      return;
    }

    setUser(user);

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        products (
          name,
          description,
          duration_days
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  }

  function formatMoney(amount) {
    return Number(amount || 0).toLocaleString("vi-VN") + "đ";
  }

  function formatDate(date) {
    if (!date) return "—";

    return new Date(date).toLocaleString("vi-VN");
  }

  function statusInfo(status) {
    if (status === "paid") {
      return {
        text: "ĐÃ THANH TOÁN",
        className: "paid",
      };
    }

    if (status === "completed") {
      return {
        text: "HOÀN THÀNH",
        className: "completed",
      };
    }

    if (status === "cancelled") {
      return {
        text: "ĐÃ HỦY",
        className: "cancelled",
      };
    }

    return {
      text: "CHỜ THANH TOÁN",
      className: "pending",
    };
  }

  if (loading) {
    return (
      <main className="loading">
        ĐANG TẢI ĐƠN HÀNG...
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

            <h1>ĐƠN HÀNG</h1>

            <p>
              Theo dõi các đơn hàng của bạn
            </p>
          </div>

          <button
            className="back"
            onClick={() => {
              window.location.href =
                "/dashboard";
            }}
          >
            ← DASHBOARD
          </button>
        </header>

        {orders.length === 0 ? (
          <section className="empty">
            <div className="emptyIcon">
              🛒
            </div>

            <h2>CHƯA CÓ ĐƠN HÀNG</h2>

            <p>
              Bạn chưa tạo đơn hàng nào.
            </p>

            <button
              onClick={() => {
                window.location.href =
                  "/shop";
              }}
            >
              🛒 MUA KEY
            </button>
          </section>
        ) : (
          <section className="orders">

            {orders.map((order) => {
              const status =
                statusInfo(order.status);

              return (
                <div
                  className="order"
                  key={order.id}
                >

                  <div className="orderTop">
                    <div>
                      <span className="label">
                        MÃ ĐƠN HÀNG
                      </span>

                      <code>
                        #{order.id.slice(0, 8).toUpperCase()}
                      </code>
                    </div>

                    <span
                      className={`status ${status.className}`}
                    >
                      {status.text}
                    </span>
                  </div>

                  <div className="product">

                    <div className="productIcon">
                      🔑
                    </div>

                    <div className="productInfo">
                      <h2>
                        {order.products?.name ||
                          "Sản phẩm"}
                      </h2>

                      <p>
                        {order.products
                          ?.description ||
                          "KEY XENOVA PLAY"}
                      </p>
                    </div>

                    <div className="price">
                      {formatMoney(order.amount)}
                    </div>

                  </div>

                  <div className="details">

                    <div>
                      <span>
                        THỜI HẠN
                      </span>

                      <strong>
                        {order.products
                          ?.duration_days || 1} ngày
                      </strong>
                    </div>

                    <div>
                      <span>
                        NGÀY ĐẶT
                      </span>

                      <strong>
                        {formatDate(
                          order.created_at
                        )}
                      </strong>
                    </div>

                  </div>

                  {order.status === "pending" && (
                    <button
                      className="pay"
                      onClick={() => {
                        window.location.href =
                          "/payment?id=" +
                          order.id;
                      }}
                    >
                      💳 THANH TOÁN
                    </button>
                  )}

                </div>
              );
            })}

          </section>
        )}

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
              #250914 0%,
              #080808 50%,
              #030303 100%
            );
          color: white;
          padding: 30px 16px 60px;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .loading {
          min-height: 100vh;
          background: #050505;
          color: #ff1744;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .container {
          max-width: 1000px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
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

        .back {
          background: #111;
          color: white;
          border: 1px solid #333;
          border-radius: 10px;
          padding: 12px 16px;
          font-weight: 900;
          cursor: pointer;
        }

        .orders {
          display: grid;
          gap: 16px;
        }

        .order {
          background:
            linear-gradient(
              145deg,
              #121212,
              #080808
            );
          border: 1px solid #292929;
          border-radius: 17px;
          padding: 22px;
        }

        .orderTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          padding-bottom: 18px;
          border-bottom: 1px solid #202020;
        }

        .label {
          display: block;
          color: #666;
          font-size: 9px;
          font-weight: 900;
          margin-bottom: 6px;
        }

        code {
          color: #ff1744;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .status {
          padding: 7px 10px;
          border-radius: 7px;
          font-size: 9px;
          font-weight: 900;
        }

        .pending {
          color: #ffab00;
          background: rgba(255,171,0,.1);
        }

        .paid,
        .completed {
          color: #00c853;
          background: rgba(0,200,83,.1);
        }

        .cancelled {
          color: #ff1744;
          background: rgba(255,23,68,.1);
        }

        .product {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 20px 0;
        }

        .productIcon {
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #171717;
          border-radius: 12px;
          font-size: 25px;
        }

        .productInfo {
          flex: 1;
        }

        .productInfo h2 {
          margin: 0;
          font-size: 17px;
        }

        .productInfo p {
          margin: 6px 0 0;
          color: #777;
          font-size: 12px;
        }

        .price {
          color: #ff1744;
          font-size: 20px;
          font-weight: 900;
          white-space: nowrap;
        }

        .details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          padding-top: 15px;
          border-top: 1px solid #202020;
        }

        .details span {
          display: block;
          color: #666;
          font-size: 9px;
          font-weight: 900;
          margin-bottom: 5px;
        }

        .details strong {
          color: #ccc;
          font-size: 12px;
        }

        .pay {
          width: 100%;
          margin-top: 18px;
          padding: 14px;
          border: none;
          border-radius: 10px;
          background:
            linear-gradient(
              90deg,
              #ff1744,
              #d50032
            );
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .empty {
          text-align: center;
          background: #0c0c0c;
          border: 1px solid #242424;
          border-radius: 18px;
          padding: 70px 20px;
        }

        .emptyIcon {
          font-size: 50px;
        }

        .empty h2 {
          font-size: 20px;
        }

        .empty p {
          color: #777;
        }

        .empty button {
          margin-top: 15px;
          background: #ff1744;
          color: white;
          border: none;
          border-radius: 10px;
          padding: 13px 20px;
          font-weight: 900;
          cursor: pointer;
        }

        @media (max-width: 600px) {

          .header {
            flex-direction: column;
            align-items: flex-start;
          }

          .product {
            align-items: flex-start;
          }

          .price {
            font-size: 17px;
          }

          .orderTop {
            align-items: flex-start;
            flex-direction: column;
          }

        }

      `}</style>
    </main>
  );
}
