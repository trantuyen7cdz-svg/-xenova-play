"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function KeysPage() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadKeys() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setMessage("Vui lòng đăng nhập để xem KEY.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("keys")
        .select(`
          id,
          key_code,
          product_id,
          order_id,
          status,
          created_at,
          sold_at,
          expires_at,
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
        console.error(error);
        setMessage("Không thể tải danh sách KEY.");
        setLoading(false);
        return;
      }

      setKeys(data || []);
    } catch (error) {
      console.error(error);
      setMessage("Đã xảy ra lỗi.");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadKeys();
  }, []);

  async function copyKey(value) {
    try {
      await navigator.clipboard.writeText(value);
      alert("Đã copy KEY!");
    } catch {
      alert("Không thể copy KEY.");
    }
  }

  function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleString("vi-VN");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#070b12",
        color: "#fff",
        padding: "25px 15px",
      }}
    >
      <div
        style={{
          maxWidth: "850px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: "28px",
            marginBottom: "8px",
          }}
        >
          🔑 KEY CỦA TÔI
        </h1>

        <p
          style={{
            color: "#8d98aa",
            marginBottom: "25px",
          }}
        >
          Danh sách KEY bạn đã mua
        </p>

        {loading && (
          <div
            style={{
              padding: "30px",
              textAlign: "center",
              background: "#101722",
              borderRadius: "14px",
            }}
          >
            Đang tải KEY...
          </div>
        )}

        {!loading && message && (
          <div
            style={{
              padding: "25px",
              background: "#101722",
              borderRadius: "14px",
              color: "#ff7777",
            }}
          >
            {message}
          </div>
        )}

        {!loading && !message && keys.length === 0 && (
          <div
            style={{
              padding: "35px",
              textAlign: "center",
              background: "#101722",
              border: "1px solid #202c3d",
              borderRadius: "14px",
            }}
          >
            <div style={{ fontSize: "45px" }}>🔑</div>

            <h2>Chưa có KEY</h2>

            <p style={{ color: "#8d98aa" }}>
              Bạn chưa mua KEY nào.
            </p>

            <a
              href="/products"
              style={{
                display: "inline-block",
                marginTop: "10px",
                padding: "12px 18px",
                background: "#fff",
                color: "#000",
                borderRadius: "9px",
                textDecoration: "none",
                fontWeight: "700",
              }}
            >
              MUA KEY
            </a>
          </div>
        )}

        {!loading && keys.length > 0 && (
          <div
            style={{
              display: "grid",
              gap: "15px",
            }}
          >
            {keys.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "#101722",
                  border: "1px solid #202c3d",
                  borderRadius: "14px",
                  padding: "18px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                    marginBottom: "18px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "#7f8a9d",
                        fontSize: "12px",
                      }}
                    >
                      SẢN PHẨM
                    </div>

                    <h2 style={{ margin: "5px 0 0" }}>
                      {item.products?.name ||
                        `Sản phẩm #${item.product_id}`}
                    </h2>
                  </div>

                  <div
                    style={{
                      height: "fit-content",
                      padding: "7px 10px",
                      borderRadius: "7px",
                      background:
                        item.status === "sold"
                          ? "#12351f"
                          : "#252c38",
                      color:
                        item.status === "sold"
                          ? "#5ee58a"
                          : "#aeb8c9",
                      fontSize: "11px",
                      fontWeight: "700",
                    }}
                  >
                    {item.status === "sold"
                      ? "ĐANG HOẠT ĐỘNG"
                      : item.status}
                  </div>
                </div>

                <div
                  style={{
                    color: "#7f8a9d",
                    fontSize: "12px",
                    marginBottom: "7px",
                  }}
                >
                  KEY CỦA BẠN
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "#070b12",
                    border: "1px solid #202c3d",
                    borderRadius: "9px",
                    padding: "10px",
                  }}
                >
                  <code
                    style={{
                      flex: 1,
                      wordBreak: "break-all",
                      fontSize: "14px",
                    }}
                  >
                    {item.key_code}
                  </code>

                  <button
                    onClick={() => copyKey(item.key_code)}
                    style={{
                      border: 0,
                      borderRadius: "7px",
                      padding: "9px 12px",
                      background: "#fff",
                      color: "#000",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    COPY
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap: "10px",
                    marginTop: "15px",
                  }}
                >
                  <div
                    style={{
                      background: "#0a0f17",
                      padding: "11px",
                      borderRadius: "8px",
                    }}
                  >
                    <small style={{ color: "#7f8a9d" }}>
                      Giá mua
                    </small>

                    <div style={{ marginTop: "4px" }}>
                      {Number(
                        item.products?.price || 0
                      ).toLocaleString("vi-VN")}
                      đ
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#0a0f17",
                      padding: "11px",
                      borderRadius: "8px",
                    }}
                  >
                    <small style={{ color: "#7f8a9d" }}>
                      Thời hạn
                    </small>

                    <div style={{ marginTop: "4px" }}>
                      {item.products?.duration_days
                        ? `${item.products.duration_days} ngày`
                        : "—"}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#0a0f17",
                      padding: "11px",
                      borderRadius: "8px",
                    }}
                  >
                    <small style={{ color: "#7f8a9d" }}>
                      Ngày mua
                    </small>

                    <div style={{ marginTop: "4px" }}>
                      {formatDate(
                        item.sold_at ||
                          item.created_at
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#0a0f17",
                      padding: "11px",
                      borderRadius: "8px",
                    }}
                  >
                    <small style={{ color: "#7f8a9d" }}>
                      Hết hạn
                    </small>

                    <div style={{ marginTop: "4px" }}>
                      {formatDate(item.expires_at)}
                    </div>
                  </div>
                </div>

                {item.order_id && (
                  <div
                    style={{
                      marginTop: "15px",
                      paddingTop: "12px",
                      borderTop: "1px solid #202c3d",
                      color: "#687487",
                      fontSize: "12px",
                    }}
                  >
                    Mã đơn: #{item.order_id}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
