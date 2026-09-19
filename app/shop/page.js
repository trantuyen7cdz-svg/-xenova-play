"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ZALO_ADMIN = "https://zalo.me/0987654321";

const NAV_ITEMS = [
  { key: "all", label: "Tất cả sản phẩm", icon: "▦" },
  { key: "steam", label: "Steam", icon: "●" },
  { key: "windows", label: "Windows", icon: "⊞" },
  { key: "office", label: "Office", icon: "▣" },
  { key: "adobe", label: "Adobe", icon: "A" },
  { key: "game", label: "Game", icon: "⌁" },
];

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatPrice(value) {
  const n = Number(value || 0);

  if (!Number.isFinite(n)) return "0đ";

  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

function getProductName(product) {
  return (
    product?.name ||
    product?.title ||
    product?.product_name ||
    product?.productName ||
    "Sản phẩm"
  );
}

function getProductPrice(product) {
  return (
    product?.price ??
    product?.selling_price ??
    product?.sale_price ??
    product?.amount ??
    0
  );
}

function getProductDays(product) {
  return (
    product?.days ??
    product?.duration ??
    product?.duration_days ??
    product?.valid_days ??
    null
  );
}

function getProductCategory(product) {
  return (
    product?.category_name ||
    product?.category ||
    product?.category_slug ||
    product?.type ||
    ""
  );
}

function getProductStock(product, stockMap) {
  const id = String(product?.id ?? "");

  if (
    stockMap &&
    Object.prototype.hasOwnProperty.call(stockMap, id)
  ) {
    return Number(stockMap[id] || 0);
  }

  return Number(
    product?.stock ??
      product?.stock_count ??
      product?.quantity ??
      product?.available ??
      0
  );
}

function getCategoryKey(product) {
  const name = normalize(
    `${getProductName(product)} ${getProductCategory(product)}`
  );

  if (name.includes("steam") || name.includes("valve")) {
    return "steam";
  }

  if (
    name.includes("windows") ||
    name.includes("win ")
  ) {
    return "windows";
  }

  if (
    name.includes("office") ||
    name.includes("microsoft")
  ) {
    return "office";
  }

  if (
    name.includes("adobe") ||
    name.includes("photoshop") ||
    name.includes("premiere")
  ) {
    return "adobe";
  }

  if (
    name.includes("game") ||
    name.includes("genshin") ||
    name.includes("valorant") ||
    name.includes("roblox")
  ) {
    return "game";
  }

  return "all";
}

function getIconKind(product) {
  const name = normalize(getProductName(product));

  if (name.includes("steam")) return "steam";
  if (name.includes("windows")) return "windows";
  if (name.includes("office")) return "office";
  if (name.includes("photoshop")) return "photoshop";
  if (name.includes("premiere")) return "premiere";
  if (name.includes("genshin")) return "genshin";
  if (name.includes("valorant")) return "valorant";
  if (name.includes("roblox")) return "roblox";

  return "generic";
}

function ProductIcon({ product }) {
  const kind = getIconKind(product);

  const icons = {
    steam: (
      <svg viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r="30"
          fill="#111827"
        />
        <circle
          cx="39"
          cy="22"
          r="10"
          fill="none"
          stroke="#fff"
          strokeWidth="6"
        />
        <circle
          cx="39"
          cy="22"
          r="3"
          fill="#fff"
        />
        <circle
          cx="23"
          cy="40"
          r="9"
          fill="none"
          stroke="#fff"
          strokeWidth="6"
        />
        <path
          d="M29 35 36 27"
          stroke="#fff"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
    ),

    windows: (
      <svg viewBox="0 0 64 64">
        <path
          d="M6 11 30 8v22H6z"
          fill="#13a8f5"
        />
        <path
          d="M34 7 58 4v26H34z"
          fill="#0787e8"
        />
        <path
          d="M6 34h24v22L6 53z"
          fill="#0787e8"
        />
        <path
          d="M34 34h24v26l-24-3z"
          fill="#13a8f5"
        />
      </svg>
    ),

    office: (
      <svg viewBox="0 0 64 64">
        <rect
          x="5"
          y="5"
          width="54"
          height="54"
          rx="8"
          fill="#f04a23"
        />
        <path
          d="M18 13h27l8 8v30H18z"
          fill="#d93617"
        />
        <path
          d="M32 18 43 46h-8l-2-7h-9l-2 7h-8zm-3 15h4l-2-7z"
          fill="#fff"
        />
      </svg>
    ),

    photoshop: (
      <svg viewBox="0 0 64 64">
        <rect
          x="4"
          y="4"
          width="56"
          height="56"
          rx="8"
          fill="#061c35"
        />
        <rect
          x="9"
          y="9"
          width="46"
          height="46"
          rx="5"
          fill="none"
          stroke="#31a8ff"
          strokeWidth="2"
        />
        <text
          x="13"
          y="41"
          fontSize="22"
          fontWeight="900"
          fill="#31a8ff"
        >
          Ps
        </text>
      </svg>
    ),

    premiere: (
      <svg viewBox="0 0 64 64">
        <rect
          x="4"
          y="4"
          width="56"
          height="56"
          rx="8"
          fill="#211034"
        />
        <rect
          x="9"
          y="9"
          width="46"
          height="46"
          rx="5"
          fill="none"
          stroke="#d45cff"
          strokeWidth="2"
        />
        <text
          x="13"
          y="41"
          fontSize="21"
          fontWeight="900"
          fill="#d45cff"
        >
          Pr
        </text>
      </svg>
    ),

    genshin: (
      <svg viewBox="0 0 64 64">
        <defs>
          <linearGradient
            id="genshinGradient"
            x1="0"
            x2="1"
            y1="0"
            y2="1"
          >
            <stop
              offset="0"
              stopColor="#dff4ff"
            />
            <stop
              offset="1"
              stopColor="#7cb8ec"
            />
          </linearGradient>
        </defs>

        <circle
          cx="32"
          cy="32"
          r="30"
          fill="url(#genshinGradient)"
        />

        <path
          d="M32 11c4 10 12 14 21 16-9 3-16 9-21 25-5-16-12-22-21-25 9-2 17-6 21-16z"
          fill="#fff"
        />

        <circle
          cx="24"
          cy="31"
          r="2"
          fill="#42617e"
        />

        <circle
          cx="40"
          cy="31"
          r="2"
          fill="#42617e"
        />
      </svg>
    ),

    valorant: (
      <svg viewBox="0 0 64 64">
        <path
          d="M8 7h14l10 23L43 7h13L37 56H25z"
          fill="#ef3340"
        />
        <path
          d="M8 7h14l7 16H17z"
          fill="#fff"
        />
      </svg>
    ),

    roblox: (
      <svg viewBox="0 0 64 64">
        <rect
          x="5"
          y="5"
          width="54"
          height="54"
          rx="11"
          fill="#ed1b2f"
        />
        <rect
          x="20"
          y="20"
          width="24"
          height="24"
          rx="3"
          transform="rotate(45 32 32)"
          fill="#fff"
        />
        <rect
          x="29"
          y="29"
          width="6"
          height="6"
          rx="1"
          transform="rotate(45 32 32)"
          fill="#ed1b2f"
        />
      </svg>
    ),

    generic: (
      <svg viewBox="0 0 64 64">
        <path
          d="M32 5 38 25 59 32 38 39 32 59 26 39 5 32 26 25z"
          fill="currentColor"
        />
        <circle
          cx="32"
          cy="32"
          r="7"
          fill="#fff"
        />
      </svg>
    ),
  };

  return (
    <div className={`product-icon product-icon-${kind}`}>
      {icons[kind]}
    </div>
  );
}

function ProductCard({
  product,
  stock,
  onBuy,
}) {
  const name = getProductName(product);
  const price = getProductPrice(product);
  const days = getProductDays(product);
  const category = normalize(
    getProductCategory(product)
  );

  const sold =
    category.includes("office") ||
    category.includes("adobe") ||
    normalize(name).includes("valorant") ||
    normalize(name).includes("genshin");

  const iconKind = getIconKind(product);

  return (
    <article className="product-card">
      <div
        className={`product-cover product-cover-${iconKind}`}
      >
        <div className="cover-corner">
          {sold ? "Bán chạy" : "Hot"}
        </div>

        <div className="cover-glow" />

        <ProductIcon product={product} />
      </div>

      <div className="product-body">
        <div
          className="product-name"
          title={name}
        >
          {name}
        </div>

        <div className="product-tags">
          <span
            className={
              sold ? "tag-hot" : "tag-new"
            }
          >
            {sold ? "Bán chạy" : "Hot"}
          </span>

          <span className="tag-auto">
            {days
              ? `${days} ngày`
              : "Tự động"}
          </span>
        </div>

        <div className="product-price">
          {formatPrice(price)}
        </div>

        <button
          className="buy-button"
          onClick={() => onBuy(product)}
          disabled={stock <= 0}
        >
          {stock > 0
            ? "Mua ngay →"
            : "Hết hàng"}
        </button>
      </div>
    </article>
  );
}

function ProductSkeleton() {
  return (
    <div className="product-card skeleton-card">
      <div className="skeleton cover-skeleton" />
      <div className="skeleton-line large skeleton" />
      <div className="skeleton-line small skeleton" />
      <div className="skeleton-line price skeleton" />
      <div className="skeleton-button skeleton" />
    </div>
  );
}

export default function ShopPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [wallet, setWallet] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("all");

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("default");

  const [buyModal, setBuyModal] = useState(null);
  const [successModal, setSuccessModal] =
    useState(null);

  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState("");

  async function loadWallet(currentUser) {
    if (!currentUser) {
      setWallet(0);
      return;
    }

    try {
      const { data } = await supabase
        .from("profiles")
        .select(
          "wallet_balance,balance"
        )
        .eq("id", currentUser.id)
        .maybeSingle();

      setWallet(
        Number(
          data?.wallet_balance ??
            data?.balance ??
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
      const catalogResponse = await fetch(
        "/api/shop/catalog",
        {
          cache: "no-store",
        }
      );

      if (!catalogResponse.ok) {
        throw new Error(
          "Không tải được danh sách sản phẩm"
        );
      }

      const catalogData =
        await catalogResponse.json();

      const loadedProducts =
        Array.isArray(catalogData)
          ? catalogData
          : catalogData?.products ||
            catalogData?.data ||
            [];

      setProducts(loadedProducts);

      try {
        const stockResponse =
          await fetch(
            "/api/shop/stock",
            {
              cache: "no-store",
            }
          );

        if (stockResponse.ok) {
          const stockData =
            await stockResponse.json();

          setStockMap(
            stockData?.stock ||
              stockData?.stocks ||
              stockData?.data ||
              {}
          );
        }
      } catch {
        setStockMap({});
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
    loadShop();

    let mounted = true;

    supabase.auth.getUser().then(
      ({ data }) => {
        if (!mounted) return;

        const currentUser =
          data?.user || null;

        setUser(currentUser);
        loadWallet(currentUser);
      }
    );

    const {
      data: listener,
    } =
      supabase.auth.onAuthStateChange(
        async (_event, session) => {
          if (!mounted) return;

          const currentUser =
            session?.user || null;

          setUser(currentUser);
          loadWallet(currentUser);
        }
      );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const categoryCounts = useMemo(() => {
    const counts = {
      all: products.length,
      steam: 0,
      windows: 0,
      office: 0,
      adobe: 0,
      game: 0,
    };

    for (const product of products) {
      const key =
        getCategoryKey(product);

      if (
        counts[key] !== undefined
      ) {
        counts[key] += 1;
      }
    }

    return counts;
  }, [products]);

  const visibleProducts = useMemo(() => {
    let list = [...products];

    if (selectedCategory !== "all") {
      list = list.filter(
        (product) =>
          getCategoryKey(product) ===
          selectedCategory
      );
    }

    const keyword = normalize(search);

    if (keyword) {
      list = list.filter(
        (product) =>
          normalize(
            `${getProductName(
              product
            )} ${getProductCategory(
              product
            )}`
          ).includes(keyword)
      );
    }

    if (sort === "price-low") {
      list.sort(
        (a, b) =>
          Number(
            getProductPrice(a)
          ) -
          Number(
            getProductPrice(b)
          )
      );
    }

    if (sort === "price-high") {
      list.sort(
        (a, b) =>
          Number(
            getProductPrice(b)
          ) -
          Number(
            getProductPrice(a)
          )
      );
    }

    return list;
  }, [
    products,
    selectedCategory,
    search,
    sort,
  ]);

  function handleBuyClick(product) {
    if (!user) {
      router.push("/login");
      return;
    }

    const stock =
      getProductStock(
        product,
        stockMap
      );

    if (stock <= 0) {
      setMessage(
        "Sản phẩm hiện đã hết hàng."
      );
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

    setBuying(true);
    setMessage("");

    try {
      const {
        data: sessionData,
      } =
        await supabase.auth.getSession();

      const token =
        sessionData?.session
          ?.access_token;

      if (!token) {
        throw new Error(
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        );
      }

      const response =
        await fetch(
          "/api/buy-key",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              product_id:
                Number(
                  buyModal.id
                ),
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Mua sản phẩm thất bại."
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
        product:
          getProductName(
            buyModal
          ),
        key,
      });

      await loadShop();
      await loadWallet(user);
    } catch (err) {
      setMessage(
        err?.message ||
          "Có lỗi xảy ra khi mua sản phẩm."
      );
    } finally {
      setBuying(false);
    }
  }

  async function copyKey() {
    if (!successModal?.key) return;

    try {
      await navigator.clipboard.writeText(
        successModal.key
      );

      setMessage("Đã sao chép KEY.");
    } catch {
      setMessage(
        "Không thể sao chép tự động."
      );
    }
  }

  function deposit() {
    router.push("/deposit");
  }

  return (
    <main className="shop-page">
      <div className="petal petal-1">
        ✦
      </div>

      <div className="petal petal-2">
        ✧
      </div>

      <div className="petal petal-3">
        ❀
      </div>

      <div className="petal petal-4">
        ✦
      </div>

      <div className="petal petal-5">
        ❀
      </div>

      <header className="topbar">
        <div className="topbar-inner">
          <button
            className="mobile-menu"
            onClick={() =>
              setSelectedCategory(
                "all"
              )
            }
          >
            ☰
          </button>

          <button
            className="logo"
            onClick={() =>
              router.push("/")
            }
          >
            <span>XENOVA</span>
            <small>PLAY</small>
          </button>

          <nav className="main-nav">
            <button
              className="nav-item active"
              onClick={() =>
                setSelectedCategory(
                  "all"
                )
              }
            >
              <span className="nav-icon">
                ⌂
              </span>
              <span>Trang chủ</span>
            </button>

            <button
              className="nav-item"
              onClick={() =>
                document
                  .getElementById(
                    "shop-products"
                  )
                  ?.scrollIntoView({
                    behavior:
                      "smooth",
                  })
              }
            >
              <span className="nav-icon">
                ▣
              </span>
              <span>Cửa hàng</span>
            </button>

            <button
              className="nav-item"
              onClick={deposit}
            >
              <span className="nav-icon">
                ▤
              </span>
              <span>Nạp tiền</span>
            </button>

            <button
              className="nav-item"
              onClick={() =>
                router.push(
                  user
                    ? "/keys"
                    : "/login"
                )
              }
            >
              <span className="nav-icon">
                ♢
              </span>
              <span>KEY của tôi</span>
            </button>

            <button
              className="nav-item"
              onClick={() =>
                router.push(
                  user
                    ? "/orders"
                    : "/login"
                )
              }
            >
              <span className="nav-icon">
                ▱
              </span>
              <span>Đơn hàng</span>
            </button>

            <button
              className="nav-item"
              onClick={() =>
                router.push(
                  user
                    ? "/account"
                    : "/login"
                )
              }
            >
              <span className="nav-icon">
                ♙
              </span>
              <span>Tài khoản</span>
            </button>

            <button
              className="nav-item"
              onClick={() =>
                router.push(
                  "/settings"
                )
              }
            >
              <span className="nav-icon">
                ⚙
              </span>
              <span>Cài đặt</span>
            </button>
          </nav>

          <div className="header-right">
            <button className="theme-button">
              ☼
            </button>

            <button
              className="wallet-pill"
              onClick={deposit}
            >
              <span>▣</span>
              <b>
                {formatPrice(wallet)}
              </b>
            </button>

            <button
              className="user-button"
              onClick={() =>
                router.push(
                  user
                    ? "/account"
                    : "/login"
                )
              }
            >
              <span className="user-circle">
                {user
                  ? String(
                      user.email ||
                        "U"
                    )
                      .charAt(0)
                      .toUpperCase()
                  : "U"}
              </span>

              <span className="user-arrow">
                ⌄
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="page-container">
        <section className="hero-banner">
          <div className="hero-left">
            <div className="hero-badge">
              XENOVA
              <span>
                SHOP GAME - KEY GIÁ TỐT
              </span>
            </div>

            <h1>
              MUA KEY NGAY
              <br />
              <strong>
                NHẬN QUÀ LIỀN TAY
              </strong>
            </h1>

            <p>
              Nhanh chóng - Uy tín -
              Giá tốt nhất
            </p>

            <button
              onClick={() =>
                document
                  .getElementById(
                    "shop-products"
                  )
                  ?.scrollIntoView({
                    behavior:
                      "smooth",
                  })
              }
            >
              MUA NGAY →
            </button>
          </div>

          <div className="hero-art">
            <div className="art-glow" />

            <div className="art-hair">
              <div className="art-face">
                <span className="eye eye-left" />
                <span className="eye eye-right" />
                <span className="mouth">
                  ♡
                </span>
              </div>
            </div>

            <div className="art-body">
              <div className="art-bow" />
            </div>
          </div>

          <div className="hero-services">
            <div>
              <b>♢</b>
              <span>
                KEY CHÍNH HÃNG
              </span>
            </div>

            <div>
              <b>◉</b>
              <span>
                GIAO TỰ ĐỘNG
              </span>
            </div>

            <div>
              <b>☎</b>
              <span>
                HỖ TRỢ 24/7
              </span>
            </div>
          </div>

          <div className="banner-dots">
            <i />
            <i className="active" />
            <i />
          </div>
        </section>

        <section className="shop-layout">
          <aside className="sidebar">
            <div className="side-card category-card">
              <div className="side-title">
                <span>▦</span>
                <b>Danh mục</b>
              </div>

              <div className="category-list">
                {NAV_ITEMS.map(
                  (item) => (
                    <button
                      key={item.key}
                      className={
                        selectedCategory ===
                        item.key
                          ? "category-item active"
                          : "category-item"
                      }
                      onClick={() =>
                        setSelectedCategory(
                          item.key
                        )
                      }
                    >
                      <span className="category-icon">
                        {item.icon}
                      </span>

                      <span className="category-name">
                        {item.label}
                      </span>

                      <span className="category-count">
                        {categoryCounts[
                          item.key
                        ] || 0}
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="vip-card">
              <div className="vip-crown">
                ♛
              </div>

              <div className="vip-text">
                <strong>
                  THÀNH VIÊN VIP
                </strong>

                <span>
                  Nhận thêm ưu đãi
                </span>
              </div>

              <button
                onClick={deposit}
              >
                Nâng cấp ngay →
              </button>
            </div>

            <div className="side-card support-card">
              <div className="side-title">
                <b>Hỗ trợ</b>
              </div>

              <button
                onClick={() =>
                  window.open(
                    ZALO_ADMIN,
                    "_blank"
                  )
                }
              >
                <span className="support-icon">
                  ●
                </span>

                <span>
                  <b>Chat Admin</b>
                  <small>
                    Hỗ trợ 24/7
                  </small>
                </span>
              </button>

              <button
                onClick={() =>
                  window.open(
                    ZALO_ADMIN,
                    "_blank"
                  )
                }
              >
                <span className="support-icon">
                  ➤
                </span>

                <span>
                  <b>Nhắn Telegram</b>
                  <small>
                    Giải đáp nhanh nhất
                  </small>
                </span>
              </button>

              <button
                onClick={() =>
                  window.open(
                    ZALO_ADMIN,
                    "_blank"
                  )
                }
              >
                <span className="support-icon">
                  f
                </span>

                <span>
                  <b>
                    Fanpage Facebook
                  </b>
                  <small>
                    Like để nhận ưu đãi
                  </small>
                </span>
              </button>
            </div>
          </aside>

          <section
            className="products-area"
            id="shop-products"
          >
            <div className="section-heading">
              <h2>
                <span>♨</span>
                Sản phẩm nổi bật
              </h2>

              <button
                className="view-all"
                onClick={() => {
                  setSelectedCategory(
                    "all"
                  );
                  setSearch("");
                }}
              >
                Xem tất cả →
              </button>
            </div>

            <div className="shop-toolbar">
              <div className="search-box">
                <span>⌕</span>

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="Tìm kiếm sản phẩm..."
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
                  Sắp xếp
                </option>

                <option value="price-low">
                  Giá thấp → cao
                </option>

                <option value="price-high">
                  Giá cao → thấp
                </option>
              </select>
            </div>

            {error && (
              <div className="error-box">
                <span>{error}</span>

                <button
                  onClick={loadShop}
                >
                  Thử lại
                </button>
              </div>
            )}

            <div className="product-grid">
              {loading ? (
                Array.from({
                  length: 10,
                }).map(
                  (_, index) => (
                    <ProductSkeleton
                      key={index}
                    />
                  )
                )
              ) : visibleProducts.length ? (
                visibleProducts.map(
                  (product) => (
                    <ProductCard
                      key={
                        product.id
                      }
                      product={
                        product
                      }
                      stock={getProductStock(
                        product,
                        stockMap
                      )}
                      onBuy={
                        handleBuyClick
                      }
                    />
                  )
                )
              ) : (
                <div className="empty-products">
                  <div>♡</div>
                  <h3>
                    Không có sản phẩm
                  </h3>
                  <p>
                    Thử đổi danh mục
                    hoặc từ khóa tìm
                    kiếm.
                  </p>
                </div>
              )}
            </div>

            <div className="feature-strip">
              <div>
                <span>ϟ</span>
                <div>
                  <b>
                    Giao dịch siêu nhanh
                  </b>
                  <small>
                    Chỉ vài giây có KEY
                  </small>
                </div>
              </div>

              <div>
                <span>♢</span>
                <div>
                  <b>
                    Bảo mật tuyệt đối
                  </b>
                  <small>
                    An toàn thông tin
                  </small>
                </div>
              </div>

              <div>
                <span>♧</span>
                <div>
                  <b>
                    Hỗ trợ 24/7
                  </b>
                  <small>
                    Luôn luôn bạn
                  </small>
                </div>
              </div>

              <div>
                <span>♧</span>
                <div>
                  <b>
                    Nhiều ưu đãi
                  </b>
                  <small>
                    Dành riêng cho
                    thành viên
                  </small>
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>

      {message && (
        <div className="toast">
          <span>{message}</span>

          <button
            onClick={() =>
              setMessage("")
            }
          >
            ×
          </button>
        </div>
      )}

      <button
        className="chat-admin"
        onClick={() =>
          window.open(
            ZALO_ADMIN,
            "_blank"
          )
        }
      >
        <span className="chat-label">
          Chat Admin
        </span>

        <span className="chat-circle">
          ●
        </span>
      </button>

      {buyModal && (
        <div
          className="modal-backdrop"
          onMouseDown={() => {
            if (!buying) {
              setBuyModal(null);
            }
          }}
        >
          <div
            className="buy-modal"
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="modal-close"
              onClick={() =>
                !buying &&
                setBuyModal(null)
              }
            >
              ×
            </button>

            <div className="modal-icon">
              <ProductIcon
                product={buyModal}
              />
            </div>

            <h3>
              Xác nhận mua sản phẩm
            </h3>

            <p>
              {getProductName(
                buyModal
              )}
            </p>

            <div className="modal-price">
              {formatPrice(
                getProductPrice(
                  buyModal
                )
              )}
            </div>

            <div className="modal-balance">
              Số dư:
              <b>
                {formatPrice(
                  wallet
                )}
              </b>
            </div>

            {message && (
              <div className="modal-error">
                {message}
              </div>
            )}

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() =>
                  !buying &&
                  setBuyModal(null)
                }
              >
                Hủy
              </button>

              <button
                className="confirm-btn"
                onClick={confirmBuy}
                disabled={buying}
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
          <div className="success-modal">
            <div className="success-check">
              ✓
            </div>

            <h3>
              Mua KEY thành công!
            </h3>

            <p>
              {
                successModal.product
              }
            </p>

            {successModal.key ? (
              <div className="key-box">
                <span>
                  {
                    successModal.key
                  }
                </span>

                <button
                  onClick={copyKey}
                >
                  Sao chép
                </button>
              </div>
            ) : (
              <div className="key-box empty-key">
                Đơn hàng đã được tạo
                thành công.
              </div>
            )}

            <button
              className="success-close"
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
          background: #fff7fc;
          color: #252638;
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
        input,
        select {
          font: inherit;
        }

        button {
          border: 0;
          cursor: pointer;
        }

        .shop-page {
          min-height: 100vh;
          overflow-x: hidden;
          position: relative;
          background:
            radial-gradient(
              circle at 8% 18%,
              rgba(255, 115, 179, 0.16),
              transparent 17%
            ),
            radial-gradient(
              circle at 94% 70%,
              rgba(255, 144, 202, 0.18),
              transparent 18%
            ),
            linear-gradient(
              180deg,
              #fff 0%,
              #fffafd 55%,
              #fff1fa 100%
            );
        }

        .petal {
          position: fixed;
          z-index: 1;
          pointer-events: none;
          color: #f26fa8;
          opacity: 0.65;
          animation: petalFloat 7s ease-in-out infinite;
        }

        .petal-1 {
          top: 70px;
          left: 5px;
          font-size: 25px;
        }

        .petal-2 {
          top: 150px;
          right: 18px;
          font-size: 20px;
          animation-delay: -2s;
        }

        .petal-3 {
          top: 400px;
          left: 7px;
          font-size: 19px;
          animation-delay: -4s;
        }

        .petal-4 {
          bottom: 160px;
          right: 10px;
          font-size: 26px;
          animation-delay: -1s;
        }

        .petal-5 {
          bottom: 35px;
          left: 28px;
          font-size: 20px;
          animation-delay: -5s;
        }

        @keyframes petalFloat {
          0%,
          100% {
            transform:
              translateY(0)
              rotate(0deg);
          }

          50% {
            transform:
              translateY(18px)
              rotate(14deg);
          }
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          height: 54px;
          background: rgba(
            255,
            255,
            255,
            0.97
          );
          backdrop-filter: blur(18px);
          border-bottom: 1px solid
            #eee8ee;
        }

        .topbar-inner {
          width: min(
            1220px,
            calc(100% - 28px)
          );
          height: 100%;
          margin: auto;
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .mobile-menu {
          display: none;
          background: transparent;
          color: #303244;
          font-size: 20px;
        }

        .logo {
          width: 115px;
          flex: 0 0 115px;
          background: transparent;
          cursor: pointer;
          text-align: left;
          line-height: 0.9;
        }

        .logo span {
          display: block;
          color: #171a31;
          font-size: 16px;
          font-weight: 1000;
          letter-spacing: -0.7px;
        }

        .logo small {
          display: block;
          margin-left: 38px;
          color: #ff3d8c;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 0.5px;
        }

        .main-nav {
          height: 100%;
          flex: 1;
          display: flex;
          align-items: stretch;
          gap: 3px;
        }

        .nav-item {
          min-width: 72px;
          padding: 5px 7px 4px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1px;
          background: transparent;
          color: #555666;
          font-size: 8.5px;
          font-weight: 700;
          white-space: nowrap;
        }

        .nav-icon {
          font-size: 15px;
          line-height: 15px;
        }

        .nav-item.active {
          color: #ec287d;
          background: #fff1f8;
        }

        .nav-item.active::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 12px;
          right: 12px;
          height: 2px;
          border-radius: 10px 10px 0 0;
          background: #ff3c91;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .theme-button {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #f7f7f9;
          color: #252638;
        }

        .wallet-pill {
          min-width: 94px;
          height: 29px;
          padding: 0 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 8px;
          color: #e8327e;
          background: #fff0f7;
          font-size: 9px;
          font-weight: 900;
        }

        .user-button {
          display: flex;
          align-items: center;
          gap: 4px;
          background: transparent;
        }

        .user-circle {
          width: 27px;
          height: 27px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #ff4a96;
          color: #fff;
          font-size: 11px;
          font-weight: 900;
        }

        .user-arrow {
          font-size: 11px;
          color: #666;
        }

        .page-container {
          position: relative;
          z-index: 2;
          width: min(
            1220px,
            calc(100% - 28px)
          );
          margin: auto;
          padding: 18px 0 35px;
        }

        .hero-banner {
          height: 145px;
          position: relative;
          overflow: hidden;
          border-radius: 14px;
          background:
            radial-gradient(
              circle at 74% 50%,
              rgba(
                255,
                164,
                214,
                0.9
              ),
              transparent 25%
            ),
            radial-gradient(
              circle at 55% 100%,
              rgba(
                255,
                220,
                236,
                0.25
              ),
              transparent 22%
            ),
            linear-gradient(
              100deg,
              #8e105a,
              #e52a83 48%,
              #ff9ac3
            );
          box-shadow:
            0 12px 32px
              rgba(
                211,
                45,
                121,
                0.15
              );
        }

        .hero-banner::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(
              circle at 15% 30%,
              rgba(
                255,
                255,
                255,
                0.4
              )
                0 1px,
              transparent 2px
            ),
            radial-gradient(
              circle at 40% 75%,
              rgba(
                255,
                255,
                255,
                0.32
              )
                0 1px,
              transparent 2px
            ),
            radial-gradient(
              circle at 65% 18%,
              rgba(
                255,
                255,
                255,
                0.38
              )
                0 1px,
              transparent 2px
            );
          background-size:
            70px 70px,
            85px 85px,
            100px 100px;
        }

        .hero-left {
          position: relative;
          z-index: 5;
          width: 54%;
          padding: 19px 0 0 34px;
          color: #fff;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          font-weight: 1000;
        }

        .hero-badge span {
          padding: 5px 10px;
          border-radius: 30px;
          background: rgba(
            255,
            255,
            255,
            0.9
          );
          color: #db2b78;
          font-size: 8px;
        }

        .hero-left h1 {
          margin: 9px 0 4px;
          font-size: 25px;
          line-height: 0.98;
          font-weight: 1000;
          font-style: italic;
          letter-spacing: -0.8px;
          text-shadow:
            0 3px 9px
              rgba(
                95,
                0,
                50,
                0.35
              );
        }

        .hero-left p {
          margin: 0 0 8px;
          font-size: 9px;
          opacity: 0.92;
        }

        .hero-left button {
          height: 24px;
          padding: 0 15px;
          border-radius: 20px;
          background: #fff;
          color: #e52b7f;
          font-size: 9px;
          font-weight: 1000;
          box-shadow:
            0 7px 14px
              rgba(
                92,
                0,
                47,
                0.18
              );
        }

        .hero-art {
          position: absolute;
          right: 230px;
          bottom: -18px;
          width: 230px;
          height: 165px;
          z-index: 3;
        }

        .art-glow {
          position: absolute;
          width: 180px;
          height: 180px;
          right: 15px;
          top: 0;
          border-radius: 50%;
          background: rgba(
            255,
            255,
            255,
            0.18
          );
          filter: blur(12px);
        }

        .art-hair {
          position: absolute;
          right: 38px;
          top: 7px;
          width: 115px;
          height: 125px;
          border-radius:
            58% 48% 48% 54%;
          background:
            radial-gradient(
              circle at 58% 34%,
              #fff0fa 0 3px,
              transparent 4px
            ),
            linear-gradient(
              145deg,
              #5d173d,
              #ef65a3 52%,
              #ffb4d1
            );
          transform: rotate(-5deg);
          box-shadow:
            -25px 20px 0 -7px
              #651740;
        }

        .art-hair::before {
          content: "";
          position: absolute;
          left: -27px;
          top: 32px;
          width: 55px;
          height: 100px;
          border-radius: 50%;
          background: #61153d;
          transform: rotate(20deg);
        }

        .art-hair::after {
          content: "";
          position: absolute;
          right: -15px;
          top: 8px;
          width: 50px;
          height: 75px;
          border-radius: 50%;
          background: #ff8fbc;
          transform: rotate(-24deg);
        }

        .art-face {
          position: absolute;
          z-index: 3;
          left: 20px;
          top: 28px;
          width: 72px;
          height: 82px;
          border-radius:
            48% 48% 45% 45%;
          background:
            linear-gradient(
              145deg,
              #ffe9f2,
              #ffb7d2
            );
          border: 2px solid
            rgba(255, 255, 255, 0.55);
        }

        .eye {
          position: absolute;
          top: 37px;
          width: 8px;
          height: 12px;
          border-radius: 50%;
          background: #72264c;
        }

        .eye-left {
          left: 20px;
        }

        .eye-right {
          right: 20px;
        }

        .mouth {
          position: absolute;
          left: 31px;
          bottom: 17px;
          color: #e94f8f;
          font-size: 13px;
        }

        .art-body {
          position: absolute;
          left: 67px;
          bottom: -25px;
          width: 105px;
          height: 83px;
          border-radius:
            45px 45px 8px 8px;
          background:
            linear-gradient(
              135deg,
              #24172d,
              #6e2451
            );
        }

        .art-bow {
          position: absolute;
          top: 7px;
          left: 40px;
          width: 28px;
          height: 20px;
          border-radius: 50%;
          background: #ff4f9c;
        }

        .hero-services {
          position: absolute;
          z-index: 6;
          right: 18px;
          top: 28px;
          width: 105px;
          padding: 7px 8px;
          border-radius: 10px;
          background: rgba(
            69,
            10,
            50,
            0.78
          );
          box-shadow:
            0 10px 22px
              rgba(
                75,
                0,
                42,
                0.2
              );
        }

        .hero-services div {
          height: 30px;
          display: flex;
          align-items: center;
          gap: 6px;
          border-bottom:
            1px solid
            rgba(
              255,
              255,
              255,
              0.12
            );
          color: #fff;
          font-size: 7px;
          font-weight: 800;
        }

        .hero-services div:last-child {
          border-bottom: 0;
        }

        .hero-services b {
          width: 17px;
          height: 17px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #f13c8c;
          font-size: 9px;
        }

        .banner-dots {
          position: absolute;
          z-index: 8;
          bottom: 8px;
          left: 50%;
          transform:
            translateX(-50%);
          display: flex;
          gap: 5px;
        }

        .banner-dots i {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(
            255,
            255,
            255,
            0.6
          );
        }

        .banner-dots i.active {
          width: 15px;
          border-radius: 10px;
          background: #fff;
        }

        .shop-layout {
          margin-top: 15px;
          display: grid;
          grid-template-columns: 128px 1fr;
          gap: 14px;
        }

        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .side-card {
          border: 1px solid
            #f0e9ef;
          border-radius: 11px;
          background: #fff;
          box-shadow:
            0 4px 16px
              rgba(
                74,
                35,
                60,
                0.05
              );
        }

        .category-card {
          padding: 10px 7px;
        }

        .side-title {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 3px 5px 8px;
          color: #252739;
          font-size: 9px;
        }

        .side-title span {
          color: #ef3181;
          font-size: 13px;
        }

        .category-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .category-item {
          min-height: 25px;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 6px;
          border-radius: 6px;
          background: transparent;
          color: #555769;
          text-align: left;
          font-size: 7.5px;
        }

        .category-item.active {
          color: #e92d7d;
          background: #fff0f7;
          font-weight: 900;
        }

        .category-icon {
          width: 13px;
          text-align: center;
          font-size: 10px;
          font-weight: 1000;
        }

        .category-name {
          flex: 1;
        }

        .category-count {
          font-size: 7px;
          color: #9a9baa;
        }

        .vip-card {
          min-height: 82px;
          position: relative;
          overflow: hidden;
          padding: 11px 8px;
          border-radius: 11px;
          background:
            radial-gradient(
              circle at 15% 50%,
              rgba(
                255,
                255,
                255,
                0.2
              ),
              transparent 28%
            ),
            linear-gradient(
              135deg,
              #5e1749,
              #bd2b78
            );
          color: #fff;
          box-shadow:
            0 9px 20px
              rgba(
                183,
                36,
                111,
                0.2
              );
        }

        .vip-crown {
          position: absolute;
          right: 6px;
          top: 5px;
          color: #ffd96a;
          font-size: 27px;
        }

        .vip-text {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          margin-bottom: 10px;
        }

        .vip-text strong {
          font-size: 8px;
        }

        .vip-text span {
          margin-top: 2px;
          font-size: 6.5px;
          opacity: 0.8;
        }

        .vip-card button {
          position: relative;
          z-index: 2;
          height: 19px;
          padding: 0 8px;
          border-radius: 20px;
          background: #ff4d9a;
          color: #fff;
          font-size: 6.5px;
          font-weight: 900;
        }

        .support-card {
          padding: 9px 7px;
        }

        .support-card button {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 6px 3px;
          background: transparent;
          text-align: left;
          color: #454657;
        }

        .support-icon {
          width: 21px;
          height: 21px;
          display: grid;
          place-items: center;
          flex: 0 0 21px;
          border-radius: 50%;
          background: #eef2f7;
          color: #3976a9;
          font-size: 9px;
          font-weight: 1000;
        }

        .support-card button span:last-child {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .support-card b {
          font-size: 6.5px;
        }

        .support-card small {
          margin-top: 2px;
          color: #999aaa;
          font-size: 5.5px;
        }

        .products-area {
          min-width: 0;
        }

        .section-heading {
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .section-heading h2 {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 7px;
          color: #252739;
          font-size: 14px;
          font-weight: 1000;
        }

        .section-heading h2 span {
          color: #ff3e8e;
          font-size: 18px;
        }

        .view-all {
          background: transparent;
          color: #dc2c76;
          font-size: 7px;
          font-weight: 900;
        }

        .shop-toolbar {
          display: none;
          margin-bottom: 10px;
          gap: 7px;
        }

        .search-box {
          height: 34px;
          flex: 1;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 10px;
          border: 1px solid
            #eee6ec;
          border-radius: 8px;
          background: #fff;
        }

        .search-box input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          font-size: 11px;
        }

        .shop-toolbar select {
          border: 1px solid
            #eee6ec;
          border-radius: 8px;
          background: #fff;
          padding: 0 8px;
          font-size: 10px;
        }

        .product-grid {
          display: grid;
          grid-template-columns:
            repeat(5, minmax(0, 1fr));
          gap: 8px;
        }

        .product-card {
          min-width: 0;
          overflow: hidden;
          border: 1px solid
            #eee8ee;
          border-radius: 9px;
          background: #fff;
          box-shadow:
            0 4px 13px
              rgba(
                70,
                34,
                56,
                0.055
              );
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .product-card:hover {
          transform:
            translateY(-3px);
          box-shadow:
            0 11px 24px
              rgba(
                213,
                43,
                119,
                0.12
              );
        }

        .product-cover {
          height: 102px;
          position: relative;
          overflow: hidden;
          display: grid;
          place-items: center;
          background:
            linear-gradient(
              135deg,
              #17213a,
              #42678b
            );
        }

        .product-cover-windows {
          background:
            linear-gradient(
              135deg,
              #071f49,
              #168ae7
            );
        }

        .product-cover-office {
          background:
            linear-gradient(
              135deg,
              #a8270d,
              #fa4b18
            );
        }

        .product-cover-photoshop {
          background:
            linear-gradient(
              135deg,
              #071b35,
              #124b77
            );
        }

        .product-cover-premiere {
          background:
            linear-gradient(
              135deg,
              #211039,
              #642b8c
            );
        }

        .product-cover-genshin {
          background:
            linear-gradient(
              135deg,
              #4b6e99,
              #9fc6e9
            );
        }

        .product-cover-valorant {
          background:
            linear-gradient(
              135deg,
              #17151e,
              #731e35
            );
        }

        .product-cover-roblox {
          background:
            linear-gradient(
              135deg,
              #17191f,
              #3c4048
            );
        }

        .cover-glow {
          position: absolute;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: rgba(
            255,
            255,
            255,
            0.16
          );
          filter: blur(9px);
        }

        .product-icon {
          position: relative;
          z-index: 2;
          width: 67px;
          height: 67px;
          display: grid;
          place-items: center;
          filter:
            drop-shadow(
              0 7px 10px
                rgba(
                  0,
                  0,
                  0,
                  0.22
                )
            );
          transition:
            transform 0.2s ease;
        }

        .product-icon svg {
          width: 58px;
          height: 58px;
          display: block;
        }

        .product-card:hover
          .product-icon {
          transform:
            scale(1.06)
            translateY(-2px);
        }

        .product-icon-generic {
          color: #ff3d8f;
        }

        .cover-corner {
          position: absolute;
          top: 6px;
          left: 6px;
          z-index: 4;
          padding: 3px 6px;
          border-radius: 5px;
          background: rgba(
            255,
            255,
            255,
            0.9
          );
          color: #e8307e;
          font-size: 5.5px;
          font-weight: 1000;
        }

        .product-body {
          padding: 7px;
        }

        .product-name {
          height: 17px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          color: #3c3d4d;
          font-size: 7px;
          font-weight: 900;
        }

        .product-tags {
          min-height: 16px;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 2px;
        }

        .product-tags span {
          padding: 2px 4px;
          border-radius: 4px;
          font-size: 5px;
          font-weight: 800;
        }

        .tag-hot {
          color: #ee315e;
          background: #ffe9ed;
        }

        .tag-new {
          color: #3877db;
          background: #edf4ff;
        }

        .tag-auto {
          color: #858795;
          background: #f3f3f5;
        }

        .product-price {
          margin-top: 5px;
          color: #ed267c;
          font-size: 9px;
          font-weight: 1000;
        }

        .buy-button {
          width: 100%;
          height: 21px;
          margin-top: 6px;
          border-radius: 6px;
          background:
            linear-gradient(
              90deg,
              #ff3b91,
              #ed2e80
            );
          color: #fff;
          font-size: 6px;
          font-weight: 1000;
          box-shadow:
            0 4px 9px
              rgba(
                236,
                44,
                126,
                0.18
              );
        }

        .buy-button:disabled {
          background: #d8d8de;
          box-shadow: none;
          cursor: not-allowed;
        }

        .feature-strip {
          margin-top: 10px;
          min-height: 48px;
          display: grid;
          grid-template-columns:
            repeat(4, 1fr);
          border-radius: 10px;
          background:
            linear-gradient(
              90deg,
              #fff0f8,
              #ffe8f4
            );
          border: 1px solid
            #f5dce9;
        }

        .feature-strip > div {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-right:
            1px solid
            rgba(
              220,
              60,
              130,
              0.08
            );
        }

        .feature-strip > div:last-child {
          border-right: 0;
        }

        .feature-strip
          > div
          > span {
          width: 24px;
          height: 24px;
          display: grid;
          place-items: center;
          border-radius: 7px;
          color: #f02d81;
          font-size: 17px;
        }

        .feature-strip div div {
          display: flex;
          flex-direction: column;
        }

        .feature-strip b {
          color: #d42b75;
          font-size: 6px;
        }

        .feature-strip small {
          margin-top: 2px;
          color: #a3a0a9;
          font-size: 5px;
        }

        .error-box {
          margin-bottom: 10px;
          padding: 10px;
          border-radius: 8px;
          background: #fff0f1;
          color: #c82c43;
          font-size: 9px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .error-box button {
          padding: 4px 9px;
          border-radius: 5px;
          background: #ef3c58;
          color: #fff;
          font-size: 8px;
        }

        .empty-products {
          grid-column: 1 / -1;
          min-height: 180px;
          display: grid;
          place-items: center;
          align-content: center;
          border: 1px dashed
            #efcadf;
          border-radius: 10px;
          background: rgba(
            255,
            255,
            255,
            0.75
          );
          text-align: center;
        }

        .empty-products > div {
          color: #ef3986;
          font-size: 30px;
        }

        .empty-products h3 {
          margin: 4px 0;
          font-size: 13px;
        }

        .empty-products p {
          margin: 0;
          color: #999;
          font-size: 9px;
        }

        .skeleton-card {
          padding-bottom: 8px;
        }

        .skeleton {
          position: relative;
          overflow: hidden;
          background: #f4edf2;
        }

        .skeleton::after {
          content: "";
          position: absolute;
          inset: 0;
          transform:
            translateX(-100%);
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(
                255,
                255,
                255,
                0.8
              ),
              transparent
            );
          animation:
            shimmer 1.2s infinite;
        }

        @keyframes shimmer {
          100% {
            transform:
              translateX(100%);
          }
        }

        .cover-skeleton {
          height: 102px;
        }

        .skeleton-line {
          height: 7px;
          margin: 8px 8px 0;
          border-radius: 4px;
        }

        .skeleton-line.large {
          width: 65%;
        }

        .skeleton-line.small {
          width: 42%;
        }

        .skeleton-line.price {
          width: 30%;
          margin-top: 9px;
        }

        .skeleton-button {
          height: 21px;
          margin: 6px 8px 0;
          border-radius: 6px;
        }

        .chat-admin {
          position: fixed;
          right: 22px;
          bottom: 17px;
          z-index: 60;
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
        }

        .chat-label {
          padding: 7px 9px;
          border-radius: 8px;
          background: #fff;
          color: #444556;
          font-size: 7px;
          font-weight: 900;
          box-shadow:
            0 5px 18px
              rgba(
                60,
                30,
                50,
                0.13
              );
        }

        .chat-circle {
          width: 39px;
          height: 39px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background:
            linear-gradient(
              135deg,
              #ff4b99,
              #e9287e
            );
          color: #fff;
          font-size: 14px;
          border: 4px solid #fff;
          box-shadow:
            0 6px 18px
              rgba(
                225,
                39,
                119,
                0.25
              );
        }

        .toast {
          position: fixed;
          z-index: 100;
          left: 50%;
          bottom: 20px;
          transform:
            translateX(-50%);
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 13px;
          border-radius: 9px;
          background: #242536;
          color: #fff;
          box-shadow:
            0 10px 30px
              rgba(0, 0, 0, 0.2);
          font-size: 9px;
        }

        .toast button {
          color: #fff;
          background: transparent;
          font-size: 16px;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: grid;
          place-items: center;
          padding: 18px;
          background:
            rgba(
              28,
              16,
              26,
              0.55
            );
          backdrop-filter: blur(5px);
        }

        .buy-modal,
        .success-modal {
          width: min(
            390px,
            100%
          );
          position: relative;
          padding: 25px;
          border-radius: 17px;
          background: #fff;
          box-shadow:
            0 25px 70px
              rgba(
                38,
                15,
                31,
                0.3
              );
          text-align: center;
        }

        .modal-close {
          position: absolute;
          top: 9px;
          right: 12px;
          width: 27px;
          height: 27px;
          border-radius: 50%;
          background: #f7f2f5;
          color: #777;
          font-size: 18px;
        }

        .modal-icon {
          display: grid;
          place-items: center;
          margin-bottom: 8px;
        }

        .modal-icon
          .product-icon {
          width: 80px;
          height: 80px;
        }

        .modal-icon
          .product-icon
          svg {
          width: 70px;
          height: 70px;
        }

        .buy-modal h3,
        .success-modal h3 {
          margin: 5px 0;
          color: #282a3c;
          font-size: 18px;
        }

        .buy-modal p,
        .success-modal p {
          margin: 5px 0;
          color: #77798a;
          font-size: 11px;
        }

        .modal-price {
          margin: 12px 0;
          color: #ed2e7f;
          font-size: 22px;
          font-weight: 1000;
        }

        .modal-balance {
          display: flex;
          justify-content: center;
          gap: 6px;
          color: #777;
          font-size: 10px;
        }

        .modal-balance b {
          color: #282a3c;
        }

        .modal-error {
          margin-top: 10px;
          padding: 8px;
          border-radius: 7px;
          background: #fff0f1;
          color: #d43148;
          font-size: 9px;
        }

        .modal-actions {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 8px;
          margin-top: 18px;
        }

        .cancel-btn,
        .confirm-btn,
        .success-close {
          height: 38px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 900;
        }

        .cancel-btn {
          background: #f2f1f4;
          color: #5f6070;
        }

        .confirm-btn,
        .success-close {
          background:
            linear-gradient(
              90deg,
              #ff3b91,
              #eb2b7f
            );
          color: #fff;
        }

        .confirm-btn:disabled {
          opacity: 0.6;
        }

        .success-check {
          width: 60px;
          height: 60px;
          margin: 0 auto 8px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #e8fff2;
          color: #21b86b;
          font-size: 28px;
          font-weight: 1000;
        }

        .key-box {
          margin-top: 14px;
          padding: 10px;
          display: flex;
          align-items: center;
          gap: 7px;
          border: 1px dashed
            #f1b3d1;
          border-radius: 9px;
          background: #fff7fb;
        }

        .key-box span {
          flex: 1;
          overflow: hidden;
          word-break: break-all;
          color: #d52676;
          font-size: 10px;
          font-weight: 900;
        }

        .key-box button {
          flex: 0 0 auto;
          padding: 7px 9px;
          border-radius: 6px;
          background: #ef3282;
          color: #fff;
          font-size: 8px;
          font-weight: 900;
        }

        .empty-key {
          justify-content: center;
          color: #777;
          font-size: 10px;
        }

        .success-close {
          width: 100%;
          margin-top: 13px;
        }

        @media (max-width: 1000px) {
          .main-nav {
            gap: 0;
          }

          .nav-item {
            min-width: 59px;
            font-size: 7px;
          }

          .hero-art {
            right: 180px;
          }

          .product-grid {
            grid-template-columns:
              repeat(
                4,
                minmax(0, 1fr)
              );
          }
        }

        @media (max-width: 760px) {
          .topbar {
            height: 52px;
          }

          .topbar-inner {
            width: calc(100% - 18px);
            gap: 7px;
          }

          .mobile-menu {
            display: block;
          }

          .logo {
            width: 85px;
            flex-basis: 85px;
          }

          .logo span {
            font-size: 14px;
          }

          .logo small {
            margin-left: 29px;
            font-size: 8px;
          }

          .main-nav {
            display: none;
          }

          .header-right {
            margin-left: auto;
          }

          .wallet-pill {
            min-width: 70px;
          }

          .wallet-pill b {
            font-size: 8px;
          }

          .theme-button {
            display: none;
          }

          .page-container {
            width: calc(100% - 18px);
            padding-top: 10px;
          }

          .hero-banner {
            height: 175px;
          }

          .hero-left {
            width: 70%;
            padding:
              19px 0 0 20px;
          }

          .hero-left h1 {
            font-size: 23px;
          }

          .hero-art {
            right: 30px;
            transform: scale(0.75);
            transform-origin:
              bottom right;
          }

          .hero-services {
            right: 8px;
            top: 19px;
            transform: scale(0.8);
            transform-origin:
              top right;
          }

          .shop-layout {
            grid-template-columns: 1fr;
          }

          .sidebar {
            display: none;
          }

          .shop-toolbar {
            display: flex;
          }

          .product-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
            gap: 8px;
          }

          .product-cover {
            height: 125px;
          }

          .feature-strip {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .feature-strip > div {
            min-height: 48px;
          }

          .chat-label {
            display: none;
          }

          .chat-admin {
            right: 12px;
            bottom: 12px;
          }
        }

        @media (max-width: 420px) {
          .hero-art {
            right: 5px;
            transform: scale(0.62);
            transform-origin:
              bottom right;
          }

          .hero-services {
            display: none;
          }

          .hero-left {
            width: 100%;
          }

          .product-cover {
            height: 115px;
          }

          .product-icon {
            width: 60px;
            height: 60px;
          }

          .product-icon svg {
            width: 52px;
            height: 52px;
          }

          .section-heading h2 {
            font-size: 13px;
          }
        }
      `}</style>
    </main>
  );
}
