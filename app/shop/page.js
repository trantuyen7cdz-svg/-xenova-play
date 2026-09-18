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

    return () => subscription.unsubscribe();
  }, []);

  async function loadShop() {
    setLoading(true);
    setError("");

    try {
      const [sessionResult, catalogResult, stockResult] =
        await Promise.all([
          supabase.auth.getSession(),
          fetch("/api/shop/catalog", { cache: "no-store" }),
          fetch("/api/shop/stock", { cache: "no-store" }),
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
      setError(err?.message || "Không thể tải cửa hàng.");
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
        console.error("WALLET LOAD ERROR:", walletError);
        return;
      }

      setWallet(Number(data?.balance || 0));
    } catch (err) {
      console.error("WALLET ERROR:", err);
    }
  }

  const categoryStock = useMemo(() => {
    const result = {};

    for (const product of products) {
      const categoryId = Number(product.category_id);

      if (!categoryId) continue;

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

  const visibleProducts = useMemo(() => {
    if (!selectedCategory) return [];

    return products.filter(
      (product) =>
        Number(product.category_id) ===
        Number(selectedCategory.id)
    );
  }, [products, selectedCategory]);

  function formatPrice(price) {
    return (
      new Intl.NumberFormat("vi-VN").format(
        Number(price || 0)
      ) + "đ"
    );
  }

  function formatDuration(days) {
    const value = Number(days || 0);

    if (value === 1) return "1 ngày";
    if (value === 7) return "7 ngày";
    if (value === 30) return "1 tháng";

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
      setMessage("Sản phẩm này hiện đã hết KEY.");
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    setBuyModal(product);
  }

  async function confirmBuy() {
    if (!buyModal || buying) return;

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
          productId: Number(product.id),
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

    if (!key) return;

    try {
      await navigator.clipboard.writeText(key);
      setMessage("Đã sao chép KEY.");
    } catch {
      setMessage(
        "Không thể tự động sao chép KEY."
      );
    }
  }

  function goDeposit() {
    router.push("/deposit");
  }

  return (
    <main className="xenova-shop">
      <div className="petals" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, index) => (
          <span
            key={index}
            className={`petal petal-${index + 1}`}
          >
            🌸
          </span>
        ))}
      </div>

      <div className="shop-shell">
        <header className="hero-header">
          <button
            className="mobile-menu-button"
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new Event("xenova-open-menu")
              )
            }
          >
            ☰
          </button>

          <div
            className="brand"
            onClick={() => router.push("/")}
          >
            <span>XENOVA</span>
            <strong>PLAY</strong>
          </div>

          <nav className="desktop-nav">
            <button
              className="nav-item active"
              onClick={() => router.push("/")}
            >
              <span>⌂</span>
              Trang chủ
            </button>

            <button
              className="nav-item"
              onClick={() => router.push("/shop")}
            >
              <span>🛒</span>
              Cửa hàng
            </button>

            <button
              className="nav-item"
              onClick={goDeposit}
            >
              <span>▣</span>
              Nạp tiền
            </button>

            <button
              className="nav-item"
              onClick={() => router.push("/keys")}
            >
              <span>🔑</span>
              KEY của tôi
            </button>

            <button
              className="nav-item"
              onClick={() => router.push("/orders")}
            >
              <span>📦</span>
              Đơn hàng
            </button>

            <button
              className="nav-item"
              onClick={() => router.push("/dashboard")}
            >
              <span>♙</span>
              Tài khoản
            </button>

            <button
              className="nav-item"
              onClick={() => router.push("/settings")}
            >
              <span>⚙</span>
              Cài đặt
            </button>
          </nav>

          <div className="header-right">
            <button
              className="header-theme"
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new Event("xenova-theme-toggle")
                )
              }
            >
              ☀
            </button>

            <button
              className="wallet-pill"
              type="button"
              onClick={goDeposit}
            >
              💳{" "}
              {user
                ? formatPrice(wallet)
                : "0đ"}
            </button>
          </div>
        </header>

        <section className="hero-banner">
          <div className="hero-copy">
            <span className="hero-tag">
              🔥 XENOVA PLAY SHOP
            </span>

            <h1>
              MUA KEY NGAY
              <br />
              NHẬN QUÀ LIỀN TAY
            </h1>

            <p>
              Nhanh chóng · Uy tín · Giá tốt
            </p>

            <button
              type="button"
              onClick={goDeposit}
            >
              💰 NẠP TIỀN
              <span>→</span>
            </button>
          </div>

          <div className="hero-art">
            <div className="hero-circle">
              ✨
            </div>
            <div className="hero-character">
              X
            </div>
            <div className="hero-sparkle">
              🌸
            </div>
          </div>

          <div className="hero-features">
            <div>
              <b>✓</b>
              KEY CHÍNH HÃNG
            </div>

            <div>
              <b>✓</b>
              GIAO TỰ ĐỘNG
            </div>

            <div>
              <b>✓</b>
              HỖ TRỢ 24/7
            </div>
          </div>
        </section>

        <div className="hero-dots">
          <i />
          <i />
          <i />
        </div>

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
            <div className="error-icon">!</div>

            <h2>
              Không thể tải cửa hàng
            </h2>

            <p>{error}</p>

            <button
              type="button"
              onClick={loadShop}
              className="retry-button"
            >
              THỬ LẠI
            </button>
          </div>
        ) : selectedCategory ? (
          <section className="products-view">
            <div className="products-view-head">
              <button
                type="button"
                onClick={handleBackToCategories}
                className="back-link"
              >
                ← Danh mục
              </button>

              <div>
                <span className="pink-kicker">
                  XENOVA STORE
                </span>

                <h1>
                  {selectedCategory.name}
                </h1>

                <p>
                  {visibleProducts.length} sản phẩm
                  {" · "}
                  {categoryStock[
                    Number(selectedCategory.id)
                  ] || 0}{" "}
                  KEY có sẵn
                </p>
              </div>
            </div>

            {visibleProducts.length === 0 ? (
              <EmptyCard />
            ) : (
              <div className="product-grid">
                {visibleProducts.map((product) => {
                  const available =
                    getProductStock(product.id);

                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      available={available}
                      formatPrice={formatPrice}
                      formatDuration={formatDuration}
                      onBuy={handleBuyClick}
                    />
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="store-layout">
            <aside className="sidebar">
              <div className="side-card category-card">
                <div className="side-title">
                  <span>▦</span>
                  <strong>Danh mục</strong>
                </div>

                <button
                  type="button"
                  className="category-all active"
                  onClick={() =>
                    setSelectedCategory(null)
                  }
                >
                  <span>🛍</span>
                  <b>Tất cả sản phẩm</b>
                  <strong>
                    {products.length}
                  </strong>
                </button>

                {categories.map((category) => {
                  const count =
                    products.filter(
                      (product) =>
                        Number(
                          product.category_id
                        ) === Number(category.id)
                    ).length;

                  return (
                    <button
                      type="button"
                      key={category.id}
                      className="side-category"
                      onClick={() =>
                        handleCategoryClick(category)
                      }
                    >
                      <span>◈</span>
                      <b>{category.name}</b>
                      <strong>{count}</strong>
                    </button>
                  );
                })}
              </div>

              <div className="vip-card">
                <div className="vip-icon">
                  ♛
                </div>

                <div>
                  <strong>THÀNH VIÊN VIP</strong>
                  <span>
                    Nhận thêm ưu đãi
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push("/dashboard")
                  }
                >
                  Xem ngay →
                </button>
              </div>

              <div className="side-card support-card">
                <h3>Hỗ trợ</h3>

                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      "https://zalo.me/84365717262",
                      "_blank"
                    )
                  }
                >
                  <span>💬</span>
                  <div>
                    <b>Chat Admin</b>
                    <small>Hỗ trợ 24/7</small>
                  </div>
                </button>

                <button type="button">
                  <span>✈</span>
                  <div>
                    <b>Nhóm cộng đồng</b>
                    <small>Cập nhật nhanh nhất</small>
                  </div>
                </button>
              </div>
            </aside>

            <div className="products-area">
              <div className="section-title-row">
                <div>
                  <span className="pink-kicker">
                    XENOVA STORE
                  </span>

                  <h2>
                    🔥 Sản phẩm nổi bật
                  </h2>
                </div>

                {categories.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      handleCategoryClick(
                        categories[0]
                      )
                    }
                    className="view-all"
                  >
                    Xem tất cả →
                  </button>
                )}
              </div>

              {products.length === 0 ? (
                <EmptyCard />
              ) : (
                <div className="product-grid">
                  {products.slice(0, 8).map((product) => {
                    const available =
                      getProductStock(product.id);

                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        available={available}
                        formatPrice={formatPrice}
                        formatDuration={formatDuration}
                        onBuy={handleBuyClick}
                      />
                    );
                  })}
                </div>
              )}

              <div className="benefit-bar">
                <div>
                  <span>⚡</span>
                  <div>
                    <b>Giao dịch siêu nhanh</b>
                    <small>
                      Chỉ vài giây là có KEY
                    </small>
                  </div>
                </div>

                <div>
                  <span>♢</span>
                  <div>
                    <b>Bảo mật tuyệt đối</b>
                    <small>
                      An toàn thông tin
                    </small>
                  </div>
                </div>

                <div>
                  <span>♧</span>
                  <div>
                    <b>Hỗ trợ 24/7</b>
                    <small>
                      Luôn bên bạn
                    </small>
                  </div>
                </div>

                <div>
                  <span>🎁</span>
                  <div>
                    <b>Nhiều ưu đãi</b>
                    <small>
                      Dành riêng cho thành viên
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="mobile-bottom">
        <button onClick={() => router.push("/")}>
          <span>⌂</span>
          Trang chủ
        </button>

        <button onClick={() => router.push("/shop")}>
          <span>🛒</span>
          Cửa hàng
        </button>

        <button onClick={goDeposit}>
          <span>💰</span>
          Nạp tiền
        </button>

        <button onClick={() => router.push("/keys")}>
          <span>🔑</span>
          KEY
        </button>

        <button
          onClick={() =>
            window.dispatchEvent(
              new Event("xenova-open-menu")
            )
          }
        >
          <span>☰</span>
          Menu
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
            <div className="modal-icon">🛒</div>

            <h2>Xác nhận mua KEY</h2>

            <p>Bạn có chắc muốn mua:</p>

            <strong className="modal-product-name">
              {buyModal.name}
            </strong>

            <div className="modal-summary">
              <div>
                <span>Giá</span>
                <strong>
                  {formatPrice(buyModal.price)}
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
                      Number(buyModal.price)
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
                {buying
                  ? "ĐANG MUA..."
                  : "XÁC NHẬN MUA"}
              </button>
            </div>
          </div>
        </div>
      )}

      {successModal && (
        <div className="modal-overlay">
          <div className="success-modal">
            <div className="success-icon">✓</div>

            <h2>Mua KEY thành công</h2>

            <p>KEY của bạn:</p>

            <div className="key-box">
              {successModal.key ? (
                <code>{successModal.key}</code>
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
                onClick={() => {
                  setSuccessModal(null);
                  setMessage("");
                }}
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

function ProductCard({
  product,
  available,
  formatPrice,
  formatDuration,
  onBuy,
}) {
  return (
    <article className="product-card">
      <div className="product-image">
        {product.demo_image_url ? (
          <img
            src={product.demo_image_url}
            alt={product.name}
          />
        ) : (
          <div className="image-placeholder">
            🔑
          </div>
        )}

        <span
          className={
            available > 0
              ? "stock-tag"
              : "stock-tag sold"
          }
        >
          {available > 0
            ? `${available} KEY`
            : "HẾT KEY"}
        </span>
      </div>

      <div className="product-body">
        <h3>{product.name}</h3>

        {product.description && (
          <p>{product.description}</p>
        )}

        <div className="product-tags">
          <span>
            {available > 0 ? "Hot" : "Hết hàng"}
          </span>
          <span>Tự động</span>
        </div>

        <div className="product-bottom">
          <div>
            <small>
              {formatDuration(
                product.duration_days
              )}
            </small>

            <strong>
              {formatPrice(product.price)}
            </strong>
          </div>

          <button
            type="button"
            disabled={available <= 0}
            onClick={() => onBuy(product)}
          >
            {available > 0
              ? "Mua ngay →"
              : "Hết KEY"}
          </button>
        </div>
      </div>
    </article>
  );
}

function EmptyCard() {
  return (
    <div className="empty-card">
      <div>📦</div>
      <h2>Chưa có sản phẩm</h2>
      <p>
        Danh mục này hiện chưa có sản phẩm
        đang bán.
      </p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <span>Đang tải cửa hàng...</span>
    </div>
  );
}
