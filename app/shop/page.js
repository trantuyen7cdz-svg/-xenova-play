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
      .order("price", { ascending: true });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setProducts(data || []);
    setLoading(false);
  }

  function buyProduct(product) {
    window.location.href = `/payment?product=${product.id}`;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "#fff",
        padding: "30px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <a
          href="/dashboard"
          style={{
            color: "#aaa",
            textDecoration: "none",
          }}
        >
          ← Dashboard
        </a>

        <h1
          style={{
            fontSize: "42px",
            margin: "25px 0 5px",
          }}
        >
          🛒 SHOP
        </h1>

        <p style={{ color: "#888" }}>
          Chọn KEY bạn muốn mua
        </p>

        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 0",
              color: "#888",
            }}
          >
            Đang tải sản phẩm...
          </div>
        )}

        {!loading && products.length === 0 && (
          <div
            style={{
              marginTop: "30px",
              padding: "50px 20px",
              background: "#111",
              border: "1px solid #292929",
              borderRadius: "15px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "45px" }}>📦</div>

            <h2>Chưa có sản phẩm</h2>

            <p style={{ color: "#777" }}>
              Hiện chưa có KEY nào được bán.
            </p>
          </div>
        )}

        {!loading && products.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "20px",
              marginTop: "30px",
            }}
          >
            {products.map((product) => (
              <div
                key={product.id}
                style={{
                  background: "#111",
                  border: "1px solid #292929",
                  borderRadius: "15px",
                  padding: "25px",
                }}
              >
                <div
                  style={{
                    color: "#ff3030",
                    fontSize: "12px",
                    fontWeight: "bold",
                    letterSpacing: "3px",
                  }}
                >
                  XENOVA KEY
                </div>

                <h2
                  style={{
                    margin: "15px 0 10px",
                  }}
                >
                  {product.name}
                </h2>

                <p
                  style={{
                    color: "#888",
                    minHeight: "45px",
                  }}
                >
                  {product.description ||
                    "Key sử dụng cho XENOVA PLAY"}
                </p>

                <div
                  style={{
                    fontSize: "30px",
                    fontWeight: "bold",
                    margin: "20px 0",
                  }}
                >
                  {Number(product.price || 0).toLocaleString(
                    "vi-VN"
                  )}
                  ₫
                </div>

                <div
                  style={{
                    color: "#777",
                    fontSize: "14px",
                    marginBottom: "20px",
                  }}
                >
                  Thời hạn: {product.duration_days} ngày
                </div>

                <button
                  onClick={() => buyProduct(product)}
                  style={{
                    width: "100%",
                    padding: "15px",
                    border: "none",
                    borderRadius: "10px",
                    background: "#ff3030",
                    color: "#fff",
                    fontSize: "16px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  🛒 MUA NGAY
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
