"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const SAMPLE_IMAGE =
  "https://i.ibb.co/GQNBB2RS/985-AEC8-F-0918-406-B8-C87-A6-D63-EB02674.png";

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
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getProductName(product) {
  return (
    product?.name ||
    product?.title ||
    product?.product_name ||
    product?.display_name ||
    "KEY XENOVA"
  );
}

function getProductPrice(product) {
  const value =
    product?.price ??
    product?.selling_price ??
    product?.sale_price ??
    product?.amount ??
    0;

  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getProductDescription(product) {
  return (
    product?.description ||
    product?.short_description ||
    product?.desc ||
    "KEY chính hãng XENOVA PLAY"
  );
}

function getProductType(product) {
  const text = normalize(
    [
      product?.name,
      product?.title,
      product?.category_name,
      product?.category,
      product?.type,
      product?.platform,
    ].join(" ")
  );

  if (text.includes("iphone") || text.includes("ios")) return "ios";
  if (text.includes("android") || text.includes("adr")) return "android";
  if (text.includes("pc") || text.includes("windows")) return "pc";

  return "other";
}

function formatPrice(value) {
  const number = Number(value) || 0;
  return `${number.toLocaleString("vi-VN")}đ`;
}

function formatDuration(product) {
  const duration =
    product?.duration ??
    product?.days ??
    product?.day ??
    product?.valid_days ??
    product?.duration_days;

  if (duration !== undefined && duration !== null && duration !== "") {
    const number = Number(duration);

    if (Number.isFinite(number)) {
      if (number >= 30 && number % 30 === 0) {
        return `${number / 30} tháng`;
      }

      return `${number} ngày`;
    }

    return String(duration);
  }

  const text = `${product?.name || ""} ${product?.title || ""}`;

  if (/1\s*tháng|1\s*thang|30\s*ngày|30\s*ngay/i.test(text)) {
    return "1 tháng";
  }

  if (/1\s*tuần|1\s*tuan|7\s*ngày|7\s*ngay/i.test(text)) {
    return "1 tuần";
  }

  if (/1\s*ngày|1\s*ngay/i.test(text)) {
    return "1 ngày";
  }

  return "KEY";
}

function getProductImage(product) {
  return (
    product?.image_url ||
    product?.image ||
    product?.thumbnail ||
    product?.photo ||
    SAMPLE_IMAGE
  );
}

function getStockValue(value) {
  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  if (value && typeof value === "object") {
    return Number(
      value.stock ??
        value.quantity ??
        value.available ??
        value.count ??
        value.total ??
        0
    );
  }

  return 0;
}

function ProductCard({ product, stock, onBuy }) {
  const price = getProductPrice(product);
  const name = getProductName(product);
  const type = getProductType(product);
  const duration = formatDuration(product);
  const image = getProductImage(product);
  const description = getProductDescription(product);
  const available = stock > 0;

  const typeLabel = {
    android: "ANDROID",
    ios: "IPHONE",
    pc: "PC",
    other: "KEY",
  }[type];

  return (
    <div className="product-card">
      <div className="product-image-wrap">
        <img
          src={image}
          alt={name}
          className="product-image"
          onError={(event) => {
            event.currentTarget.src = SAMPLE_IMAGE;
          }}
        />

        <div className="product-badge">{typeLabel}</div>

        <div className={`stock-badge ${available ? "in-stock" : "out-stock"}`}>
          {available ? `${stock} KEY` : "HẾT KEY"}
        </div>
      </div>

      <div className="product-content">
        <div className="product-title">{name}</div>

        <div className="product-duration">
          <span>⏱</span>
          {duration}
        </div>

        <div className="product-description">{description}</div>

        <div className="product-bottom">
          <div>
            <div className="price-label">Giá bán</div>
            <div className="product-price">{formatPrice(price)}</div>
          </div>

          <button
            className="buy-button"
            disabled={!available}
            onClick={() => onBuy(product)}
          >
            {available ? "MUA NGAY" : "HẾT HÀNG"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="product-card skeleton-card">
      <div className="skeleton skeleton-image" />

      <div className="skeleton-content">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-button" />
      </div>
    </div>
  );
}

export default function ShopPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState([]);
  const [wallet, setWallet] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

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
        console.error("Wallet error:", walletError);
        return;
      }

      const balance =
        data?.balance ??
        data?.amount ??
        data?.money ??
        data?.balance_amount ??
        0;

      setWallet(Number(balance) || 0);
    } catch (walletError) {
      console.error("Wallet load error:", walletError);
    }
  }

  async function loadShop() {
    setLoading(true);
    setError("");

    try {
      const [{ data: sessionData }, catalogResponse, stockResponse] =
        await Promise.all([
          supabase.auth.getSession(),
          fetch("/api/shop/catalog", {
            cache: "no-store",
          }),
          fetch("/api/shop/stock", {
            cache: "no-store",
          }),
        ]);

      const currentUser = sessionData?.session?.user || null;

      setUser(currentUser);

      if (currentUser) {
        await loadWallet(currentUser);
      } else {
        setWallet(0);
      }

      if (!catalogResponse.ok) {
        throw new Error("Không thể tải danh sách sản phẩm.");
      }

      const catalogData = await catalogResponse.json();

      const categoryData =
        catalogData?.categories ||
        catalogData?.data?.categories ||
        catalogData?.result?.categories ||
        [];

      const productData =
        catalogData?.products ||
        catalogData?.data?.products ||
        catalogData?.result?.products ||
        [];

      setCategories(Array.isArray(categoryData) ? categoryData : []);
      setProducts(Array.isArray(productData) ? productData : []);

      if (stockResponse.ok) {
        const stockData = await stockResponse.json();

        const stockList =
          stockData?.stock ||
          stockData?.stocks ||
          stockData?.data ||
          stockData?.result ||
          [];

        setStock(Array.isArray(stockList) ? stockList : stockList || []);
      } else {
        setStock([]);
      }
    } catch (loadError) {
      console.error("Shop load error:", loadError);
      setError(loadError?.message || "Không thể tải cửa hàng.");
    } finally {
      setLoading(false);
    }
  }

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
      subscription?.unsubscribe();
    };
  }, []);

  const visibleProducts = useMemo(() => {
    if (selectedCategory === "all") {
      return products;
    }

    return products.filter((product) => {
      const productCategory =
        product?.category_id ??
        product?.categoryId ??
        product?.category ??
        product?.category_name;

      const selected = categories.find(
        (category) =>
          String(category?.id) === String(selectedCategory) ||
          String(category?.name) === String(selectedCategory) ||
          String(category?.slug) === String(selectedCategory)
      );

      if (!selected) {
        return String(productCategory) === String(selectedCategory);
      }

      return (
        String(productCategory) === String(selected?.id) ||
        normalize(productCategory) === normalize(selected?.name) ||
        normalize(productCategory) === normalize(selected?.slug)
      );
    });
  }, [products, categories, selectedCategory]);

  function getProductStock(productId) {
    if (!stock) return 0;

    if (!Array.isArray(stock)) {
      const direct =
        stock?.[productId] ||
        stock?.[String(productId)] ||
        stock?.products?.[productId];

      return getStockValue(direct);
    }

    const found = stock.find((item) => {
      const id =
        item?.product_id ??
        item?.productId ??
        item?.id ??
        item?.key_product_id;

      return String(id) === String(productId);
    });

    return getStockValue(found);
  }

  function getCategoryStock(categoryId) {
    const categoryProducts = products.filter((product) => {
      const productCategory =
        product?.category_id ??
        product?.categoryId ??
        product?.category;

      return String(productCategory) === String(categoryId);
    });

    return categoryProducts.reduce(
      (total, product) => total + getProductStock(product.id),
      0
    );
  }

  function handleBuyClick(product) {
    const productStock = getProductStock(product?.id);

    if (productStock <= 0) {
      setMessage("Sản phẩm này hiện đã hết KEY.");
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    setMessage("");
    setBuyModal({
      product,
      stock: productStock,
    });
  }

  async function confirmBuy() {
    if (!buyModal?.product || buying) return;

    const product = buyModal.product;
    const price = getProductPrice(product);
    const currentStock = getProductStock(product.id);

    if (!user) {
      setBuyModal(null);
      router.push("/login");
      return;
    }

    if (currentStock <= 0) {
      setBuyModal(null);
      setMessage("Sản phẩm này vừa hết KEY.");
      return;
    }

    if (wallet < price) {
      setBuyModal(null);
      setMessage(
        `Số dư không đủ. Bạn cần ${formatPrice(
          price
        )}, hiện có ${formatPrice(wallet)}.`
      );
      return;
    }

    setBuying(true);
    setMessage("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        setBuyModal(null);
        router.push("/login");
        return;
      }

      const response = await fetch("/api/buy-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
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
            "Mua KEY thất bại. Vui lòng thử lại."
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
        key,
        product,
      });

      await loadShop();
    } catch (buyError) {
      console.error("Buy key error:", buyError);
      setMessage(buyError?.message || "Không thể mua KEY.");
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
      setMessage("Không thể tự động sao chép KEY.");
    }
  }

  function goDeposit() {
    router.push("/deposit");
  }

  function goHome() {
    router.push("/");
  }

  function go(path) {
    router.push(path);
  }

  return (
    <>
      <div className="page">
        <header className="topbar">
          <div className="topbar-inner">
            <button className="brand" onClick={goHome}>
              <div className="brand-logo">X</div>

              <div className="brand-text">
                <strong>XENOVA</strong>
                <span>PLAY</span>
              </div>
            </button>

            <nav className="desktop-nav">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.path}
                  className={item.path === "/shop" ? "nav-active" : ""}
                  onClick={() => go(item.path)}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="top-actions">
              <button className="wallet-button" onClick={goDeposit}>
                <span className="wallet-icon">₫</span>
                <span>{formatPrice(wallet)}</span>
              </button>

              <button
                className="avatar-button"
                onClick={() => go(user ? "/account" : "/login")}
              >
                {user?.email?.charAt(0)?.toUpperCase() || "U"}
              </button>
            </div>
          </div>
        </header>

        <main className="container">
          <section className="hero">
            <div className="hero-content">
              <div className="hero-small">XENOVA PLAY</div>

              <h1>
                CỬA HÀNG
                <br />
                <span>KEY PREMIUM</span>
              </h1>

              <p>
                Mua KEY nhanh chóng, thanh toán bằng số dư tài khoản và nhận
                KEY ngay sau khi giao dịch thành công.
              </p>

              <div className="hero-buttons">
                <button className="hero-primary" onClick={goDeposit}>
                  <span>+</span>
                  NẠP TIỀN
                </button>

                <button className="hero-secondary" onClick={() => go("/keys")}>
                  KEY CỦA TÔI
                </button>
              </div>
            </div>

            <div className="hero-image-box">
              <img
                src={SAMPLE_IMAGE}
                alt="XENOVA PLAY"
                className="hero-image"
              />

              <div className="hero-glow" />
            </div>
          </section>

          {message && (
            <div className="message-box">
              <span>{message}</span>

              <button onClick={() => setMessage("")}>×</button>
            </div>
          )}

          {error && (
            <div className="error-box">
              <strong>Không thể tải cửa hàng</strong>
              <span>{error}</span>

              <button onClick={loadShop}>Thử lại</button>
            </div>
          )}

          <section className="shop-layout">
            <aside className="sidebar">
              <div className="side-card">
                <div className="side-title">
                  <span className="pink-dot" />
                  DANH MỤC
                </div>

                <button
                  className={`category-item ${
                    selectedCategory === "all" ? "category-active" : ""
                  }`}
                  onClick={() => setSelectedCategory("all")}
                >
                  <span className="category-icon">◈</span>
                  <span>Tất cả sản phẩm</span>
                  <small>{products.length}</small>
                </button>

                {categories.map((category) => {
                  const categoryId = category?.id ?? category?.slug;
                  const categoryName =
                    category?.name ||
                    category?.title ||
                    category?.category_name ||
                    "Danh mục";

                  return (
                    <button
                      key={String(categoryId)}
                      className={`category-item ${
                        String(selectedCategory) === String(categoryId)
                          ? "category-active"
                          : ""
                      }`}
                      onClick={() => setSelectedCategory(categoryId)}
                    >
                      <span className="category-icon">
                        {normalize(categoryName).includes("iphone") ||
                        normalize(categoryName).includes("ios")
                          ? ""
                          : normalize(categoryName).includes("android")
                          ? "◆"
                          : normalize(categoryName).includes("pc")
                          ? "▣"
                          : "◇"}
                      </span>

                      <span>{categoryName}</span>

                      <small>{getCategoryStock(categoryId)}</small>
                    </button>
                  );
                })}
              </div>

              <div className="vip-card">
                <div className="vip-icon">♛</div>

                <div>
                  <strong>VIP MEMBER</strong>
                  <p>Ưu đãi dành cho thành viên</p>
                </div>
              </div>

              <div className="support-card">
                <div className="support-icon">?</div>

                <div>
                  <strong>CẦN HỖ TRỢ?</strong>
                  <p>Liên hệ Admin nếu cần hỗ trợ</p>
                </div>

                <a
                  href="https://zalo.me/84365717262"
                  target="_blank"
                  rel="noreferrer"
                >
                  CHAT ADMIN
                </a>
              </div>
            </aside>

            <section className="products-section">
              <div className="section-heading">
                <div>
                  <div className="section-kicker">XENOVA STORE</div>
                  <h2>
                    {selectedCategory === "all"
                      ? "Tất cả sản phẩm"
                      : categories.find(
                          (category) =>
                            String(category?.id ?? category?.slug) ===
                            String(selectedCategory)
                        )?.name || "Sản phẩm"}
                  </h2>
                </div>

                <div className="product-count">
                  {visibleProducts.length} sản phẩm
                </div>
              </div>

              {loading ? (
                <div className="product-grid">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <ProductSkeleton key={index} />
                  ))}
                </div>
              ) : visibleProducts.length > 0 ? (
                <div className="product-grid">
                  {visibleProducts.map((product) => (
                    <ProductCard
                      key={String(product.id)}
                      product={product}
                      stock={getProductStock(product.id)}
                      onBuy={handleBuyClick}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-products">
                  <div className="empty-icon">⌁</div>
                  <h3>Chưa có sản phẩm</h3>
                  <p>Danh mục này hiện chưa có sản phẩm.</p>

                  <button onClick={() => setSelectedCategory("all")}>
                    XEM TẤT CẢ
                  </button>
                </div>
              )}
            </section>
          </section>

          <section className="quick-section">
            <div className="quick-card">
              <div className="quick-icon">₫</div>

              <div>
                <strong>Nạp tiền nhanh</strong>
                <span>Nạp tiền vào ví để mua KEY</span>
              </div>

              <button onClick={goDeposit}>NẠP TIỀN</button>
            </div>

            <div className="quick-card">
              <div className="quick-icon">⌁</div>

              <div>
                <strong>KEY của tôi</strong>
                <span>Xem các KEY đã mua</span>
              </div>

              <button onClick={() => go("/keys")}>XEM KEY</button>
            </div>

            <div className="quick-card">
              <div className="quick-icon">◷</div>

              <div>
                <strong>Lịch sử đơn hàng</strong>
                <span>Kiểm tra giao dịch đã mua</span>
              </div>

              <button onClick={() => go("/orders")}>XEM ĐƠN</button>
            </div>
          </section>
        </main>

        <a
          href="https://zalo.me/84365717262"
          target="_blank"
          rel="noreferrer"
          className="floating-chat"
        >
          <span>💬</span>
          <div>
            <strong>Chat Admin</strong>
            <small>Hỗ trợ trực tuyến</small>
          </div>
        </a>

        <nav className="mobile-nav">
          {NAV_ITEMS.slice(0, 5).map((item) => (
            <button
              key={item.path}
              className={item.path === "/shop" ? "mobile-active" : ""}
              onClick={() => go(item.path)}
            >
              <span>
                {item.path === "/"
                  ? "⌂"
                  : item.path === "/shop"
                  ? "▣"
                  : item.path === "/deposit"
                  ? "₫"
                  : item.path === "/keys"
                  ? "⌁"
                  : "◷"}
              </span>

              <small>{item.label}</small>
            </button>
          ))}
        </nav>
      </div>

      {buyModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!buying) setBuyModal(null);
          }}
        >
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => !buying && setBuyModal(null)}
            >
              ×
            </button>

            <div className="modal-icon">🛒</div>

            <div className="modal-kicker">XENOVA STORE</div>

            <h3>Xác nhận mua KEY</h3>

            <p className="modal-product">
              {getProductName(buyModal.product)}
            </p>

            <div className="confirm-info">
              <div>
                <span>Giá sản phẩm</span>
                <strong>
                  {formatPrice(getProductPrice(buyModal.product))}
                </strong>
              </div>

              <div>
                <span>Số dư hiện tại</span>
                <strong>{formatPrice(wallet)}</strong>
              </div>

              <div>
                <span>Tồn kho</span>
                <strong>{buyModal.stock} KEY</strong>
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

      {successModal && (
        <div className="modal-overlay">
          <div className="modal success-modal">
            <button
              className="modal-close"
              onClick={() => setSuccessModal(null)}
            >
              ×
            </button>

            <div className="success-icon">✓</div>

            <div className="modal-kicker">GIAO DỊCH THÀNH CÔNG</div>

            <h3>Mua KEY thành công</h3>

            <p className="modal-product">
              {getProductName(successModal.product)}
            </p>

            {successModal.key ? (
              <>
                <div className="key-box">
                  <span>KEY CỦA BẠN</span>
                  <strong>{successModal.key}</strong>
                </div>

                <button className="copy-button" onClick={copyKey}>
                  SAO CHÉP KEY
                </button>
              </>
            ) : (
              <div className="key-box">
                <span>Đơn hàng đã được xử lý</span>
                <strong>Vui lòng kiểm tra mục KEY của tôi</strong>
              </div>
            )}

            <button
              className="done-button"
              onClick={() => {
                setSuccessModal(null);
                go("/keys");
              }}
            >
              XEM KEY CỦA TÔI
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #fff8fc;
          color: #29202a;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        button,
        input {
          font: inherit;
        }

        button {
          border: 0;
          cursor: pointer;
        }

        a {
          text-decoration: none;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 10% 0%,
              rgba(255, 105, 170, 0.1),
              transparent 30%
            ),
            radial-gradient(
              circle at 90% 15%,
              rgba(255, 190, 225, 0.18),
              transparent 28%
            ),
            #fff8fc;
          padding-bottom: 40px;
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(18px);
          border-bottom: 1px solid #f4dce9;
        }

        .topbar-inner {
          width: min(1400px, calc(100% - 32px));
          min-height: 76px;
          margin: auto;
          display: flex;
          align-items: center;
          gap: 28px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          background: transparent;
          padding: 0;
          color: #231a24;
          flex-shrink: 0;
        }

        .brand-logo {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: linear-gradient(145deg, #ff5ca8, #ff2f87);
          color: white;
          font-size: 21px;
          font-weight: 900;
          box-shadow: 0 9px 25px rgba(255, 47, 135, 0.25);
        }

        .brand-text {
          display: flex;
          flex-direction: column;
          line-height: 0.9;
          text-align: left;
        }

        .brand-text strong {
          font-size: 18px;
          letter-spacing: 0.04em;
        }

        .brand-text span {
          color: #ff4a9a;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.2em;
          margin-left: 1px;
        }

        .desktop-nav {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
        }

        .desktop-nav button {
          background: transparent;
          color: #756a74;
          padding: 11px 13px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          transition: 0.2s ease;
        }

        .desktop-nav button:hover {
          color: #ff3d91;
          background: #fff1f8;
        }

        .desktop-nav .nav-active {
          color: #ff318a;
          background: #fff0f7;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .wallet-button {
          height: 42px;
          padding: 0 15px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #ec277f;
          background: #fff0f7;
          border: 1px solid #ffd4e9;
          border-radius: 12px;
          font-weight: 800;
          font-size: 13px;
        }

        .wallet-icon {
          width: 24px;
          height: 24px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: #ff3f92;
          color: white;
          font-size: 12px;
        }

        .avatar-button {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          color: white;
          background: linear-gradient(145deg, #ff6cb1, #ff2d88);
          font-weight: 900;
          box-shadow: 0 8px 20px rgba(255, 45, 136, 0.22);
        }

        .container {
          width: min(1400px, calc(100% - 32px));
          margin: auto;
        }

        .hero {
          min-height: 330px;
          margin-top: 28px;
          border: 1px solid #f6d7e8;
          border-radius: 26px;
          overflow: hidden;
          position: relative;
          display: flex;
          align-items: center;
          background:
            linear-gradient(
              110deg,
              rgba(255, 255, 255, 0.98),
              rgba(255, 241, 248, 0.94)
            );
          box-shadow: 0 20px 60px rgba(82, 37, 63, 0.07);
        }

        .hero-content {
          width: 55%;
          padding: 48px 52px;
          position: relative;
          z-index: 2;
        }

        .hero-small {
          display: inline-flex;
          padding: 7px 12px;
          border-radius: 999px;
          color: #ed3c8e;
          background: #fff0f7;
          border: 1px solid #ffd2e8;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .hero h1 {
          margin: 18px 0 12px;
          font-size: clamp(36px, 4vw, 62px);
          line-height: 0.98;
          letter-spacing: -0.045em;
        }

        .hero h1 span {
          color: #ff3b91;
        }

        .hero p {
          max-width: 570px;
          margin: 0;
          color: #786d76;
          font-size: 14px;
          line-height: 1.7;
        }

        .hero-buttons {
          display: flex;
          gap: 10px;
          margin-top: 24px;
        }

        .hero-primary,
        .hero-secondary {
          height: 44px;
          padding: 0 18px;
          border-radius: 11px;
          font-size: 12px;
          font-weight: 900;
        }

        .hero-primary {
          display: flex;
          gap: 8px;
          align-items: center;
          background: #ff3d91;
          color: white;
          box-shadow: 0 12px 25px rgba(255, 61, 145, 0.23);
        }

        .hero-primary span {
          font-size: 17px;
        }

        .hero-secondary {
          color: #ee3a8c;
          background: white;
          border: 1px solid #ffd1e5;
        }

        .hero-image-box {
          position: absolute;
          right: 0;
          top: 0;
          width: 48%;
          height: 100%;
          overflow: hidden;
        }

        .hero-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.92;
          mask-image: linear-gradient(to right, transparent 0%, black 35%);
          -webkit-mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 35%
          );
        }

        .hero-glow {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(
              circle at 70% 50%,
              rgba(255, 70, 151, 0.18),
              transparent 45%
            ),
            linear-gradient(to right, #fff1f8 0%, transparent 45%);
          pointer-events: none;
        }

        .message-box,
        .error-box {
          margin-top: 18px;
          padding: 13px 16px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          font-weight: 700;
        }

        .message-box {
          color: #c12c70;
          background: #fff0f7;
          border: 1px solid #ffd2e6;
        }

        .error-box {
          color: #a82f55;
          background: #fff1f4;
          border: 1px solid #ffd1dd;
        }

        .error-box span {
          color: #765e68;
          font-weight: 500;
          flex: 1;
        }

        .message-box span {
          flex: 1;
        }

        .message-box button {
          background: transparent;
          color: #b52b6b;
          font-size: 20px;
        }

        .error-box button {
          margin-left: auto;
          background: #ff4c88;
          color: white;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 900;
        }

        .shop-layout {
          margin-top: 28px;
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr);
          gap: 24px;
          align-items: start;
        }

        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .side-card {
          padding: 14px;
          border-radius: 18px;
          background: white;
          border: 1px solid #f1dbe7;
          box-shadow: 0 12px 35px rgba(86, 43, 67, 0.05);
        }

        .side-title {
          padding: 8px 9px 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #5b4c57;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .pink-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ff3d91;
          box-shadow: 0 0 0 5px #fff0f7;
        }

        .category-item {
          width: 100%;
          min-height: 47px;
          padding: 0 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: transparent;
          border-radius: 11px;
          color: #766a74;
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          transition: 0.2s ease;
        }

        .category-item:hover {
          color: #f03388;
          background: #fff4f9;
        }

        .category-item small {
          margin-left: auto;
          min-width: 24px;
          text-align: center;
          color: #a696a1;
          font-size: 10px;
        }

        .category-icon {
          width: 27px;
          height: 27px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: #faf2f7;
          color: #ef4a96;
          font-size: 12px;
        }

        .category-active {
          color: #ed3388;
          background: #fff0f7;
        }

        .category-active .category-icon {
          color: white;
          background: #ff4194;
        }

        .vip-card,
        .support-card {
          border-radius: 18px;
          padding: 17px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .vip-card {
          background: linear-gradient(135deg, #ff3f92, #ff75b5);
          color: white;
          box-shadow: 0 15px 35px rgba(255, 61, 145, 0.2);
        }

        .vip-icon,
        .support-icon {
          width: 39px;
          height: 39px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 12px;
          font-weight: 900;
        }

        .vip-icon {
          background: rgba(255, 255, 255, 0.2);
          font-size: 19px;
        }

        .vip-card strong,
        .support-card strong {
          display: block;
          font-size: 12px;
        }

        .vip-card p,
        .support-card p {
          margin: 4px 0 0;
          font-size: 10px;
          opacity: 0.8;
        }

        .support-card {
          background: white;
          border: 1px solid #f1dbe7;
          flex-wrap: wrap;
        }

        .support-icon {
          color: #f03d8c;
          background: #fff0f7;
        }

        .support-card a {
          width: 100%;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          color: white;
          background: #ff4194;
          font-size: 10px;
          font-weight: 900;
          margin-top: 3px;
        }

        .products-section {
          min-width: 0;
        }

        .section-heading {
          min-height: 55px;
          display: flex;
          justify-content: space-between;
          align-items: end;
          margin-bottom: 15px;
        }

        .section-kicker {
          color: #ee4a96;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.14em;
          margin-bottom: 5px;
        }

        .section-heading h2 {
          margin: 0;
          color: #2c222b;
          font-size: 25px;
          letter-spacing: -0.025em;
        }

        .product-count {
          color: #a0929c;
          font-size: 11px;
          font-weight: 700;
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .product-card {
          min-width: 0;
          overflow: hidden;
          border-radius: 17px;
          background: white;
          border: 1px solid #f1dbe7;
          box-shadow: 0 12px 35px rgba(86, 43, 67, 0.05);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .product-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 45px rgba(86, 43, 67, 0.09);
        }

        .product-image-wrap {
          height: 160px;
          position: relative;
          overflow: hidden;
          background: #fff1f8;
        }

        .product-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform 0.35s ease;
        }

        .product-card:hover .product-image {
          transform: scale(1.04);
        }

        .product-badge,
        .stock-badge {
          position: absolute;
          top: 10px;
          padding: 6px 8px;
          border-radius: 7px;
          font-size: 9px;
          font-weight: 900;
          backdrop-filter: blur(8px);
        }

        .product-badge {
          left: 10px;
          color: #e72f82;
          background: rgba(255, 255, 255, 0.9);
        }

        .stock-badge {
          right: 10px;
          color: white;
        }

        .stock-badge.in-stock {
          background: rgba(39, 174, 111, 0.9);
        }

        .stock-badge.out-stock {
          background: rgba(100, 91, 97, 0.88);
        }

        .product-content {
          padding: 14px;
        }

        .product-title {
          color: #30252e;
          font-size: 14px;
          font-weight: 900;
          line-height: 1.35;
          min-height: 38px;
        }

        .product-duration {
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 5px;
          color: #ef4b96;
          font-size: 10px;
          font-weight: 800;
        }

        .product-description {
          margin-top: 7px;
          min-height: 31px;
          color: #9a8d96;
          font-size: 10px;
          line-height: 1.45;
        }

        .product-bottom {
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid #f5e6ee;
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 8px;
        }

        .price-label {
          color: #aaa0a7;
          font-size: 9px;
          margin-bottom: 2px;
        }

        .product-price {
          color: #ef3288;
          font-size: 17px;
          font-weight: 950;
        }

        .buy-button {
          min-width: 92px;
          height: 36px;
          padding: 0 10px;
          border-radius: 9px;
          color: white;
          background: #ff3e91;
          font-size: 9px;
          font-weight: 900;
          box-shadow: 0 8px 18px rgba(255, 62, 145, 0.2);
        }

        .buy-button:hover {
          background: #f32f85;
        }

        .buy-button:disabled {
          cursor: not-allowed;
          color: #aaa0a7;
          background: #f0ebee;
          box-shadow: none;
        }

        .empty-products {
          min-height: 300px;
          border: 1px dashed #edccdc;
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.65);
          text-align: center;
        }

        .empty-icon {
          width: 60px;
          height: 60px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #ef4a96;
          background: #fff0f7;
          font-size: 26px;
        }

        .empty-products h3 {
          margin: 14px 0 5px;
          font-size: 16px;
        }

        .empty-products p {
          margin: 0;
          color: #9b9098;
          font-size: 12px;
        }

        .empty-products button {
          margin-top: 17px;
          padding: 10px 15px;
          border-radius: 9px;
          color: white;
          background: #ff3f92;
          font-size: 10px;
          font-weight: 900;
        }

        .quick-section {
          margin-top: 24px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .quick-card {
          padding: 17px;
          border-radius: 16px;
          background: white;
          border: 1px solid #f1dbe7;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .quick-icon {
          width: 39px;
          height: 39px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 11px;
          color: #ed3c8d;
          background: #fff0f7;
          font-weight: 900;
        }

        .quick-card div:nth-child(2) {
          flex: 1;
          min-width: 0;
        }

        .quick-card strong,
        .quick-card span {
          display: block;
        }

        .quick-card strong {
          color: #40333d;
          font-size: 11px;
        }

        .quick-card span {
          margin-top: 3px;
          color: #9d929a;
          font-size: 9px;
        }

        .quick-card button {
          height: 32px;
          padding: 0 10px;
          border-radius: 8px;
          color: #ed388b;
          background: #fff0f7;
          font-size: 9px;
          font-weight: 900;
        }

        .floating-chat {
          position: fixed;
          right: 22px;
          bottom: 22px;
          z-index: 45;
          min-width: 155px;
          padding: 10px 13px;
          display: flex;
          align-items: center;
          gap: 9px;
          border-radius: 14px;
          color: white;
          background: #ff3d91;
          box-shadow: 0 13px 30px rgba(255, 61, 145, 0.3);
        }

        .floating-chat > span {
          font-size: 20px;
        }

        .floating-chat strong,
        .floating-chat small {
          display: block;
        }

        .floating-chat strong {
          font-size: 11px;
        }

        .floating-chat small {
          margin-top: 2px;
          opacity: 0.78;
          font-size: 8px;
        }

        .mobile-nav {
          display: none;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          padding: 20px;
          display: grid;
          place-items: center;
          background: rgba(40, 23, 35, 0.58);
          backdrop-filter: blur(8px);
        }

        .modal {
          width: min(430px, 100%);
          position: relative;
          padding: 28px;
          border-radius: 23px;
          background: white;
          border: 1px solid #f2d9e6;
          box-shadow: 0 30px 90px rgba(44, 23, 37, 0.2);
          text-align: center;
        }

        .modal-close {
          position: absolute;
          top: 13px;
          right: 14px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          color: #8e7e88;
          background: #f8f1f5;
          font-size: 19px;
        }

        .modal-icon,
        .success-icon {
          width: 57px;
          height: 57px;
          margin: 0 auto 12px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          font-size: 25px;
        }

        .modal-icon {
          background: #fff0f7;
        }

        .success-icon {
          color: white;
          background: #30ba78;
          box-shadow: 0 10px 25px rgba(48, 186, 120, 0.2);
          font-weight: 900;
        }

        .modal-kicker {
          color: #ef3c8e;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.14em;
        }

        .modal h3 {
          margin: 7px 0 5px;
          color: #30252e;
          font-size: 22px;
        }

        .modal-product {
          margin: 0;
          color: #8c8089;
          font-size: 12px;
        }

        .confirm-info {
          margin-top: 20px;
          border-radius: 13px;
          overflow: hidden;
          border: 1px solid #f1e0e9;
        }

        .confirm-info div {
          padding: 11px 13px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid #f4e6ed;
        }

        .confirm-info div:last-child {
          border-bottom: 0;
        }

        .confirm-info span {
          color: #988b94;
          font-size: 10px;
        }

        .confirm-info strong {
          color: #3e323b;
          font-size: 11px;
        }

        .modal-actions {
          margin-top: 16px;
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 9px;
        }

        .cancel-button,
        .confirm-button,
        .copy-button,
        .done-button {
          height: 43px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 900;
        }

        .cancel-button {
          color: #766a73;
          background: #f5f0f3;
        }

        .confirm-button,
        .done-button,
        .copy-button {
          color: white;
          background: #ff3d91;
        }

        .confirm-button:disabled {
          cursor: wait;
          opacity: 0.6;
        }

        .key-box {
          margin-top: 20px;
          padding: 15px;
          border-radius: 13px;
          border: 1px dashed #f3a4c9;
          background: #fff6fa;
          text-align: left;
        }

        .key-box span {
          display: block;
          color: #b397a5;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .key-box strong {
          display: block;
          margin-top: 7px;
          color: #df2f80;
          font-size: 14px;
          line-height: 1.45;
          word-break: break-all;
        }

        .copy-button {
          width: 100%;
          margin-top: 10px;
        }

        .done-button {
          width: 100%;
          margin-top: 9px;
        }

        .skeleton {
          background: linear-gradient(
            90deg,
            #f6eef3,
            #fff,
            #f6eef3
          );
          background-size: 200% 100%;
          animation: skeleton 1.4s infinite;
        }

        .skeleton-card {
          overflow: hidden;
        }

        .skeleton-image {
          height: 160px;
        }

        .skeleton-content {
          padding: 15px;
        }

        .skeleton-title {
          width: 70%;
          height: 17px;
          border-radius: 5px;
        }

        .skeleton-line {
          width: 90%;
          height: 10px;
          margin-top: 12px;
          border-radius: 5px;
        }

        .skeleton-line.short {
          width: 55%;
        }

        .skeleton-button {
          width: 100%;
          height: 35px;
          margin-top: 18px;
          border-radius: 8px;
        }

        @keyframes skeleton {
          from {
            background-position: 200% 0;
          }

          to {
            background-position: -200% 0;
          }
        }

        @media (max-width: 1100px) {
          .desktop-nav {
            display: none;
          }

          .topbar-inner {
            justify-content: space-between;
          }

          .shop-layout {
            grid-template-columns: 220px minmax(0, 1fr);
          }

          .product-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .quick-section {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .page {
            padding-bottom: 82px;
          }

          .topbar-inner,
          .container {
            width: min(100% - 20px, 1400px);
          }

          .topbar-inner {
            min-height: 66px;
          }

          .wallet-button {
            padding: 0 10px;
          }

          .wallet-button span:last-child {
            display: none;
          }

          .hero {
            min-height: 430px;
            margin-top: 14px;
            display: block;
          }

          .hero-content {
            width: 100%;
            padding: 30px 24px;
          }

          .hero h1 {
            font-size: 40px;
          }

          .hero-image-box {
            top: auto;
            bottom: 0;
            width: 100%;
            height: 46%;
          }

          .hero-image {
            mask-image: linear-gradient(to bottom, transparent 0%, black 35%);
            -webkit-mask-image: linear-gradient(
              to bottom,
              transparent 0%,
              black 35%
            );
          }

          .hero-glow {
            background: linear-gradient(to bottom, #fff1f8 0%, transparent 65%);
          }

          .shop-layout {
            margin-top: 18px;
            display: block;
          }

          .sidebar {
            margin-bottom: 20px;
          }

          .side-card {
            overflow-x: auto;
            display: flex;
            gap: 6px;
            padding: 9px;
          }

          .side-title {
            display: none;
          }

          .category-item {
            min-width: max-content;
            min-height: 40px;
            padding: 0 9px;
          }

          .category-item small {
            display: none;
          }

          .vip-card,
          .support-card {
            display: none;
          }

          .section-heading h2 {
            font-size: 21px;
          }

          .product-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .product-image-wrap {
            height: 125px;
          }

          .product-content {
            padding: 11px;
          }

          .product-title {
            font-size: 12px;
          }

          .product-description {
            font-size: 9px;
          }

          .product-price {
            font-size: 14px;
          }

          .buy-button {
            min-width: 70px;
            height: 32px;
            font-size: 8px;
          }

          .quick-section {
            display: none;
          }

          .floating-chat {
            right: 12px;
            bottom: 75px;
          }

          .mobile-nav {
            position: fixed;
            left: 8px;
            right: 8px;
            bottom: 8px;
            z-index: 60;
            min-height: 62px;
            padding: 6px;
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 3px;
            border: 1px solid #f0d8e5;
            border-radius: 17px;
            background: rgba(255, 255, 255, 0.94);
            backdrop-filter: blur(15px);
            box-shadow: 0 15px 40px rgba(61, 29, 48, 0.13);
          }

          .mobile-nav button {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            border-radius: 11px;
            color: #968a93;
            background: transparent;
          }

          .mobile-nav button span {
            font-size: 17px;
          }

          .mobile-nav button small {
            font-size: 8px;
            font-weight: 700;
          }

          .mobile-nav .mobile-active {
            color: #ef3589;
            background: #fff0f7;
          }
        }

        @media (max-width: 430px) {
          .brand-text {
            display: none;
          }

          .hero-buttons {
            position: relative;
            z-index: 3;
          }

          .hero-primary,
          .hero-secondary {
            padding: 0 13px;
            font-size: 10px;
          }

          .product-card {
            border-radius: 13px;
          }

          .product-image-wrap {
            height: 112px;
          }

          .product-bottom {
            display: block;
          }

          .buy-button {
            width: 100%;
            margin-top: 9px;
          }

          .modal {
            padding: 23px 18px;
          }
        }
      `}</style>
    </>
  );
}
