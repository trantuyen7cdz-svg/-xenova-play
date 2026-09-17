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
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
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
        throw profileError;
      }

      if (profile?.role !== "admin") {
        window.location.href = "/dashboard";
        return;
      }

      const { data, error: ordersError } = await supabase
        .from("orders")
        .select(
          "id,user_id,product_id,amount,status,created_at,updated_at"
        )
        .order("created_at", { ascending: false });

      if (ordersError) {
        throw ordersError;
      }

      setOrders(data || []);
    } catch (err) {
      console.error("ADMIN ORDERS ERROR:", err);
      setError(err?.message || "Không thể tải đơn hàng.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, status) {
    const { error } = await supabase
      .from("orders")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadOrders();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "#fff",
        padding: "25px",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "auto",
        }}
      >
        <Link
          href="/admin"
          style={{
            color: "#fff",
            textDecoration: "none",
          }}
        >
          ← Admin Panel
        </Link>

        <h1 style={{ marginTop: "30px" }}>
          📦 QUẢN LÝ ĐƠN HÀNG
        </h1>

        <button
          onClick={loadOrders}
          style={{
            padding: "10px 15px",
            marginBottom: "20px",
            cursor: "pointer",
          }}
        >
          ↻ Làm mới
        </button>

        {loading && (
          <p>Đang tải đơn hàng...</p>
        )}

        {error && (
          <div
            style={{
              background: "#300",
              padding: "15px",
              borderRadius: "10px",
              marginBottom: "20px",
            }}
          >
            <b>LỖI:</b>
            <br />
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          orders.length === 0 && (
            <p>Chưa có đơn hàng.</p>
          )}

        {!loading &&
          orders.map((order) => (
            <div
              key={order.id}
              style={{
                background: "#141414",
                border: "1px solid #333",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "15px",
              }}
            >
              <h3>
                Đơn hàng #{order.id}
              </h3>

              <p>
                User ID: {order.user_id}
              </p>

              <p>
                Product ID: {order.product_id}
              </p>

              <p>
                Số tiền:{" "}
                <b>
                  {Number(order.amount || 0).toLocaleString(
                    "vi-VN"
                  )}
                  đ
                </b>
              </p>

              <p>
                Trạng thái:{" "}
                <b>{order.status}</b>
              </p>

              <p>
                Ngày tạo:{" "}
                {order.created_at
                  ? new Date(
                      order.created_at
                    ).toLocaleString("vi-VN")
                  : ""}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginTop: "15px",
                }}
              >
                {order.status === "pending" && (
                  <>
                    <Link
                      href={`/payment?id=${order.id}`}
                      style={{
                        padding: "10px 14px",
                        background: "#222",
                        color: "#fff",
                        borderRadius: "8px",
                        textDecoration: "none",
                      }}
                    >
                      Xem thanh toán
                    </Link>

                    <button
                      onClick={() =>
                        updateStatus(
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
                      onClick={() =>
                        updateStatus(
                          order.id,
                          "paid"
                        )
                      }
                    >
                      ✓ Xác nhận thanh toán
                    </button>

                    <button
                      onClick={() =>
                        updateStatus(
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
                    onClick={() =>
                      updateStatus(
                        order.id,
                        "confirmed"
                      )
                    }
                  >
                    ✓ Hoàn tất đơn
                  </button>
                )}

                {order.status === "confirmed" && (
                  <span>
                    ✓ Đã hoàn tất
                  </span>
                )}

                {order.status === "cancelled" && (
                  <span>
                    ✕ Đã hủy
                  </span>
                )}
              </div>
            </div>
          ))}
      </div>
    </main>
  );
}
