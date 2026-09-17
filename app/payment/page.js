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

    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("id");

    if (!orderId) {
      setMessage("Không tìm thấy mã đơn hàng.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        amount,
        status,
        created_at,
        products (
          name,
          duration_days,
          description
        )
      `)
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error(error);
      setMessage("Không tìm thấy đơn hàng.");
      setLoading(false);
      return;
    }

    setOrder(data);
    setLoading(false);
  }

  async function confirmPayment() {
    if (!order) return;

    setMessage("Đang gửi yêu cầu...");

    const { error } = await supabase
      .from("orders")
      .update({
        status: "waiting",
      })
      .eq("id", order.id);

    if (error) {
      console.error(error);
      setMessage("Không thể gửi yêu cầu thanh toán.");
      return;
    }

    setMessage(
      "Đã gửi yêu cầu thanh toán. Vui lòng chờ quản trị viên xác nhận."
    );

    setTimeout(() => {
      window.location.href = "/orders";
    }, 1500);
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.box}>
          <h2>Đang tải đơn hàng...</h2>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.box}>
        <a href="/orders" style={styles.back}>
          ← Quay lại đơn hàng
        </a>

        <h1 style={styles.title}>💳 THANH TOÁN</h1>

        {message && (
          <div style={styles.message}>
            {message}
          </div>
        )}

        {!order ? (
          <div style={styles.card}>
            <h2>Không tìm thấy đơn hàng</h2>
          </div>
        ) : (
          <>
            <div style={styles.card}>
              <div style={styles.label}>
                ĐƠN HÀNG
              </div>

              <h2>
                {order.products?.name || "KEY XENOVA"}
              </h2>

              <p style={styles.gray}>
                {order.products?.description ||
                  "Key sử dụng cho XENOVA PLAY"}
              </p>

              <div style={styles.price}>
                {Number(order.amount || 0).toLocaleString(
                  "vi-VN"
                )}
                ₫
              </div>

              <p style={styles.gray}>
                Thời hạn:{" "}
                {order.products?.duration_days || 0} ngày
              </p>
            </div>

            <div style={styles.card}>
              <div style={styles.label}>
                THÔNG TIN CHUYỂN KHOẢN
              </div>

              <h2>Ngân hàng</h2>

              <p>
                <b>Ngân hàng:</b> MB Bank
              </p>

              <p>
                <b>STK:</b> 9365717262
              </p>

              <p>
                <b>Chủ tài khoản:</b> TRAN VAN TUYEN
              </p>

              <p>
                <b>Nội dung:</b>{" "}
                XENOVA {order.id}
              </p>

              <div style={styles.warning}>
                Vui lòng chuyển đúng số tiền và ghi
                đúng nội dung chuyển khoản.
              </div>

              <button
                onClick={confirmPayment}
                style={styles.button}
              >
                ✅ ĐÃ THANH TOÁN
              </button>
            </div>
          </>
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

  box: {
    maxWidth: "700px",
    margin: "0 auto",
  },

  back: {
    color: "#aaa",
    textDecoration: "none",
  },

  title: {
    fontSize: "40px",
    margin: "25px 0",
  },

  card: {
    background: "#111",
    border: "1px solid #292929",
    borderRadius: "15px",
    padding: "25px",
    marginTop: "20px",
  },

  label: {
    color: "#ff3030",
    fontSize: "12px",
    fontWeight: "bold",
    letterSpacing: "3px",
  },

  gray: {
    color: "#888",
  },

  price: {
    fontSize: "30px",
    fontWeight: "bold",
    margin: "20px 0",
  },

  warning: {
    background: "#211010",
    border: "1px solid #552222",
    color: "#ff8888",
    padding: "15px",
    borderRadius: "10px",
    marginTop: "20px",
  },

  message: {
    background: "#111",
    border: "1px solid #333",
    padding: "15px",
    borderRadius: "10px",
    marginTop: "15px",
    color: "#ff7777",
  },

  button: {
    width: "100%",
    padding: "15px",
    marginTop: "20px",
    border: "none",
    borderRadius: "10px",
    background: "#ff3030",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};
