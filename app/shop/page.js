"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

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

    if (!error && data) {
      setProducts(data);
    }

    setLoading(false);
  }

  function buyProduct(product) {
    alert(
      `Bạn đã chọn ${product.name}.\\n\\nHệ thống thanh toán sẽ được tích hợp ở bước tiếp theo.`
    );
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
              Chọn sản phẩm bạn muốn sử dụng
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

        {products.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>
              🛒
            </div>

            <h2>
              CHƯA CÓ SẢN PHẨM
            </h2>

            <p>
              Hiện chưa có sản phẩm nào được mở bán.
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
                  ⏱ Thời hạn:{" "}
                  {product.duration_days || 1} ngày
                </div>

                <button
                  style={styles.buy}
                  onClick={() =>
                    buyProduct(product)
                  }
                >
                  🛒 MUA NGAY
                </button>

              </div>
            ))}

          </div>
        )}

      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .nothing {
          display: none;
        }

        @media (max-width: 650px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #250914 0%, #070707 50%, #020202 100%)",
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
    marginTop: "8px",
  },

  back: {
    background: "#111",
    color: "#fff",
    border: "1px solid #333",
    borderRadius: "10px",
    padding: "12px 16px",
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
    boxShadow:
      "0 15px 45px rgba(0,0,0,.35)",
  },

  icon: {
    fontSize: "38px",
    marginBottom: "15px",
  },

  name: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "900",
  },

  description: {
    color: "#777",
    minHeight: "40px",
    lineHeight: "1.5",
  },

  price: {
    color: "#ff1744",
    fontSize: "28px",
    fontWeight: "900",
    marginTop: "20px",
  },

  duration: {
    color: "#999",
    fontSize: "13px",
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
