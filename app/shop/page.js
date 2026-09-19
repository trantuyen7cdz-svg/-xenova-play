"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ZALO_ADMIN = "https://zalo.me/0987654321";

function formatPrice(value) {
  return (
    new Intl.NumberFormat("vi-VN").format(
      Number(value || 0)
    ) + "đ"
  );
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

function getCategoryImage(category) {
  return (
    category?.image_url ||
    category?.demo_image_url ||
    ""
  );
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

  const [selectedParent, setSelectedParent] =
    useState(null);

  const [selectedChild, setSelectedChild] =
    useState(null);

  const [view, setView] = useState("parents");

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("default");

  const [buyModal, setBuyModal] = useState(null);
  const [successModal, setSuccessModal] =
    useState(null);

  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState("");

  /* =========================================
     AUTH
  ========================================= */

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
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* =========================================
     LOAD SHOP
  ========================================= */

  async function loadShop() {
    try {
      setLoading(true);
      setError("");

      const [
        catalogResponse,
        stockResponse,
      ] = await Promise.all([
        fetch("/api/shop/catalog", {
          cache: "no-store",
        }),

        fetch("/api/shop/stock", {
          cache: "no-store",
        }),
      ]);

      const catalog =
        await catalogResponse.json();

      const stock =
        await stockResponse.json();

      if (
        !catalogResponse.ok ||
        !catalog.success
      ) {
        throw new Error(
          catalog.error ||
            "Không tải được cửa hàng"
        );
      }

      setCategories(
        catalog.categories || []
      );

      setProducts(
        catalog.products || []
      );

      if (stock?.success) {
        setStockMap(
          stock.stock ||
            stock.stockMap ||
            {}
        );
      } else {
        setStockMap({});
      }
    } catch (err) {
      console.error(
        "LOAD SHOP ERROR:",
        err
      );

      setError(
        err.message ||
          "Không thể tải cửa hàng"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadShop();
  }, []);

  /* =========================================
     LOAD WALLET
  ========================================= */

  useEffect(() => {
    if (!user) {
      setWallet(0);
      return;
    }

    async function loadWallet() {
      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select(
          "wallet_balance,balance"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error(
          "WALLET ERROR:",
          error
        );
        return;
      }

      setWallet(
        Number(
          data?.wallet_balance ??
            data?.balance ??
            0
        )
      );
    }

    loadWallet();
  }, [user]);

  /* =========================================
     CATEGORY
  ========================================= */

  const parentCategories =
    useMemo(() => {
      return categories.filter(
        (category) =>
          category.parent_id === null ||
          category.parent_id === undefined
      );
    }, [categories]);

  function getChildren(parentId) {
    return categories.filter(
      (category) =>
        Number(category.parent_id) ===
        Number(parentId)
    );
  }

  function getProductsByCategory(
    categoryId
  ) {
    return products.filter(
      (product) =>
        Number(product.category_id) ===
        Number(categoryId)
    );
  }

  function getParentProductCount(
    parentId
  ) {
    const children =
      getChildren(parentId);

    const allowedIds = [
      Number(parentId),
      ...children.map((item) =>
        Number(item.id)
      ),
    ];

    return products.filter(
      (product) =>
        allowedIds.includes(
          Number(product.category_id)
        )
    ).length;
  }

  /* =========================================
     OPEN PARENT
  ========================================= */

  function openParent(parent) {
    setSelectedParent(parent);
    setSelectedChild(null);
    setSearch("");

    const children =
      getChildren(parent.id);

    if (children.length > 0) {
      setView("children");
      return;
    }

    setView("products");
  }

  /* =========================================
     OPEN CHILD
  ========================================= */

  function openChild(child) {
    setSelectedChild(child);
    setSearch("");
    setView("products");
  }

  /* =========================================
     BACK
  ========================================= */

  function goHome() {
    setSelectedParent(null);
    setSelectedChild(null);
    setView("parents");
    setSearch("");
  }

  function goParent() {
    if (!selectedParent) {
      goHome();
      return;
    }

    setSelectedChild(null);
    setSearch("");

    const children =
      getChildren(
        selectedParent.id
      );

    if (children.length > 0) {
      setView("children");
    } else {
      setView("products");
    }
  }

  /* =========================================
     STOCK
  ========================================= */

  function getStock(productId) {
    const value =
      stockMap?.[productId] ??
      stockMap?.[String(productId)] ??
      null;

    if (
      value === null ||
      value === undefined
    ) {
      return 0;
    }

    if (
      typeof value === "object"
    ) {
      return Number(
        value.available || 0
      );
    }

    return Number(value || 0);
  }

  /* =========================================
     FILTER PRODUCTS
  ========================================= */

  const filteredProducts =
    useMemo(() => {
      let result = [...products];

      if (selectedChild) {
        result = result.filter(
          (product) =>
            Number(
              product.category_id
            ) ===
            Number(
              selectedChild.id
            )
        );
      } else if (selectedParent) {
        const children =
          getChildren(
            selectedParent.id
          );

        const allowedIds = [
          Number(
            selectedParent.id
          ),
          ...children.map(
            (item) =>
              Number(item.id)
          ),
        ];

        result = result.filter(
          (product) =>
            allowedIds.includes(
              Number(
                product.category_id
              )
            )
        );
      }

      const keyword =
        normalize(search);

      if (keyword) {
        result = result.filter(
          (product) =>
            normalize(
              product.name
            ).includes(keyword) ||
            normalize(
              product.description
            ).includes(keyword)
        );
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
        result.sort(
          (a, b) =>
            String(
              a.name || ""
            ).localeCompare(
              String(
                b.name || ""
              ),
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

  /* =========================================
     PRODUCT MEDIA
  ========================================= */

  function ProductMedia({ product }) {
    const image =
      getProductImage(product);

    if (
      product.media_type ===
        "video" &&
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
      product.media_type ===
        "both" &&
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

  /* =========================================
     CATEGORY MEDIA
  ========================================= */

  function CategoryMedia({
    category,
    large = false,
  }) {
    const image =
      getCategoryImage(category);

    const type =
      category?.media_type ||
      (category?.video_url
        ? "video"
        : "image");

    if (
      type === "video" &&
      category?.video_url
    ) {
      return (
        <div
          className={
            large
              ? "category-media large"
              : "category-media"
          }
        >
          <video
            src={category.video_url}
            muted
            loop
            playsInline
            autoPlay
          />

          <span className="category-video-badge">
            ▶ VIDEO
          </span>
        </div>
      );
    }

    if (image) {
      return (
        <div
          className={
            large
              ? "category-media large"
              : "category-media"
          }
        >
          <img
            src={image}
            alt={
              category?.name ||
              "Category"
            }
          />
        </div>
      );
    }

    return (
      <div
        className={
          large
            ? "category-media large category-empty"
            : "category-media category-empty"
        }
      >
        <span>📁</span>

        <small>
          {category?.name ||
            "Danh mục"}
        </small>
      </div>
    );
  }

  /* =========================================
     BUY
  ========================================= */

  async function handleBuy() {
    if (!buyModal) {
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    const stock =
      getStock(buyModal.id);

    if (stock <= 0) {
      setMessage(
        "Sản phẩm hiện đã hết hàng."
      );
      return;
    }

    if (
      wallet <
      Number(
        buyModal.price || 0
      )
    ) {
      setMessage(
        "Số dư không đủ. Vui lòng nạp tiền."
      );
      return;
    }

    try {
      setBuying(true);
      setMessage("");

      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      if (
        !session?.access_token
      ) {
        router.push("/login");
        return;
      }

      const response =
        await fetch(
          "/api/buy-key",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body: JSON.stringify({
              productId:
                Number(
                  buyModal.id
                ),
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        data?.success === false
      ) {
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

      const {
        data: profile,
      } =
        await supabase
          .from("profiles")
          .select(
            "wallet_balance,balance"
          )
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
      console.error(
        "BUY ERROR:",
        err
      );

      setMessage(
        err.message ||
          "Mua sản phẩm thất bại"
      );
    } finally {
      setBuying(false);
    }
  }

  /* =========================================
     LOADING
  ========================================= */

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-box">
          <div className="loader" />

          <p>
            Đang tải cửa hàng...
          </p>
        </div>

        <style jsx>
          {styles}
        </style>
      </div>
    );
  }

  /* =========================================
     MAIN
  ========================================= */

  return (
    <main className="page">

      {/* HEADER */}

      <header className="topbar">
        <div className="topbar-inner">

          <button
            className="logo"
            onClick={() =>
              router.push("/")
            }
          >
            <span className="logo-x">
              X
            </span>

            <span>
              XENOVA
              <small>
                {" "}PLAY
              </small>
            </span>
          </button>

          <nav className="top-nav">

            <button
              onClick={() =>
                router.push("/")
              }
            >
              Trang chủ
            </button>

            <button className="active">
              Cửa hàng
            </button>

            <button
              onClick={() =>
                router.push(
                  "/keys"
                )
              }
            >
              Kho KEY
            </button>

            <button
              onClick={() =>
                router.push(
                  "/orders"
                )
              }
            >
              Đơn hàng
            </button>

          </nav>

          <div className="account-area">

            <button
              className="wallet"
              onClick={() =>
                router.push(
                  "/deposit"
                )
              }
            >
              💰{" "}
              {formatPrice(wallet)}
            </button>

            {user ? (
              <button
                className="account"
                onClick={() =>
                  router.push(
                    "/account"
                  )
                }
              >
                👤 Tài khoản
              </button>
            ) : (
              <button
                className="account"
                onClick={() =>
                  router.push(
                    "/login"
                  )
                }
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
          <span className="hero-badge">
            XENOVA PLAY SHOP
          </span>

          <h1>
            Cửa hàng
          </h1>

          <p>
            Chọn danh mục để xem
            sản phẩm và mua KEY.
          </p>
        </div>
      </section>

      {/* CONTENT */}

      <div className="container">

        {/* BREADCRUMB */}

        <div className="breadcrumb">

          <button
            onClick={goHome}
          >
            Cửa hàng
          </button>

          {selectedParent && (
            <>
              <span>›</span>

              <button
                onClick={goParent}
              >
                {selectedParent.name}
              </button>
            </>
          )}

          {selectedChild && (
            <>
              <span>›</span>

              <strong>
                {selectedChild.name}
              </strong>
            </>
          )}

        </div>

        {/* ERROR */}

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        {/* MESSAGE */}

        {message && (
          <div className="message-box">
            <span>
              {message}
            </span>

            <button
              onClick={() =>
                setMessage("")
              }
            >
              ✕
            </button>
          </div>
        )}

        {/* =================================
            PARENT
        ================================= */}

        {view === "parents" && (
          <>
            <div className="section-heading">

              <div>
                <span className="back-link">
                  DANH MỤC SHOP
                </span>

                <h2>
                  Chọn thư mục
                </h2>

                <p>
                  Chọn thư mục mẹ để
                  xem các thư mục con.
                </p>
              </div>

              <span className="count-badge">
                {parentCategories.length}
                {" "}thư mục
              </span>

            </div>

            {parentCategories.length ===
            0 ? (
              <div className="empty">
                <div>📁</div>

                <h3>
                  Chưa có danh mục
                </h3>

                <p>
                  Admin chưa tạo thư mục
                  sản phẩm.
                </p>
              </div>
            ) : (
              <div className="parent-grid">

                {parentCategories.map(
                  (parent) => {

                    const children =
                      getChildren(
                        parent.id
                      );

                    const productCount =
                      getParentProductCount(
                        parent.id
                      );

                    return (
                      <button
                        key={
                          parent.id
                        }
                        className="parent-card"
                        onClick={() =>
                          openParent(
                            parent
                          )
                        }
                      >

                        <CategoryMedia
                          category={
                            parent
                          }
                          large
                        />

                        <div className="parent-card-body">

                          <div className="parent-card-title-row">

                            <h3>
                              {
                                parent.name
                              }
                            </h3>

                            <span className="circle-arrow">
                              →
                            </span>

                          </div>

                          <p>
                            {parent.description ||
                              "Xem các sản phẩm trong danh mục này."}
                          </p>

                          <div className="parent-meta">

                            <span>
                              📁{" "}
                              {
                                children.length
                              }{" "}
                              thư mục con
                            </span>

                            <span>
                              🛒{" "}
                              {
                                productCount
                              }{" "}
                              sản phẩm
                            </span>

                          </div>

                          <div className="view-all">

                            <span>
                              XEM TẤT CẢ
                            </span>

                            <span>
                              →
                            </span>

                          </div>

                        </div>

                      </button>
                    );
                  }
                )}

              </div>
            )}
          </>
        )}

        {/* =================================
            CHILD
        ================================= */}

        {view === "children" &&
          selectedParent && (
            <>
              <div className="section-heading">

                <div>
                  <button
                    className="back-link"
                    onClick={goHome}
                  >
                    ← QUAY LẠI
                  </button>

                  <h2>
                    {
                      selectedParent.name
                    }
                  </h2>

                  <p>
                    Chọn thư mục con để
                    xem sản phẩm.
                  </p>
                </div>

                <span className="count-badge">
                  {
                    getChildren(
                      selectedParent.id
                    ).length
                  }{" "}
                  thư mục con
                </span>

              </div>

              <div className="child-grid">

                {getChildren(
                  selectedParent.id
                ).map((child) => {

                  const childProducts =
                    getProductsByCategory(
                      child.id
                    );

                  return (
                    <button
                      key={
                        child.id
                      }
                      className="child-card"
                      onClick={() =>
                        openChild(
                          child
                        )
                      }
                    >

                      <CategoryMedia
                        category={
                          child
                        }
                        large
                      />

                      <div className="child-card-body">

                        <div className="child-card-title-row">

                          <h3>
                            {
                              child.name
                            }
                          </h3>

                          <span className="circle-arrow">
                            →
                          </span>

                        </div>

                        <p>
                          {child.description ||
                            "Xem sản phẩm trong thư mục này."}
                        </p>

                        <span className="child-meta">
                          🛒{" "}
                          {
                            childProducts.length
                          }{" "}
                          sản phẩm
                        </span>

                        <div className="view-all">

                          <span>
                            XEM SẢN PHẨM
                          </span>

                          <span>
                            →
                          </span>

                        </div>

                      </div>

                    </button>
                  );
                })}

              </div>
            </>
          )}

        {/* =================================
            PRODUCTS
        ================================= */}

        {view === "products" && (
          <>
            <div className="products-heading">

              <div>
                <button
                  className="back-link"
                  onClick={
                    selectedChild
                      ? goParent
                      : goHome
                  }
                >
                  ← QUAY LẠI
                </button>

                <h2>
                  {selectedChild
                    ? selectedChild.name
                    : selectedParent?.name ||
                      "Sản phẩm"}
                </h2>

                <p>
                  Chọn sản phẩm để
                  mua KEY.
                </p>
              </div>

              <div className="tools">

                <div className="search">

                  <span>
                    🔎
                  </span>

                  <input
                    value={search}
                    onChange={(e) =>
                      setSearch(
                        e.target.value
                      )
                    }
                    placeholder="Tìm sản phẩm..."
                  />

                </div>

                <select
                  value={sort}
                  onChange={(e) =>
                    setSort(
                      e.target.value
                    )
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

            {filteredProducts.length ===
            0 ? (
              <div className="empty">

                <div>
                  🛒
                </div>

                <h3>
                  Chưa có sản phẩm
                </h3>

                <p>
                  Danh mục này hiện chưa
                  có sản phẩm.
                </p>

              </div>
            ) : (
              <div className="product-grid">

                {filteredProducts.map(
                  (product) => {

                    const stock =
                      getStock(
                        product.id
                      );

                    return (
                      <div
                        key={
                          product.id
                        }
                        className="product-card"
                      >

                        <div className="cover">

                          <ProductMedia
                            product={
                              product
                            }
                          />

                          <span
                            className={
                              stock > 0
                                ? "stock available"
                                : "stock soldout"
                            }
                          >
                            {stock > 0
                              ? `Còn ${stock}`
                              : "HẾT HÀNG"}
                          </span>

                        </div>

                        <div className="product-body">

                          <div className="product-category">
                            {
                              selectedChild?.name ||
                              product.category?.name ||
                              ""
                            }
                          </div>

                          <h3>
                            {
                              product.name
                            }
                          </h3>

                          <p className="description">
                            {
                              product.description ||
                              "Sản phẩm XENOVA PLAY."
                            }
                          </p>

                          {product.duration_days && (
                            <div className="duration">
                              ⏱ Thời hạn:{" "}
                              {
                                product.duration_days
                              }{" "}
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
                              className="buy-button"
                              disabled={
                                stock <= 0
                              }
                              onClick={() => {
                                setMessage(
                                  ""
                                );

                                setBuyModal(
                                  product
                                );
                              }}
                            >
                              {stock > 0
                                ? "MUA NGAY"
                                : "HẾT HÀNG"}
                            </button>

                          </div>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </>
        )}

      </div>

      {/* FLOATING ZALO */}

      <a
        href={ZALO_ADMIN}
        target="_blank"
        rel="noreferrer"
        className="floating-admin"
      >
        💬
        <span>
          Liên hệ Admin
        </span>
      </a>

      {/* =================================
          BUY MODAL
      ================================= */}

      {buyModal && (
        <div className="modal-overlay">

          <div className="modal">

            <button
              className="close"
              onClick={() =>
                setBuyModal(null)
              }
            >
              ×
            </button>

            <div className="modal-icon">
              🛒
            </div>

            <h2>
              Xác nhận mua
            </h2>

            <p className="modal-product">
              {
                buyModal.name
              }
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
                {formatPrice(
                  wallet
                )}
              </strong>
            </div>

            <div className="confirm-row">
              <span>
                Sau khi mua
              </span>

              <strong>
                {formatPrice(
                  Math.max(
                    0,
                    wallet -
                      Number(
                        buyModal.price ||
                          0
                      )
                  )
                )}
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
                onClick={
                  handleBuy
                }
              >
                {buying
                  ? "ĐANG XỬ LÝ..."
                  : "XÁC NHẬN MUA"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* =================================
          SUCCESS MODAL
      ================================= */}

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
              {
                successModal
                  .product
                  ?.name
              }
            </p>

            {successModal.key && (
              <div className="key-box">

                <span>
                  KEY CỦA BẠN
                </span>

                <strong>
                  {
                    successModal.key
                  }
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
                setSuccessModal(
                  null
                )
              }
            >
              ĐÓNG
            </button>

          </div>

        </div>
      )}

      <style jsx>
        {styles}
      </style>

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
    radial-gradient(
      circle at 10% 10%,
      rgba(255, 120, 190, .10),
      transparent 28%
    ),
    radial-gradient(
      circle at 90% 20%,
      rgba(150, 120, 255, .08),
      transparent 28%
    ),
    #f7f8fc;
  color: #222;
  font-family:
    Arial,
    Helvetica,
    sans-serif;
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
  background:
    linear-gradient(
      135deg,
      #ff4ba6,
      #8d54ff
    );
  color: white;
  font-weight: 900;
  box-shadow:
    0 8px 20px
    rgba(232,61,148,.25);
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
  margin-bottom: 18px;
}

.breadcrumb button {
  border: 0;
  background: transparent;
  cursor: pointer;
  color: #777;
  padding: 0;
}

.breadcrumb strong {
  color: #e83d94;
}

/* SECTION */

.section-heading,
.products-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 18px;
}

.section-heading h2,
.products-heading h2 {
  margin: 7px 0 0;
  font-size: 23px;
  font-weight: 900;
}

.section-heading p,
.products-heading p {
  margin: 5px 0 0;
  color: #999;
  font-size: 12px;
}

.count-badge {
  background: white;
  border: 1px solid #eee;
  border-radius: 999px;
  padding: 8px 12px;
  color: #e83d94;
  font-size: 11px;
  font-weight: 850;
}

.back-link {
  border: 0;
  background: transparent;
  padding: 0;
  color: #e83d94;
  cursor: pointer;
  font-size: 11px;
  font-weight: 850;
}

/* PARENT GRID */

.parent-grid {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.parent-card {
  width: 100%;
  border: 1px solid #eee;
  padding: 0;
  overflow: hidden;
  background: white;
  border-radius: 18px;
  text-align: left;
  cursor: pointer;
  transition:
    transform .2s,
    box-shadow .2s,
    border-color .2s;
}

.parent-card:hover {
  transform: translateY(-4px);
  border-color: #f2bddb;
  box-shadow:
    0 18px 45px
    rgba(40,20,60,.10);
}

/* CATEGORY MEDIA */

.category-media {
  width: 100%;
  height: 95px;
  background:
    linear-gradient(
      135deg,
      #f7edf4,
      #eeeafd
    );
  position: relative;
  overflow: hidden;
}

.category-media.large {
  height: 190px;
}

.category-media img,
.category-media video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.category-video-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 5px 8px;
  border-radius: 7px;
  background: rgba(0,0,0,.62);
  color: white;
  font-size: 9px;
  font-weight: 900;
}

.category-empty {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #aaa;
  gap: 6px;
}

.category-empty span {
  font-size: 38px;
}

.category-empty small {
  font-size: 10px;
}

/* PARENT CARD */

.parent-card-body {
  padding: 15px;
}

.parent-card-title-row,
.child-card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.parent-card h3,
.child-card h3 {
  margin: 0;
  color: #222;
  font-size: 17px;
  font-weight: 900;
}

.parent-card-body p,
.child-card-body p {
  margin: 7px 0;
  color: #888;
  font-size: 11px;
  line-height: 1.5;
}

.circle-arrow {
  width: 31px;
  height: 31px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #fff0f7;
  color: #e83d94;
  font-weight: 900;
}

.parent-meta {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  margin-top: 11px;
}

.parent-meta span,
.child-meta {
  padding: 6px 8px;
  border-radius: 7px;
  background: #f7f7fa;
  color: #888;
  font-size: 9px;
  font-weight: 750;
}

.view-all {
  margin-top: 13px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #e83d94;
  font-size: 10px;
  font-weight: 900;
}

/* CHILD */

.child-grid {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.child-card {
  width: 100%;
  border: 1px solid #eee;
  padding: 0;
  overflow: hidden;
  background: white;
  border-radius: 18px;
  text-align: left;
  cursor: pointer;
  transition:
    transform .2s,
    box-shadow .2s,
    border-color .2s;
}

.child-card:hover {
  transform: translateY(-4px);
  border-color: #f2bddb;
  box-shadow:
    0 18px 45px
    rgba(40,20,60,.10);
}

.child-card-body {
  padding: 15px;
}

/* PRODUCTS */

.tools {
  display: flex;
  gap: 8px;
}

.search {
  width: 210px;
  height: 38px;
  background: white;
  border: 1px solid #eee;
  border-radius: 9px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  gap: 6px;
}

.search input {
  width: 100%;
  border: 0;
  outline: 0;
  font-size: 12px;
}

.tools select {
  border: 1px solid #eee;
  background: white;
  border-radius: 9px;
  padding: 0 10px;
  outline: 0;
}

.product-grid {
  display: grid;
  grid-template-columns:
    repeat(4, minmax(0,1fr));
  gap: 14px;
}

.product-card {
  background: white;
  border: 1px solid #eee;
  border-radius: 13px;
  overflow: hidden;
  transition:
    transform .18s,
    box-shadow .18s;
}

.product-card:hover {
  transform: translateY(-3px);
  box-shadow:
    0 15px 35px
    rgba(40,20,60,.10);
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

/* FLOATING */

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
  box-shadow:
    0 8px 25px
    rgba(232,61,148,.3);
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
  box-shadow:
    0 30px 80px
    rgba(0,0,0,.25);
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
  border: 1px solid #eee;
  background: white;
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
    grid-template-columns:
      repeat(3,minmax(0,1fr));
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

  .parent-grid,
  .child-grid {
    grid-template-columns:
      repeat(2,minmax(0,1fr));
    gap: 9px;
  }

  .category-media.large {
    height: 125px;
  }

  .parent-card-body,
  .child-card-body {
    padding: 10px;
  }

  .parent-card h3,
  .child-card h3 {
    font-size: 12px;
  }

  .parent-card-body p,
  .child-card-body p {
    font-size: 9px;
  }

  .parent-meta {
    display: block;
  }

  .parent-meta span {
    display: block;
    margin-top: 4px;
  }

  .view-all {
    font-size: 8px;
  }

  .circle-arrow {
    width: 25px;
    height: 25px;
    font-size: 11px;
  }

  .section-heading,
  .products-heading {
    align-items: flex-start;
  }

  .count-badge {
    font-size: 9px;
    padding: 6px 8px;
  }

  .tools {
    margin-top: 10px;
    display: grid;
    grid-template-columns:
      1fr 125px;
  }

  .search {
    width: 100%;
  }

  .product-grid {
    grid-template-columns:
      repeat(2,minmax(0,1fr));
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

  .parent-grid,
  .child-grid {
    gap: 7px;
  }

  .category-media.large {
    height: 105px;
  }

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
