"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function ProductsPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [allowed, setAllowed] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

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
    setLoading(false);
  }

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Không thể tải sản phẩm: " + error.message);
      return;
    }

    setProducts(data || []);
  }

  useEffect(() => {
    checkAdmin();
  }, []);

  function resetForm() {
    setName("");
    setDescription("");
    setPrice("");
    setDuration("");
    setEditingId(null);
  }

  async function saveProduct(e) {
    e.preventDefault();

    if (!name.trim()) {
      alert("Vui lòng nhập tên sản phẩm.");
      return;
    }

    if (!price || Number(price) < 0) {
      alert("Vui lòng nhập giá hợp lệ.");
      return;
    }

    if (!duration || Number(duration) <= 0) {
      alert("Vui lòng nhập số ngày sử dụng.");
      return;
    }

    setSaving(true);

    const productData = {
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      duration_days: Number(duration),
    };

    let error;

    if (editingId) {
      const result = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingId);

      error = result.error;
    } else {
      const result = await supabase
        .from("products")
        .insert({
          ...productData,
          is_active: true,
        });

      error = result.error;
    }

    setSaving(false);

    if (error) {
      alert("Lỗi: " + error.message);
      return;
    }

    alert(editingId ? "Đã cập nhật sản phẩm!" : "Đã thêm sản phẩm!");

    resetForm();
    await loadProducts();
  }

  function editProduct(product) {
    setEditingId(product.id);
    setName(product.name || "");
    setDescription(product.description || "");
    setPrice(product.price ?? "");
    setDuration(product.duration_days ?? "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function deleteProduct(id) {
    const ok = confirm(
      "Bạn có chắc muốn xóa sản phẩm này không?"
    );

    if (!ok) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Không thể xóa: " + error.message);
      return;
    }

    await loadProducts();
  }

  async function toggleProduct(product) {
    const { error } = await supabase
      .from("products")
      .update({
        is_active: !product.is_active,
      })
      .eq("id", product.id);

    if (error) {
      alert("Không thể thay đổi trạng thái: " + error.message);
      return;
    }

    await loadProducts();
  }

  if (loading) {
    return (
      <main style={styles.loading}>
        <div>Đang kiểm tra quyền Admin...</div>
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
              📦 SẢN PHẨM
            </h1>

            <p style={styles.subtitle}>
              Quản lý các gói KEY
            </p>
          </div>

          <a
            href="/admin"
            style={styles.back}
          >
            ← Admin Panel
          </a>
        </div>

        {/* FORM */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            {editingId
              ? "✏️ Chỉnh sửa sản phẩm"
              : "➕ Thêm sản phẩm"}
          </h2>

          <form onSubmit={saveProduct}>

            <label style={styles.label}>
              Tên sản phẩm
            </label>

            <input
              style={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: KEY ADR 7 NGÀY"
            />

            <label style={styles.label}>
              Mô tả
            </label>

            <input
              style={styles.input}
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="VD: Key sử dụng 7 ngày"
            />

            <label style={styles.label}>
              Giá (VNĐ)
            </label>

            <input
              style={styles.input}
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="80000"
            />

            <label style={styles.label}>
              Thời hạn (ngày)
            </label>

            <input
              style={styles.input}
              type="number"
              value={duration}
              onChange={(e) =>
                setDuration(e.target.value)
              }
              placeholder="7"
            />

            <div style={styles.formButtons}>

              <button
                type="submit"
                disabled={saving}
                style={styles.saveButton}
              >
                {saving
                  ? "Đang lưu..."
                  : editingId
                  ? "💾 Lưu thay đổi"
                  : "➕ Thêm sản phẩm"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  style={styles.cancelButton}
                >
                  Hủy
                </button>
              )}

            </div>
          </form>
        </div>

        {/* PRODUCT LIST */}
        <div style={styles.card}>

          <div style={styles.listHeader}>
            <h2 style={styles.cardTitle}>
              📦 Danh sách sản phẩm
            </h2>

            <span style={styles.count}>
              {products.length} sản phẩm
            </span>
          </div>

          {products.length === 0 ? (
            <div style={styles.empty}>
              Chưa có sản phẩm nào.
            </div>
          ) : (
            <div style={styles.products}>

              {products.map((product) => (

                <div
                  key={product.id}
                  style={styles.product}
                >

                  <div style={styles.productTop}>

                    <div>
                      <h3 style={styles.productName}>
                        {product.name}
                      </h3>

                      <p style={styles.description}>
                        {product.description ||
                          "Không có mô tả"}
                      </p>
                    </div>

                    <span
                      style={{
                        ...styles.status,
                        ...(product.is_active
                          ? styles.active
                          : styles.inactive),
                      }}
                    >
                      {product.is_active
                        ? "ĐANG BẬT"
                        : "ĐANG TẮT"}
                    </span>

                  </div>

                  <div style={styles.info}>

                    <div>
                      💰{" "}
                      <strong>
                        {Number(
                          product.price || 0
                        ).toLocaleString("vi-VN")}
                        ₫
                      </strong>
                    </div>

                    <div>
                      ⏱️{" "}
                      <strong>
                        {product.duration_days} ngày
                      </strong>
                    </div>

                  </div>

                  <div style={styles.actions}>

                    <button
                      onClick={() =>
                        editProduct(product)
                      }
                      style={styles.edit}
                    >
                      ✏️ Sửa
                    </button>

                    <button
                      onClick={() =>
                        toggleProduct(product)
                      }
                      style={styles.toggle}
                    >
                      {product.is_active
                        ? "⛔ Tắt"
                        : "✅ Bật"}
                    </button>

                    <button
                      onClick={() =>
                        deleteProduct(product.id)
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
    fontSize: "38px",
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
    fontSize: "14px",
    fontWeight: "700",
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

  formButtons: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
  },

  saveButton: {
    flex: 1,
    padding: "14px",
    border: 0,
    borderRadius: "12px",
    background: "#ff1744",
    color: "#fff",
    fontWeight: "900",
    fontSize: "15px",
  },

  cancelButton: {
    padding: "14px 20px",
    border: "1px solid #333",
    borderRadius: "12px",
    background: "#181818",
    color: "#fff",
    fontWeight: "700",
  },

  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  },

  count: {
    color: "#888",
    fontSize: "13px",
  },

  empty: {
    padding: "30px 10px",
    textAlign: "center",
    color: "#777",
  },

  products: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  product: {
    padding: "18px",
    borderRadius: "16px",
    background: "#151515",
    border: "1px solid #292929",
  },

  productTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
  },

  productName: {
    margin: 0,
    fontSize: "19px",
  },

  description: {
    color: "#888",
    margin: "7px 0 0",
    fontSize: "14px",
  },

  status: {
    height: "fit-content",
    padding: "6px 9px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  active: {
    color: "#00e676",
    background: "rgba(0,230,118,.1)",
    border: "1px solid rgba(0,230,118,.3)",
  },

  inactive: {
    color: "#ff5252",
    background: "rgba(255,82,82,.1)",
    border: "1px solid rgba(255,82,82,.3)",
  },

  info: {
    display: "flex",
    gap: "25px",
    marginTop: "18px",
    color: "#aaa",
    fontSize: "14px",
  },

  actions: {
    display: "flex",
    gap: "8px",
    marginTop: "18px",
    flexWrap: "wrap",
  },

  edit: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #333",
    background: "#202020",
    color: "#fff",
    fontWeight: "700",
  },

  toggle: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #333",
    background: "#202020",
    color: "#fff",
    fontWeight: "700",
  },

  delete: {
    padding: "10px 14px",
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
    padding: "20px",
  },

  denied: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: "20px",
    padding: "30px",
    textAlign: "center",
  },
};
