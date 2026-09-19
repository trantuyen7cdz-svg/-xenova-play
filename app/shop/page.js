"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const NAV_ITEMS = [
  ["⌂", "Trang chủ", "/"],
  ["🛒", "Cửa hàng", "/shop"],
  ["▣", "Nạp tiền", "/deposit"],
  ["♢", "KEY của tôi", "/keys"],
  ["▤", "Đơn hàng", "/orders"],
  ["♙", "Tài khoản", "/dashboard"],
  ["⚙", "Cài đặt", "/settings"],
];

function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getProductType(product) {
  const text = normalize(
    `${product?.name || ""} ${product?.title || ""} ${
      product?.category_name || ""
    } ${product?.category || ""}`
  );

  if (text.includes("steam")) return "steam";
  if (text.includes("windows") || text.includes("win")) return "windows";
  if (text.includes("office")) return "office";
  if (text.includes("photoshop") || text.includes("adobe")) return "photoshop";
  if (text.includes("premiere")) return "premiere";
  if (text.includes("genshin")) return "genshin";
  if (text.includes("valorant")) return "valorant";
  if (text.includes("roblox")) return "roblox";

  return "steam";
}

function SpriteImage({ type, className = "" }) {
  const data = {
    steam: {
      icon: "●",
      title: "STEAM",
      sub: "Steam",
      color: "#253d5d",
    },
    windows: {
      icon: "▦",
      title: "WINDOWS",
      sub: "Windows",
      color: "#087de1",
    },
    office: {
      icon: "▣",
      title: "OFFICE",
      sub: "Microsoft Office",
      color: "#e94c16",
    },
    photoshop: {
      icon: "Ps",
      title: "PHOTOSHOP",
      sub: "Adobe Photoshop",
      color: "#07375d",
    },
    premiere: {
      icon: "Pr",
      title: "PREMIERE",
      sub: "Adobe Premiere",
      color: "#24103f",
    },
    genshin: {
      icon: "✦",
      title: "GENSHIN",
      sub: "Genshin Impact",
      color: "#7080aa",
    },
    valorant: {
      icon: "◈",
      title: "VALORANT",
      sub: "Valorant",
      color: "#280f22",
    },
    roblox: {
      icon: "▶",
      title: "ROBLOX",
      sub: "Roblox",
      color: "#151515",
    },
  };

  const item = data[type] || data.steam;

  return (
    <div
      className={`sprite-image ${className}`}
      style={{
        "--card-color": item.color,
      }}
    >
      <div className="sprite-glow" />
      <div className={`sprite-icon sprite-${type}`}>
        {item.icon}
      </div>
      <div className="sprite-word">{item.title}</div>
      <div className="sprite-sub">{item.sub}</div>
    </div>
  );
}

function formatPrice(value) {
  const number = Number(value || 0);
  return `${new Intl.NumberFormat("vi-VN").format(number)}đ`;
}

function formatDuration(days) {
  if (Number(days) === 1) return "1 ngày";
  if (Number(days) === 7) return "7 ngày";
  if (Number(days) === 30) return "1 tháng";

  return days ? `${days} ngày` : "";
}

function ProductCard({ product, stock, onBuy }) {
  const available = Number(stock?.available || 0);
  const type = getProductType(product);

  const name =
    product?.name ||
    product?.title ||
    product?.product_name ||
    "Sản phẩm";

  const price =
    product?.price ??
    product?.selling_price ??
    product?.amount ??
    product?.price_vnd ??
    0;

  const days =
    product?.duration_days ??
    product?.duration ??
    product?.days ??
    null;

  const sold =
    Number(product?.sold || 0) > 0 ||
    normalize(name).includes("office") ||
    normalize(name).includes("photoshop") ||
    normalize(name).includes("valorant");

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <SpriteImage type={type} />

        <div className={`product-badge ${sold ? "hot" : ""}`}>
          {sold ? "Bán chạy" : "Hot"}
        </div>
      </div>

      <div className="product-info">
        <div className="product-name">{name}</div>

        {days && (
          <div className="product-duration">
            {formatDuration(days)}
          </div>
        )}

        <div className="product-tags">
          <span className="tag-hot">
            {sold ? "Bán chạy" : "Hot"}
          </span>

          <span className="tag-auto">Tự động</span>
        </div>

        <div className="product-bottom">
          <strong>{formatPrice(price)}</strong>

          <span className="stock-small">
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
      <div className="skeleton-image" />
      <div className="skeleton-line large" />
      <div className="skeleton-line" />
      <div className="skeleton-line price" />
      <div className="skeleton-button" />
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
      subscription?.unsubscribe();
    };
  }, []);

  async function loadWallet(currentUser) {
    if (!currentUser?.id) return;

    const { data, error: walletError } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (!walletError) {
      setWallet(Number(data?.balance || 0));
    }
  }

  async function loadShop() {
    try {
      setLoading(true);
      setError("");

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

      setUser(session?.user || null);

      if (!catalogResult.ok) {
        throw new Error("Không tải được danh sách sản phẩm.");
      }

      if (!stockResult.ok) {
        throw new Error("Không tải được tồn kho.");
      }

      const catalogData = await catalogResult.json();
      const stockData = await stockResult.json();

      const catalogCategories =
        catalogData?.categories ||
        catalogData?.data?.categories ||
        [];

      const catalogProducts =
        catalogData?.products ||
        catalogData?.data?.products ||
        [];

      const stockRows =
        stockData?.stock ||
        stockData?.data ||
        stockData ||
        {};

      setCategories(
        Array.isArray(catalogCategories)
          ? catalogCategories
          : []
      );

      setProducts(
        Array.isArray(catalogProducts)
          ? catalogProducts
          : []
      );

      setStock(stockRows || {});

      if (session?.user) {
        await loadWallet(session.user);
      }
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Có lỗi xảy ra khi tải cửa hàng."
      );
    } finally {
      setLoading(false);
    }
  }

  const visibleProducts = useMemo(() => {
    if (!selectedCategory) return products;

    return products.filter((product) => {
      const categoryId =
        product?.category_id ??
        product?.categoryId ??
        product?.category;

      return (
        String(categoryId) ===
        String(selectedCategory)
      );
    });
  }, [products, selectedCategory]);

  function getProductStock(productId) {
    if (!stock) return 0;

    const direct = stock?.[productId];

    if (direct !== undefined) {
      if (typeof direct === "number") {
        return direct;
      }

      return Number(
        direct?.available ??
          direct?.stock ??
          direct?.quantity ??
          0
      );
    }

    const row = Array.isArray(stock)
      ? stock.find(
          (item) =>
            String(
              item?.product_id ??
                item?.productId ??
                item?.id
            ) === String(productId)
        )
      : null;

    return Number(
      row?.available ??
        row?.stock ??
        row?.quantity ??
        0
    );
  }

  function getCategoryStock(categoryId) {
    return products
      .filter((product) => {
        const id =
          product?.category_id ??
          product?.categoryId ??
          product?.category;

        return (
          String(id) ===
          String(categoryId)
        );
      })
      .reduce(
        (total, product) =>
          total + getProductStock(product.id),
        0
      );
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

    const price = Number(
      product?.price ??
        product?.selling_price ??
        product?.amount ??
        product?.price_vnd ??
        0
    );

    if (wallet < price) {
      setBuyModal(null);

      setMessage(
        "Số dư ví không đủ. Vui lòng nạp thêm tiền."
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
        data?.data?.key_code;

      setBuyModal(null);

      setSuccessModal({
        key:
          key ||
          "Đơn hàng đã được tạo thành công.",
        product,
      });

      await loadShop();
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Không thể mua sản phẩm."
      );
    } finally {
      setBuying(false);
    }
  }

  async function copyKey() {
    if (!successModal?.key) return;

    try {
      await navigator.clipboard.writeText(
        String(successModal.key)
      );

      setMessage("Đã sao chép KEY.");
    } catch {
      setMessage(
        "Không thể sao chép tự động."
      );
    }
  }

  function goDeposit() {
    router.push("/deposit");
  }

  function goHome() {
    router.push("/");
  }

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #fff7fb;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        body {
          color: #202332;
        }

        button {
          font-family: inherit;
        }

        .xenova-page {
          min-height: 100vh;
          overflow-x: hidden;
          position: relative;
          background:
            radial-gradient(
              circle at 5% 30%,
              rgba(255, 73, 151, .09),
              transparent 18%
            ),
            radial-gradient(
              circle at 96% 45%,
              rgba(255, 107, 178, .08),
              transparent 18%
            ),
            #fff8fc;
        }

        .xenova-page::before,
        .xenova-page::after {
          content: "🌸";
          position: fixed;
          pointer-events: none;
          z-index: 0;
          opacity: .55;
          font-size: 24px;
          animation: flowerFall 9s linear infinite;
        }

        .xenova-page::before {
          left: 1%;
          top: 18%;
        }

        .xenova-page::after {
          right: 3%;
          top: 34%;
          animation-delay: 3s;
        }

        @keyframes flowerFall {
          0% {
            transform: translateY(-30px) rotate(0deg);
          }

          100% {
            transform: translateY(90vh) rotate(300deg);
          }
        }

        /* HEADER */

        .topbar {
          position: sticky;
          top: 0;
          z-index: 100;
          height: 61px;
          background: rgba(255,255,255,.97);
          border-bottom: 1px solid #eee8ee;
          box-shadow: 0 2px 15px rgba(40,20,35,.045);
          backdrop-filter: blur(15px);
        }

        .topbar-inner {
          max-width: 1240px;
          height: 100%;
          margin: auto;
          padding: 0 17px;
          display: flex;
          align-items: center;
          gap: 17px;
        }

        .menu-icon {
          display: none;
          color: #20232d;
          font-size: 19px;
        }

        .brand {
          width: 102px;
          padding: 0;
          border: 0;
          background: transparent;
          text-align: left;
          cursor: pointer;
          line-height: .82;
          color: #101624;
          font-size: 19px;
          font-weight: 950;
          letter-spacing: -.7px;
        }

        .brand span {
          display: block;
          margin-left: 39px;
          margin-top: 3px;
          color: #ff2d82;
          font-size: 12px;
          letter-spacing: -.3px;
        }

        .nav {
          height: 100%;
          flex: 1;
          display: flex;
          justify-content: center;
        }

        .nav-button {
          position: relative;
          min-width: 69px;
          height: 100%;
          padding: 3px 7px 2px;
          border: 0;
          background: transparent;
          color: #343844;
          font-size: 8px;
          cursor: pointer;
          transition: .18s;
        }

        .nav-button:hover {
          color: #f72f83;
          background: #fff5f9;
        }

        .nav-button .nav-icon {
          display: block;
          margin-bottom: 1px;
          font-size: 15px;
          line-height: 19px;
        }

        .nav-button.active {
          color: #f52d82;
          background: #fff0f7;
        }

        .nav-button.active::after {
          content: "";
          position: absolute;
          left: 16px;
          right: 16px;
          bottom: 0;
          height: 2px;
          border-radius: 10px 10px 0 0;
          background: #ff2f83;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .theme-button,
        .wallet-button,
        .avatar-button {
          height: 34px;
          border: 1px solid #eee6ec;
          background: white;
          cursor: pointer;
        }

        .theme-button {
          width: 34px;
          border-radius: 50%;
          font-size: 14px;
        }

        .wallet-button {
          padding: 0 11px;
          border-radius: 17px;
          color: #ee2c80;
          font-size: 9px;
          font-weight: 800;
        }

        .avatar-button {
          width: 34px;
          border-radius: 50%;
          color: white;
          border-color: #ff438c;
          background: #ff438c;
          font-size: 10px;
          font-weight: 900;
        }

        /* MAIN */

        .main {
          position: relative;
          z-index: 1;
          width: min(1180px, calc(100% - 30px));
          margin: auto;
          padding: 16px 0 35px;
        }

        /* HERO */

        .hero {
          height: 145px;
          position: relative;
          overflow: hidden;
          border-radius: 12px;
          background:
            radial-gradient(
              ellipse at 72% 38%,
              rgba(255,180,225,.92) 0 11%,
              transparent 29%
            ),
            radial-gradient(
              ellipse at 78% 80%,
              rgba(255,98,169,.7),
              transparent 30%
            ),
            linear-gradient(
              110deg,
              #481047 0%,
              #a81770 39%,
              #ed4e9b 66%,
              #74356e 100%
            );
          box-shadow:
            0 8px 28px rgba(222,42,124,.16);
        }

        .hero::before {
          content: "";
          position: absolute;
          width: 360px;
          height: 360px;
          right: 95px;
          top: -115px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(255,255,255,.45),
              rgba(255,161,214,.15) 42%,
              transparent 68%
            );
        }

        .hero::after {
          content: "🌸  ✦  🌸  ✧  🌸";
          position: absolute;
          right: 17px;
          top: 13px;
          color: rgba(255,255,255,.8);
          font-size: 18px;
          letter-spacing: 18px;
          transform: rotate(-8deg);
          opacity: .8;
        }

        .hero-decoration {
          position: absolute;
          right: 145px;
          top: -13px;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle at 50% 50%,
              #ffdce9 0 22%,
              #f59cc4 23% 35%,
              #b33b86 36% 48%,
              transparent 49%
            );
          opacity: .9;
        }

        .hero-copy {
          position: relative;
          z-index: 3;
          padding: 19px 0 0 43px;
          color: white;
        }

        .hero-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 9px;
          border-radius: 15px;
          background: rgba(255,255,255,.18);
          border: 1px solid rgba(255,255,255,.22);
          font-size: 7px;
          font-weight: 800;
        }

        .hero-title {
          margin: 8px 0 2px;
          font-size: 25px;
          line-height: .95;
          font-style: italic;
          font-weight: 950;
          letter-spacing: -.8px;
          text-shadow: 0 3px 10px rgba(79,0,45,.28);
        }

        .hero-title span {
          display: block;
          color: #fff;
        }

        .hero-subtitle {
          font-size: 8px;
          color: rgba(255,255,255,.88);
          margin-top: 5px;
        }

        .hero-button {
          margin-top: 10px;
          padding: 6px 15px;
          border: 0;
          border-radius: 14px;
          background: #ff4b92;
          color: white;
          box-shadow: 0 6px 15px rgba(98,0,61,.25);
          cursor: pointer;
          font-size: 8px;
          font-weight: 900;
        }

        .hero-girl {
          position: absolute;
          right: 185px;
          bottom: -8px;
          width: 100px;
          height: 126px;
          z-index: 4;
        }

        .girl-hair {
          position: absolute;
          left: 8px;
          top: 4px;
          width: 85px;
          height: 98px;
          border-radius: 52% 48% 43% 48%;
          background:
            linear-gradient(
              135deg,
              #6e155b,
              #ff78b5 62%,
              #f9b1d5
            );
          box-shadow:
            15px 25px 0 -4px rgba(91,10,75,.35);
        }

        .girl-face {
          position: absolute;
          left: 27px;
          top: 25px;
          width: 51px;
          height: 59px;
          border-radius: 45%;
          background: #ffe1df;
          z-index: 2;
        }

        .girl-eye {
          position: absolute;
          top: 30px;
          width: 5px;
          height: 8px;
          border-radius: 50%;
          background: #57205d;
        }

        .girl-eye.left {
          left: 13px;
        }

        .girl-eye.right {
          right: 13px;
        }

        .girl-ribbon {
          position: absolute;
          left: 0;
          top: 0;
          width: 27px;
          height: 23px;
          background: #f44391;
          clip-path: polygon(
            50% 50%,
            100% 0,
            84% 100%,
            50% 74%,
            16% 100%,
            0 0
          );
          z-index: 4;
        }

        .girl-body {
          position: absolute;
          left: 10px;
          top: 79px;
          width: 80px;
          height: 70px;
          border-radius: 40px 40px 0 0;
          background:
            linear-gradient(
              120deg,
              #542c70,
              #ed589e
            );
          z-index: 1;
        }

        .hero-features {
          position: absolute;
          z-index: 5;
          right: 25px;
          top: 35px;
          width: 102px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .hero-feature {
          padding: 5px 8px;
          border-radius: 9px;
          background: rgba(70,4,48,.54);
          border: 1px solid rgba(255,255,255,.16);
          color: white;
          font-size: 6px;
          font-weight: 800;
          backdrop-filter: blur(5px);
        }

        .hero-feature span {
          margin-right: 5px;
          color: #ff87be;
        }

        .dots {
          display: flex;
          justify-content: center;
          gap: 4px;
          height: 12px;
          align-items: center;
        }

        .dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #ff3987;
        }

        .dot:not(:first-child) {
          opacity: .35;
        }

        /* SHOP */

        .shop-layout {
          display: grid;
          grid-template-columns: 130px minmax(0,1fr);
          gap: 14px;
        }

        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .side-card {
          overflow: hidden;
          background: rgba(255,255,255,.97);
          border: 1px solid #f0e7ed;
          border-radius: 9px;
          box-shadow: 0 3px 13px rgba(45,20,38,.045);
        }

        .side-title {
          padding: 10px 9px 7px;
          color: #282b36;
          font-size: 9px;
          font-weight: 900;
        }

        .category {
          width: 100%;
          min-height: 25px;
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 8px;
          border: 0;
          background: transparent;
          color: #60636f;
          text-align: left;
          cursor: pointer;
          font-size: 7px;
        }

        .category:hover,
        .category.active {
          color: #f52f83;
          background: #fff0f7;
        }

        .category-count {
          margin-left: auto;
          color: #a6a7af;
          font-size: 6px;
        }

        .vip-card {
          position: relative;
          overflow: hidden;
          min-height: 84px;
          padding: 12px 9px;
          border-radius: 9px;
          color: white;
          background:
            radial-gradient(
              circle at 70% 30%,
              rgba(255,126,188,.7),
              transparent 30%
            ),
            linear-gradient(
              135deg,
              #541149,
              #e93283
            );
          box-shadow: 0 6px 17px rgba(202,37,112,.13);
        }

        .vip-card::after {
          content: "♛";
          position: absolute;
          right: 5px;
          top: 7px;
          font-size: 39px;
          color: rgba(255,255,255,.16);
        }

        .vip-title {
          position: relative;
          z-index: 2;
          font-size: 9px;
          font-weight: 950;
        }

        .vip-text {
          position: relative;
          z-index: 2;
          margin: 4px 0 8px;
          font-size: 6px;
          opacity: .8;
        }

        .vip-button {
          position: relative;
          z-index: 2;
          border: 0;
          padding: 5px 9px;
          border-radius: 11px;
          background: #ff478f;
          color: white;
          font-size: 6px;
          font-weight: 900;
          cursor: pointer;
        }

        .support-row {
          min-height: 37px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          border-top: 1px solid #f4edf1;
        }

        .support-icon {
          width: 19px;
          height: 19px;
          flex: 0 0 19px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #3573a7;
          background: #edf4fb;
          font-size: 8px;
          font-weight: 900;
        }

        .support-name {
          color: #4a4d59;
          font-size: 6px;
          font-weight: 800;
        }

        .support-sub {
          margin-top: 2px;
          color: #a0a1a9;
          font-size: 5px;
        }

        /* PRODUCTS */

        .products-section {
          min-width: 0;
        }

        .section-head {
          height: 27px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #242733;
          font-size: 13px;
          font-weight: 950;
        }

        .section-title span {
          color: #ff3a87;
          font-size: 15px;
        }

        .see-all {
          border: 0;
          background: transparent;
          color: #f72f83;
          cursor: pointer;
          font-size: 7px;
          font-weight: 800;
        }

        .products-grid {
          display: grid;
          grid-template-columns:
            repeat(4,minmax(0,1fr));
          gap: 8px;
        }

        .product-card {
          position: relative;
          overflow: hidden;
          border: 1px solid #eee7ed;
          border-radius: 8px;
          background: white;
          box-shadow: 0 3px 11px rgba(30,20,28,.055);
          transition:
            transform .18s ease,
            box-shadow .18s ease;
        }

        .product-card:hover {
          transform: translateY(-2px);
          box-shadow:
            0 8px 22px rgba(226,42,119,.12);
        }

        .product-image-wrap {
          position: relative;
          height: 86px;
          margin: 6px 6px 0;
          overflow: hidden;
          border-radius: 6px;
        }

        .sprite-image {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          color: white;
          background:
            linear-gradient(
              135deg,
              var(--card-color),
              #121522
            );
        }

        .sprite-image::before {
          content: "";
          position: absolute;
          inset: -50%;
          background:
            repeating-linear-gradient(
              125deg,
              transparent 0 15px,
              rgba(255,255,255,.055) 16px 18px
            );
          transform: rotate(12deg);
        }

        .sprite-glow {
          position: absolute;
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: rgba(255,255,255,.12);
          filter: blur(9px);
        }

        .sprite-icon {
          position: relative;
          z-index: 2;
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          color: white;
          font-size: 25px;
          font-weight: 950;
          line-height: 1;
          text-shadow: 0 2px 5px rgba(0,0,0,.3);
        }

        .sprite-photoshop,
        .sprite-premiere {
          font-size: 18px;
          border: 2px solid rgba(255,255,255,.8);
        }

        .sprite-word {
          position: relative;
          z-index: 2;
          margin-top: 1px;
          color: rgba(255,255,255,.95);
          font-size: 8px;
          font-weight: 950;
          letter-spacing: .5px;
        }

        .sprite-sub {
          position: relative;
          z-index: 2;
          color: rgba(255,255,255,.6);
          font-size: 4px;
        }

        .product-badge {
          position: absolute;
          left: 5px;
          top: 5px;
          padding: 3px 5px;
          border-radius: 4px;
          color: #ff317f;
          background: rgba(255,255,255,.94);
          font-size: 5px;
          font-weight: 900;
        }

        .product-badge.hot {
          color: #ff317f;
        }

        .product-info {
          padding: 6px 7px 7px;
        }

        .product-name {
          min-height: 18px;
          overflow: hidden;
          color: #333641;
          font-size: 7px;
          font-weight: 800;
          line-height: 1.35;
        }

        .product-duration {
          display: none;
        }

        .product-tags {
          display: flex;
          gap: 4px;
          margin: 3px 0 5px;
        }

        .tag-hot,
        .tag-auto {
          padding: 2px 4px;
          border-radius: 3px;
          font-size: 5px;
          line-height: 1;
        }

        .tag-hot {
          color: #ff317f;
          background: #fff0f5;
        }

        .tag-auto {
          color: #858995;
          background: #f1f2f4;
        }

        .product-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 5px;
        }

        .product-bottom strong {
          color: #f72f82;
          font-size: 9px;
          font-weight: 950;
        }

        .stock-small {
          color: #aaaab1;
          font-size: 5px;
        }

        .buy-button {
          width: 100%;
          height: 23px;
          border: 0;
          border-radius: 5px;
          background:
            linear-gradient(
              90deg,
              #ff3486,
              #fa438f
            );
          color: white;
          cursor: pointer;
          font-size: 6px;
          font-weight: 900;
          box-shadow: 0 3px 7px rgba(255,46,127,.16);
        }

        .buy-button:hover:not(:disabled) {
          background: #e92875;
        }

        .buy-button:disabled {
          opacity: .42;
          cursor: not-allowed;
        }

        /* FEATURES */

        .quick-features {
          margin-top: 9px;
          padding: 8px 10px;
          display: grid;
          grid-template-columns:
            repeat(4,minmax(0,1fr));
          gap: 10px;
          border-radius: 8px;
          background:
            linear-gradient(
              90deg,
              #fff0f7,
              #ffe9f3
            );
          border: 1px solid #ffdeec;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #a1a1aa;
          font-size: 5px;
        }

        .feature-icon {
          color: #ff3486;
          font-size: 16px;
        }

        .feature strong {
          display: block;
          margin-bottom: 1px;
          color: #515360;
          font-size: 6px;
          font-weight: 900;
        }

        /* ACTIONS */

        .bottom-area {
          display: grid;
          grid-template-columns:
            repeat(3,minmax(0,1fr));
          gap: 8px;
          margin-top: 9px;
        }

        .action-card {
          padding: 9px;
          border: 1px solid #eee6ed;
          border-radius: 8px;
          background: white;
          text-align: left;
          cursor: pointer;
          transition: .18s;
        }

        .action-card:hover {
          border-color: #ff9bc2;
          transform: translateY(-1px);
        }

        .action-icon {
          font-size: 15px;
        }

        .action-title {
          margin-top: 3px;
          color: #3e414d;
          font-size: 7px;
          font-weight: 900;
        }

        .action-text {
          margin-top: 2px;
          color: #9fa0a9;
          font-size: 5px;
        }

        .footer {
          padding: 18px 0 5px;
          color: #aaaab2;
          text-align: center;
          font-size: 6px;
        }

        /* CHAT */

        .chat-admin {
          position: fixed;
          right: 18px;
          bottom: 18px;
          z-index: 80;
          border: 0;
          padding: 8px 13px;
          border-radius: 18px;
          color: white;
          background: #ff3787;
          box-shadow: 0 7px 22px rgba(255,44,129,.3);
          cursor: pointer;
          font-size: 8px;
          font-weight: 900;
        }

        /* MESSAGE */

        .message {
          position: fixed;
          z-index: 200;
          left: 50%;
          bottom: 20px;
          transform: translateX(-50%);
          padding: 8px 14px;
          border-radius: 7px;
          color: white;
          background: #252732;
          box-shadow: 0 7px 25px rgba(0,0,0,.2);
          cursor: pointer;
          font-size: 9px;
        }

        /* MODAL */

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 150;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(24,10,20,.48);
          backdrop-filter: blur(5px);
        }

        .modal {
          width: min(390px,100%);
          padding: 21px;
          border-radius: 15px;
          background: white;
          box-shadow: 0 25px 70px rgba(0,0,0,.24);
        }

        .modal h3 {
          margin: 0 0 8px;
          color: #262934;
          font-size: 16px;
        }

        .modal-product {
          margin-bottom: 12px;
          color: #858690;
          font-size: 10px;
        }

        .modal-price {
          margin-bottom: 13px;
          color: #f52f82;
          font-size: 20px;
          font-weight: 950;
        }

        .modal-buttons {
          display: flex;
          gap: 8px;
        }

        .modal-buttons button {
          flex: 1;
          height: 37px;
          border-radius: 8px;
          border: 1px solid #eee;
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
        }

        .modal-cancel {
          background: #f3f3f5;
          color: #656773;
        }

        .modal-confirm {
          border-color: #ff3987 !important;
          background: #ff3987;
          color: white;
        }

        .modal-key {
          margin: 14px 0;
          padding: 13px;
          border: 1px dashed #ff70a8;
          border-radius: 9px;
          background: #fff1f7;
          color: #df216e;
          word-break: break-all;
          font-size: 12px;
          font-weight: 900;
        }

        .copy-button {
          width: 100%;
          height: 37px;
          border: 0;
          border-radius: 8px;
          background: #ff3987;
          color: white;
          cursor: pointer;
          font-size: 10px;
          font-weight: 900;
        }

        /* LOADING */

        .loading-grid {
          display: grid;
          grid-template-columns:
            repeat(4,minmax(0,1fr));
          gap: 8px;
        }

        .skeleton-card {
          padding-bottom: 8px;
        }

        .skeleton-image,
        .skeleton-line,
        .skeleton-button {
          margin: 6px;
          border-radius: 5px;
          background:
            linear-gradient(
              90deg,
              #f4f1f3,
              #fff,
              #f4f1f3
            );
          background-size: 200% 100%;
          animation: shimmer 1.2s infinite;
        }

        .skeleton-image {
          height: 86px;
        }

        .skeleton-line {
          height: 7px;
          width: 65%;
        }

        .skeleton-line.large {
          width: 85%;
        }

        .skeleton-line.price {
          width: 35%;
        }

        .skeleton-button {
          height: 23px;
        }

        @keyframes shimmer {
          to {
            background-position: -200% 0;
          }
        }

        .error-box {
          padding: 13px;
          border: 1px solid #ffcbd9;
          border-radius: 8px;
          background: #fff0f4;
          color: #d42d5c;
          font-size: 9px;
        }

        /* MOBILE */

        .mobile-bottom-nav {
          display: none;
        }

        @media (max-width: 850px) {
          .topbar {
            height: 57px;
          }

          .menu-icon {
            display: block;
          }

          .nav {
            display: none;
          }

          .brand {
            flex: 1;
          }

          .wallet-button {
            display: none;
          }

          .main {
            width: calc(100% - 18px);
            padding-top: 9px;
            padding-bottom: 70px;
          }

          .hero {
            height: 137px;
          }

          .hero-copy {
            padding-left: 25px;
          }

          .hero-title {
            font-size: 21px;
          }

          .hero-girl {
            right: 105px;
            opacity: .75;
          }

          .hero-features {
            right: 12px;
            width: 82px;
          }

          .shop-layout {
            grid-template-columns: 1fr;
          }

          .sidebar {
            display: none;
          }

          .products-grid,
          .loading-grid {
            grid-template-columns:
              repeat(2,minmax(0,1fr));
          }

          .quick-features {
            grid-template-columns:
              repeat(2,minmax(0,1fr));
          }

          .bottom-area {
            grid-template-columns: 1fr;
          }

          .mobile-bottom-nav {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 90;
            height: 57px;
            display: grid;
            grid-template-columns: repeat(5,1fr);
            border-top: 1px solid #eee6ec;
            background: rgba(255,255,255,.98);
            box-shadow: 0 -5px 20px rgba(40,20,35,.08);
          }

          .mobile-bottom-nav button {
            border: 0;
            background: transparent;
            color: #777984;
            font-size: 7px;
          }

          .mobile-bottom-nav span {
            display: block;
            margin-bottom: 2px;
            font-size: 16px;
          }

          .mobile-bottom-nav button:nth-child(2) {
            color: #f52f83;
          }

          .chat-admin {
            right: 12px;
            bottom: 68px;
          }
        }

        @media (max-width: 480px) {
          .hero {
            height: 125px;
          }

          .hero-title {
            font-size: 18px;
          }

          .hero-girl {
            right: 60px;
            opacity: .45;
          }

          .hero-features {
            display: none;
          }

          .hero-copy {
            padding: 15px 0 0 20px;
          }

          .hero-button {
            margin-top: 7px;
          }

          .products-grid,
          .loading-grid {
            gap: 6px;
          }

          .product-image-wrap {
            height: 83px;
          }
        }
      `}</style>

      <div className="xenova-page">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="menu-icon">☰</div>

            <button
              className="brand"
              onClick={goHome}
            >
              XENOVA
              <span>PLAY</span>
            </button>

            <nav className="nav">
              {NAV_ITEMS.map(
                ([icon, label, href]) => {
                  const active =
                    label === "Cửa hàng";

                  return (
                    <button
                      key={label}
                      className={`nav-button ${
                        active ? "active" : ""
                      }`}
                      onClick={() =>
                        router.push(href)
                      }
                    >
                      <span className="nav-icon">
                        {icon}
                      </span>
                      {label}
                    </button>
                  );
                }
              )}
            </nav>

            <div className="top-actions">
              <button
                className="theme-button"
                type="button"
              >
                ☼
              </button>

              <button
                className="wallet-button"
                onClick={goDeposit}
              >
                💳 {formatPrice(wallet)}
              </button>

              <button
                className="avatar-button"
                onClick={() =>
                  router.push(
                    user
                      ? "/dashboard"
                      : "/login"
                  )
                }
              >
                {user ? "U" : "?"}
              </button>
            </div>
          </div>
        </header>

        <main className="main">
          <section className="hero">
            <div className="hero-decoration" />

            <div className="hero-copy">
              <div className="hero-label">
                XENOVA PLAY
                <span>•</span>
                SHOP GAME - KEY GIÁ TỐT
              </div>

              <div className="hero-title">
                MUA KEY NGAY
                <span>NHẬN QUÀ LIỀN TAY</span>
              </div>

              <div className="hero-subtitle">
                Nhanh chóng • Uy tín • Giá tốt nhất
              </div>

              <button
                className="hero-button"
                onClick={() => {
                  document
                    .getElementById(
                      "products"
                    )
                    ?.scrollIntoView({
                      behavior: "smooth",
                    });
                }}
              >
                MUA NGAY →
              </button>
            </div>

            <div className="hero-girl">
              <div className="girl-hair" />
              <div className="girl-face">
                <div className="girl-eye left" />
                <div className="girl-eye right" />
              </div>
              <div className="girl-ribbon" />
              <div className="girl-body" />
            </div>

            <div className="hero-features">
              <div className="hero-feature">
                <span>✓</span>
                KEY CHÍNH HÃNG
              </div>

              <div className="hero-feature">
                <span>✓</span>
                GIAO TỰ ĐỘNG
              </div>

              <div className="hero-feature">
                <span>✓</span>
                HỖ TRỢ 24/7
              </div>
            </div>
          </section>

          <div className="dots">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>

          <div className="shop-layout">
            <aside className="sidebar">
              <div className="side-card">
                <div className="side-title">
                  ▦ &nbsp; Danh mục
                </div>

                <button
                  className={`category ${
                    !selectedCategory
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedCategory(null)
                  }
                >
                  <span>▦</span>

                  <span>
                    Tất cả sản phẩm
                  </span>

                  <span className="category-count">
                    {products.length}
                  </span>
                </button>

                {categories.map(
                  (category) => {
                    const id =
                      category?.id ??
                      category?.category_id;

                    const name =
                      category?.name ??
                      category?.title ??
                      "Danh mục";

                    return (
                      <button
                        key={id}
                        className={`category ${
                          String(
                            selectedCategory
                          ) === String(id)
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          setSelectedCategory(
                            id
                          )
                        }
                      >
                        <span>●</span>

                        <span>
                          {name}
                        </span>

                        <span className="category-count">
                          {getCategoryStock(id)}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>

              <div className="vip-card">
                <div className="vip-title">
                  THÀNH VIÊN VIP
                </div>

                <div className="vip-text">
                  Nhận thêm ưu đãi
                </div>

                <button
                  className="vip-button"
                  onClick={() =>
                    router.push(
                      "/dashboard"
                    )
                  }
                >
                  Nâng cấp ngay →
                </button>
              </div>

              <div className="side-card">
                <div className="side-title">
                  Hỗ trợ
                </div>

                <div className="support-row">
                  <div className="support-icon">
                    ◉
                  </div>

                  <div>
                    <div className="support-name">
                      Chat Admin
                    </div>

                    <div className="support-sub">
                      Hỗ trợ 24/7
                    </div>
                  </div>
                </div>

                <div className="support-row">
                  <div className="support-icon">
                    ✈
                  </div>

                  <div>
                    <div className="support-name">
                      Nhóm Telegram
                    </div>

                    <div className="support-sub">
                      Cập nhật nhanh nhất
                    </div>
                  </div>
                </div>

                <div className="support-row">
                  <div className="support-icon">
                    f
                  </div>

                  <div>
                    <div className="support-name">
                      Fanpage Facebook
                    </div>

                    <div className="support-sub">
                      Like để nhận ưu đãi
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            <section
              className="products-section"
              id="products"
            >
              <div className="section-head">
                <div className="section-title">
                  <span>♨</span>
                  Sản phẩm nổi bật
                </div>

                <button
                  className="see-all"
                  onClick={() =>
                    setSelectedCategory(
                      null
                    )
                  }
                >
                  Xem tất cả →
                </button>
              </div>

              {error ? (
                <div className="error-box">
                  {error}
                </div>
              ) : loading ? (
                <div className="loading-grid">
                  {Array.from({
                    length: 8,
                  }).map((_, index) => (
                    <ProductSkeleton
                      key={index}
                    />
                  ))}
                </div>
              ) : visibleProducts.length ===
                0 ? (
                <div className="error-box">
                  Không có sản phẩm trong danh
                  mục này.
                </div>
              ) : (
                <div className="products-grid">
                  {visibleProducts.map(
                    (product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        stock={{
                          available:
                            getProductStock(
                              product.id
                            ),
                        }}
                        onBuy={
                          handleBuyClick
                        }
                      />
                    )
                  )}
                </div>
              )}

              <div className="quick-features">
                <div className="feature">
                  <div className="feature-icon">
                    ⚡
                  </div>

                  <div>
                    <strong>
                      Giao dịch siêu nhanh
                    </strong>
                    Chỉ vài giây là có KEY
                  </div>
                </div>

                <div className="feature">
                  <div className="feature-icon">
                    ♢
                  </div>

                  <div>
                    <strong>
                      Bảo mật tuyệt đối
                    </strong>
                    An toàn thông tin
                  </div>
                </div>

                <div className="feature">
                  <div className="feature-icon">
                    ♧
                  </div>

                  <div>
                    <strong>
                      Hỗ trợ 24/7
                    </strong>
                    Luôn bên bạn
                  </div>
                </div>

                <div className="feature">
                  <div className="feature-icon">
                    🎁
                  </div>

                  <div>
                    <strong>
                      Nhiều ưu đãi
                    </strong>
                    Dành riêng cho thành viên
                  </div>
                </div>
              </div>

              <div className="bottom-area">
                <button
                  className="action-card"
                  onClick={goDeposit}
                >
                  <div className="action-icon">
                    💳
                  </div>

                  <div className="action-title">
                    Nạp tiền
                  </div>

                  <div className="action-text">
                    Nạp tiền vào ví để mua KEY
                  </div>
                </button>

                <button
                  className="action-card"
                  onClick={() =>
                    router.push("/keys")
                  }
                >
                  <div className="action-icon">
                    🔑
                  </div>

                  <div className="action-title">
                    KEY của tôi
                  </div>

                  <div className="action-text">
                    Xem các KEY đã mua
                  </div>
                </button>

                <button
                  className="action-card"
                  onClick={() =>
                    router.push("/orders")
                  }
                >
                  <div className="action-icon">
                    📦
                  </div>

                  <div className="action-title">
                    Đơn hàng
                  </div>

                  <div className="action-text">
                    Xem lịch sử giao dịch
                  </div>
                </button>
              </div>
            </section>
          </div>

          <footer className="footer">
            © {new Date().getFullYear()} XENOVA
            PLAY — All rights reserved.
          </footer>
        </main>

        <button
          className="chat-admin"
          onClick={() =>
            window.open(
              "https://zalo.me/84365717262",
              "_blank"
            )
          }
        >
          Chat Admin 💬
        </button>

        <div className="mobile-bottom-nav">
          {[
            ["⌂", "Trang chủ", "/"],
            ["🛒", "Cửa hàng", "/shop"],
            ["▣", "Nạp tiền", "/deposit"],
            ["♢", "KEY", "/keys"],
            ["♙", "Tài khoản", "/dashboard"],
          ].map(
            ([icon, label, href]) => (
              <button
                key={label}
                onClick={() =>
                  router.push(href)
                }
              >
                <span>{icon}</span>
                {label}
              </button>
            )
          )}
        </div>

        {message && (
          <div
            className="message"
            onClick={() =>
              setMessage("")
            }
          >
            {message}
          </div>
        )}

        {buyModal && (
          <div
            className="modal-overlay"
            onClick={() =>
              !buying &&
              setBuyModal(null)
            }
          >
            <div
              className="modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <h3>
                Xác nhận mua KEY
              </h3>

              <div className="modal-product">
                {buyModal?.name ||
                  buyModal?.title ||
                  buyModal?.product_name}
              </div>

              <div className="modal-price">
                {formatPrice(
                  buyModal?.price ??
                    buyModal?.selling_price ??
                    buyModal?.amount ??
                    buyModal?.price_vnd ??
                    0
                )}
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: "#777",
                  marginBottom: 15,
                }}
              >
                Số dư hiện tại:{" "}
                <b>
                  {formatPrice(wallet)}
                </b>
              </div>

              <div className="modal-buttons">
                <button
                  className="modal-cancel"
                  disabled={buying}
                  onClick={() =>
                    setBuyModal(null)
                  }
                >
                  Hủy
                </button>

                <button
                  className="modal-confirm"
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
            <div className="modal">
              <h3>
                🎉 Mua KEY thành công
              </h3>

              <div className="modal-product">
                KEY của bạn:
              </div>

              <div className="modal-key">
                {successModal.key}
              </div>

              <button
                className="copy-button"
                onClick={copyKey}
              >
                📋 Sao chép KEY
              </button>

              <button
                style={{
                  width: "100%",
                  marginTop: 8,
                  height: 36,
                  border: 0,
                  background: "#f2f2f3",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
                onClick={() => {
                  setSuccessModal(null);
                  router.push("/keys");
                }}
              >
                Xem KEY của tôi
              </button>

              <button
                style={{
                  width: "100%",
                  marginTop: 8,
                  height: 36,
                  border: 0,
                  background: "transparent",
                  color: "#888",
                  cursor: "pointer",
                }}
                onClick={() =>
                  setSuccessModal(null)
                }
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
