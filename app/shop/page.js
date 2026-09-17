"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadShop();
  }, []);

  async function loadShop() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/";
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (error) {
      console.error(error);
      setMessage("Không thể tải sản phẩm.");
      setLoading(false);
      return;
    }

    setProducts(data || []);
    setLoading(false);
  }

  async function buyProduct(product) {
    try {
      setBuying(product.id);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/";
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          product_id: product.id,
          amount: Number(product.price || 0),
          status: "pending",
        })
        .select("*")
        .single();

      if (error) {
        console.error(error);
        setMessage("Không thể tạo đơn hàng: " + error.message);
        setBuying(null);
        return;
      }

      if (!data || !data.id) {
        setMessage("Không nhận được mã đơn hàng.");
        setBuying(null);
        return;
      }

      window.location.href = "/orders?id=" + data.id;
    } catch (err) {
      console.error(err);
      setMessage("Có lỗi xảy ra.");
      setBuying(null);
    }
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
        <div style={{ marginBottom: "30px" }}>
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
              margin: "20px 0 5px",
            }}
          >
            🛒 SHOP
          </h1>

          <p style={{ color: "#888" }}>
            Chọn sản phẩm bạn muốn mua
          </p>
        </div>

        {message && (
          <div
            style={{
              background: "#211010",
              border: "1px solid #552222",
              padding: "15px",
              borderRadius: "10px",
              marginBottom: "20px",
              color: "#ff7777",
            }}
          >
            {message}
          </div>
        )}

        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px",
              color: "#888",
            }}
          >
            Đang tải sản phẩm...
          </div>
        ) : products.length === 0 ? (
          <div
            style={{
              background: "#111",
              border: "1px solid #222",
              borderRadius: "15px",
              padding: "50px 20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "45px" }}>📦</div>
            <h2>Chưa có sản phẩm</h2>
            <p style={{ color: "#777" }}>
              Hiện chưa có sản phẩm nào đang bán.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "20px",
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
                    fontSize: "13px",
                    color: "#ff4040",
                    fontWeight: "bold",
                    letterSpacing: "2px",
                  }}
                >
                  XENOVA KEY
                </div>

                <h2 style={{ margin: "12px 0" }}>
                  {product.name}
                </h2>

                <p
                  style={{
                    color: "#888",
                    minHeight: "45px",
                  }}
                >
                  {product.description ||
                    "Key sử dụng cho dịch vụ XENOVA."}
                </p>

                <div
                  style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    margin: "20px 0",
                  }}
                >
                  {Number(product.price || 0).toLocaleString(
                    "vi-VN"
                  )}
                  ₫
                </div>

                <p
                  style={{
                    color: "#777",
                    fontSize: "14px",
                  }}
                >
                  Thời hạn: {product.duration_days || 0} ngày
                </p>

                <button
                  onClick={() => buyProduct(product)}
                  disabled={buying === product.id}
                  style={{
                    width: "100%",
                    marginTop: "15px",
                    padding: "14px",
                    border: "none",
                    borderRadius: "10px",
                    background:
                      buying === product.id
                        ? "#555"
                        : "#ff3030",
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: "16px",
                    cursor:
                      buying === product.id
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {buying === product.id
                    ? "ĐANG XỬ LÝ..."
                    : "MUA NGAY"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
