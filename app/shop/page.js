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

const CATEGORY_ICONS = {
  all: "✦",
  android: "◈",
  iphone: "⌁",
  ios: "⌁",
  pc: "▣",
  other: "◆",
};

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getProductType(product) {
  const text = normalize(
    [
      product?.name,
      product?.title,
      product?.category,
      product?.type,
      product?.platform,
      product?.device,
    ].join(" ")
  );

  if (
    text.includes("android") ||
    text.includes("adr")
  ) {
    return "android";
  }

  if (
    text.includes("iphone") ||
    text.includes("ios")
  ) {
    return "iphone";
  }

  if (
    text.includes("pc") ||
    text.includes("windows")
  ) {
    return "pc";
  }

  return "other";
}

function formatPrice(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN").format(number) + "đ";
}

function formatDuration(product) {
  if (!product) return "";

  const duration =
    product.duration ??
    product.duration_days ??
    product.days ??
    product.expire_days ??
    product.valid_days;

  if (duration) {
    const days = Number(duration);

    if (days === 1) return "1 ngày";
    if (days === 7) return "7 ngày";
    if (days === 30) return "30 ngày";

    return `${days} ngày`;
  }

  const text = String(
    product.duration_text ||
      product.duration_label ||
      product.description ||
      ""
  );

  return text;
}

function getProductImage(product) {
  return (
    product?.image_url ||
    product?.image ||
    product?.thumbnail ||
    product?.cover ||
    product?.avatar ||
    ""
  );
}

function getStock(stock, product) {
  if (!stock || !product) return 0;

  const id = String(product.id);

  if (Array.isArray(stock)) {
    const item = stock.find(
      (row) =>
        String(row.product_id ?? row.id ?? "") === id
    );

    if (!item) return 0;

    return Number(
      item.stock ??
        item.quantity ??
        item.available ??
        item.count ??
        0
    );
  }

  if (typeof stock === "object") {
    const item = stock[id];

    if (typeof item === "number") {
      return item;
    }

    if (item && typeof item === "object") {
      return Number(
        item.stock ??
          item.quantity ??
          item.available ??
          item.count ??
          0
      );
    }
  }

  return 0;
}

function ProductIcon({ type }) {
  const icon = CATEGORY_ICONS[type] || CATEGORY_ICONS.other;

  return (
    <div className={`product-icon icon-${type}`}>
      <span>{icon}</span>
    </div>
  );
}

function ProductCard({ product, stock, onBuy }) {
  const quantity = getStock(stock, product);
  const type = getProductType(product);
  const image = getProductImage(product);

  return (
    <div className="product-card">
      <div className="product-cover">
        {image ? (
          <img
            src={image}
            alt={product.name || product.title || "XENOVA"}
            className="product-image"
          />
        ) : (
          <ProductIcon type={type} />
        )}

        <div
          className={`stock-badge ${
            quantity > 0 ? "stock-ok" : "stock-out"
          }`}
        >
          {quantity > 0 ? `Còn ${quantity}` : "Hết hàng"}
        </div>
      </div>

      <div className="product-body">
        <div className="product-type">
          {type === "android"
            ? "ANDROID"
            : type === "iphone"
            ? "IPHONE"
            : type === "pc"
            ? "PC"
            : "KEY"}
        </div>

        <h3>
          {product.name ||
            product.title ||
            "Sản phẩm XENOVA"}
        </h3>

        <div className="product-info">
          <span>
            {formatDuration(product) || "KEY bản quyền"}
          </span>
          <span>•</span>
          <span>
            {quantity > 0 ? "Có sẵn" : "Tạm hết"}
          </span>
        </div>

        <div className="product-bottom">
          <div className="price">
            {formatPrice(
              product.price ??
                product.sell_price ??
                product.amount
            )}
          </div>

          <button
            className="buy-button"
            disabled={quantity <= 0}
            onClick={() => onBuy(product)}
          >
            {quantity > 0 ? "Mua ngay" : "Hết hàng"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="product-card skeleton-card">
      <div className="skeleton skeleton-cover" />
      <div className="skeleton-body">
        <div className="skeleton skeleton-line small" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line medium" />
        <div className="skeleton skeleton-button" />
      </div>
    </div>
  );
}

export default function ShopPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stock, setStock] = useState({});
  const [wallet, setWallet] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("all");

  const [search, setSearch] = useState("");

  const [buyModal, setBuyModal] = useState(null);
  const [successModal, setSuccessModal] = useState(null);
  const [buying, setBuying] = useState(false);

  const [darkMode, setDarkMode] = useState(false);

  async function loadWallet(currentUser) {
    if (!currentUser?.id) {
      setWallet(0);
      return;
    }

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
          data?.wallet_balance ??
          0
      )
    );
  }

  async function loadShop() {
    setLoading(true);
    setError("");

    try {
      const [catalogResponse, stockResponse] =
        await Promise.all([
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

      const catalog =
        catalogData?.products ||
        catalogData?.data ||
        catalogData?.catalog ||
        [];

      setProducts(
        Array.isArray(catalog) ? catalog : []
      );

      const categoryData =
        catalogData?.categories || [];

      setCategories(
        Array.isArray(categoryData)
          ? categoryData
          : []
      );

      if (stockResponse.ok) {
        const stockData = await stockResponse.json();

        setStock(
          stockData?.stock ??
            stockData?.data ??
            stockData ??
            {}
        );
      }
    } catch (err) {
      setError(
        err?.message ||
          "Không thể tải cửa hàng."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setUser(session?.user || null);

      if (session?.user) {
        await loadWallet(session.user);
      }

      await loadShop();
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        setUser(session?.user || null);

        if (session?.user) {
          await loadWallet(session.user);
        } else {
          setWallet(0);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const categoryList = useMemo(() => {
    const result = [
      {
        id: "all",
        name: "Tất cả sản phẩm",
        count: products.length,
      },
    ];

    const seen = new Set(["all"]);

    for (const product of products) {
      const type = getProductType(product);

      if (seen.has(type)) continue;

      seen.add(type);

      const count = products.filter(
        (item) => getProductType(item) === type
      ).length;

      result.push({
        id: type,
        name:
          type === "android"
            ? "KEY Android"
            : type === "iphone"
            ? "KEY iPhone"
            : type === "pc"
            ? "KEY PC"
            : "Sản phẩm khác",
        count,
      });
    }

    for (const category of categories) {
      if (!category) continue;

      const id = String(
        category.id ??
          category.slug ??
          category.name ??
          ""
      ).toLowerCase();

      if (!id || seen.has(id)) continue;

      result.push({
        id,
        name:
          category.name ||
          category.title ||
          id,
        count: products.filter((product) =>
          normalize(
            product.category ||
              product.category_id
          ).includes(normalize(id))
        ).length,
      });
    }

    return result;
  }, [products, categories]);

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (selectedCategory !== "all") {
      const selected = normalize(
        selectedCategory
      );

      list = list.filter((product) => {
        const type = getProductType(product);

        if (
          selected === "android" ||
          selected === "iphone" ||
          selected === "pc"
        ) {
          return type === selected;
        }

        return normalize(
          product.category ||
            product.category_id ||
            ""
        ).includes(selected);
      });
    }

    const query = normalize(search.trim());

    if (query) {
      list = list.filter((product) =>
        normalize(
          [
            product.name,
            product.title,
            product.category,
            product.type,
            product.platform,
            product.description,
          ].join(" ")
        ).includes(query)
      );
    }

    return list;
  }, [
    products,
    selectedCategory,
    search,
  ]);

  function handleNavigation(path) {
    router.push(path);
  }

  function handleBuy(product) {
    if (!user) {
      router.push("/login?next=/shop");
      return;
    }

    const quantity = getStock(stock, product);

    if (quantity <= 0) {
      return;
    }

    setBuyModal(product);
  }

  async function confirmBuy() {
    if (!buyModal || buying) return;

    if (!user) {
      router.push("/login?next=/shop");
      return;
    }

    const product = buyModal;

    const price = Number(
      product.price ??
        product.sell_price ??
        product.amount ??
        0
    );

    if (wallet < price) {
      setBuyModal(null);
      setError(
        "Số dư ví không đủ. Vui lòng nạp thêm tiền."
      );
      return;
    }

    setBuying(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push("/login?next=/shop");
        return;
      }

      const response = await fetch(
        "/api/buy-key",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            product_id: Number(product.id),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Mua KEY thất bại."
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
        product:
          product.name ||
          product.title ||
          "KEY XENOVA",
      });

      await loadWallet(user);
      await loadShop();
    } catch (err) {
      setError(
        err?.message ||
          "Mua KEY thất bại."
      );
    } finally {
      setBuying(false);
    }
  }

  function getUserName() {
    return (
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split("@")[0] ||
      "Khách"
    );
  }

  return (
    <main className={darkMode ? "xenova dark" : "xenova"}>
      <div className="petals" aria-hidden="true">
        {Array.from({ length: 18 }).map(
          (_, index) => (
            <span
              key={index}
              className={`petal petal-${index + 1}`}
            />
          )
        )}
      </div>

      <header className="topbar">
        <div className="topbar-inner">
          <button
            className="brand"
            onClick={() => handleNavigation("/")}
          >
            <div className="brand-mark">
              X
            </div>

            <div className="brand-text">
              <strong>XENOVA</strong>
              <span>PLAY STORE</span>
            </div>
          </button>

          <nav className="desktop-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.path}
                className={
                  item.path === "/shop"
                    ? "nav-item active"
                    : "nav-item"
                }
                onClick={() =>
                  handleNavigation(item.path)
                }
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="top-actions">
            <button
              className="theme-button"
              onClick={() =>
                setDarkMode((value) => !value)
              }
              title="Đổi giao diện"
            >
              {darkMode ? "☀" : "☾"}
            </button>

            <button
              className="wallet-pill"
              onClick={() =>
                handleNavigation("/deposit")
              }
            >
              <span className="wallet-icon">
                ₫
              </span>
              <span>
                {formatPrice(wallet)}
              </span>
            </button>

            <button
              className="user-pill"
              onClick={() =>
                handleNavigation(
                  user
                    ? "/account"
                    : "/login?next=/shop"
                )
              }
            >
              <span className="avatar">
                {getUserName()
                  .charAt(0)
                  .toUpperCase()}
              </span>

              <span className="user-name">
                {getUserName()}
              </span>
            </button>
          </div>
        </div>
      </header>

      <section className="hero-wrap">
        <div className="hero">
          <div className="hero-glow glow-one" />
          <div className="hero-glow glow-two" />

          <div className="hero-content">
            <div className="hero-tag">
              XENOVA PLAY STORE
            </div>

            <h1>
              MUA KEY
              <br />
              <span>NHANH - AN TOÀN - TỰ ĐỘNG</span>
            </h1>

            <p>
              Kho KEY chính hãng cho Android,
              iPhone và PC.
              <br />
              Thanh toán bằng số dư ví và nhận
              KEY ngay sau khi mua.
            </p>

            <div className="hero-buttons">
              <button
                onClick={() =>
                  handleNavigation("/deposit")
                }
                className="hero-primary"
              >
                Nạp tiền ngay
              </button>

              <button
                onClick={() =>
                  document
                    .getElementById("products")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    })
                }
                className="hero-secondary"
              >
                Xem sản phẩm
              </button>
            </div>
          </div>

          <div className="hero-art">
            <div className="circle circle-one" />
            <div className="circle circle-two" />

            <div className="anime-card">
              <div className="anime-hair" />
              <div className="anime-face">
                <span className="eye left" />
                <span className="eye right" />
                <span className="mouth" />
              </div>
              <div className="anime-body">
                X
              </div>
            </div>

            <div className="floating-card card-a">
              <span>⚡</span>
              <div>
                <b>KEY AUTO</b>
                <small>Nhận KEY tức thì</small>
              </div>
            </div>

            <div className="floating-card card-b">
              <span>✓</span>
              <div>
                <b>AN TOÀN</b>
                <small>Giao dịch bảo mật</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="shop-area" id="products">
        <aside className="sidebar">
          <div className="sidebar-card">
            <div className="side-title">
              <span>☰</span>
              DANH MỤC
            </div>

            <div className="category-list">
              {categoryList.map((category) => (
                <button
                  key={category.id}
                  className={
                    selectedCategory ===
                    category.id
                      ? "category active"
                      : "category"
                  }
                  onClick={() =>
                    setSelectedCategory(
                      category.id
                    )
                  }
                >
                  <span className="category-icon">
                    {CATEGORY_ICONS[
                      category.id
                    ] || "◆"}
                  </span>

                  <span className="category-name">
                    {category.name}
                  </span>

                  <span className="category-count">
                    {category.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="vip-card">
            <div className="vip-star">✦</div>

            <h3>THÀNH VIÊN XENOVA</h3>

            <p>
              Mua KEY nhanh chóng,
              <br />
              quản lý đơn hàng dễ dàng.
            </p>

            <button
              onClick={() =>
                handleNavigation("/account")
              }
            >
              Tài khoản của tôi
            </button>
          </div>

          <div className="support-card">
            <div className="support-icon">
              ?
            </div>

            <div>
              <b>Cần hỗ trợ?</b>
              <span>Liên hệ Admin XENOVA</span>
            </div>

            <button
              onClick={() =>
                window.open(
                  "https://zalo.me/84365717262",
                  "_blank"
                )
              }
            >
              →
            </button>
          </div>
        </aside>

        <section className="products-area">
          <div className="products-heading">
            <div>
              <div className="small-heading">
                XENOVA STORE
              </div>

              <h2>Sản phẩm nổi bật</h2>

              <p>
                Chọn sản phẩm phù hợp với thiết bị
                của bạn.
              </p>
            </div>

            <div className="search-box">
              <span>⌕</span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Tìm sản phẩm..."
              />
            </div>
          </div>

          {error && (
            <div className="error-box">
              <span>!</span>
              <div>{error}</div>
              <button
                onClick={() => setError("")}
              >
                ×
              </button>
            </div>
          )}

          <div className="products-grid">
            {loading ? (
              <>
                <ProductSkeleton />
                <ProductSkeleton />
                <ProductSkeleton />
                <ProductSkeleton />
              </>
            ) : filteredProducts.length === 0 ? (
              <div className="empty-products">
                <div className="empty-icon">
                  ◇
                </div>

                <h3>Không có sản phẩm</h3>

                <p>
                  Không tìm thấy sản phẩm phù hợp.
                </p>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  stock={stock}
                  onBuy={handleBuy}
                />
              ))
            )}
          </div>
        </section>
      </section>

      <section className="quick-services">
        <button
          onClick={() =>
            handleNavigation("/deposit")
          }
          className="service-card"
        >
          <div className="service-icon pink">
            ₫
          </div>
          <div>
            <b>Nạp tiền</b>
            <span>Nạp vào ví XENOVA</span>
          </div>
          <strong>→</strong>
        </button>

        <button
          onClick={() =>
            handleNavigation("/keys")
          }
          className="service-card"
        >
          <div className="service-icon purple">
            🔑
          </div>
          <div>
            <b>KEY của tôi</b>
            <span>Quản lý KEY đã mua</span>
          </div>
          <strong>→</strong>
        </button>

        <button
          onClick={() =>
            handleNavigation("/orders")
          }
          className="service-card"
        >
          <div className="service-icon blue">
            ◷
          </div>
          <div>
            <b>Đơn hàng</b>
            <span>Xem lịch sử mua hàng</span>
          </div>
          <strong>→</strong>
        </button>

        <button
          onClick={() =>
            window.open(
              "https://zalo.me/84365717262",
              "_blank"
            )
          }
          className="service-card"
        >
          <div className="service-icon green">
            Z
          </div>
          <div>
            <b>Chat Admin</b>
            <span>Hỗ trợ qua Zalo</span>
          </div>
          <strong>→</strong>
        </button>
      </section>

      <footer>
        <div className="footer-brand">
          <div className="brand-mark">
            X
          </div>

          <div>
            <b>XENOVA PLAY</b>
            <span>KEY STORE</span>
          </div>
        </div>

        <p>
          © {new Date().getFullYear()} XENOVA
          PLAY. All rights reserved.
        </p>
      </footer>

      <button
        className="floating-chat"
        onClick={() =>
          window.open(
            "https://zalo.me/84365717262",
            "_blank"
          )
        }
      >
        <span>💬</span>
        <b>Chat Admin</b>
      </button>

      {buyModal && (
        <div
          className="modal-backdrop"
          onClick={() =>
            !buying && setBuyModal(null)
          }
        >
          <div
            className="modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="modal-close"
              disabled={buying}
              onClick={() =>
                setBuyModal(null)
              }
            >
              ×
            </button>

            <div className="modal-icon">
              🔑
            </div>

            <div className="modal-label">
              XÁC NHẬN MUA
            </div>

            <h3>
              {buyModal.name ||
                buyModal.title ||
                "KEY XENOVA"}
            </h3>

            <div className="confirm-row">
              <span>Giá sản phẩm</span>
              <b>
                {formatPrice(
                  buyModal.price ??
                    buyModal.sell_price ??
                    buyModal.amount
                )}
              </b>
            </div>

            <div className="confirm-row">
              <span>Số dư hiện tại</span>
              <b>{formatPrice(wallet)}</b>
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
        <div className="modal-backdrop">
          <div className="modal success">
            <div className="success-icon">
              ✓
            </div>

            <div className="modal-label">
              MUA THÀNH CÔNG
            </div>

            <h3>{successModal.product}</h3>

            <p className="success-text">
              KEY của bạn đã được tạo thành công.
            </p>

            <div className="key-box">
              <span>KEY</span>
              <strong>
                {successModal.key ||
                  "KEY đã được lưu trong tài khoản"}
              </strong>
            </div>

            <button
              className="confirm-button full"
              onClick={() => {
                setSuccessModal(null);
                router.push("/keys");
              }}
            >
              Xem KEY của tôi
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
          background: #fff8fb;
          color: #292331;
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
          cursor: pointer;
        }

        .xenova {
          min-height: 100vh;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 90% 12%,
              rgba(255, 180, 211, 0.18),
              transparent 28%
            ),
            #fff8fb;
          position: relative;
        }

        .xenova.dark {
          background: #15121a;
          color: #f8edf4;
        }

        .topbar {
          height: 76px;
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255, 255, 255, 0.92);
          border-bottom: 1px solid #f0e5eb;
          backdrop-filter: blur(18px);
        }

        .dark .topbar {
          background: rgba(27, 23, 31, 0.94);
          border-color: #302933;
        }

        .topbar-inner {
          width: min(1420px, calc(100% - 40px));
          height: 100%;
          margin: auto;
          display: flex;
          align-items: center;
          gap: 26px;
        }

        .brand {
          border: 0;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0;
          color: inherit;
          min-width: 190px;
          text-align: left;
        }

        .brand-mark {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background:
            linear-gradient(
              145deg,
              #ff4f9a,
              #ff7db7
            );
          color: white;
          font-weight: 1000;
          font-size: 22px;
          box-shadow:
            0 8px 22px
              rgba(255, 76, 148, 0.28);
        }

        .brand-text {
          display: flex;
          flex-direction: column;
          line-height: 1.05;
        }

        .brand-text strong {
          font-size: 17px;
          letter-spacing: 1px;
        }

        .brand-text span {
          margin-top: 4px;
          color: #b38c9f;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .desktop-nav {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
        }

        .nav-item {
          border: 0;
          background: transparent;
          color: #786b75;
          font-weight: 700;
          font-size: 13px;
          padding: 11px 12px;
          border-radius: 11px;
          transition: 0.2s;
        }

        .nav-item:hover {
          color: #ef418b;
          background: #fff1f7;
        }

        .nav-item.active {
          color: #ef418b;
          background: #fff0f6;
        }

        .dark .nav-item {
          color: #bcaeba;
        }

        .dark .nav-item.active,
        .dark .nav-item:hover {
          color: #ff72ad;
          background: #30232c;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .theme-button {
          width: 39px;
          height: 39px;
          border: 1px solid #eee1e8;
          border-radius: 12px;
          background: white;
          color: #746672;
        }

        .dark .theme-button {
          background: #28212a;
          border-color: #3b303b;
          color: #ffb5d2;
        }

        .wallet-pill,
        .user-pill {
          border: 1px solid #f0e3e9;
          background: white;
          border-radius: 13px;
          height: 42px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 11px;
          color: #453943;
          font-weight: 800;
        }

        .dark .wallet-pill,
        .dark .user-pill {
          background: #28212a;
          border-color: #3b303b;
          color: #f8eaf1;
        }

        .wallet-icon {
          width: 25px;
          height: 25px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          background: #fff0f6;
          color: #ed438c;
          font-size: 12px;
        }

        .avatar {
          width: 27px;
          height: 27px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          color: white;
          background: linear-gradient(
            135deg,
            #ff589d,
            #a76cff
          );
          font-size: 12px;
        }

        .user-name {
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .hero-wrap {
          width: min(1420px, calc(100% - 40px));
          margin: 26px auto 0;
        }

        .hero {
          min-height: 390px;
          position: relative;
          overflow: hidden;
          border-radius: 28px;
          background:
            radial-gradient(
              circle at 72% 30%,
              rgba(255, 255, 255, 0.9),
              transparent 22%
            ),
            linear-gradient(
              110deg,
              #fff0f7 0%,
              #ffe0ef 48%,
              #f4d8ff 100%
            );
          border: 1px solid #f3dbe6;
          box-shadow:
            0 22px 60px
              rgba(181, 95, 139, 0.13);
        }

        .dark .hero {
          background:
            radial-gradient(
              circle at 72% 30%,
              rgba(255, 120, 181, 0.14),
              transparent 25%
            ),
            linear-gradient(
              110deg,
              #35232f,
              #291e2d
            );
          border-color: #493344;
        }

        .hero-content {
          position: relative;
          z-index: 5;
          padding: 60px 0 55px 68px;
          max-width: 700px;
        }

        .hero-tag,
        .small-heading {
          color: #ef438c;
          font-weight: 900;
          font-size: 11px;
          letter-spacing: 2.4px;
        }

        .hero h1 {
          margin: 15px 0 14px;
          font-size: clamp(35px, 4.3vw, 63px);
          line-height: 0.98;
          letter-spacing: -2.5px;
          color: #2d2430;
        }

        .dark .hero h1 {
          color: #fff0f7;
        }

        .hero h1 span {
          color: #e84288;
        }

        .hero p {
          margin: 0;
          color: #806d78;
          line-height: 1.75;
          font-size: 14px;
          font-weight: 600;
        }

        .dark .hero p {
          color: #cdbac6;
        }

        .hero-buttons {
          display: flex;
          gap: 10px;
          margin-top: 27px;
        }

        .hero-primary,
        .hero-secondary {
          border-radius: 12px;
          padding: 13px 21px;
          font-size: 13px;
          font-weight: 900;
        }

        .hero-primary {
          border: 0;
          color: white;
          background: linear-gradient(
            135deg,
            #f4428c,
            #ff6eaa
          );
          box-shadow:
            0 11px 25px
              rgba(244, 66, 140, 0.26);
        }

        .hero-secondary {
          border: 1px solid #efc9da;
          background: rgba(255, 255, 255, 0.72);
          color: #d83e80;
        }

        .hero-art {
          position: absolute;
          width: 55%;
          height: 100%;
          right: 0;
          top: 0;
        }

        .circle {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(239, 82, 145, 0.18);
        }

        .circle-one {
          width: 360px;
          height: 360px;
          right: 100px;
          top: 18px;
        }

        .circle-two {
          width: 260px;
          height: 260px;
          right: 150px;
          top: 68px;
          background: rgba(255, 255, 255, 0.32);
        }

        .anime-card {
          position: absolute;
          right: 190px;
          bottom: -15px;
          width: 205px;
          height: 300px;
          border-radius: 110px 110px 30px 30px;
          background:
            linear-gradient(
              160deg,
              #f8b5cf,
              #c29bed
            );
          transform: rotate(5deg);
          box-shadow:
            0 35px 50px
              rgba(128, 66, 117, 0.18);
          overflow: hidden;
        }

        .anime-hair {
          position: absolute;
          width: 175px;
          height: 180px;
          left: 14px;
          top: 10px;
          border-radius: 52% 48% 42% 43%;
          background:
            linear-gradient(
              140deg,
              #654f86,
              #302846
            );
        }

        .anime-face {
          position: absolute;
          width: 122px;
          height: 132px;
          left: 41px;
          top: 57px;
          border-radius: 48% 48% 46% 46%;
          background: #ffe0d2;
        }

        .eye {
          position: absolute;
          top: 59px;
          width: 8px;
          height: 14px;
          border-radius: 50%;
          background: #49334d;
        }

        .eye.left {
          left: 33px;
        }

        .eye.right {
          right: 33px;
        }

        .mouth {
          position: absolute;
          left: 53px;
          top: 91px;
          width: 17px;
          height: 7px;
          border-bottom: 2px solid #b9687d;
          border-radius: 50%;
        }

        .anime-body {
          position: absolute;
          bottom: -40px;
          left: 19px;
          width: 167px;
          height: 150px;
          border-radius: 48% 48% 0 0;
          background: #fff;
          color: #ef5795;
          display: grid;
          place-items: center;
          font-size: 52px;
          font-weight: 1000;
        }

        .floating-card {
          position: absolute;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 9px;
          background: rgba(255, 255, 255, 0.91);
          padding: 11px 13px;
          border-radius: 13px;
          box-shadow:
            0 15px 30px
              rgba(120, 63, 105, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.9);
        }

        .floating-card > span {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #fff0f6;
          color: #ec448b;
        }

        .floating-card div {
          display: flex;
          flex-direction: column;
        }

        .floating-card b {
          font-size: 10px;
          color: #453541;
        }

        .floating-card small {
          color: #9b8692;
          margin-top: 2px;
          font-size: 8px;
        }

        .card-a {
          right: 385px;
          top: 80px;
        }

        .card-b {
          right: 72px;
          bottom: 74px;
        }

        .shop-area {
          width: min(1420px, calc(100% - 40px));
          margin: 28px auto 0;
          display: grid;
          grid-template-columns: 265px minmax(0, 1fr);
          gap: 25px;
        }

        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 17px;
        }

        .sidebar-card {
          background: white;
          border: 1px solid #f0e2e9;
          border-radius: 20px;
          padding: 18px;
          box-shadow:
            0 10px 30px
              rgba(173, 88, 129, 0.06);
        }

        .dark .sidebar-card,
        .dark .service-card,
        .dark .product-card {
          background: #211b23;
          border-color: #382d36;
        }

        .side-title {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 5px 14px;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 1px;
        }

        .side-title span {
          color: #ef438c;
        }

        .category-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .category {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 9px;
          border: 0;
          background: transparent;
          border-radius: 11px;
          padding: 11px 9px;
          color: #7f707a;
          text-align: left;
          font-size: 12px;
          font-weight: 750;
        }

        .category:hover,
        .category.active {
          color: #e53d83;
          background: #fff0f6;
        }

        .dark .category {
          color: #b8a7b3;
        }

        .dark .category:hover,
        .dark .category.active {
          color: #ff70aa;
          background: #33242e;
        }

        .category-icon {
          width: 25px;
          height: 25px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: #fff5f8;
          color: #ef5496;
        }

        .category-name {
          flex: 1;
        }

        .category-count {
          color: #ad9da6;
          font-size: 10px;
        }

        .vip-card {
          position: relative;
          overflow: hidden;
          padding: 23px;
          border-radius: 20px;
          background:
            linear-gradient(
              140deg,
              #312537,
              #5a3150
            );
          color: white;
          box-shadow:
            0 15px 35px
              rgba(68, 34, 62, 0.16);
        }

        .vip-star {
          position: absolute;
          right: 18px;
          top: 10px;
          color: #ff91bd;
          font-size: 35px;
          opacity: 0.35;
        }

        .vip-card h3 {
          margin: 0;
          font-size: 13px;
          letter-spacing: 1px;
        }

        .vip-card p {
          color: #dbc7d4;
          line-height: 1.6;
          font-size: 11px;
        }

        .vip-card button {
          border: 0;
          border-radius: 9px;
          padding: 9px 12px;
          color: white;
          background: rgba(255, 255, 255, 0.14);
          font-size: 11px;
          font-weight: 800;
        }

        .support-card {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 14px;
          border-radius: 16px;
          border: 1px solid #f0e2e9;
          background: white;
        }

        .support-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: #fff0f6;
          color: #ec4389;
          font-weight: 900;
        }

        .support-card div:nth-child(2) {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .support-card b {
          font-size: 11px;
        }

        .support-card span {
          margin-top: 2px;
          color: #9b8992;
          font-size: 9px;
        }

        .support-card button {
          width: 29px;
          height: 29px;
          border: 0;
          border-radius: 8px;
          background: #fff0f6;
          color: #ef438c;
        }

        .products-area {
          min-width: 0;
        }

        .products-heading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 17px;
        }

        .products-heading h2 {
          margin: 5px 0 3px;
          font-size: 25px;
          letter-spacing: -0.7px;
        }

        .products-heading p {
          margin: 0;
          color: #96838d;
          font-size: 11px;
        }

        .dark .products-heading p {
          color: #b6a5b0;
        }

        .search-box {
          width: 245px;
          height: 42px;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 12px;
          border-radius: 12px;
          background: white;
          border: 1px solid #f0e2e9;
        }

        .dark .search-box {
          background: #211b23;
          border-color: #382d36;
        }

        .search-box span {
          color: #b49ca8;
          font-size: 20px;
        }

        .search-box input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: inherit;
          font-size: 11px;
        }

        .products-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .product-card {
          overflow: hidden;
          border-radius: 17px;
          border: 1px solid #f0e2e9;
          background: white;
          box-shadow:
            0 9px 25px
              rgba(173, 88, 129, 0.055);
          transition:
            transform 0.2s,
            box-shadow 0.2s;
        }

        .product-card:hover {
          transform: translateY(-4px);
          box-shadow:
            0 18px 35px
              rgba(173, 88, 129, 0.12);
        }

        .product-cover {
          height: 145px;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 20% 30%,
              #fff,
              transparent 28%
            ),
            linear-gradient(
              135deg,
              #ffe0ed,
              #e9d9ff
            );
          display: grid;
          place-items: center;
        }

        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .stock-badge {
          position: absolute;
          right: 9px;
          top: 9px;
          padding: 5px 8px;
          border-radius: 7px;
          font-size: 8px;
          font-weight: 900;
          backdrop-filter: blur(10px);
        }

        .stock-ok {
          color: #258d63;
          background: rgba(230, 255, 243, 0.9);
        }

        .stock-out {
          color: #b64b65;
          background: rgba(255, 234, 239, 0.94);
        }

        .product-icon {
          width: 76px;
          height: 76px;
          border-radius: 25px;
          display: grid;
          place-items: center;
          color: white;
          background:
            linear-gradient(
              145deg,
              #ff5d9f,
              #9d73e9
            );
          box-shadow:
            0 18px 30px
              rgba(170, 83, 140, 0.2);
        }

        .product-icon span {
          font-size: 34px;
        }

        .icon-android {
          background:
            linear-gradient(
              145deg,
              #5cc98a,
              #39a870
            );
        }

        .icon-iphone {
          background:
            linear-gradient(
              145deg,
              #7d83ff,
              #a64fe9
            );
        }

        .icon-pc {
          background:
            linear-gradient(
              145deg,
              #5c9df6,
              #6a62db
            );
        }

        .product-body {
          padding: 15px;
        }

        .product-type {
          color: #ed478d;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 1.5px;
        }

        .product-body h3 {
          margin: 5px 0;
          font-size: 13px;
          line-height: 1.3;
        }

        .product-info {
          display: flex;
          gap: 5px;
          color: #9b8a94;
          font-size: 9px;
          margin-bottom: 13px;
        }

        .product-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .price {
          color: #e83d83;
          font-size: 15px;
          font-weight: 950;
        }

        .buy-button {
          border: 0;
          border-radius: 9px;
          padding: 8px 11px;
          background: #fff0f6;
          color: #e63d83;
          font-size: 9px;
          font-weight: 900;
        }

        .buy-button:hover:not(:disabled) {
          background: #e94388;
          color: white;
        }

        .buy-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .empty-products {
          grid-column: 1 / -1;
          padding: 80px 20px;
          text-align: center;
          background: white;
          border: 1px solid #f0e2e9;
          border-radius: 18px;
        }

        .dark .empty-products {
          background: #211b23;
          border-color: #382d36;
        }

        .empty-icon {
          font-size: 45px;
          color: #ef6a9f;
        }

        .empty-products h3 {
          margin: 10px 0 5px;
        }

        .empty-products p {
          margin: 0;
          color: #9a8993;
          font-size: 12px;
        }

        .quick-services {
          width: min(1420px, calc(100% - 40px));
          margin: 27px auto;
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 13px;
        }

        .service-card {
          display: flex;
          align-items: center;
          gap: 11px;
          border: 1px solid #f0e2e9;
          background: white;
          border-radius: 15px;
          padding: 14px;
          text-align: left;
          color: inherit;
        }

        .service-card:hover {
          border-color: #f1bfd4;
        }

        .service-icon {
          width: 38px;
          height: 38px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 11px;
          font-weight: 950;
        }

        .service-icon.pink {
          color: #ed438b;
          background: #fff0f6;
        }

        .service-icon.purple {
          color: #8c58dc;
          background: #f2eaff;
        }

        .service-icon.blue {
          color: #4b88dd;
          background: #eaf4ff;
        }

        .service-icon.green {
          color: #299e6c;
          background: #e9fff4;
        }

        .service-card div:nth-child(2) {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .service-card b {
          font-size: 11px;
        }

        .service-card span {
          color: #9a8993;
          font-size: 8px;
          margin-top: 3px;
        }

        .service-card > strong {
          color: #bdabb5;
        }

        footer {
          width: min(1420px, calc(100% - 40px));
          margin: 45px auto 90px;
          padding-top: 23px;
          border-top: 1px solid #efdee6;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .dark footer {
          border-color: #372d35;
        }

        .footer-brand {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .footer-brand .brand-mark {
          width: 32px;
          height: 32px;
          font-size: 16px;
          border-radius: 9px;
        }

        .footer-brand div:last-child {
          display: flex;
          flex-direction: column;
        }

        .footer-brand b {
          font-size: 11px;
        }

        .footer-brand span {
          color: #aa95a1;
          font-size: 7px;
          letter-spacing: 1.5px;
          margin-top: 2px;
        }

        footer p {
          margin: 0;
          color: #a18d98;
          font-size: 9px;
        }

        .floating-chat {
          position: fixed;
          z-index: 70;
          right: 22px;
          bottom: 22px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 0;
          border-radius: 14px;
          padding: 12px 15px;
          color: white;
          background:
            linear-gradient(
              135deg,
              #ef438c,
              #ff6aab
            );
          box-shadow:
            0 13px 30px
              rgba(239, 67, 140, 0.32);
          font-size: 11px;
        }

        .floating-chat span {
          font-size: 15px;
        }

        .modal-backdrop {
          position: fixed;
          z-index: 100;
          inset: 0;
          padding: 20px;
          display: grid;
          place-items: center;
          background: rgba(31, 20, 28, 0.5);
          backdrop-filter: blur(8px);
        }

        .modal {
          width: min(430px, 100%);
          position: relative;
          border-radius: 22px;
          padding: 27px;
          background: white;
          box-shadow:
            0 35px 80px
              rgba(45, 22, 38, 0.28);
        }

        .modal-close {
          position: absolute;
          right: 15px;
          top: 15px;
          width: 31px;
          height: 31px;
          border: 0;
          border-radius: 9px;
          background: #f8eef3;
          color: #8d7884;
          font-size: 18px;
        }

        .modal-icon,
        .success-icon {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: #fff0f6;
          color: #ed438b;
          font-size: 23px;
          margin-bottom: 15px;
        }

        .success-icon {
          color: white;
          background:
            linear-gradient(
              135deg,
              #31b77a,
              #5bd39b
            );
        }

        .modal-label {
          color: #ed438b;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 1.5px;
        }

        .modal h3 {
          margin: 6px 0 20px;
          font-size: 20px;
        }

        .confirm-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #f1e7eb;
          color: #887681;
          font-size: 11px;
        }

        .confirm-row b {
          color: #302731;
        }

        .modal-actions {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 9px;
          margin-top: 20px;
        }

        .cancel-button,
        .confirm-button {
          height: 43px;
          border-radius: 11px;
          border: 0;
          font-weight: 900;
          font-size: 11px;
        }

        .cancel-button {
          background: #f6edf2;
          color: #7d6c76;
        }

        .confirm-button {
          color: white;
          background:
            linear-gradient(
              135deg,
              #ee438b,
              #ff6daa
            );
          box-shadow:
            0 9px 20px
              rgba(238, 67, 139, 0.2);
        }

        .confirm-button.full {
          width: 100%;
          margin-top: 15px;
        }

        .success {
          text-align: left;
        }

        .success-text {
          color: #887681;
          font-size: 11px;
        }

        .key-box {
          margin-top: 15px;
          padding: 14px;
          border: 1px dashed #f0b6d0;
          border-radius: 12px;
          background: #fff6fa;
        }

        .key-box span {
          display: block;
          color: #e84388;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 1px;
          margin-bottom: 6px;
        }

        .key-box strong {
          display: block;
          word-break: break-all;
          color: #3d3038;
          font-size: 12px;
        }

        .error-box {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 15px;
          padding: 11px 13px;
          border-radius: 12px;
          color: #a33f59;
          background: #fff0f3;
          border: 1px solid #ffd4df;
          font-size: 11px;
        }

        .error-box span {
          width: 22px;
          height: 22px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #f7b7c8;
          color: white;
          font-weight: 900;
        }

        .error-box div {
          flex: 1;
        }

        .error-box button {
          border: 0;
          background: transparent;
          color: #a33f59;
          font-size: 18px;
        }

        .skeleton-card {
          overflow: hidden;
        }

        .skeleton {
          background:
            linear-gradient(
              90deg,
              #f7edf2 25%,
              #fff8fb 50%,
              #f7edf2 75%
            );
          background-size: 200% 100%;
          animation: skeleton 1.3s infinite;
        }

        .skeleton-cover {
          height: 145px;
        }

        .skeleton-body {
          padding: 15px;
        }

        .skeleton-line {
          height: 11px;
          width: 80%;
          border-radius: 5px;
          margin-bottom: 10px;
        }

        .skeleton-line.small {
          width: 35%;
        }

        .skeleton-line.medium {
          width: 55%;
        }

        .skeleton-button {
          height: 32px;
          width: 80px;
          border-radius: 9px;
          margin-top: 16px;
        }

        @keyframes skeleton {
          from {
            background-position: 200% 0;
          }

          to {
            background-position: -200% 0;
          }
        }

        .petals {
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          overflow: hidden;
        }

        .petal {
          position: absolute;
          top: -30px;
          width: 9px;
          height: 13px;
          border-radius: 70% 20% 70% 20%;
          background: rgba(255, 128, 179, 0.45);
          transform: rotate(30deg);
          animation:
            fall linear infinite,
            sway ease-in-out infinite;
        }

        .petal-1 { left: 4%; animation-duration: 9s, 2.5s; }
        .petal-2 { left: 10%; animation-duration: 13s, 3s; animation-delay: -4s; }
        .petal-3 { left: 17%; animation-duration: 11s, 2.8s; animation-delay: -7s; }
        .petal-4 { left: 26%; animation-duration: 15s, 3.5s; animation-delay: -2s; }
        .petal-5 { left: 34%; animation-duration: 10s, 2.2s; animation-delay: -6s; }
        .petal-6 { left: 43%; animation-duration: 14s, 3.1s; animation-delay: -9s; }
        .petal-7 { left: 51%; animation-duration: 12s, 2.6s; animation-delay: -3s; }
        .petal-8 { left: 59%; animation-duration: 16s, 3.7s; animation-delay: -10s; }
        .petal-9 { left: 67%; animation-duration: 11s, 2.4s; animation-delay: -5s; }
        .petal-10 { left: 74%; animation-duration: 14s, 3s; animation-delay: -8s; }
        .petal-11 { left: 82%; animation-duration: 10s, 2.8s; animation-delay: -1s; }
        .petal-12 { left: 91%; animation-duration: 13s, 3.2s; animation-delay: -6s; }
        .petal-13 { left: 23%; animation-duration: 17s, 3.6s; animation-delay: -12s; }
        .petal-14 { left: 47%; animation-duration: 12s, 2.7s; animation-delay: -11s; }
        .petal-15 { left: 70%; animation-duration: 15s, 3.2s; animation-delay: -7s; }
        .petal-16 { left: 87%; animation-duration: 11s, 2.4s; animation-delay: -9s; }
        .petal-17 { left: 14%; animation-duration: 16s, 3.5s; animation-delay: -14s; }
        .petal-18 { left: 62%; animation-duration: 13s, 2.9s; animation-delay: -13s; }

        @keyframes fall {
          0% {
            transform:
              translate3d(0, -40px, 0)
              rotate(0deg);
            opacity: 0;
          }

          10% {
            opacity: 0.7;
          }

          90% {
            opacity: 0.55;
          }

          100% {
            transform:
              translate3d(80px, 110vh, 0)
              rotate(560deg);
            opacity: 0;
          }
        }

        @keyframes sway {
          0%,
          100% {
            margin-left: -12px;
          }

          50% {
            margin-left: 18px;
          }
        }

        @media (max-width: 1150px) {
          .desktop-nav {
            display: none;
          }

          .topbar-inner {
            justify-content: space-between;
          }

          .hero-art {
            opacity: 0.72;
          }

          .products-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 850px) {
          .topbar {
            height: 64px;
          }

          .topbar-inner,
          .hero-wrap,
          .shop-area,
          .quick-services,
          footer {
            width: min(
              100% - 24px,
              680px
            );
          }

          .brand {
            min-width: auto;
          }

          .brand-text span,
          .user-name {
            display: none;
          }

          .wallet-pill {
            padding: 0 8px;
          }

          .hero {
            min-height: 460px;
          }

          .hero-content {
            padding: 38px 28px;
          }

          .hero-art {
            width: 100%;
            opacity: 0.25;
          }

          .hero h1 {
            font-size: 42px;
          }

          .shop-area {
            grid-template-columns: 1fr;
          }

          .category-list {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .quick-services {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          footer {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
        }

        @media (max-width: 560px) {
          .topbar-inner {
            gap: 8px;
          }

          .brand-text {
            display: none;
          }

          .theme-button {
            display: none;
          }

          .wallet-pill span:last-child {
            font-size: 10px;
          }

          .hero {
            border-radius: 20px;
            min-height: 455px;
          }

          .hero-content {
            padding: 35px 23px;
          }

          .hero h1 {
            font-size: 37px;
            letter-spacing: -1.8px;
          }

          .hero p {
            font-size: 12px;
          }

          .hero-buttons {
            flex-direction: column;
          }

          .hero-primary,
          .hero-secondary {
            width: 100%;
          }

          .products-heading {
            align-items: stretch;
            flex-direction: column;
          }

          .search-box {
            width: 100%;
          }

          .products-grid {
            grid-template-columns: 1fr;
          }

          .quick-services {
            grid-template-columns: 1fr;
          }

          .floating-chat {
            right: 13px;
            bottom: 13px;
          }

          .floating-chat b {
            display: none;
          }

          .modal {
            padding: 22px;
          }
        }
      `}</style>
    </main>
  );
}
