"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function OrdersPage() {
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

    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        amount,
        status,
        created_at,
        product_id,
        products (
          name,
          duration_days
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setOrders(data || []);
    }

    setLoading(false);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "#fff",
        padding: "30px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            color: "#aaa",
            textDecoration: "none",
          }}
        >
          ← Dashboard
        </Link>

        <h1
          style={{
            fontSize: "40px",
            marginTop: "30px",
          }}
        >
          📦 ĐƠN HÀNG
        </h1>

        {loading && (
          <p style={{ color: "#888" }}>
            Đang tải đơn hàng...
          </p>
        )}

        {!loading && orders.length === 0 && (
          <div
            style={{
              marginTop: "25px",
              padding: "35px",
              background: "#111",
              border: "1px solid #292929",
              borderRadius: "15px",
              textAlign: "center",
            }}
          >
            <p style={{ color: "#888" }}>
              Bạn chưa có đơn hàng.
            </p>

            <Link
              href="/shop"
              style={{
                display: "inline-block",
                marginTop: "15px",
                padding: "13px 25px",
                background: "#ff3030",
                color: "#fff",
                textDecoration: "none",
                borderRadius: "10px",
                fontWeight: "bold",
              }}
            >
              🛒 MUA KEY
            </Link>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gap: "15px",
            marginTop: "25px",
          }}
        >
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                background: "#111",
                border: "1px solid #292929",
                borderRadius: "15px",
                padding: "22px",
              }}
            >
              <h2 style={{ marginTop: 0 }}>
                {order.products?.name || "Sản phẩm"}
              </h2>

              <p style={{ color: "#888" }}>
                Mã đơn: {order.id}
              </p>

              <p>
                Giá:{" "}
                <b>
                  {Number(order.amount || 0).toLocaleString(
                    "vi-VN"
                  )}
                  ₫
                </b>
              </p>

              <p style={{ color: "#888" }}>
                Thời hạn:{" "}
                {order.products?.duration_days || 0} ngày
              </p>

              <p>
                Trạng thái:{" "}
                <b
                  style={{
                    color:
                      order.status === "pending"
                        ? "#ffb000"
                        : "#55ff88",
                  }}
                >
                  {order.status === "pending"
                    ? "CHỜ THANH TOÁN"
                    : order.status}
                </b>
              </p>

              {order.status === "pending" && (
                <Link
                  href={`/payment?id=${order.id}`}
                  style={{
                    display: "block",
                    textAlign: "center",
                    marginTop: "20px",
                    padding: "14px",
                    background: "#ff3030",
                    color: "#fff",
                    textDecoration: "none",
                    borderRadius: "10px",
                    fontWeight: "bold",
                  }}
                >
                  💳 MUA KEY
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
