"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

const BUCKET = "product-media";

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [keys, setKeys] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [parentId, setParentId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [mediaType, setMediaType] = useState("image");
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);

  const [keyText, setKeyText] = useState("");

  // =========================
  // LOAD DATA
  // =========================

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [
        categoriesResult,
        productsResult,
        keysResult,
      ] = await Promise.all([
        supabase
          .from("product_categories")
          .select(
            "id,name,description,active,parent_id"
          )
          .order("id", { ascending: true }),

        supabase
          .from("products")
          .select(`
            id,
            name,
            description,
            price,
            duration_days,
            active,
            is_active,
            demo_image_url,
            video_url,
            media_type,
            category_id
          `)
          .order("id", { ascending: false }),

        supabase
          .from("keys")
          .select(
            "id,key_code,product_id,status"
          )
          .order("id", { ascending: false }),
      ]);

      if (categoriesResult.error) {
        throw categoriesResult.error;
      }

      if (productsResult.error) {
        throw productsResult.error;
      }

      if (keysResult.error) {
        throw keysResult.error;
      }

      setCategories(
        categoriesResult.data || []
      );

      setProducts(
        productsResult.data || []
      );

      setKeys(
        keysResult.data || []
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Không thể tải dữ liệu Admin"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // =========================
  // CATEGORY
  // =========================

  const parents = useMemo(() => {
    return categories.filter(
      (item) => !item.parent_id
    );
  }, [categories]);

  const children = useMemo(() => {
    if (!parentId) return [];

    return categories.filter(
      (item) =>
        Number(item.parent_id) ===
        Number(parentId)
    );
  }, [categories, parentId]);

  function handleParentChange(value) {
    setParentId(value);
    setCategoryId("");
  }

  // =========================
  // UPLOAD
  // =========================

  async function uploadFile(file, folder) {
    if (!file) return null;

    const extension =
      file.name.split(".").pop()?.toLowerCase() ||
      "file";

    const fileName =
      `${folder}/` +
      `${Date.now()}-${crypto.randomUUID()}` +
      `.${extension}`;

    const { error: uploadError } =
      await supabase.storage
        .from(BUCKET)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: publicData,
    } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName);

    return publicData?.publicUrl || null;
  }

  // =========================
  // CREATE PRODUCT
  // =========================

  async function createProduct() {
    if (!name.trim()) {
      setError("Vui lòng nhập tên sản phẩm.");
      return;
    }

    if (!price || Number(price) < 0) {
      setError("Vui lòng nhập giá hợp lệ.");
      return;
    }

    if (!categoryId) {
      setError(
        "Vui lòng chọn danh mục con."
      );
      return;
    }

    if (
      mediaType === "image" &&
      !imageFile
    ) {
      setError(
        "Bạn chưa chọn ảnh sản phẩm."
      );
      return;
    }

    if (
      mediaType === "video" &&
      !videoFile
    ) {
      setError(
        "Bạn chưa chọn video sản phẩm."
      );
      return;
    }

    if (
      mediaType === "both" &&
      (!imageFile || !videoFile)
    ) {
      setError(
        "Chế độ Ảnh + Video cần chọn cả hai file."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      let imageUrl = null;
      let videoUrl = null;

      // IMAGE
      if (
        mediaType === "image" ||
        mediaType === "both"
      ) {
        imageUrl = await uploadFile(
          imageFile,
          "products/images"
        );
      }

      // VIDEO
      if (
        mediaType === "video" ||
        mediaType === "both"
      ) {
        videoUrl = await uploadFile(
          videoFile,
          "products/videos"
        );
      }

      // CREATE PRODUCT
      const {
        data: product,
        error: productError,
      } = await supabase
        .from("products")
        .insert({
          name: name.trim(),
          description:
            description.trim() || null,
          price: Number(price),
          duration_days:
            duration
              ? Number(duration)
              : null,
          active: true,
          is_active: true,

          category_id:
            Number(categoryId),

          media_type: mediaType,

          demo_image_url:
            imageUrl,

          video_url:
            videoUrl,
        })
        .select()
        .single();

      if (productError) {
        throw productError;
      }

      // =========================
      // ADD KEYS
      // =========================

      const keyLines = keyText
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);

      if (
        keyLines.length > 0
      ) {
        const keyRows =
          keyLines.map((keyCode) => ({
            key_code: keyCode,
            product_id:
              product.id,
            user_id: null,
            expires_at: null,
            status: "available",
            order_id: null,
            sold_at: null,
          }));

        const {
          error: keyError,
        } = await supabase
          .from("keys")
          .insert(keyRows);

        if (keyError) {
          console.error(
            "KEY INSERT ERROR:",
            keyError
          );

          setMessage(
            "Đã tạo sản phẩm nhưng thêm KEY bị lỗi: " +
              keyError.message
          );
        }
      }

      // RESET
      setName("");
      setDescription("");
      setPrice("");
      setDuration("");
      setParentId("");
      setCategoryId("");
      setMediaType("image");
      setImageFile(null);
      setVideoFile(null);
      setKeyText("");

      // reset file input
      const imageInput =
        document.getElementById(
          "product-image"
        );

      const videoInput =
        document.getElementById(
          "product-video"
        );

      if (imageInput) {
        imageInput.value = "";
      }

      if (videoInput) {
        videoInput.value = "";
      }

      setMessage(
        `Đã tạo sản phẩm "${product.name}".`
      );

      await loadData();
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Không thể tạo sản phẩm."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // TOGGLE PRODUCT
  // =========================

  async function toggleProduct(product) {
    const next =
      !(
        product.active &&
        product.is_active
      );

    const { error } = await supabase
      .from("products")
      .update({
        active: next,
        is_active: next,
      })
      .eq("id", product.id);

    if (error) {
      setError(error.message);
      return;
    }

    await loadData();
  }

  // =========================
  // HELPERS
  // =========================

  function getCategory(product) {
    return categories.find(
      (item) =>
        Number(item.id) ===
        Number(product.category_id)
    );
  }

  function getParent(product) {
    const category =
      getCategory(product);

    if (!category) return null;

    if (!category.parent_id) {
      return category;
    }

    return categories.find(
      (item) =>
        Number(item.id) ===
        Number(category.parent_id)
    );
  }

  function getStock(productId) {
    return keys.filter(
      (key) =>
        Number(key.product_id) ===
          Number(productId) &&
        key.status === "available"
    ).length;
  }

  function mediaLabel(product) {
    if (
      product.media_type === "both"
    ) {
      return "ẢNH + VIDEO";
    }

    if (
      product.media_type === "video"
    ) {
      return "VIDEO";
    }

    return "ẢNH";
  }

  if (loading) {
    return (
      <div className="loading">
        Đang tải Admin...
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="admin-page">

      {/* =========================
          SIDEBAR
      ========================= */}

      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">
            X
          </div>

          <div>
            <strong>
              XENOVA
            </strong>

            <small>
              ADMIN
            </small>
          </div>
        </div>

        <nav>

          <a href="/admin">
            🏠 Tổng quan
          </a>

          <a href="/admin/categories">
            📁 Danh mục
          </a>

          <a
            href="/admin/products"
            className="active"
          >
            🛒 Sản phẩm
          </a>

          <a href="/admin/keys">
            🔑 Kho KEY
          </a>

          <a href="/admin/orders">
            📦 Đơn hàng
          </a>

          <a href="/admin/users">
            👥 Người dùng
          </a>

        </nav>

        <a
          href="/shop"
          className="back-shop"
        >
          ← Về cửa hàng
        </a>

      </aside>

      {/* =========================
          MAIN
      ========================= */}

      <main className="main">

        <div className="header">

          <div>
            <h1>
              Quản lý sản phẩm
            </h1>

            <p>
              Tạo sản phẩm, phân loại và
              quản lý kho KEY.
            </p>
          </div>

          <div className="stats">

            <div>
              <strong>
                {products.length}
              </strong>

              <span>
                Sản phẩm
              </span>
            </div>

            <div>
              <strong>
                {keys.filter(
                  (key) =>
                    key.status ===
                    "available"
                ).length}
              </strong>

              <span>
                KEY còn
              </span>
            </div>

          </div>

        </div>

        {error && (
          <div className="alert error">
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div className="alert success">
            ✓ {message}
          </div>
        )}

        {/* =========================
            CREATE FORM
        ========================= */}

        <section className="panel">

          <div className="panel-title">
            <div>
              <h2>
                Thêm sản phẩm
              </h2>

              <p>
                Sản phẩm sẽ xuất hiện
                trong cửa hàng theo
                danh mục đã chọn.
              </p>
            </div>
          </div>

          <div className="form-grid">

            {/* NAME */}

            <div className="field full">
              <label>
                Tên sản phẩm *
              </label>

              <input
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="VD: KEY 1 NGÀY"
              />
            </div>

            {/* PARENT */}

            <div className="field">
              <label>
                Danh mục mẹ *
              </label>

              <select
                value={parentId}
                onChange={(e) =>
                  handleParentChange(
                    e.target.value
                  )
                }
              >
                <option value="">
                  -- Chọn danh mục mẹ --
                </option>

                {parents.map((parent) => (
                  <option
                    key={parent.id}
                    value={parent.id}
                  >
                    {parent.name}
                  </option>
                ))}
              </select>
            </div>

            {/* CHILD */}

            <div className="field">
              <label>
                Danh mục con *
              </label>

              <select
                value={categoryId}
                disabled={!parentId}
                onChange={(e) =>
                  setCategoryId(
                    e.target.value
                  )
                }
              >
                <option value="">
                  {!parentId
                    ? "-- Chọn danh mục mẹ trước --"
                    : "-- Chọn danh mục con --"}
                </option>

                {children.map((child) => (
                  <option
                    key={child.id}
                    value={child.id}
                  >
                    {child.name}
                  </option>
                ))}
              </select>
            </div>

            {/* PRICE */}

            <div className="field">
              <label>
                Giá *
              </label>

              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value)
                }
                placeholder="10000"
              />
            </div>

            {/* DURATION */}

            <div className="field">
              <label>
                Thời hạn
              </label>

              <input
                type="number"
                min="0"
                value={duration}
                onChange={(e) =>
                  setDuration(
                    e.target.value
                  )
                }
                placeholder="1 ngày"
              />
            </div>

            {/* DESCRIPTION */}

            <div className="field full">
              <label>
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
              />
            </div>

          </div>

          {/* =========================
              MEDIA
          ========================= */}

          <div className="media-section">

            <h3>
              Media sản phẩm
            </h3>

            <div className="media-options">

              <button
                type="button"
                className={
                  mediaType === "image"
                    ? "media-option active"
                    : "media-option"
                }
                onClick={() =>
                  setMediaType("image")
                }
              >
                🖼️ Ảnh
              </button>

              <button
                type="button"
                className={
                  mediaType === "video"
                    ? "media-option active"
                    : "media-option"
                }
                onClick={() =>
                  setMediaType("video")
                }
              >
                🎬 Video
              </button>

              <button
                type="button"
                className={
                  mediaType === "both"
                    ? "media-option active"
                    : "media-option"
                }
                onClick={() =>
                  setMediaType("both")
                }
              >
                🖼️ + 🎬 Cả hai
              </button>

            </div>

            <div className="upload-grid">

              {(mediaType === "image" ||
                mediaType === "both") && (
                <div className="upload-box">

                  <label>
                    Ảnh sản phẩm
                  </label>

                  <input
                    id="product-image"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setImageFile(
                        e.target.files?.[0] ||
                          null
                      )
                    }
                  />

                  {imageFile && (
                    <div className="file-name">
                      ✓ {imageFile.name}
                    </div>
                  )}

                </div>
              )}

              {(mediaType === "video" ||
                mediaType === "both") && (
                <div className="upload-box">

                  <label>
                    Video sản phẩm
                  </label>

                  <input
                    id="product-video"
                    type="file"
                    accept="video/*"
                    onChange={(e) =>
                      setVideoFile(
                        e.target.files?.[0] ||
                          null
                      )
                    }
                  />

                  {videoFile && (
                    <div className="file-name">
                      ✓ {videoFile.name}
                    </div>
                  )}

                </div>
              )}

            </div>

          </div>

          {/* =========================
              KEYS
          ========================= */}

          <div className="key-section">

            <h3>
              Kho KEY
            </h3>

            <p>
              Mỗi dòng là một KEY. Có thể
              để trống và thêm KEY sau.
            </p>

            <textarea
              value={keyText}
              onChange={(e) =>
                setKeyText(e.target.value)
              }
              placeholder={
                "KEY001\nKEY002\nKEY003"
              }
              rows={6}
            />

          </div>

          <button
            className="create-button"
            disabled={saving}
            onClick={createProduct}
          >
            {saving
              ? "ĐANG TẠO..."
              : "＋ TẠO SẢN PHẨM"}
          </button>

        </section>

        {/* =========================
            PRODUCT LIST
        ========================= */}

        <section className="panel">

          <div className="panel-title">
            <div>
              <h2>
                Danh sách sản phẩm
              </h2>

              <p>
                {products.length} sản phẩm
                trong hệ thống.
              </p>
            </div>
          </div>

          <div className="table-wrap">

            <table>

              <thead>
                <tr>
                  <th>
                    Sản phẩm
                  </th>

                  <th>
                    Danh mục
                  </th>

                  <th>
                    Giá
                  </th>

                  <th>
                    Media
                  </th>

                  <th>
                    Kho
                  </th>

                  <th>
                    Trạng thái
                  </th>
                </tr>
              </thead>

              <tbody>

                {products.map((product) => {

                  const category =
                    getCategory(product);

                  const parent =
                    getParent(product);

                  const stock =
                    getStock(product.id);

                  return (
                    <tr
                      key={product.id}
                    >

                      <td>

                        <div className="product-info">

                          <div className="thumb">

                            {product.demo_image_url ? (
                              <img
                                src={
                                  product.demo_image_url
                                }
                                alt=""
                              />
                            ) : product.video_url ? (
                              <video
                                src={
                                  product.video_url
                                }
                                muted
                              />
                            ) : (
                              <span>
                                🛒
                              </span>
                            )}

                          </div>

                          <div>
                            <strong>
                              {product.name}
                            </strong>

                            <small>
                              ID #{product.id}
                            </small>
                          </div>

                        </div>

                      </td>

                      <td>

                        <div className="category-path">

                          {parent?.name && (
                            <span>
                              {parent.name}
                            </span>
                          )}

                          <b>
                            →
                          </b>

                          <span>
                            {category?.name ||
                              "Chưa phân loại"}
                          </span>

                        </div>

                      </td>

                      <td>
                        <strong className="price">
                          {Number(
                            product.price || 0
                          ).toLocaleString(
                            "vi-VN"
                          )}
                          đ
                        </strong>
                      </td>

                      <td>
                        <span className="media-pill">
                          {mediaLabel(product)}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {stock}
                        </strong>
                      </td>

                      <td>

                        <button
                          className={
                            product.active &&
                            product.is_active
                              ? "status on"
                              : "status off"
                          }
                          onClick={() =>
                            toggleProduct(
                              product
                            )
                          }
                        >
                          {product.active &&
                          product.is_active
                            ? "Đang bán"
                            : "Tắt"}
                        </button>

                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>

        </section>

      </main>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
* {
  box-sizing: border-box;
}

.admin-page {
  min-height: 100vh;
  background: #f5f6fa;
  color: #202124;
  font-family: Arial, Helvetica, sans-serif;
  display: flex;
}

/* SIDEBAR */

.sidebar {
  width: 235px;
  min-height: 100vh;
  background: #17151b;
  color: white;
  padding: 20px 13px;
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 9px 25px;
}

.brand-icon {
  width: 39px;
  height: 39px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg,#ff4ca8,#8d55ff);
  font-weight: 900;
  font-size: 20px;
}

.brand strong {
  display: block;
  font-size: 15px;
}

.brand small {
  color: #999;
  font-size: 9px;
  letter-spacing: 1px;
}

.sidebar nav {
  display: grid;
  gap: 5px;
}

.sidebar nav a,
.back-shop {
  color: #aaa;
  text-decoration: none;
  padding: 11px 12px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 700;
}

.sidebar nav a:hover,
.sidebar nav a.active {
  background: #30262e;
  color: #ff67b4;
}

.back-shop {
  margin-top: auto;
  background: #242027;
}

/* MAIN */

.main {
  flex: 1;
  min-width: 0;
  padding: 30px;
  max-width: 1500px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}

.header h1 {
  margin: 0;
  font-size: 25px;
}

.header p {
  color: #888;
  margin: 6px 0 0;
  font-size: 13px;
}

.stats {
  display: flex;
  gap: 10px;
}

.stats div {
  background: white;
  border: 1px solid #eee;
  min-width: 100px;
  border-radius: 12px;
  padding: 11px 14px;
}

.stats strong {
  display: block;
  font-size: 19px;
  color: #e83d94;
}

.stats span {
  color: #999;
  font-size: 10px;
}

/* ALERT */

.alert {
  padding: 12px 14px;
  border-radius: 9px;
  margin-bottom: 15px;
  font-size: 12px;
}

.alert.error {
  background: #fff0f0;
  color: #c62828;
}

.alert.success {
  background: #ebfff3;
  color: #198754;
}

/* PANEL */

.panel {
  background: white;
  border: 1px solid #e9e9ed;
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 20px;
}

.panel-title {
  margin-bottom: 18px;
}

.panel-title h2 {
  margin: 0;
  font-size: 18px;
}

.panel-title p {
  margin: 5px 0 0;
  color: #999;
  font-size: 11px;
}

/* FORM */

.form-grid {
  display: grid;
  grid-template-columns: repeat(2,minmax(0,1fr));
  gap: 14px;
}

.field {
  display: grid;
  gap: 6px;
}

.field.full {
  grid-column: 1 / -1;
}

.field label,
.upload-box label {
  font-size: 11px;
  font-weight: 800;
  color: #555;
}

.field input,
.field select,
.field textarea,
.key-section textarea {
  width: 100%;
  border: 1px solid #e1e1e5;
  border-radius: 8px;
  padding: 10px 11px;
  outline: none;
  font-size: 12px;
  background: white;
}

.field input:focus,
.field select:focus,
.field textarea:focus,
.key-section textarea:focus {
  border-color: #e83d94;
  box-shadow: 0 0 0 3px rgba(232,61,148,.08);
}

/* MEDIA */

.media-section,
.key-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.media-section h3,
.key-section h3 {
  margin: 0 0 5px;
  font-size: 14px;
}

.media-options {
  display: flex;
  gap: 7px;
  margin: 12px 0;
}

.media-option {
  border: 1px solid #ddd;
  background: white;
  border-radius: 8px;
  padding: 9px 13px;
  cursor: pointer;
  font-weight: 700;
  font-size: 11px;
}

.media-option.active {
  color: #e83d94;
  border-color: #e83d94;
  background: #fff0f7;
}

.upload-grid {
  display: grid;
  grid-template-columns: repeat(2,minmax(0,1fr));
  gap: 12px;
}

.upload-box {
  border: 1px dashed #d8d8de;
  border-radius: 10px;
  padding: 14px;
  display: grid;
  gap: 9px;
  background: #fafafd;
}

.upload-box input {
  font-size: 11px;
}

.file-name {
  color: #198754;
  font-size: 10px;
  word-break: break-all;
}

.key-section p {
  color: #999;
  font-size: 11px;
  margin: 0 0 10px;
}

.key-section textarea {
  resize: vertical;
  font-family: monospace;
}

.create-button {
  width: 100%;
  margin-top: 20px;
  border: 0;
  background: linear-gradient(135deg,#e83d94,#b94de4);
  color: white;
  border-radius: 9px;
  padding: 13px;
  font-weight: 900;
  cursor: pointer;
}

.create-button:disabled {
  opacity: .6;
  cursor: wait;
}

/* TABLE */

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 850px;
}

th {
  text-align: left;
  color: #999;
  font-size: 10px;
  text-transform: uppercase;
  padding: 11px 9px;
  border-bottom: 1px solid #eee;
}

td {
  padding: 12px 9px;
  border-bottom: 1px solid #f0f0f2;
  font-size: 11px;
}

.product-info {
  display: flex;
  align-items: center;
  gap: 9px;
}

.thumb {
  width: 44px;
  height: 44px;
  overflow: hidden;
  border-radius: 8px;
  background: #f0f0f4;
  display: grid;
  place-items: center;
}

.thumb img,
.thumb video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-info strong {
  display: block;
}

.product-info small {
  color: #aaa;
  display: block;
  margin-top: 3px;
}

.category-path {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #777;
}

.category-path b {
  color: #bbb;
}

.price {
  color: #e83d94;
}

.media-pill {
  background: #f5efff;
  color: #8750c8;
  border-radius: 999px;
  padding: 5px 8px;
  font-size: 9px;
  font-weight: 900;
}

.status {
  border: 0;
  border-radius: 999px;
  padding: 6px 9px;
  cursor: pointer;
  font-size: 9px;
  font-weight: 900;
}

.status.on {
  background: #e8fff1;
  color: #198754;
}

.status.off {
  background: #eee;
  color: #888;
}

/* LOADING */

.loading {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #f5f6fa;
  color: #888;
  font-family: Arial, sans-serif;
}

/* MOBILE */

@media (max-width: 800px) {
  .admin-page {
    display: block;
  }

  .sidebar {
    width: 100%;
    min-height: auto;
    height: auto;
    position: relative;
  }

  .sidebar nav {
    display: flex;
    overflow-x: auto;
  }

  .sidebar nav a {
    white-space: nowrap;
  }

  .back-shop {
    margin-top: 12px;
  }

  .main {
    padding: 15px;
  }

  .header {
    display: block;
  }

  .stats {
    margin-top: 12px;
  }

  .form-grid,
  .upload-grid {
    grid-template-columns: 1fr;
  }

  .field.full {
    grid-column: auto;
  }
}
`;
