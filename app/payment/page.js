"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function PaymentPage() {
  const [product, setProduct] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadPayment();
  }, []);

  async function loadPayment() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUser(user);

      const params = new URLSearchParams(
        window.location.search
      );

      const productId = params.get("product");

      if (!productId) {
        setMessage("Không tìm thấy mã sản phẩm.");
        setLoading(false);
        return;
      }

      /*
       * Chỉ lấy theo ID.
       *
       * Không kiểm tra is_active ở đây vì database
       * của bạn đang có cả active và is_active.
       *
       * RLS của Supabase đã kiểm tra:
       * active = true
       */
      const { data, error } = await supabase
        .from("products")
        .select(
          "id,name,description,price,duration_days,active,is_active"
        )
        .eq("id", productId)
        .single();

      if (error || !data) {
        console.error("PAYMENT PRODUCT ERROR:", error);

        setMessage(
          "Không tìm thấy sản phẩm hoặc sản phẩm đã ngừng bán."
        );

        setLoading(false);
        return;
      }

      setProduct(data);
      setLoading(false);
    } catch (error) {
      console.error("PAYMENT ERROR:", error);

      setMessage(
        "Đã xảy ra lỗi khi tải sản phẩm."
      );

      setLoading(false);
    }
  }

  async function createOrder() {
    if (!user || !product || creating) return;

    setCreating(true);
    setMessage("");

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
      console.error("CREATE ORDER ERROR:", error);

      setMessage(
        "Không tạo được đơn hàng: " +
          error.message
      );

      setCreating(false);
      return;
    }

    window.location.href =
      "/orders?id=" + data.id;
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.box}>
          <div style={styles.loading}>
            Đang tải sản phẩm...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.box}>
        <a
          href="/shop"
          style={styles.back}
        >
          ← Quay lại Shop
        </a>

        <div style={styles.header}>
          <div style={styles.logo}>
            XENOVA PLAY
          </div>

          <h1 style={styles.title}>
            THANH TOÁN
          </h1>

          <p style={styles.subtitle}>
            Kiểm tra thông tin trước khi tạo
            đơn hàng.
          </p>
        </div>

        {message && (
          <div style={styles.error}>
            ❌ {message}
          </div>
        )}

        {product && (
          <>
            <section style={styles.product}>
              <div style={styles.label}>
                XENOVA KEY
              </div>

              <h2 style={styles.productName}>
                {product.name}
              </h2>

              <p style={styles.description}>
                {product.description ||
                  "Key sử dụng cho XENOVA PLAY"}
              </p>

              <div style={styles.price}>
                {Number(
                  product.price || 0
                ).toLocaleString("vi-VN")}
                ₫
              </div>

              <div style={styles.duration}>
                ⏱ Thời hạn:{" "}
                <b>
                  {product.duration_days} ngày
                </b>
              </div>
            </section>

            <section style={styles.payment}>
              <h2>
                💳 TẠO ĐƠN HÀNG
              </h2>

              <p style={{ color: "#888", lineHeight: 1.6 }}>
                Sau khi tạo đơn, hệ thống sẽ
                chuyển bạn đến trang đơn hàng
                để tiếp tục thanh toán.
              </p>

              <button
                onClick={createOrder}
                disabled={creating}
                style={{
                  ...styles.button,
                  opacity: creating ? 0.6 : 1,
                }}
              >
                {creating
                  ? "ĐANG TẠO ĐƠN..."
                  : "TẠO ĐƠN HÀNG"}
              </button>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #25060d, #080808 45%, #030303)",
    color: "#fff",
    padding: "30px 20px 60px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  box: {
    width: "100%",
    maxWidth: "700px",
    margin: "0 auto",
  },

  back: {
    color: "#aaa",
    textDecoration: "none",
    fontSize: "14px",
  },

  header: {
    marginTop: "35px",
  },

  logo: {
    color: "#ff1744",
    fontSize: "13px",
    fontWeight: "900",
    letterSpacing: "3px",
  },

  title: {
    margin: "8px 0 5px",
    fontSize: "42px",
    fontWeight: "900",
  },

  subtitle: {
    color: "#777",
    margin: 0,
  },

  error: {
    marginTop: "20px",
    padding: "15px",
    borderRadius: "12px",
    background: "#210d0d",
    border: "1px solid #632020",
    color: "#ff6b6b",
  },

  product: {
    marginTop: "25px",
    padding: "25px",
    borderRadius: "18px",
    border: "1px solid #292929",
    background: "#101010",
  },

  label: {
    color: "#ff1744",
    fontSize: "12px",
    fontWeight: "900",
    letterSpacing: "2px",
  },

  productName: {
    margin: "12px 0 8px",
    fontSize: "27px",
    fontWeight: "900",
  },

  description: {
    color: "#888",
    lineHeight: 1.6,
  },

  price: {
    marginTop: "20px",
    color: "#ff1744",
    fontSize: "34px",
    fontWeight: "900",
  },

  duration: {
    marginTop: "12px",
    color: "#888",
  },

  payment: {
    marginTop: "15px",
    padding: "25px",
    borderRadius: "18px",
    border: "1px solid #292929",
    background: "#101010",
  },

  button: {
    width: "100%",
    marginTop: "18px",
    padding: "16px",
    border: "none",
    borderRadius: "11px",
    background:
      "linear-gradient(90deg, #ff1744, #d50032)",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "900",
    cursor: "pointer",
  },

  loading: {
    padding: "80px 0",
    textAlign: "center",
    color: "#888",
  },
};
