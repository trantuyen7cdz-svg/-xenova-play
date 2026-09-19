"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ZALO_ADMIN = "https://zalo.me/84365717262";

const NAV_ITEMS = [
  { label: "Trang chủ", href: "/" },
  { label: "Cửa hàng", href: "/shop" },
  { label: "Nạp tiền", href: "/deposit" },
  { label: "KEY của tôi", href: "/keys" },
  { label: "Đơn hàng", href: "/orders" },
  { label: "Tài khoản", href: "/dashboard" },
  { label: "Cài đặt", href: "/settings" },
];

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatPrice(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString("vi-VN")}đ`;
}

function formatDuration(days) {
  const value = Number(days);

  if (!value) return "";

  if (value === 1) return "1 ngày";
  if (value === 7) return "7 ngày";
  if (value === 30) return "1 tháng";
  if (value === 90) return "3 tháng";
  if (value === 365) return "1 năm";

  return `${value} ngày`;
}

function getProductName(product) {
  return (
    product?.name ||
    product?.title ||
    product?.product_name ||
    "Sản phẩm"
  );
}

function getProductPrice(product) {
  return Number(
    product?.price ??
      product?.selling_price ??
      product?.amount ??
      product?.price_vnd ??
      0
  );
}

function getProductDays(product) {
  return (
    product?.duration_days ??
    product?.duration ??
    product?.days ??
    null
  );
}

function getProductCategory(product) {
  return (
    product?.category_id ??
    product?.categoryId ??
    product?.category ??
    null
  );
}

function getProductStock(stock, product) {
  if (!stock || !product) return 0;

  const id = String(product.id);

  const possible = [
    stock[id],
    stock[product.id],
    stock?.products?.[id],
    stock?.data?.[id],
  ];

  for (const item of possible) {
    if (item == null) continue;

    if (typeof item === "number") {
      return Math.max(0, Number(item));
    }

    if (typeof item === "object") {
      const value =
        item.available ??
        item.stock ??
        item.quantity ??
        item.count ??
        item.total;

      if (value != null) {
        return Math.max(0, Number(value));
      }
    }
  }

  if (Array.isArray(stock)) {
    const found = stock.find(
      (item) =>
        String(item?.product_id ?? item?.productId ?? item?.id) === id
    );

    if (found) {
      return Math.max(
        0,
        Number(
          found.available ??
            found.stock ??
            found.quantity ??
            found.count ??
            0
        )
      );
    }
  }

  return 0;
}

function getCategoryName(category) {
  return (
    category?.name ||
    category?.title ||
    category?.category_name ||
    "Danh mục"
  );
}

function ProductIcon({ product }) {
  const name = normalize(getProductName(product));

  let icon = "✦";

  if (name.includes("android") || name.includes("adr")) icon = "🤖";
  else if (name.includes("iphone") || name.includes("ios")) icon = "";
  else if (name.includes("pc") || name.includes("windows")) icon = "💻";
  else if (name.includes("game")) icon = "🎮";
  else if (name.includes("office")) icon = "▦";
  else if (name.includes("photoshop")) icon = "Ps";
  else if (name.includes("valorant")) icon = "V";
  else if (name.includes("key")) icon = "🔑";

  return <div className="product-icon">{icon}</div>;
}

function ProductCard({ product, stock, onBuy }) {
  const available = getProductStock(stock, product);
  const price = getProductPrice(product);
  const days = getProductDays(product);
  const name = getProductName(product);

  const sold =
    Number(product?.sold || 0) > 0 ||
    normalize(name).includes("office") ||
    normalize(name).includes("photoshop") ||
    normalize(name).includes("valorant");

  return (
    <article className="product-card">
      <div className="product-cover">
        <div className="cover-glow" />
        <ProductIcon product={product} />

        <span className={`status-badge ${sold ? "hot" : ""}`}>
          {sold ? "BÁN CHẠY" : "HOT"}
        </span>
      </div>

      <div className="product-content">
        <h3>{name}</h3>

        {days && (
          <div className="duration">
            ⏱ {formatDuration(days)}
          </div>
        )}

        <div className="tags">
          <span>{sold ? "Bán chạy" : "Hot"}</span>
          <span>Tự động</span>
        </div>

        <div className="product-meta">
          <strong>{formatPrice(price)}</strong>

          <span className={available > 0 ? "in-stock" : "out-stock"}>
            {available > 0
              ? `${available} còn lại`
              : "Hết hàng"}
          </span>
        </div>

        <button
          className="buy-button"
          disabled={available <= 0}
          onClick={() => onBuy(product)}
        >
          {available > 0 ? "Mua ngay  →" : "Hết hàng"}
        </button>
      </div>
    </article>
  );
}

function ProductSkeleton() {
  return (
    <div className="product-card skeleton-card">
      <div className="skeleton cover-skeleton" />
      <div className="skeleton line big" />
      <div className="skeleton line small" />
      <div className="skeleton line button" />
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
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("default");

  const [buyModal, setBuyModal] = useState(null);
  const [successModal, setSuccessModal] = useState(null);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState("");

  async function loadWallet(currentUser) {
    if (!currentUser) {
      setWallet(0);
      return;
    }

    const { data, error: walletError } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (!walletError) {
      setWallet(Number(data?.balance || 0));
    }
  }

  async function loadShop(currentUser = user) {
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

      const catalogData = await catalogResponse.json();
      const stockData = await stockResponse.json();

      if (!catalogResponse.ok) {
        throw new Error(
          catalogData?.error ||
            catalogData?.message ||
            "Không thể tải sản phẩm."
        );
      }

      const categoryList =
        catalogData?.categories ||
        catalogData?.data?.categories ||
        [];

      const productList =
        catalogData?.products ||
        catalogData?.data?.products ||
        [];

      const stockValue =
        stockData?.stock ||
        stockData?.data ||
        stockData ||
        {};

      setCategories(Array.isArray(categoryList) ? categoryList : []);
      setProducts(Array.isArray(productList) ? productList : []);
      setStock(stockValue);

      if (currentUser) {
        await loadWallet(currentUser);
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "Có lỗi khi tải cửa hàng.");
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

      const currentUser = session?.user || null;

      setUser(currentUser);
      await loadShop(currentUser);
    }

    init();

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
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const visibleProducts = useMemo(() => {
    let result = [...products];

    if (selectedCategory !== "all") {
      result = result.filter((product) => {
        const category = getProductCategory(product);

        return String(category) === String(selectedCategory);
      });
    }

    const keyword = normalize(search.trim());

    if (keyword) {
      result = result.filter((product) => {
        const name = normalize(getProductName(product));

        const categoryText = normalize(
          categories.find(
            (category) =>
              String(category.id) ===
              String(getProductCategory(product))
          )
            ? getCategoryName(
                categories.find(
                  (category) =>
                    String(category.id) ===
                    String(getProductCategory(product))
                )
              )
            : ""
        );

        return (
          name.includes(keyword) ||
          categoryText.includes(keyword)
        );
      });
    }

    if (sort === "price-asc") {
      result.sort(
        (a, b) => getProductPrice(a) - getProductPrice(b)
      );
    }

    if (sort === "price-desc") {
      result.sort(
        (a, b) => getProductPrice(b) - getProductPrice(a)
      );
    }

    if (sort === "stock") {
      result.sort(
        (a, b) =>
          getProductStock(stock, b) -
          getProductStock(stock, a)
      );
    }

    if (sort === "name") {
      result.sort((a, b) =>
        getProductName(a).localeCompare(
          getProductName(b),
          "vi"
        )
      );
    }

    return result;
  }, [
    products,
    categories,
    stock,
    selectedCategory,
    search,
    sort,
  ]);

  function handleBuyClick(product) {
    const available = getProductStock(stock, product);

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
    const price = getProductPrice(product);
    const available = getProductStock(stock, product);

    if (available <= 0) {
      setMessage("Sản phẩm vừa hết hàng.");
      setBuyModal(null);
      return;
    }

    if (wallet < price) {
      setMessage("Số dư không đủ. Vui lòng nạp thêm tiền.");
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
        product,
        key,
        order: data?.order || data?.data?.order || null,
      });

      await loadShop(user);
    } catch (err) {
      console.error(err);
      setMessage(err?.message || "Không thể mua sản phẩm.");
    } finally {
      setBuying(false);
    }
  }

  async function copyKey() {
    const key = successModal?.key;

    if (!key) return;

    try {
      await navigator.clipboard.writeText(key);
      setMessage("Đã copy KEY.");
    } catch {
      setMessage("Không thể copy tự động.");
    }
  }

  function goDeposit() {
    router.push("/deposit");
  }

  const totalStock = products.reduce(
    (sum, product) =>
      sum + getProductStock(stock, product),
    0
  );

  return (
    <main className="shop-page">
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #fff7fc;
          color: #241b2d;
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
          cursor: pointer;
        }

        .shop-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 85% 0%,
              rgba(255, 117, 188, 0.2),
              transparent 30%
            ),
            linear-gradient(
              180deg,
              #fff6fc 0%,
              #fff 50%,
              #fff7fc 100%
            );
        }

        .topbar {
          height: 74px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 6%;
          background: rgba(255, 255, 255, 0.9);
          border-bottom: 1px solid #f4dce9;
          backdrop-filter: blur(16px);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 950;
          color: #e62f87;
          font-size: 22px;
          letter-spacing: -0.7px;
        }

        .brand-logo {
          width: 40px;
          height: 40px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          color: white;
          background: linear-gradient(
            135deg,
            #ff4ca0,
            #c81d75
          );
          box-shadow:
            0 8px 22px rgba(230, 47, 135, 0.25);
        }

        .nav {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .nav a {
          text-decoration: none;
          color: #756778;
          font-size: 13px;
          font-weight: 750;
          padding: 10px 12px;
          border-radius: 12px;
          transition: 0.2s;
        }

        .nav a:hover,
        .nav a.active {
          color: #d8297b;
          background: #fff0f8;
        }

        .account-area {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .balance {
          padding: 9px 13px;
          border-radius: 12px;
          background: #fff1f8;
          color: #d7287a;
          font-weight: 850;
          font-size: 13px;
        }

        .login-btn {
          border: 0;
          padding: 10px 15px;
          border-radius: 12px;
          color: white;
          background: #e53287;
          font-weight: 850;
        }

        .hero {
          max-width: 1240px;
          margin: 0 auto;
          padding: 42px 24px 26px;
          display: grid;
          grid-template-columns: 1.35fr 0.65fr;
          gap: 18px;
        }

        .hero-main {
          position: relative;
          overflow: hidden;
          min-height: 250px;
          border-radius: 30px;
          padding: 38px;
          background:
            radial-gradient(
              circle at 90% 10%,
              rgba(255, 255, 255, 0.8),
              transparent 25%
            ),
            linear-gradient(
              135deg,
              #ff65ae,
              #ef398e 52%,
              #c72075
            );
          color: white;
          box-shadow:
            0 24px 60px rgba(215, 39, 122, 0.2);
        }

        .hero-main::after {
          content: "✦";
          position: absolute;
          right: 9%;
          bottom: -25px;
          font-size: 190px;
          opacity: 0.12;
        }

        .hero-main small {
          font-weight: 800;
          opacity: 0.85;
        }

        .hero-main h1 {
          margin: 9px 0;
          max-width: 650px;
          font-size: clamp(34px, 5vw, 58px);
          line-height: 0.98;
          letter-spacing: -2.8px;
        }

        .hero-main p {
          margin: 14px 0 0;
          max-width: 620px;
          line-height: 1.6;
          opacity: 0.92;
        }

        .hero-side {
          border-radius: 30px;
          padding: 27px;
          background: white;
          border: 1px solid #f3dce9;
          box-shadow: 0 16px 45px rgba(70, 26, 52, 0.06);
        }

        .hero-side-title {
          color: #8b7285;
          font-size: 13px;
          font-weight: 800;
        }

        .hero-number {
          margin: 8px 0 3px;
          font-size: 36px;
          font-weight: 950;
          color: #d9277a;
        }

        .hero-side p {
          color: #897a87;
          font-size: 13px;
          line-height: 1.55;
          margin: 0 0 18px;
        }

        .deposit-btn {
          width: 100%;
          border: 0;
          border-radius: 14px;
          padding: 13px;
          color: white;
          font-weight: 900;
          background: linear-gradient(
            135deg,
            #ec3c91,
            #c92276
          );
        }

        .layout {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 24px 60px;
          display: grid;
          grid-template-columns: 230px 1fr;
          gap: 22px;
        }

        .sidebar {
          position: sticky;
          top: 94px;
          align-self: start;
          background: white;
          border: 1px solid #f1dce8;
          border-radius: 22px;
          padding: 15px;
          box-shadow: 0 14px 40px rgba(68, 25, 50, 0.05);
        }

        .sidebar-title {
          padding: 7px 9px 12px;
          font-size: 12px;
          text-transform: uppercase;
          color: #9a8292;
          font-weight: 900;
          letter-spacing: 0.7px;
        }

        .category-btn {
          width: 100%;
          border: 0;
          background: transparent;
          text-align: left;
          border-radius: 12px;
          padding: 11px 10px;
          color: #6e5d6a;
          font-weight: 750;
          margin-bottom: 3px;
        }

        .category-btn:hover,
        .category-btn.active {
          color: #d7297a;
          background: #fff0f8;
        }

        .category-count {
          float: right;
          color: #ae9ba8;
          font-size: 12px;
        }

        .shop-content {
          min-width: 0;
        }

        .toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }

        .search-box {
          flex: 1;
          position: relative;
        }

        .search-box span {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #a793a1;
        }

        .search-box input {
          width: 100%;
          height: 46px;
          border: 1px solid #efd9e7;
          outline: none;
          border-radius: 14px;
          background: white;
          padding: 0 15px 0 40px;
          color: #342733;
          transition: 0.2s;
        }

        .search-box input:focus {
          border-color: #ef4b99;
          box-shadow: 0 0 0 4px rgba(239, 75, 153, 0.08);
        }

        .sort-select {
          height: 46px;
          border: 1px solid #efd9e7;
          border-radius: 14px;
          padding: 0 13px;
          background: white;
          color: #5d4b59;
          outline: none;
          font-weight: 700;
        }

        .section-head {
          display: flex;
          justify-content: space-between;
          align-items: end;
          margin-bottom: 14px;
        }

        .section-head h2 {
          margin: 0;
          font-size: 23px;
          letter-spacing: -0.8px;
        }

        .section-head p {
          margin: 4px 0 0;
          color: #998793;
          font-size: 13px;
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .product-card {
          overflow: hidden;
          background: white;
          border: 1px solid #f0dce7;
          border-radius: 21px;
          box-shadow: 0 12px 32px rgba(60, 24, 46, 0.055);
          transition:
            transform 0.2s,
            box-shadow 0.2s;
        }

        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 42px rgba(60, 24, 46, 0.1);
        }

        .product-cover {
          height: 155px;
          position: relative;
          display: grid;
          place-items: center;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 30% 25%,
              rgba(255, 255, 255, 0.95),
              transparent 18%
            ),
            linear-gradient(
              135deg,
              #ffe0ef,
              #f8b5d5
            );
        }

        .cover-glow {
          position: absolute;
          width: 150px;
          height: 150px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.42);
          filter: blur(4px);
        }

        .product-icon {
          position: relative;
          z-index: 1;
          width: 82px;
          height: 82px;
          border-radius: 24px;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.84);
          border: 1px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 16px 35px rgba(170, 47, 112, 0.18);
          font-size: 31px;
          font-weight: 950;
          color: #d32979;
        }

        .status-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 2;
          padding: 6px 9px;
          border-radius: 9px;
          background: #fff;
          color: #d62a7b;
          font-size: 9px;
          font-weight: 950;
          box-shadow: 0 6px 15px rgba(100, 25, 65, 0.08);
        }

        .status-badge.hot {
          background: #e72f84;
          color: white;
        }

        .product-content {
          padding: 15px;
        }

        .product-content h3 {
          margin: 0;
          min-height: 40px;
          font-size: 15px;
          line-height: 1.35;
        }

        .duration {
          margin-top: 6px;
          color: #9a8291;
          font-size: 12px;
        }

        .tags {
          display: flex;
          gap: 5px;
          margin-top: 11px;
        }

        .tags span {
          padding: 5px 7px;
          border-radius: 7px;
          background: #fff1f8;
          color: #d62a7b;
          font-size: 9px;
          font-weight: 850;
        }

        .product-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-top: 13px;
        }

        .product-meta strong {
          color: #d62578;
          font-size: 18px;
        }

        .stock-small,
        .in-stock,
        .out-stock {
          font-size: 10px;
          font-weight: 800;
        }

        .in-stock {
          color: #35a36b;
        }

        .out-stock {
          color: #df5c6d;
        }

        .buy-button {
          width: 100%;
          margin-top: 12px;
          border: 0;
          border-radius: 12px;
          padding: 11px;
          background: #e93287;
          color: white;
          font-weight: 900;
          transition: 0.2s;
        }

        .buy-button:hover:not(:disabled) {
          background: #d92478;
          transform: translateY(-1px);
        }

        .buy-button:disabled {
          cursor: not-allowed;
          background: #e7dfe4;
          color: #9b8e96;
        }

        .empty {
          grid-column: 1 / -1;
          text-align: center;
          padding: 55px 20px;
          background: white;
          border: 1px dashed #e8cfdd;
          border-radius: 20px;
          color: #917e8b;
        }

        .error-box {
          padding: 14px 16px;
          margin-bottom: 15px;
          border-radius: 14px;
          color: #a92842;
          background: #fff0f2;
          border: 1px solid #ffd4dc;
          font-size: 13px;
        }

        .message {
          position: fixed;
          left: 50%;
          bottom: 24px;
          transform: translateX(-50%);
          z-index: 100;
          padding: 12px 18px;
          border-radius: 13px;
          background: #241b2d;
          color: white;
          font-size: 13px;
          font-weight: 750;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
        }

        .floating-zalo {
          position: fixed;
          right: 20px;
          bottom: 20px;
          z-index: 40;
          border: 0;
          border-radius: 999px;
          padding: 13px 17px;
          background: #e83288;
          color: white;
          font-weight: 900;
          box-shadow: 0 12px 28px rgba(218, 42, 124, 0.3);
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(32, 19, 29, 0.55);
          backdrop-filter: blur(8px);
        }

        .modal {
          width: min(460px, 100%);
          background: white;
          border-radius: 24px;
          padding: 25px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.2);
        }

        .modal h2 {
          margin: 0 0 8px;
          font-size: 22px;
        }

        .modal p {
          color: #82717d;
          font-size: 13px;
          line-height: 1.55;
        }

        .modal-product {
          margin: 18px 0;
          padding: 15px;
          border-radius: 15px;
          background: #fff4f9;
        }

        .modal-product strong {
          display: block;
          color: #d7287a;
          font-size: 19px;
          margin-top: 5px;
        }

        .modal-actions {
          display: flex;
          gap: 9px;
          margin-top: 18px;
        }

        .modal-actions button {
          flex: 1;
          border: 0;
          border-radius: 12px;
          padding: 12px;
          font-weight: 850;
        }

        .cancel {
          background: #f3edf1;
          color: #675765;
        }

        .confirm {
          color: white;
          background: #e62f84;
        }

        .confirm:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .key-box {
          margin: 17px 0;
          padding: 15px;
          border-radius: 15px;
          background: #fff4f9;
          border: 1px dashed #e75498;
          word-break: break-all;
          color: #c62570;
          font-weight: 900;
        }

        .copy-key {
          width: 100%;
          border: 0;
          border-radius: 12px;
          padding: 12px;
          color: white;
          background: #e52f83;
          font-weight: 900;
        }

        .skeleton-card {
          padding-bottom: 15px;
        }

        .skeleton {
          position: relative;
          overflow: hidden;
          background: #f5eaf0;
        }

        .skeleton::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.7),
            transparent
          );
          animation: shimmer 1.2s infinite;
        }

        .cover-skeleton {
          height: 155px;
        }

        .line {
          height: 13px;
          margin: 15px 15px 0;
          border-radius: 8px;
        }

        .line.big {
          width: 65%;
        }

        .line.small {
          width: 35%;
          margin-top: 9px;
        }

        .line.button {
          width: calc(100% - 30px);
          height: 38px;
          margin-top: 13px;
        }

        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }

        @media (max-width: 1000px) {
          .nav {
            display: none;
          }

          .hero {
            grid-template-columns: 1fr;
          }

          .layout {
            grid-template-columns: 190px 1fr;
          }

          .product-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .topbar {
            padding: 0 15px;
          }

          .brand {
            font-size: 18px;
          }

          .account-area .balance {
            display: none;
          }

          .hero {
            padding: 20px 15px;
          }

          .hero-main {
            min-height: 235px;
            padding: 27px;
            border-radius: 23px;
          }

          .hero-side {
            border-radius: 23px;
          }

          .layout {
            display: block;
            padding: 0 15px 50px;
          }

          .sidebar {
            position: static;
            margin-bottom: 15px;
            overflow-x: auto;
            white-space: nowrap;
            padding: 9px;
          }

          .sidebar-title {
            display: none;
          }

          .category-btn {
            width: auto;
            display: inline-block;
            margin: 0 3px;
          }

          .toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .product-grid {
            grid-template-columns: 1fr;
          }

          .section-head {
            align-items: flex-start;
            flex-direction: column;
            gap: 4px;
          }

          .floating-zalo {
            right: 14px;
            bottom: 14px;
          }
        }
      `}</style>

      <header className="topbar">
        <a href="/shop" className="brand">
          <span className="brand-logo">X</span>
          XENOVA PLAY
        </a>

        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={
                item.href === "/shop" ? "active" : ""
              }
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="account-area">
          {user && (
            <div className="balance">
              {formatPrice(wallet)}
            </div>
          )}

          {!user && (
            <button
              className="login-btn"
              onClick={() => router.push("/login")}
            >
              Đăng nhập
            </button>
          )}
        </div>
      </header>

      <section className="hero">
        <div className="hero-main">
          <small>WELCOME TO XENOVA PLAY</small>
          <h1>Kho KEY tự động dành cho bạn.</h1>
          <p>
            Mua KEY nhanh chóng, thanh toán bằng số dư
            tài khoản và nhận KEY ngay sau khi đơn hàng
            hoàn tất.
          </p>
        </div>

        <div className="hero-side">
          <div className="hero-side-title">
            KEY ĐANG CÓ SẴN
          </div>

          <div className="hero-number">
            {totalStock.toLocaleString("vi-VN")}
          </div>

          <p>
            Hệ thống tự động cập nhật số lượng sản phẩm
            còn lại.
          </p>

          <button
            className="deposit-btn"
            onClick={goDeposit}
          >
            + Nạp tiền
          </button>
        </div>
      </section>

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-title">Danh mục</div>

          <button
            className={`category-btn ${
              selectedCategory === "all" ? "active" : ""
            }`}
            onClick={() => setSelectedCategory("all")}
          >
            Tất cả
            <span className="category-count">
              {products.length}
            </span>
          </button>

          {categories.map((category) => {
            const categoryId = category.id;

            const count = products.filter(
              (product) =>
                String(getProductCategory(product)) ===
                String(categoryId)
            ).length;

            return (
              <button
                key={categoryId}
                className={`category-btn ${
                  String(selectedCategory) ===
                  String(categoryId)
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setSelectedCategory(categoryId)
                }
              >
                {getCategoryName(category)}

                <span className="category-count">
                  {count}
                </span>
              </button>
            );
          })}
        </aside>

        <section className="shop-content">
          <div className="toolbar">
            <div className="search-box">
              <span>⌕</span>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
              />
            </div>

            <select
              className="sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
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
              <option value="stock">
                Còn nhiều hàng
              </option>
              <option value="name">
                Tên A → Z
              </option>
            </select>
          </div>

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          <div className="section-head">
            <div>
              <h2>Sản phẩm</h2>
              <p>
                {loading
                  ? "Đang tải..."
                  : `${visibleProducts.length} sản phẩm`}
              </p>
            </div>
          </div>

          <div className="product-grid">
            {loading ? (
              <>
                <ProductSkeleton />
                <ProductSkeleton />
                <ProductSkeleton />
                <ProductSkeleton />
                <ProductSkeleton />
                <ProductSkeleton />
              </>
            ) : visibleProducts.length === 0 ? (
              <div className="empty">
                Không tìm thấy sản phẩm phù hợp.
              </div>
            ) : (
              visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  stock={stock}
                  onBuy={handleBuyClick}
                />
              ))
            )}
          </div>
        </section>
      </div>

      <button
        className="floating-zalo"
        onClick={() =>
          window.open(
            ZALO_ADMIN,
            "_blank",
            "noopener,noreferrer"
          )
        }
      >
        💬 Chat Admin
      </button>

      {message && (
        <div className="message">
          {message}
        </div>
      )}

      {buyModal && (
        <div
          className="modal-backdrop"
          onMouseDown={() => {
            if (!buying) setBuyModal(null);
          }}
        >
          <div
            className="modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2>Xác nhận mua</h2>

            <p>
              Kiểm tra thông tin trước khi xác nhận
              đơn hàng.
            </p>

            <div className="modal-product">
              <div>
                {getProductName(buyModal)}
              </div>

              <strong>
                {formatPrice(
                  getProductPrice(buyModal)
                )}
              </strong>

              <div
                style={{
                  marginTop: 7,
                  color: "#8d7a87",
                  fontSize: 12,
                }}
              >
                Số dư hiện tại:{" "}
                {formatPrice(wallet)}
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="cancel"
                disabled={buying}
                onClick={() => setBuyModal(null)}
              >
                Hủy
              </button>

              <button
                className="confirm"
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
          <div className="modal">
            <h2>🎉 Mua hàng thành công</h2>

            <p>
              Sản phẩm đã được giao. Hãy lưu KEY của
              bạn.
            </p>

            {successModal.key ? (
              <div className="key-box">
                {successModal.key}
              </div>
            ) : (
              <div className="key-box">
                KEY đã được thêm vào tài khoản của bạn.
              </div>
            )}

            {successModal.key && (
              <button
                className="copy-key"
                onClick={copyKey}
              >
                📋 Copy KEY
              </button>
            )}

            <div className="modal-actions">
              <button
                className="cancel"
                onClick={() => {
                  setSuccessModal(null);
                  router.push("/keys");
                }}
              >
                Xem KEY của tôi
              </button>

              <button
                className="confirm"
                onClick={() => setSuccessModal(null)}
              >
                Tiếp tục mua
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
