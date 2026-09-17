"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(authError.message);
      }

      if (!user) {
        window.location.href = "/";
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw new Error(
          "Không đọc được quyền admin: " + profileError.message
        );
      }

      if (profile.role !== "admin") {
        window.location.href = "/dashboard";
        return;
      }

      const { data, error: ordersError } = await supabase
        .from("orders")
        .select(
          "id,user_id,product_id,amount,status,created_at,updated_at"
        )
        .order("created_at", {
          ascending: false,
        });

      if (ordersError) {
        throw new Error(
          "Không tải được orders: " + ordersError.message
        );
      }

      setOrders(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Có lỗi xảy ra.");
    }

    setLoading(false);
  }

  async function changeStatus(id, status) {
    const { error } = await supabase
      .from("orders")
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert("Lỗi: " + error.message);
      return;
    }

    setOrders((old) =>
      old.map((order) =>
        order.id === id
          ? {
              ...order,
              status: status,
            }
          : order
      )
    );
  }

  function money(value) {
    return Number(value || 0).toLocaleString("vi-VN") + "đ";
  }

  function statusName(status) {
    if (status === "pending") return "CHỜ THANH TOÁN";
    if (status === "waiting") return "CHỜ DUYỆT";
    if (status === "paid") return "ĐÃ THANH TOÁN";
    if (status === "confirmed") return "HOÀN TẤT";
    if (status === "cancelled") return "ĐÃ HỦY";

    return status || "KHÔNG RÕ";
  }

  return (
    <main className="page">
      <div className="box">

        <div className="top">
          <Link href="/admin">
            ← Admin Panel
          </Link>

          <button onClick={loadOrders}>
            ↻ Làm mới
          </button>
        </div>

        <h1>📦 QUẢN LÝ ĐƠN HÀNG</h1>

        <p className="sub">
          Tổng đơn hàng: {orders.length}
        </p>

        {loading && (
          <div className="loading">
            Đang tải đơn hàng...
          </div>
        )}

        {error && (
          <div className="error">
            <b>LỖI:</b>
            <br />
            {error}
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="empty">
            Chưa có đơn hàng.
          </div>
        )}

        <div className="orders">
          {orders.map((order) => (
            <div className="order" key={order.id}>

              <div className="orderHeader">
                <strong>
                  ĐƠN #{order.id}
                </strong>

                <span className={`status ${order.status}`}>
                  {statusName(order.status)}
                </span>
              </div>

              <div className="line" />

              <div className="row">
                <span>User ID</span>
                <b>{order.user_id}</b>
              </div>

              <div className="row">
                <span>Product ID</span>
                <b>{order.product_id}</b>
              </div>

              <div className="row">
                <span>Số tiền</span>
                <b className="money">
                  {money(order.amount)}
                </b>
              </div>

              <div className="row">
                <span>Ngày tạo</span>
                <b>
                  {order.created_at
                    ? new Date(
                        order.created_at
                      ).toLocaleString("vi-VN")
                    : "Không có"}
                </b>
              </div>

              <div className="buttons">

                {order.status === "pending" && (
                  <>
                    <Link
                      href={`/payment?id=${order.id}`}
                      className="btn payment"
                    >
                      💳 Thanh toán
                    </Link>

                    <button
                      className="btn cancel"
                      onClick={() =>
                        changeStatus(
                          order.id,
                          "cancelled"
                        )
                      }
                    >
                      Hủy
                    </button>
                  </>
                )}

                {order.status === "waiting" && (
                  <>
                    <button
                      className="btn confirm"
                      onClick={() =>
                        changeStatus(
                          order.id,
                          "paid"
                        )
                      }
                    >
                      ✓ Xác nhận thanh toán
                    </button>

                    <button
                      className="btn cancel"
                      onClick={() =>
                        changeStatus(
                          order.id,
                          "cancelled"
                        )
                      }
                    >
                      Hủy
                    </button>
                  </>
                )}

                {order.status === "paid" && (
                  <button
                    className="btn confirm"
                    onClick={() =>
                      changeStatus(
                        order.id,
                        "confirmed"
                      )
                    }
                  >
                    ✓ Hoàn tất đơn
                  </button>
                )}

                {order.status === "confirmed" && (
                  <span className="done">
                    ✓ Đơn đã hoàn tất
                  </span>
                )}

                {order.status === "cancelled" && (
                  <span className="cancelled">
                    ✕ Đơn đã hủy
                  </span>
                )}

              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #070707;
          color: white;
          padding: 25px 15px 60px;
        }

        .box {
          max-width: 1000px;
          margin: auto;
        }

        .top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .top a {
          color: white;
          text-decoration: none;
          background: #151515;
          padding: 11px 15px;
          border-radius: 10px;
        }

        .top button {
          background: #151515;
          border: 1px solid #333;
          color: white;
          padding: 11px 15px;
          border-radius: 10px;
          cursor: pointer;
        }

        h1 {
          margin: 0;
          font-size: 28px;
        }

        .sub {
          color: #777;
          margin-bottom: 25px;
        }

        .loading {
          padding: 50px;
          text-align: center;
          color: #aaa;
        }

        .error {
          background: #2b1010;
          border: 1px solid #772222;
          color: #ff7777;
          padding: 18px;
          border-radius: 12px;
          margin-bottom: 20px;
          word-break: break-word;
        }

        .empty {
          background: #111;
          border: 1px solid #292929;
          padding: 40px;
          text-align: center;
          border-radius: 15px;
          color: #777;
        }

        .orders {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .order {
          background: #111;
          border: 1px solid #292929;
          border-radius: 16px;
          padding: 20px;
        }

        .orderHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .status {
          padding: 7px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: bold;
        }

        .status.pending {
          background: #3a300d;
          color: #ffd85a;
        }

        .status.waiting {
          background: #3b210d;
          color: #ffad62;
        }

        .status.paid,
        .status.confirmed {
          background: #10331e;
          color: #5ee891;
        }

        .status.cancelled {
          background: #381313;
          color: #ff6969;
        }

        .line {
          height: 1px;
          background: #292929;
          margin: 17px 0;
        }

        .row {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          margin: 11px 0;
        }

        .row span {
          color: #777;
        }

        .row b {
          text-align: right;
          word-break: break-all;
          max-width: 70%;
        }

        .money {
          color: #ff4141 !important;
        }

        .buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 20px;
        }

        .btn {
          border: 0;
          padding: 11px 15px;
          border-radius: 10px;
          cursor: pointer;
          text-decoration: none;
          font-weight: bold;
        }

        .payment {
          background: #252525;
          color: white;
        }

        .confirm {
          background: #159447;
          color: white;
        }

        .cancel {
          background: #451717;
          color: #ff7777;
        }

        .done {
          color: #55df8a;
          font-weight: bold;
        }

        .cancelled {
          color: #ff6666;
          font-weight: bold;
        }

        @media (max-width: 600px) {
          h1 {
            font-size: 22px;
          }

          .row {
            flex-direction: column;
            gap: 4px;
          }

          .row b {
            max-width: 100%;
            text-align: left;
          }

          .buttons {
            flex-direction: column;
          }

          .btn {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}
