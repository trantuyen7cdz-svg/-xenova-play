"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ProductsAdminPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    if (slug) {
      loadData();
    }
  }, [slug]);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      router.replace(`/sites/${slug}/admin/login`);
      return null;
    }

    return session.access_token;
  }

  async function loadData() {
    try {
      setLoading(true);

      const token = await getToken();

      if (!token) return;

      const [productsResponse, categoriesResponse] =
        await Promise.all([
          fetch(
            `/api/sites/${slug}/admin/products`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              cache: "no-store",
            }
          ),

          fetch(
            `/api/sites/${slug}/admin/categories`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              cache: "no-store",
            }
          ),
        ]);

      const productsResult =
        await productsResponse.json();

      const categoriesResult =
        await categoriesResponse.json();

      if (!productsResponse.ok) {
        throw new Error(
          productsResult.error ||
            "Không thể tải sản phẩm"
        );
      }

      if (!categoriesResponse.ok) {
        throw new Error(
          categoriesResult.error ||
            "Không thể tải danh mục"
        );
      }

      setProducts(
        productsResult.products || []
      );

      setCategories(
        categoriesResult.categories || []
      );
    } catch (error) {
      console.error(error);

      alert(
        error.message ||
          "Không thể tải dữ liệu"
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setPrice("");
    setDurationDays("");
    setCategoryId("");
    setImageUrl("");
    setImagePreview("");
  }

  function startEdit(product) {
    setEditingId(product.id);

    setName(product.name || "");

    setDescription(
      product.description || ""
    );

    setPrice(
      product.price != null
        ? String(product.price)
        : ""
    );

    setDurationDays(
      product.duration_days != null
        ? String(product.duration_days)
        : ""
    );

    setCategoryId(
      product.category_id
        ? String(product.category_id)
        : ""
    );

    setImageUrl(
      product.image_url || ""
    );

    setImagePreview(
      product.image_url || ""
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
        `websites/${slug}/products/${crypto.randomUUID()}-${safeName}.${extension}`;

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

  async function saveProduct(event) {
    event.preventDefault();

    if (!name.trim()) {
      alert(
        "Vui lòng nhập tên sản phẩm."
      );
      return;
    }

    const numericPrice =
      Number(price);

    if (
      !price ||
      Number.isNaN(numericPrice) ||
      numericPrice < 0
    ) {
      alert(
        "Vui lòng nhập giá hợp lệ."
      );
      return;
    }

    let numericDuration = null;

    if (durationDays !== "") {
      numericDuration =
        Number(durationDays);

      if (
        Number.isNaN(
          numericDuration
        ) ||
        numericDuration < 0
      ) {
        alert(
          "Thời hạn không hợp lệ."
        );
        return;
      }
    }

    try {
      setSaving(true);

      const token = await getToken();

      if (!token) return;

      const payload = {
        name: name.trim(),

        description:
          description.trim(),

        price: numericPrice,

        duration_days:
          numericDuration,

        category_id:
          categoryId === ""
            ? null
            : Number(categoryId),

        image_url:
          imageUrl || null,
      };

      let response;

      if (editingId) {
        response = await fetch(
          `/api/sites/${slug}/admin/products`,
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
          `/api/sites/${slug}/admin/products`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              payload
            ),
          }
        );
      }

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Không thể lưu sản phẩm"
        );
      }

      resetForm();

      await loadData();
    } catch (error) {
      console.error(error);

      alert(
        error.message ||
          "Không thể lưu sản phẩm"
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleProduct(product) {
    try {
      const token = await getToken();

      if (!token) return;

      const response = await fetch(
        `/api/sites/${slug}/admin/products`,
        {
          method: "PATCH",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            id: product.id,
            active: !product.active,
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

      await loadData();
    } catch (error) {
      alert(
        error.message ||
          "Có lỗi xảy ra"
      );
    }
  }

  async function deleteProduct(product) {
    const confirmed =
      window.confirm(
        `Bạn có chắc muốn xóa "${product.name}"?`
      );

    if (!confirmed) return;

    try {
      const token = await getToken();

      if (!token) return;

      const response = await fetch(
        `/api/sites/${slug}/admin/products?id=${product.id}`,
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
            "Không thể xóa sản phẩm"
        );
      }

      if (
        editingId ===
        product.id
      ) {
        resetForm();
      }

      await loadData();
    } catch (error) {
      alert(
        error.message ||
          "Không thể xóa sản phẩm"
      );
    }
  }

  function getCategoryName(id) {
    const category =
      categories.find(
        (item) =>
          Number(item.id) ===
          Number(id)
      );

    return (
      category?.name ||
      "Chưa phân loại"
    );
  }

  function formatPrice(value) {
    return new Intl.NumberFormat(
      "vi-VN"
    ).format(Number(value || 0)) + "đ";
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

            <h1 style={styles.title}>
              Sản phẩm
            </h1>

            <p style={styles.subtitle}>
              Quản lý sản phẩm riêng của
              website này
            </p>
          </div>
        </header>

        <section style={styles.formCard}>
          <div style={styles.formHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                {editingId
                  ? "Chỉnh sửa sản phẩm"
                  : "Thêm sản phẩm"}
              </h2>

              <p style={styles.sectionText}>
                Sản phẩm được lưu riêng cho
                website này.
              </p>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                style={styles.cancelButton}
              >
                Hủy sửa
              </button>
            )}
          </div>

          <form onSubmit={saveProduct}>
            <label style={styles.label}>
              ẢNH SẢN PHẨM
            </label>

            <div style={styles.uploadBox}>
              {imagePreview ? (
                <div style={styles.previewWrap}>
                  <img
                    src={imagePreview}
                    alt={name || "Preview"}
                    style={styles.previewImage}
                  />

                  <button
                    type="button"
                    onClick={removeImage}
                    style={styles.removeImage}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div style={styles.noImage}>
                  <div style={styles.camera}>
                    📦
                  </div>

                  <div>
                    Chưa có ảnh sản phẩm
                  </div>
                </div>
              )}

              <label style={styles.uploadButton}>
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
                  onChange={(event) => {
                    const file =
                      event.target.files?.[0];

                    if (file) {
                      uploadImage(file);
                    }

                    event.target.value = "";
                  }}
                />
              </label>

              <div style={styles.uploadHint}>
                JPG, PNG, WEBP • tối đa 10MB
              </div>
            </div>

            <label style={styles.label}>
              TÊN SẢN PHẨM
            </label>

            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Ví dụ: KEY Android 7 ngày"
              style={styles.input}
              disabled={
                saving ||
                uploading
              }
            />

            <label style={styles.label}>
              DANH MỤC
            </label>

            <select
              value={categoryId}
              onChange={(event) =>
                setCategoryId(
                  event.target.value
                )
              }
              style={styles.input}
              disabled={
                saving ||
                uploading
              }
            >
              <option value="">
                Không phân loại
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.parent_id
                      ? "↳ "
                      : ""}
                    {category.name}
                  </option>
                )
              )}
            </select>

            <div style={styles.twoColumns}>
              <div>
                <label style={styles.label}>
                  GIÁ BÁN
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={price}
                  onChange={(event) =>
                    setPrice(
                      event.target.value
                    )
                  }
                  placeholder="50000"
                  style={styles.input}
                  disabled={
                    saving ||
                    uploading
                  }
                />
              </div>

              <div>
                <label style={styles.label}>
                  THỜI HẠN
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={durationDays}
                  onChange={(event) =>
                    setDurationDays(
                      event.target.value
                    )
                  }
                  placeholder="7"
                  style={styles.input}
                  disabled={
                    saving ||
                    uploading
                  }
                />

                <div style={styles.fieldHint}>
                  Đơn vị: ngày
                </div>
              </div>
            </div>

            <label style={styles.label}>
              MÔ TẢ
            </label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="Mô tả sản phẩm..."
              style={styles.textarea}
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
                : "+ THÊM SẢN PHẨM"}
            </button>
          </form>
        </section>

        <section style={styles.listCard}>
          <div style={styles.listHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Danh sách sản phẩm
              </h2>

              <p style={styles.sectionText}>
                Tổng: {products.length} sản phẩm
              </p>
            </div>

            <button
              onClick={loadData}
              style={styles.refresh}
            >
              ↻ Làm mới
            </button>
          </div>

          {loading ? (
            <div style={styles.empty}>
              Đang tải...
            </div>
          ) : products.length === 0 ? (
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
                  <div style={styles.productMain}>
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        style={styles.productImage}
                      />
                    ) : (
                      <div style={styles.productNoImage}>
                        📦
                      </div>
                    )}

                    <div style={styles.productInfo}>
                      <div style={styles.productName}>
                        {product.name}
                      </div>

                      <div style={styles.productCategory}>
                        {getCategoryName(
                          product.category_id
                        )}
                      </div>

                      <div style={styles.productPrice}>
                        {formatPrice(
                          product.price
                        )}
                      </div>

                      {product.duration_days != null && (
                        <div style={styles.productDuration}>
                          Thời hạn:{" "}
                          {product.duration_days} ngày
                        </div>
                      )}

                      {product.description && (
                        <div style={styles.productDescription}>
                          {product.description}
                        </div>
                      )}

                      <div
                        style={{
                          ...styles.status,
                          color: product.active
                            ? "#65d99b"
                            : "#777",
                        }}
                      >
                        {product.active
                          ? "● Đang bán"
                          : "● Đang tắt"}
                      </div>
                    </div>
                  </div>

                  <div style={styles.actions}>
                    <button
                      onClick={() =>
                        toggleProduct(product)
                      }
                      style={styles.smallButton}
                    >
                      {product.active
                        ? "Tắt"
                        : "Bật"}
                    </button>

                    <button
                      onClick={() =>
                        startEdit(product)
                      }
                      style={styles.smallButton}
                    >
                      Sửa
                    </button>

                    <button
                      onClick={() =>
                        deleteProduct(product)
                      }
                      style={{
                        ...styles.smallButton,
                        color: "#ff7089",
                      }}
                    >
                      Xóa
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
      "linear-gradient(180deg,#08070c,#0d0b12)",
    color: "#fff",
    padding: "20px 14px 60px",
  },

  container: {
    width: "100%",
    maxWidth: "950px",
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

  twoColumns: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: "12px",
  },

  fieldHint: {
    marginTop: "5px",
    color: "#5e5865",
    fontSize: "9px",
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

  products: {
    display: "flex",
    flexDirection: "column",
  },

  product: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "14px",
    padding: "14px 0",
    borderBottom:
      "1px solid #211d25",
  },

  productMain: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: 0,
  },

  productImage: {
    width: "64px",
    height: "64px",
    objectFit: "cover",
    borderRadius: "12px",
    border: "1px solid #332b38",
    flexShrink: 0,
  },

  productNoImage: {
    width: "64px",
    height: "64px",
    borderRadius: "12px",
    display: "grid",
    placeItems: "center",
    background: "#201521",
    fontSize: "24px",
    flexShrink: 0,
  },

  productInfo: {
    minWidth: 0,
  },

  productName: {
    fontSize: "13px",
    fontWeight: "900",
  },

  productCategory: {
    marginTop: "3px",
    color: "#a05b91",
    fontSize: "9px",
  },

  productPrice: {
    marginTop: "4px",
    color: "#ff68bb",
    fontSize: "13px",
    fontWeight: "950",
  },

  productDuration: {
    marginTop: "3px",
    color: "#8d8793",
    fontSize: "9px",
  },

  productDescription: {
    marginTop: "4px",
    color: "#696370",
    fontSize: "9px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "500px",
  },

  status: {
    marginTop: "5px",
    fontSize: "9px",
    fontWeight: "800",
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
