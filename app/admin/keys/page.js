"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function KeysPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [keys, setKeys] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);

  const [keyCode, setKeyCode] = useState("");
  const [productId, setProductId] = useState("");
  const [duration, setDuration] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

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

    await Promise.all([
      loadProducts(),
      loadKeys(),
      loadUsers(),
    ]);

    setLoading(false);
  }

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("id,name,duration_days")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Lỗi tải sản phẩm: " + error.message);
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
      alert("Lỗi tải KEY: " + error.message);
      return;
    }

    setKeys(data || []);
  }

  async function loadUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,username,email,role")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Lỗi tải người dùng: " + error.message);
      return;
    }

    setUsers(data || []);
  }

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

  async function assignKey(keyId, userId) {
    const { error } = await supabase
      .from("keys")
      .update({
        user_id: userId || null,
      })
      .eq("id", keyId);

    if (error) {
      alert("Không thể gán KEY: " + error.message);
      return;
    }

    await loadKeys();

    alert(
      userId
        ? "Đã gán KEY cho tài khoản!"
        : "Đã bỏ gán KEY!"
    );
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

  async function deleteKey(id) {
    if (!confirm("Bạn có chắc muốn xóa KEY này không?")) {
      return;
    }

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

  function getProductName(id) {
    const product = products.find(
      (item) => item.id === id
    );

    return product?.name || "Không xác định";
  }

  function getUserName(id) {
    const user = users.find(
      (item) => item.id === id
    );

    if (!user) return "Chưa gán";

    return user.username || user.email || "User";
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

        {/* HEADER */}

        <div style={styles.header}>
          <div>
            <div style={styles.logo}>
              XENOVA PLAY
            </div>

            <h1 style={styles.title}>
              🔑 QUẢN LÝ KEY
            </h1>

            <p style={styles.subtitle}>
              Tạo, khóa và gán KEY cho người dùng
            </p>
          </div>

          <a href="/admin" style={styles.back}>
            ← Admin Panel
          </a>
        </div>

        {/* CREATE KEY */}

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

        {/* KEY LIST */}

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

                  {/* ASSIGN USER */}

                  <div style={styles.assignBox}>

                    <label style={styles.assignLabel}>
                      👤 Gán KEY cho tài khoản
                    </label>

                    <select
                      style={styles.input}
                      value={key.user_id || ""}
                      onChange={(e) =>
                        assignKey(
                          key.id,
                          e.target.value
                        )
                      }
                    >
                      <option value="">
                        -- Chưa gán tài khoản --
                      </option>

                      {users.map((user) => (
                        <option
                          key={user.id}
                          value={user.id}
                        >
                          {user.username ||
                            user.email}
                          {user.role === "admin"
                            ? " 👑"
                            : ""}
                        </option>
                      ))}
                    </select>

                    <div style={styles.assigned}>
                      Người đang sử dụng:{" "}
                      <b>
                        {getUserName(
                          key.user_id
                        )}
                      </b>
                    </div>

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
    letterSpacing: "3
