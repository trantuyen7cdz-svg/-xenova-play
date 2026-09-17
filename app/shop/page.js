"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ShopPage() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadShop();
  }, []);

  async function loadShop() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/";
      return;
    }

    setUser(user);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      setMessage(
        "Không thể tải sản phẩm: " +
          error.message
      );
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  }

  async function buyProduct(product) {
    if (!user) return;

    setBuying(product.id);
    setMessage("");

    const { data, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        product_id: product.id,
        amount: Number(product.price || 0),
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error(error);

      setMessage(
        "Không thể tạo đơn hàng: " +
          error.message
      );

      setBuying(null);
      return;
    }

    window.location.href =
      "/orders?id=" + data.id;
  }

  if (loading) {
    return (
      <main style={styles.loading}>
        ĐANG TẢI SHOP...
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        <header style={styles.header}>
          <div>
            <div style={styles.logo}>
              XENOVA PLAY
            </div>

            <h1 style={styles.title}>
              SHOP KEY
            </h1>

            <p style={styles.sub}>
              Chọn KEY bạn muốn mua
            </p>
          </div>

          <button
            style={styles.back}
            onClick={() => {
              window.location.href =
                "/dashboard";
            }}
          >
            ← DASHBOARD
          </button>
        </header>

        {message && (
          <div style={styles.message}>
            {message}
          </div>
        )}

        {products.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>
              🛒
            </div>

            <h2>
              CHƯA CÓ SẢN PHẨM
            </h2>

            <p>
              Hiện chưa có sản phẩm đang bán.
            </p>
          </div>
        ) : (
          <div style={styles.grid}>

            {products.map((product) => (
              <div
                key={product.id}
                style={styles.card}
              >
                <div style={styles.icon}>
                  🔑
                </div>

                <h2 style={styles.name}>
                  {product.name}
                </h2>

                <p style={styles.description}>
                  {product.description ||
                    "KEY XENOVA PLAY"}
                </p>

                <div style={styles.price}>
                  {Number(
                    product.price || 0
                  ).toLocaleString("vi-VN")}
                  đ
                </div>

                <div style={styles.duration}>
                  ⏱ {product.duration_days || 1} ngày
                </div>

                <button
                  style={{
                    ...styles.buy,
                    opacity:
                      buying === product.id
                        ? 0.6
                        : 1,
                  }}
                  disabled={
                    buying === product.id
                  }
                  onClick={() =>
                    buyProduct(product)
                  }
                >
                  {buying === product.id
                    ? "ĐANG TẠO ĐƠN..."
                    : "🛒 MUA NGAY"}
                </button>
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
    background:
      "radial-gradient(circle at top, #250914, #070707 55%, #020202)",
    color: "#fff",
    padding: "30px 16px 60px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
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
    marginBottom: "30px",
  },

  logo: {
    color: "#ff1744",
    fontSize: "13px",
    fontWeight: "900",
    letterSpacing: "3px",
    marginBottom: "8px",
  },

  title: {
    margin: 0,
    fontSize: "32px",
    fontWeight: "900",
  },

  sub: {
    color: "#777",
  },

  back: {
    background: "#111",
    border: "1px solid #333",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "18px",
  },

  card: {
    background:
      "linear-gradient(145deg, #121212, #080808)",
    border: "1px solid #292929",
    borderRadius: "18px",
    padding: "25px",
  },

  icon: {
    fontSize: "40px",
  },

  name: {
    fontSize: "20px",
    fontWeight: "900",
  },

  description: {
    color: "#777",
    minHeight: "40px",
  },

  price: {
    color: "#ff1744",
    fontSize: "28px",
    fontWeight: "900",
    marginTop: "20px",
  },

  duration: {
    color: "#999",
    marginTop: "8px",
  },

  buy: {
    width: "100%",
    marginTop: "20px",
    padding: "14px",
    border: "none",
    borderRadius: "10px",
    background:
      "linear-gradient(90deg, #ff1744, #d50032)",
    color: "#fff",
    fontWeight: "900",
    cursor: "pointer",
  },

  message: {
    background: "#17090d",
    border:
      "1px solid rgba(255,23,68,.3)",
    color: "#ff6684",
    padding: "13px",
    borderRadius: "10px",
    marginBottom: "20px",
  },

  empty: {
    background: "#0c0c0c",
    border: "1px solid #242424",
    borderRadius: "18px",
    textAlign: "center",
    padding: "70px 20px",
  },

  emptyIcon: {
    fontSize: "50px",
  },
};
