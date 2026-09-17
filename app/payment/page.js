"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function PaymentPage() {
  const [order, setOrder] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    loadPayment();
  }, []);

  async function loadPayment() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/";
        return;
      }

      const params = new URLSearchParams(
        window.location.search
      );

      const orderId = params.get("id");

      if (!orderId) {
        setErrorText("Không có mã đơn hàng.");
        setLoading(false);
        return;
      }

      const { data: orderData, error: orderError } =
        await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .eq("user_id", user.id)
          .single();

      if (orderError || !orderData) {
        setErrorText(
          "Không tìm thấy đơn hàng."
        );
        setLoading(false);
        return;
      }

      setOrder(orderData);

      if (orderData.product_id) {
        const { data: productData } =
          await supabase
            .from("products")
            .select("*")
            .eq("id", orderData.product_id)
            .single();

        if (productData) {
          setProduct(productData);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      setErrorText(
        "Có lỗi khi tải trang thanh toán."
      );
      setLoading(false);
    }
  }

  function money(value) {
    return (
      Number(value || 0).toLocaleString("vi-VN") +
      "đ"
    );
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      alert("Đã sao chép!");
    } catch {
      alert("Không thể sao chép tự động.");
    }
  }

  if (loading) {
    return (
      <main style={styles.center}>
        <div style={styles.loading}>
          XENOVA PLAY
          <br />
          <span>ĐANG TẢI...</span>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main style={styles.page}>
        <div style={styles.errorBox}>
          <h1>⚠️ LỖI</h1>
          <p>{errorText}</p>

          <button
            style={styles.button}
            onClick={() => {
              window.location.href =
                "/orders";
            }}
          >
            QUAY LẠI ĐƠN HÀNG
          </button>
        </div>
      </main>
    );
  }

  const orderCode =
    "XENO" +
    String(order.id)
      .slice(0, 8)
      .toUpperCase();

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        <div style={styles.logo}>
          XENOVA PLAY
        </div>

        <h1 style={styles.title}>
          THANH TOÁN
        </h1>

        <p style={styles.subtitle}>
          Hoàn tất đơn hàng của bạn
        </p>

        {/* ĐƠN HÀNG */}

        <div style={styles.card}>

          <div style={styles.row}>
            <span>MÃ ĐƠN</span>

            <strong>
              #{String(order.id)
                .slice(0, 8)
                .toUpperCase()}
            </strong>
          </div>

          <div style={styles.productBox}>

            <div style={styles.icon}>
              🔑
            </div>

            <div>
              <h2 style={styles.productName}>
                {product?.name || "KEY XENOVA"}
              </h2>

              <p style={styles.muted}>
                {product?.description ||
                  "Key sử dụng cho XENOVA PLAY"}
              </p>
            </div>

          </div>

          <div style={styles.totalRow}>
            <span>TỔNG TIỀN</span>

            <strong style={styles.price}>
              {money(order.amount)}
            </strong>
          </div>

        </div>

        {/* NGÂN HÀNG */}

        <div style={styles.card}>

          <h2 style={styles.sectionTitle}>
            💳 CHUYỂN KHOẢN NGÂN HÀNG
          </h2>

          <div style={styles.warning}>
            ⚠️ Chuyển đúng số tiền và nội dung
            để đơn hàng được đối soát chính xác.
          </div>

          <Info
            label="NGÂN HÀNG"
            value="VIETCOMBANK"
          />

          <Info
            label="CHỦ TÀI KHOẢN"
            value="TRAN VAN TUYEN"
          />

          <Info
            label="SỐ TÀI KHOẢN"
            value="9365717262"
            copy={() =>
              copyText("9365717262")
            }
          />

          <Info
            label="SỐ TIỀN"
            value={money(order.amount)}
            copy={() =>
              copyText(
                String(
                  Number(order.amount || 0)
                )
              )
            }
          />

          <Info
            label="NỘI DUNG CHUYỂN KHOẢN"
            value={orderCode}
            copy={() =>
              copyText(orderCode)
            }
          />

        </div>

        <button
          style={styles.paidButton}
          onClick={() => {
            alert(
              "Yêu cầu thanh toán đã được ghi nhận. Admin sẽ kiểm tra giao dịch."
            );
          }}
        >
          ✓ TÔI ĐÃ CHUYỂN KHOẢN
        </button>

        <button
          style={styles.back}
          onClick={() => {
            window.location.href =
              "/orders";
          }}
        >
          ← QUAY LẠI ĐƠN HÀNG
        </button>

      </div>
    </main>
  );
}

function Info({ label, value, copy }) {
  return (
    <div style={styles.info}>

      <div style={styles.infoLabel}>
        {label}
      </div>

      <div style={styles.infoBottom}>

        <strong>{value}</strong>

        {copy && (
          <button
            style={styles.copy}
            onClick={copy}
          >
            SAO CHÉP
          </button>
        )}

      </div>

    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #260914, #070707 55%, #020202)",
    color: "#fff",
    padding: "35px 16px 60px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  center: {
    minHeight: "100vh",
    background: "#050505",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },

  loading: {
    color: "#ff1744",
    fontWeight: "900",
    letterSpacing: "3px",
    lineHeight: "2",
  },

  container: {
    width: "100%",
    maxWidth: "650px",
    margin: "0 auto",
  },

  logo: {
    color: "#ff1744",
    fontSize: "13px",
    fontWeight: "900",
    letterSpacing: "3px",
  },

  title: {
    fontSize: "32px",
    fontWeight: "900",
    margin: "10px 0 5px",
  },

  subtitle: {
    color: "#777",
    marginBottom: "25px",
  },

  card: {
    background: "#0c0c0c",
    border: "1px solid #292929",
    borderRadius: "17px",
    padding: "20px",
    marginBottom: "16px",
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    paddingBottom: "17px",
    borderBottom: "1px solid #202020",
  },

  productBox: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "20px 0",
  },

  icon: {
    width: "52px",
    height: "52px",
    borderRadius: "12px",
    background: "#171717",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
    flexShrink: 0,
  },

  productName: {
    margin: 0,
    fontSize: "17px",
  },

  muted: {
    color: "#777",
    fontSize: "13px",
    margin: "6px 0 0",
  },

  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    paddingTop: "17px",
    borderTop: "1px solid #202020",
  },

  price: {
    color: "#ff1744",
    fontSize: "20px",
  },

  sectionTitle: {
    fontSize: "18px",
    margin: "0 0 18px",
  },

  warning: {
    background: "#1b1405",
    border: "1px solid #4a3500",
    color: "#ffb300",
    borderRadius: "9px",
    padding: "12px",
    fontSize: "12px",
    lineHeight: "1.5",
    marginBottom: "12px",
  },

  info: {
    padding: "14px 0",
    borderBottom: "1px solid #1c1c1c",
  },

  infoLabel: {
    color: "#666",
    fontSize: "10px",
    fontWeight: "900",
    marginBottom: "7px",
  },

  infoBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  },

  copy: {
    background: "#181818",
    color: "#fff",
    border: "1px solid #333",
    borderRadius: "7px",
    padding: "7px 9px",
    fontSize: "9px",
    fontWeight: "900",
  },

  paidButton: {
    width: "100%",
    padding: "15px",
    border: "none",
    borderRadius: "10px",
    background:
      "linear-gradient(90deg, #ff1744, #d50032)",
    color: "#fff",
    fontWeight: "900",
    fontSize: "14px",
  },

  back: {
    width: "100%",
    padding: "14px",
    marginTop: "10px",
    background: "transparent",
    border: "none",
    color: "#777",
    fontWeight: "700",
  },

  errorBox: {
    maxWidth: "500px",
    margin: "100px auto",
    background: "#0c0c0c",
    border: "1px solid #292929",
    borderRadius: "17px",
    padding: "30px",
    textAlign: "center",
  },

  button: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "10px",
    background: "#ff1744",
    color: "#fff",
    fontWeight: "900",
  },
};
