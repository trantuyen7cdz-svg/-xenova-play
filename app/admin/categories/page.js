"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function AdminCategoriesPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [deletingImageId, setDeletingImageId] =
    useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      setChecking(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("id,email,role")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        throw new Error(
          "Không thể kiểm tra quyền Admin: " +
            profileError.message
        );
      }

      if (!profile || profile.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      setChecking(false);
      await loadData();
    } catch (err) {
      console.error("CHECK ADMIN ERROR:", err);

      setError(
        err?.message ||
          "Không thể kiểm tra quyền Admin."
      );

      setChecking(false);
      setLoading(false);
    }
  }

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [
        categoriesResult,
        productsResult,
      ] = await Promise.all([
        supabase
          .from("product_categories")
          .select(
            "id,name,active,demo_image_url"
          )
          .order("id", {
            ascending: true,
          }),

        supabase
          .from("products")
          .select(
            "id,name,category_id,active,is_active"
          )
          .order("id", {
            ascending: true,
          }),
      ]);

      if (categoriesResult.error) {
        throw new Error(
          "Lỗi tải thư mục: " +
            categoriesResult.error.message
        );
      }

      if (productsResult.error) {
        throw new Error(
          "Lỗi tải sản phẩm: " +
            productsResult.error.message
        );
      }

      setCategories(
        categoriesResult.data || []
      );

      setProducts(
        productsResult.data || []
      );
    } catch (err) {
      console.error(
        "LOAD CATEGORY ERROR:",
        err
      );

      setError(
        err?.message ||
          "Không thể tải danh mục."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setEditingId(null);
  }

  function startEdit(category) {
    setEditingId(category.id);
    setName(category.name || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveCategory() {
    const cleanName = name.trim();

    if (!cleanName) {
      setError("Vui lòng nhập tên thư mục.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingId) {
        const { error: updateError } =
          await supabase
            .from("product_categories")
            .update({
              name: cleanName,
            })
            .eq("id", editingId);

        if (updateError) {
          throw new Error(
            "Không thể cập nhật thư mục: " +
              updateError.message
          );
        }

        setMessage(
          "Đã cập nhật thư mục."
        );
      } else {
        const { error: insertError } =
          await supabase
            .from("product_categories")
            .insert({
              name: cleanName,
              active: true,
            });

        if (insertError) {
          throw new Error(
            "Không thể tạo thư mục: " +
              insertError.message
          );
        }

        setMessage(
          "Đã thêm thư mục."
        );
      }

      resetForm();
      await loadData();
    } catch (err) {
      console.error(
        "SAVE CATEGORY ERROR:",
        err
      );

      setError(
        err?.message ||
          "Không thể lưu thư mục."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleCategory(category) {
    setTogglingId(category.id);
    setError("");
    setMessage("");

    try {
      const newStatus =
        category.active !== true;

      const { error: updateError } =
        await supabase
          .from("product_categories")
          .update({
            active: newStatus,
          })
          .eq("id", category.id);

      if (updateError) {
        throw new Error(
          "Không thể thay đổi trạng thái: " +
            updateError.message
        );
      }

      setMessage(
        newStatus
          ? "Đã bật thư mục."
          : "Đã tắt thư mục."
      );

      await loadData();
    } catch (err) {
      setError(
        err?.message ||
          "Không thể thay đổi trạng thái."
      );
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteCategory(category) {
    const linkedProducts =
      products.filter(
        (product) =>
          Number(product.category_id) ===
          Number(category.id)
      );

    if (linkedProducts.length > 0) {
      setError(
        `Không thể xóa "${category.name}" vì đang có ${linkedProducts.length} sản phẩm bên trong. Hãy chuyển hoặc xóa sản phẩm trước.`
      );
      return;
    }

    const ok = window.confirm(
      `Bạn có chắc muốn xóa thư mục "${category.name}"?`
    );

    if (!ok) return;

    setDeletingId(category.id);
    setError("");
    setMessage("");

    try {
      const { error: deleteError } =
        await supabase
          .from("product_categories")
          .delete()
          .eq("id", category.id);

      if (deleteError) {
        throw new Error(
          "Không thể xóa thư mục: " +
            deleteError.message
        );
      }

      setMessage("Đã xóa thư mục.");

      await loadData();
    } catch (err) {
      console.error(
        "DELETE CATEGORY ERROR:",
        err
      );

      setError(
        err?.message ||
          "Không thể xóa thư mục."
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function uploadDemoImage(
    category,
    file
  ) {
    if (!file) return;

    setUploadingId(category.id);
    setError("");
    setMessage("");

    try {
      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() || "jpg";

      const filePath =
        `categories/${category.id}-${Date.now()}.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from("product-demo")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: true,
          });

      if (uploadError) {
        throw new Error(
          "Upload ảnh thất bại: " +
            uploadError.message
        );
      }

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("product-demo")
        .getPublicUrl(filePath);

      const imageUrl =
        publicUrlData?.publicUrl;

      if (!imageUrl) {
        throw new Error(
          "Không lấy được URL ảnh."
        );
      }

      const { error: updateError } =
        await supabase
          .from("product_categories")
          .update({
            demo_image_url: imageUrl,
          })
          .eq("id", category.id);

      if (updateError) {
        throw new Error(
          "Ảnh đã upload nhưng không lưu được URL: " +
            updateError.message
        );
      }

      setMessage(
        "Đã thêm ảnh demo cho thư mục."
      );

      await loadData();
    } catch (err) {
      console.error(
        "UPLOAD CATEGORY IMAGE ERROR:",
        err
      );

      setError(
        err?.message ||
          "Không thể upload ảnh."
      );
    } finally {
      setUploadingId(null);
    }
  }

  async function deleteDemoImage(category) {
    if (!category.demo_image_url) return;

    const ok = window.confirm(
      "Bạn có chắc muốn xóa ảnh demo của thư mục này?"
    );

    if (!ok) return;

    setDeletingImageId(category.id);
    setError("");
    setMessage("");

    try {
      const { error: updateError } =
        await supabase
          .from("product_categories")
          .update({
            demo_image_url: null,
          })
          .eq("id", category.id);

      if (updateError) {
        throw new Error(
          "Không thể xóa ảnh demo: " +
            updateError.message
        );
      }

      setMessage(
        "Đã xóa ảnh demo."
      );

      await loadData();
    } catch (err) {
      console.error(
        "DELETE CATEGORY IMAGE ERROR:",
        err
      );

      setError(
        err?.message ||
          "Không thể xóa ảnh demo."
      );
    } finally {
      setDeletingImageId(null);
    }
  }

  function getProductCount(categoryId) {
    return products.filter(
      (product) =>
        Number(product.category_id) ===
        Number(categoryId)
    ).length;
  }

  if (checking || loading) {
    return (
      <main style={styles.loadingPage}>
        <div style={styles.spinner} />

        <div style={styles.loadingTitle}>
          {checking
            ? "ĐANG KIỂM TRA QUYỀN ADMIN"
            : "ĐANG TẢI THƯ MỤC"}
        </div>

        <div style={styles.loadingText}>
          Vui lòng chờ...
        </div>

        {error && (
          <div style={styles.errorBox}>
            {error}

            <button
              onClick={loadData}
              style={styles.retryButton}
            >
              THỬ LẠI
            </button>
          </div>
        )}
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <div style={styles.brand}>
              XENOVA PLAY
            </div>

            <h1 style={styles.title}>
              QUẢN LÝ THƯ MỤC
            </h1>

            <div style={styles.subtitle}>
              Quản lý menu mẹ của cửa hàng
            </div>
          </div>

          <button
            onClick={() =>
              router.push(
                "/admin/products"
              )
            }
            style={styles.secondaryButton}
          >
            🔑 QUẢN LÝ SẢN PHẨM
          </button>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <b>ĐÃ XẢY RA LỖI</b>
            <div style={{ marginTop: 5 }}>
              {error}
            </div>
          </div>
        )}

        {message && (
          <div style={styles.successBox}>
            ✅ {message}
          </div>
        )}

        {/* FORM */}

        <section style={styles.formCard}>
          <div style={styles.cardTitle}>
            {editingId
              ? "✏️ CHỈNH SỬA THƯ MỤC"
              : "➕ THÊM THƯ MỤC MẸ"}
          </div>

          <div style={styles.formRow}>
            <input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="VD: KEY VIP XENOVA"
              style={styles.input}
            />

            <button
              onClick={saveCategory}
              disabled={saving}
              style={{
                ...styles.primaryButton,
                opacity: saving
                  ? 0.6
                  : 1,
              }}
            >
              {saving
                ? "⏳ ĐANG LƯU..."
                : editingId
                ? "💾 LƯU THAY ĐỔI"
                : "➕ THÊM THƯ MỤC"}
            </button>

            {editingId && (
              <button
                onClick={resetForm}
                style={
                  styles.secondaryButton
                }
              >
                HỦY
              </button>
            )}
          </div>
        </section>

        {/* LIST */}

        <div style={styles.sectionHeader}>
          <div>
            <div style={styles.cardTitle}>
              DANH SÁCH THƯ MỤC
            </div>

            <div style={styles.count}>
              Tổng: {categories.length}
              {" "}thư mục
            </div>
          </div>

          <button
            onClick={loadData}
            style={styles.refreshButton}
          >
            🔄 LÀM MỚI
          </button>
        </div>

        {categories.length === 0 ? (
          <div style={styles.empty}>
            Chưa có thư mục nào.
          </div>
        ) : (
          <div style={styles.list}>
            {categories.map(
              (category) => {
                const productCount =
                  getProductCount(
                    category.id
                  );

                const uploading =
                  uploadingId ===
                  category.id;

                const deletingImage =
                  deletingImageId ===
                  category.id;

                const toggling =
                  togglingId ===
                  category.id;

                const deleting =
                  deletingId ===
                  category.id;

                return (
                  <div
                    key={category.id}
                    style={styles.card}
                  >
                    {/* IMAGE */}

                    <div
                      style={
                        styles.imageBox
                      }
                    >
                      {category.demo_image_url ? (
                        <img
                          src={
                            category.demo_image_url
                          }
                          alt={
                            category.name
                          }
                          style={
                            styles.image
                          }
                        />
                      ) : (
                        <div
                          style={
                            styles.noImage
                          }
                        >
                          <div
                            style={{
                              fontSize:
                                45,
                            }}
                          >
                            📁
                          </div>

                          <div>
                            CHƯA CÓ ẢNH DEMO
                          </div>
                        </div>
                      )}
                    </div>

                    {/* BODY */}

                    <div style={styles.body}>
                      <div
                        style={
                          styles.topLine
                        }
                      >
                        <div>
                          <div
                            style={
                              styles.categoryName
                            }
                          >
                            {category.name}
                          </div>

                          <div
                            style={
                              styles.categoryId
                            }
                          >
                            ID: #{category.id}
                          </div>
                        </div>

                        <div
                          style={{
                            ...styles.status,
                            color:
                              category.active
                                ? "#40e580"
                                : "#ff6666",
                            background:
                              category.active
                                ? "#092b18"
                                : "#301010",
                          }}
                        >
                          {category.active
                            ? "ĐANG HIỆN"
                            : "ĐÃ ẨN"}
                        </div>
                      </div>

                      {/* PRODUCT COUNT */}

                      <div
                        style={
                          styles.stats
                        }
                      >
                        <div
                          style={
                            styles.stat
                          }
                        >
                          <span
                            style={
                              styles.statLabel
                            }
                          >
                            SẢN PHẨM CON
                          </span>

                          <strong>
                            {productCount}
                          </strong>
                        </div>
                      </div>

                      {/* IMAGE ACTIONS */}

                      <div
                        style={
                          styles.imageActions
                        }
                      >
                        <label
                          style={{
                            ...styles.uploadButton,
                            opacity:
                              uploading
                                ? 0.6
                                : 1,
                          }}
                        >
                          {uploading
                            ? "⏳ ĐANG UPLOAD..."
                            : category.demo_image_url
                            ? "🔄 ĐỔI ẢNH DEMO"
                            : "📷 THÊM ẢNH DEMO"}

                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            disabled={
                              uploading
                            }
                            onChange={(
                              e
                            ) => {
                              const file =
                                e.target
                                  .files?.[0];

                              if (file) {
                                uploadDemoImage(
                                  category,
                                  file
                                );
                              }

                              e.target.value =
                                "";
                            }}
                            style={{
                              display:
                                "none",
                            }}
                          />
                        </label>

                        {category.demo_image_url && (
                          <button
                            onClick={() =>
                              deleteDemoImage(
                                category
                              )
                            }
                            disabled={
                              deletingImage
                            }
                            style={{
                              ...styles.deleteImageButton,
                              opacity:
                                deletingImage
                                  ? 0.6
                                  : 1,
                            }}
                          >
                            {deletingImage
                              ? "⏳ ĐANG XỬ LÝ..."
                              : "🗑️ XÓA ẢNH"}
                          </button>
                        )}
                      </div>

                      {/* ACTIONS */}

                      <div
                        style={
                          styles.actions
                        }
                      >
                        <button
                          onClick={() =>
                            startEdit(
                              category
                            )
                          }
                          style={
                            styles.editButton
                          }
                        >
                          ✏️ SỬA
                        </button>

                        <button
                          onClick={() =>
                            toggleCategory(
                              category
                            )
                          }
                          disabled={
                            toggling
                          }
                          style={
                            styles.toggleButton
                          }
                        >
                          {toggling
                            ? "⏳ ĐANG XỬ LÝ..."
                            : category.active
                            ? "⏸️ ẨN"
                            : "▶️ HIỆN"}
                        </button>

                        <button
                          onClick={() =>
                            deleteCategory(
                              category
                            )
                          }
                          disabled={
                            deleting
                          }
                          style={
                            styles.deleteButton
                          }
                        >
                          {deleting
                            ? "⏳ ĐANG XÓA..."
                            : "🗑️ XÓA"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </main>
  );
}

const styles = {
  loadingPage: {
    minHeight: "100vh",
    background: "#070707",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily:
      "Arial, sans-serif",
  },

  spinner: {
    width: "46px",
    height: "46px",
    borderRadius: "50%",
    border: "4px solid #222",
    borderTop:
      "4px solid #ff3030",
    animation:
      "xenovaCategorySpin .8s linear infinite",
    marginBottom: "20px",
  },

  loadingTitle: {
    fontSize: "18px",
    fontWeight: "900",
  },

  loadingText: {
    color: "#666",
    marginTop: "8px",
  },

  page: {
    minHeight: "100vh",
    background: "#070707",
    color: "#fff",
    padding:
      "90px 16px 50px",
    fontFamily:
      "Arial, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "1000px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    marginBottom: "25px",
  },

  brand: {
    color: "#ff3333",
    fontSize: "12px",
    fontWeight: "900",
    letterSpacing: "3px",
  },

  title: {
    margin:
      "7px 0 5px",
    fontSize: "30px",
    fontWeight: "900",
  },

  subtitle: {
    color: "#777",
    fontSize: "14px",
  },

  formCard: {
    background: "#101010",
    border:
      "1px solid #222",
    borderRadius: "15px",
    padding: "20px",
    marginBottom: "25px",
  },

  cardTitle: {
    fontSize: "18px",
    fontWeight: "900",
  },

  formRow: {
    display: "flex",
    gap: "10px",
    marginTop: "18px",
    flexWrap: "wrap",
  },

  input: {
    flex: 1,
    minWidth: "220px",
    boxSizing: "border-box",
    padding: "13px",
    background: "#080808",
    border:
      "1px solid #333",
    borderRadius: "9px",
    color: "#fff",
    outline: "none",
  },

  primaryButton: {
    border: "none",
    background: "#ff3030",
    color: "#fff",
    padding:
      "12px 16px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "900",
  },

  secondaryButton: {
    border:
      "1px solid #333",
    background: "#171717",
    color: "#fff",
    padding:
      "11px 15px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "800",
  },

  refreshButton: {
    border:
      "1px solid #333",
    background: "#151515",
    color: "#fff",
    padding:
      "10px 13px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "800",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginBottom: "15px",
  },

  count: {
    color: "#666",
    fontSize: "12px",
    marginTop: "5px",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },

  card: {
    background: "#101010",
    border:
      "1px solid #252525",
    borderRadius: "15px",
    overflow: "hidden",
  },

  imageBox: {
    width: "100%",
    height: "230px",
    background: "#080808",
  },

  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  noImage: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    color: "#555",
    fontSize: "12px",
    fontWeight: "900",
  },

  body: {
    padding: "18px",
  },

  topLine: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    gap: "10px",
  },

  categoryName: {
    fontSize: "21px",
    fontWeight: "900",
  },

  categoryId: {
    color: "#555",
    fontSize: "11px",
    marginTop: "5px",
  },

  status: {
    padding:
      "6px 10px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "900",
  },

  stats: {
    marginTop: "15px",
    padding: "13px",
    background: "#090909",
    borderRadius: "9px",
  },

  stat: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
  },

  statLabel: {
    color: "#666",
    fontSize: "10px",
    fontWeight: "900",
  },

  imageActions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "15px",
  },

  uploadButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent:
      "center",
    padding:
      "10px 13px",
    background: "#202020",
    border:
      "1px solid #383838",
    color: "#fff",
    borderRadius: "9px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "900",
  },

  deleteImageButton: {
    padding:
      "10px 13px",
    background: "#301010",
    border:
      "1px solid #5a1c1c",
    color: "#ff7777",
    borderRadius: "9px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "900",
  },

  actions: {
    display: "flex",
    gap: "8px",
    marginTop: "10px",
    flexWrap: "wrap",
  },

  editButton: {
    flex: 1,
    minWidth: "100px",
    padding: "11px",
    border:
      "1px solid #333",
    background: "#181818",
    color: "#fff",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "800",
  },

  toggleButton: {
    flex: 1,
    minWidth: "100px",
    padding: "11px",
    border:
      "1px solid #333",
    background: "#181818",
    color: "#fff",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "800",
  },

  deleteButton: {
    flex: 1,
    minWidth: "100px",
    padding: "11px",
    border:
      "1px solid #5a1c1c",
    background: "#241010",
    color: "#ff7070",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "800",
  },

  errorBox: {
    marginBottom: "18px",
    padding: "14px",
    background: "#2a0e0e",
    border:
      "1px solid #6b2222",
    borderRadius: "9px",
    color: "#ff8888",
    lineHeight: "1.5",
  },

  successBox: {
    marginBottom: "18px",
    padding: "13px",
    background: "#092518",
    border:
      "1px solid #18572f",
    borderRadius: "9px",
    color: "#5ee88d",
  },

  retryButton: {
    marginTop: "10px",
    padding: "9px 13px",
    border:
      "1px solid #6b3030",
    background: "#401515",
    color: "#fff",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "800",
  },

  empty: {
    padding: "50px 20px",
    background: "#101010",
    border:
      "1px solid #222",
    borderRadius: "15px",
    textAlign: "center",
    color: "#666",
  },
};

if (
  typeof document !==
    "undefined" &&
  !document.getElementById(
    "xenova-category-animation"
  )
) {
  const style =
    document.createElement(
      "style"
    );

  style.id =
    "xenova-category-animation";

  style.textContent = `
    @keyframes xenovaCategorySpin {
      from {
        transform: rotate(0deg);
      }

      to {
        transform: rotate(360deg);
      }
    }
  `;

  document.head.appendChild(style);
}
