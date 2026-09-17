"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function KeysPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [keys, setKeys] = useState([]);
  const [products, setProducts] = useState([]);

  const [keyCode, setKeyCode] = useState("");
  const [productId, setProductId] = useState("");
  const [duration, setDuration] = useState("");

  async function checkAdmin() {
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

    if (profile?.role !== "admin") {
      setLoading(false);
      return;
    }

    setAllowed(true);

    await loadProducts();
    await loadKeys();

    setLoading(false);
  }

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("id,name,duration_days")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Không thể tải sản phẩm: " + error.message);
      return;
    }

    setProducts(data || []);
  }

  async function loadKeys() {
    const { data, error } = await supabase
      .from("keys")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Không thể tải KEY: " + error.message);
      return;
    }

    setKeys(data || []);
  }

  useEffect(() => {
    checkAdmin();
  }, []);

  function generateKey() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let a = "";
    let b = "";
    let c = "";

    for (let i = 0; i < 4; i++) {
      a += chars[Math.floor(Math.random() * chars.length)];
      b += chars[Math.floor(Math.random() * chars.length)];
      c += chars[Math.floor(Math.random() * chars.length)];
    }

    setKeyCode(`XENO-${a}-${b}-${c}`);
  }

  async function addKey(e) {
    e.preventDefault();

    if (!keyCode.trim()) {
      alert("Vui lòng nhập hoặc tạo KEY.");
      return;
    }

    if (!productId) {
      alert("Vui lòng chọn sản phẩm.");
      return;
    }

    const product = products.find(
      (item) => item.id === productId
    );

    const days =
      Number(duration) > 0
        ? Number(duration)
        : Number(product?.duration_days || 1);

    const expiresAt = new Date();

    expiresAt.setDate(
      expiresAt.getDate() + days
    );

    const { error } = await supabase
      .from("keys")
      .insert({
        key_code: keyCode.trim(),
        product_id: productId,
        status: "available",
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      alert("Không thể tạo KEY: " + error.message);
      return;
    }

    alert("Đã tạo KEY thành công!");

    setKeyCode("");
    setProductId("");
    setDuration("");

    await loadKeys();
  }

  async function deleteKey(id) {
    const ok = confirm(
      "Bạn có chắc muốn xóa KEY này không?"
    );

    if (!ok) return;

    const { error } = await supabase
      .from("keys")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Không thể xóa KEY: " + error.message);
      return;
    }

    await loadKeys();
  }

  async function toggleKey(key) {
    const newStatus =
      key.status === "available"
        ? "disabled"
        : "available";

    const { error } = await supabase
      .from("keys")
      .update({
        status: newStatus,
      })
      .eq("id", key.id);

    if (error) {
      alert("Không thể đổi trạng thái: " + error.message);
      return;
    }

    await loadKeys();
  }

  function getProductName(id) {
    const product = products.find(
      (item) => item.id === id
    );

    return product?.name || "Không xác định";
  }

  function formatDate(date) {
    if (!date) return "Không có";

    return new Date(date).toLocaleDateString(
      "vi-VN"
    );
  }

  if (loading) {
    return (
      <main style={styles.loading}>
        Đang kiểm tra quyền Admin...
      </main>
    );
  }

  if (!allowed) {
    return (
      <main style={styles.loading}>
        <div style={styles.denied}>
          <h1>🚫 Không có quyền</h1>
          <p>Tài khoản này không phải Admin.</p>

          <a href="/dashboard" style={styles.back}>
            ← Dashboard
          </a>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        <div style={styles.header}>
          <div>
            <div style={styles.logo}>
              XENOVA PLAY
            </div>

            <h1 style={styles.title}>
              🔑 QUẢN LÝ KEY
            </h1>

            <p style={styles.subtitle}>
              Tạo và quản lý KEY
            </p>
          </div>

          <a href="/admin" style={styles.back}>
            ← Admin Panel
          </a>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            ➕ Tạo KEY mới
          </h2>

          <form onSubmit={addKey}>

            <label style={styles.label}>
              KEY
            </label>

            <div style={styles.keyRow}>
              <input
                style={styles.input}
                value={keyCode}
                onChange={(e) =>
                  setKeyCode(e.target.value)
                }
                placeholder="XENO-XXXX-XXXX-XXXX"
              />

              <button
                type="button"
                onClick={generateKey}
                style={styles.generate}
              >
                🎲 Tạo
              </button>
            </div>

            <label style={styles.label}>
              Sản phẩm
            </label>

            <select
              style={styles.input}
              value={productId}
              onChange={(e) =>
                setProductId(e.target.value)
              }
            >
              <option value="">
                -- Chọn sản phẩm --
              </option>

              {products.map((product) => (
                <option
                  key={product.id}
                  value={product.id}
                >
                  {product.name}
                </option>
              ))}
            </select>

            <label style={styles.label}>
              Thời hạn KEY (ngày)
            </label>

            <input
              style={styles.input}
              type="number"
              min="1"
              value={duration}
              onChange={(e) =>
                setDuration(e.target.value)
              }
              placeholder="Để trống = thời hạn sản phẩm"
            />

            <button
              type="submit"
              style={styles.addButton}
            >
              🔑 Tạo KEY
            </button>

          </form>
        </div>

        <div style={styles.card}>

          <div style={styles.listHeader}>
            <h2 style={styles.cardTitle}>
              🔑 Danh sách KEY
            </h2>

            <span style={styles.count}>
              {keys.length} KEY
            </span>
          </div>

          {keys.length === 0 ? (
            <div style={styles.empty}>
              Chưa có KEY nào.
            </div>
          ) : (
            <div style={styles.list}>

              {keys.map((key) => (
                <div
                  key={key.id}
                  style={styles.keyCard}
                >

                  <div style={styles.keyTop}>

                    <div style={styles.keyCode}>
                      {key.key_code}
                    </div>

                    <span
                      style={{
                        ...styles.status,
                        ...(key.status ===
                        "available"
                          ? styles.available
                          : styles.disabled),
                      }}
                    >
                      {key.status ===
                      "available"
                        ? "ĐANG HOẠT ĐỘNG"
                        : "ĐÃ KHÓA"}
                    </span>

                  </div>

                  <div style={styles.product}>
                    📦{" "}
                    {getProductName(
                      key.product_id
                    )}
                  </div>

                  <div style={styles.details}>

                    <span>
                      📅 Hết hạn:{" "}
                      {formatDate(
                        key.expires_at
                      )}
                    </span>

                    <span>
                      👤{" "}
                      {key.user_id
                        ? "Đã gán"
                        : "Chưa gán"}
                    </span>

                  </div>

                  <div style={styles.actions}>

                    <button
                      onClick={() =>
                        toggleKey(key)
                      }
                      style={styles.toggle}
                    >
                      {key.status ===
                      "available"
                        ? "⛔ Khóa"
                        : "✅ Mở"}
                    </button>

                    <button
                      onClick={() =>
                        deleteKey(key.id)
                      }
                      style={styles.delete}
                    >
                      🗑️ Xóa
                    </button>

                  </div>

                </div>
              ))}

            </div>
          )}

        </div>

      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#050505",
    color: "#fff",
    padding: "20px 14px 60px",
    fontFamily: "Arial, Helvetica, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "1000px",
    margin: "0 auto",
  },

  header: {
    padding: "24px",
    borderRadius: "20px",
    background: "#111",
    border: "1px solid #292929",
    marginBottom: "20px",
  },

  logo: {
    color: "#ff1744",
    fontWeight: "900",
    letterSpacing: "3px",
    fontSize: "14px",
  },

  title: {
    margin: "8px 0",
    fontSize: "36px",
    fontWeight: "900",
  },

  subtitle: {
    margin: 0,
    color: "#888",
  },

  back: {
    display: "inline-block",
    marginTop: "18px",
    padding: "12px 18px",
    borderRadius: "12px",
    background: "#181818",
    border: "1px solid #333",
    color: "#fff",
    textDecoration: "none",
    fontWeight: "700",
  },

  card: {
    background: "#0e0e0e",
    border: "1px solid #252525",
    borderRadius: "20px",
    padding: "22px",
    marginBottom: "20px",
  },

  cardTitle: {
    marginTop: 0,
    marginBottom: "20px",
    fontSize: "23px",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    marginTop: "15px",
    color: "#aaa",
    fontWeight: "700",
  },

  keyRow: {
    display: "flex",
    gap: "8px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #333",
    background: "#181818",
    color: "#fff",
    fontSize: "15px",
    outline: "none",
  },

  generate: {
    padding: "0 16px",
    borderRadius: "12px",
    border: "1px solid #ff1744",
    background: "#241015",
    color: "#ff1744",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  addButton: {
    width: "100%",
    marginTop: "20px",
    padding: "15px",
    border: 0,
    borderRadius: "12px",
    background: "#ff1744",
    color: "#fff",
    fontWeight: "900",
    fontSize: "16px",
  },

  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  count: {
    color: "#888",
  },

  empty: {
    textAlign: "center",
    color: "#777",
    padding: "30px 10px",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  keyCard: {
    padding: "18px",
    borderRadius: "16px",
    background: "#151515",
    border: "1px solid #292929",
  },

  keyTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  },

  keyCode: {
    fontSize: "17px",
    fontWeight: "900",
    wordBreak: "break-all",
  },

  status: {
    padding: "6px 9px",
    borderRadius: "999px",
    fontSize: "9px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  available: {
    color: "#00e676",
    border: "1px solid #006b3a",
  },

  disabled: {
    color: "#ff5252",
    border: "1px solid #6b1515",
  },

  product: {
    marginTop: "15px",
    color: "#aaa",
    fontSize: "14px",
  },

  details: {
    display: "flex",
    flexWrap: "wrap",
    gap: "15px",
    marginTop: "12px",
    color: "#777",
    fontSize: "13px",
  },

  actions: {
    display: "flex",
    gap: "8px",
    marginTop: "17px",
  },

  toggle: {
    flex: 1,
    padding: "11px",
    borderRadius: "10px",
    border: "1px solid #333",
    background: "#202020",
    color: "#fff",
    fontWeight: "700",
  },

  delete: {
    flex: 1,
    padding: "11px",
    borderRadius: "10px",
    border: "1px solid #5a1515",
    background: "#241010",
    color: "#ff5252",
    fontWeight: "700",
  },

  loading: {
    minHeight: "100vh",
    background: "#050505",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  denied: {
    padding: "30px",
    background: "#111",
    borderRadius: "20px",
    textAlign: "center",
  },
};
