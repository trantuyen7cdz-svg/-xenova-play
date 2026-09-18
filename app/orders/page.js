"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadOrders() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("Vui lòng đăng nhập để xem đơn hàng.");
        setLoading(false);
        return;
      }

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
          transaction_id,
          products (
            id,
            name,
            price,
            duration_days
          )
        `)
        .eq("user_id", user.id)
        .order("id", { ascending: false });

      if (error) {
        console.error("ORDERS ERROR:", error);
        setMessage("Không thể tải lịch sử đơn hàng.");
        setLoading(false);
        return;
      }

      setOrders(data || []);
    } catch (error) {
      console.error(error);
      setMessage("Đã xảy ra lỗi.");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("vi-VN") + "đ";
  }

  function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleString("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  function getStatus(status) {
    switch (status) {
      case "completed":
        return {
          text: "ĐÃ HOÀN TẤT",
          background: "#12351f",
          color: "#5ee58a",
        };

      case "pending":
      case "waiting":
        return {
          text: "ĐANG XỬ LÝ",
          background: "#352d12",
          color: "#ffd866",
        };

      case "failed":
      case "rejected":
        return {
          text: "ĐÃ HỦY",
          background: "#35171a",
          color: "#ff777d",
        };

      default:
        return {
          text: status || "KHÔNG RÕ",
          background: "#202733",
          color: "#aeb8c9",
        };
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}
        <div style={styles.header}>
          <div>
            <div style={styles.badge}>
              XENOVA PLAY
            </div>

            <h1 style={styles.title}>
              📦 ĐƠN HÀNG CỦA TÔI
            </h1>

            <p style={styles.subtitle}>
              Xem lại toàn bộ lịch sử mua KEY của bạn.
            </p>
          </div>

          <Link href="/shop" style={styles.shopButton}>
            🛒 CỬA HÀNG
          </Link>
        </div>

        {/* LOADING */}
        {loading && (
          <div style={styles.box}>
            Đang tải đơn hàng...
          </div>
        )}

        {/* MESSAGE */}
        {!loading && message && (
          <div style={styles.errorBox}>
            {message}
          </div>
        )}

        {/* EMPTY */}
        {!loading && !message && orders.length === 0 && (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>
              📦
            </div>

            <h2>Chưa có đơn hàng</h2>

            <p>
              Bạn chưa mua KEY nào.
            </p>

            <Link
              href="/shop"
              style={styles.primaryButton}
            >
              🛒 ĐI ĐẾN CỬA HÀNG
            </Link>
          </div>
        )}

        {/* ORDERS */}
        {!loading && !message && orders.length > 0 && (
          <div style={styles.list}>
            {orders.map((order) => {
              const status = getStatus(order.status);

              return (
                <div
                  key={order.id}
                  style={styles.card}
                >
                  <div style={styles.cardHeader}>
                    <div>
                      <div style={styles.orderLabel}>
                        MÃ ĐƠN
                      </div>

                      <div style={styles.orderId}>
                        #{order.id}
                      </div>
                    </div>

                    <div
                      style={{
                        ...styles.status,
                        background: status.background,
                        color: status.color,
                      }}
                    >
                      {status.text}
                    </div>
                  </div>

                  <div style={styles.divider} />

                  <div style={styles.productRow}>
                    <div style={styles.productIcon}>
                      🔑
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={styles.productName}>
                        {order.products?.name ||
                          `Sản phẩm #${order.product_id}`}
                      </div>

                      <div style={styles.productInfo}>
                        {order.products?.duration_days
                          ? `Thời hạn ${order.products.duration_days} ngày`
                          : "KEY"}
                      </div>
                    </div>

                    <div style={styles.amount}>
                      {formatMoney(order.amount)}
                    </div>
                  </div>

                  <div style={styles.infoGrid}>
                    <div style={styles.info}>
                      <span>Ngày mua</span>
                      <strong>
                        {formatDate(order.created_at)}
                      </strong>
                    </div>

                    <div style={styles.info}>
                      <span>Cập nhật</span>
                      <strong>
                        {formatDate(order.updated_at)}
                      </strong>
                    </div>

                    <div style={styles.info}>
                      <span>Giá sản phẩm</span>
                      <strong>
                        {formatMoney(
                          order.products?.price ||
                            order.amount
                        )}
                      </strong>
                    </div>

                    <div style={styles.info}>
                      <span>Giao dịch</span>
                      <strong>
                        {order.transaction_id
                          ? "Đã tạo"
                          : "—"}
                      </strong>
                    </div>
                  </div>

                  <div style={styles.footer}>
                    <span>
                      {order.status === "completed"
                        ? "KEY đã được cấp vào tài khoản."
                        : "Đơn hàng chưa hoàn tất."}
                    </span>

                    {order.status === "completed" && (
                      <Link
                        href="/keys"
                        style={styles.keyButton}
                      >
                        🔑 XEM KEY
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BOTTOM */}
        <div style={styles.bottom}>
          <Link href="/dashboard">
            👤 Tài khoản
          </Link>

          <Link href="/keys">
            🔑 KEY của tôi
          </Link>

          <Link href="/deposit">
            💰 Nạp tiền
          </Link>
        </div>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #111d36 0%, #070b12 42%, #05070b 100%)",
    color: "#fff",
    padding: "25px 15px 60px",
  },

  container: {
    width: "100%",
    maxWidth: "900px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "30px",
  },

  badge: {
    display: "inline-block",
    padding: "7px 11px",
    borderRadius: "999px",
    background: "#101b30",
    border: "1px solid #263c65",
    color: "#72a9ff",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "1px",
  },

  title: {
    fontSize: "clamp(26px, 5vw, 40px)",
    margin: "12px 0 7px",
  },

  subtitle: {
    color: "#7f8ba0",
    margin: 0,
  },

  shopButton: {
    padding: "11px 15px",
    borderRadius: "10px",
    background: "#fff",
    color: "#000",
    textDecoration: "none",
    fontWeight: "800",
    fontSize: "13px",
    whiteSpace: "nowrap",
  },

  box: {
    padding: "50px",
    textAlign: "center",
    background: "#0d1420",
    border: "1px solid #202d42",
    borderRadius: "16px",
    color: "#8591a3",
  },

  errorBox: {
    padding: "18px",
    background: "#241417",
    border: "1px solid #5b292f",
    borderRadius: "12px",
    color: "#ff858c",
  },

  empty: {
    padding: "60px 20px",
    textAlign: "center",
    background: "#0d1420",
    border: "1px solid #202d42",
    borderRadius: "17px",
  },

  emptyIcon: {
    fontSize: "50px",
  },

  primaryButton: {
    display: "inline-block",
    marginTop: "15px",
    padding: "12px 17px",
    borderRadius: "9px",
    background: "#fff",
    color: "#000",
    textDecoration: "none",
    fontWeight: "800",
  },

  list: {
    display: "grid",
    gap: "15px",
  },

  card: {
    background: "#0d1420",
    border: "1px solid #202d42",
    borderRadius: "17px",
    padding: "19px",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
  },

  orderLabel: {
    color: "#68768c",
    fontSize: "10px",
    fontWeight: "700",
  },

  orderId: {
    marginTop: "3px",
    fontSize: "20px",
    fontWeight: "900",
  },

  status: {
    padding: "7px 9px",
    borderRadius: "7px",
    fontSize: "10px",
    fontWeight: "900",
  },

  divider: {
    height: "1px",
    background: "#202b3d",
    margin: "17px 0",
  },

  productRow: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  productIcon: {
    width: "45px",
    height: "45px",
    display: "grid",
    placeItems: "center",
    borderRadius: "11px",
    background: "#151f30",
    fontSize: "22px",
  },

  productName: {
    fontWeight: "800",
    fontSize: "16px",
  },

  productInfo: {
    marginTop: "4px",
    color: "#77849a",
    fontSize: "12px",
  },

  amount: {
    fontSize: "17px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "10px",
    marginTop: "17px",
  },

  info: {
    padding: "11px",
    background: "#080d15",
    borderRadius: "9px",
  },

  bottom: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "20px",
    marginTop: "35px",
    color: "#7d899c",
  },

  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    marginTop: "17px",
    paddingTop: "14px",
    borderTop: "1px solid #202b3d",
    color: "#69778b",
    fontSize: "12px",
  },

  keyButton: {
    padding: "9px 12px",
    borderRadius: "8px",
    background: "#fff",
    color: "#000",
    textDecoration: "none",
    fontWeight: "800",
    fontSize: "11px",
  },
};
