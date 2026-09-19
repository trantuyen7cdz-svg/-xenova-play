"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ZALO_ADMIN = "https://zalo.me/0987654321";

function formatPrice(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0)) + "đ";
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getProductImage(product) {
  return (
    product?.demo_image_url ||
    product?.image_url ||
    "/placeholder-product.png"
  );
}

function getCategoryName(categoryId, categories) {
  const category = categories.find(
    (item) => Number(item.id) === Number(categoryId)
  );

  return category?.name || "Chưa phân loại";
}

function getCategoryChain(categoryId, categories) {
  const current = categories.find(
    (item) => Number(item.id) === Number(categoryId)
  );

  if (!current) return [];

  const result = [current];

  if (current.parent_id) {
    const parent = categories.find(
      (item) => Number(item.id) === Number(current.parent_id)
    );

    if (parent) result.unshift(parent);
  }

  return result;
}

export default function ShopPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [wallet, setWallet] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedParent, setSelectedParent] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("default");

  const [openParents, setOpenParents] = useState({});
  const [buyModal, setBuyModal] = useState(null);
  const [successModal, setSuccessModal] = useState(null);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState("");

  // =========================
  // AUTH
  // =========================

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setUser(user || null);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // =========================
  // LOAD SHOP
  // =========================

  async function loadShop() {
    try {
      setLoading(true);
      setError("");

      const [catalogResponse, stockResponse] = await Promise.all([
        fetch("/api/shop/catalog", {
          cache: "no-store",
        }),
        fetch("/api/shop/stock", {
          cache: "no-store",
        }),
      ]);

      const catalog = await catalogResponse.json();
      const stock = await stockResponse.json();

      if (!catalogResponse.ok || !catalog.success) {
        throw new Error(catalog.error || "Không tải được sản phẩm");
      }

      setCategories(catalog.categories || []);
      setProducts(catalog.products || []);

      if (stock?.success) {
        setStockMap(stock.stock || stock.stockMap || {});
      } else {
        setStockMap({});
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Không thể tải cửa hàng");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadShop();
  }, []);

  // =========================
  // LOAD WALLET
  // =========================

  useEffect(() => {
    if (!user) {
      setWallet(0);
      return;
    }

    async function loadWallet() {
      const { data, error } = await supabase
        .from("profiles")
        .select("wallet_balance,balance")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("WALLET ERROR:", error);
        return;
      }

      setWallet(
        Number(data?.wallet_balance ?? data?.balance ?? 0)
      );
    }

    loadWallet();
  }, [user]);

  // =========================
  // CATEGORY TREE
  // =========================

  const parentCategories = useMemo(() => {
    return categories.filter(
      (category) => !category.parent_id
    );
  }, [categories]);

  function getChildren(parentId) {
    return categories.filter(
      (category) =>
        Number(category.parent_id) === Number(parentId)
    );
  }

  // =========================
  // FILTER PRODUCTS
  // =========================

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (selectedChild) {
      result = result.filter(
        (product) =>
          Number(product.category_id) ===
          Number(selectedChild)
      );
    } else if (selectedParent) {
      const children = getChildren(selectedParent);

      const allowedIds = [
        Number(selectedParent),
        ...children.map((item) => Number(item.id)),
      ];

      result = result.filter((product) =>
        allowedIds.includes(Number(product.category_id))
      );
    }

    const keyword = normalize(search);

    if (keyword) {
      result = result.filter((product) => {
        const categoryName = getCategoryName(
          product.category_id,
          categories
        );

        return (
          normalize(product.name).includes(keyword) ||
          normalize(product.description).includes(keyword) ||
          normalize(categoryName).includes(keyword)
        );
      });
    }

    if (sort === "price-asc") {
      result.sort(
        (a, b) =>
          Number(a.price || 0) -
          Number(b.price || 0)
      );
    }

    if (sort === "price-desc") {
      result.sort(
        (a, b) =>
          Number(b.price || 0) -
          Number(a.price || 0)
      );
    }

    if (sort === "name") {
      result.sort((a, b) =>
        String(a.name || "").localeCompare(
          String(b.name || ""),
          "vi"
        )
      );
    }

    return result;
  }, [
    products,
    categories,
    selectedParent,
    selectedChild,
    search,
    sort,
  ]);

  // =========================
  // CATEGORY CLICK
  // =========================

  function selectParent(id) {
    setSelectedParent(id);
    setSelectedChild(null);

    setOpenParents((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function selectChild(parentId, childId) {
    setSelectedParent(parentId);
    setSelectedChild(childId);
  }

  function selectAll() {
    setSelectedParent(null);
    setSelectedChild(null);
  }

  // =========================
  // STOCK
  // =========================

  function getStock(productId) {
    const value =
      stockMap?.[productId] ??
      stockMap?.[String(productId)] ??
      0;

    return Number(value || 0);
  }

  // =========================
  // BUY
  // =========================

  async function handleBuy() {
    if (!buyModal) return;

    if (!user) {
      router.push("/login");
      return;
    }

    const stock = getStock(buyModal.id);

    if (stock <= 0) {
      setMessage("Sản phẩm hiện đã hết hàng.");
      return;
    }

    if (wallet < Number(buyModal.price || 0)) {
      setMessage("Số dư không đủ. Vui lòng nạp tiền.");
      return;
    }

    try {
      setBuying(true);
      setMessage("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/buy-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          product_id: Number(buyModal.id),
        }),
      });

      const data = await response.json();

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Không thể mua sản phẩm"
        );
      }

      const key =
        data?.key ||
        data?.key_code ||
        data?.data?.key ||
        data?.data?.key_code ||
        "";

      setBuyModal(null);

      setSuccessModal({
        product: buyModal,
        key,
      });

      await loadShop();

      // cập nhật số dư
      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_balance,balance")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setWallet(
          Number(
            profile.wallet_balance ??
              profile.balance ??
              0
          )
        );
      }
    } catch (err) {
      console.error(err);
      setMessage(
        err.message || "Mua sản phẩm thất bại"
      );
    } finally {
      setBuying(false);
    }
  }

  // =========================
  // MEDIA
  // =========================

  function ProductMedia({ product }) {
    const image = getProductImage(product);

    if (
      product.media_type === "video" &&
      product.video_url
    ) {
      return (
        <video
          src={product.video_url}
          className="product-media"
          muted
          loop
          playsInline
          autoPlay
        />
      );
    }

    if (
      product.media_type === "both" &&
      product.video_url
    ) {
      return (
        <div className="media-wrap">
          <img
            src={image}
            alt={product.name}
            className="product-media"
          />

          <span className="video-badge">
            ▶ VIDEO
          </span>
        </div>
      );
    }

    return (
      <img
        src={image}
        alt={product.name}
        className="product-media"
      />
    );
  }

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-box">
          <div className="loader" />
          <p>Đang tải cửa hàng...</p>
        </div>

        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <main className="page">

      {/* HEADER */}
      <header className="topbar">
        <div className="topbar-inner">

          <button
            className="logo"
            onClick={() => router.push("/")}
          >
            <span className="logo-x">
              X
            </span>

            <span>
              XENOVA
              <small> PLAY</small>
            </span>
          </button>

          <nav className="top-nav">
            <button
              onClick={() => router.push("/")}
            >
              Trang chủ
            </button>

            <button className="active">
              Cửa hàng
            </button>

            <button
              onClick={() => router.push("/keys")}
            >
              Kho KEY
            </button>

            <button
              onClick={() => router.push("/orders")}
            >
              Đơn hàng
            </button>
          </nav>

          <div className="account-area">
            <button
              className="wallet"
              onClick={() => router.push("/deposit")}
            >
              💰 {formatPrice(wallet)}
            </button>

            {user ? (
              <button
                className="account"
                onClick={() => router.push("/account")}
              >
                👤 Tài khoản
              </button>
            ) : (
              <button
                className="account"
                onClick={() => router.push("/login")}
              >
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div>
          <div className="hero-badge">
            XENOVA PLAY
          </div>

          <h1>
            CỬA HÀNG
          </h1>

          <p>
            Kho sản phẩm XENOVA PLAY
          </p>
        </div>
      </section>

      <div className="container">

        {/* BREADCRUMB */}
        <div className="breadcrumb">
          <button onClick={selectAll}>
            Cửa hàng
          </button>

          {selectedParent && (
            <>
              <span>/</span>

              <button
                onClick={() => {
                  setSelectedChild(null);
                }}
              >
                {getCategoryName(
                  selectedParent,
                  categories
                )}
              </button>
            </>
          )}

          {selectedChild && (
            <>
              <span>/</span>

              <strong>
                {getCategoryName(
                  selectedChild,
                  categories
                )}
              </strong>
            </>
          )}
        </div>

        <div className="layout">

          {/* SIDEBAR */}
          <aside className="sidebar">

            <div className="sidebar-title">
              <span>☰</span>
              DANH MỤC
            </div>

            <button
              className={
                !selectedParent
                  ? "category-all selected"
                  : "category-all"
              }
              onClick={selectAll}
            >
              <span>🏠</span>
              Tất cả sản phẩm
            </button>

            <div className="category-tree">

              {parentCategories.map((parent) => {
                const children =
                  getChildren(parent.id);

                const isOpen =
                  !!openParents[parent.id];

                const isSelected =
                  Number(selectedParent) ===
                  Number(parent.id);

                return (
                  <div
                    className="category-group"
                    key={parent.id}
                  >

                    <button
                      className={
                        isSelected
                          ? "parent-category selected"
                          : "parent-category"
                      }
                      onClick={() =>
                        selectParent(parent.id)
                      }
                    >
                      <span className="category-left">
                        <span className="folder">
                          📁
                        </span>

                        <span>
                          {parent.name}
                        </span>
                      </span>

                      {children.length > 0 && (
                        <span
                          className={
                            isOpen
                              ? "arrow rotate"
                              : "arrow"
                          }
                        >
                          ›
                        </span>
                      )}
                    </button>

                    {isOpen &&
                      children.length > 0 && (
                        <div className="children">

                          {children.map((child) => (
                            <button
                              key={child.id}
                              className={
                                Number(
                                  selectedChild
                                ) ===
                                Number(child.id)
                                  ? "child-category selected"
                                  : "child-category"
                              }
                              onClick={() =>
                                selectChild(
                                  parent.id,
                                  child.id
                                )
                              }
                            >
                              <span>
                                └─
                              </span>

                              <span>
                                {child.name}
                              </span>
                            </button>
                          ))}

                        </div>
                      )}

                  </div>
                );
              })}

            </div>

            <div className="sidebar-support">
              <div className="support-icon">
                💬
              </div>

              <strong>
                Cần hỗ trợ?
              </strong>

              <p>
                Liên hệ Admin để được hỗ trợ.
              </p>

              <a
                href={ZALO_ADMIN}
                target="_blank"
                rel="noreferrer"
              >
                CHAT ADMIN
              </a>
            </div>

          </aside>

          {/* CONTENT */}
          <section className="shop-content">

            <div className="toolbar">

              <div>
                <h2>
                  {selectedChild
                    ? getCategoryName(
                        selectedChild,
                        categories
                      )
                    : selectedParent
                    ? getCategoryName(
                        selectedParent,
                        categories
                      )
                    : "Tất cả sản phẩm"}
                </h2>

                <span>
                  {filteredProducts.length} sản phẩm
                </span>
              </div>

              <div className="tools">

                <div className="search">
                  🔎

                  <input
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    placeholder="Tìm sản phẩm..."
                  />
                </div>

                <select
                  value={sort}
                  onChange={(e) =>
                    setSort(e.target.value)
                  }
                >
                  <option value="default">
                    Mặc định
                  </option>

                  <option value="price-asc">
                    Giá thấp → cao
                  </option>

                  <option value="price-desc">
                    Giá cao → thấp
                  </option>

                  <option value="name">
                    Tên A → Z
                  </option>
                </select>

              </div>
            </div>

            {error && (
              <div className="error-box">
                ⚠️ {error}
              </div>
            )}

            {message && (
              <div className="message-box">
                {message}

                <button
                  onClick={() =>
                    setMessage("")
                  }
                >
                  ×
                </button>
              </div>
            )}

            {/* PRODUCTS */}
            {filteredProducts.length === 0 ? (
              <div className="empty">
                <div>
                  🛒
                </div>

                <h3>
                  Chưa có sản phẩm
                </h3>

                <p>
                  Danh mục này hiện chưa có sản phẩm.
                </p>
              </div>
            ) : (
              <div className="product-grid">

                {filteredProducts.map(
                  (product) => {
                    const stock =
                      getStock(product.id);

                    const chain =
                      getCategoryChain(
                        product.category_id,
                        categories
                      );

                    return (
                      <article
                        className="product-card"
                        key={product.id}
                      >

                        <div className="cover">
                          <ProductMedia
                            product={product}
                          />

                          {stock > 0 ? (
                            <span className="stock available">
                              Còn {stock}
                            </span>
                          ) : (
                            <span className="stock soldout">
                              Hết hàng
                            </span>
                          )}

                          {product.media_type ===
                            "video" && (
                            <span className="media-tag">
                              VIDEO
                            </span>
                          )}
                        </div>

                        <div className="product-body">

                          <div className="product-category">
                            {chain.length > 0
                              ? chain
                                  .map(
                                    (item) =>
                                      item.name
                                  )
                                  .join(" / ")
                              : "Sản phẩm"}
                          </div>

                          <h3>
                            {product.name}
                          </h3>

                          {product.description && (
                            <p className="description">
                              {product.description}
                            </p>
                          )}

                          {product.duration_days && (
                            <div className="duration">
                              ⏱ HSD{" "}
                              {product.duration_days}{" "}
                              ngày
                            </div>
                          )}

                          <div className="product-bottom">

                            <strong className="price">
                              {formatPrice(
                                product.price
                              )}
                            </strong>

                            <button
                              disabled={stock <= 0}
                              className="buy-button"
                              onClick={() =>
                                setBuyModal(product)
                              }
                            >
                              {stock > 0
                                ? "MUA NGAY"
                                : "HẾT HÀNG"}
                            </button>

                          </div>

                        </div>

                      </article>
                    );
                  }
                )}

              </div>
            )}

          </section>
        </div>
      </div>

      {/* FLOATING ADMIN */}
      <a
        href={ZALO_ADMIN}
        target="_blank"
        rel="noreferrer"
        className="floating-admin"
      >
        💬
        <span>
          Chat Admin
        </span>
      </a>

      {/* BUY MODAL */}
      {buyModal && (
        <div
          className="modal-overlay"
          onClick={() =>
            !buying && setBuyModal(null)
          }
        >
          <div
            className="modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="close"
              onClick={() =>
                !buying &&
                setBuyModal(null)
              }
            >
              ×
            </button>

            <div className="modal-icon">
              🛒
            </div>

            <h2>
              Xác nhận mua hàng
            </h2>

            <p className="modal-product">
              {buyModal.name}
            </p>

            <div className="confirm-row">
              <span>
                Giá
              </span>

              <strong>
                {formatPrice(
                  buyModal.price
                )}
              </strong>
            </div>

            <div className="confirm-row">
              <span>
                Số dư
              </span>

              <strong>
                {formatPrice(wallet)}
              </strong>
            </div>

            <div className="modal-actions">

              <button
                className="cancel-button"
                disabled={buying}
                onClick={() =>
                  setBuyModal(null)
                }
              >
                Hủy
              </button>

              <button
                className="confirm-button"
                disabled={buying}
                onClick={handleBuy}
              >
                {buying
                  ? "ĐANG XỬ LÝ..."
                  : "XÁC NHẬN MUA"}
              </button>

            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {successModal && (
        <div className="modal-overlay">
          <div className="modal success-modal">

            <div className="success-icon">
              ✓
            </div>

            <h2>
              Mua hàng thành công
            </h2>

            <p>
              {successModal.product?.name}
            </p>

            {successModal.key && (
              <div className="key-box">
                <span>
                  KEY CỦA BẠN
                </span>

                <strong>
                  {successModal.key}
                </strong>

                <button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      successModal.key
                    )
                  }
                >
                  📋 Sao chép
                </button>
              </div>
            )}

            <button
              className="confirm-button full"
              onClick={() =>
                setSuccessModal(null)
              }
            >
              ĐÓNG
            </button>

          </div>
        </div>
      )}

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
* {
  box-sizing: border-box;
}

.page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 10% 10%, rgba(255, 120, 190, .10), transparent 28%),
    radial-gradient(circle at 90% 20%, rgba(150, 120, 255, .08), transparent 28%),
    #f7f8fc;
  color: #222;
  font-family: Arial, Helvetica, sans-serif;
}

/* HEADER */

.topbar {
  height: 64px;
  background: rgba(255,255,255,.96);
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(14px);
}

.topbar-inner {
  max-width: 1220px;
  height: 100%;
  margin: auto;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.logo {
  border: 0;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 18px;
  font-weight: 900;
  color: #151515;
}

.logo small {
  color: #e83d94;
  font-size: 12px;
}

.logo-x {
  width: 34px;
  height: 34px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg,#ff4ba6,#8d54ff);
  color: white;
  font-weight: 900;
  box-shadow: 0 8px 20px rgba(232,61,148,.25);
}

.top-nav {
  display: flex;
  gap: 4px;
}

.top-nav button {
  border: 0;
  background: transparent;
  padding: 10px 14px;
  border-radius: 9px;
  cursor: pointer;
  color: #666;
  font-weight: 700;
}

.top-nav button:hover,
.top-nav button.active {
  color: #e83d94;
  background: #fff0f7;
}

.account-area {
  display: flex;
  gap: 8px;
}

.wallet,
.account {
  border: 0;
  border-radius: 9px;
  padding: 9px 12px;
  cursor: pointer;
  font-weight: 700;
}

.wallet {
  color: #d72882;
  background: #fff0f7;
}

.account {
  background: #222;
  color: white;
}

/* HERO */

.hero {
  min-height: 155px;
  display: flex;
  align-items: center;
  background:
    linear-gradient(
      110deg,
      #ffd9ec 0%,
      #ffeef8 48%,
      #eee4ff 100%
    );
  border-bottom: 1px solid #f1dbe8;
}

.hero > div {
  width: 1220px;
  margin: auto;
  padding: 28px 18px;
}

.hero-badge {
  display: inline-block;
  background: white;
  color: #e23a91;
  padding: 6px 11px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  margin-bottom: 8px;
}

.hero h1 {
  margin: 0;
  font-size: 30px;
  font-weight: 900;
}

.hero p {
  margin: 7px 0 0;
  color: #777;
}

/* CONTAINER */

.container {
  max-width: 1220px;
  margin: auto;
  padding: 18px;
}

.breadcrumb {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  color: #999;
  margin-bottom: 16px;
}

.breadcrumb button {
  border: 0;
  background: transparent;
  cursor: pointer;
  color: #777;
}

.breadcrumb strong {
  color: #e83d94;
}

/* LAYOUT */

.layout {
  display: grid;
  grid-template-columns: 225px minmax(0,1fr);
  gap: 20px;
}

/* SIDEBAR */

.sidebar {
  background: white;
  border: 1px solid #eee;
  border-radius: 15px;
  padding: 14px;
  height: fit-content;
  box-shadow: 0 8px 30px rgba(30,20,50,.04);
}

.sidebar-title {
  font-size: 12px;
  font-weight: 900;
  color: #999;
  padding: 4px 6px 13px;
  letter-spacing: .4px;
}

.category-all,
.parent-category,
.child-category {
  width: 100%;
  border: 0;
  cursor: pointer;
  text-align: left;
}

.category-all,
.parent-category {
  min-height: 42px;
  border-radius: 9px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  font-weight: 700;
  color: #555;
}

.category-all:hover,
.parent-category:hover,
.category-all.selected,
.parent-category.selected {
  background: #fff0f7;
  color: #e43791;
}

.category-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.folder {
  font-size: 15px;
}

.arrow {
  font-size: 22px;
  transition: transform .2s;
}

.arrow.rotate {
  transform: rotate(90deg);
}

.children {
  padding: 2px 0 5px 13px;
}

.child-category {
  min-height: 36px;
  border-radius: 8px;
  background: transparent;
  color: #777;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 9px;
  font-size: 13px;
}

.child-category:hover,
.child-category.selected {
  color: #e43791;
  background: #fff7fb;
}

.sidebar-support {
  margin-top: 16px;
  border-radius: 12px;
  padding: 14px;
  background: linear-gradient(135deg,#fff0f7,#f4edff);
  text-align: center;
}

.support-icon {
  font-size: 25px;
}

.sidebar-support strong {
  display: block;
  margin-top: 5px;
}

.sidebar-support p {
  font-size: 11px;
  color: #888;
  line-height: 1.5;
}

.sidebar-support a {
  display: block;
  text-decoration: none;
  background: #e83d94;
  color: white;
  border-radius: 8px;
  padding: 8px;
  font-size: 11px;
  font-weight: 900;
}

/* CONTENT */

.shop-content {
  min-width: 0;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin-bottom: 15px;
}

.toolbar h2 {
  margin: 0;
  font-size: 20px;
}

.toolbar > div:first-child span {
  display: block;
  margin-top: 4px;
  color: #999;
  font-size: 12px;
}

.tools {
  display: flex;
  gap: 8px;
}

.search {
  width: 210px;
  background: white;
  border: 1px solid #eee;
  border-radius: 9px;
  height: 38px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  gap: 6px;
}

.search input {
  border: 0;
  outline: 0;
  width: 100%;
  font-size: 12px;
}

.tools select {
  border: 1px solid #eee;
  background: white;
  border-radius: 9px;
  padding: 0 10px;
  outline: 0;
}

/* PRODUCTS */

.product-grid {
  display: grid;
  grid-template-columns: repeat(4,minmax(0,1fr));
  gap: 14px;
}

.product-card {
  background: white;
  border: 1px solid #eee;
  border-radius: 13px;
  overflow: hidden;
  transition: transform .18s, box-shadow .18s;
}

.product-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 15px 35px rgba(40,20,60,.10);
}

.cover {
  height: 150px;
  background: #f0f1f6;
  position: relative;
  overflow: hidden;
}

.product-media {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.media-wrap {
  position: relative;
  width: 100%;
  height: 100%;
}

.video-badge,
.media-tag {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0,0,0,.65);
  color: white;
  padding: 4px 7px;
  border-radius: 6px;
  font-size: 9px;
  font-weight: 900;
}

.stock {
  position: absolute;
  right: 8px;
  top: 8px;
  padding: 4px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 900;
}

.stock.available {
  background: rgba(255,255,255,.94);
  color: #22a05a;
}

.stock.soldout {
  background: #222;
  color: white;
}

.product-body {
  padding: 11px;
}

.product-category {
  color: #e83d94;
  font-size: 9px;
  font-weight: 900;
  text-transform: uppercase;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-body h3 {
  margin: 0;
  font-size: 14px;
  line-height: 1.35;
}

.description {
  margin: 6px 0;
  color: #888;
  font-size: 10px;
  line-height: 1.45;
  min-height: 28px;
}

.duration {
  color: #888;
  font-size: 10px;
  margin-top: 5px;
}

.product-bottom {
  margin-top: 11px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
}

.price {
  color: #e52f8d;
  font-size: 15px;
  white-space: nowrap;
}

.buy-button {
  border: 0;
  border-radius: 7px;
  padding: 8px 9px;
  background: #e83d94;
  color: white;
  font-size: 9px;
  font-weight: 900;
  cursor: pointer;
}

.buy-button:hover {
  background: #d92f85;
}

.buy-button:disabled {
  background: #bbb;
  cursor: not-allowed;
}

/* EMPTY */

.empty {
  min-height: 300px;
  background: white;
  border: 1px solid #eee;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  text-align: center;
}

.empty > div {
  font-size: 42px;
}

.empty h3 {
  color: #555;
  margin: 10px 0 4px;
}

.empty p {
  margin: 0;
  font-size: 12px;
}

/* MESSAGE */

.error-box,
.message-box {
  padding: 12px 14px;
  border-radius: 10px;
  margin-bottom: 13px;
  font-size: 12px;
}

.error-box {
  background: #fff0f0;
  color: #c33;
}

.message-box {
  background: #fff4d9;
  color: #8a6200;
  display: flex;
  justify-content: space-between;
}

.message-box button {
  border: 0;
  background: transparent;
  cursor: pointer;
}

/* FLOAT */

.floating-admin {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 50;
  background: #e83d94;
  color: white;
  text-decoration: none;
  border-radius: 999px;
  padding: 11px 15px;
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 900;
  box-shadow: 0 8px 25px rgba(232,61,148,.3);
}

/* MODAL */

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(20,15,25,.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  backdrop-filter: blur(4px);
}

.modal {
  position: relative;
  width: min(420px,100%);
  background: white;
  border-radius: 18px;
  padding: 25px;
  box-shadow: 0 30px 80px rgba(0,0,0,.25);
}

.close {
  position: absolute;
  right: 15px;
  top: 13px;
  border: 0;
  background: #f4f4f4;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
}

.modal-icon,
.success-icon {
  width: 55px;
  height: 55px;
  margin: auto;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 25px;
  background: #fff0f7;
}

.success-icon {
  background: #e9fff1;
  color: #19a758;
  font-weight: 900;
}

.modal h2 {
  text-align: center;
  margin: 13px 0 5px;
}

.modal-product {
  text-align: center;
  color: #e83d94;
  font-weight: 800;
}

.confirm-row {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
  padding: 11px 0;
  font-size: 13px;
}

.confirm-row strong {
  color: #e83d94;
}

.modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 18px;
}

.cancel-button,
.confirm-button {
  border: 0;
  border-radius: 9px;
  padding: 11px;
  cursor: pointer;
  font-weight: 900;
}

.cancel-button {
  background: #eee;
}

.confirm-button {
  background: #e83d94;
  color: white;
}

.confirm-button:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.confirm-button.full {
  width: 100%;
  margin-top: 15px;
}

.key-box {
  margin-top: 15px;
  padding: 14px;
  background: #f7f7fa;
  border-radius: 10px;
  text-align: center;
}

.key-box span {
  display: block;
  color: #999;
  font-size: 10px;
  margin-bottom: 7px;
}

.key-box strong {
  display: block;
  word-break: break-all;
  font-size: 15px;
  color: #e83d94;
}

.key-box button {
  margin-top: 10px;
  border: 0;
  background: white;
  border: 1px solid #eee;
  border-radius: 7px;
  padding: 7px 10px;
  cursor: pointer;
}

/* LOADING */

.loading-screen {
  min-height: 100vh;
  background: #f7f8fc;
  display: grid;
  place-items: center;
}

.loading-box {
  text-align: center;
  color: #888;
}

.loader {
  width: 40px;
  height: 40px;
  border: 4px solid #eee;
  border-top-color: #e83d94;
  border-radius: 50%;
  animation: spin .8s linear infinite;
  margin: auto;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* TABLET */

@media (max-width: 1050px) {
  .product-grid {
    grid-template-columns: repeat(3,minmax(0,1fr));
  }

  .top-nav {
    display: none;
  }
}

/* MOBILE */

@media (max-width: 760px) {
  .topbar {
    height: 58px;
  }

  .topbar-inner {
    padding: 0 11px;
  }

  .account {
    display: none;
  }

  .wallet {
    font-size: 11px;
  }

  .hero {
    min-height: 125px;
  }

  .hero > div {
    padding: 22px 14px;
  }

  .hero h1 {
    font-size: 25px;
  }

  .container {
    padding: 12px;
  }

  .layout {
    display: block;
  }

  .sidebar {
    margin-bottom: 14px;
  }

  .sidebar-support {
    display: none;
  }

  .category-tree {
    max-height: 240px;
    overflow-y: auto;
  }

  .toolbar {
    display: block;
  }

  .toolbar h2 {
    margin-bottom: 3px;
  }

  .tools {
    margin-top: 10px;
    display: grid;
    grid-template-columns: 1fr 125px;
  }

  .search {
    width: 100%;
  }

  .product-grid {
    grid-template-columns: repeat(2,minmax(0,1fr));
    gap: 9px;
  }

  .cover {
    height: 125px;
  }

  .product-body {
    padding: 9px;
  }

  .product-body h3 {
    font-size: 12px;
  }

  .price {
    font-size: 13px;
  }

  .buy-button {
    padding: 7px;
    font-size: 8px;
  }

  .floating-admin {
    right: 12px;
    bottom: 12px;
    padding: 10px 12px;
  }

  .floating-admin span {
    display: none;
  }
}

@media (max-width: 390px) {
  .product-grid {
    gap: 7px;
  }

  .cover {
    height: 110px;
  }

  .price {
    font-size: 12px;
  }

  .buy-button {
    padding: 6px;
  }
}
`;
