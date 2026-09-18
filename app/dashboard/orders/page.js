"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function OrdersPage() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUser(user);

      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          product_id,
          amount,
          status,
          created_at,
          updated_at,
          products (
            name,
            duration_days
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(error);
        return;
      }

      setOrders(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function formatMoney(amount) {
    return Number(amount || 0).toLocaleString("vi-VN") + "đ";
  }

  function formatDate(date) {
    if (!date) {
      return "Không rõ";
    }

    return new Date(date).toLocaleString("vi-VN");
  }

  function getStatus(status) {
    if (status === "pending") {
      return {
        text: "CHỜ DUYỆT",
        className: "pending",
      };
    }

    if (status === "paid") {
      return {
        text: "ĐÃ THANH TOÁN",
        className: "paid",
      };
    }

    if (status === "rejected") {
      return {
        text: "ĐÃ TỪ CHỐI",
        className: "rejected",
      };
    }

    return {
      text: String(status || "KHÔNG RÕ").toUpperCase(),
      className: "other",
    };
  }

  if (loading) {
    return (
      <main style={styles.loading}>
        ĐANG TẢI ĐƠN HÀNG...
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.logo}>XENOVA PLAY</div>

            <h1 style={styles.title}>
              LỊCH SỬ ĐƠN HÀNG
            </h1>

            <p style={styles.email}>
              {user?.email}
            </p>
          </div>

          <button
            style={styles.backButton}
            onClick={() => {
              window.location.href = "/dashboard";
            }}
          >
            DASHBOARD
          </button>
        </header>

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>
                🧾 ĐƠN HÀNG CỦA TÔI
              </h2>

              <p style={styles.cardSub}>
                Theo dõi các đơn hàng bạn đã mua.
              </p>
            </div>

            <div style={styles.count}>
              {orders.length} đơn
            </div>
          </div>

          {orders.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>🧾</div>

              <h3>CHƯA CÓ ĐƠN HÀNG</h3>

              <p>
                Bạn chưa thực hiện đơn hàng nào.
              </p>

              <button
                style={styles.primaryButton}
                onClick={() => {
                  window.location.href = "/shop";
                }}
              >
                MUA KEY
              </button>
            </div>
          ) : (
            <div style={styles.list}>
              {orders.map((order) => {
                const status = getStatus(order.status);

                return (
                  <div
                    key={order.id}
                    style={styles.order}
                  >
                    <div style={styles.orderTop}>
                      <div>
                        <div style={styles.orderId}>
                          ĐƠN #{order.id}
                        </div>

                        <div style={styles.productName}>
                          {order.products?.name ||
                            "Sản phẩm không xác định"}
                        </div>
                      </div>

                      <span
                        style={{
                          ...styles.status,
                          ...statusStyles[status.className],
                        }}
                      >
                        {status.text}
                      </span>
                    </div>

                    <div style={styles.info}>
                      <div>
                        <span>GIÁ</span>
                        <strong>
                          {formatMoney(order.amount)}
                        </strong>
                      </div>

                      <div>
                        <span>THỜI HẠN</span>
                        <strong>
                          {order.products?.duration_days || 0} ngày
                        </strong>
                      </div>

                      <div>
                        <span>NGÀY ĐẶT</span>
                        <strong>
                          {formatDate(order.created_at)}
                        </strong>
                      </div>
                    </div>

                    {order.status === "paid" && (
                      <div style={styles.paidBox}>
                        <div style={styles.paidTitle}>
                          ✅ ĐƠN ĐÃ THANH TOÁN
                        </div>

                        <p>
                          KEY sẽ được hiển thị trong
                          Dashboard khi hệ thống cấp KEY.
                        </p>

                        <button
                          style={styles.primaryButton}
                          onClick={() => {
                            window.location.href =
                              "/dashboard";
                          }}
                        >
                          XEM KEY CỦA TÔI
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const statusStyles = {
  pending: {
    color: "#ff9800",
    borderColor: "#ff9800",
  },

  paid: {
    color: "#00c853",
    borderColor: "#00c853",
  },

  rejected: {
    color: "#ff1744",
    borderColor: "#ff1744",
  },

  other: {
    color: "#aaa",
    borderColor: "#555",
  },
};

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #260914, #080808 50%, #030303)",
    color: "#fff",
    padding: "30px 16px 60px",
    fontFamily: "Arial, Helvetica, sans-serif",
  },

  loading: {
    minHeight: "100vh",
    background: "#050505",
    color: "#ff1744",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
  },

  container: {
    maxWidth: "1100px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "25px",
  },

  logo: {
    color: "#ff1744",
    fontWeight: "900",
    letterSpacing: "3px",
    fontSize: "13px",
    marginBottom: "8px",
  },

  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: "900",
  },

  email: {
    color: "#777",
    marginTop: "8px",
  },

  backButton: {
    background: "#111",
    border: "1px solid #333",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  card: {
    background: "#0c0c0c",
    border: "1px solid #242424",
    borderRadius: "18px",
    padding: "24px",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "20px",
  },

  cardTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "900",
  },

  cardSub: {
    color: "#777",
    marginTop: "7px",
  },

  count: {
    background: "#181818",
    border: "1px solid #333",
    padding: "8px 12px",
    borderRadius: "8px",
    color: "#ff1744",
    fontWeight: "900",
  },

  list: {
    display: "grid",
    gap: "14px",
  },

  order: {
    background: "#070707",
    border: "1px solid #222",
    borderRadius: "14px",
    padding: "18px",
  },

  orderTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
  },

  orderId: {
    color: "#ff1744",
    fontWeight: "900",
    fontSize: "13px",
  },

  productName: {
    marginTop: "6px",
    fontSize: "18px",
    fontWeight: "900",
  },

  status: {
    border: "1px solid",
    borderRadius: "7px",
    padding: "6px 9px",
    fontSize: "10px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  info: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "15px",
    marginTop: "18px",
    paddingTop: "15px",
    borderTop: "1px solid #1b1b1b",
  },

  infoItem: {},

  infoSpan: {},

  paidBox: {
    marginTop: "18px",
    padding: "15px",
    borderRadius: "11px",
    background: "#0d1a12",
    border: "1px solid #164d2c",
  },

  paidTitle: {
    color: "#00c853",
    fontWeight: "900",
  },

  primaryButton: {
    marginTop: "12px",
    background:
      "linear-gradient(90deg, #ff1744, #d50032)",
    border: "none",
    color: "#fff",
    padding: "12px 18px",
    borderRadius: "9px",
    fontWeight: "900",
    cursor: "pointer",
  },

  empty: {
    textAlign: "center",
    padding: "50px 20px",
    color: "#777",
  },

  emptyIcon: {
    fontSize: "45px",
  },
};
