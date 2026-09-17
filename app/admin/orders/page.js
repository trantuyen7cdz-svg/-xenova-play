"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      window.location.href = "/dashboard";
      return;
    }

    loadOrders();
  }

  async function loadOrders() {
    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        user_id,
        product_id,
        amount,
        status,
        created_at,
        products (
          name,
          duration_days
        ),
        profiles (
          username,
          email
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage("Không tải được đơn hàng: " + error.message);
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  }

  async function updateStatus(orderId, status) {
    setMessage("");

    const { error } = await supabase
      .from("orders")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      setMessage("Lỗi: " + error.message);
      return;
    }

    setMessage("Đã cập nhật đơn hàng.");
    loadOrders();
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        <a href="/admin" style={styles.back}>
          ← Admin Panel
        </a>

        <h1 style={styles.title}>
          📦 QUẢN LÝ ĐƠN HÀNG
        </h1>

        {message && (
          <div style={styles.message}>
            {message}
          </div>
        )}

        {loading ? (
          <p style={styles.gray}>
            Đang tải đơn hàng...
          </p>
        ) : orders.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: "45px" }}>📦</div>
            <h2>Chưa có đơn hàng</h2>
          </div>
        ) : (
          <div style={styles.list}>
            {orders.map((order) => (
              <div key={order.id} style={styles.card}>

                <div style={styles.top}>
                  <div>
                    <div style={styles.label}>
                      ĐƠN HÀNG
                    </div>

                    <h2 style={{ margin: "8px 0" }}>
                      {order.products?.name || "Sản phẩm"}
                    </h2>
                  </div>

                  <div
                    style={{
                      ...styles.status,
                      color:
                        order.status === "pending"
                          ? "#ffb000"
                          : order.status === "waiting"
                          ? "#00bfff"
                          : order.status === "paid"
                          ? "#55ff88"
                          : "#ff6666",
                    }}
                  >
                    {order.status}
                  </div>
                </div>

                <div style={styles.info}>
                  <p>
                    <b>Mã đơn:</b> {order.id}
                  </p>

                  <p>
                    <b>Khách hàng:</b>{" "}
                    {order.profiles?.username ||
                      order.profiles?.email ||
                      order.user_id}
                  </p>

                  <p>
                    <b>Email:</b>{" "}
                    {order.profiles?.email || "Không có"}
                  </p>

                  <p>
                    <b>Số tiền:</b>{" "}
                    {Number(order.amount || 0).toLocaleString(
                      "vi-VN"
                    )}
                    ₫
                  </p>

                  <p>
                    <b>Thời hạn:</b>{" "}
                    {order.products?.duration_days || 0} ngày
                  </p>

                  <p style={styles.gray}>
                    {new Date(order.created_at).toLocaleString(
                      "vi-VN"
                    )}
                  </p>
                </div>

                <div style={styles.actions}>

                  {order.status === "waiting" && (
                    <>
                      <button
                        onClick={() =>
                          updateStatus(order.id, "paid")
                        }
                        style={styles.greenButton}
                      >
                        ✅ XÁC NHẬN
                      </button>

                      <button
                        onClick={() =>
                          updateStatus(order.id, "cancelled")
                        }
                        style={styles.redButton}
                      >
                        ❌ TỪ CHỐI
                      </button>
                    </>
                  )}

                  {order.status === "pending" && (
                    <button
                      onClick={() =>
                        updateStatus(order.id, "cancelled")
                      }
                      style={styles.redButton}
                    >
                      HỦY ĐƠN
                    </button>
                  )}

                  {order.status === "paid" && (
                    <div style={styles.paid}>
                      ✓ Đã xác nhận thanh toán
                    </div>
                  )}

                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#080808",
    color: "#fff",
    padding: "30px 20px",
    fontFamily: "Arial, sans-serif",
  },

  container: {
    maxWidth: "1000px",
    margin: "0 auto",
  },

  back: {
    color: "#aaa",
    textDecoration: "none",
  },

  title: {
    fontSize: "38px",
    margin: "25px 0",
    fontWeight: "900",
  },

  gray: {
    color: "#777",
  },

  message: {
    background: "#151515",
    border: "1px solid #333",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "20px",
  },

  empty: {
    background: "#111",
    border: "1px solid #292929",
    borderRadius: "15px",
    padding: "50px",
    textAlign: "center",
  },

  list: {
    display: "grid",
    gap: "18px",
  },

  card: {
    background: "#111",
    border: "1px solid #292929",
    borderRadius: "15px",
    padding: "22px",
  },

  top: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
  },

  label: {
    color: "#ff3030",
    fontSize: "11px",
    fontWeight: "bold",
    letterSpacing: "3px",
  },

  status: {
    fontWeight: "bold",
    textTransform: "uppercase",
  },

  info: {
    borderTop: "1px solid #222",
    borderBottom: "1px solid #222",
    margin: "18px 0",
    padding: "10px 0",
  },

  actions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  greenButton: {
    flex: 1,
    minWidth: "150px",
    padding: "13px",
    border: "none",
    borderRadius: "10px",
    background: "#168044",
    color: "#fff",
    fontWeight: "bold",
  },

  redButton: {
    flex: 1,
    minWidth: "150px",
    padding: "13px",
    border: "none",
    borderRadius: "10px",
    background: "#8d2222",
    color: "#fff",
    fontWeight: "bold",
  },

  paid: {
    color: "#55ff88",
    fontWeight: "bold",
    padding: "12px 0",
  },
};
