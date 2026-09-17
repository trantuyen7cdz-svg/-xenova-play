"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function AdminKeysPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [products, setProducts] = useState([]);
  const [keys, setKeys] = useState([]);
  const [users, setUsers] = useState([]);

  const [selectedProduct, setSelectedProduct] = useState("");
  const [duration, setDuration] = useState(1);
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      window.location.href = "/dashboard";
      return;
    }

    await loadData();
    setLoading(false);
  }

  async function loadData() {
    const [productsRes, keysRes, usersRes] = await Promise.all([
      supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("keys")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("profiles")
        .select("id, username, email")
        .order("created_at", { ascending: false }),
    ]);

    if (productsRes.data) {
      setProducts(productsRes.data);
    }

    if (keysRes.data) {
      setKeys(keysRes.data);
    }

    if (usersRes.data) {
      setUsers(usersRes.data);
    }
  }

  function generateKey() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    function part() {
      let result = "";

      for (let i = 0; i < 4; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }

      return result;
    }

    return `XENO-${part()}-${part()}-${part()}`;
  }

  async function createKey() {
    setMessage("");

    if (!selectedProduct) {
      setMessage("Vui lòng chọn sản phẩm.");
      return;
    }

    setGenerating(true);

    const product = products.find(
      (item) => item.id === selectedProduct
    );

    const days = Number(duration) || product?.duration_days || 1;

    const expiresAt = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000
    ).toISOString();

    const keyCode = generateKey();

    const { error } = await supabase.from("keys").insert({
      key_code: keyCode,
      product_id: selectedProduct,
      status: "available",
      expires_at: expiresAt,
    });

    if (error) {
      console.error(error);
      setMessage("Không thể tạo KEY: " + error.message);
      setGenerating(false);
      return;
    }

    setMessage(`Tạo KEY thành công: ${keyCode}`);

    setDuration(days);

    await loadData();

    setGenerating(false);
  }

  async function toggleKey(key) {
    const newStatus =
      key.status === "available" ? "disabled" : "available";

    const { error } = await supabase
      .from("keys")
      .update({
        status: newStatus,
      })
      .eq("id", key.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }

  async function deleteKey(id) {
    const ok = window.confirm("Bạn có chắc muốn xóa KEY này không?");

    if (!ok) return;

    const { error } = await supabase
      .from("keys")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }

  function productName(productId) {
    const product = products.find(
      (item) => item.id === productId
    );

    return product?.name || "Không xác định";
  }

  function username(userId) {
    if (!userId) return "Chưa kích hoạt";

    const user = users.find(
      (item) => item.id === userId
    );

    return user?.username || user?.email || userId;
  }

  function formatDate(date) {
    if (!date) return "—";

    return new Date(date).toLocaleString("vi-VN");
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          ĐANG TẢI...
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        <header style={styles.header}>
          <div>
            <div style={styles.logo}>XENOVA PLAY</div>
            <h1 style={styles.title}>QUẢN LÝ KEY</h1>
            <p style={styles.subtitle}>
              Tạo và quản lý KEY người dùng
            </p>
          </div>

          <button
            style={styles.backButton}
            onClick={() => {
              window.location.href = "/admin";
            }}
          >
            ← ADMIN
          </button>
        </header>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>🔑 TẠO KEY MỚI</h2>

          <div style={styles.formGrid}>

            <div>
              <label style={styles.label}>
                SẢN PHẨM
              </label>

              <select
                value={selectedProduct}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedProduct(value);

                  const product = products.find(
                    (item) => item.id === value
                  );

                  if (product?.duration_days) {
                    setDuration(product.duration_days);
                  }
                }}
                style={styles.input}
              >
                <option value="">
                  -- Chọn sản phẩm --
                </option>

                {products.map((product) => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.name} -{" "}
                    {Number(product.price).toLocaleString("vi-VN")}đ
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>
                THỜI HẠN
              </label>

              <input
                type="number"
                min="1"
                value={duration}
                onChange={(e) =>
                  setDuration(e.target.value)
                }
                style={styles.input}
              />
            </div>

          </div>

          <button
            onClick={createKey}
            disabled={generating}
            style={{
              ...styles.createButton,
              opacity: generating ? 0.6 : 1,
            }}
          >
            {generating
              ? "ĐANG TẠO..."
              : "⚡ TẠO KEY"}
          </button>

          {message && (
            <div style={styles.message}>
              {message}
            </div>
          )}
        </section>

        <section style={styles.card}>
          <div style={styles.tableHeader}>
            <div>
              <h2 style={styles.cardTitle}>
                📋 DANH SÁCH KEY
              </h2>

              <p style={styles.count}>
                Tổng: {keys.length} KEY
              </p>
            </div>
          </div>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>KEY</th>
                  <th style={styles.th}>SẢN PHẨM</th>
                  <th style={styles.th}>NGƯỜI DÙNG</th>
                  <th style={styles.th}>TRẠNG THÁI</th>
                  <th style={styles.th}>HẾT HẠN</th>
                  <th style={styles.th}>THAO TÁC</th>
                </tr>
              </thead>

              <tbody>
                {keys.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      style={styles.empty}
                    >
                      Chưa có KEY nào.
                    </td>
                  </tr>
                ) : (
                  keys.map((key) => (
                    <tr key={key.id}>

                      <td style={styles.td}>
                        <code style={styles.keyCode}>
                          {key.key_code}
                        </code>
                      </td>

                      <td style={styles.td}>
                        {productName(key.product_id)}
                      </td>

                      <td style={styles.td}>
                        {username(key.user_id)}
                      </td>

                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.status,
                            ...(key.status === "available"
                              ? styles.available
                              : styles.disabled),
                          }}
                        >
                          {key.status === "available"
                            ? "AVAILABLE"
                            : "DISABLED"}
                        </span>
                      </td>

                      <td style={styles.td}>
                        {formatDate(key.expires_at)}
                      </td>

                      <td style={styles.td}>
                        <div style={styles.actions}>

                          <button
                            style={styles.smallButton}
                            onClick={() =>
                              toggleKey(key)
                            }
                          >
                            {key.status === "available"
                              ? "KHÓA"
                              : "MỞ"}
                          </button>

                          <button
                            style={styles.deleteButton}
                            onClick={() =>
                              deleteKey(key.id)
                            }
                          >
                            XÓA
                          </button>

                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #241018 0%, #080808 45%, #030303 100%)",
    color: "#ffffff",
    padding: "30px 16px 60px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  container: {
    maxWidth: "1200px",
    margin: "0 auto",
  },

  loading: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ff1744",
    fontWeight: "900",
    fontSize: "20px",
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
    fontWeight: "900",
    letterSpacing: "3px",
    fontSize: "14px",
    marginBottom: "8px",
  },

  title: {
    margin: 0,
    fontSize: "32px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  subtitle: {
    color: "#888",
    marginTop: "8px",
  },

  backButton: {
    background: "#111",
    color: "#fff",
    border: "1px solid #333",
    padding: "12px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "800",
  },

  card: {
    background:
      "linear-gradient(145deg, #111, #090909)",
    border: "1px solid #242424",
    borderRadius: "18px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow:
      "0 15px 50px rgba(0,0,0,.35)",
  },

  cardTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "900",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1fr) 220px",
    gap: "16px",
    marginTop: "22px",
  },

  label: {
    display: "block",
    color: "#999",
    fontSize: "12px",
    fontWeight: "800",
    marginBottom: "8px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "#050505",
    color: "#fff",
    border: "1px solid #333",
    borderRadius: "10px",
    padding: "14px",
    outline: "none",
    fontSize: "14px",
  },

  createButton: {
    marginTop: "20px",
    width: "100%",
    border: "0",
    borderRadius: "11px",
    padding: "15px",
    background:
      "linear-gradient(90deg, #ff1744, #d50032)",
    color: "#fff",
    fontWeight: "900",
    cursor: "pointer",
    fontSize: "15px",
  },

  message: {
    marginTop: "15px",
    padding: "13px",
    background: "#160b0e",
    border:
      "1px solid rgba(255,23,68,.35)",
    borderRadius: "10px",
    color: "#ff6684",
    wordBreak: "break-word",
  },

  tableHeader: {
    marginBottom: "20px",
  },

  count: {
    color: "#777",
    fontSize: "13px",
    marginTop: "7px",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "900px",
  },

  th: {
    textAlign: "left",
    padding: "14px 10px",
    borderBottom: "1px solid #292929",
    color: "#777",
    fontSize: "11px",
    letterSpacing: "1px",
  },

  td: {
    padding: "16px 10px",
    borderBottom: "1px solid #191919",
    fontSize: "13px",
    color: "#ddd",
  },

  keyCode: {
    color: "#ff1744",
    fontWeight: "900",
    letterSpacing: "1px",
    whiteSpace: "nowrap",
  },

  status: {
    display: "inline-block",
    padding: "6px 9px",
    borderRadius: "6px",
    fontSize: "10px",
    fontWeight: "900",
  },

  available: {
    background: "rgba(0,200,83,.12)",
    color: "#00c853",
  },

  disabled: {
    background: "rgba(255,23,68,.12)",
    color: "#ff1744",
  },

  actions: {
    display: "flex",
    gap: "7px",
  },

  smallButton: {
    background: "#181818",
    border: "1px solid #333",
    color: "#fff",
    borderRadius: "7px",
    padding: "7px 10px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "800",
  },

  deleteButton: {
    background: "#28080f",
    border:
      "1px solid rgba(255,23,68,.4)",
    color: "#ff1744",
    borderRadius: "7px",
    padding: "7px 10px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "800",
  },

  empty: {
    textAlign: "center",
    padding: "40px",
    color: "#666",
  },
};
