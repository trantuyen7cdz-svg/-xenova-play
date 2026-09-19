"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const NAV_ITEMS = [
  { label: "Trang chủ", path: "/" },
  { label: "Cửa hàng", path: "/shop" },
  { label: "Nạp tiền", path: "/deposit" },
  { label: "KEY của tôi", path: "/keys" },
  { label: "Đơn hàng", path: "/orders" },
  { label: "Tài khoản", path: "/account" },
  { label: "Cài đặt", path: "/settings" },
];

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getProductType(product) {
  return normalize(
    product?.type ||
      product?.product_type ||
      product?.platform ||
      product?.category_name ||
      product?.category
  );
}

function formatPrice(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString("vi-VN")}đ`;
}

function formatDuration(value) {
  if (!value) return "";

  const text = String(value).toLowerCase();

  if (text.includes("1 day") || text.includes("1 ngày")) return "1 ngày";
  if (text.includes("7 day") || text.includes("7 ngày")) return "1 tuần";
  if (text.includes("30 day") || text.includes("30 ngày")) return "1 tháng";

  return String(value);
}

function SpriteImage({ src, alt = "", className = "" }) {
  if (!src) {
    return (
      <div className={`sprite-placeholder ${className}`}>
        <span>XP</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  );
}

function ProductCard({ product, stock, onBuy }) {
  const productStock =
    stock?.[product.id] ??
    stock?.[String(product.id)] ??
    stock?.find?.((item) => Number(item.product_id) === Number(product.id))
      ?.stock ??
    product.stock ??
    0;

  const quantity = Number(productStock || 0);
  const soldOut = quantity <= 0;

  const image =
    product.image_url ||
    product.image ||
    product.thumbnail ||
    product.icon ||
    "";

  const name =
    product.name ||
    product.title ||
    product.product_name ||
    "Sản phẩm XENOVA";

  const price =
    product.price ??
    product.sell_price ??
    product.sale_price ??
    product.amount ??
    0;

  const duration = formatDuration(
    product.duration ||
      product.duration_text ||
      product.term ||
      product.period
  );

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <SpriteImage
          src={image}
          alt={name}
          className="product-image"
        />

        <div className={`stock-badge ${soldOut ? "out" : ""}`}>
          {soldOut ? "Hết hàng" : `Còn ${quantity}`}
        </div>
      </div>

      <div className="product-body">
        <div className="product-title">{name}</div>

        {duration && (
          <div className="product-duration">
            <span>◷</span>
            {duration}
          </div>
        )}

        <div className="product-bottom">
          <div>
            <div className="product-price">{formatPrice(price)}</div>
            <div className="product-note">KEY chính hãng</div>
          </div>

          <button
            className="buy-button"
            disabled={soldOut}
            onClick={() => onBuy(product)}
          >
            {soldOut ? "Hết hàng" : "Mua ngay"}
          </button>
        </div>
      </div>
    </article>
  );
}

function ProductSkeleton() {
  return (
    <div className="product-card skeleton-card">
      <div className="skeleton image-skeleton" />
      <div className="skeleton line-large" />
      <div className="skeleton line-small" />
      <div className="skeleton line-price" />
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

  const [selectedCategory, setSelectedCategory] = useState("all");

  const [buyModal, setBuyModal] = useState(null);
  const [successModal, setSuccessModal] = useState(null);

  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState("");

  const loadWallet = async (currentUser) => {
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
        console.error("Wallet error:", walletError);
        return;
      }

      if (data) {
        setWallet(
          Number(
            data.balance ??
              data.amount ??
              data.money ??
              data.wallet_balance ??
              0
          )
        );
      } else {
        setWallet(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadShop = async () => {
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

      if (!catalogResponse.ok) {
        throw new Error("Không thể tải danh sách sản phẩm.");
      }

      const catalogData = await catalogResponse.json();

      const catalogCategories =
        catalogData?.categories ||
        catalogData?.data?.categories ||
        [];

      const catalogProducts =
        catalogData?.products ||
        catalogData?.data?.products ||
        [];

      setCategories(
        Array.isArray(catalogCategories) ? catalogCategories : []
      );

      setProducts(
        Array.isArray(catalogProducts) ? catalogProducts : []
      );

      if (stockResponse.ok) {
        const stockData = await stockResponse.json();

        const stockValue =
          stockData?.stock ??
          stockData?.data?.stock ??
          stockData?.data ??
          stockData;

        setStock(stockValue || {});
      } else {
        setStock({});
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "Không thể tải cửa hàng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      const currentUser = session?.user || null;

      setUser(currentUser);

      await loadWallet(currentUser);
      await loadShop();
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user || null;

      setUser(currentUser);

      await loadWallet(currentUser);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "all") {
      return products;
    }

    const selected = normalize(selectedCategory);

    return products.filter((product) => {
      const categoryId = String(
        product.category_id ??
          product.categoryId ??
          ""
      );

      const categoryName = normalize(
        product.category_name ??
          product.category ??
          product.type ??
          product.product_type ??
          product.platform ??
          ""
      );

      return (
        categoryId === String(selectedCategory) ||
        categoryName === selected
      );
    });
  }, [products, selectedCategory]);

  const handleBuy = (product) => {
    if (!user) {
      router.push("/login");
      return;
    }

    setMessage("");
    setBuyModal(product);
  };

  const confirmBuy = async () => {
    if (!buyModal || buying) return;

    if (!user) {
      router.push("/login");
      return;
    }

    const product = buyModal;

    const price = Number(
      product.price ??
        product.sell_price ??
        product.sale_price ??
        product.amount ??
        0
    );

    if (wallet < price) {
      setMessage("Số dư ví không đủ. Vui lòng nạp thêm tiền.");
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
            "Mua key thất bại."
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

      await loadWallet(user);
      await loadShop();
    } catch (err) {
      console.error(err);
      setMessage(
        err?.message ||
          "Có lỗi xảy ra khi mua key."
      );
    } finally {
      setBuying(false);
    }
  };

  const go = (path) => {
    router.push(path);
  };

  return (
    <>
      <div className="shop-page">
        <header className="topbar">
          <div className="topbar-inner">
            <button
              className="brand"
              onClick={() => go("/")}
            >
              <div className="brand-logo">X</div>

              <div className="brand-text">
                <strong>XENOVA</strong>
                <span>PLAY</span>
              </div>
            </button>

            <nav className="main-nav">
              {NAV_ITEMS.map((item) => {
                const active =
                  item.path === "/shop";

                return (
                  <button
                    key={item.path}
                    className={`nav-item ${
                      active ? "active" : ""
                    }`}
                    onClick={() => go(item.path)}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="header-right">
              <button
                className="theme-button"
                aria-label="Đổi giao diện"
                onClick={() =>
                  document.documentElement.classList.toggle(
                    "dark"
                  )
                }
              >
                ☼
              </button>

              <button
                className="wallet-box"
                onClick={() => go("/deposit")}
              >
                <span className="wallet-icon">₫</span>

                <span className="wallet-info">
                  <small>Số dư</small>
                  <strong>{formatPrice(wallet)}</strong>
                </span>
              </button>

              <button
                className="avatar"
                onClick={() => go("/account")}
              >
                {user?.email
                  ? user.email.charAt(0).toUpperCase()
                  : "U"}
              </button>
            </div>
          </div>
        </header>

        <main className="content">
          <section className="hero">
            <div className="petals">
              {Array.from({ length: 24 }).map((_, index) => (
                <span
                  key={index}
                  className="petal"
                  style={{
                    left: `${(index * 17) % 100}%`,
                    animationDelay: `${(index % 8) * 0.7}s`,
                    animationDuration: `${
                      5 + (index % 5)
                    }s`,
                  }}
                />
              ))}
            </div>

            <div className="hero-copy">
              <div className="hero-small">
                XENOVA PLAY STORE
              </div>

              <h1>
                SHOP
                <span> XENOVA</span>
              </h1>

              <p>
                Hệ thống cung cấp KEY nhanh chóng,
                an toàn và tự động.
              </p>

              <div className="hero-buttons">
                <button
                  className="hero-button primary"
                  onClick={() =>
                    document
                      .getElementById("products")
                      ?.scrollIntoView({
                        behavior: "smooth",
                      })
                  }
                >
                  Khám phá sản phẩm
                </button>

                <button
                  className="hero-button secondary"
                  onClick={() => go("/deposit")}
                >
                  Nạp tiền
                </button>
              </div>
            </div>

            <div className="hero-character">
              <div className="character-glow" />
              <div className="character">
                <div className="hair-back" />
                <div className="head">
                  <div className="hair-top" />
                  <div className="face">
                    <span className="eye left" />
                    <span className="eye right" />
                    <span className="mouth" />
                  </div>
                </div>
                <div className="neck" />
                <div className="body">
                  <div className="ribbon" />
                </div>
              </div>
            </div>
          </section>

          <div className="shop-layout">
            <aside className="sidebar">
              <div className="side-card">
                <div className="side-title">
                  <span className="side-title-icon">
                    ☰
                  </span>
                  Danh mục
                </div>

                <button
                  className={`category ${
                    selectedCategory === "all"
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedCategory("all")
                  }
                >
                  <span>✦</span>
                  Tất cả sản phẩm
                  <b>{products.length}</b>
                </button>

                {categories.map((category, index) => {
                  const id =
                    category.id ??
                    category.category_id ??
                    index;

                  const label =
                    category.name ??
                    category.title ??
                    category.category_name ??
                    `Danh mục ${index + 1}`;

                  const count = products.filter(
                    (product) => {
                      return (
                        String(
                          product.category_id ?? ""
                        ) === String(id)
                      );
                    }
                  ).length;

                  return (
                    <button
                      key={id}
                      className={`category ${
                        String(selectedCategory) ===
                        String(id)
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedCategory(id)
                      }
                    >
                      <span>◇</span>
                      {label}
                      <b>{count}</b>
                    </button>
                  );
                })}
              </div>

              <div className="vip-card">
                <div className="vip-spark">✦</div>

                <div>
                  <strong>VIP MEMBER</strong>
                  <p>
                    Nhận nhiều ưu đãi khi mua
                    sản phẩm.
                  </p>
                </div>

                <button
                  onClick={() => go("/account")}
                >
                  Xem ưu đãi
                </button>
              </div>

              <div className="support-card">
                <div className="support-icon">
                  ?
                </div>

                <div>
                  <strong>Cần hỗ trợ?</strong>
                  <p>
                    Liên hệ Admin để được hỗ trợ
                    nhanh nhất.
                  </p>
                </div>

                <button
                  onClick={() =>
                    window.open(
                      "https://zalo.me/84365717262",
                      "_blank"
                    )
                  }
                >
                  Chat Admin
                </button>
              </div>
            </aside>

            <section
              className="products-section"
              id="products"
            >
              <div className="section-heading">
                <div>
                  <span className="section-kicker">
                    XENOVA STORE
                  </span>

                  <h2>Sản phẩm nổi bật</h2>

                  <p>
                    Chọn sản phẩm phù hợp với nhu cầu
                    của bạn.
                  </p>
                </div>

                <div className="result-count">
                  {filteredProducts.length} sản phẩm
                </div>
              </div>

              {error && (
                <div className="error-box">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="products-grid">
                  {Array.from({ length: 6 }).map(
                    (_, index) => (
                      <ProductSkeleton
                        key={index}
                      />
                    )
                  )}
                </div>
              ) : filteredProducts.length ? (
                <div className="products-grid">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      stock={stock}
                      onBuy={handleBuy}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-products">
                  <div className="empty-icon">
                    ♢
                  </div>
                  <h3>Chưa có sản phẩm</h3>
                  <p>
                    Hiện chưa có sản phẩm trong danh
                    mục này.
                  </p>
                </div>
              )}

              <div className="feature-grid">
                <div className="feature-card">
                  <div className="feature-icon">
                    ⚡
                  </div>
                  <div>
                    <strong>Giao key tự động</strong>
                    <span>
                      Nhận key ngay sau khi thanh toán.
                    </span>
                  </div>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">
                    🔒
                  </div>
                  <div>
                    <strong>Thanh toán an toàn</strong>
                    <span>
                      Hệ thống giao dịch nhanh chóng.
                    </span>
                  </div>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">
                    ♡
                  </div>
                  <div>
                    <strong>Hỗ trợ 24/7</strong>
                    <span>
                      Đội ngũ hỗ trợ luôn sẵn sàng.
                    </span>
                  </div>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">
                    ★
                  </div>
                  <div>
                    <strong>Sản phẩm chất lượng</strong>
                    <span>
                      Sản phẩm được kiểm tra trước khi
                      bán.
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>

        <button
          className="floating-zalo"
          onClick={() =>
            window.open(
              "https://zalo.me/84365717262",
              "_blank"
            )
          }
        >
          <span>💬</span>
          <div>
            <small>HỖ TRỢ</small>
            <strong>Chat Admin</strong>
          </div>
        </button>
      </div>

      {buyModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!buying) setBuyModal(null);
          }}
        >
          <div
            className="modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="modal-close"
              onClick={() => {
                if (!buying) setBuyModal(null);
              }}
            >
              ×
            </button>

            <div className="modal-icon">
              🛒
            </div>

            <h3>Xác nhận mua hàng</h3>

            <p className="modal-product-name">
              {buyModal.name ||
                buyModal.title ||
                "Sản phẩm XENOVA"}
            </p>

            <div className="modal-info">
              <div>
                <span>Giá sản phẩm</span>
                <strong>
                  {formatPrice(
                    buyModal.price ??
                      buyModal.sell_price ??
                      buyModal.sale_price ??
                      0
                  )}
                </strong>
              </div>

              <div>
                <span>Số dư hiện tại</span>
                <strong>
                  {formatPrice(wallet)}
                </strong>
              </div>
            </div>

            {message && (
              <div className="modal-message">
                {message}
              </div>
            )}

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
                onClick={confirmBuy}
              >
                {buying
                  ? "Đang xử lý..."
                  : "Xác nhận mua"}
              </button>
            </div>
          </div>
        </div>
      )}

      {successModal && (
        <div className="modal-overlay">
          <div className="modal success-modal">
            <div className="success-icon">
              ✓
            </div>

            <h3>Mua hàng thành công</h3>

            <p>
              Key của bạn đã được tạo thành công.
            </p>

            {successModal.key ? (
              <div className="key-result">
                <span>KEY CỦA BẠN</span>

                <strong>
                  {successModal.key}
                </strong>

                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        successModal.key
                      );
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                >
                  Sao chép KEY
                </button>
              </div>
            ) : (
              <div className="key-result">
                <span>ĐÃ HOÀN TẤT</span>
                <strong>
                  Kiểm tra mục KEY của tôi
                </strong>
              </div>
            )}

            <button
              className="confirm-button full"
              onClick={() =>
                setSuccessModal(null)
              }
            >
              Đóng
            </button>
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
          background: #f7f8fc;
          color: #252536;
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

        .shop-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 85% 10%,
              rgba(255, 185, 216, 0.18),
              transparent 30%
            ),
            #f7f8fc;
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          height: 76px;
          background: rgba(255, 255, 255, 0.94);
          border-bottom: 1px solid #ececf3;
          backdrop-filter: blur(16px);
        }

        .topbar-inner {
          width: min(1440px, calc(100% - 48px));
          height: 100%;
          margin: auto;
          display: flex;
          align-items: center;
          gap: 28px;
        }

        .brand {
          border: 0;
          background: transparent;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .brand-logo {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          color: white;
          font-weight: 900;
          font-size: 21px;
          background:
            linear-gradient(
              145deg,
              #ff5fa2,
              #9b5cff
            );
          box-shadow:
            0 8px 20px rgba(222, 83, 159, 0.24);
        }

        .brand-text {
          display: flex;
          flex-direction: column;
          line-height: 1;
          text-align: left;
        }

        .brand-text strong {
          font-size: 17px;
          letter-spacing: 0.8px;
        }

        .brand-text span {
          margin-top: 4px;
          color: #a65ce5;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 3px;
        }

        .main-nav {
          display: flex;
          align-items: center;
          gap: 3px;
          flex: 1;
        }

        .nav-item {
          border: 0;
          background: transparent;
          color: #737486;
          padding: 10px 12px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          transition:
            background 0.2s,
            color 0.2s;
        }

        .nav-item:hover {
          background: #faf0f7;
          color: #d84f9b;
        }

        .nav-item.active {
          color: #d84f9b;
          background: #fff0f8;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .theme-button {
          width: 38px;
          height: 38px;
          border: 1px solid #e8e8ef;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          color: #656577;
        }

        .wallet-box {
          border: 1px solid #ececf3;
          background: white;
          border-radius: 12px;
          padding: 6px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          min-width: 120px;
        }

        .wallet-icon {
          width: 28px;
          height: 28px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          color: #b94e99;
          background: #fff0f8;
          font-weight: 800;
        }

        .wallet-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          line-height: 1.1;
        }

        .wallet-info small {
          color: #999aaa;
          font-size: 9px;
        }

        .wallet-info strong {
          margin-top: 3px;
          font-size: 12px;
        }

        .avatar {
          width: 38px;
          height: 38px;
          border: 0;
          border-radius: 50%;
          color: white;
          font-weight: 800;
          cursor: pointer;
          background:
            linear-gradient(
              135deg,
              #f28bbb,
              #8e72e8
            );
        }

        .content {
          width: min(1440px, calc(100% - 48px));
          margin: auto;
          padding: 24px 0 80px;
        }

        .hero {
          position: relative;
          overflow: hidden;
          min-height: 330px;
          border-radius: 24px;
          background:
            linear-gradient(
              110deg,
              #fff0f8 0%,
              #f9ecff 45%,
              #eee9ff 100%
            );
          border: 1px solid #f0ddec;
          box-shadow:
            0 20px 60px rgba(122, 79, 119, 0.08);
        }

        .hero:after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(
              circle at 75% 20%,
              rgba(255, 255, 255, 0.8),
              transparent 28%
            ),
            radial-gradient(
              circle at 20% 100%,
              rgba(255, 170, 210, 0.25),
              transparent 30%
            );
          pointer-events: none;
        }

        .hero-copy {
          position: relative;
          z-index: 5;
          padding: 58px 0 50px 68px;
          max-width: 610px;
        }

        .hero-small {
          color: #d35a9e;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 3px;
        }

        .hero h1 {
          margin: 10px 0 8px;
          font-size: clamp(44px, 6vw, 78px);
          line-height: 0.95;
          letter-spacing: -4px;
          color: #28283a;
        }

        .hero h1 span {
          display: block;
          background:
            linear-gradient(
              90deg,
              #ed6fa9,
              #9867e8
            );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .hero p {
          max-width: 450px;
          color: #777688;
          font-size: 14px;
          line-height: 1.7;
          margin: 18px 0 22px;
        }

        .hero-buttons {
          display: flex;
          gap: 10px;
        }

        .hero-button {
          border: 0;
          border-radius: 12px;
          padding: 12px 17px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
        }

        .hero-button.primary {
          color: white;
          background:
            linear-gradient(
              135deg,
              #ed67a7,
              #9b6be9
            );
          box-shadow:
            0 10px 24px rgba(213, 91, 160, 0.25);
        }

        .hero-button.secondary {
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid #eaddea;
          color: #6f6374;
        }

        .hero-character {
          position: absolute;
          z-index: 3;
          right: 8%;
          bottom: -42px;
          width: 430px;
          height: 360px;
        }

        .character-glow {
          position: absolute;
          width: 330px;
          height: 330px;
          right: 20px;
          bottom: 0;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(255, 255, 255, 0.96),
              rgba(255, 182, 221, 0.3) 45%,
              transparent 70%
            );
        }

        .character {
          position: absolute;
          width: 260px;
          height: 350px;
          right: 65px;
          bottom: 0;
        }

        .hair-back {
          position: absolute;
          left: 38px;
          top: 14px;
          width: 190px;
          height: 210px;
          border-radius: 55% 48% 40% 50%;
          background:
            linear-gradient(
              145deg,
              #633b73,
              #ad5e9b 55%,
              #e889bc
            );
          transform: rotate(8deg);
        }

        .head {
          position: absolute;
          z-index: 4;
          left: 70px;
          top: 38px;
          width: 130px;
          height: 155px;
          border-radius: 48% 48% 46% 46%;
          background: #ffe2d8;
          overflow: hidden;
          box-shadow:
            inset -7px -5px 0 rgba(225, 130, 130, 0.08);
        }

        .hair-top {
          position: absolute;
          left: -8px;
          top: -22px;
          width: 150px;
          height: 82px;
          border-radius: 50%;
          background:
            linear-gradient(
              135deg,
              #513263,
              #a75093
            );
        }

        .face {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 34px;
          height: 52px;
        }

        .eye {
          position: absolute;
          top: 17px;
          width: 9px;
          height: 14px;
          border-radius: 50%;
          background: #3e3150;
        }

        .eye.left {
          left: 36px;
        }

        .eye.right {
          right: 36px;
        }

        .mouth {
          position: absolute;
          left: 59px;
          top: 35px;
          width: 14px;
          height: 7px;
          border-bottom: 2px solid #bb657c;
          border-radius: 50%;
        }

        .neck {
          position: absolute;
          z-index: 3;
          top: 177px;
          left: 113px;
          width: 43px;
          height: 55px;
          background: #ffd8cc;
        }

        .body {
          position: absolute;
          left: 34px;
          top: 205px;
          width: 200px;
          height: 170px;
          border-radius: 80px 80px 0 0;
          background:
            linear-gradient(
              135deg,
              #9d69d4,
              #e98bb4
            );
        }

        .ribbon {
          position: absolute;
          left: 70px;
          top: 10px;
          width: 60px;
          height: 50px;
          background: #ff8ebd;
          clip-path: polygon(
            50% 20%,
            100% 0,
            84% 100%,
            50% 72%,
            16% 100%,
            0 0
          );
        }

        .petals {
          position: absolute;
          z-index: 10;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .petal {
          position: absolute;
          top: -20px;
          width: 10px;
          height: 6px;
          border-radius: 80% 20% 80% 20%;
          background: #ed9cc3;
          opacity: 0.6;
          transform: rotate(35deg);
          animation: falling linear infinite;
        }

        @keyframes falling {
          0% {
            transform:
              translate3d(0, -20px, 0)
              rotate(0deg);
            opacity: 0;
          }

          15% {
            opacity: 0.7;
          }

          100% {
            transform:
              translate3d(
                80px,
                390px,
                0
              )
              rotate(360deg);
            opacity: 0;
          }
        }

        .shop-layout {
          display: grid;
          grid-template-columns: 270px minmax(0, 1fr);
          gap: 24px;
          margin-top: 24px;
        }

        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .side-card,
        .support-card {
          background: white;
          border: 1px solid #ececf3;
          border-radius: 18px;
          padding: 18px;
          box-shadow:
            0 10px 35px rgba(41, 34, 56, 0.04);
        }

        .side-title {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 14px;
          font-weight: 800;
          margin-bottom: 10px;
        }

        .side-title-icon {
          color: #dc5fa0;
        }

        .category {
          width: 100%;
          border: 0;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 9px;
          text-align: left;
          padding: 11px 10px;
          margin-top: 3px;
          border-radius: 11px;
          color: #777888;
          cursor: pointer;
          font-size: 12px;
          transition: 0.2s;
        }

        .category:hover {
          background: #fff3f9;
          color: #d65d9d;
        }

        .category.selected {
          background:
            linear-gradient(
              90deg,
              #fff0f8,
              #faf1ff
            );
          color: #d35b9d;
          font-weight: 700;
        }

        .category b {
          margin-left: auto;
          font-size: 10px;
          color: #a5a5b1;
        }

        .vip-card {
          position: relative;
          overflow: hidden;
          border-radius: 18px;
          padding: 19px;
          color: white;
          background:
            linear-gradient(
              135deg,
              #70488f,
              #c15b9f
            );
          box-shadow:
            0 15px 35px rgba(142, 73, 139, 0.18);
        }

        .vip-spark {
          position: absolute;
          right: 16px;
          top: 10px;
          font-size: 38px;
          opacity: 0.2;
        }

        .vip-card strong {
          font-size: 13px;
          letter-spacing: 1px;
        }

        .vip-card p {
          margin: 8px 0 15px;
          max-width: 190px;
          color: rgba(255, 255, 255, 0.75);
          font-size: 11px;
          line-height: 1.5;
        }

        .vip-card button {
          border: 0;
          border-radius: 9px;
          background: white;
          color: #9b5795;
          padding: 8px 12px;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .support-card {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .support-icon {
          width: 31px;
          height: 31px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          color: #d6579b;
          background: #fff0f8;
          font-weight: 900;
        }

        .support-card > div:nth-child(2) {
          flex: 1;
          min-width: 150px;
        }

        .support-card strong {
          display: block;
          font-size: 12px;
        }

        .support-card p {
          margin: 5px 0 0;
          color: #9494a1;
          font-size: 10px;
          line-height: 1.5;
        }

        .support-card button {
          width: 100%;
          border: 0;
          border-radius: 9px;
          padding: 9px;
          color: white;
          background:
            linear-gradient(
              135deg,
              #ee71aa,
              #9a6ae7
            );
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .products-section {
          min-width: 0;
        }

        .section-heading {
          display: flex;
          justify-content: space-between;
          align-items: end;
          margin-bottom: 17px;
        }

        .section-kicker {
          color: #d45d9f;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .section-heading h2 {
          margin: 5px 0 3px;
          font-size: 25px;
          letter-spacing: -0.6px;
        }

        .section-heading p {
          margin: 0;
          color: #9898a7;
          font-size: 11px;
        }

        .result-count {
          border: 1px solid #eaeaf1;
          background: white;
          border-radius: 9px;
          padding: 7px 10px;
          color: #858594;
          font-size: 10px;
        }

        .products-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 15px;
        }

        .product-card {
          overflow: hidden;
          background: white;
          border: 1px solid #ededf3;
          border-radius: 16px;
          box-shadow:
            0 8px 25px rgba(40, 32, 50, 0.035);
          transition:
            transform 0.2s,
            box-shadow 0.2s;
        }

        .product-card:hover {
          transform: translateY(-3px);
          box-shadow:
            0 16px 35px rgba(40, 32, 50, 0.08);
        }

        .product-image-wrap {
          position: relative;
          height: 150px;
          background:
            linear-gradient(
              135deg,
              #fff0f8,
              #f1ebff
            );
          overflow: hidden;
        }

        .product-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .sprite-placeholder {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          color: #d968a7;
          font-size: 34px;
          font-weight: 900;
          background:
            radial-gradient(
              circle,
              #fff 0,
              transparent 55%
            );
        }

        .stock-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          padding: 5px 8px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.9);
          color: #48a47d;
          font-size: 9px;
          font-weight: 800;
          backdrop-filter: blur(5px);
        }

        .stock-badge.out {
          color: #d66b72;
        }

        .product-body {
          padding: 13px;
        }

        .product-title {
          min-height: 36px;
          color: #303041;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.35;
        }

        .product-duration {
          display: flex;
          gap: 5px;
          align-items: center;
          color: #9a9aa8;
          font-size: 9px;
          margin-top: 5px;
        }

        .product-bottom {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 8px;
          margin-top: 12px;
        }

        .product-price {
          color: #d4529c;
          font-size: 15px;
          font-weight: 900;
        }

        .product-note {
          margin-top: 2px;
          color: #b0b0ba;
          font-size: 8px;
        }

        .buy-button {
          border: 0;
          border-radius: 9px;
          padding: 9px 11px;
          color: white;
          background:
            linear-gradient(
              135deg,
              #ed6ba8,
              #9b69e5
            );
          cursor: pointer;
          font-size: 9px;
          font-weight: 800;
          white-space: nowrap;
        }

        .buy-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .feature-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-top: 22px;
        }

        .feature-card {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 72px;
          padding: 12px;
          border-radius: 14px;
          background: white;
          border: 1px solid #ededf3;
        }

        .feature-icon {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: #d45b9f;
          background: #fff0f8;
        }

        .feature-card strong {
          display: block;
          color: #383846;
          font-size: 10px;
        }

        .feature-card span {
          display: block;
          margin-top: 4px;
          color: #9999a6;
          font-size: 8px;
          line-height: 1.4;
        }

        .empty-products {
          padding: 70px 20px;
          text-align: center;
          border-radius: 18px;
          border: 1px dashed #dedee8;
          background: white;
        }

        .empty-icon {
          font-size: 38px;
          color: #d96aa7;
        }

        .empty-products h3 {
          margin: 8px 0 5px;
        }

        .empty-products p {
          margin: 0;
          color: #9999a7;
          font-size: 12px;
        }

        .error-box {
          margin-bottom: 15px;
          padding: 12px 14px;
          border-radius: 12px;
          color: #b34d58;
          background: #fff0f2;
          border: 1px solid #ffd9de;
          font-size: 12px;
        }

        .skeleton-card {
          padding-bottom: 15px;
        }

        .skeleton {
          position: relative;
          overflow: hidden;
          background: #eeeef4;
        }

        .skeleton:after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.7),
              transparent
            );
          animation: skeleton 1.3s infinite;
        }

        @keyframes skeleton {
          100% {
            transform: translateX(100%);
          }
        }

        .image-skeleton {
          height: 150px;
        }

        .line-large,
        .line-small,
        .line-price {
          height: 11px;
          border-radius: 5px;
          margin: 14px 13px 0;
        }

        .line-small {
          width: 45%;
          height: 8px;
          margin-top: 8px;
        }

        .line-price {
          width: 35%;
          margin-top: 15px;
        }

        .floating-zalo {
          position: fixed;
          z-index: 60;
          right: 22px;
          bottom: 22px;
          border: 1px solid #eee0eb;
          border-radius: 15px;
          padding: 8px 13px 8px 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          box-shadow:
            0 14px 40px rgba(49, 31, 50, 0.15);
          cursor: pointer;
        }

        .floating-zalo > span {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #eaf6ff;
          font-size: 17px;
        }

        .floating-zalo div {
          display: flex;
          flex-direction: column;
          text-align: left;
        }

        .floating-zalo small {
          color: #a2a2ae;
          font-size: 7px;
          letter-spacing: 1px;
        }

        .floating-zalo strong {
          color: #4e4e60;
          font-size: 10px;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(25, 20, 32, 0.45);
          backdrop-filter: blur(8px);
        }

        .modal {
          position: relative;
          width: min(420px, 100%);
          border-radius: 22px;
          padding: 27px;
          background: white;
          box-shadow:
            0 30px 80px rgba(20, 14, 28, 0.2);
          text-align: center;
        }

        .modal-close {
          position: absolute;
          top: 13px;
          right: 15px;
          border: 0;
          background: transparent;
          color: #aaaab5;
          font-size: 24px;
          cursor: pointer;
        }

        .modal-icon,
        .success-icon {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          margin: 0 auto 13px;
          border-radius: 18px;
          background: #fff0f8;
          font-size: 24px;
        }

        .success-icon {
          color: white;
          background:
            linear-gradient(
              135deg,
              #58c68e,
              #39a975
            );
          font-size: 28px;
          font-weight: 900;
        }

        .modal h3 {
          margin: 0;
          font-size: 19px;
        }

        .modal-product-name {
          margin: 7px 0 20px;
          color: #8e8e9d;
          font-size: 12px;
        }

        .modal-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 15px;
        }

        .modal-info > div {
          padding: 12px;
          border-radius: 12px;
          background: #f8f8fb;
          text-align: left;
        }

        .modal-info span {
          display: block;
          color: #9999a6;
          font-size: 9px;
        }

        .modal-info strong {
          display: block;
          margin-top: 4px;
          color: #393948;
          font-size: 13px;
        }

        .modal-message {
          padding: 10px;
          margin-bottom: 13px;
          border-radius: 10px;
          color: #b74d5a;
          background: #fff0f2;
          font-size: 10px;
        }

        .modal-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .cancel-button,
        .confirm-button {
          border: 0;
          border-radius: 11px;
          padding: 11px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
        }

        .cancel-button {
          color: #747484;
          background: #f1f1f5;
        }

        .confirm-button {
          color: white;
          background:
            linear-gradient(
              135deg,
              #ed69a8,
              #9869e4
            );
        }

        .confirm-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .confirm-button.full {
          width: 100%;
          margin-top: 15px;
        }

        .key-result {
          padding: 15px;
          border: 1px dashed #e2cfe0;
          border-radius: 13px;
          background: #fff8fc;
        }

        .key-result span {
          display: block;
          color: #b09daa;
          font-size: 8px;
          letter-spacing: 1.5px;
          font-weight: 800;
        }

        .key-result strong {
          display: block;
          margin: 9px 0;
          color: #cf5498;
          font-size: 15px;
          word-break: break-all;
        }

        .key-result button {
          border: 0;
          border-radius: 8px;
          padding: 8px 12px;
          color: white;
          background: #cf5b9b;
          cursor: pointer;
          font-size: 9px;
          font-weight: 800;
        }

        @media (max-width: 1100px) {
          .main-nav {
            gap: 0;
          }

          .nav-item {
            padding-inline: 7px;
            font-size: 11px;
          }

          .hero-character {
            right: -20px;
            opacity: 0.8;
          }

          .products-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .feature-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 820px) {
          .topbar {
            height: auto;
          }

          .topbar-inner {
            width: min(100% - 24px, 700px);
            padding: 12px 0;
            flex-wrap: wrap;
            gap: 10px;
          }

          .main-nav {
            order: 3;
            width: 100%;
            overflow-x: auto;
            padding-bottom: 2px;
          }

          .header-right {
            margin-left: auto;
          }

          .content {
            width: min(100% - 24px, 700px);
            padding-top: 12px;
          }

          .hero {
            min-height: 380px;
          }

          .hero-copy {
            padding: 40px 25px;
            max-width: 100%;
          }

          .hero-character {
            right: -80px;
            opacity: 0.3;
          }

          .shop-layout {
            grid-template-columns: 1fr;
          }

          .sidebar {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .side-card {
            grid-row: span 2;
          }
        }

        @media (max-width: 560px) {
          .brand-text {
            display: none;
          }

          .wallet-box {
            min-width: auto;
          }

          .wallet-info {
            display: none;
          }

          .theme-button {
            display: none;
          }

          .hero {
            border-radius: 18px;
          }

          .hero h1 {
            font-size: 50px;
          }

          .hero-character {
            right: -150px;
          }

          .products-grid {
            grid-template-columns: 1fr;
          }

          .feature-grid {
            grid-template-columns: 1fr;
          }

          .sidebar {
            display: flex;
          }

          .floating-zalo {
            right: 12px;
            bottom: 12px;
          }
        }
      `}</style>
    </>
  );
}
