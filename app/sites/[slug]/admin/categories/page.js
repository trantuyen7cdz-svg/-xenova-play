"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function CategoriesAdminPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [categories, setCategories] = useState([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");

  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (slug) {
      loadCategories();
    }
  }, [slug]);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      router.replace(
        `/sites/${slug}/admin/login`
      );

      return null;
    }

    return session.access_token;
  }

  async function loadCategories() {
    try {
      setLoading(true);

      const token = await getToken();

      if (!token) return;

      const response = await fetch(
        `/api/sites/${slug}/admin/categories`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Không thể tải danh mục"
        );
      }

      setCategories(
        result.categories || []
      );
    } catch (error) {
      console.error(error);

      alert(
        error.message ||
          "Không thể tải danh mục"
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setDescription("");
    setParentId("");
    setImageUrl("");
    setImagePreview("");
    setEditingId(null);
  }

  function startEdit(category) {
    setEditingId(category.id);

    setName(category.name || "");

    setDescription(
      category.description || ""
    );

    setParentId(
      category.parent_id
        ? String(category.parent_id)
        : ""
    );

    setImageUrl(
      category.image_url || ""
    );

    setImagePreview(
      category.image_url || ""
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function uploadImage(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(
        "Vui lòng chọn file hình ảnh."
      );

      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert(
        "Ảnh không được vượt quá 10MB."
      );

      return;
    }

    try {
      setUploading(true);

      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() || "jpg";

      const safeName =
        file.name
          .replace(
            /[^a-zA-Z0-9._-]/g,
            "-"
          )
          .replace(
            /\.[^/.]+$/,
            ""
          )
          .slice(0, 80);

      const path =
        `categories/${crypto.randomUUID()}-${safeName}.${extension}`;

      const { error } =
        await supabase.storage
          .from("website-assets")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

      if (error) {
        throw error;
      }

      const {
        data: publicData,
      } = supabase.storage
        .from("website-assets")
        .getPublicUrl(path);

      const url =
        publicData?.publicUrl;

      if (!url) {
        throw new Error(
          "Không lấy được URL ảnh."
        );
      }

      setImageUrl(url);
      setImagePreview(url);
    } catch (error) {
      console.error(error);

      alert(
        error.message ||
          "Upload ảnh thất bại."
      );
    } finally {
      setUploading(false);
    }
  }

  function removeImage() {
    setImageUrl("");
    setImagePreview("");
  }

  async function saveCategory(event) {
    event.preventDefault();

    if (!name.trim()) {
      alert(
        "Vui lòng nhập tên danh mục."
      );

      return;
    }

    try {
      setSaving(true);

      const token = await getToken();

      if (!token) return;

      const payload = {
        name: name.trim(),

        description:
          description.trim(),

        image_url:
          imageUrl || null,

        parent_id:
          parentId === ""
            ? null
            : Number(parentId),
      };

      let response;

      if (editingId) {
        response = await fetch(
          `/api/sites/${slug}/admin/categories`,
          {
            method: "PATCH",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              id: editingId,
              ...payload,
            }),
          }
        );
      } else {
        response = await fetch(
          `/api/sites/${slug}/admin/categories`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(payload),
          }
        );
      }

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Không thể lưu danh mục"
        );
      }

      resetForm();

      await loadCategories();
    } catch (error) {
      console.error(error);

      alert(
        error.message ||
          "Không thể lưu danh mục"
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleCategory(category) {
    try {
      const token = await getToken();

      if (!token) return;

      const response = await fetch(
        `/api/sites/${slug}/admin/categories`,
        {
          method: "PATCH",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            id: category.id,
            active: !category.active,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Không thể thay đổi trạng thái"
        );
      }

      await loadCategories();
    } catch (error) {
      alert(
        error.message ||
          "Có lỗi xảy ra"
      );
    }
  }

  async function deleteCategory(category) {
    const hasChildren =
      categories.some(
        (item) =>
          item.parent_id ===
          category.id
      );

    if (hasChildren) {
      alert(
        "Danh mục này đang có danh mục con. Hãy xóa hoặc chuyển danh mục con trước."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Bạn có chắc muốn xóa "${category.name}"?`
      );

    if (!confirmed) return;

    try {
      const token = await getToken();

      if (!token) return;

      const response = await fetch(
        `/api/sites/${slug}/admin/categories?id=${category.id}`,
        {
          method: "DELETE",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Không thể xóa danh mục"
        );
      }

      if (
        editingId ===
        category.id
      ) {
        resetForm();
      }

      await loadCategories();
    } catch (error) {
      alert(
        error.message ||
          "Không thể xóa danh mục"
      );
    }
  }

  function getChildren(parentId) {
    return categories.filter(
      (item) =>
        item.parent_id ===
        parentId
    );
  }

  const rootCategories =
    getChildren(null);

  function CategoryItem({
    category,
    level = 0,
  }) {
    const children =
      getChildren(category.id);

    return (
      <div>
        <div
          style={{
            ...styles.category,
            marginLeft:
              level * 20,
          }}
        >
          <div
            style={styles.categoryInfo}
          >
            {category.image_url ? (
              <img
                src={category.image_url}
                alt={category.name}
                style={
                  styles.categoryImage
                }
              />
            ) : (
              <div
                style={
                  styles.categoryIcon
                }
              >
                {level === 0
                  ? "📁"
                  : "└"}
              </div>
            )}

            <div
              style={{
                minWidth: 0,
              }}
            >
              <div
                style={
                  styles.categoryName
                }
              >
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
                  styles.categoryMeta
                }
              >
                {category.active
                  ? "Đang bật"
                  : "Đang tắt"}
              </div>
            </div>
          </div>

          <div style={styles.actions}>
            <button
              onClick={() =>
                toggleCategory(
                  category
                )
              }
              style={{
                ...styles.smallButton,

                background:
                  category.active
                    ? "#241b12"
                    : "#15251c",
              }}
            >
              {category.active
                ? "Tắt"
                : "Bật"}
            </button>

            <button
              onClick={() =>
                startEdit(category)
              }
              style={
                styles.smallButton
              }
            >
              Sửa
            </button>

            <button
              onClick={() =>
                deleteCategory(
                  category
                )
              }
              style={{
                ...styles.smallButton,

                color: "#ff7b91",
              }}
            >
              Xóa
            </button>
          </div>
        </div>

        {children.map(
          (child) => (
            <CategoryItem
              key={child.id}
              category={child}
              level={level + 1}
            />
          )
        )}
      </div>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <Link
              href={`/sites/${slug}/admin`}
              style={styles.back}
            >
              ← Admin
            </Link>

            <h1
              style={styles.title}
            >
              Danh mục
            </h1>

            <p
              style={styles.subtitle}
            >
              Quản lý danh mục riêng
              của website này
            </p>
          </div>
        </header>

        <section
          style={styles.formCard}
        >
          <div
            style={
              styles.formHeader
            }
          >
            <div>
              <h2
                style={
                  styles.sectionTitle
                }
              >
                {editingId
                  ? "Chỉnh sửa danh mục"
                  : "Thêm danh mục"}
              </h2>

              <p
                style={
                  styles.sectionText
                }
              >
                Có thể tạo danh mục
                cha và danh mục con.
              </p>
            </div>

            {editingId && (
              <button
                onClick={resetForm}
                style={
                  styles.cancelButton
                }
              >
                Hủy sửa
              </button>
            )}
          </div>

          <form
            onSubmit={
              saveCategory
            }
          >
            <label
              style={styles.label}
            >
              ẢNH DANH MỤC
            </label>

            <div
              style={
                styles.uploadBox
              }
            >
              {imagePreview ? (
                <div
                  style={
                    styles.previewWrap
                  }
                >
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={
                      styles.previewImage
                    }
                  />

                  <button
                    type="button"
                    onClick={
                      removeImage
                    }
                    style={
                      styles.removeImage
                    }
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div
                  style={
                    styles.noImage
                  }
                >
                  <div
                    style={
                      styles.camera
                    }
                  >
                    📷
                  </div>

                  <div>
                    Chưa có ảnh
                  </div>
                </div>
              )}

              <label
                style={
                  styles.uploadButton
                }
              >
                {uploading
                  ? "ĐANG UPLOAD..."
                  : imagePreview
                  ? "ĐỔI ẢNH"
                  : "CHỌN ẢNH"}

                <input
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={
                    uploading ||
                    saving
                  }
                  onChange={(e) => {
                    const file =
                      e.target.files?.[0];

                    if (file) {
                      uploadImage(
                        file
                      );
                    }

                    e.target.value =
                      "";
                  }}
                />
              </label>

              <div
                style={
                  styles.uploadHint
                }
              >
                JPG, PNG, WEBP • tối đa
                10MB
              </div>
            </div>

            <label
              style={styles.label}
            >
              TÊN DANH MỤC
            </label>

            <input
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
              placeholder="Ví dụ: Android"
              style={styles.input}
              disabled={
                saving ||
                uploading
              }
            />

            <label
              style={styles.label}
            >
              DANH MỤC CHA
            </label>

            <select
              value={parentId}
              onChange={(e) =>
                setParentId(
                  e.target.value
                )
              }
              style={styles.input}
              disabled={
                saving ||
                uploading
              }
            >
              <option value="">
                Không có — Danh mục cha
              </option>

              {categories
                .filter(
                  (item) =>
                    item.id !==
                      editingId &&
                    item.parent_id ===
                      null
                )
                .map(
                  (category) => (
                    <option
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {
                        category.name
                      }
                    </option>
                  )
                )}
            </select>

            <label
              style={styles.label}
            >
              MÔ TẢ
            </label>

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
              placeholder="Mô tả danh mục..."
              style={
                styles.textarea
              }
              disabled={
                saving ||
                uploading
              }
            />

            <button
              type="submit"
              disabled={
                saving ||
                uploading
              }
              style={{
                ...styles.saveButton,

                opacity:
                  saving ||
                  uploading
                    ? 0.6
                    : 1,
              }}
            >
              {saving
                ? "ĐANG LƯU..."
                : editingId
                ? "LƯU THAY ĐỔI"
                : "+ THÊM DANH MỤC"}
            </button>
          </form>
        </section>

        <section
          style={styles.listCard}
        >
          <div
            style={styles.listHeader}
          >
            <div>
              <h2
                style={
                  styles.sectionTitle
                }
              >
                Danh sách danh mục
              </h2>

              <p
                style={
                  styles.sectionText
                }
              >
                Tổng:{" "}
                {categories.length}{" "}
                danh mục
              </p>
            </div>

            <button
              onClick={
                loadCategories
              }
              style={
                styles.refresh
              }
            >
              ↻ Làm mới
            </button>
          </div>

          {loading ? (
            <div
              style={styles.empty}
            >
              Đang tải...
            </div>
          ) : categories.length ===
            0 ? (
            <div
              style={styles.empty}
            >
              Chưa có danh mục nào.
            </div>
          ) : (
            <div>
              {rootCategories.map(
                (category) => (
                  <CategoryItem
                    key={
                      category.id
                    }
                    category={
                      category
                    }
                  />
                )
              )}
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
      "linear-gradient(180deg,#08070c,#0d0b12)",
    color: "#fff",
    padding: "20px 14px 60px",
  },

  container: {
    width: "100%",
    maxWidth: "900px",
    margin: "0 auto",
  },

  header: {
    marginBottom: "20px",
  },

  back: {
    color: "#ff63b9",
    textDecoration: "none",
    fontSize: "12px",
    fontWeight: "800",
  },

  title: {
    margin: "10px 0 4px",
    fontSize: "27px",
    fontWeight: "950",
  },

  subtitle: {
    margin: 0,
    color: "#77717f",
    fontSize: "12px",
  },

  formCard: {
    padding: "20px",
    marginBottom: "16px",
    borderRadius: "16px",
    background: "#111016",
    border: "1px solid #29232f",
  },

  formHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    marginBottom: "5px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "900",
  },

  sectionText: {
    margin: "5px 0 16px",
    color: "#706a78",
    fontSize: "11px",
  },

  label: {
    display: "block",
    margin: "14px 0 7px",
    color: "#898391",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  uploadBox: {
    padding: "14px",
    borderRadius: "12px",
    border: "1px dashed #39313f",
    background: "#09090d",
    textAlign: "center",
  },

  previewWrap: {
    position: "relative",
    width: "120px",
    height: "120px",
    margin: "0 auto 12px",
  },

  previewImage: {
    width: "120px",
    height: "120px",
    objectFit: "cover",
    borderRadius: "14px",
    border: "1px solid #3a3040",
  },

  removeImage: {
    position: "absolute",
    top: "-7px",
    right: "-7px",
    width: "25px",
    height: "25px",
    border: "none",
    borderRadius: "50%",
    background: "#ff456b",
    color: "#fff",
    fontSize: "17px",
    lineHeight: "25px",
    cursor: "pointer",
  },

  noImage: {
    height: "120px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#686270",
    fontSize: "11px",
  },

  camera: {
    fontSize: "30px",
    marginBottom: "7px",
  },

  uploadButton: {
    display: "inline-block",
    padding: "9px 15px",
    borderRadius: "8px",
    background: "#211522",
    border: "1px solid #54334d",
    color: "#ff75c4",
    fontSize: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  uploadHint: {
    marginTop: "8px",
    color: "#5e5865",
    fontSize: "9px",
  },

  input: {
    width: "100%",
    minHeight: "46px",
    boxSizing: "border-box",
    padding: "0 13px",
    borderRadius: "10px",
    border: "1px solid #302b39",
    background: "#08080c",
    color: "#fff",
    outline: "none",
    fontSize: "13px",
  },

  textarea: {
    width: "100%",
    minHeight: "90px",
    boxSizing: "border-box",
    padding: "12px 13px",
    borderRadius: "10px",
    border: "1px solid #302b39",
    background: "#08080c",
    color: "#fff",
    outline: "none",
    fontSize: "13px",
    resize: "vertical",
  },

  saveButton: {
    width: "100%",
    height: "48px",
    marginTop: "18px",
    border: "none",
    borderRadius: "10px",
    background:
      "linear-gradient(135deg,#ff4eae,#b63cff)",
    color: "#fff",
    fontSize: "11px",
    fontWeight: "950",
    cursor: "pointer",
  },

  cancelButton: {
    border: "1px solid #38313f",
    background: "#17131b",
    color: "#aaa",
    padding: "9px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "10px",
    fontWeight: "800",
  },

  listCard: {
    padding: "20px",
    borderRadius: "16px",
    background: "#111016",
    border: "1px solid #29232f",
  },

  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
    marginBottom: "10px",
  },

  refresh: {
    border: "1px solid #352d3b",
    background: "#17131b",
    color: "#aaa",
    padding: "9px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "10px",
    fontWeight: "800",
  },

  category: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "13px 0",
    borderBottom:
      "1px solid #211d25",
  },

  categoryInfo: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    minWidth: 0,
  },

  categoryImage: {
    width: "48px",
    height: "48px",
    objectFit: "cover",
    borderRadius: "11px",
    border: "1px solid #332b38",
    flexShrink: 0,
  },

  categoryIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "11px",
    display: "grid",
    placeItems: "center",
    background: "#201521",
    color: "#ff63b9",
    flexShrink: 0,
  },

  categoryName: {
    fontSize: "13px",
    fontWeight: "900",
  },

  categoryDescription: {
    marginTop: "3px",
    color: "#716b79",
    fontSize: "10px",
  },

  categoryMeta: {
    marginTop: "4px",
    color: "#6f6976",
    fontSize: "9px",
  },

  actions: {
    display: "flex",
    gap: "5px",
    flexShrink: 0,
  },

  smallButton: {
    border: "1px solid #332d39",
    background: "#17131b",
    color: "#bbb",
    padding: "7px 9px",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "9px",
    fontWeight: "800",
  },

  empty: {
    padding: "35px 10px",
    textAlign: "center",
    color: "#67616f",
    fontSize: "12px",
  },
};
