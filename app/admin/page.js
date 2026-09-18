"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [keys, setKeys] = useState([]);
  const [orders, setOrders] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [stock, setStock] = useState({});
  const [admin, setAdmin] = useState(null);

  const [activeTab, setActiveTab] = useState("overview");

  const [categoryName, setCategoryName] = useState("");
  const [categoryImage, setCategoryImage] = useState("");

  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    duration_days: "",
    category_id: "",
    demo_image_url: "",
  });

  const [editingProduct, setEditingProduct] = useState(null);

  const [keyProductId, setKeyProductId] = useState("");
  const [keyText, setKeyText] = useState("");

  const [editingCategory, setEditingCategory] = useState(null);

  async function loadAdmin() {
    setLoadingData(true);
    setError("");

    try {
      const {
        data: { session: currentSession },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !currentSession) {
        setError("Bạn chưa đăng nhập.");
        setLoading(false);
        setLoadingData(false);
        return;
      }

      setSession(currentSession);

      const response = await fetch("/api/admin", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Không thể tải trang quản trị.");
        setLoading(false);
        setLoadingData(false);
        return;
      }

      setAdmin(data.admin || null);
      setCategories(data.categories || []);
      setProducts(data.products || []);
      setKeys(data.keys || []);
      setOrders(data.orders || []);
      setProfiles(data.profiles || []);
      setStock(data.stock || {});
    } catch (err) {
      console.error("ADMIN PAGE ERROR:", err);
      setError("Không thể kết nối tới máy chủ.");
    }

    setLoading(false);
    setLoadingData(false);
  }

  useEffect(() => {
    loadAdmin();
  }, []);

  async function apiRequest(method, body) {
    setMessage("");
    setError("");

    if (!session) {
      setError("Phiên đăng nhập đã hết hạn.");
      return null;
    }

    try {
      const response = await fetch("/api/admin", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Thao tác thất bại.");
        return null;
      }

      setMessage(data.message || "Đã thực hiện thành công.");
      await loadAdmin();

      return data;
    } catch (err) {
      console.error("ADMIN REQUEST ERROR:", err);
      setError("Không thể kết nối tới máy chủ.");
      return null;
    }
  }

  async function createCategory(e) {
    e.preventDefault();

    if (!categoryName.trim()) {
      setError("Nhập tên danh mục.");
      return;
    }

    const result = await apiRequest("POST", {
      action: "create_category",
      name: categoryName.trim(),
      demo_image_url: categoryImage.trim(),
    });

    if (result) {
      setCategoryName("");
      setCategoryImage("");
    }
  }

  async function updateCategory(e) {
    e.preventDefault();

    if (!editingCategory) {
      return;
    }

    await apiRequest("PATCH", {
      action: "update_category",
      id: editingCategory.id,
      name: editingCategory.name,
      active: editingCategory.active,
      demo_image_url: editingCategory.demo_image_url || "",
    });

    setEditingCategory(null);
  }

  async function createProduct(e) {
    e.preventDefault();

    const result = await apiRequest("POST", {
      action: "create_product",
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      price: Number(productForm.price),
      duration_days: Number(productForm.duration_days),
      category_id: Number(productForm.category_id),
      demo_image_url: productForm.demo_image_url.trim(),
    });

    if (result) {
      setProductForm({
        name: "",
        description: "",
        price: "",
        duration_days: "",
        category_id: "",
        demo_image_url: "",
      });
    }
  }

  async function updateProduct(e) {
    e.preventDefault();

    if (!editingProduct) {
      return;
    }

    const result = await apiRequest("PATCH", {
      action: "update_product",
      id: editingProduct.id,
      name: editingProduct.name,
      description: editingProduct.description || "",
      price: Number(editingProduct.price),
      duration_days: Number(editingProduct.duration_days),
      category_id: Number(editingProduct.category_id),
      demo_image_url: editingProduct.demo_image_url || "",
      active: Boolean(editingProduct.active),
      is_active: Boolean(editingProduct.is_active),
    });

    if (result) {
      setEditingProduct(null);
    }
  }

  async function addKeys(e) {
    e.preventDefault();

    if (!keyProductId) {
      setError("Chọn sản phẩm trước.");
      return;
    }

    if (!keyText.trim()) {
      setError("Nhập KEY trước.");
      return;
    }

    const result = await apiRequest("POST", {
      action: "add_keys",
      product_id: Number(keyProductId),
      keys: keyText,
    });

    if (result) {
      setKeyText("");
    }
  }

  async function deleteKey(id) {
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa KEY này không?"
    );

    if (!confirmed) {
      return;
    }

    await apiRequest("DELETE", {
      action: "delete_key",
      id,
    });
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("vi-VN") + "đ";
  }

  function getProductName(productId) {
    const product = products.find(
      (item) => Number(item.id) === Number(productId)
    );

    return product?.name || "Không xác định";
  }

  function getCategoryName(categoryId) {
    const category = categories.find(
      (item) => Number(item.id) === Number(categoryId)
    );

    return category?.name || "Không xác định";
  }

  const availableKeys = useMemo(() => {
    return keys.filter((key) => key.status === "available");
  }, [keys]);

  const soldKeys = useMemo(() => {
    return keys.filter((key) => key.status !== "available");
  }, [keys]);

  const activeProducts = useMemo(() => {
    return products.filter(
      (product) => product.active && product.is_active
    );
  }, [products]);

  if (loading) {
    return (
      <main style={styles.loadingPage}>
        <div style={styles.loadingBox}>
          <div style={styles.logo}>X</div>
          <h2>Đang kiểm tra quyền...</h2>
          <p>Vui lòng chờ.</p>
        </div>
      </main>
    );
  }

  if (error && !admin) {
    return (
      <main style={styles.loadingPage}>
        <div style={styles.deniedBox}>
          <div style={styles.deniedIcon}>🔐</div>

          <h1>Không thể truy cập</h1>

          <p>{error}</p>

          <Link href="/" style={styles.homeButton}>
            VỀ TRANG CHỦ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.backgroundGlow} />

      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.badge}>XENOVA PLAY</div>

            <h1 style={styles.title}>ADMIN PANEL</h1>

            <p style={styles.subtitle}>
              Quản lý cửa hàng và kho KEY
            </p>
          </div>

          <div style={styles.adminBox}>
            <div style={styles.adminAvatar}>
              {(admin?.username ||
                admin?.email ||
                "A")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <div style={styles.adminName}>
                {admin?.username || "Admin"}
              </div>

              <div style={styles.adminEmail}>
                {admin?.email}
              </div>
            </div>
          </div>
        </header>

        {message ? (
          <div style={styles.successMessage}>
            ✅ {message}
          </div>
        ) : null}

        {error ? (
          <div style={styles.errorMessage}>
            ⚠️ {error}
          </div>
        ) : null}

        <nav style={styles.tabs}>
          <Tab
            active={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
          >
            Tổng quan
          </Tab>

          <Tab
            active={activeTab === "products"}
            onClick={() => setActiveTab("products")}
          >
            Sản phẩm
          </Tab>

          <Tab
            active={activeTab === "keys"}
            onClick={() => setActiveTab("keys")}
          >
            Kho KEY
          </Tab>

          <Tab
            active={activeTab === "categories"}
            onClick={() => setActiveTab("categories")}
          >
            Danh mục
          </Tab>

          <Tab
            active={activeTab === "orders"}
            onClick={() => setActiveTab("orders")}
          >
            Đơn hàng
          </Tab>

          <Tab
            active={activeTab === "users"}
            onClick={() => setActiveTab("users")}
          >
            Người dùng
          </Tab>
        </nav>

        {loadingData ? (
          <div style={styles.refreshing}>
            Đang cập nhật dữ liệu...
          </div>
        ) : null}

        {activeTab === "overview" ? (
          <Overview
            products={products}
            activeProducts={activeProducts}
            categories={categories}
            keys={keys}
            availableKeys={availableKeys}
            soldKeys={soldKeys}
            orders={orders}
            profiles={profiles}
            stock={stock}
            formatMoney={formatMoney}
          />
        ) : null}

        {activeTab === "products" ? (
          <ProductsTab
            products={products}
            categories={categories}
            stock={stock}
            formatMoney={formatMoney}
            productForm={productForm}
            setProductForm={setProductForm}
            createProduct={createProduct}
            editingProduct={editingProduct}
            setEditingProduct={setEditingProduct}
            updateProduct={updateProduct}
            getCategoryName={getCategoryName}
          />
        ) : null}

        {activeTab === "keys" ? (
          <KeysTab
            products={products}
            keys={keys}
            stock={stock}
            keyProductId={keyProductId}
            setKeyProductId={setKeyProductId}
            keyText={keyText}
            setKeyText={setKeyText}
            addKeys={addKeys}
            deleteKey={deleteKey}
            getProductName={getProductName}
          />
        ) : null}

        {activeTab === "categories" ? (
          <CategoriesTab
            categories={categories}
            categoryName={categoryName}
            setCategoryName={setCategoryName}
            categoryImage={categoryImage}
            setCategoryImage={setCategoryImage}
            createCategory={createCategory}
            editingCategory={editingCategory}
            setEditingCategory={setEditingCategory}
            updateCategory={updateCategory}
          />
        ) : null}

        {activeTab === "orders" ? (
          <OrdersTab
            orders={orders}
            getProductName={getProductName}
            formatMoney={formatMoney}
          />
        ) : null}

        {activeTab === "users" ? (
          <UsersTab profiles={profiles} />
        ) : null}

        <footer style={styles.footer}>
          <Link href="/" style={styles.footerLink}>
            ← Trang chủ
          </Link>

          <Link href="/shop" style={styles.footerLink}>
            Cửa hàng
          </Link>

          <button
            style={styles.refreshButton}
            onClick={loadAdmin}
          >
            ↻ Làm mới
          </button>
        </footer>
      </div>
    </main>
  );
}

function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.tab,
        ...(active ? styles.tabActive : {}),
      }}
    >
      {children}
    </button>
  );
}

function Overview({
  products,
  activeProducts,
  categories,
  keys,
  availableKeys,
  soldKeys,
  orders,
  profiles,
  stock,
  formatMoney,
}) {
  return (
    <section>
      <div style={styles.statsGrid}>
        <Stat
          icon="🛒"
          value={products.length}
          label="Tổng sản phẩm"
        />

        <Stat
          icon="✅"
          value={activeProducts.length}
          label="Đang bán"
        />

        <Stat
          icon="🔑"
          value={keys.length}
          label="Tổng KEY"
        />

        <Stat
          icon="📦"
          value={availableKeys.length}
          label="KEY còn hàng"
        />

        <Stat
          icon="💰"
          value={soldKeys.length}
          label="KEY đã bán"
        />

        <Stat
          icon="👥"
          value={profiles.length}
          label="Tài khoản"
        />
      </div>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>
              Tồn kho sản phẩm
            </h2>

            <p style={styles.cardDescription}>
              Số lượng KEY được tính trực tiếp từ bảng keys.
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <Empty text="Chưa có sản phẩm." />
        ) : (
          <div style={styles.productGrid}>
            {products.map((product) => {
              const itemStock = stock[product.id] || {
                total: 0,
                available: 0,
                sold: 0,
              };

              return (
                <div
                  key={product.id}
                  style={styles.inventoryCard}
                >
                  {product.demo_image_url ? (
                    <img
                      src={product.demo_image_url}
                      alt={product.name}
                      style={styles.productImage}
                    />
                  ) : (
                    <div style={styles.productImageEmpty}>
                      X
                    </div>
                  )}

                  <div style={styles.inventoryContent}>
                    <div style={styles.productName}>
                      {product.name}
                    </div>

                    <div style={styles.productCategory}>
                      ID #{product.id}
                    </div>

                    <div style={styles.inventoryStats}>
                      <div>
                        <strong>
                          {itemStock.available}
                        </strong>
                        <span>Còn</span>
                      </div>

                      <div>
                        <strong>
                          {itemStock.sold}
                        </strong>
                        <span>Đã bán</span>
                      </div>

                      <div>
                        <strong>
                          {itemStock.total}
                        </strong>
                        <span>Tổng</span>
                      </div>
                    </div>

                    <div style={styles.price}>
                      {formatMoney(product.price)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div style={styles.twoColumns}>
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>
            Danh mục
          </h2>

          <div style={styles.bigNumber}>
            {categories.length}
          </div>

          <p style={styles.muted}>
            danh mục sản phẩm
          </p>
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>
            Đơn hàng
          </h2>

          <div style={styles.bigNumber}>
            {orders.length}
          </div>

          <p style={styles.muted}>
            đơn gần nhất được tải
          </p>
        </section>
      </div>
    </section>
  );
}

function ProductsTab({
  products,
  categories,
  stock,
  formatMoney,
  productForm,
  setProductForm,
  createProduct,
  editingProduct,
  setEditingProduct,
  updateProduct,
  getCategoryName,
}) {
  return (
    <section>
      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>
              Thêm sản phẩm
            </h2>

            <p style={styles.cardDescription}>
              Tạo sản phẩm mới cho cửa hàng.
            </p>
          </div>
        </div>

        <form
          onSubmit={createProduct}
          style={styles.formGrid}
        >
          <Field
            label="Tên sản phẩm"
            value={productForm.name}
            onChange={(value) =>
              setProductForm((old) => ({
                ...old,
                name: value,
              }))
            }
            placeholder="KEY 1 NGÀY"
          />

          <Field
            label="Giá"
            type="number"
            value={productForm.price}
            onChange={(value) =>
              setProductForm((old) => ({
                ...old,
                price: value,
              }))
            }
            placeholder="10000"
          />

          <Field
            label="Số ngày"
            type="number"
            value={productForm.duration_days}
            onChange={(value) =>
              setProductForm((old) => ({
                ...old,
                duration_days: value,
              }))
            }
            placeholder="1"
          />

          <div style={styles.field}>
            <label style={styles.label}>
              Danh mục
            </label>

            <select
              value={productForm.category_id}
              onChange={(e) =>
                setProductForm((old) => ({
                  ...old,
                  category_id: e.target.value,
                }))
              }
              style={styles.input}
            >
              <option value="">
                Chọn danh mục
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

          <div style={styles.fieldFull}>
            <label style={styles.label}>
              Mô tả
            </label>

            <textarea
              value={productForm.description}
              onChange={(e) =>
                setProductForm((old) => ({
                  ...old,
                  description: e.target.value,
                }))
              }
              style={styles.textarea}
              placeholder="Mô tả sản phẩm..."
            />
          </div>

          <div style={styles.fieldFull}>
            <label style={styles.label}>
              URL ảnh
            </label>

            <input
              value={productForm.demo_image_url}
              onChange={(e) =>
                setProductForm((old) => ({
                  ...old,
                  demo_image_url: e.target.value,
                }))
              }
              style={styles.input}
              placeholder="https://..."
            />
          </div>

          <div style={styles.fieldFull}>
            <button
              type="submit"
              style={styles.primaryButton}
            >
              + THÊM SẢN PHẨM
            </button>
          </div>
        </form>
      </section>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>
              Danh sách sản phẩm
            </h2>

            <p style={styles.cardDescription}>
              {products.length} sản phẩm
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <Empty text="Chưa có sản phẩm." />
        ) : (
          <div style={styles.list}>
            {products.map((product) => {
              const itemStock = stock[product.id] || {
                total: 0,
                available: 0,
                sold: 0,
              };

              return (
                <div
                  key={product.id}
                  style={styles.productRow}
                >
                  <div style={styles.productThumb}>
                    {product.demo_image_url ? (
                      <img
                        src={product.demo_image_url}
                        alt=""
                        style={styles.thumbImage}
                      />
                    ) : (
                      "X"
                    )}
                  </div>

                  <div style={styles.rowMain}>
                    <div style={styles.rowTitle}>
                      {product.name}
                    </div>

                    <div style={styles.rowMeta}>
                      ID #{product.id} ·{" "}
                      {getCategoryName(
                        product.category_id
                      )}
                    </div>

                    <div style={styles.rowMeta}>
                      {formatMoney(product.price)} ·{" "}
                      {product.duration_days} ngày
                    </div>
                  </div>

                  <div style={styles.stockMini}>
                    <strong>
                      {itemStock.available}
                    </strong>
                    <span>còn</span>
                  </div>

                  <div
                    style={{
                      ...styles.status,
                      ...(product.active &&
                      product.is_active
                        ? styles.statusGreen
                        : styles.statusRed),
                    }}
                  >
                    {product.active &&
                    product.is_active
                      ? "Đang bán"
                      : "Tắt"}
                  </div>

                  <button
                    style={styles.smallButton}
                    onClick={() =>
                      setEditingProduct({
                        ...product,
                      })
                    }
                  >
                    Sửa
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {editingProduct ? (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.cardTitle}>
                  Sửa sản phẩm
                </h2>

                <p style={styles.cardDescription}>
                  ID #{editingProduct.id}
                </p>
              </div>

              <button
                style={styles.closeButton}
                onClick={() =>
                  setEditingProduct(null)
                }
              >
                ×
              </button>
            </div>

            <form
              onSubmit={updateProduct}
              style={styles.formGrid}
            >
              <Field
                label="Tên sản phẩm"
                value={editingProduct.name}
                onChange={(value) =>
                  setEditingProduct((old) => ({
                    ...old,
                    name: value,
                  }))
                }
              />

              <Field
                label="Giá"
                type="number"
                value={editingProduct.price}
                onChange={(value) =>
                  setEditingProduct((old) => ({
                    ...old,
                    price: value,
                  }))
                }
              />

              <Field
                label="Số ngày"
                type="number"
                value={editingProduct.duration_days}
                onChange={(value) =>
                  setEditingProduct((old) => ({
                    ...old,
                    duration_days: value,
                  }))
                }
              />

              <div style={styles.field}>
                <label style={styles.label}>
                  Danh mục
                </label>

                <select
                  value={editingProduct.category_id}
                  onChange={(e) =>
                    setEditingProduct((old) => ({
                      ...old,
                      category_id: e.target.value,
                    }))
                  }
                  style={styles.input}
                >
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

              <div style={styles.fieldFull}>
                <label style={styles.label}>
                  Mô tả
                </label>

                <textarea
                  value={
                    editingProduct.description || ""
                  }
                  onChange={(e) =>
                    setEditingProduct((old) => ({
                      ...old,
                      description: e.target.value,
                    }))
                  }
                  style={styles.textarea}
                />
              </div>

              <div style={styles.fieldFull}>
                <label style={styles.label}>
                  URL ảnh
                </label>

                <input
                  value={
                    editingProduct.demo_image_url ||
                    ""
                  }
                  onChange={(e) =>
                    setEditingProduct((old) => ({
                      ...old,
                      demo_image_url: e.target.value,
                    }))
                  }
                  style={styles.input}
                />
              </div>

              <label style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={Boolean(
                    editingProduct.active
                  )}
                  onChange={(e) =>
                    setEditingProduct((old) => ({
                      ...old,
                      active: e.target.checked,
                    }))
                  }
                />
                <span>Active</span>
              </label>

              <label style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={Boolean(
                    editingProduct.is_active
                  )}
                  onChange={(e) =>
                    setEditingProduct((old) => ({
                      ...old,
                      is_active: e.target.checked,
                    }))
                  }
                />
                <span>Hiển thị cửa hàng</span>
              </label>

              <div style={styles.fieldFull}>
                <button
                  type="submit"
                  style={styles.primaryButton}
                >
                  LƯU THAY ĐỔI
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function KeysTab({
  products,
  keys,
  stock,
  keyProductId,
  setKeyProductId,
  keyText,
  setKeyText,
  addKeys,
  deleteKey,
  getProductName,
}) {
  return (
    <section>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>
          Nhập KEY hàng loạt
        </h2>

        <p style={styles.cardDescription}>
          Mỗi KEY một dòng. KEY trùng sẽ tự động bỏ qua.
        </p>

        <form onSubmit={addKeys}>
          <div style={styles.field}>
            <label style={styles.label}>
              Sản phẩm
            </label>

            <select
              value={keyProductId}
              onChange={(e) =>
                setKeyProductId(e.target.value)
              }
              style={styles.input}
            >
              <option value="">
                Chọn sản phẩm
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
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              Danh sách KEY
            </label>

            <textarea
              value={keyText}
              onChange={(e) =>
                setKeyText(e.target.value)
              }
              style={styles.keyTextarea}
              placeholder={`KEY-AAAA-BBBB-CCCC
KEY-DDDD-EEEE-FFFF
KEY-GGGG-HHHH-IIII`}
            />
          </div>

          <button
            type="submit"
            style={styles.primaryButton}
          >
            🔑 NHẬP KEY
          </button>
        </form>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>
          Tồn kho
        </h2>

        <div style={styles.productGrid}>
          {products.map((product) => {
            const itemStock = stock[product.id] || {
              total: 0,
              available: 0,
              sold: 0,
            };

            return (
              <div
                key={product.id}
                style={styles.inventoryCard}
              >
                <div style={styles.inventoryContent}>
                  <div style={styles.productName}>
                    {product.name}
                  </div>

                  <div style={styles.inventoryStats}>
                    <div>
                      <strong>
                        {itemStock.available}
                      </strong>
                      <span>Còn</span>
                    </div>

                    <div>
                      <strong>
                        {itemStock.sold}
                      </strong>
                      <span>Đã bán</span>
                    </div>

                    <div>
                      <strong>
                        {itemStock.total}
                      </strong>
                      <span>Tổng</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>
              KEY trong kho
            </h2>

            <p style={styles.cardDescription}>
              Chỉ KEY chưa bán mới có thể xóa.
            </p>
          </div>
        </div>

        {keys.length === 0 ? (
          <Empty text="Chưa có KEY." />
        ) : (
          <div style={styles.keyList}>
            {keys.slice(0, 300).map((key) => (
              <div
                key={key.id}
                style={styles.keyRow}
              >
                <div style={styles.keyCode}>
                  {key.key_code}
                </div>

                <div style={styles.keyProduct}>
                  {getProductName(key.product_id)}
                </div>

                <div
                  style={{
                    ...styles.status,
                    ...(key.status === "available"
                      ? styles.statusGreen
                      : styles.statusRed),
                  }}
                >
                  {key.status}
                </div>

                {key.status === "available" ? (
                  <button
                    style={styles.deleteButton}
                    onClick={() =>
                      deleteKey(key.id)
                    }
                  >
                    Xóa
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function CategoriesTab({
  categories,
  categoryName,
  setCategoryName,
  categoryImage,
  setCategoryImage,
  createCategory,
  editingCategory,
  setEditingCategory,
  updateCategory,
}) {
  return (
    <section>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>
          Thêm danh mục
        </h2>

        <form
          onSubmit={createCategory}
          style={styles.formGrid}
        >
          <Field
            label="Tên danh mục"
            value={categoryName}
            onChange={setCategoryName}
            placeholder="ANDROID"
          />

          <Field
            label="URL ảnh"
            value={categoryImage}
            onChange={setCategoryImage}
            placeholder="https://..."
          />

          <div style={styles.fieldFull}>
            <button
              type="submit"
              style={styles.primaryButton}
            >
              + THÊM DANH MỤC
            </button>
          </div>
        </form>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>
          Danh mục hiện tại
        </h2>

        <div style={styles.list}>
          {categories.map((category) => (
            <div
              key={category.id}
              style={styles.productRow}
            >
              <div style={styles.productThumb}>
                {category.demo_image_url ? (
                  <img
                    src={category.demo_image_url}
                    alt=""
                    style={styles.thumbImage}
                  />
                ) : (
                  "X"
                )}
              </div>

              <div style={styles.rowMain}>
                <div style={styles.rowTitle}>
                  {category.name}
                </div>

                <div style={styles.rowMeta}>
                  ID #{category.id}
                </div>
              </div>

              <div
                style={{
                  ...styles.status,
                  ...(category.active
                    ? styles.statusGreen
                    : styles.statusRed),
                }}
              >
                {category.active
                  ? "Đang bật"
                  : "Tắt"}
              </div>

              <button
                style={styles.smallButton}
                onClick={() =>
                  setEditingCategory({
                    ...category,
                  })
                }
              >
                Sửa
              </button>
            </div>
          ))}
        </div>
      </section>

      {editingCategory ? (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.cardTitle}>
                Sửa danh mục
              </h2>

              <button
                style={styles.closeButton}
                onClick={() =>
                  setEditingCategory(null)
                }
              >
                ×
              </button>
            </div>

            <form
              onSubmit={updateCategory}
              style={styles.formGrid}
            >
              <Field
                label="Tên danh mục"
                value={editingCategory.name}
                onChange={(value) =>
                  setEditingCategory((old) => ({
                    ...old,
                    name: value,
                  }))
                }
              />

              <Field
                label="URL ảnh"
                value={
                  editingCategory.demo_image_url ||
                  ""
                }
                onChange={(value) =>
                  setEditingCategory((old) => ({
                    ...old,
                    demo_image_url: value,
                  }))
                }
              />

              <label style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={Boolean(
                    editingCategory.active
                  )}
                  onChange={(e) =>
                    setEditingCategory((old) => ({
                      ...old,
                      active: e.target.checked,
                    }))
                  }
                />
                <span>Hiển thị danh mục</span>
              </label>

              <div style={styles.fieldFull}>
                <button
                  type="submit"
                  style={styles.primaryButton}
                >
                  LƯU DANH MỤC
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function OrdersTab({
  orders,
  getProductName,
  formatMoney,
}) {
  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <h2 style={styles.cardTitle}>
            Đơn hàng
          </h2>

          <p style={styles.cardDescription}>
            100 đơn gần nhất.
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <Empty text="Chưa có đơn hàng." />
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Sản phẩm</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
                <th>Thời gian</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>

                  <td>
                    {getProductName(
                      order.product_id
                    )}
                  </td>

                  <td>
                    {formatMoney(order.amount)}
                  </td>

                  <td>{order.status}</td>

                  <td>
                    {order.created_at
                      ? new Date(
                          order.created_at
                        ).toLocaleString("vi-VN")
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function UsersTab({ profiles }) {
  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <h2 style={styles.cardTitle}>
            Người dùng
          </h2>

          <p style={styles.cardDescription}>
            Danh sách tài khoản trong profiles.
          </p>
        </div>
      </div>

      {profiles.length === 0 ? (
        <Empty text="Chưa có tài khoản." />
      ) : (
        <div style={styles.list}>
          {profiles.map((profile) => (
            <div
              key={profile.id}
              style={styles.userRow}
            >
              <div style={styles.userAvatar}>
                {(profile.username ||
                  profile.email ||
                  "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div style={styles.rowMain}>
                <div style={styles.rowTitle}>
                  {profile.username ||
                    "Chưa có username"}
                </div>

                <div style={styles.rowMeta}>
                  {profile.email}
                </div>
              </div>

              <div
                style={{
                  ...styles.status,
                  ...(profile.role === "admin"
                    ? styles.statusBlue
                    : styles.statusGreen),
                }}
              >
                {profile.role}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Stat({ icon, value, label }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>

      <div>
        <div style={styles.statValue}>
          {value}
        </div>

        <div style={styles.statLabel}>
          {label}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>
        {label}
      </label>

      <input
        type={type}
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        style={styles.input}
      />
    </div>
  );
}

function Empty({ text }) {
  return (
    <div style={styles.empty}>
      {text}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    background:
      "radial-gradient(circle at top, #111d36 0%, #070b12 45%, #040609 100%)",
    color: "#fff",
    padding: "25px 15px 60px",
  },

  backgroundGlow: {
    position: "fixed",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background: "rgba(30, 100, 255, .07)",
    filter: "blur(110px)",
    top: "-250px",
    left: "50%",
    transform: "translateX(-50%)",
    pointerEvents: "none",
  },

  container: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "22px",
    flexWrap: "wrap",
  },

  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#101b30",
    border: "1px solid #263c65",
    color: "#72a9ff",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "2px",
  },

  title: {
    margin: "9px 0 3px",
    fontSize: "clamp(27px, 5vw, 40px)",
    fontWeight: "950",
  },

  subtitle: {
    margin: 0,
    color: "#728198",
    fontSize: "12px",
  },

  adminBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "9px 12px",
    borderRadius: "14px",
    background: "#0d1420",
    border: "1px solid #202d42",
  },

  adminAvatar: {
    width: "40px",
    height: "40px",
    display: "grid",
    placeItems: "center",
    borderRadius: "11px",
    background: "#172a49",
    color: "#72a9ff",
    fontWeight: "950",
  },

  adminName: {
    fontSize: "12px",
    fontWeight: "900",
  },

  adminEmail: {
    marginTop: "3px",
    color: "#657289",
    fontSize: "10px",
  },

  successMessage: {
    marginBottom: "12px",
    padding: "12px 14px",
    borderRadius: "11px",
    background: "#0b251b",
    border: "1px solid #1e6746",
    color: "#76e5ae",
    fontSize: "12px",
  },

  errorMessage: {
    marginBottom: "12px",
    padding: "12px 14px",
    borderRadius: "11px",
    background: "#2a1013",
    border: "1px solid #713039",
    color: "#ff9ba4",
    fontSize: "12px",
  },

  tabs: {
    display: "flex",
    gap: "7px",
    overflowX: "auto",
    paddingBottom: "10px",
    marginBottom: "10px",
  },

  tab: {
    flexShrink: 0,
    border: "1px solid #202d42",
    background: "#0d1420",
    color: "#718097",
    borderRadius: "9px",
    padding: "10px 13px",
    fontSize: "11px",
    fontWeight: "850",
    cursor: "pointer",
  },

  tabActive: {
    background: "#fff",
    borderColor: "#fff",
    color: "#000",
  },

  refreshing: {
    marginBottom: "10px",
    color: "#718097",
    fontSize: "10px",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "10px",
    marginBottom: "15px",
  },

  statCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px",
    borderRadius: "14px",
    background: "#0d1420",
    border: "1px solid #202d42",
  },

  statIcon: {
    width: "40px",
    height: "40px",
    display: "grid",
    placeItems: "center",
    borderRadius: "10px",
    background: "#141f31",
    fontSize: "18px",
  },

  statValue: {
    fontSize: "21px",
    fontWeight: "950",
  },

  statLabel: {
    marginTop: "2px",
    color: "#6c798f",
    fontSize: "10px",
  },

  card: {
    marginBottom: "15px",
    padding: "18px",
    borderRadius: "16px",
    background: "#0b111b",
    border: "1px solid #1d2a3c",
    boxShadow: "0 15px 50px rgba(0,0,0,.15)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "15px",
  },

  cardTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "900",
  },

  cardDescription: {
    margin: "5px 0 0",
    color: "#657289",
    fontSize: "10px",
    lineHeight: 1.5,
  },

  productGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "10px",
  },

  inventoryCard: {
    overflow: "hidden",
    borderRadius: "13px",
    background: "#0e1623",
    border: "1px solid #202d42",
  },

  productImage: {
    width: "100%",
    height: "125px",
    objectFit: "cover",
    display: "block",
  },

  productImageEmpty: {
    width: "100%",
    height: "125px",
    display: "grid",
    placeItems: "center",
    background: "#141f31",
    color: "#72a9ff",
    fontSize: "25px",
    fontWeight: "950",
  },

  inventoryContent: {
    padding: "13px",
  },

  productName: {
    fontSize: "13px",
    fontWeight: "900",
  },

  productCategory: {
    marginTop: "4px",
    color: "#68758b",
    fontSize: "9px",
  },

  inventoryStats: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "5px",
    marginTop: "12px",
  },

  inventoryStatsItem: {},

  inventoryStats: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "5px",
    marginTop: "12px",
  },

  price: {
    marginTop: "12px",
    fontSize: "13px",
    fontWeight: "900",
  },

  twoColumns: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "15px",
  },

  bigNumber: {
    marginTop: "15px",
    fontSize: "38px",
    fontWeight: "950",
  },

  muted: {
    margin: "3px 0 0",
    color: "#68758a",
    fontSize: "11px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "13px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  fieldFull: {
    gridColumn: "1 / -1",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  label: {
    color: "#8794a9",
    fontSize: "10px",
    fontWeight: "800",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    borderRadius: "9px",
    border: "1px solid #27354b",
    background: "#080d15",
    color: "#fff",
    outline: "none",
    fontSize: "12px",
  },

  textarea: {
    width: "100%",
    minHeight: "90px",
    boxSizing: "border-box",
    padding: "12px 13px",
    borderRadius: "9px",
    border: "1px solid #27354b",
    background: "#080d15",
    color: "#fff",
    outline: "none",
    resize: "vertical",
    fontSize: "12px",
    fontFamily: "inherit",
  },

  keyTextarea: {
    width: "100%",
    minHeight: "230px",
    boxSizing: "border-box",
    padding: "13px",
    borderRadius: "10px",
    border: "1px solid #27354b",
    background: "#080d15",
    color: "#fff",
    outline: "none",
    resize: "vertical",
    fontSize: "12px",
    lineHeight: 1.7,
    fontFamily: "monospace",
  },

  primaryButton: {
    width: "100%",
    padding: "13px 16px",
    border: "none",
    borderRadius: "9px",
    background: "#fff",
    color: "#000",
    fontSize: "11px",
    fontWeight: "950",
    cursor: "pointer",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  productRow: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "10px",
    borderRadius: "11px",
    background: "#0e1623",
    border: "1px solid #1d293b",
  },

  productThumb: {
    width: "48px",
    height: "48px",
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    borderRadius: "9px",
    background: "#172338",
    color: "#72a9ff",
    fontWeight: "950",
  },

  thumbImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  rowMain: {
    flex: 1,
    minWidth: 0,
  },

  rowTitle: {
    fontSize: "12px",
    fontWeight: "900",
    wordBreak: "break-word",
  },

  rowMeta: {
    marginTop: "3px",
    color: "#66748a",
    fontSize: "9px",
    wordBreak: "break-word",
  },

  stockMini: {
    minWidth: "45px",
    textAlign: "center",
  },

  status: {
    padding: "5px 7px",
    borderRadius: "999px",
    fontSize: "8px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  statusGreen: {
    background: "#0c2a1d",
    color: "#67dda3",
  },

  statusRed: {
    background: "#2a1115",
    color: "#ff8993",
  },

  statusBlue: {
    background: "#112442",
    color: "#75aaff",
  },

  smallButton: {
    padding: "8px 10px",
    border: "1px solid #33445d",
    borderRadius: "8px",
    background: "#152033",
    color: "#fff",
    fontSize: "9px",
    fontWeight: "900",
    cursor: "pointer",
  },

  deleteButton: {
    padding: "7px 9px",
    border: "1px solid #63303a",
    borderRadius: "7px",
    background: "#241117",
    color: "#ff8e98",
    fontSize: "8px",
    fontWeight: "900",
    cursor: "pointer",
  },

  keyList: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  keyRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
    borderRadius: "9px",
    background: "#0e1623",
    border: "1px solid #1d293b",
    flexWrap: "wrap",
  },

  keyCode: {
    flex: 1,
    minWidth: "200px",
    color: "#e8edf5",
    fontSize: "10px",
    fontFamily: "monospace",
    wordBreak: "break-all",
  },

  keyProduct: {
    color: "#718096",
    fontSize: "9px",
  },

  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#9aa6b8",
    fontSize: "11px",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "15px",
    background: "rgba(0,0,0,.72)",
    backdropFilter: "blur(7px)",
  },

  modal: {
    width: "100%",
    maxWidth: "650px",
    maxHeight: "90vh",
    overflowY: "auto",
    padding: "20px",
    borderRadius: "17px",
    background: "#0b111b",
    border: "1px solid #293a54",
    boxShadow: "0 30px 100px rgba(0,0,0,.5)",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    marginBottom: "17px",
  },

  closeButton: {
    width: "34px",
    height: "34px",
    border: "1px solid #2a394e",
    borderRadius: "9px",
    background: "#111a29",
    color: "#fff",
    fontSize: "20px",
    cursor: "pointer",
  },

  tableWrap: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "10px",
  },

  userRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "11px",
    borderRadius: "10px",
    background: "#0e1623",
    border: "1px solid #1d293b",
  },

  userAvatar: {
    width: "38px",
    height: "38px",
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: "10px",
    background: "#172338",
    color: "#72a9ff",
    fontWeight: "900",
  },

  empty: {
    padding: "35px 15px",
    textAlign: "center",
    color: "#66748a",
    fontSize: "11px",
  },

  footer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "15px",
    marginTop: "25px",
  },

  footerLink: {
    color: "#718097",
    textDecoration: "none",
    fontSize: "10px",
  },

  refreshButton: {
    border: "none",
    background: "transparent",
    color: "#718097",
    fontSize: "10px",
    cursor: "pointer",
  },

  loadingPage: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "20px",
    background:
      "radial-gradient(circle at top, #111d36 0%, #070b12 45%, #040609 100%)",
    color: "#fff",
  },

  loadingBox: {
    textAlign: "center",
    padding: "35px",
  },

  logo: {
    width: "55px",
    height: "55px",
    margin: "0 auto 15px",
    display: "grid",
    placeItems: "center",
    borderRadius: "15px",
    background: "#172a49",
    color: "#72a9ff",
    fontSize: "22px",
    fontWeight: "950",
  },

  deniedBox: {
    width: "100%",
    maxWidth: "420px",
    boxSizing: "border-box",
    padding: "30px 20px",
    textAlign: "center",
    borderRadius: "17px",
    background: "#0d1420",
    border: "1px solid #202d42",
  },

  deniedIcon: {
    fontSize: "45px",
  },

  homeButton: {
    display: "inline-block",
    marginTop: "15px",
    padding: "11px 15px",
    borderRadius: "9px",
    background: "#fff",
    color: "#000",
    textDecoration: "none",
    fontSize: "10px",
    fontWeight: "900",
  },
};
