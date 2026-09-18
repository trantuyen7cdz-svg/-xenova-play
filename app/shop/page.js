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
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        await loadWallet(currentUser);
      } else {
        setWallet(0);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadShop() {
    try {
      setLoading(true);
      setError("");

      const [sessionResult, catalogResponse, stockResponse] =
        await Promise.all([
          supabase.auth.getSession(),
          fetch("/api/shop/catalog", {
            cache: "no-store",
          }),
          fetch("/api/shop/stock", {
            cache: "no-store",
          }),
        ]);

      const currentUser = sessionResult?.data?.session?.user || null;
      setUser(currentUser);

      if (!catalogResponse.ok) {
        throw new Error("Không thể tải danh sách sản phẩm.");
      }

      if (!stockResponse.ok) {
        throw new Error("Không thể tải kho KEY.");
      }

      const catalogData = await catalogResponse.json();
      const stockData = await stockResponse.json();

      setCategories(Array.isArray(catalogData?.categories) ? catalogData.categories : []);
      setProducts(Array.isArray(catalogData?.products) ? catalogData.products : []);

      setStock(
        stockData?.stock && typeof stockData.stock === "object"
          ? stockData.stock
          : {}
      );

      if (currentUser) {
        await loadWallet(currentUser);
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "Có lỗi xảy ra khi tải cửa hàng.");
    } finally {
      setLoading(false);
    }
  }

  async function loadWallet(currentUser) {
    try {
      if (!currentUser?.id) {
        setWallet(0);
        return;
      }

      const { data, error: walletError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (walletError) {
        console.error(walletError);
        return;
      }

      setWallet(Number(data?.balance || 0));
    } catch (err) {
      console.error(err);
    }
  }

  const visibleProducts = useMemo(() => {
    if (!selectedCategory) {
      return products;
    }

    return products.filter(
      (product) =>
        String(product.category_id) === String(selectedCategory.id)
    );
  }, [products, selectedCategory]);

  const featuredProducts = useMemo(() => {
    return products.slice(0, 8);
  }, [products]);

  const categoryStock = useMemo(() => {
    const result = {};

    for (const category of categories) {
      result[category.id] = products
        .filter(
          (product) =>
            String(product.category_id) === String(category.id)
        )
        .reduce(
          (total, product) => total + getProductStock(product.id),
          0
        );
    }

    return result;
  }, [categories, products, stock]);

  function formatPrice(value) {
    return `${new Intl.NumberFormat("vi-VN").format(
      Number(value || 0)
    )}đ`;
  }

  function formatDuration(days) {
    const value = Number(days || 0);

    if (value === 1) return "1 ngày";
    if (value === 7) return "7 ngày";
    if (value === 30) return "1 tháng";

    return `${value} ngày`;
  }

  function getProductStock(productId) {
    const item = stock?.[productId];

    if (typeof item === "number") {
      return Math.max(0, item);
    }

    return Math.max(0, Number(item?.available || 0));
  }

  function handleCategoryClick(category) {
    setSelectedCategory(category);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleBackToCategories() {
    setSelectedCategory(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleBuyClick(product) {
    const available = getProductStock(product.id);

    if (available <= 0) {
      setMessage("Sản phẩm hiện đã hết hàng.");
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    setMessage("");
    setBuyModal(product);
  }

  async function confirmBuy() {
    if (!buyModal || buying) return;

    if (!user) {
      router.push("/login");
      return;
    }

    const product = buyModal;
    const available = getProductStock(product.id);

    if (available <= 0) {
      setBuyModal(null);
      setMessage("Sản phẩm đã hết hàng.");
      return;
    }

    const price = Number(product.price || 0);

    if (Number(wallet) < price) {
      setBuyModal(null);
      setMessage(
        `Số dư ví không đủ. Bạn cần ${formatPrice(
          price
        )} nhưng hiện chỉ có ${formatPrice(wallet)}.`
      );
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
          product_id: Number(product.id),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Không thể thực hiện giao dịch."
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
        product,
        key,
      });

      await loadShop();
      await loadWallet(user);
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message || "Giao dịch thất bại, vui lòng thử lại."
      );

      setBuyModal(null);
    } finally {
      setBuying(false);
    }
  }

  async function copyKey() {
    const key = successModal?.key;

    if (!key) return;

    try {
      await navigator.clipboard.writeText(key);
      setMessage("Đã sao chép KEY.");
    } catch {
      setMessage("Không thể sao chép tự động.");
    }
  }

  function closeSuccessModal() {
    setSuccessModal(null);
  }

  function goDeposit() {
    router.push("/deposit");
  }

  function go(path) {
    router.push(path);
  }

  return (
    <>
      <main className="xenova-shop">
        {/* HEADER */}
        <header className="topbar">
          <div className="topbar-inner">
            <button
              className="brand"
              onClick={() => {
                setSelectedCategory(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <div className="brand-logo">X</div>

              <div className="brand-text">
                <strong>XENOVA</strong>
                <span>PLAY STORE</span>
              </div>
            </button>

            <nav className="desktop-nav">
              <button
                className={!selectedCategory ? "active" : ""}
                onClick={handleBackToCategories}
              >
                Trang chủ
              </button>

              <button onClick={() => go("/orders")}>
                Đơn hàng
              </button>

              <button onClick={() => go("/keys")}>
                KEY của tôi
              </button>

              <button onClick={() => go("/dashboard")}>
                Tài khoản
              </button>
            </nav>

            <div className="top-actions">
              <button className="wallet-pill" onClick={goDeposit}>
                <span className="wallet-icon">₫</span>

                <span className="wallet-info">
                  <small>Số dư</small>
                  <strong>{formatPrice(wallet)}</strong>
                </span>

                <span className="wallet-plus">+</span>
              </button>

              <button
                className="login-button"
                onClick={() =>
                  user ? go("/dashboard") : router.push("/login")
                }
              >
                {user ? "Tài khoản" : "Đăng nhập"}
              </button>
            </div>
          </div>
        </header>

        <div className="page-shell">
          {/* HERO */}
          {!selectedCategory && (
            <section className="hero">
              <div className="hero-content">
                <div className="hero-badge">
                  <span></span>
                  XENOVA PLAY STORE
                </div>

                <h1>
                  MUA KEY
                  <br />
                  <em>NHANH CHÓNG</em>
                </h1>

                <p>
                  Kho KEY tự động, giao KEY ngay sau khi thanh toán.
                  Hỗ trợ Android, iPhone và PC.
                </p>

                <div className="hero-buttons">
                  <button
                    className="hero-primary"
                    onClick={() =>
                      document
                        .getElementById("store")
                        ?.scrollIntoView({
                          behavior: "smooth",
                        })
                    }
                  >
                    XEM SẢN PHẨM
                    <span>→</span>
                  </button>

                  <button
                    className="hero-secondary"
                    onClick={goDeposit}
                  >
                    NẠP TIỀN
                  </button>
                </div>

                <div className="hero-stats">
                  <div>
                    <strong>{products.length}+</strong>
                    <span>Sản phẩm</span>
                  </div>

                  <div>
                    <strong>{categories.length}</strong>
                    <span>Danh mục</span>
                  </div>

                  <div>
                    <strong>24/7</strong>
                    <span>Tự động</span>
                  </div>
                </div>
              </div>

              <div className="hero-art">
                <div className="hero-circle circle-one"></div>
                <div className="hero-circle circle-two"></div>

                <div className="floating-card card-main">
                  <div className="mini-icon">X</div>

                  <div>
                    <small>XENOVA KEY</small>
                    <strong>ACTIVE</strong>
                  </div>

                  <span className="online-dot"></span>
                </div>

                <div className="floating-card card-small one">
                  <span>⚡</span>
                  <div>
                    <small>Giao KEY</small>
                    <strong>Ngay lập tức</strong>
                  </div>
                </div>

                <div className="floating-card card-small two">
                  <span>✓</span>
                  <div>
                    <small>Kho hàng</small>
                    <strong>Ổn định</strong>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* NOTICE */}
          {message && (
            <div className="notice">
              <span className="notice-icon">!</span>

              <span>{message}</span>

              <button onClick={() => setMessage("")}>×</button>
            </div>
          )}

          {error && (
            <div className="error-box">
              <strong>Có lỗi xảy ra</strong>
              <span>{error}</span>

              <button onClick={loadShop}>Thử lại</button>
            </div>
          )}

          {/* MAIN STORE */}
          <section id="store" className="store-layout">
            {/* SIDEBAR */}
            <aside className="sidebar">
              <div className="side-block">
                <div className="side-title">
                  <span className="side-title-icon">▦</span>
                  DANH MỤC
                </div>

                <button
                  className={`category-menu ${
                    !selectedCategory ? "selected" : ""
                  }`}
                  onClick={handleBackToCategories}
                >
                  <span className="category-left">
                    <span className="category-icon all">✦</span>
                    <span>Tất cả sản phẩm</span>
                  </span>

                  <span className="category-count">
                    {products.length}
                  </span>
                </button>

                {categories.map((category) => (
                  <button
                    key={category.id}
                    className={`category-menu ${
                      selectedCategory?.id === category.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() => handleCategoryClick(category)}
                  >
                    <span className="category-left">
                      <span className="category-icon">
                        {String(category.name || "")
                          .toLowerCase()
                          .includes("android")
                          ? "A"
                          : String(category.name || "")
                              .toLowerCase()
                              .includes("iphone") ||
                            String(category.name || "")
                              .toLowerCase()
                              .includes("ios")
                          ? ""
                          : String(category.name || "")
                              .toLowerCase()
                              .includes("pc")
                          ? "▣"
                          : "◆"}
                      </span>

                      <span>{category.name}</span>
                    </span>

                    <span className="category-count">
                      {categoryStock[category.id] || 0}
                    </span>
                  </button>
                ))}
              </div>

              <div className="side-promo">
                <div className="promo-glow"></div>

                <div className="promo-icon">⚡</div>

                <strong>KEY TỰ ĐỘNG</strong>

                <p>
                  Mua hàng và nhận KEY ngay lập tức sau khi thanh toán.
                </p>

                <button onClick={goDeposit}>
                  NẠP TIỀN →
                </button>
              </div>

              <div className="side-support">
                <div className="support-avatar">?</div>

                <div>
                  <strong>Cần hỗ trợ?</strong>
                  <span>Liên hệ Admin XENOVA</span>
                </div>

                <button
                  onClick={() =>
                    window.open(
                      "https://zalo.me/84365717262",
                      "_blank"
                    )
                  }
                  aria-label="Liên hệ Admin"
                >
                  →
                </button>
              </div>
            </aside>

            {/* PRODUCTS */}
            <div className="products-area">
              {selectedCategory ? (
                <>
                  <div className="products-heading">
                    <div>
                      <button
                        className="back-link"
                        onClick={handleBackToCategories}
                      >
                        ← Tất cả sản phẩm
                      </button>

                      <div className="heading-row">
                        <h2>{selectedCategory.name}</h2>

                        <span className="heading-pill">
                          {visibleProducts.length} sản phẩm
                        </span>
                      </div>

                      <p>
                        Các sản phẩm đang có trong danh mục này.
                      </p>
                    </div>
                  </div>

                  {loading ? (
                    <ProductSkeleton />
                  ) : visibleProducts.length === 0 ? (
                    <EmptyProducts />
                  ) : (
                    <div className="product-grid">
                      {visibleProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          stock={getProductStock(product.id)}
                          onBuy={handleBuyClick}
                          formatPrice={formatPrice}
                          formatDuration={formatDuration}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="products-heading">
                    <div>
                      <span className="section-label">
                        XENOVA STORE
                      </span>

                      <div className="heading-row">
                        <h2>Sản phẩm nổi bật</h2>

                        <span className="heading-pill">
                          {products.length} sản phẩm
                        </span>
                      </div>

                      <p>
                        Chọn sản phẩm phù hợp và nhận KEY ngay sau
                        khi mua.
                      </p>
                    </div>

                    {products.length > 8 && (
                      <button
                        className="view-all"
                        onClick={() => {
                          const firstCategory = categories[0];

                          if (firstCategory) {
                            handleCategoryClick(firstCategory);
                          }
                        }}
                      >
                        XEM TẤT CẢ →
                      </button>
                    )}
                  </div>

                  {loading ? (
                    <ProductSkeleton />
                  ) : featuredProducts.length === 0 ? (
                    <EmptyProducts />
                  ) : (
                    <div className="product-grid">
                      {featuredProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          stock={getProductStock(product.id)}
                          onBuy={handleBuyClick}
                          formatPrice={formatPrice}
                          formatDuration={formatDuration}
                        />
                      ))}
                    </div>
                  )}

                  {/* BENEFITS */}
                  <div className="benefits">
                    <div className="benefit">
                      <div className="benefit-icon">⚡</div>

                      <div>
                        <strong>Giao KEY tự động</strong>
                        <span>Nhận KEY ngay sau khi mua</span>
                      </div>
                    </div>

                    <div className="benefit">
                      <div className="benefit-icon">🔒</div>

                      <div>
                        <strong>Thanh toán an toàn</strong>
                        <span>Hệ thống xử lý tự động</span>
                      </div>
                    </div>

                    <div className="benefit">
                      <div className="benefit-icon">♟</div>

                      <div>
                        <strong>Hỗ trợ 24/7</strong>
                        <span>Admin hỗ trợ khi cần</span>
                      </div>
                    </div>
                  </div>

                  {/* QUICK ACTIONS */}
                  <div className="quick-section">
                    <div className="quick-card">
                      <div className="quick-icon deposit">
                        ₫
                      </div>

                      <div>
                        <strong>Nạp tiền vào ví</strong>
                        <span>
                          Nạp tiền để mua KEY nhanh hơn
                        </span>
                      </div>

                      <button onClick={goDeposit}>→</button>
                    </div>

                    <div className="quick-card">
                      <div className="quick-icon keys">KEY</div>

                      <div>
                        <strong>KEY của tôi</strong>
                        <span>
                          Xem lại các KEY đã mua
                        </span>
                      </div>

                      <button onClick={() => go("/keys")}>→</button>
                    </div>

                    <div className="quick-card">
                      <div className="quick-icon orders">
                        #
                      </div>

                      <div>
                        <strong>Đơn hàng</strong>
                        <span>
                          Kiểm tra lịch sử giao dịch
                        </span>
                      </div>

                      <button onClick={() => go("/orders")}>→</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* FOOTER */}
          <footer className="footer">
            <div>
              <strong>XENOVA PLAY</strong>
              <span>Kho KEY tự động</span>
            </div>

            <div className="footer-links">
              <button onClick={() => go("/dashboard")}>
                Tài khoản
              </button>

              <button onClick={() => go("/orders")}>
                Đơn hàng
              </button>

              <button onClick={() => go("/settings")}>
                Cài đặt
              </button>
            </div>

            <span className="copyright">
              © {new Date().getFullYear()} XENOVA PLAY
            </span>
          </footer>
        </div>

        {/* MOBILE NAV */}
        <div className="mobile-nav">
          <button
            className={!selectedCategory ? "active" : ""}
            onClick={handleBackToCategories}
          >
            <span>⌂</span>
            <small>Trang chủ</small>
          </button>

          <button onClick={goDeposit}>
            <span>₫</span>
            <small>Nạp tiền</small>
          </button>

          <button onClick={() => go("/keys")}>
            <span>KEY</span>
            <small>KEY của tôi</small>
          </button>

          <button onClick={() => go("/orders")}>
            <span>☰</span>
            <small>Đơn hàng</small>
          </button>

          <button onClick={() => go("/dashboard")}>
            <span>●</span>
            <small>Tài khoản</small>
          </button>
        </div>
      </main>

      {/* BUY MODAL */}
      {buyModal && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !buying) {
              setBuyModal(null);
            }
          }}
        >
          <div className="modal-card buy-modal">
            <button
              className="modal-close"
              onClick={() => !buying && setBuyModal(null)}
            >
              ×
            </button>

            <div className="modal-icon buy">
              🛒
            </div>

            <span className="modal-label">
              XÁC NHẬN GIAO DỊCH
            </span>

            <h3>{buyModal.name}</h3>

            <div className="purchase-info">
              <div>
                <span>Thời hạn</span>

                <strong>
                  {formatDuration(
                    buyModal.duration_days ??
                      buyModal.duration ??
                      buyModal.days
                  )}
                </strong>
              </div>

              <div>
                <span>Giá sản phẩm</span>

                <strong className="price">
                  {formatPrice(buyModal.price)}
                </strong>
              </div>
            </div>

            <div className="balance-check">
              <div>
                <span>Số dư hiện tại</span>
                <strong>{formatPrice(wallet)}</strong>
              </div>

              <div>
                <span>Sau khi mua</span>

                <strong>
                  {formatPrice(
                    Math.max(
                      0,
                      Number(wallet) -
                        Number(buyModal.price || 0)
                    )
                  )}
                </strong>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="cancel-button"
                disabled={buying}
                onClick={() => setBuyModal(null)}
              >
                HỦY
              </button>

              <button
                className="confirm-button"
                disabled={buying}
                onClick={confirmBuy}
              >
                {buying ? "ĐANG XỬ LÝ..." : "XÁC NHẬN MUA"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {successModal && (
        <div className="modal-overlay">
          <div className="modal-card success-modal">
            <button
              className="modal-close"
              onClick={closeSuccessModal}
            >
              ×
            </button>

            <div className="success-check">✓</div>

            <span className="modal-label success-label">
              GIAO DỊCH THÀNH CÔNG
            </span>

            <h3>Đã mua KEY thành công!</h3>

            <p>
              KEY của bạn đã được cấp. Hãy lưu lại KEY để sử dụng.
            </p>

            <div className="key-box">
              <span>KEY CỦA BẠN</span>

              <strong>{successModal.key || "—"}</strong>
            </div>

            <div className="success-actions">
              <button
                className="copy-button"
                onClick={copyKey}
                disabled={!successModal.key}
              >
                📋 SAO CHÉP KEY
              </button>

              <button
                className="keys-button"
                onClick={() => go("/keys")}
              >
                XEM KEY CỦA TÔI
              </button>
            </div>

            <button
              className="done-button"
              onClick={closeSuccessModal}
            >
              ĐÓNG
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        :root {
          --x-primary: #ff285c;
          --x-primary-dark: #e8174d;
          --x-primary-soft: #fff0f4;
          --x-bg: #f8f8fb;
          --x-card: #ffffff;
          --x-text: #17171b;
          --x-muted: #777985;
          --x-border: #ececf1;
          --x-shadow: 0 18px 50px rgba(25, 25, 35, 0.08);
          --x-radius: 20px;
        }

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: var(--x-bg);
          color: var(--x-text);
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        button {
          font: inherit;
        }

        .xenova-shop {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 85% 5%,
              rgba(255, 40, 92, 0.07),
              transparent 28%
            ),
            var(--x-bg);
          padding-bottom: 40px;
        }

        /* HEADER */

        .topbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.94);
          border-bottom: 1px solid rgba(235, 235, 240, 0.9);
          backdrop-filter: blur(18px);
        }

        .topbar-inner {
          width: min(1380px, calc(100% - 40px));
          min-height: 76px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 34px;
        }

        .brand {
          border: 0;
          background: transparent;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 11px;
          color: var(--x-text);
          text-align: left;
          flex-shrink: 0;
        }

        .brand-logo {
          width: 42px;
          height: 42px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          color: white;
          font-size: 21px;
          font-weight: 950;
          font-style: italic;
          background:
            linear-gradient(135deg, #ff1750, #ff5278);
          box-shadow:
            0 8px 22px rgba(255, 40, 92, 0.25);
        }

        .brand-text {
          display: flex;
          flex-direction: column;
          line-height: 1;
        }

        .brand-text strong {
          font-size: 18px;
          font-weight: 950;
          letter-spacing: -0.6px;
        }

        .brand-text span {
          margin-top: 5px;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 2px;
          color: #a1a1a9;
        }

        .desktop-nav {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
        }

        .desktop-nav button {
          border: 0;
          background: transparent;
          color: #777881;
          padding: 10px 13px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          transition: 0.2s;
        }

        .desktop-nav button:hover,
        .desktop-nav button.active {
          color: var(--x-primary);
          background: var(--x-primary-soft);
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .wallet-pill {
          border: 1px solid #ececf0;
          background: #fff;
          min-height: 48px;
          padding: 5px 8px 5px 7px;
          border-radius: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: 0.2s;
        }

        .wallet-pill:hover {
          border-color: rgba(255, 40, 92, 0.25);
          transform: translateY(-1px);
        }

        .wallet-icon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: var(--x-primary);
          background: var(--x-primary-soft);
          font-weight: 950;
        }

        .wallet-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          line-height: 1.1;
        }

        .wallet-info small {
          font-size: 9px;
          color: #9a9ba3;
          font-weight: 700;
        }

        .wallet-info strong {
          margin-top: 3px;
          font-size: 12px;
        }

        .wallet-plus {
          width: 23px;
          height: 23px;
          display: grid;
          place-items: center;
          color: white;
          background: var(--x-primary);
          border-radius: 7px;
          font-weight: 900;
        }

        .login-button {
          height: 44px;
          padding: 0 17px;
          border: 0;
          border-radius: 12px;
          background: var(--x-primary);
          color: #fff;
          font-size: 12px;
          font-weight: 850;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(255, 40, 92, 0.18);
        }

        .login-button:hover {
          background: var(--x-primary-dark);
        }

        /* PAGE */

        .page-shell {
          width: min(1380px, calc(100% - 40px));
          margin: 0 auto;
        }

        /* HERO */

        .hero {
          min-height: 370px;
          margin: 26px 0 30px;
          padding: 48px 58px;
          position: relative;
          overflow: hidden;
          border-radius: 28px;
          background:
            linear-gradient(
              115deg,
              #15151b 0%,
              #24242c 52%,
              #16161c 100%
            );
          box-shadow: 0 25px 70px rgba(25, 25, 30, 0.14);
          color: white;
          display: flex;
          align-items: center;
        }

        .hero::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(
              circle at 75% 50%,
              rgba(255, 40, 92, 0.3),
              transparent 25%
            ),
            linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.025)
            );
        }

        .hero-content {
          position: relative;
          z-index: 3;
          max-width: 600px;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 11px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.055);
          color: #f6a8ba;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.6px;
        }

        .hero-badge span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ff3c69;
          box-shadow: 0 0 12px #ff3c69;
        }

        .hero h1 {
          margin: 19px 0 13px;
          font-size: clamp(38px, 5vw, 67px);
          line-height: 0.92;
          letter-spacing: -3px;
          font-weight: 950;
        }

        .hero h1 em {
          color: #ff416c;
          font-style: normal;
        }

        .hero p {
          max-width: 520px;
          margin: 0;
          color: #a8a8b1;
          line-height: 1.7;
          font-size: 13px;
        }

        .hero-buttons {
          display: flex;
          gap: 10px;
          margin-top: 25px;
        }

        .hero-primary,
        .hero-secondary {
          height: 45px;
          border-radius: 11px;
          padding: 0 18px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.6px;
          transition: 0.2s;
        }

        .hero-primary {
          border: 0;
          color: white;
          background: var(--x-primary);
          box-shadow: 0 10px 25px rgba(255, 40, 92, 0.25);
        }

        .hero-primary span {
          margin-left: 10px;
          font-size: 15px;
        }

        .hero-secondary {
          border: 1px solid rgba(255, 255, 255, 0.13);
          background: rgba(255, 255, 255, 0.055);
          color: #fff;
        }

        .hero-primary:hover,
        .hero-secondary:hover {
          transform: translateY(-2px);
        }

        .hero-stats {
          margin-top: 27px;
          display: flex;
          gap: 30px;
        }

        .hero-stats div {
          display: flex;
          flex-direction: column;
        }

        .hero-stats strong {
          font-size: 17px;
        }

        .hero-stats span {
          margin-top: 3px;
          color: #777780;
          font-size: 9px;
          font-weight: 700;
        }

        .hero-art {
          position: absolute;
          right: 7%;
          width: 370px;
          height: 310px;
        }

        .hero-circle {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(255, 55, 100, 0.17);
        }

        .circle-one {
          width: 310px;
          height: 310px;
          right: 10px;
          top: 0;
        }

        .circle-two {
          width: 210px;
          height: 210px;
          right: 60px;
          top: 50px;
          background: rgba(255, 40, 92, 0.045);
        }

        .floating-card {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 11px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(32, 32, 40, 0.88);
          backdrop-filter: blur(15px);
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.24);
        }

        .card-main {
          width: 225px;
          padding: 15px;
          border-radius: 16px;
          top: 93px;
          right: 75px;
        }

        .mini-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: #fff;
          background: linear-gradient(
            135deg,
            #ff1c55,
            #ff587b
          );
          font-weight: 950;
          font-style: italic;
        }

        .card-main div:nth-child(2) {
          display: flex;
          flex-direction: column;
        }

        .card-main small,
        .card-small small {
          color: #7e7e88;
          font-size: 8px;
          font-weight: 800;
        }

        .card-main strong,
        .card-small strong {
          margin-top: 4px;
          color: #fff;
          font-size: 11px;
        }

        .online-dot {
          margin-left: auto;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #42dd89;
          box-shadow: 0 0 12px #42dd89;
        }

        .card-small {
          min-width: 155px;
          padding: 12px;
          border-radius: 13px;
        }

        .card-small > span {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          background: rgba(255, 40, 92, 0.1);
          color: #ff4b72;
        }

        .card-small div {
          display: flex;
          flex-direction: column;
        }

        .card-small.one {
          left: 5px;
          top: 63px;
        }

        .card-small.two {
          right: 10px;
          bottom: 42px;
        }

        /* NOTICE */

        .notice,
        .error-box {
          margin: 0 0 22px;
          min-height: 52px;
          padding: 12px 15px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          gap: 11px;
          border: 1px solid #f2d8df;
          background: #fff7f9;
          color: #8d334b;
          font-size: 12px;
          font-weight: 650;
        }

        .notice-icon {
          width: 25px;
          height: 25px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #fff;
          background: var(--x-primary);
          font-weight: 900;
        }

        .notice button {
          margin-left: auto;
          border: 0;
          background: transparent;
          color: #9c6472;
          cursor: pointer;
          font-size: 20px;
        }

        .error-box {
          background: #fff5f5;
          border-color: #ffd7d7;
          color: #a63434;
          flex-wrap: wrap;
        }

        .error-box span {
          flex: 1;
        }

        .error-box button {
          border: 0;
          background: #ffeded;
          color: #b53232;
          border-radius: 8px;
          padding: 8px 12px;
          font-weight: 800;
          cursor: pointer;
        }

        /* STORE */

        .store-layout {
          display: grid;
          grid-template-columns: 250px minmax(0, 1fr);
          gap: 25px;
          align-items: start;
        }

        .sidebar {
          position: sticky;
          top: 98px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .side-block {
          padding: 17px;
          border: 1px solid var(--x-border);
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 8px 28px rgba(25, 25, 35, 0.035);
        }

        .side-title {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 5px 13px;
          color: #a1a1aa;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.3px;
        }

        .side-title-icon {
          color: var(--x-primary);
          font-size: 13px;
        }

        .category-menu {
          width: 100%;
          min-height: 46px;
          border: 0;
          background: transparent;
          border-radius: 11px;
          padding: 6px 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          color: #6c6d75;
          font-size: 11px;
          font-weight: 750;
          transition: 0.18s;
        }

        .category-menu + .category-menu {
          margin-top: 3px;
        }

        .category-menu:hover {
          background: #faf4f6;
          color: var(--x-primary);
        }

        .category-menu.selected {
          color: var(--x-primary);
          background: var(--x-primary-soft);
        }

        .category-left {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .category-left > span:last-child {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .category-icon {
          width: 31px;
          height: 31px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 9px;
          background: #f4f4f6;
          color: #777881;
          font-size: 10px;
          font-weight: 900;
        }

        .category-icon.all,
        .category-menu.selected .category-icon {
          color: var(--x-primary);
          background: #ffe4eb;
        }

        .category-count {
          min-width: 24px;
          text-align: right;
          color: #a2a3aa;
          font-size: 9px;
          font-weight: 800;
        }

        .side-promo {
          position: relative;
          overflow: hidden;
          padding: 21px;
          border-radius: 18px;
          color: #fff;
          background: linear-gradient(
            145deg,
            #ff275b,
            #e9154d
          );
          box-shadow: 0 15px 35px rgba(255, 40, 92, 0.18);
        }

        .promo-glow {
          position: absolute;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          right: -45px;
          top: -55px;
          background: rgba(255, 255, 255, 0.12);
        }

        .promo-icon {
          position: relative;
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.15);
          font-size: 17px;
        }

        .side-promo strong {
          display: block;
          position: relative;
          margin-top: 15px;
          font-size: 13px;
        }

        .side-promo p {
          position: relative;
          margin: 8px 0 15px;
          color: rgba(255, 255, 255, 0.75);
          font-size: 10px;
          line-height: 1.55;
        }

        .side-promo button {
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          border-radius: 9px;
          padding: 9px 11px;
          font-size: 9px;
          font-weight: 900;
          cursor: pointer;
        }

        .side-support {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px;
          border: 1px solid var(--x-border);
          background: #fff;
          border-radius: 15px;
        }

        .support-avatar {
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 10px;
          color: var(--x-primary);
          background: var(--x-primary-soft);
          font-weight: 950;
        }

        .side-support div:nth-child(2) {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .side-support strong {
          font-size: 10px;
        }

        .side-support span {
          margin-top: 3px;
          color: #999aa1;
          font-size: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .side-support button {
          width: 28px;
          height: 28px;
          border: 0;
          border-radius: 8px;
          color: var(--x-primary);
          background: var(--x-primary-soft);
          cursor: pointer;
          font-weight: 900;
        }

        /* PRODUCT AREA */

        .products-area {
          min-width: 0;
        }

        .products-heading {
          margin-bottom: 18px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 15px;
        }

        .section-label {
          color: var(--x-primary);
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 1.8px;
        }

        .heading-row {
          margin-top: 5px;
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
        }

        .heading-row h2 {
          margin: 0;
          font-size: 25px;
          letter-spacing: -0.8px;
          font-weight: 950;
        }

        .heading-pill {
          padding: 5px 8px;
          border-radius: 7px;
          color: #a0a1a8;
          background: #efeff2;
          font-size: 8px;
          font-weight: 850;
        }

        .products-heading p {
          margin: 6px 0 0;
          color: #999aa2;
          font-size: 11px;
        }

        .back-link {
          border: 0;
          padding: 0;
          margin-bottom: 9px;
          background: transparent;
          color: var(--x-primary);
          cursor: pointer;
          font-size: 10px;
          font-weight: 850;
        }

        .view-all {
          border: 0;
          background: transparent;
          color: var(--x-primary);
          cursor: pointer;
          font-size: 9px;
          font-weight: 900;
          white-space: nowrap;
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
        }

        .product-card {
          position: relative;
          overflow: hidden;
          border: 1px solid var(--x-border);
          border-radius: 17px;
          background: #fff;
          transition:
            transform 0.22s ease,
            box-shadow 0.22s ease,
            border-color 0.22s ease;
        }

        .product-card:hover {
          transform: translateY(-4px);
          border-color: #f3d7df;
          box-shadow: 0 16px 35px rgba(30, 30, 40, 0.08);
        }

        .product-image {
          height: 135px;
          position: relative;
          display: grid;
          place-items: center;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 50% 30%,
              rgba(255, 40, 92, 0.16),
              transparent 50%
            ),
            linear-gradient(145deg, #1b1b21, #2b2b34);
        }

        .product-image::before {
          content: "";
          position: absolute;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .product-image img {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-placeholder {
          position: relative;
          z-index: 2;
          width: 57px;
          height: 57px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          color: #fff;
          background: linear-gradient(
            135deg,
            #ff1d56,
            #ff597e
          );
          font-size: 22px;
          font-weight: 950;
          font-style: italic;
          box-shadow: 0 12px 30px rgba(255, 40, 92, 0.3);
        }

        .stock-badge {
          position: absolute;
          z-index: 3;
          top: 9px;
          right: 9px;
          padding: 5px 7px;
          border-radius: 7px;
          color: #fff;
          background: rgba(20, 20, 25, 0.72);
          backdrop-filter: blur(8px);
          font-size: 8px;
          font-weight: 850;
        }

        .stock-badge.empty {
          background: rgba(150, 30, 45, 0.8);
        }

        .product-content {
          padding: 14px;
        }

        .product-category {
          color: var(--x-primary);
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.9px;
        }

        .product-name {
          min-height: 34px;
          margin: 5px 0 9px;
          color: #1d1d23;
          font-size: 12px;
          line-height: 1.4;
          font-weight: 900;
        }

        .product-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 5px;
          margin-bottom: 11px;
        }

        .product-duration {
          color: #9a9ba3;
          font-size: 8px;
          font-weight: 700;
        }

        .product-price {
          color: var(--x-primary);
          font-size: 15px;
          font-weight: 950;
        }

        .buy-button {
          width: 100%;
          height: 36px;
          border: 0;
          border-radius: 9px;
          color: #fff;
          background: var(--x-primary);
          cursor: pointer;
          font-size: 9px;
          font-weight: 900;
          transition: 0.2s;
        }

        .buy-button:hover:not(:disabled) {
          background: var(--x-primary-dark);
          box-shadow: 0 7px 18px rgba(255, 40, 92, 0.2);
        }

        .buy-button:disabled {
          color: #9b9ca2;
          background: #eeeeF1;
          cursor: not-allowed;
        }

        /* BENEFITS */

        .benefits {
          margin-top: 22px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .benefit {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px;
          border: 1px solid var(--x-border);
          border-radius: 14px;
          background: #fff;
        }

        .benefit-icon {
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 10px;
          color: var(--x-primary);
          background: var(--x-primary-soft);
          font-size: 14px;
        }

        .benefit div:last-child {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .benefit strong {
          font-size: 10px;
        }

        .benefit span {
          margin-top: 3px;
          color: #999aa2;
          font-size: 8px;
        }

        /* QUICK */

        .quick-section {
          margin-top: 15px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .quick-card {
          min-width: 0;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid var(--x-border);
          border-radius: 14px;
          background: #fff;
        }

        .quick-icon {
          width: 37px;
          height: 37px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 950;
        }

        .quick-icon.deposit {
          color: #15a86a;
          background: #eafaf3;
        }

        .quick-icon.keys {
          color: var(--x-primary);
          background: var(--x-primary-soft);
          font-size: 7px;
        }

        .quick-icon.orders {
          color: #7764d8;
          background: #f0edff;
        }

        .quick-card > div:nth-child(2) {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .quick-card strong {
          font-size: 10px;
        }

        .quick-card span {
          margin-top: 3px;
          color: #9a9ba2;
          font-size: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .quick-card button {
          width: 27px;
          height: 27px;
          border: 0;
          border-radius: 8px;
          background: #f4f4f6;
          color: #777881;
          cursor: pointer;
        }

        /* SKELETON */

        .skeleton-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
        }

        .skeleton-card {
          height: 270px;
          border-radius: 17px;
          background:
            linear-gradient(
              90deg,
              #eeeeF1 25%,
              #f7f7f8 50%,
              #eeeeF1 75%
            );
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }

        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }

          100% {
            background-position: -200% 0;
          }
        }

        .empty-products {
          padding: 60px 20px;
          border: 1px dashed #dddde3;
          border-radius: 18px;
          text-align: center;
          background: #fff;
        }

        .empty-products-icon {
          width: 55px;
          height: 55px;
          margin: 0 auto 12px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          color: #9b9ca4;
          background: #f1f1f3;
          font-size: 20px;
        }

        .empty-products strong {
          display: block;
          font-size: 13px;
        }

        .empty-products span {
          display: block;
          margin-top: 5px;
          color: #999aa2;
          font-size: 10px;
        }

        /* FOOTER */

        .footer {
          margin-top: 35px;
          padding: 22px 0 65px;
          border-top: 1px solid var(--x-border);
          display: flex;
          align-items: center;
          gap: 25px;
          color: #999aa2;
        }

        .footer > div:first-child {
          display: flex;
          flex-direction: column;
        }

        .footer strong {
          color: #303037;
          font-size: 12px;
        }

        .footer span {
          margin-top: 3px;
          font-size: 8px;
        }

        .footer-links {
          display: flex;
          gap: 5px;
          margin-left: auto;
        }

        .footer-links button {
          border: 0;
          background: transparent;
          color: #8d8e96;
          padding: 6px;
          cursor: pointer;
          font-size: 9px;
          font-weight: 700;
        }

        .copyright {
          margin-left: 10px;
        }

        /* MOBILE NAV */

        .mobile-nav {
          display: none;
        }

        /* MODALS */

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          padding: 20px;
          display: grid;
          place-items: center;
          background: rgba(14, 14, 19, 0.68);
          backdrop-filter: blur(8px);
        }

        .modal-card {
          position: relative;
          width: min(430px, 100%);
          padding: 30px;
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.25);
          animation: modalIn 0.2s ease-out;
        }

        @keyframes modalIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-close {
          position: absolute;
          top: 12px;
          right: 13px;
          width: 31px;
          height: 31px;
          border: 0;
          border-radius: 9px;
          background: #f4f4f6;
          color: #777881;
          cursor: pointer;
          font-size: 19px;
        }

        .modal-icon {
          width: 52px;
          height: 52px;
          margin-bottom: 15px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          font-size: 21px;
        }

        .modal-icon.buy {
          color: var(--x-primary);
          background: var(--x-primary-soft);
        }

        .modal-label {
          color: #a0a1a8;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 1.3px;
        }

        .modal-card h3 {
          margin: 7px 0 18px;
          color: #18181e;
          font-size: 21px;
          letter-spacing: -0.5px;
        }

        .purchase-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .purchase-info > div,
        .balance-check {
          padding: 12px;
          border-radius: 12px;
          background: #f7f7f9;
        }

        .purchase-info span,
        .balance-check span {
          display: block;
          color: #999aa2;
          font-size: 8px;
          font-weight: 700;
        }

        .purchase-info strong,
        .balance-check strong {
          display: block;
          margin-top: 5px;
          font-size: 11px;
        }

        .purchase-info .price {
          color: var(--x-primary);
          font-size: 14px;
        }

        .balance-check {
          margin-top: 10px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          border: 1px solid #f0f0f3;
          background: #fff;
        }

        .balance-check div:last-child {
          text-align: right;
        }

        .balance-check div:last-child strong {
          color: #15a86a;
        }

        .modal-actions {
          margin-top: 17px;
          display: grid;
          grid-template-columns: 1fr 1.4fr;
          gap: 9px;
        }

        .cancel-button,
        .confirm-button,
        .copy-button,
        .keys-button,
        .done-button {
          height: 43px;
          border: 0;
          border-radius: 10px;
          cursor: pointer;
          font-size: 9px;
          font-weight: 900;
        }

        .cancel-button {
          background: #f0f0f2;
          color: #777881;
        }

        .confirm-button {
          color: #fff;
          background: var(--x-primary);
        }

        .confirm-button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .success-modal {
          text-align: center;
        }

        .success-check {
          width: 62px;
          height: 62px;
          margin: 0 auto 14px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #fff;
          background: #20b875;
          box-shadow: 0 10px 25px rgba(32, 184, 117, 0.2);
          font-size: 26px;
          font-weight: 950;
        }

        .success-label {
          color: #20a86e;
        }

        .success-modal h3 {
          margin-bottom: 8px;
        }

        .success-modal > p {
          margin: 0 0 17px;
          color: #96979f;
          font-size: 10px;
          line-height: 1.6;
        }

        .key-box {
          padding: 17px;
          border: 1px dashed #f0a5b6;
          border-radius: 13px;
          background: #fff7f9;
          text-align: left;
        }

        .key-box span {
          display: block;
          color: #a4a5ac;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .key-box strong {
          display: block;
          margin-top: 8px;
          word-break: break-all;
          color: #24242b;
          font-size: 12px;
          line-height: 1.5;
        }

        .success-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 12px;
        }

        .copy-button {
          color: #fff;
          background: var(--x-primary);
        }

        .copy-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .keys-button {
          color: #55565e;
          background: #eeeeF1;
        }

        .done-button {
          width: 100%;
          margin-top: 8px;
          color: #8b8c94;
          background: transparent;
        }

        /* RESPONSIVE */

        @media (max-width: 1200px) {
          .product-grid,
          .skeleton-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .hero-art {
            right: 1%;
            transform: scale(0.9);
          }
        }

        @media (max-width: 1000px) {
          .desktop-nav {
            display: none;
          }

          .hero {
            padding: 42px;
          }

          .hero-art {
            opacity: 0.5;
            right: -65px;
          }

          .store-layout {
            grid-template-columns: 210px minmax(0, 1fr);
          }

          .product-grid,
          .skeleton-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 760px) {
          .xenova-shop {
            padding-bottom: 78px;
          }

          .topbar-inner {
            width: calc(100% - 24px);
            min-height: 65px;
            gap: 8px;
          }

          .brand-text strong {
            font-size: 15px;
          }

          .brand-text span {
            font-size: 7px;
          }

          .wallet-pill {
            margin-left: auto;
            min-height: 42px;
          }

          .wallet-info {
            display: none;
          }

          .wallet-plus {
            display: none;
          }

          .login-button {
            height: 39px;
            padding: 0 11px;
            font-size: 9px;
          }

          .page-shell {
            width: calc(100% - 24px);
          }

          .hero {
            min-height: 430px;
            margin-top: 13px;
            padding: 30px 23px;
            border-radius: 22px;
            align-items: flex-start;
          }

          .hero h1 {
            font-size: 48px;
            letter-spacing: -2.5px;
          }

          .hero-art {
            opacity: 0.32;
            right: -125px;
            bottom: -30px;
            top: auto;
            transform: scale(0.8);
          }

          .hero-stats {
            gap: 17px;
          }

          .store-layout {
            display: block;
          }

          .sidebar {
            position: static;
            margin-bottom: 23px;
          }

          .side-block {
            overflow-x: auto;
            display: flex;
            gap: 7px;
            padding: 10px;
          }

          .side-title {
            display: none;
          }

          .category-menu {
            width: auto;
            min-width: max-content;
            min-height: 42px;
            padding: 5px 9px;
          }

          .category-count {
            display: none;
          }

          .category-icon {
            width: 29px;
            height: 29px;
          }

          .side-promo,
          .side-support {
            display: none;
          }

          .products-heading {
            align-items: flex-start;
          }

          .heading-row h2 {
            font-size: 22px;
          }

          .product-grid,
          .skeleton-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .product-image {
            height: 115px;
          }

          .product-content {
            padding: 11px;
          }

          .product-name {
            font-size: 11px;
          }

          .product-price {
            font-size: 13px;
          }

          .benefits,
          .quick-section {
            grid-template-columns: 1fr;
          }

          .footer {
            display: none;
          }

          .mobile-nav {
            position: fixed;
            z-index: 500;
            left: 10px;
            right: 10px;
            bottom: 10px;
            height: 62px;
            padding: 5px;
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            border: 1px solid rgba(230, 230, 235, 0.9);
            border-radius: 17px;
            background: rgba(255, 255, 255, 0.96);
            box-shadow: 0 15px 45px rgba(30, 30, 40, 0.13);
            backdrop-filter: blur(18px);
          }

          .mobile-nav button {
            border: 0;
            background: transparent;
            color: #9899a1;
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            cursor: pointer;
          }

          .mobile-nav button.active {
            color: var(--x-primary);
            background: var(--x-primary-soft);
          }

          .mobile-nav span {
            font-size: 12px;
            font-weight: 900;
          }

          .mobile-nav small {
            font-size: 7px;
            font-weight: 750;
          }

          .modal-card {
            padding: 25px 20px;
          }
        }

        @media (max-width: 430px) {
          .brand-logo {
            width: 37px;
            height: 37px;
          }

          .brand-text strong {
            font-size: 13px;
          }

          .brand-text span {
            display: none;
          }

          .wallet-pill {
            border: 0;
            background: transparent;
            padding: 0;
          }

          .wallet-icon {
            width: 34px;
            height: 34px;
          }

          .login-button {
            padding: 0 9px;
          }

          .hero {
            min-height: 390px;
            padding: 26px 20px;
          }

          .hero h1 {
            font-size: 42px;
          }

          .hero p {
            font-size: 11px;
          }

          .hero-buttons {
            flex-direction: column;
            align-items: flex-start;
          }

          .hero-primary,
          .hero-secondary {
            width: 100%;
          }

          .product-image {
            height: 100px;
          }

          .stock-badge {
            top: 6px;
            right: 6px;
          }

          .product-content {
            padding: 9px;
          }

          .product-name {
            min-height: 31px;
            font-size: 10px;
          }

          .product-duration {
            font-size: 7px;
          }

          .product-price {
            font-size: 12px;
          }

          .buy-button {
            height: 33px;
            font-size: 8px;
          }

          .success-actions {
            grid-template-columns: 1fr;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </>
  );
}

function ProductCard({
  product,
  stock,
  onBuy,
  formatPrice,
  formatDuration,
}) {
  const duration =
    product.duration_days ??
    product.duration ??
    product.days ??
    0;

  const image =
    product.image_url ||
    product.demo_image_url ||
    product.thumbnail ||
    product.image ||
    "";

  const categoryName =
    product.category_name ||
    product.category?.name ||
    product.category ||
    "XENOVA KEY";

  return (
    <article className="product-card">
      <div className="product-image">
        {image ? (
          <img
            src={image}
            alt={product.name || "XENOVA KEY"}
            loading="lazy"
          />
        ) : (
          <div className="product-placeholder">X</div>
        )}

        <span className={`stock-badge ${stock <= 0 ? "empty" : ""}`}>
          {stock > 0 ? `${stock} KEY` : "HẾT HÀNG"}
        </span>
      </div>

      <div className="product-content">
        <span className="product-category">
          {categoryName}
        </span>

        <div className="product-name">
          {product.name || "KEY XENOVA"}
        </div>

        <div className="product-meta">
          <span className="product-duration">
            ⏱ {formatDuration(duration)}
          </span>

          <strong className="product-price">
            {formatPrice(product.price)}
          </strong>
        </div>

        <button
          className="buy-button"
          disabled={stock <= 0}
          onClick={() => onBuy(product)}
        >
          {stock > 0 ? "MUA NGAY" : "HẾT HÀNG"}
        </button>
      </div>
    </article>
  );
}

function ProductSkeleton() {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          className="skeleton-card"
          key={index}
        />
      ))}
    </div>
  );
}

function EmptyProducts() {
  return (
    <div className="empty-products">
      <div className="empty-products-icon">
        ∅
      </div>

      <strong>Chưa có sản phẩm</strong>

      <span>
        Hiện tại chưa có sản phẩm nào trong danh mục này.
      </span>
    </div>
  );
}
