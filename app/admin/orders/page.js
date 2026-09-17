"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  async function checkAdminAndLoad() {
    setLoading(true);
    setMessage("");

    try {
      // Kiểm tra đăng nhập
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/";
        return;
      }

      // Kiểm tra quyền admin
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("PROFILE ERROR:", profileError);
        setMessage("Không thể kiểm tra quyền admin.");
        setLoading(false);
        return;
      }

      if (profile?.role !== "admin") {
        window.location.href = "/dashboard";
        return;
      }

      // Lấy đơn hàng
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          user_id,
          product_id,
          amount,
          status,
          created_at,
          updated_at,
          products (
            id,
            name,
            price,
            duration_days
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("ORDERS ERROR:", error);
        setMessage("Lỗi tải đơn hàng: " + error.message);
        setLoading(false);
        return;
      }

      setOrders(data || []);
    } catch (error) {
      console.error("ADMIN ORDERS ERROR:", error);
      setMessage("Đã xảy ra lỗi khi tải đơn hàng.");
    }

    setLoading(false);
  }

  async function updateOrderStatus(orderId, newStatus) {
    setMessage("");

    const { error } = await supabase
      .from("orders")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      console.error("UPDATE ORDER ERROR:", error);
      setMessage("Không thể cập nhật đơn: " + error.message);
      return;
    }

    setOrders((oldOrders) =>
      oldOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: newStatus,
              updated_at: new Date().toISOString(),
            }
          : order
      )
    );

    setMessage("Cập nhật đơn hàng thành công.");
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("vi-VN") + "đ";
  }

  function formatDate(value) {
    if (!value) return "Không có";

    return new Date(value).toLocaleString("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  function statusText(status) {
    switch (status) {
      case "pending":
        return "Chờ thanh toán";

      case "waiting":
        return "Chờ duyệt";

      case "paid":
        return "Đã thanh toán";

      case "confirmed":
        return "Đã xác nhận";

      case "cancelled":
        return "Đã hủy";

      default:
        return status || "Không xác định";
    }
  }

  function statusClass(status) {
    switch (status) {
      case "pending":
        return "pending";

      case "waiting":
        return "waiting";

      case "paid":
        return "paid";

      case "confirmed":
        return "confirmed";

      case "cancelled":
        return "cancelled";

      default:
        return "";
    }
  }

  return (
    <main className="page">
      <div className="container">

        <div className="topbar">
          <Link href="/admin" className="back">
            ← Admin Panel
          </Link>

          <button
            className="reload"
            onClick={checkAdminAndLoad}
          >
            ↻ Làm mới
          </button>
        </div>

        <div className="header">
          <div>
            <div className="smallTitle">XENOVA PLAY</div>
            <h1>📦 QUẢN LÝ ĐƠN HÀNG</h1>
            <p>
              Quản lý và xác nhận các đơn hàng của khách hàng.
            </p>
          </div>
        </div>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Đang tải đơn hàng...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty">
            <div className="emptyIcon">📦</div>
            <h2>Chưa có đơn hàng</h2>
            <p>
              Khi khách hàng mua KEY, đơn hàng sẽ xuất hiện ở đây.
            </p>
          </div>
        ) : (
          <div className="orders">

            {orders.map((order) => {
              const product = order.products;

              return (
                <div className="orderCard" key={order.id}>

                  <div className="orderTop">
                    <div>
                      <div className="orderId">
                        #{String(order.id).slice(0, 8)}
                      </div>

                      <div className="date">
                        {formatDate(order.created_at)}
                      </div>
                    </div>

                    <span
                      className={`status ${statusClass(
                        order.status
                      )}`}
                    >
                      {statusText(order.status)}
                    </span>
                  </div>

                  <div className="line"></div>

                  <div className="infoGrid">

                    <div className="info">
                      <span>Sản phẩm</span>
                      <strong>
                        {product?.name || "Không xác định"}
                      </strong>
                    </div>

                    <div className="info">
                      <span>Số tiền</span>
                      <strong className="price">
                        {formatMoney(order.amount)}
                      </strong>
                    </div>

                    <div className="info">
                      <span>Thời hạn</span>
                      <strong>
                        {product?.duration_days
                          ? `${product.duration_days} ngày`
                          : "Không có"}
                      </strong>
                    </div>

                    <div className="info">
                      <span>User ID</span>
                      <strong className="userId">
                        {order.user_id}
                      </strong>
                    </div>

                  </div>

                  <div className="actions">

                    {order.status === "pending" && (
                      <>
                        <Link
                          href={`/payment?id=${order.id}`}
                          className="btn payment"
                        >
                          💳 Xem thanh toán
                        </Link>

                        <button
                          className="btn cancel"
                          onClick={() =>
                            updateOrderStatus(
                              order.id,
                              "cancelled"
                            )
                          }
                        >
                          Hủy đơn
                        </button>
                      </>
                    )}

                    {order.status === "waiting" && (
                      <>
                        <button
                          className="btn confirm"
                          onClick={() =>
                            updateOrderStatus(
                              order.id,
                              "paid"
                            )
                          }
                        >
                          ✓ Xác nhận đã thanh toán
                        </button>

                        <button
                          className="btn cancel"
                          onClick={() =>
                            updateOrderStatus(
                              order.id,
                              "cancelled"
                            )
                          }
                        >
                          Hủy đơn
                        </button>
                      </>
                    )}

                    {order.status === "paid" && (
                      <button
                        className="btn confirm"
                        onClick={() =>
                          updateOrderStatus(
                            order.id,
                            "confirmed"
                          )
                        }
                      >
                        ✓ Xác nhận hoàn tất
                      </button>
                    )}

                    {order.status === "confirmed" && (
                      <div className="completed">
                        ✓ Đơn hàng đã hoàn tất
                      </div>
                    )}

                    {order.status === "cancelled" && (
                      <div className="cancelled">
                        ✕ Đơn hàng đã bị hủy
                      </div>
                    )}

                  </div>

                </div>
              );
            })}

          </div>
        )}
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top,
              rgba(255, 40, 40, 0.12),
              transparent 35%
            ),
            #070707;
          color: white;
          padding: 30px 18px 60px;
        }

        .container {
          width: 100%;
          max-width: 1100px;
          margin: auto;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 35px;
        }

        .back {
          color: #fff;
          text-decoration: none;
          font-weight: 700;
          background: #151515;
          border: 1px solid #2b2b2b;
          padding: 11px 16px;
          border-radius: 12px;
        }

        .reload {
          border: 1px solid #333;
          background: #151515;
          color: white;
          padding: 11px 16px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
        }

        .header {
          margin-bottom: 25px;
        }

        .smallTitle {
          color: #ff3333;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 4px;
          margin-bottom: 8px;
        }

        h1 {
          margin: 0;
          font-size: 30px;
          font-weight: 900;
        }

        .header p {
          color: #888;
          margin-top: 10px;
        }

        .message {
          background: #171717;
          border: 1px solid #333;
          padding: 14px 16px;
          border-radius: 12px;
          margin-bottom: 20px;
          color: #ddd;
        }

        .loading {
          min-height: 300px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          color: #999;
        }

        .spinner {
          width: 35px;
          height: 35px;
          border: 3px solid #333;
          border-top-color: #ff3333;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 15px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .empty {
          text-align: center;
          background: #101010;
          border: 1px solid #252525;
          border-radius: 18px;
          padding: 60px 20px;
        }

        .emptyIcon {
          font-size: 55px;
          margin-bottom: 15px;
        }

        .empty h2 {
          margin: 0 0 8px;
        }

        .empty p {
          color: #777;
          margin: 0;
        }

        .orders {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .orderCard {
          background: linear-gradient(
            145deg,
            #121212,
            #0c0c0c
          );
          border: 1px solid #292929;
          border-radius: 18px;
          padding: 22px;
          box-shadow: 0 10px 35px rgba(0, 0, 0, 0.3);
        }

        .orderTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
        }

        .orderId {
          font-weight: 900;
          font-size: 18px;
        }

        .date {
          color: #666;
          font-size: 13px;
          margin-top: 5px;
        }

        .status {
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .status.pending {
          background: #29220b;
          color: #ffd45c;
        }

        .status.waiting {
          background: #24160b;
          color: #ff9c55;
        }

        .status.paid {
          background: #102719;
          color: #61e89a;
        }

        .status.confirmed {
          background: #102719;
          color: #61e89a;
        }

        .status.cancelled {
          background: #2a1111;
          color: #ff6b6b;
        }

        .line {
          height: 1px;
          background: #252525;
          margin: 20px 0;
        }

        .infoGrid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .info {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .info span {
          color: #666;
          font-size: 12px;
        }

        .info strong {
          color: #eee;
          word-break: break-word;
        }

        .price {
          color: #ff4040 !important;
        }

        .userId {
          font-size: 12px;
          color: #aaa !important;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 22px;
        }

        .btn {
          border: none;
          border-radius: 11px;
          padding: 12px 16px;
          font-weight: 800;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .payment {
          background: #222;
          color: white;
        }

        .confirm {
          background: #18a957;
          color: white;
        }

        .cancel {
          background: #341414;
          color: #ff7070;
        }

        .completed {
          color: #55dd8c;
          font-weight: 800;
        }

        .cancelled {
          color: #ff6868;
          font-weight: 800;
        }

        @media (max-width: 650px) {
          .page {
            padding: 20px 12px 40px;
          }

          h1 {
            font-size: 23px;
          }

          .topbar {
            margin-bottom: 25px;
          }

          .infoGrid {
            grid-template-columns: 1fr;
          }

          .orderTop {
            align-items: flex-start;
          }

          .actions {
            flex-direction: column;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
