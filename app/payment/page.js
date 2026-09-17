"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function PaymentPage() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadOrder();
  }, []);

  async function loadOrder() {
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
      setMessage("Không tìm thấy mã đơn hàng.");
      setLoading(false);
      return;
    }

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
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      setMessage(
        "Đơn hàng không tồn tại hoặc bạn không có quyền xem."
      );
      setLoading(false);
      return;
    }

    setOrder(data);
    setLoading(false);
  }

  function formatMoney(amount) {
    return (
      Number(amount || 0).toLocaleString("vi-VN") +
      "đ"
    );
  }

  function copyText(text) {
    navigator.clipboard.writeText(text);

    setMessage("Đã sao chép.");
    
    setTimeout(() => {
      setMessage("");
    }, 2000);
  }

  if (loading) {
    return (
      <main style={styles.loading}>
        ĐANG TẢI THANH TOÁN...
      </main>
    );
  }

  if (!order) {
    return (
      <main style={styles.page}>
        <div style={styles.box}>
          <h1>KHÔNG TÌM THẤY ĐƠN</h1>

          <p style={styles.error}>
            {message}
          </p>

          <button
            style={styles.button}
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

  if (
    order.status === "paid" ||
    order.status === "completed"
  ) {
    return (
      <main style={styles.page}>
        <div style={styles.box}>

          <div style={styles.successIcon}>
            ✓
          </div>

          <h1>ĐƠN ĐÃ THANH TOÁN</h1>

          <p style={styles.desc}>
            Đơn hàng này đã được thanh toán.
          </p>

          <button
            style={styles.button}
            onClick={() => {
              window.location.href =
                "/orders";
            }}
          >
            XEM ĐƠN HÀNG
          </button>

        </div>
      </main>
    );
  }

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
          Hoàn tất thanh toán cho đơn hàng
        </p>

        <section style={styles.card}>

          <div style={styles.orderNumber}>
            <span>MÃ ĐƠN</span>

            <strong>
              #{order.id
                .slice(0, 8)
                .toUpperCase()}
            </strong>
          </div>

          <div style={styles.product}>

            <div style={styles.icon}>
              🔑
            </div>

            <div style={styles.productInfo}>
              <h2>
                {order.products?.name ||
                  "Sản phẩm"}
              </h2>

              <p>
                {order.products?.description ||
                  "KEY XENOVA PLAY"}
              </p>
            </div>

          </div>

          <div style={styles.total}>
            <span>
              TỔNG THANH TOÁN
            </span>

            <strong>
              {formatMoney(order.amount)}
            </strong>
          </div>

        </section>

        <section style={styles.card}>

          <h2 style={styles.sectionTitle}>
            💳 THÔNG TIN CHUYỂN KHOẢN
          </h2>

          <div style={styles.notice}>
            ⚠️ Sau khi chuyển khoản, hãy giữ
            lại biên lai để đối soát đơn hàng.
          </div>

          <div style={styles.bankRow}>
            <span>NGÂN HÀNG</span>
            <strong>VIETCOMBANK</strong>
          </div>

          <div style={styles.bankRow}>
            <span>CHỦ TÀI KHOẢN</span>
            <strong>TRAN VAN TUYEN</strong>
          </div>

          <div style={styles.bankRow}>
            <span>SỐ TÀI KHOẢN</span>

            <div style={styles.copyRow}>
              <strong>
                9365717262
              </strong>

              <button
                style={styles.copy}
                onClick={() =>
                  copyText("9365717262")
                }
              >
                SAO CHÉP
              </button>
            </div>
          </div>

          <div style={styles.bankRow}>
            <span>SỐ TIỀN</span>

            <div style={styles.copyRow}>
              <strong style={styles.red}>
                {formatMoney(order.amount)}
              </strong>

              <button
                style={styles.copy}
                onClick={() =>
                  copyText(
                    String(
                      Number(order.amount || 0)
                    )
                  )
                }
              >
                SAO CHÉP
              </button>
            </div>
          </div>

          <div style={styles.bankRow}>
            <span>NỘI DUNG CHUYỂN KHOẢN</span>

            <div style={styles.copyRow}>
              <strong>
                XENO
                {order.id
                  .slice(0, 8)
                  .toUpperCase()}
              </strong>

              <button
                style={styles.copy}
                onClick={() =>
                  copyText(
                    "XENO" +
                      order.id
                        .slice(0, 8)
                        .toUpperCase()
                  )
                }
              >
                SAO CHÉP
              </button>
            </div>
          </div>

        </section>

        {message && (
          <div style={styles.message}>
            {message}
          </div>
        )}

        <button
          style={styles.paidButton}
          onClick={() => {
            alert(
              "Đã ghi nhận yêu cầu. Hệ thống sẽ xác nhận thanh toán sau khi kiểm tra."
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

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #250914, #070707 55%, #020202)",
    color: "#fff",
    padding: "35px 16px 60px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  container: {
    maxWidth: "650px",
    margin: "0 auto",
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

  box: {
    maxWidth: "500px",
    margin: "100px auto",
    background: "#0c0c0c",
    border: "1px solid #282828",
    borderRadius: "18px",
    padding: "30px",
    textAlign: "center",
  },

  logo: {
    color: "#ff1744",
    fontWeight: "900",
    letterSpacing: "3px",
    fontSize: "13px",
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
    border: "1px solid #272727",
    borderRadius: "17px",
    padding: "22px",
    marginBottom: "16px",
  },

  orderNumber: {
    display: "flex",
    justifyContent: "space-between",
    paddingBottom: "17px",
    borderBottom: "1px solid #202020",
  },

  orderNumber: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    paddingBottom: "17px",
    borderBottom: "1px solid #202020",
  },

  product: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "20px 0",
  },

  icon: {
    width: "50px",
    height: "50px",
    background: "#171717",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
  },

  productInfo: {
    flex: 1,
  },

  total: {
    display: "flex",
    justifyContent: "space-between",
    paddingTop: "17px",
    borderTop: "1px solid #202020",
  },

  sectionTitle: {
    margin: "0 0 18px",
    fontSize: "18px",
  },

  notice: {
    background: "#1b1405",
    color: "#ffb300",
    border: "1px solid #4a3500",
    borderRadius: "9px",
    padding: "12px",
    fontSize: "12px",
    lineHeight: "1.5",
    marginBottom: "18px",
  },

  bankRow: {
    padding: "14px 0",
    borderBottom: "1px solid #191919",
  },

  copyRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    marginTop: "7px",
  },

  copy: {
    background: "#181818",
    color: "#fff",
    border: "1px solid #333",
    borderRadius: "7px",
    padding: "7px 9px",
    fontSize: "9px",
    fontWeight: "900",
    cursor: "pointer",
  },

  red: {
    color: "#ff1744",
    fontSize: "18px",
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
    cursor: "pointer",
  },

  back: {
    width: "100%",
    marginTop: "12px",
    background: "transparent",
    border: "none",
    color: "#777",
    padding: "12px",
    cursor: "pointer",
  },

  message: {
    background: "#151515",
    border: "1px solid #292929",
    color: "#ff6684",
    borderRadius: "9px",
    padding: "12px",
    marginBottom: "12px",
    textAlign: "center",
  },

  error: {
    color: "#ff1744",
    marginBottom: "20px",
  },

  desc: {
    color: "#777",
    marginBottom: "25px",
  },

  successIcon: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "#07351c",
    color: "#00c853",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "30px",
    fontWeight: "900",
    margin: "0 auto 20px",
  },

  button: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "10px",
    background: "#ff1744",
    color: "#fff",
    fontWeight: "900",
    cursor: "pointer",
  },
};
