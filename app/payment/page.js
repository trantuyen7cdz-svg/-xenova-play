"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function PaymentPage() {
  const [product, setProduct] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPayment();
  }, []);

  async function loadPayment() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/";
      return;
    }

    setUser(user);

    const params = new URLSearchParams(window.location.search);
    const productId = params.get("product");

    if (!productId) {
      setMessage("Không tìm thấy sản phẩm.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("is_active", true)
      .single();

    if (error) {
      console.error(error);
      setMessage("Không tìm thấy sản phẩm.");
      setLoading(false);
      return;
    }

    setProduct(data);
    setLoading(false);
  }

  async function createOrder() {
    if (!user || !product) return;

    setMessage("Đang tạo đơn hàng...");

    const { data, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        product_id: product.id,
        amount: Number(product.price || 0),
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error(error);
      setMessage("Không tạo được đơn hàng: " + error.message);
      return;
    }

    window.location.href = "/orders?id=" + data.id;
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <h2>Đang tải...</h2>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.box}>
        <a href="/shop" style={styles.back}>
          ← Quay lại Shop
        </a>

        <h1>💳 THANH TOÁN</h1>

        {message && (
          <div style={styles.message}>
            {message}
          </div>
        )}

        {product && (
          <>
            <div style={styles.product}>
              <div style={styles.label}>XENOVA KEY</div>

              <h2>{product.name}</h2>

              <p>
                {product.description ||
                  "Key sử dụng trong 1 ngày"}
              </p>

              <div style={styles.price}>
                {Number(product.price || 0).toLocaleString(
                  "vi-VN"
                )}
                ₫
              </div>

              <p>
                Thời hạn: {product.duration_days} ngày
              </p>
            </div>

            <div style={styles.payment}>
              <h2>Thông tin thanh toán</h2>

              <p>
                Vui lòng tạo đơn hàng để tiếp tục thanh toán.
              </p>

              <button
                onClick={createOrder}
                style={styles.button}
              >
                TẠO ĐƠN HÀNG
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

  message: {
    background: "#211010",
    border: "1px solid #552222",
    padding: "15px",
    borderRadius: "10px",
    marginTop: "20px",
    color: "#ff7777",
  },

  product: {
    background: "#111",
    border: "1px solid #292929",
    borderRadius: "15px",
    padding: "25px",
    marginTop: "25px",
  },

  label: {
    color: "#ff3030",
    fontSize: "13px",
    fontWeight: "bold",
    letterSpacing: "2px",
  },

  price: {
    fontSize: "30px",
    fontWeight: "bold",
    margin: "20px 0",
  },

  payment: {
    background: "#111",
    border: "1px solid #292929",
    borderRadius: "15px",
    padding: "25px",
    marginTop: "15px",
  },

  button: {
    width: "100%",
    padding: "15px",
    marginTop: "15px",
    border: "none",
    borderRadius: "10px",
    background: "#ff3030",
    color: "#fff",
    fontWeight: "bold",
    fontSize: "16px",
  },
};
