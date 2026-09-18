"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function AdminCategoriesPage() {
  const router = useRouter();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !profile || profile.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      await loadCategories();
    } catch (error) {
      console.error(error);
      router.replace("/dashboard");
    }
  }

  async function loadCategories() {
    setLoading(true);

    const { data, error } = await supabase
      .from("product_categories")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("CATEGORY LOAD ERROR:", error);
      setMessage("Không thể tải danh sách thư mục.");
      setLoading(false);
      return;
    }

    setCategories(data || []);
    setLoading(false);
  }

  async function saveCategory() {
    const cleanName = name.trim();

    if (!cleanName) {
      setMessage("Vui lòng nhập tên thư mục.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      if (editing) {
        const { error } = await supabase
          .from("product_categories")
          .update({
            name: cleanName,
            description: description.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", editing.id);

        if (error) {
          console.error(error);
          setMessage("Không thể cập nhật thư mục.");
          setSaving(false);
          return;
        }

        setMessage("Đã cập nhật thư mục.");
      } else {
        const { error } = await supabase
          .from("product_categories")
          .insert({
            name: cleanName,
            description: description.trim(),
            active: true,
          });

        if (error) {
          console.error(error);
          setMessage("Không thể tạo thư mục.");
          setSaving(false);
          return;
        }

        setMessage("Đã tạo thư mục mới.");
      }

      resetForm();
      await loadCategories();
    } catch (error) {
      console.error(error);
      setMessage("Đã xảy ra lỗi.");
    }

    setSaving(false);
  }

  function startEdit(category) {
    setEditing(category);
    setName(category.name || "");
    setDescription(category.description || "");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function resetForm() {
    setEditing(null);
    setName("");
    setDescription("");
  }

  async function toggleCategory(category) {
    const { error } = await supabase
      .from("product_categories")
      .update({
        active: !category.active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", category.id);

    if (error) {
      console.error(error);
      setMessage("Không thể thay đổi trạng thái.");
      return;
    }

    await loadCategories();
  }

  async function deleteCategory(category) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa thư mục "${category.name}"?\n\nSản phẩm bên trong sẽ KHÔNG bị xóa.`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("product_categories")
      .delete()
      .eq("id", category.id);

    if (error) {
      console.error(error);
      setMessage(
        "Không thể xóa thư mục. Kiểm tra quyền Supabase."
      );
      return;
    }

    if (editing?.id === category.id) {
      resetForm();
    }

    setMessage("Đã xóa thư mục.");
    await loadCategories();
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          Đang tải quản lý thư mục...
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <div style={styles.badge}>
              XENOVA PLAY · ADMIN
            </div>

            <h1 style={styles.title}>
              QUẢN LÝ THƯ MỤC
            </h1>

            <p style={styles.subtitle}>
              Tạo các thư mục mẹ cho cửa hàng.
            </p>
          </div>

          <button
            onClick={() => router.push("/admin/products")}
            style={styles.backButton}
          >
            ← QUẢN LÝ SẢN PHẨM
          </button>
        </div>

        {message && (
          <div style={styles.message}>
            {message}
          </div>
        )}

        <section style={styles.formCard}>
          <h2 style={styles.sectionTitle}>
            {editing
              ? "✏️ SỬA THƯ MỤC"
              : "📁 TẠO THƯ MỤC MỚI"}
          </h2>

          <div style={styles.field}>
            <label style={styles.label}>
              Tên thư mục
            </label>

            <input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="Ví dụ: KEY VIP XENOVA"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              Mô tả
            </label>

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="Mô tả thư mục..."
              rows={4}
              style={styles.textarea}
            />
          </div>

          <div style={styles.formActions}>
            <button
              onClick={saveCategory}
              disabled={saving}
              style={styles.saveButton}
            >
              {saving
                ? "ĐANG LƯU..."
                : editing
                ? "LƯU THAY ĐỔI"
                : "+ TẠO THƯ MỤC"}
            </button>

            {editing && (
              <button
                onClick={resetForm}
                disabled={saving}
                style={styles.cancelButton}
              >
                HỦY
              </button>
            )}
          </div>
        </section>

        <section>
          <div style={styles.listHeader}>
            <h2 style={styles.sectionTitle}>
              📁 DANH SÁCH THƯ MỤC
            </h2>

            <span style={styles.count}>
              {categories.length} thư mục
            </span>
          </div>

          {categories.length === 0 ? (
            <div style={styles.empty}>
              Chưa có thư mục nào.
            </div>
          ) : (
            <div style={styles.list}>
              {categories.map((category) => (
                <div
                  key={category.id}
                  style={styles.category}
                >
                  <div style={styles.categoryIcon}>
                    📁
                  </div>

                  <div style={styles.categoryInfo}>
                    <div style={styles.categoryName}>
                      {category.name}
                    </div>

                    {category.description && (
                      <div
                        style={
                          styles.categoryDescription
                        }
                      >
                        {category.description}
                      </div>
                    )}

                    <div
                      style={
                        category.active
                          ? styles.active
                          : styles.inactive
                      }
                    >
                      {category.active
                        ? "● ĐANG HIỂN THỊ"
                        : "● ĐANG ẨN"}
                    </div>
                  </div>

                  <div style={styles.categoryActions}>
                    <button
                      onClick={() =>
                        startEdit(category)
                      }
                      style={styles.editButton}
                    >
                      SỬA
                    </button>

                    <button
                      onClick={() =>
                        toggleCategory(category)
                      }
                      style={styles.toggleButton}
                    >
                      {category.active
                        ? "ẨN"
                        : "HIỆN"}
                    </button>

                    <button
                      onClick={() =>
                        deleteCategory(category)
                      }
                      style={styles.deleteButton}
                    >
                      XÓA
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #111d36 0%, #070b12 45%, #05070b 100%)",
    color: "#fff",
    padding: "25px 15px 70px",
    fontFamily: "Arial, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "950px",
    margin: "0 auto",
  },

  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    color: "#8995a8",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "25px",
  },

  badge: {
    display: "inline-block",
    padding: "7px 10px",
    borderRadius: "999px",
    background: "#101b30",
    border: "1px solid #263c65",
    color: "#72a9ff",
    fontSize: "10px",
    fontWeight: "800",
    letterSpacing: "1px",
  },

  title: {
    margin: "12px 0 5px",
    fontSize: "clamp(28px, 5vw, 42px)",
    fontWeight: "900",
  },

  subtitle: {
    margin: 0,
    color: "#7f8ba0",
  },

  backButton: {
    padding: "11px 14px",
    borderRadius: "9px",
    border: "1px solid #293850",
    background: "#111927",
    color: "#fff",
    fontWeight: "800",
    cursor: "pointer",
  },

  message: {
    marginBottom: "18px",
    padding: "13px 15px",
    borderRadius: "10px",
    background: "#151e2c",
    border: "1px solid #293850",
    color: "#aebbd0",
  },

  formCard: {
    marginBottom: "30px",
    padding: "22px",
    borderRadius: "16px",
    background: "#0d1420",
    border: "1px solid #202d42",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "900",
  },

  field: {
    marginTop: "18px",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    color: "#8995a8",
    fontSize: "12px",
    fontWeight: "800",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    borderRadius: "9px",
    border: "1px solid #293850",
    background: "#070b12",
    color: "#fff",
    outline: "none",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    borderRadius: "9px",
    border: "1px solid #293850",
    background: "#070b12",
    color: "#fff",
    outline: "none",
    resize: "vertical",
  },

  formActions: {
    display: "flex",
    gap: "10px",
    marginTop: "18px",
  },

  saveButton: {
    padding: "12px 16px",
    border: 0,
    borderRadius: "9px",
    background: "#fff",
    color: "#000",
    fontWeight: "900",
    cursor: "pointer",
  },

  cancelButton: {
    padding: "12px 16px",
    borderRadius: "9px",
    border: "1px solid #293850",
    background: "#151d29",
    color: "#fff",
    fontWeight: "800",
    cursor: "pointer",
  },

  listHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "14px",
  },

  count: {
    color: "#718097",
    fontSize: "12px",
  },

  list: {
    display: "grid",
    gap: "12px",
  },

  category: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "17px",
    borderRadius: "14px",
    background: "#0d1420",
    border: "1px solid #202d42",
  },

  categoryIcon: {
    width: "45px",
    height: "45px",
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: "10px",
    background: "#15223a",
    fontSize: "23px",
  },

  categoryInfo: {
    flex: 1,
    minWidth: 0,
  },

  categoryName: {
    fontSize: "17px",
    fontWeight: "900",
  },

  categoryDescription: {
    marginTop: "5px",
    color: "#77859a",
    fontSize: "12px",
  },

  active: {
    marginTop: "7px",
    color: "#61e28b",
    fontSize: "10px",
    fontWeight: "800",
  },

  inactive: {
    marginTop: "7px",
    color: "#ff777d",
    fontSize: "10px",
    fontWeight: "800",
  },

  categoryActions: {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  editButton: {
    padding: "8px 10px",
    borderRadius: "7px",
    border: "1px solid #31486a",
    background: "#17243a",
    color: "#8db9ff",
    fontSize: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  toggleButton: {
    padding: "8px 10px",
    borderRadius: "7px",
    border: "1px solid #4d4a25",
    background: "#292714",
    color: "#e7dc73",
    fontSize: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  deleteButton: {
    padding: "8px 10px",
    borderRadius: "7px",
    border: "1px solid #542b30",
    background: "#261417",
    color: "#ff777d",
    fontSize: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  empty: {
    padding: "45px 20px",
    textAlign: "center",
    borderRadius: "14px",
    background: "#0d1420",
    border: "1px solid #202d42",
    color: "#718097",
  },
};
