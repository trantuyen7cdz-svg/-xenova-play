"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ShopPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [wallet, setWallet] = useState(0);

  const [selectedCategory, setSelectedCategory] = useState(null);

  const [buyModal, setBuyModal] = useState(null);
  const [successModal, setSuccessModal] = useState(null);

  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadShop();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;

      setUser(currentUser);
      loadWallet(currentUser);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadShop() {
    setLoading(true);
    setError("");

    try {
      const [sessionResult, catalogResult, stockResult] =
        await Promise.all([
          supabase.auth.getSession(),

          fetch("/api/shop/catalog", {
            cache: "no-store",
          }),

          fetch("/api/shop/stock", {
            cache: "no-store",
          }),
        ]);

      const session = sessionResult?.data?.session || null;
      const currentUser = session?.user || null;

      setUser(currentUser);

      if (!catalogResult.ok) {
        throw new Error("Không thể kết nối đến cửa hàng.");
      }

      if (!stockResult.ok) {
        throw new Error("Không thể tải tồn kho.");
      }

      const catalogData = await catalogResult.json();
      const stockData = await stockResult.json();

      if (!catalogData.success) {
        throw new Error(
          catalogData.message || "Không thể tải sản phẩm."
        );
      }

      if (!stockData.success) {
        throw new Error(
          stockData.message || "Không thể tải tồn kho."
        );
      }

      setCategories(catalogData.categories || []);
      setProducts(catalogData.products || []);
      setStock(stockData.stock || {});

      if (currentUser) {
        await loadWallet(currentUser);
      } else {
        setWallet(0);
      }
    } catch (err) {
      console.error("SHOP LOAD ERROR:", err);

      setError(
        err?.message || "Không thể tải cửa hàng."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadWallet(currentUser) {
    if (!currentUser) {
      setWallet(0);
      return;
    }

    try {
      const { data, error: walletError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (walletError) {
        console.error(
          "WALLET LOAD ERROR:",
          walletError
        );
        return;
      }

      setWallet(Number(data?.balance || 0));
    } catch (err) {
      console.error("WALLET ERROR:", err);
    }
  }

  const visibleProducts = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }

    return products.filter(
      (product) =>
        Number(product.category_id) ===
        Number(selectedCategory.id)
    );
  }, [products, selectedCategory]);

  const categoryStock = useMemo(() => {
    const result = {};

    for (const product of products) {
      const categoryId = Number(product.category_id);

      if (!categoryId) {
        continue;
      }

      const available = Number(
        stock[Number(product.id)]?.available || 0
      );

      if (!result[categoryId]) {
        result[categoryId] = 0;
      }

      result[categoryId] += available;
    }

    return result;
  }, [products, stock]);

  function formatPrice(price) {
    return (
      new Intl.NumberFormat("vi-VN").format(
        Number(price || 0)
      ) + "đ"
    );
  }

  function formatDuration(days) {
    const value = Number(days || 0);

    if (value === 1) {
      return "1 ngày";
    }

    if (value === 7) {
      return "7 ngày";
    }

    if (value === 30) {
      return "1 tháng";
    }

    return `${value} ngày`;
  }

  function getProductStock(productId) {
    return Number(
      stock[Number(productId)]?.available || 0
    );
  }

  function handleCategoryClick(category) {
    setMessage("");
    setSelectedCategory(category);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleBackToCategories() {
    setMessage("");
    setSelectedCategory(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleBuyClick(product) {
    setMessage("");

    const available = getProductStock(product.id);

    if (available <= 0) {
      setMessage(
        "Sản phẩm này hiện đã hết KEY."
      );
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    setBuyModal(product);
  }

  async function confirmBuy() {
    if (!buyModal || buying) {
      return;
    }

    if (!user) {
      setBuyModal(null);
      router.push("/login");
      return;
    }

    const product = buyModal;

    const available = getProductStock(product.id);

    if (available <= 0) {
      setBuyModal(null);

      setMessage(
        "KEY đã hết. Vui lòng chọn sản phẩm khác."
      );

      await loadShop();
      return;
    }

    if (Number(wallet) < Number(product.price)) {
      setBuyModal(null);

      setMessage(
        "Số dư không đủ. Vui lòng nạp thêm tiền."
      );

      return;
    }

    setBuying(true);
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setBuyModal(null);
        router.push("/login");
        return;
      }

      const response = await fetch("/api/buy-key", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Authorization:
            `Bearer ${session.access_token}`,
        },

        body: JSON.stringify({
          product_id: Number(product.id),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Không thể mua KEY."
        );
      }

      setBuyModal(null);

      setSuccessModal({
        key:
          data.key ||
          data.key_code ||
          data.data?.key ||
          data.data?.key_code ||
          "",
        product,
      });

      await loadShop();

      await loadWallet(user);
    } catch (err) {
      console.error("BUY KEY ERROR:", err);

      setMessage(
        err?.message || "Mua KEY thất bại."
      );
    } finally {
      setBuying(false);
    }
  }

  async function copyKey() {
    const key = successModal?.key || "";

    if (!key) {
      return;
    }

    try {
      await navigator.clipboard.writeText(key);

      setMessage("Đã sao chép KEY.");
    } catch {
      setMessage(
        "Không thể tự động sao chép KEY."
      );
    }
  }

  function closeSuccessModal() {
    setSuccessModal(null);
    setMessage("");
  }

  function goDeposit() {
    router.push("/deposit");
  }

  return (
    <main className="shop-page">
      <div className="falling-leaves" aria-hidden="true">
        {Array.from({ length: 22 }).map((_, index) => (
          <span
            key={index}
            className="leaf"
            style={{
              "--leaf-left": `${(index * 43) % 100}%`,
              "--leaf-delay": `${(index % 11) * -1.7}s`,
              "--leaf-duration": `${7 + (index % 6)}s`,
              "--leaf-size": `${9 + (index % 5) * 2}px`,
              "--leaf-rotate": `${index * 31}deg`,
            }}
          >
            🍂
          </span>
        ))}
      </div>

      <div className="shop-container">
        <header className="xenova-store-header">
          <div className="xenova-logo">
            <div className="xenova-logo-main">
              XENOVA
            </div>

            <div className="xenova-logo-sub">
              PLAY
            </div>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="header-circle"
              onClick={goDeposit}
              aria-label="Nạp tiền"
            >
              💰
            </button>

            <button
              type="button"
              className="header-circle"
              onClick={() => {
                const event =
                  new Event("xenova-open-menu");

                window.dispatchEvent(event);
              }}
              aria-label="Mở menu"
            >
              ☰
            </button>
          </div>
        </header>

        <section className="xenova-banner">
          <div className="banner-glow" />

          <div className="banner-content">
            <div className="banner-small">
              🔥 XENOVA PLAY SHOP
            </div>

            <h1>
              XENOVA PLAY
            </h1>

            <p>
              KEY tự động • Giao ngay • An toàn
            </p>

            <button
              type="button"
              className="banner-deposit"
              onClick={goDeposit}
            >
              💰 NẠP TIỀN
            </button>
          </div>
        </section>

        {message && (
          <div className="message-box">
            <span>!</span>
            <div>{message}</div>
          </div>
        )}

        {loading ? (
          <LoadingScreen />
        ) : error ? (
          <div className="error-card">
            <div className="error-icon">
              !
            </div>

            <h2>
              Không thể tải cửa hàng
            </h2>

            <p>{error}</p>

            <button
              type="button"
              onClick={loadShop}
              className="pink-button"
            >
              THỬ LẠI
            </button>
          </div>
        ) : selectedCategory ? (
          <section className="products-section">
            <div className="pink-section-title">
              <button
                type="button"
                onClick={handleBackToCategories}
                className="back-pink-button"
              >
                ←
              </button>

              <div>
                <strong>
                  {selectedCategory.name}
                </strong>

                <small>
                  {visibleProducts.length} sản phẩm
                  {" • "}
                  {categoryStock[
                    Number(selectedCategory.id)
                  ] || 0}{" "}
                  KEY
                </small>
              </div>
            </div>

            {visibleProducts.length === 0 ? (
              <div className="empty-card">
                <div className="empty-icon">
                  📦
                </div>

                <h2>
                  Chưa có sản phẩm
                </h2>

                <p>
                  Danh mục này hiện chưa có sản phẩm
                  đang bán.
                </p>
              </div>
            ) : (
              <div className="products-grid">
                {visibleProducts.map((product) => {
                  const available =
                    getProductStock(product.id);

                  return (
                    <article
                      key={product.id}
                      className="product-card"
                    >
                      <div className="product-image-wrap">
                        {product.demo_image_url ? (
                          <img
                            src={product.demo_image_url}
                            alt={product.name}
                            className="product-image"
                          />
                        ) : (
                          <div className="product-placeholder">
                            X
                          </div>
                        )}

                        {available <= 0 && (
                          <div className="soldout-label">
                            Hết hàng
                          </div>
                        )}
                      </div>

                      <div className="product-content">
                        <h2>
                          {product.name}
                        </h2>

                        {product.description && (
                          <p className="product-description">
                            {product.description}
                          </p>
                        )}

                        <div className="product-price">
                          {formatPrice(product.price)}
                        </div>

                        <div className="product-meta">
                          <span>
                            🔑 {available} KEY
                          </span>

                          <span>
                            ⏱ {formatDuration(
                              product.duration_days
                            )}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="buy-button"
                          disabled={available <= 0}
                          onClick={() =>
                            handleBuyClick(product)
                          }
                        >
                          {available > 0
                            ? "XEM TẤT CẢ →"
                            : "HẾT HÀNG"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="categories-section">
            <div className="pink-section-title">
              <div className="section-title-icon">
                🛒
              </div>

              <div>
                <strong>
                  DANH MỤC SẢN PHẨM
                </strong>

                <small>
                  Chọn sản phẩm bạn muốn mua
                </small>
              </div>
            </div>

            {categories.length === 0 ? (
              <div className="empty-card">
                <div className="empty-icon">
                  📦
                </div>

                <h2>
                  Chưa có danh mục
                </h2>

                <p>
                  Hiện chưa có sản phẩm nào
                  được mở bán.
                </p>
              </div>
            ) : (
              <div className="categories-grid">
                {categories.map((category) => {
                  const available =
                    categoryStock[
                      Number(category.id)
                    ] || 0;

                  const productCount =
                    products.filter(
                      (product) =>
                        Number(product.category_id) ===
                        Number(category.id)
                    ).length;

                  return (
                    <button
                      type="button"
                      key={category.id}
                      className="category-card"
                      onClick={() =>
                        handleCategoryClick(category)
                      }
                    >
                      <div className="category-image-wrap">
                        {category.demo_image_url ? (
                          <img
                            src={
                              category.demo_image_url
                            }
                            alt={
                              category.name
                            }
                            className="category-image"
                          />
                        ) : (
                          <div className="category-placeholder">
                            XENOVA
                          </div>
                        )}
                      </div>

                      <div className="category-content">
                        <h2>
                          {category.name}
                        </h2>

                        <div className="category-info">
                          <span>
                            {productCount} sản phẩm
                          </span>

                          <strong>
                            {available} KEY
                          </strong>
                        </div>
                      </div>

                      <div className="category-footer">
                        XEM TẤT CẢ →
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      <div className="mobile-bottom-bar">
        <button
          type="button"
          onClick={goDeposit}
        >
          <span>💳</span>
          <small>Số dư</small>
          <strong>{formatPrice(wallet)}</strong>
        </button>

        <button
          type="button"
          className="bottom-main-button"
          onClick={() => router.push("/shop")}
        >
          🛒
        </button>

        <button
          type="button"
          onClick={() =>
            user
              ? router.push("/dashboard")
              : router.push("/login")
          }
        >
          <span>♙</span>
          <small>
            {user ? "Tài khoản" : "Đăng nhập"}
          </small>
        </button>
      </div>

      {buyModal && (
        <div
          className="modal-overlay"
          onClick={() =>
            !buying && setBuyModal(null)
          }
        >
          <div
            className="buy-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-icon">
              🛒
            </div>

            <h2>
              Xác nhận mua KEY
            </h2>

            <p>
              Bạn có chắc muốn mua:
            </p>

            <strong className="modal-product-name">
              {buyModal.name}
            </strong>

            <div className="modal-summary">
              <div>
                <span>Giá</span>

                <strong>
                  {formatPrice(
                    buyModal.price
                  )}
                </strong>
              </div>

              <div>
                <span>Thời hạn</span>

                <strong>
                  {formatDuration(
                    buyModal.duration_days
                  )}
                </strong>
              </div>

              <div>
                <span>Số dư sau mua</span>

                <strong>
                  {formatPrice(
                    Number(wallet) -
                      Number(
                        buyModal.price
                      )
                  )}
                </strong>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-button"
                disabled={buying}
                onClick={() =>
                  setBuyModal(null)
                }
              >
                HỦY
              </button>

              <button
                type="button"
                className="confirm-button"
                disabled={buying}
                onClick={confirmBuy}
              >
                {buying ? (
                  <>
                    <span className="spinner" />
                    ĐANG MUA...
                  </>
                ) : (
                  "XÁC NHẬN MUA"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {successModal && (
        <div className="modal-overlay">
          <div className="success-modal">
            <div className="success-icon">
              ✓
            </div>

            <h2>
              Mua KEY thành công
            </h2>

            <p>
              KEY của bạn:
            </p>

            <div className="key-box">
              {successModal.key ? (
                <code>
                  {successModal.key}
                </code>
              ) : (
                <span>
                  Không nhận được KEY.
                  Vui lòng kiểm tra mục KEY
                  của bạn.
                </span>
              )}
            </div>

            {successModal.key && (
              <button
                type="button"
                className="copy-button"
                onClick={copyKey}
              >
                📋 SAO CHÉP KEY
              </button>
            )}

            <div className="success-actions">
              <button
                type="button"
                className="keys-button"
                onClick={() =>
                  router.push("/keys")
                }
              >
                KEY CỦA TÔI
              </button>

              <button
                type="button"
                className="close-button"
                onClick={closeSuccessModal}
              >
                ĐÓNG
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-spinner" />

      <span>
        Đang tải cửa hàng...
      </span>
    </div>
  );
}
