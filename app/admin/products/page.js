"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function AdminProductsPage() {
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [actionId, setActionId] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [categoryId, setCategoryId] = useState("");

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

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, email, role")
          .eq("id", user.id)
          .maybeSingle();

      if (
        profileError ||
        !profile ||
        profile.role !== "admin"
      ) {
        router.replace("/dashboard");
        return;
      }

      await Promise.all([
        loadProducts(),
        loadCategories(),
      ]);
    } catch (error) {
      console.error(
        "ADMIN PRODUCT CHECK ERROR:",
        error
      );
      router.replace("/dashboard");
    }
  }

  async function loadProducts() {
    const { data, error } = await supabase
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
        created_at,
        demo_image_url,
        category_id,
        product_categories (
          id,
          name
        )
        `
      )
      .order("id", { ascending: true });

    if (error) {
      console.error(
        "PRODUCT LOAD ERROR:",
        error
      );
      setMessage(
        "Không thể tải danh sách sản phẩm."
      );
      return;
    }

    setProducts(data || []);
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from("product_categories")
      .select("id, name, active")
      .order("id", { ascending: true });

    if (error) {
      console.error(
        "CATEGORY LOAD ERROR:",
        error
      );
      setMessage(
        "Không thể tải danh sách thư mục."
      );
      return;
    }

    setCategories(data || []);
  }

  function resetForm() {
    setEditing(null);
    setName("");
    setDescription("");
    setPrice("");
    setDuration("");
    setCategoryId("");
  }

  function startEdit(product) {
    setEditing(product);

    setName(product.name || "");
    setDescription(product.description || "");
    setPrice(String(product.price || ""));
    setDuration(
      String(product.duration_days || "")
    );
    setCategoryId(
      product.category_id
        ? String(product.category_id)
        : ""
    );

    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveProduct() {
    const cleanName = name.trim();
    const cleanDescription =
      description.trim();
    const cleanPrice = Number(price);
    const cleanDuration = Number(duration);

    if (!cleanName) {
      setMessage(
        "Vui lòng nhập tên sản phẩm."
      );
      return;
    }

    if (
      !Number.isInteger(cleanPrice) ||
      cleanPrice <= 0
    ) {
      setMessage(
        "Giá sản phẩm không hợp lệ."
      );
      return;
    }

    if (
      !Number.isInteger(cleanDuration) ||
      cleanDuration <= 0
    ) {
      setMessage(
        "Thời hạn sản phẩm không hợp lệ."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const payload = {
        name: cleanName,
        description: cleanDescription,
        price: cleanPrice,
        duration_days: cleanDuration,
        category_id: categoryId
          ? Number(categoryId)
          : null,
      };

      if (editing) {
        const { error } = await supabase
          .from("products")
          .update({
            ...payload,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", editing.id);

        if (error) {
          console.error(
            "UPDATE PRODUCT ERROR:",
            error
          );

          setMessage(
            error.message ||
              "Không thể cập nhật sản phẩm."
          );

          setSaving(false);
          return;
        }

        setMessage(
          "✓ Đã cập nhật sản phẩm."
        );
      } else {
        const { error } = await supabase
          .from("products")
          .insert({
            ...payload,
            active: true,
            is_active: true,
          });

        if (error) {
          console.error(
            "CREATE PRODUCT ERROR:",
            error
          );

          setMessage(
            error.message ||
              "Không thể tạo sản phẩm."
          );

          setSaving(false);
          return;
        }

        setMessage(
          "✓ Đã tạo sản phẩm mới."
        );
      }

      resetForm();
      await loadProducts();
    } catch (error) {
      console.error(
        "SAVE PRODUCT ERROR:",
        error
      );

      setMessage("Đã xảy ra lỗi.");
    }

    setSaving(false);
  }

  async function toggleProduct(product) {
    setActionId(product.id);
    setMessage("");

    const nextStatus = !product.is_active;

    const { error } = await supabase
      .from("products")
      .update({
        is_active: nextStatus,
        active: nextStatus,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", product.id);

    if (error) {
      console.error(
        "TOGGLE PRODUCT ERROR:",
        error
      );

      setMessage(
        "Không thể thay đổi trạng thái sản phẩm."
      );

      setActionId(null);
      return;
    }

    setMessage(
      nextStatus
        ? "✓ Đã bật sản phẩm."
        : "✓ Đã ẩn sản phẩm."
    );

    await loadProducts();
    setActionId(null);
  }

  function getStoragePath(url) {
    if (!url) return null;

    const marker =
      "/storage/v1/object/public/product-demo/";

    const index = url.indexOf(marker);

    if (index === -1) return null;

    return decodeURIComponent(
      url.substring(
        index + marker.length
      )
    );
  }

  async function uploadDemoImage(
    product,
    file
  ) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage(
        "Chỉ được upload file hình ảnh."
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage(
        "Ảnh không được vượt quá 10MB."
      );
      return;
    }

    setUploadingId(product.id);
    setMessage("");

    try {
      if (product.demo_image_url) {
        const oldPath =
          getStoragePath(
            product.demo_image_url
          );

        if (oldPath) {
          await supabase.storage
            .from("product-demo")
            .remove([oldPath]);
        }
      }

      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      const filePath =
        `${product.id}/demo-${Date.now()}.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from("product-demo")
          .upload(
            filePath,
            file,
            {
              cacheControl: "3600",
              upsert: false,
            }
          );

      if (uploadError) {
        console.error(
          "UPLOAD DEMO ERROR:",
          uploadError
        );

        setMessage(
          uploadError.message ||
            "Không thể upload ảnh."
        );

        setUploadingId(null);
        return;
      }

      const {
        data: publicData,
      } = supabase.storage
        .from("product-demo")
        .getPublicUrl(filePath);

      const publicUrl =
        publicData?.publicUrl;

      if (!publicUrl) {
        setMessage(
          "Không lấy được URL ảnh."
        );

        setUploadingId(null);
        return;
      }

      const { error: updateError } =
        await supabase
          .from("products")
          .update({
            demo_image_url:
              publicUrl,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", product.id);

      if (updateError) {
        console.error(
          "SAVE DEMO URL ERROR:",
          updateError
        );

        setMessage(
          updateError.message ||
            "Không thể lưu ảnh demo."
        );

        setUploadingId(null);
        return;
      }

      setMessage(
        "✓ Đã upload ảnh demo."
      );

      await loadProducts();
    } catch (error) {
      console.error(
        "UPLOAD DEMO ERROR:",
        error
      );

      setMessage(
        "Không thể upload ảnh."
      );
    }

    setUploadingId(null);
  }

  async function removeDemoImage(
    product
  ) {
    if (!product.demo_image_url) {
      return;
    }

    const confirmed =
      window.confirm(
        "Bạn có chắc muốn xóa ảnh demo này?"
      );

    if (!confirmed) return;

    setUploadingId(product.id);
    setMessage("");

    try {
      const path =
        getStoragePath(
          product.demo_image_url
        );

      if (path) {
        await supabase.storage
          .from("product-demo")
          .remove([path]);
      }

      const { error } =
        await supabase
          .from("products")
          .update({
            demo_image_url: null,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", product.id);

      if (error) {
        console.error(
          "REMOVE DEMO URL ERROR:",
          error
        );

        setMessage(
          error.message ||
            "Không thể xóa ảnh demo."
        );

        setUploadingId(null);
        return;
      }

      setMessage(
        "✓ Đã xóa ảnh demo."
      );

      await loadProducts();
    } catch (error) {
      console.error(
        "REMOVE DEMO ERROR:",
        error
      );

      setMessage(
        "Không thể xóa ảnh demo."
      );
    }

    setUploadingId(null);
  }

  async function deleteProduct(
    product
  ) {
    const confirmed =
      window.confirm(
        `Bạn có chắc muốn xóa sản phẩm "${product.name}"?\n\nCác KEY đã bán không bị xóa.`
      );

    if (!confirmed) return;

    setActionId(product.id);
    setMessage("");

    try {
      if (product.demo_image_url) {
        const path =
          getStoragePath(
            product.demo_image_url
          );

        if (path) {
          await supabase.storage
            .from("product-demo")
            .remove([path]);
        }
      }

      const { error } =
        await supabase
          .from("products")
          .delete()
          .eq("id", product.id);

      if (error) {
        console.error(
          "DELETE PRODUCT ERROR:",
          error
        );

        setMessage(
          error.message ||
            "Không thể xóa sản phẩm."
        );

        setActionId(null);
        return;
      }

      if (
        editing?.id === product.id
      ) {
        resetForm();
      }

      setMessage(
        "✓ Đã xóa sản phẩm."
      );

      await loadProducts();
    } catch (error) {
      console.error(
        "DELETE PRODUCT ERROR:",
        error
      );

      setMessage(
        "Không thể xóa sản phẩm."
      );
    }

    setActionId(null);
  }

  function getCategoryName(product) {
    if (
      product.product_categories &&
      !Array.isArray(
        product.product_categories
      )
    ) {
      return (
        product.product_categories.name
      );
    }

    if (
      Array.isArray(
        product.product_categories
      ) &&
      product.product_categories.length >
        0
    ) {
      return (
        product.product_categories[0]
          .name
      );
    }

    if (product.category_id) {
      const category =
        categories.find(
          (item) =>
            String(item.id) ===
            String(
              product.category_id
            )
        );

      return (
        category?.name ||
        "Chưa có thư mục"
      );
    }

    return "Chưa có thư mục";
  }

  if (loading) {
    return (
      <main style={styles.loadingPage}>
        <div style={styles.loadingBox}>
          <div style={styles.spinner}></div>

          <div style={styles.loadingTitle}>
            ĐANG TẢI SẢN PHẨM
          </div>

          <div style={styles.loadingText}>
            Đang kết nối dữ liệu...
          </div>
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
              QUẢN LÝ SẢN PHẨM
            </h1>

            <p style={styles.subtitle}>
              Tạo sản phẩm, gán thư mục và
              quản lý ảnh demo.
            </p>
          </div>

          <button
            onClick={() =>
              router.push(
                "/admin/categories"
              )
            }
            style={styles.categoryButton}
          >
            📁 QUẢN LÝ THƯ MỤC
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
              ? "✏️ SỬA SẢN PHẨM"
              : "➕ TẠO SẢN PHẨM MỚI"}
          </h2>

          <div style={styles.gridForm}>
            <div style={styles.field}>
              <label style={styles.label}>
                Tên sản phẩm
              </label>

              <input
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="Ví dụ: KEY VIP 7 NGÀY"
                style={styles.input}
                disabled={saving}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Thư mục
              </label>

              <select
                value={categoryId}
                onChange={(e) =>
                  setCategoryId(
                    e.target.value
                  )
                }
                style={styles.input}
                disabled={saving}
              >
                <option value="">
                  — Chưa chọn thư mục —
                </option>

                {categories
                  .filter(
                    (category) =>
                      category.active ||
                      String(
                        category.id
                      ) ===
                        String(
                          categoryId
                        )
                  )
                  .map((category) => (
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
                min="0"
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value)
                }
                placeholder="50000"
                style={styles.input}
                disabled={saving}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Thời hạn (ngày)
              </label>

              <input
                type="number"
                min="1"
                value={duration}
                onChange={(e) =>
                  setDuration(
                    e.target.value
                  )
                }
                placeholder="7"
                style={styles.input}
                disabled={saving}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              Mô tả
            </label>

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
              placeholder="Mô tả sản phẩm..."
              rows={4}
              style={styles.textarea}
              disabled={saving}
            />
          </div>

          <div style={styles.formActions}>
            <button
              onClick={saveProduct}
              disabled={saving}
              style={{
                ...styles.saveButton,
                ...(saving
                  ? styles.buttonDisabled
                  : {}),
              }}
            >
              {saving ? (
                <>
                  <span
                    style={styles.smallSpinner}
                  ></span>
                  ĐANG LƯU...
                </>
              ) : editing ? (
                "LƯU THAY ĐỔI"
              ) : (
                "+ TẠO SẢN PHẨM"
              )}
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
              📦 DANH SÁCH SẢN PHẨM
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
              {products.map((product) => {
                const isActioning =
                  actionId === product.id;

                const isUploading =
                  uploadingId === product.id;

                return (
                  <div
                    key={product.id}
                    style={styles.product}
                  >
                    {product.demo_image_url && (
                      <div
                        style={
                          styles.demoPreview
                        }
                      >
                        <img
                          src={
                            product.demo_image_url
                          }
                          alt={`Demo ${product.name}`}
                          style={
                            styles.demoImage
                          }
                        />
                      </div>
                    )}

                    <div
                      style={
                        styles.productTop
                      }
                    >
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
                            styles.productId
                          }
                        >
                          ID: {product.id}
                        </div>
                      </div>

                      <div
                        style={
                          product.is_active
                            ? styles.active
                            : styles.inactive
                        }
                      >
                        {product.is_active
                          ? "● ĐANG BÁN"
                          : "● ĐANG ẨN"}
                      </div>
                    </div>

                    <div
                      style={
                        styles.categoryTag
                      }
                    >
                      📁{" "}
                      {getCategoryName(
                        product
                      )}
                    </div>

                    <div
                      style={
                        styles.productInfo
                      }
                    >
                      <div>
                        <span
                          style={
                            styles.infoLabel
                          }
                        >
                          Giá
                        </span>

                        <strong
                          style={
                            styles.infoValue
                          }
                        >
                          {Number(
                            product.price ||
                              0
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
                          Thời hạn
                        </span>

                        <strong
                          style={
                            styles.infoValue
                          }
                        >
                          {
                            product.duration_days
                          }{" "}
                          ngày
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

                    <div
                      style={
                        styles.imageActions
                      }
                    >
                      <label
                        style={
                          isUploading
                            ? styles.uploadButtonDisabled
                            : styles.uploadButton
                        }
                      >
                        {isUploading ? (
                          <>
                            <span
                              style={
                                styles.smallSpinner
                              }
                            ></span>
                            ĐANG UPLOAD...
                          </>
                        ) : product.demo_image_url ? (
                          "📷 ĐỔI ẢNH DEMO"
                        ) : (
                          "📷 UPLOAD ẢNH DEMO"
                        )}

                        <input
                          type="file"
                          accept="image/*"
                          disabled={
                            isUploading ||
                            isActioning
                          }
                          onChange={(e) => {
                            const file =
                              e.target.files?.[0];

                            if (file) {
                              uploadDemoImage(
                                product,
                                file
                              );
                            }

                            e.target.value =
                              "";
                          }}
                          style={{
                            display: "none",
                          }}
                        />
                      </label>

                      {product.demo_image_url && (
                        <button
                          onClick={() =>
                            removeDemoImage(
                              product
                            )
                          }
                          disabled={
                            isUploading ||
                            isActioning
                          }
                          style={
                            styles.removeImageButton
                          }
                        >
                          {isUploading
                            ? "ĐANG XỬ LÝ..."
                            : "XÓA ẢNH"}
                        </button>
                      )}
                    </div>

                    <div
                      style={styles.actions}
                    >
                      <button
                        onClick={() =>
                          startEdit(product)
                        }
                        disabled={
                          isActioning ||
                          isUploading
                        }
                        style={
                          styles.editButton
                        }
                      >
                        SỬA
                      </button>

                      <button
                        onClick={() =>
                          toggleProduct(
                            product
                          )
                        }
                        disabled={
                          isActioning ||
                          isUploading
                        }
                        style={
                          styles.toggleButton
                        }
                      >
                        {isActioning ? (
                          <>
                            <span
                              style={
                                styles.smallSpinner
                              }
                            ></span>
                            ĐANG XỬ LÝ...
                          </>
                        ) : product.is_active ? (
                          "ẨN"
                        ) : (
                          "HIỆN"
                        )}
                      </button>

                      <button
                        onClick={() =>
                          deleteProduct(
                            product
                          )
                        }
                        disabled={
                          isActioning ||
                          isUploading
                        }
                        style={
                          styles.deleteButton
                        }
                      >
                        {isActioning
                          ? "ĐANG XÓA..."
                          : "XÓA"}
                      </button>
                    </div>
                  </div>
                );
              })}
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

  loadingPage: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #111d36 0%, #070b12 45%, #05070b 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  },

  loadingBox: {
    width: "100%",
    maxWidth: "330px",
    padding: "30px 20px",
    borderRadius: "18px",
    background: "#0d1420",
    border: "1px solid #202d42",
    textAlign: "center",
    boxShadow:
      "0 20px 60px rgba(0,0,0,.35)",
  },

  spinner: {
    width: "42px",
    height: "42px",
    margin: "0 auto 18px",
    borderRadius: "50%",
    border: "4px solid #26344a",
    borderTopColor: "#fff",
    animation:
      "xenovaSpin 0.8s linear infinite",
  },

  loadingTitle: {
    fontSize: "15px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  loadingText: {
    marginTop: "7px",
    color: "#718097",
    fontSize: "12px",
  },

  container: {
    width: "100%",
    maxWidth: "1100px",
    margin: "0 auto",
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
    margin: "12px 0 6px",
    fontSize:
      "clamp(28px, 5vw, 44px)",
    fontWeight: "900",
  },

  subtitle: {
    margin: 0,
    color: "#7f8ba0",
    lineHeight: 1.5,
  },

  categoryButton: {
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

  gridForm: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "15px",
    marginTop: "18px",
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
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    minWidth: "150px",
    padding: "12px 16px",
    border: 0,
    borderRadius: "9px",
    background: "#fff",
    color: "#000",
    fontWeight: "900",
    cursor: "pointer",
  },

  buttonDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
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

  smallSpinner: {
    display: "inline-block",
    width: "13px",
    height: "13px",
    borderRadius: "50%",
    border: "2px solid rgba(0,0,0,.25)",
    borderTopColor: "currentColor",
    animation:
      "xenovaSpin 0.7s linear infinite",
  },

  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "14px",
  },

  count: {
    color: "#718097",
    fontSize: "12px",
  },

  products: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "15px",
  },

  product: {
    padding: "18px",
    borderRadius: "15px",
    background:
      "linear-gradient(145deg, #111927, #0b111b)",
    border: "1px solid #202d42",
  },

  demoPreview: {
    marginBottom: "15px",
    borderRadius: "11px",
    overflow: "hidden",
    background: "#070b10",
    border: "1px solid #26344a",
  },

  demoImage: {
    display: "block",
    width: "100%",
    maxHeight: "240px",
    objectFit: "contain",
    background: "#070b10",
  },

  productTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
  },

  productName: {
    fontSize: "18px",
    fontWeight: "900",
  },

  productId: {
    marginTop: "4px",
    color: "#5e6c80",
    fontSize: "10px",
  },

  active: {
    color: "#61e28b",
    fontSize: "10px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  inactive: {
    color: "#ff777d",
    fontSize: "10px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  categoryTag: {
    display: "inline-block",
    marginTop: "13px",
    padding: "7px 9px",
    borderRadius: "7px",
    background: "#15223a",
    border: "1px solid #263c65",
    color: "#8db9ff",
    fontSize: "10px",
    fontWeight: "800",
  },

  productInfo: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "10px",
    marginTop: "15px",
  },

  infoLabel: {
    display: "block",
    color: "#647187",
    fontSize: "10px",
    marginBottom: "4px",
  },

  infoValue: {
    display: "block",
    fontSize: "14px",
  },

  description: {
    marginTop: "13px",
    color: "#78869a",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  imageActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "16px",
  },

  uploadButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    padding: "9px 11px",
    borderRadius: "8px",
    background: "#17243a",
    border: "1px solid #31486a",
    color: "#8db9ff",
    fontSize: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  uploadButtonDisabled: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    padding: "9px 11px",
    borderRadius: "8px",
    background: "#151b25",
    border: "1px solid #293850",
    color: "#657287",
    fontSize: "10px",
    fontWeight: "900",
    cursor: "not-allowed",
  },

  removeImageButton: {
    padding: "9px 11px",
    borderRadius: "8px",
    background: "#261417",
    border: "1px solid #542b30",
    color: "#ff777d",
    fontSize: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "15px",
    paddingTop: "15px",
    borderTop:
      "1px solid #202d42",
  },

  editButton: {
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #31486a",
    background: "#17243a",
    color: "#8db9ff",
    fontSize: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  toggleButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #4d4a25",
    background: "#292714",
    color: "#e7dc73",
    fontSize: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  deleteButton: {
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #542b30",
    background: "#261417",
    color: "#ff777d",
    fontSize: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  empty: {
    padding: "50px 20px",
    textAlign: "center",
    borderRadius: "15px",
    background: "#0d1420",
    border: "1px solid #202d42",
    color: "#718097",
  },
};

/*
  Loading animation.
  Không cần sửa globals.css.
*/
if (
  typeof document !== "undefined" &&
  !document.getElementById(
    "xenova-admin-product-loading"
  )
) {
  const style =
    document.createElement("style");

  style.id =
    "xenova-admin-product-loading";

  style.textContent = `
    @keyframes xenovaSpin {
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
