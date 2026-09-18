"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function AdminProductsPage() {
  const router = useRouter();

  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);

  const [uploadingId, setUploadingId] = useState(null);
  const [deletingImageId, setDeletingImageId] = useState(null);

  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [message, setMessage] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      setCheckingAdmin(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("AUTH ERROR:", userError);
        router.replace("/login");
        return;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id,email,role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("PROFILE ERROR:", profileError);

        setError(
          "Không thể kiểm tra quyền Admin: " +
            profileError.message
        );

        setCheckingAdmin(false);
        setLoading(false);
        return;
      }

      if (!profile || profile.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      setCheckingAdmin(false);

      await loadData();
    } catch (err) {
      console.error("CHECK ADMIN ERROR:", err);

      setError(
        err?.message ||
          "Có lỗi xảy ra khi kiểm tra quyền Admin."
      );

      setCheckingAdmin(false);
      setLoading(false);
    }
  }

  async function loadData() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const [productsResult, categoriesResult] =
        await Promise.all([
          supabase
            .from("products")
            .select(
              `
              id,
              name,
              description,
              price,
              duration_days,
              active,
              is_active,
              demo_image_url,
              category_id,
              created_at
            `
            )
            .order("id", { ascending: true }),

          supabase
            .from("product_categories")
            .select(
              `
              id,
              name,
              active
            `
            )
            .order("id", { ascending: true }),
        ]);

      if (productsResult.error) {
        console.error(
          "PRODUCTS ERROR:",
          productsResult.error
        );

        throw new Error(
          "Lỗi tải sản phẩm: " +
            productsResult.error.message
        );
      }

      if (categoriesResult.error) {
        console.error(
          "CATEGORIES ERROR:",
          categoriesResult.error
        );

        throw new Error(
          "Lỗi tải thư mục: " +
            categoriesResult.error.message
        );
      }

      setProducts(productsResult.data || []);
      setCategories(categoriesResult.data || []);
    } catch (err) {
      console.error("LOAD DATA ERROR:", err);

      setError(
        err?.message ||
          "Không thể tải dữ liệu sản phẩm."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setCategoryId("");
    setPrice("");
    setDuration("");
    setDescription("");
  }

  function editProduct(product) {
    setEditingId(product.id);
    setName(product.name || "");
    setCategoryId(
      product.category_id
        ? String(product.category_id)
        : ""
    );
    setPrice(
      product.price !== null &&
        product.price !== undefined
        ? String(product.price)
        : ""
    );
    setDuration(
      product.duration_days !== null &&
        product.duration_days !== undefined
        ? String(product.duration_days)
        : ""
    );
    setDescription(product.description || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveProduct() {
    setMessage("");
    setError("");

    const cleanName = name.trim();
    const cleanPrice = Number(price);
    const cleanDuration = Number(duration);

    if (!cleanName) {
      setError("Vui lòng nhập tên sản phẩm.");
      return;
    }

    if (!Number.isInteger(cleanPrice) || cleanPrice <= 0) {
      setError("Giá sản phẩm không hợp lệ.");
      return;
    }

    if (
      !Number.isInteger(cleanDuration) ||
      cleanDuration <= 0
    ) {
      setError("Số ngày sử dụng không hợp lệ.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: cleanName,
        description: description.trim(),
        price: cleanPrice,
        duration_days: cleanDuration,
        category_id: categoryId
          ? Number(categoryId)
          : null,
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingId);

        if (updateError) {
          throw new Error(
            "Không thể cập nhật sản phẩm: " +
              updateError.message
          );
        }

        setMessage("Đã cập nhật sản phẩm.");
      } else {
        const { error: insertError } = await supabase
          .from("products")
          .insert({
            ...payload,
            active: true,
            is_active: true,
          });

        if (insertError) {
          throw new Error(
            "Không thể tạo sản phẩm: " +
              insertError.message
          );
        }

        setMessage("Đã thêm sản phẩm.");
      }

      resetForm();
      await loadData();
    } catch (err) {
      console.error("SAVE PRODUCT ERROR:", err);

      setError(
        err?.message ||
          "Không thể lưu sản phẩm."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleProduct(product) {
    if (!product) return;

    setError("");
    setMessage("");
    setTogglingId(product.id);

    try {
      const newStatus = !(
        product.active === true &&
        product.is_active === true
      );

      const { error: updateError } = await supabase
        .from("products")
        .update({
          active: newStatus,
          is_active: newStatus,
        })
        .eq("id", product.id);

      if (updateError) {
        throw new Error(
          "Không thể thay đổi trạng thái: " +
            updateError.message
        );
      }

      setMessage(
        newStatus
          ? "Đã bật bán sản phẩm."
          : "Đã tắt bán sản phẩm."
      );

      await loadData();
    } catch (err) {
      console.error(
        "TOGGLE PRODUCT ERROR:",
        err
      );

      setError(
        err?.message ||
          "Không thể thay đổi trạng thái sản phẩm."
      );
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteProduct(product) {
    if (!product) return;

    const ok = window.confirm(
      `Bạn có chắc muốn xóa sản phẩm "${product.name}" không?`
    );

    if (!ok) return;

    setError("");
    setMessage("");
    setDeletingId(product.id);

    try {
      /*
       * Không cho xóa nếu sản phẩm đã có KEY
       * để tránh phá dữ liệu mua bán.
       */
      const { count, error: keysError } =
        await supabase
          .from("keys")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("product_id", product.id);

      if (keysError) {
        throw new Error(
          "Không thể kiểm tra KEY của sản phẩm: " +
            keysError.message
        );
      }

      if ((count || 0) > 0) {
        throw new Error(
          "Không thể xóa sản phẩm này vì đã có KEY liên kết. Hãy tắt bán sản phẩm thay vì xóa."
        );
      }

      const { error: deleteError } =
        await supabase
          .from("products")
          .delete()
          .eq("id", product.id);

      if (deleteError) {
        throw new Error(
          "Không thể xóa sản phẩm: " +
            deleteError.message
        );
      }

      setMessage("Đã xóa sản phẩm.");

      if (editingId === product.id) {
        resetForm();
      }

      await loadData();
    } catch (err) {
      console.error(
        "DELETE PRODUCT ERROR:",
        err
      );

      setError(
        err?.message ||
          "Không thể xóa sản phẩm."
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function uploadDemoImage(product, file) {
    if (!file || !product) return;

    setError("");
    setMessage("");
    setUploadingId(product.id);

    try {
      const extension =
        file.name.split(".").pop()?.toLowerCase() ||
        "jpg";

      const fileName =
        `${product.id}-${Date.now()}.${extension}`;

      const filePath =
        `products/${fileName}`;

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

      /*
       * Chỉ cập nhật demo_image_url.
       * Không đụng tới giá, KEY, ví hay trạng thái.
       */
      const { error: updateError } =
        await supabase
          .from("products")
          .update({
            demo_image_url: imageUrl,
          })
          .eq("id", product.id);

      if (updateError) {
        throw new Error(
          "Upload thành công nhưng không lưu được ảnh: " +
            updateError.message
        );
      }

      setMessage(
        "Đã thêm ảnh demo cho sản phẩm."
      );

      await loadData();
    } catch (err) {
      console.error(
        "UPLOAD DEMO IMAGE ERROR:",
        err
      );

      setError(
        err?.message ||
          "Không thể upload ảnh demo."
      );
    } finally {
      setUploadingId(null);
    }
  }

  async function deleteDemoImage(product) {
    if (!product?.demo_image_url) return;

    const ok = window.confirm(
      "Bạn có chắc muốn xóa ảnh demo này?"
    );

    if (!ok) return;

    setError("");
    setMessage("");
    setDeletingImageId(product.id);

    try {
      /*
       * Xóa URL khỏi database trước.
       * Không ảnh hưởng sản phẩm.
       */
      const { error: updateError } =
        await supabase
          .from("products")
          .update({
            demo_image_url: null,
          })
          .eq("id", product.id);

      if (updateError) {
        throw new Error(
          "Không thể xóa ảnh demo: " +
            updateError.message
        );
      }

      setMessage("Đã xóa ảnh demo.");

      await loadData();
    } catch (err) {
      console.error(
        "DELETE DEMO IMAGE ERROR:",
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

  function getCategoryName(categoryId) {
    if (!categoryId) {
      return "Chưa phân loại";
    }

    const category = categories.find(
      (item) =>
        Number(item.id) === Number(categoryId)
    );

    return category?.name || "Chưa phân loại";
  }

  if (checkingAdmin) {
    return (
      <main style={styles.loadingPage}>
        <div style={styles.spinner} />
        <div style={styles.loadingTitle}>
          ĐANG KIỂM TRA QUYỀN ADMIN
        </div>
        <div style={styles.loadingText}>
          Vui lòng chờ...
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main style={styles.loadingPage}>
        <div style={styles.spinner} />

        <div style={styles.loadingTitle}>
          ĐANG TẢI SẢN PHẨM
        </div>

        <div style={styles.loadingText}>
          Đang tải danh mục và sản phẩm...
        </div>

        {error && (
          <div style={styles.errorBox}>
            <b>LỖI:</b>
            <div>{error}</div>

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
            <div style={styles.smallTitle}>
              XENOVA PLAY
            </div>

            <h1 style={styles.title}>
              QUẢN LÝ SẢN PHẨM
            </h1>

            <div style={styles.subtitle}>
              Thêm, sửa, quản lý KEY và ảnh demo
            </div>
          </div>

          <button
            onClick={() =>
              router.push("/admin/categories")
            }
            style={styles.secondaryButton}
          >
            📁 QUẢN LÝ THƯ MỤC
          </button>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <b>ĐÃ XẢY RA LỖI</b>
            <div style={{ marginTop: 6 }}>
              {error}
            </div>

            <button
              onClick={loadData}
              style={styles.retryButton}
            >
              🔄 THỬ LẠI
            </button>
          </div>
        )}

        {message && (
          <div style={styles.successBox}>
            ✅ {message}
          </div>
        )}

        <section style={styles.formCard}>
          <div style={styles.cardTitle}>
            {editingId
              ? "✏️ CHỈNH SỬA SẢN PHẨM"
              : "➕ THÊM SẢN PHẨM"}
          </div>

          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>
                Tên sản phẩm
              </label>

              <input
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="VD: KEY 1 NGÀY"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Thư mục
              </label>

              <select
                value={categoryId}
                onChange={(e) =>
                  setCategoryId(e.target.value)
                }
                style={styles.input}
              >
                <option value="">
                  — Chưa chọn thư mục —
                </option>

                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Giá bán
              </label>

              <input
                type="number"
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value)
                }
                placeholder="10000"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Thời hạn (ngày)
              </label>

              <input
                type="number"
                value={duration}
                onChange={(e) =>
                  setDuration(e.target.value)
                }
                placeholder="1"
                style={styles.input}
              />
            </div>

            <div
              style={{
                ...styles.field,
                gridColumn: "1 / -1",
              }}
            >
              <label style={styles.label}>
                Mô tả
              </label>

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                placeholder="Mô tả sản phẩm..."
                rows={4}
                style={{
                  ...styles.input,
                  resize: "vertical",
                }}
              />
            </div>
          </div>

          <div style={styles.formActions}>
            <button
              onClick={saveProduct}
              disabled={saving}
              style={{
                ...styles.primaryButton,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving
                ? "⏳ ĐANG LƯU..."
                : editingId
                ? "💾 LƯU THAY ĐỔI"
                : "➕ THÊM SẢN PHẨM"}
            </button>

            {editingId && (
              <button
                onClick={resetForm}
                disabled={saving}
                style={styles.secondaryButton}
              >
                HỦY
              </button>
            )}
          </div>
        </section>

        <div style={styles.sectionHeader}>
          <div>
            <div style={styles.cardTitle}>
              DANH SÁCH SẢN PHẨM
            </div>

            <div style={styles.count}>
              Tổng: {products.length} sản phẩm
            </div>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            style={styles.refreshButton}
          >
            🔄 LÀM MỚI
          </button>
        </div>

        {products.length === 0 ? (
          <div style={styles.empty}>
            Chưa có sản phẩm nào.
          </div>
        ) : (
          <div style={styles.list}>
            {products.map((product) => {
              const isActive =
                product.active === true &&
                product.is_active === true;

              const uploading =
                uploadingId === product.id;

              const deletingImage =
                deletingImageId === product.id;

              const toggling =
                togglingId === product.id;

              const deleting =
                deletingId === product.id;

              return (
                <div
                  key={product.id}
                  style={styles.productCard}
                >
                  <div style={styles.imageBox}>
                    {product.demo_image_url ? (
                      <img
                        src={
                          product.demo_image_url
                        }
                        alt={product.name}
                        style={styles.image}
                      />
                    ) : (
                      <div
                        style={
                          styles.noImage
                        }
                      >
                        <div
                          style={{
                            fontSize: 34,
                          }}
                        >
                          🖼️
                        </div>

                        <div>
                          CHƯA CÓ ẢNH DEMO
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={styles.productBody}>
                    <div style={styles.productTop}>
                      <div>
                        <div
                          style={
                            styles.productName
                          }
                        >
                          {product.name}
                        </div>

                        <div
                          style={
                            styles.category
                          }
                        >
                          📁{" "}
                          {getCategoryName(
                            product.category_id
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          ...styles.status,
                          background: isActive
                            ? "#092b18"
                            : "#301010",
                          color: isActive
                            ? "#35e27d"
                            : "#ff6666",
                          borderColor: isActive
                            ? "#164f2e"
                            : "#5a1c1c",
                        }}
                      >
                        {isActive
                          ? "ĐANG BÁN"
                          : "ĐÃ TẮT"}
                      </div>
                    </div>

                    <div style={styles.infoGrid}>
                      <div>
                        <span
                          style={
                            styles.infoLabel
                          }
                        >
                          GIÁ
                        </span>

                        <strong
                          style={
                            styles.price
                          }
                        >
                          {Number(
                            product.price || 0
                          ).toLocaleString(
                            "vi-VN"
                          )}
                          đ
                        </strong>
                      </div>

                      <div>
                        <span
                          style={
                            styles.infoLabel
                          }
                        >
                          THỜI HẠN
                        </span>

                        <strong>
                          {product.duration_days}{" "}
                          ngày
                        </strong>
                      </div>

                      <div>
                        <span
                          style={
                            styles.infoLabel
                          }
                        >
                          ID
                        </span>

                        <strong>
                          #{product.id}
                        </strong>
                      </div>
                    </div>

                    {product.description && (
                      <div
                        style={
                          styles.description
                        }
                      >
                        {product.description}
                      </div>
                    )}

                    <div style={styles.imageActions}>
                      <label
                        style={{
                          ...styles.uploadButton,
                          opacity:
                            uploading ? 0.6 : 1,
                        }}
                      >
                        {uploading
                          ? "⏳ ĐANG UPLOAD..."
                          : product.demo_image_url
                          ? "🔄 ĐỔI ẢNH DEMO"
                          : "📷 THÊM ẢNH DEMO"}

                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          disabled={uploading}
                          onChange={(e) => {
                            const file =
                              e.target.files?.[0];

                            if (file) {
                              uploadDemoImage(
                                product,
                                file
                              );
                            }

                            e.target.value = "";
                          }}
                          style={{
                            display: "none",
                          }}
                        />
                      </label>

                      {product.demo_image_url && (
                        <button
                          onClick={() =>
                            deleteDemoImage(
                              product
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

                    <div style={styles.actions}>
                      <button
                        onClick={() =>
                          editProduct(product)
                        }
                        disabled={
                          saving ||
                          deleting
                        }
                        style={
                          styles.editButton
                        }
                      >
                        ✏️ SỬA
                      </button>

                      <button
                        onClick={() =>
                          toggleProduct(
                            product
                          )
                        }
                        disabled={
                          toggling ||
                          deleting
                        }
                        style={{
                          ...styles.toggleButton,
                          opacity:
                            toggling
                              ? 0.6
                              : 1,
                        }}
                      >
                        {toggling
                          ? "⏳ ĐANG XỬ LÝ..."
                          : isActive
                          ? "⏸️ TẮT BÁN"
                          : "▶️ BẬT BÁN"}
                      </button>

                      <button
                        onClick={() =>
                          deleteProduct(
                            product
                          )
                        }
                        disabled={
                          deleting ||
                          toggling
                        }
                        style={{
                          ...styles.deleteButton,
                          opacity:
                            deleting
                              ? 0.6
                              : 1,
                        }}
                      >
                        {deleting
                          ? "⏳ ĐANG XÓA..."
                          : "🗑️ XÓA"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
    fontFamily: "Arial, sans-serif",
  },

  spinner: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    border: "4px solid #222",
    borderTop: "4px solid #ff3030",
    animation: "xenovaSpin 0.8s linear infinite",
    marginBottom: "20px",
  },

  loadingTitle: {
    fontSize: "18px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  loadingText: {
    color: "#777",
    marginTop: "8px",
    textAlign: "center",
  },

  page: {
    minHeight: "100vh",
    background: "#070707",
    color: "#fff",
    padding: "90px 16px 50px",
    fontFamily: "Arial, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "1100px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "25px",
    flexWrap: "wrap",
  },

  smallTitle: {
    color: "#ff3333",
    fontSize: "12px",
    fontWeight: "900",
    letterSpacing: "3px",
  },

  title: {
    margin: "7px 0 5px",
    fontSize: "30px",
    fontWeight: "900",
  },

  subtitle: {
    color: "#777",
    fontSize: "14px",
  },

  formCard: {
    background: "#101010",
    border: "1px solid #222",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "30px",
  },

  cardTitle: {
    fontSize: "18px",
    fontWeight: "900",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "15px",
    marginTop: "20px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  label: {
    color: "#aaa",
    fontSize: "13px",
    fontWeight: "700",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    borderRadius: "10px",
    border: "1px solid #303030",
    background: "#080808",
    color: "#fff",
    outline: "none",
    fontSize: "14px",
  },

  formActions: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
    flexWrap: "wrap",
  },

  primaryButton: {
    border: "none",
    background: "#ff3030",
    color: "#fff",
    padding: "13px 18px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  secondaryButton: {
    border: "1px solid #333",
    background: "#171717",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },

  refreshButton: {
    border: "1px solid #333",
    background: "#121212",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "800",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "15px",
  },

  count: {
    color: "#666",
    fontSize: "13px",
    marginTop: "5px",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },

  productCard: {
    background: "#101010",
    border: "1px solid #222",
    borderRadius: "16px",
    overflow: "hidden",
  },

  imageBox: {
    width: "100%",
    height: "240px",
    background: "#080808",
    overflow: "hidden",
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
    fontWeight: "800",
  },

  productBody: {
    padding: "18px",
  },

  productTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
  },

  productName: {
    fontSize: "20px",
    fontWeight: "900",
  },

  category: {
    color: "#888",
    fontSize: "13px",
    marginTop: "6px",
  },

  status: {
    border: "1px solid",
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "11px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,1fr)",
    gap: "10px",
    marginTop: "18px",
    padding: "14px",
    background: "#090909",
    borderRadius: "10px",
  },

  infoLabel: {
    display: "block",
    color: "#666",
    fontSize: "10px",
    fontWeight: "800",
    marginBottom: "5px",
  },

  price: {
    color: "#ff4545",
  },

  description: {
    marginTop: "15px",
    padding: "12px",
    background: "#0a0a0a",
    borderRadius: "9px",
    color: "#aaa",
    fontSize: "13px",
    lineHeight: "1.5",
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
    justifyContent: "center",
    padding: "10px 13px",
    background: "#202020",
    border: "1px solid #383838",
    color: "#fff",
    borderRadius: "9px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "900",
  },

  deleteImageButton: {
    padding: "10px 13px",
    background: "#301010",
    border: "1px solid #5a1c1c",
    color: "#ff7777",
    borderRadius: "9px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "900",
  },

  actions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "10px",
  },

  editButton: {
    flex: 1,
    minWidth: "100px",
    padding: "11px",
    border: "1px solid #333",
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
    border: "1px solid #333",
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
    border: "1px solid #5a1c1c",
    background: "#241010",
    color: "#ff7070",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "800",
  },

  errorBox: {
    marginBottom: "18px",
    padding: "15px",
    background: "#2a0e0e",
    border: "1px solid #6b2222",
    borderRadius: "10px",
    color: "#ff8a8a",
    lineHeight: "1.5",
  },

  successBox: {
    marginBottom: "18px",
    padding: "14px",
    background: "#0b2516",
    border: "1px solid #18572f",
    borderRadius: "10px",
    color: "#5ee88d",
  },

  retryButton: {
    marginTop: "12px",
    padding: "9px 13px",
    border: "1px solid #6b3030",
    background: "#401515",
    color: "#fff",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "800",
  },

  empty: {
    padding: "50px 20px",
    textAlign: "center",
    background: "#101010",
    border: "1px solid #222",
    borderRadius: "15px",
    color: "#666",
  },
};
