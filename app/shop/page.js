"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const NAV_ITEMS = [
  { label: "Trang chủ", icon: "⌂", path: "/" },
  { label: "Cửa hàng", icon: "🛒", path: "/shop" },
  { label: "Nạp tiền", icon: "▣", path: "/deposit" },
  { label: "KEY của tôi", icon: "▤", path: "/keys" },
  { label: "Đơn hàng", icon: "▧", path: "/orders" },
  { label: "Tài khoản", icon: "♙", path: "/account" },
  { label: "Cài đặt", icon: "⚙", path: "/settings" },
];

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getProductType(product) {
  const text = normalize(
    [
      product?.name,
      product?.title,
      product?.category,
      product?.type,
      product?.description,
    ].join(" ")
  );

  if (text.includes("steam")) return "Steam";
  if (text.includes("windows")) return "Windows";
  if (text.includes("office")) return "Office";
  if (text.includes("photoshop")) return "Adobe";
  if (text.includes("premiere")) return "Adobe";
  if (text.includes("game")) return "Game";

  return product?.category || product?.type || "Khác";
}

function formatPrice(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) return "0đ";

  return `${number.toLocaleString("vi-VN")}đ`;
}

function formatDuration(product) {
  const value =
    product?.duration ||
    product?.duration_days ||
    product?.days ||
    product?.validity ||
    "";

  if (!value) return "";

  if (typeof value === "number") {
    if (value === 1) return "1 ngày";
    return `${value} ngày`;
  }

  return String(value);
}

function getProductImage(product) {
  return (
    product?.image_url ||
    product?.image ||
    product?.thumbnail ||
    product?.icon_url ||
    product?.logo_url ||
    product?.img ||
    ""
  );
}

function SpriteImage({ product, className = "" }) {
  const src = getProductImage(product);

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={className}
        onError={(event) => {
          event.currentTarget.style.display = "none";
          const fallback = event.currentTarget.parentElement?.querySelector(
            ".image-fallback"
          );
          if (fallback) fallback.style.display = "flex";
        }}
      />
    );
  }

  return (
    <div className={`image-fallback ${className}`}>
      <span>KEY</span>
    </div>
  );
}

function Petals() {
  const petals = Array.from({ length: 26 });

  return (
    <div className="petals" aria-hidden="true">
      {petals.map((_, index) => (
        <span
          key={index}
          className={`petal petal-${index % 7}`}
          style={{
            left: `${(index * 37) % 100}%`,
            animationDelay: `${(index % 9) * 0.65}s`,
            animationDuration: `${6 + (index % 5)}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function ShopPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState({});
  const [wallet, setWallet] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("Tất cả sản phẩm");

  const [buyModal, setBuyModal] = useState(null);
  const [successModal, setSuccessModal] = useState(null);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState("");

  async function loadWallet(currentUser) {
    if (!currentUser?.id) {
      setWallet(0);
      return;
    }

    try {
      const { data, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (walletError) {
        setWallet(0);
        return;
      }

      setWallet(
        Number(
          data?.balance ??
            data?.amount ??
            data?.money ??
            data?.wallet ??
            0
        )
      );
    } catch {
      setWallet(0);
    }
  }

  async function loadShop() {
    setLoading(true);
    setError("");

    try {
      const [catalogResponse, stockResponse] = await Promise.all([
        fetch("/api/shop/catalog", {
          cache: "no-store",
        }),
        fetch("/api/shop/stock", {
          cache: "no-store",
        }),
      ]);

      const catalogData = await catalogResponse.json().catch(() => ({}));
      const stockData = await stockResponse.json().catch(() => ({}));

      if (!catalogResponse.ok) {
        throw new Error(
          catalogData?.error ||
            catalogData?.message ||
            "Không thể tải danh sách sản phẩm."
        );
      }

      const catalogProducts =
        catalogData?.products ||
        catalogData?.data?.products ||
        catalogData?.data ||
        [];

      const catalogCategories =
        catalogData?.categories ||
        catalogData?.data?.categories ||
        [];

      setProducts(Array.isArray(catalogProducts) ? catalogProducts : []);
      setCategories(Array.isArray(catalogCategories) ? catalogCategories : []);

      setStock(
        stockData?.stock ||
          stockData?.data?.stock ||
          stockData?.data ||
          {}
      );
    } catch (err) {
      setError(err?.message || "Không thể tải cửa hàng.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setUser(session?.user || null);

      await Promise.all([loadShop(), loadWallet(session?.user || null)]);
    }

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      setUser(session?.user || null);
      await loadWallet(session?.user || null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const categoryCounts = useMemo(() => {
    const result = {};

    for (const product of products) {
      const type = getProductType(product);
      result[type] = (result[type] || 0) + 1;
    }

    return result;
  }, [products]);

  const allCategories = useMemo(() => {
    const defaultCategories = [
      {
        name: "Steam",
        icon: "●",
      },
      {
        name: "Windows",
        icon: "⊞",
      },
      {
        name: "Office",
        icon: "▣",
      },
      {
        name: "Adobe",
        icon: "A",
      },
      {
        name: "Game",
        icon: "⌘",
      },
      {
        name: "Thẻ game",
        icon: "◉",
      },
    ];

    if (!categories.length) return defaultCategories;

    return categories.map((category) => {
      if (typeof category === "string") {
        return {
          name: category,
          icon: "●",
        };
      }

      return {
        name:
          category?.name ||
          category?.title ||
          category?.category ||
          "Khác",
        icon: category?.icon || "●",
      };
    });
  }, [categories]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "Tất cả sản phẩm") {
      return products;
    }

    return products.filter(
      (product) =>
        normalize(getProductType(product)) ===
        normalize(selectedCategory)
    );
  }, [products, selectedCategory]);

  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, 8);
  }, [filteredProducts]);

  function getStock(product) {
    const id = String(product?.id ?? "");

    if (Array.isArray(stock)) {
      const found = stock.find(
        (item) =>
          String(item?.product_id ?? item?.id ?? "") === id
      );

      return Number(
        found?.stock ??
          found?.quantity ??
          found?.available ??
          found?.count ??
          0
      );
    }

    if (stock && typeof stock === "object") {
      const item = stock[id];

      if (typeof item === "number") return item;

      if (item && typeof item === "object") {
        return Number(
          item?.stock ??
            item?.quantity ??
            item?.available ??
            item?.count ??
            0
        );
      }

      if (typeof item === "string") return Number(item);
    }

    return Number(
      product?.stock ??
        product?.stock_count ??
        product?.quantity ??
        0
    );
  }

  function openBuy(product) {
    if (!user) {
      router.push("/login");
      return;
    }

    setMessage("");
    setBuyModal(product);
  }

  async function confirmBuy() {
    if (!buyModal || buying) return;

    const product = buyModal;
    const price = Number(
      product?.price ??
        product?.sale_price ??
        product?.amount ??
        product?.cost ??
        0
    );

    const availableStock = getStock(product);

    if (availableStock <= 0) {
      setMessage("Sản phẩm hiện đã hết hàng.");
      return;
    }

    if (wallet < price) {
      setMessage(
        `Số dư ví không đủ. Bạn cần ${formatPrice(
          price - wallet
        )} nữa.`
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

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Không thể mua sản phẩm."
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
      await loadWallet(session.user);
    } catch (err) {
      setMessage(
        err?.message || "Có lỗi xảy ra khi mua sản phẩm."
      );
    } finally {
      setBuying(false);
    }
  }

  function navigate(path) {
    router.push(path);
  }

  return (
    <main className="xenova-page">
      <Petals />

      <header className="topbar">
        <div className="topbar-inner">
          <button
            className="mobile-menu"
            type="button"
            aria-label="Menu"
            onClick={() => {}}
          >
            ☰
          </button>

          <div
            className="brand"
            onClick={() => navigate("/")}
            role="button"
            tabIndex={0}
          >
            <div className="brand-main">XENOVA</div>
            <div className="brand-sub">PLAY</div>
          </div>

          <nav className="main-nav">
            {NAV_ITEMS.map((item, index) => (
              <button
                key={item.path}
                type="button"
                className={`nav-item ${
                  index === 1 ? "active" : ""
                }`}
                onClick={() => navigate(item.path)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="top-actions">
            <button
              className="theme-btn"
              type="button"
              aria-label="Đổi giao diện"
            >
              ☼
            </button>

            <button
              className="wallet-mini"
              type="button"
              onClick={() => navigate("/deposit")}
            >
              <span className="wallet-icon">▣</span>
              <span>{formatPrice(wallet)}</span>
            </button>

            <button
              className="avatar-btn"
              type="button"
              onClick={() =>
                user ? navigate("/account") : navigate("/login")
              }
            >
              {user
                ? (
                    user?.email?.[0] ||
                    user?.user_metadata?.full_name?.[0] ||
                    "U"
                  ).toUpperCase()
                : "U"}
            </button>

            <button
              className="drop-btn"
              type="button"
              onClick={() =>
                user ? navigate("/account") : navigate("/login")
              }
            >
             ⌄
            </button>
          </div>
        </div>
      </header>

      <section className="page-container">
        <section className="hero">
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />

          <div className="hero-left">
            <div className="hero-brand">
              XENOVA <span>PLAY</span>
            </div>

            <div className="hero-label">
              SHOP GAME - KEY GIÁ TỐT
            </div>

            <h1>
              MUA KEY NGAY
              <br />
              <strong>NHẬN QUÀ LIỀN TAY</strong>
            </h1>

            <p>
              Nhanh chóng&nbsp; - &nbsp;Uy tín&nbsp; - &nbsp;Giá tốt nhất
            </p>

            <button
              type="button"
              className="hero-button"
              onClick={() =>
                document
                  .getElementById("featured-products")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              MUA NGAY <span>→</span>
            </button>
          </div>

          <div className="hero-art">
            <div className="moon" />
            <div className="torii torii-back" />
            <div className="torii torii-front" />

            <div className="anime-character">
              <div className="hair hair-back" />
              <div className="hair hair-left" />
              <div className="hair hair-right" />
              <div className="face">
                <div className="eye eye-left" />
                <div className="eye eye-right" />
                <div className="mouth" />
              </div>
              <div className="body">
                <div className="ribbon" />
              </div>
              <div className="arm arm-left" />
              <div className="arm arm-right" />
            </div>

            <div className="hero-card">
              <div>
                <span>●</span>
                KEY CHÍNH HÃNG
              </div>
              <div>
                <span>●</span>
                GIAO TỰ ĐỘNG
              </div>
              <div>
                <span>●</span>
                HỖ TRỢ 24/7
              </div>
            </div>
          </div>
        </section>

        <div className="hero-dots">
          <span />
          <span className="active" />
          <span />
        </div>

        <section className="shop-layout">
          <aside className="sidebar">
            <div className="side-card category-card">
              <div className="side-title">
                <span className="side-title-icon">▦</span>
                <span>Danh mục</span>
              </div>

              <button
                type="button"
                className={`category-row ${
                  selectedCategory === "Tất cả sản phẩm"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setSelectedCategory("Tất cả sản phẩm")
                }
              >
                <span className="category-icon pink">▦</span>
                <span className="category-name">
                  Tất cả sản phẩm
                </span>
                <span className="category-count">
                  {products.length}
                </span>
              </button>

              {allCategories.map((category) => (
                <button
                  key={category.name}
                  type="button"
                  className={`category-row ${
                    normalize(selectedCategory) ===
                    normalize(category.name)
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedCategory(category.name)
                  }
                >
                  <span className="category-icon">
                    {category.icon}
                  </span>

                  <span className="category-name">
                    {category.name}
                  </span>

                  <span className="category-count">
                    {categoryCounts[category.name] || 0}
                  </span>
                </button>
              ))}
            </div>

            <div className="side-card vip-card">
              <div className="vip-crown">♛</div>

              <div className="vip-content">
                <h3>THÀNH VIÊN VIP</h3>
                <p>Nhận thêm ưu đãi</p>

                <button
                  type="button"
                  onClick={() =>
                    user
                      ? navigate("/account")
                      : navigate("/login")
                  }
                >
                  Nâng cấp ngay →
                </button>
              </div>
            </div>

            <div className="side-card support-card">
              <div className="side-title support-title">
                <span className="side-title-icon">♧</span>
                <span>Hỗ trợ</span>
              </div>

              <button
                type="button"
                className="support-row"
                onClick={() =>
                  window.open(
                    "https://zalo.me/84365717262",
                    "_blank"
                  )
                }
              >
                <span className="support-icon">●</span>
                <span>
                  <b>Chat Admin</b>
                  <small>Hỗ trợ 24/7</small>
                </span>
              </button>

              <button
                type="button"
                className="support-row"
                onClick={() =>
                  window.open(
                    "https://zalo.me/84365717262",
                    "_blank"
                  )
                }
              >
                <span className="support-icon">➤</span>
                <span>
                  <b>Nhóm Telegram</b>
                  <small>Cập nhật nhanh nhất</small>
                </span>
              </button>

              <button
                type="button"
                className="support-row"
                onClick={() =>
                  window.open(
                    "https://zalo.me/84365717262",
                    "_blank"
                  )
                }
              >
                <span className="support-icon">f</span>
                <span>
                  <b>Fanpage Facebook</b>
                  <small>Like để nhận ưu đãi</small>
                </span>
              </button>
            </div>
          </aside>

          <section
            className="products-section"
            id="featured-products"
          >
            <div className="section-heading">
              <div>
                <h2>
                  <span className="fire">♨</span>
                  Sản phẩm nổi bật
                </h2>
              </div>

              <button
                type="button"
                className="see-all"
                onClick={() =>
                  setSelectedCategory("Tất cả sản phẩm")
                }
              >
                Xem tất cả&nbsp; →
              </button>
            </div>

            {error ? (
              <div className="shop-error">
                <b>Không tải được cửa hàng</b>
                <span>{error}</span>
                <button
                  type="button"
                  onClick={loadShop}
                >
                  Thử lại
                </button>
              </div>
            ) : loading ? (
              <div className="product-grid">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    className="product-card skeleton-card"
                    key={index}
                  >
                    <div className="skeleton-image" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line short" />
                    <div className="skeleton-button" />
                  </div>
                ))}
              </div>
            ) : visibleProducts.length ? (
              <div className="product-grid">
                {visibleProducts.map((product, index) => {
                  const price = Number(
                    product?.price ??
                      product?.sale_price ??
                      product?.amount ??
                      product?.cost ??
                      0
                  );

                  const productStock = getStock(product);
                  const duration = formatDuration(product);

                  const hot =
                    index === 0 ||
                    index === 1 ||
                    index === 2 ||
                    index === 4 ||
                    index === 6;

                  const running =
                    index === 2 ||
                    index === 4 ||
                    index === 7;

                  return (
                    <article
                      className="product-card"
                      key={product?.id ?? index}
                    >
                      <div className="product-image">
                        <SpriteImage
                          product={product}
                          className="product-img"
                        />

                        <div className="image-fallback">
                          <span>
                            {String(
                              product?.name ||
                                product?.title ||
                                "KEY"
                            ).slice(0, 2)}
                          </span>
                        </div>
                      </div>

                      <div className="product-info">
                        <div className="product-name">
                          {product?.name ||
                            product?.title ||
                            "Sản phẩm XENOVA"}
                        </div>

                        <div className="product-tags">
                          <span
                            className={
                              hot ? "tag hot" : "tag new"
                            }
                          >
                            {running
                              ? "Bán chạy"
                              : hot
                              ? "Hot"
                              : "Mới"}
                          </span>

                          <span className="tag auto">
                            Tự động
                          </span>
                        </div>

                        <div className="product-bottom">
                          <div className="product-price">
                            {formatPrice(price)}
                          </div>

                          {duration && (
                            <div className="duration">
                              {duration}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          className="buy-button"
                          onClick={() => openBuy(product)}
                          disabled={productStock <= 0}
                        >
                          {productStock <= 0
                            ? "Hết hàng"
                            : "Mua ngay →"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-products">
                <div className="empty-icon">♡</div>
                <b>Chưa có sản phẩm</b>
                <span>
                  Danh mục này hiện chưa có sản phẩm.
                </span>
              </div>
            )}

            <div className="quick-features">
              <div className="feature-item">
                <span className="feature-icon">ϟ</span>
                <span>
                  <b>Giao dịch siêu nhanh</b>
                  <small>Chỉ vài giây là có KEY</small>
                </span>
              </div>

              <div className="feature-item">
                <span className="feature-icon">♢</span>
                <span>
                  <b>Bảo mật tuyệt đối</b>
                  <small>An toàn thông tin</small>
                </span>
              </div>

              <div className="feature-item">
                <span className="feature-icon">♧</span>
                <span>
                  <b>Hỗ trợ 24/7</b>
                  <small>Luôn luôn bên bạn</small>
                </span>
              </div>

              <div className="feature-item">
                <span className="feature-icon">▦</span>
                <span>
                  <b>Nhiều ưu đãi</b>
                  <small>Dành riêng cho thành viên</small>
                </span>
              </div>
            </div>
          </section>
        </section>
      </section>

      <button
        type="button"
        className="floating-chat"
        onClick={() =>
          window.open(
            "https://zalo.me/84365717262",
            "_blank"
          )
        }
      >
        <span className="chat-text">Chat Admin</span>
        <span className="chat-icon">●</span>
      </button>

      {buyModal && (
        <div
          className="modal-overlay"
          onMouseDown={() => {
            if (!buying) setBuyModal(null);
          }}
        >
          <div
            className="buy-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() =>
                !buying && setBuyModal(null)
              }
            >
              ×
            </button>

            <div className="modal-icon">🛒</div>

            <h3>Xác nhận mua hàng</h3>

            <p className="modal-product">
              {buyModal?.name ||
                buyModal?.title ||
                "Sản phẩm XENOVA"}
            </p>

            <div className="modal-price">
              {formatPrice(
                buyModal?.price ??
                  buyModal?.sale_price ??
                  buyModal?.amount ??
                  buyModal?.cost ??
                  0
              )}
            </div>

            <div className="modal-wallet">
              Số dư ví:{" "}
              <b>{formatPrice(wallet)}</b>
            </div>

            {message && (
              <div className="modal-message">
                {message}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={() =>
                  !buying && setBuyModal(null)
                }
                disabled={buying}
              >
                Hủy
              </button>

              <button
                type="button"
                className="confirm-button"
                onClick={confirmBuy}
                disabled={buying}
              >
                {buying ? "Đang xử lý..." : "Xác nhận mua"}
              </button>
            </div>
          </div>
        </div>
      )}

      {successModal && (
        <div className="modal-overlay">
          <div className="success-modal">
            <div className="success-check">✓</div>

            <h3>Mua hàng thành công</h3>

            <p>
              KEY của bạn đã được giao thành công.
            </p>

            {successModal.key ? (
              <div className="key-box">
                <span>KEY</span>
                <strong>{successModal.key}</strong>
              </div>
            ) : (
              <div className="key-box">
                <span>THÔNG BÁO</span>
                <strong>
                  Kiểm tra mục "KEY của tôi"
                </strong>
              </div>
            )}

            <div className="success-actions">
              <button
                type="button"
                onClick={() => {
                  setSuccessModal(null);
                  navigate("/keys");
                }}
              >
                KEY của tôi
              </button>

              <button
                type="button"
                onClick={() => setSuccessModal(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background:
            radial-gradient(
              circle at 20% 80%,
              rgba(255, 121, 181, 0.08),
              transparent 28%
            ),
            #fff8fc;
          color: #172033;
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

        .xenova-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          background:
            linear-gradient(
              180deg,
              #ffffff 0,
              #fffafd 38%,
              #fff6fb 100%
            );
        }

        .topbar {
          height: 58px;
          background: rgba(255, 255, 255, 0.96);
          border-bottom: 1px solid #f0e9ef;
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(14px);
        }

        .topbar-inner {
          width: min(1220px, calc(100% - 34px));
          height: 100%;
          margin: auto;
          display: flex;
          align-items: center;
          gap: 22px;
        }

        .mobile-menu {
          display: none;
          border: 0;
          background: transparent;
          font-size: 20px;
          color: #303747;
          cursor: pointer;
        }

        .brand {
          width: 92px;
          min-width: 92px;
          line-height: 0.82;
          cursor: pointer;
          user-select: none;
        }

        .brand-main {
          font-size: 17px;
          font-weight: 900;
          letter-spacing: -0.7px;
          color: #172033;
        }

        .brand-sub {
          margin-left: 39px;
          margin-top: 3px;
          color: #ff2d83;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.3px;
        }

        .main-nav {
          display: flex;
          height: 100%;
          align-items: stretch;
          gap: 2px;
          flex: 1;
        }

        .nav-item {
          border: 0;
          background: transparent;
          color: #4b5567;
          padding: 0 13px;
          min-width: 68px;
          cursor: pointer;
          position: relative;
          font-size: 8.5px;
          font-weight: 600;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          transition: 0.2s;
        }

        .nav-item:hover {
          color: #ff2e83;
        }

        .nav-item.active {
          color: #ff2e83;
          background: #fff2f8;
        }

        .nav-item.active::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 16px;
          right: 16px;
          height: 2px;
          border-radius: 5px 5px 0 0;
          background: #ff2e83;
        }

        .nav-icon {
          font-size: 13px;
          line-height: 1;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .theme-btn,
        .drop-btn {
          border: 0;
          background: transparent;
          cursor: pointer;
          color: #525b6d;
          font-size: 16px;
        }

        .drop-btn {
          font-size: 12px;
          margin-left: -6px;
        }

        .wallet-mini {
          border: 1px solid #ffd3e5;
          background: #fff6fa;
          color: #f52d7e;
          border-radius: 8px;
          height: 30px;
          padding: 0 9px;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 9px;
          font-weight: 800;
          cursor: pointer;
        }

        .wallet-icon {
          font-size: 11px;
        }

        .avatar-btn {
          width: 27px;
          height: 27px;
          border: 0;
          border-radius: 50%;
          color: white;
          background: linear-gradient(
            135deg,
            #ff7aaf,
            #f52c7e
          );
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .page-container {
          width: min(1220px, calc(100% - 34px));
          margin: auto;
          position: relative;
          z-index: 2;
          padding-top: 14px;
          padding-bottom: 45px;
        }

        .hero {
          height: 145px;
          width: 100%;
          border-radius: 10px;
          overflow: hidden;
          position: relative;
          background:
            radial-gradient(
              ellipse at 70% 50%,
              rgba(255, 192, 227, 0.92),
              transparent 27%
            ),
            radial-gradient(
              ellipse at 45% 100%,
              #d93285,
              transparent 45%
            ),
            linear-gradient(
              110deg,
              #3d174e 0%,
              #b62775 47%,
              #ff8db9 100%
            );
          box-shadow: 0 8px 28px rgba(208, 53, 120, 0.18);
        }

        .hero::before {
          content: "";
          position: absolute;
          inset: 0;
          opacity: 0.28;
          background:
            radial-gradient(
              circle at 14% 72%,
              #fff 0 1px,
              transparent 2px
            ),
            radial-gradient(
              circle at 35% 23%,
              #fff 0 1px,
              transparent 2px
            ),
            radial-gradient(
              circle at 72% 17%,
              #fff 0 1px,
              transparent 2px
            );
          background-size: 42px 31px, 57px 43px, 71px 57px;
        }

        .hero::after {
          content: "";
          position: absolute;
          left: -3%;
          right: -3%;
          bottom: -30px;
          height: 80px;
          background:
            radial-gradient(
              ellipse at center,
              rgba(255, 221, 239, 0.95),
              transparent 66%
            );
          opacity: 0.5;
        }

        .hero-left {
          position: absolute;
          left: 31px;
          top: 17px;
          z-index: 7;
          color: white;
        }

        .hero-brand {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          font-weight: 900;
          margin-bottom: 5px;
        }

        .hero-brand span {
          color: #ff9ec8;
        }

        .hero-label {
          display: inline-block;
          margin-left: 8px;
          padding: 4px 9px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.94);
          color: #d82972;
          font-size: 7px;
          font-weight: 900;
        }

        .hero-left h1 {
          margin: 9px 0 4px;
          font-size: 25px;
          line-height: 0.98;
          font-weight: 950;
          letter-spacing: -1px;
          text-shadow:
            0 3px 0 rgba(161, 24, 87, 0.35),
            0 5px 16px rgba(88, 0, 49, 0.25);
        }

        .hero-left h1 strong {
          color: white;
        }

        .hero-left p {
          margin: 0 0 9px;
          font-size: 8px;
          opacity: 0.95;
        }

        .hero-button {
          height: 25px;
          border: 0;
          padding: 0 14px;
          border-radius: 20px;
          background: linear-gradient(
            90deg,
            #ff4a95,
            #ff297c
          );
          color: white;
          font-size: 8px;
          font-weight: 900;
          box-shadow: 0 5px 13px rgba(116, 5, 61, 0.25);
          cursor: pointer;
        }

        .hero-button span {
          font-size: 11px;
          margin-left: 3px;
        }

        .hero-art {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .hero-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(1px);
        }

        .hero-glow-one {
          width: 280px;
          height: 280px;
          right: 135px;
          top: -105px;
          background: rgba(255, 218, 238, 0.28);
        }

        .hero-glow-two {
          width: 150px;
          height: 150px;
          right: 330px;
          bottom: -105px;
          background: rgba(255, 227, 243, 0.3);
        }

        .moon {
          position: absolute;
          right: 255px;
          top: 16px;
          width: 69px;
          height: 69px;
          border-radius: 50%;
          background: rgba(255, 232, 243, 0.35);
          box-shadow: 0 0 35px rgba(255, 226, 240, 0.3);
        }

        .torii {
          position: absolute;
          bottom: 15px;
          right: 300px;
          width: 118px;
          height: 77px;
          opacity: 0.3;
        }

        .torii::before {
          content: "";
          position: absolute;
          left: 4px;
          right: 4px;
          top: 8px;
          height: 8px;
          border-radius: 4px;
          background: #4b1247;
          box-shadow: 0 12px 0 #4b1247;
        }

        .torii::after {
          content: "";
          position: absolute;
          left: 21px;
          width: 9px;
          height: 67px;
          background: #4b1247;
          box-shadow: 67px 0 0 #4b1247;
        }

        .torii-front {
          right: 225px;
          transform: scale(0.8);
          opacity: 0.2;
        }

        .anime-character {
          position: absolute;
          right: 150px;
          bottom: -15px;
          width: 170px;
          height: 151px;
          transform: rotate(-2deg);
        }

        .hair-back {
          position: absolute;
          width: 91px;
          height: 112px;
          left: 32px;
          top: 2px;
          border-radius: 48% 53% 47% 52%;
          background: linear-gradient(
            145deg,
            #5e154f,
            #e73b93 57%,
            #ff9dc8
          );
          box-shadow:
            18px 24px 0 -7px #7f1b5b,
            -16px 31px 0 -12px #8e205f;
        }

        .hair-left,
        .hair-right {
          position: absolute;
          z-index: 3;
          width: 39px;
          height: 74px;
          top: 39px;
          background: linear-gradient(
            180deg,
            #ff7db7,
            #c62778
          );
          border-radius: 80% 25% 70% 30%;
        }

        .hair-left {
          left: 19px;
          transform: rotate(12deg);
        }

        .hair-right {
          right: 25px;
          transform: scaleX(-1) rotate(12deg);
        }

        .face {
          position: absolute;
          z-index: 5;
          width: 67px;
          height: 75px;
          left: 53px;
          top: 28px;
          border-radius: 45% 48% 47% 48%;
          background: linear-gradient(
            135deg,
            #fff4f5,
            #ffd6e1
          );
          box-shadow:
            inset -4px -5px 0 rgba(235, 127, 154, 0.08);
        }

        .eye {
          position: absolute;
          width: 10px;
          height: 17px;
          top: 33px;
          border-radius: 50%;
          background: #68204f;
        }

        .eye::after {
          content: "";
          position: absolute;
          width: 4px;
          height: 7px;
          top: 2px;
          left: 2px;
          border-radius: 50%;
          background: white;
        }

        .eye-left {
          left: 17px;
        }

        .eye-right {
          right: 17px;
        }

        .mouth {
          position: absolute;
          left: 29px;
          top: 55px;
          width: 9px;
          height: 5px;
          border-bottom: 2px solid #a64664;
          border-radius: 50%;
        }

        .body {
          position: absolute;
          z-index: 2;
          left: 42px;
          bottom: 0;
          width: 86px;
          height: 65px;
          border-radius: 48% 48% 5% 5%;
          background: linear-gradient(
            135deg,
            #f5eff8,
            #5d1b56
          );
        }

        .ribbon {
          position: absolute;
          left: 33px;
          top: 15px;
          width: 20px;
          height: 20px;
          background: #ff4e94;
          transform: rotate(45deg);
        }

        .arm {
          position: absolute;
          z-index: 1;
          width: 54px;
          height: 16px;
          border-radius: 20px;
          background: #f8d9de;
          top: 79px;
        }

        .arm-left {
          left: 20px;
          transform: rotate(45deg);
        }

        .arm-right {
          right: 9px;
          transform: rotate(-35deg);
        }

        .hero-card {
          position: absolute;
          right: 17px;
          top: 42px;
          z-index: 10;
          width: 98px;
          padding: 8px 9px;
          border-radius: 8px;
          background: rgba(38, 12, 35, 0.68);
          border: 1px solid rgba(255, 255, 255, 0.18);
          transform: rotate(-3deg);
          box-shadow: 0 8px 17px rgba(67, 0, 40, 0.2);
        }

        .hero-card div {
          color: white;
          font-size: 6px;
          font-weight: 800;
          margin: 4px 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .hero-card span {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ff3f91;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 5px;
        }

        .hero-dots {
          height: 15px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 5px;
        }

        .hero-dots span {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #f2a4c4;
        }

        .hero-dots span.active {
          width: 6px;
          height: 6px;
          background: #ff3c88;
        }

        .shop-layout {
          display: grid;
          grid-template-columns: 128px minmax(0, 1fr);
          gap: 14px;
          align-items: start;
        }

        .sidebar {
          min-width: 0;
        }

        .side-card {
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid #f1e8ef;
          box-shadow: 0 4px 15px rgba(43, 30, 43, 0.05);
          border-radius: 8px;
          margin-bottom: 9px;
          overflow: hidden;
        }

        .category-card {
          padding: 9px 7px 8px;
        }

        .side-title {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 8px;
          font-weight: 900;
          color: #1d2737;
          padding: 0 3px 7px;
        }

        .side-title-icon {
          color: #ff3285;
          font-size: 13px;
        }

        .category-row {
          width: 100%;
          height: 25px;
          border: 0;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 6px;
          border-radius: 5px;
          padding: 0 5px;
          cursor: pointer;
          color: #465064;
          text-align: left;
          font-size: 7px;
          margin: 1px 0;
        }

        .category-row:hover {
          background: #fff4f9;
        }

        .category-row.selected {
          color: #e92677;
          background: #fff0f7;
        }

        .category-icon {
          width: 13px;
          text-align: center;
          font-size: 10px;
          color: #3f6fa8;
          font-weight: 900;
        }

        .category-icon.pink {
          color: #ff2f83;
        }

        .category-name {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .category-count {
          font-size: 6px;
          color: #687083;
        }

        .vip-card {
          min-height: 76px;
          position: relative;
          background:
            radial-gradient(
              circle at 20% 10%,
              rgba(255, 155, 205, 0.5),
              transparent 35%
            ),
            linear-gradient(
              145deg,
              #431d55,
              #b42b76
            );
          color: white;
          padding: 9px;
          display: flex;
          align-items: center;
        }

        .vip-crown {
          font-size: 39px;
          color: #ffcedf;
          line-height: 1;
          opacity: 0.9;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        }

        .vip-content {
          position: relative;
          z-index: 2;
          margin-left: -3px;
        }

        .vip-content h3 {
          margin: 0;
          font-size: 7px;
          font-weight: 950;
        }

        .vip-content p {
          margin: 3px 0 6px;
          font-size: 5.5px;
          opacity: 0.8;
        }

        .vip-content button {
          border: 0;
          background: #ff3c8a;
          color: white;
          border-radius: 10px;
          height: 17px;
          padding: 0 8px;
          font-size: 5.5px;
          font-weight: 800;
          cursor: pointer;
        }

        .support-card {
          padding: 9px 7px 6px;
        }

        .support-title {
          padding-bottom: 4px;
        }

        .support-row {
          border: 0;
          background: transparent;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 5px 2px;
          cursor: pointer;
          text-align: left;
        }

        .support-icon {
          flex: 0 0 17px;
          height: 17px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #edf2fa;
          color: #5173a3;
          font-size: 8px;
          font-weight: 900;
        }

        .support-row span:last-child {
          min-width: 0;
        }

        .support-row b {
          display: block;
          color: #364154;
          font-size: 6.5px;
          font-weight: 800;
        }

        .support-row small {
          display: block;
          margin-top: 1px;
          color: #9ba2af;
          font-size: 5px;
        }

        .products-section {
          min-width: 0;
        }

        .section-heading {
          height: 31px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .section-heading h2 {
          margin: 0;
          font-size: 14px;
          letter-spacing: -0.3px;
          color: #192336;
          font-weight: 900;
        }

        .fire {
          color: #ff397f;
          margin-right: 6px;
          font-size: 16px;
        }

        .see-all {
          border: 0;
          background: transparent;
          color: #ed347d;
          font-size: 7px;
          font-weight: 800;
          cursor: pointer;
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 7px;
        }

        .product-card {
          min-width: 0;
          border: 1px solid #eee8ed;
          background: white;
          border-radius: 7px;
          overflow: hidden;
          box-shadow: 0 3px 12px rgba(47, 30, 44, 0.045);
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease;
        }

        .product-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 9px 20px rgba(47, 30, 44, 0.1);
        }

        .product-image {
          position: relative;
          height: 91px;
          margin: 5px;
          border-radius: 5px;
          overflow: hidden;
          background:
            linear-gradient(
              135deg,
              #17253e,
              #486f9c
            );
        }

        .product-img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .image-fallback {
          width: 100%;
          height: 100%;
          display: none;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 25px;
          font-weight: 950;
          background:
            radial-gradient(
              circle at 50% 35%,
              rgba(255, 255, 255, 0.18),
              transparent 25%
            ),
            linear-gradient(
              135deg,
              #182b4d,
              #2c79bd
            );
        }

        .product-image > .image-fallback {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        .product-image .product-img {
          position: relative;
          z-index: 1;
        }

        .product-info {
          padding: 0 7px 7px;
        }

        .product-name {
          height: 15px;
          line-height: 15px;
          font-size: 7px;
          color: #283247;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .product-tags {
          display: flex;
          gap: 4px;
          height: 16px;
          align-items: center;
        }

        .tag {
          height: 12px;
          line-height: 12px;
          padding: 0 5px;
          border-radius: 6px;
          font-size: 5px;
          font-weight: 800;
        }

        .tag.hot {
          background: #fff0f2;
          color: #ff3d52;
        }

        .tag.new {
          background: #edf5ff;
          color: #3f7ed0;
        }

        .tag.auto {
          background: #f3f4f6;
          color: #89909d;
        }

        .product-bottom {
          min-height: 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .product-price {
          color: #ef2f77;
          font-size: 9px;
          font-weight: 950;
        }

        .duration {
          color: #a3a8b2;
          font-size: 5.5px;
        }

        .buy-button {
          border: 0;
          width: 100%;
          height: 22px;
          border-radius: 6px;
          background: linear-gradient(
            90deg,
            #ff4d91,
            #f62d79
          );
          color: white;
          font-size: 6.5px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 3px 7px rgba(246, 45, 121, 0.18);
        }

        .buy-button:hover {
          filter: brightness(1.04);
        }

        .buy-button:disabled {
          cursor: not-allowed;
          background: #d9dce2;
          box-shadow: none;
        }

        .quick-features {
          margin-top: 8px;
          min-height: 43px;
          border-radius: 8px;
          background: linear-gradient(
            90deg,
            #fff2f8,
            #fff7fa
          );
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          align-items: center;
          border: 1px solid #f8e7ef;
        }

        .feature-item {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-width: 0;
        }

        .feature-icon {
          color: #ff3986;
          font-size: 17px;
          font-weight: 900;
        }

        .feature-item b {
          display: block;
          font-size: 6px;
          color: #4a5363;
        }

        .feature-item small {
          display: block;
          margin-top: 2px;
          font-size: 4.8px;
          color: #a4a8b1;
        }

        .floating-chat {
          position: fixed;
          z-index: 70;
          right: 17px;
          bottom: 15px;
          height: 30px;
          padding: 0 6px 0 10px;
          border: 0;
          border-radius: 18px;
          background: #ff3a88;
          color: white;
          display: flex;
          align-items: center;
          gap: 7px;
          box-shadow: 0 6px 18px rgba(240, 35, 116, 0.28);
          cursor: pointer;
        }

        .chat-text {
          font-size: 7px;
          font-weight: 800;
        }

        .chat-icon {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: white;
          color: #ff3a88;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
        }

        .petals {
          position: fixed;
          inset: 0;
          z-index: 20;
          pointer-events: none;
          overflow: hidden;
        }

        .petal {
          position: absolute;
          top: -30px;
          width: 9px;
          height: 5px;
          border-radius: 90% 10% 90% 10%;
          background: #ff9bc4;
          opacity: 0.72;
          transform: rotate(35deg);
          animation: fall linear infinite;
        }

        .petal-1 {
          width: 7px;
          height: 4px;
          background: #ffbfd7;
        }

        .petal-2 {
          width: 12px;
          height: 6px;
          background: #ff8ebd;
        }

        .petal-3 {
          width: 6px;
          height: 4px;
          background: #ffd0e1;
        }

        .petal-4 {
          width: 10px;
          height: 5px;
          background: #f99abd;
        }

        .petal-5 {
          width: 8px;
          height: 5px;
          background: #ffcade;
        }

        .petal-6 {
          width: 5px;
          height: 4px;
          background: #ff91bc;
        }

        @keyframes fall {
          0% {
            transform:
              translate3d(0, -20px, 0)
              rotate(0deg);
          }

          25% {
            transform:
              translate3d(24px, 25vh, 0)
              rotate(100deg);
          }

          50% {
            transform:
              translate3d(-19px, 52vh, 0)
              rotate(190deg);
          }

          75% {
            transform:
              translate3d(28px, 76vh, 0)
              rotate(270deg);
          }

          100% {
            transform:
              translate3d(-12px, 110vh, 0)
              rotate(360deg);
          }
        }

        .skeleton-card {
          padding-bottom: 7px;
        }

        .skeleton-image {
          height: 91px;
          margin: 5px;
          border-radius: 5px;
          background: linear-gradient(
            90deg,
            #f3edf1,
            #fbf7f9,
            #f3edf1
          );
          background-size: 200% 100%;
          animation: skeleton 1.2s infinite;
        }

        .skeleton-line {
          height: 8px;
          width: 70%;
          margin: 7px;
          border-radius: 5px;
          background: #f2edf0;
          animation: skeleton 1.2s infinite;
        }

        .skeleton-line.short {
          width: 40%;
          margin-top: 5px;
        }

        .skeleton-button {
          height: 22px;
          margin: 7px;
          border-radius: 6px;
          background: #f1ebef;
          animation: skeleton 1.2s infinite;
        }

        @keyframes skeleton {
          0% {
            opacity: 0.55;
          }

          50% {
            opacity: 1;
          }

          100% {
            opacity: 0.55;
          }
        }

        .shop-error,
        .empty-products {
          min-height: 180px;
          border-radius: 9px;
          background: white;
          border: 1px solid #eee8ed;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 7px;
          color: #788091;
          font-size: 8px;
        }

        .shop-error b,
        .empty-products b {
          color: #343d4f;
          font-size: 11px;
        }

        .shop-error button {
          margin-top: 5px;
          border: 0;
          border-radius: 7px;
          background: #ff3986;
          color: white;
          padding: 6px 12px;
          font-size: 7px;
          font-weight: 800;
          cursor: pointer;
        }

        .empty-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff0f7;
          color: #ff3c88;
          font-size: 21px;
        }

        .modal-overlay {
          position: fixed;
          z-index: 100;
          inset: 0;
          background: rgba(21, 14, 25, 0.5);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }

        .buy-modal,
        .success-modal {
          width: min(390px, 100%);
          border-radius: 15px;
          background: white;
          padding: 23px;
          box-shadow: 0 20px 70px rgba(0, 0, 0, 0.25);
          position: relative;
          text-align: center;
        }

        .modal-close {
          position: absolute;
          top: 9px;
          right: 11px;
          border: 0;
          background: transparent;
          font-size: 23px;
          color: #9298a4;
          cursor: pointer;
        }

        .modal-icon {
          width: 50px;
          height: 50px;
          margin: 0 auto 10px;
          border-radius: 50%;
          background: #fff0f7;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }

        .buy-modal h3,
        .success-modal h3 {
          margin: 0;
          color: #222b3b;
          font-size: 18px;
        }

        .modal-product {
          margin: 8px 0 4px;
          color: #6f7786;
          font-size: 11px;
        }

        .modal-price {
          color: #f02e78;
          font-size: 20px;
          font-weight: 950;
        }

        .modal-wallet {
          margin-top: 7px;
          color: #818896;
          font-size: 10px;
        }

        .modal-wallet b {
          color: #353d4c;
        }

        .modal-message {
          margin-top: 11px;
          padding: 8px;
          border-radius: 7px;
          color: #dc315f;
          background: #fff1f3;
          font-size: 9px;
        }

        .modal-actions,
        .success-actions {
          display: flex;
          gap: 8px;
          margin-top: 18px;
        }

        .modal-actions button,
        .success-actions button {
          flex: 1;
          height: 36px;
          border: 0;
          border-radius: 8px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
        }

        .cancel-button,
        .success-actions button:last-child {
          background: #f2f3f5;
          color: #5e6674;
        }

        .confirm-button,
        .success-actions button:first-child {
          background: #ff3986;
          color: white;
        }

        .success-check {
          width: 56px;
          height: 56px;
          margin: 0 auto 11px;
          border-radius: 50%;
          background: #e9fff2;
          color: #19ad63;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 27px;
          font-weight: 900;
        }

        .success-modal p {
          color: #777f8d;
          font-size: 10px;
          margin: 7px 0 13px;
        }

        .key-box {
          padding: 12px;
          border-radius: 9px;
          background: #fff2f8;
          border: 1px dashed #ff7eb0;
        }

        .key-box span {
          display: block;
          color: #ef3a7c;
          font-size: 8px;
          font-weight: 900;
          margin-bottom: 5px;
        }

        .key-box strong {
          display: block;
          color: #31394a;
          font-size: 11px;
          word-break: break-all;
        }

        @media (max-width: 900px) {
          .topbar {
            height: 55px;
          }

          .topbar-inner {
            width: calc(100% - 20px);
            gap: 8px;
          }

          .mobile-menu {
            display: block;
          }

          .brand {
            width: 75px;
            min-width: 75px;
          }

          .brand-main {
            font-size: 15px;
          }

          .brand-sub {
            margin-left: 31px;
          }

          .main-nav {
            display: none;
          }

          .top-actions {
            margin-left: auto;
          }

          .theme-btn {
            display: none;
          }

          .wallet-mini {
            height: 28px;
          }

          .page-container {
            width: calc(100% - 20px);
            padding-top: 10px;
          }

          .hero {
            height: 165px;
          }

          .hero-left {
            left: 20px;
            top: 18px;
          }

          .hero-left h1 {
            font-size: 23px;
          }

          .anime-character {
            right: 70px;
            opacity: 0.72;
          }

          .hero-card {
            right: 9px;
            transform: scale(0.8) rotate(-3deg);
            transform-origin: right center;
          }

          .shop-layout {
            grid-template-columns: 1fr;
          }

          .sidebar {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .category-card {
            grid-row: span 2;
          }

          .side-card {
            margin-bottom: 0;
          }

          .product-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }

        @media (max-width: 650px) {
          .wallet-mini span:last-child {
            display: none;
          }

          .wallet-mini {
            width: 29px;
            justify-content: center;
            padding: 0;
          }

          .hero {
            height: 145px;
          }

          .hero-left {
            left: 14px;
            top: 14px;
          }

          .hero-label {
            display: none;
          }

          .hero-left h1 {
            font-size: 18px;
          }

          .hero-left p {
            font-size: 6px;
          }

          .hero-button {
            height: 22px;
            font-size: 6px;
          }

          .anime-character {
            right: -5px;
            transform: scale(0.76) rotate(-2deg);
            transform-origin: bottom right;
            opacity: 0.66;
          }

          .hero-card {
            display: none;
          }

          .moon {
            right: 55px;
          }

          .torii {
            right: 75px;
          }

          .sidebar {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .support-card {
            grid-column: span 1;
          }

          .product-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 7px;
          }

          .product-image {
            height: 105px;
          }

          .quick-features {
            grid-template-columns: repeat(2, 1fr);
            padding: 5px 0;
            gap: 6px;
          }

          .feature-item {
            justify-content: flex-start;
            padding-left: 9px;
          }

          .section-heading h2 {
            font-size: 13px;
          }
        }

        @media (max-width: 430px) {
          .page-container {
            width: calc(100% - 14px);
          }

          .brand {
            width: 68px;
            min-width: 68px;
          }

          .brand-main {
            font-size: 14px;
          }

          .brand-sub {
            font-size: 8px;
            margin-left: 28px;
          }

          .avatar-btn {
            width: 25px;
            height: 25px;
          }

          .hero {
            height: 135px;
          }

          .hero-left h1 {
            font-size: 17px;
          }

          .hero-left {
            top: 12px;
          }

          .anime-character {
            right: -31px;
            transform: scale(0.7) rotate(-2deg);
          }

          .sidebar {
            grid-template-columns: 1fr;
          }

          .category-card {
            grid-row: auto;
          }

          .vip-card {
            min-height: 70px;
          }

          .support-card {
            display: none;
          }

          .product-image {
            height: 95px;
          }

          .product-name {
            font-size: 6.5px;
          }

          .product-price {
            font-size: 8px;
          }
        }
      `}</style>
    </main>
  );
}
