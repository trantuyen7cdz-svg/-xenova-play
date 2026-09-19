"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const SAMPLE_IMAGE =
  "https://i.ibb.co/GQNBB2RS/985-AEC8-F-0918-406-B-8-C87-A6-D63-EB02674.png";

const NAV_ITEMS = [
  ["⌂", "Trang chủ", "/"],
  ["🛒", "Cửa hàng", "/shop"],
  ["▣", "Nạp tiền", "/deposit"],
  ["♢", "KEY của tôi", "/keys"],
  ["▤", "Đơn hàng", "/orders"],
  ["♙", "Tài khoản", "/dashboard"],
  ["⚙", "Cài đặt", "/settings"],
];

const SPRITE = {
  steam: "0% 0%",
  windows: "0% 0%",
  office: "0% 0%",
  photoshop: "0% 0%",
  premiere: "0% 0%",
  genshin: "0% 0%",
  valorant: "0% 0%",
  roblox: "0% 0%",
};

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
  if (text.includes("photoshop")) return "photoshop";
  if (text.includes("premiere")) return "premiere";
  if (text.includes("genshin")) return "genshin";
  if (text.includes("valorant")) return "valorant";
  if (text.includes("roblox")) return "roblox";

  return "steam";
}

function SpriteImage({ type, className = "" }) {
  /*
    Dùng chính ảnh mẫu làm sprite.
    Các ô ảnh được crop bằng background-position.
  */
  const positions = {
    steam: "19% 29%",
    windows: "38% 29%",
    office: "51% 29%",
    photoshop: "68% 29%",
    premiere: "19% 52%",
    genshin: "38% 52%",
    valorant: "52% 52%",
    roblox: "68% 52%",
  };

  return (
    <div
      className={`sprite-image ${className}`}
      style={{
        backgroundImage: `url("${SAMPLE_IMAGE}")`,
        backgroundPosition: positions[type] || positions.steam,
      }}
    />
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

function ProductCard({
  product,
  stock,
  onBuy,
}) {
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
    <div className="product-card">
      <div className="product-image-wrap">
        <SpriteImage type={type} />

        <div className={`product-badge ${sold ? "hot" : ""}`}>
          {sold ? "Bán chạy" : "Hot"}
        </div>
      </div>

      <div className="product-info">
        <div className="product-name">
          {name}
        </div>

        {days && (
          <div className="product-duration">
            {formatDuration(days)}
          </div>
        )}

        <div className="product-tags">
          <span className="tag-hot">
            {sold ? "Bán chạy" : "Hot"}
          </span>

          <span className="tag-auto">
            Tự động
          </span>
        </div>

        <div className="product-bottom">
          <strong>{formatPrice(price)}</strong>

          <span className="stock-small">
            {available > 0 ? `${available} còn lại` : "Hết hàng"}
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
    </div>
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

      const [
        sessionResult,
        catalogResult,
        stockResult,
      ] = await Promise.all([
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

      return String(categoryId) === String(selectedCategory);
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

        return String(id) === String(categoryId);
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
          background: #fff6fb;
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
          position: relative;
          overflow-x: hidden;
          background:
            radial-gradient(
              circle at 8% 20%,
              rgba(255, 80, 160, 0.08),
              transparent 18%
            ),
            radial-gradient(
              circle at 90% 55%,
              rgba(255, 120, 190, 0.08),
              transparent 20%
            ),
            #fff7fb;
        }

        .xenova-page::before,
        .xenova-page::after {
          content: "🌸";
          position: fixed;
          font-size: 25px;
          opacity: 0.45;
          pointer-events: none;
          z-index: 0;
          animation: fall 9s linear infinite;
        }

        .xenova-page::before {
          left: 2%;
          top: 20%;
        }

        .xenova-page::after {
          right: 4%;
          top: 40%;
          animation-delay: 3s;
        }

        @keyframes fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
          }

          100% {
            transform: translateY(90vh) rotate(280deg);
          }
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          height: 62px;
          background: rgba(255,255,255,.96);
          border-bottom: 1px solid #eee8ef;
          box-shadow: 0 2px 15px rgba(40, 20, 35, .04);
          backdrop-filter: blur(12px);
        }

        .topbar-inner {
          max-width: 1220px;
          height: 100%;
          margin: auto;
          padding: 0 18px;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .menu-icon {
          display: none;
          font-size: 22px;
          color: #222;
        }

        .brand {
          width: 118px;
          line-height: .82;
          font-weight: 900;
          font-size: 20px;
          letter-spacing: -.7px;
          color: #101526;
        }

        .brand span {
          display: block;
          color: #f62f85;
          margin-left: 40px;
          font-size: 13px;
          letter-spacing: -.2px;
        }

        .nav {
          flex: 1;
          display: flex;
          justify-content: center;
          height: 100%;
        }

        .nav-button {
          border: 0;
          background: transparent;
          min-width: 70px;
          padding: 4px 8px;
          color: #363a48;
          font-size: 10px;
          cursor: pointer;
          position: relative;
        }

        .nav-button .nav-icon {
          display: block;
          font-size: 16px;
          margin-bottom: 2px;
        }

        .nav-button:hover {
          color: #f52f83;
        }

        .nav-button.active {
          color: #f52f83;
          background: #fff0f7;
          border-radius: 10px;
        }

        .nav-button.active::after {
          content: "";
          position: absolute;
          left: 17px;
          right: 17px;
          bottom: 0;
          height: 2px;
          background: #ff2e82;
          border-radius: 20px;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .theme-button,
        .wallet-button,
        .avatar-button {
          height: 34px;
          border-radius: 18px;
          border: 1px solid #eee4eb;
          background: white;
          cursor: pointer;
        }

        .theme-button {
          width: 34px;
        }

        .wallet-button {
          padding: 0 13px;
          color: #f52f83;
          font-weight: 700;
          font-size: 11px;
        }

        .avatar-button {
          width: 34px;
          background: #ff5d98;
          color: white;
          border-color: #ff5d98;
          font-weight: 700;
        }

        .main {
          position: relative;
          z-index: 1;
          max-width: 1180px;
          margin: auto;
          padding: 18px 18px 40px;
        }

        .hero {
          height: 155px;
          border-radius: 13px;
          overflow: hidden;
          position: relative;
          background-image: url("${SAMPLE_IMAGE}");
          background-size: 100% auto;
          background-position: center 9%;
          background-repeat: no-repeat;
          box-shadow: 0 7px 25px rgba(233, 50, 126, .13);
        }

        .hero::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            rgba(75, 7, 67, .08),
            transparent 70%
          );
          pointer-events: none;
        }

        .hero-link {
          position: absolute;
          left: 42px;
          bottom: 15px;
          z-index: 2;
          padding: 9px 20px;
          background: #ff408a;
          color: white;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          border: 0;
          box-shadow: 0 6px 18px rgba(255, 48, 130, .28);
        }

        .dots {
          display: flex;
          justify-content: center;
          gap: 5px;
          margin-top: 6px;
        }

        .dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #ff4d92;
        }

        .dot:nth-child(2),
        .dot:nth-child(3) {
          opacity: .35;
        }

        .shop-layout {
          display: grid;
          grid-template-columns: 130px minmax(0, 1fr);
          gap: 15px;
          margin-top: 10px;
        }

        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .side-card {
          background: rgba(255,255,255,.95);
          border: 1px solid #f0e7ee;
          border-radius: 10px;
          box-shadow: 0 3px 12px rgba(35, 20, 30, .05);
          overflow: hidden;
        }

        .side-title {
          padding: 12px 10px 8px;
          font-size: 10px;
          font-weight: 800;
        }

        .category {
          display: flex;
          align-items: center;
          gap: 7px;
          width: 100%;
          border: 0;
          background: transparent;
          padding: 7px 9px;
          text-align: left;
          cursor: pointer;
          color: #555a68;
          font-size: 9px;
        }

        .category:hover,
        .category.active {
          color: #f62e83;
          background: #fff0f7;
        }

        .category-count {
          margin-left: auto;
          font-size: 8px;
          color: #9b9eaa;
        }

        .vip-card {
          min-height: 83px;
          background:
            linear-gradient(
              135deg,
              rgba(90, 8, 69, .78),
              rgba(255, 43, 133, .68)
            ),
            url("${SAMPLE_IMAGE}");
          background-size: cover;
          background-position: center 40%;
          color: white;
          padding: 13px 10px;
          border-radius: 10px;
        }

        .vip-title {
          font-size: 11px;
          font-weight: 900;
        }

        .vip-text {
          font-size: 8px;
          opacity: .85;
          margin: 3px 0 8px;
        }

        .vip-button {
          border: 0;
          background: #ff3e8b;
          color: white;
          border-radius: 12px;
          padding: 5px 9px;
          font-size: 8px;
          cursor: pointer;
        }

        .support-row {
          display: flex;
          gap: 7px;
          align-items: center;
          padding: 7px 9px;
          border-top: 1px solid #f3edf1;
          font-size: 8px;
        }

        .support-icon {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #eef2f8;
          font-size: 10px;
        }

        .support-name {
          font-weight: 700;
          color: #414553;
        }

        .support-sub {
          color: #a0a3ac;
          margin-top: 2px;
        }

        .products-section {
          min-width: 0;
        }

        .section-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 9px;
        }

        .section-title {
          font-size: 14px;
          font-weight: 900;
          color: #202330;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .section-title span {
          color: #ff4a8d;
        }

        .see-all {
          border: 0;
          background: transparent;
          color: #f32e82;
          font-size: 9px;
          cursor: pointer;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .product-card {
          background: rgba(255,255,255,.98);
          border: 1px solid #eee6ec;
          border-radius: 9px;
          overflow: hidden;
          box-shadow: 0 3px 10px rgba(30, 20, 28, .055);
          transition: .2s ease;
        }

        .product-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(220, 30, 110, .12);
        }

        .product-image-wrap {
          margin: 7px;
          height: 80px;
          border-radius: 6px;
          overflow: hidden;
          position: relative;
          background: #eef1f5;
        }

        .sprite-image {
          width: 100%;
          height: 100%;
          background-repeat: no-repeat;
          background-size: 520% 650%;
          background-color: #f2f3f5;
        }

        .product-badge {
          display: none;
        }

        .product-info {
          padding: 0 8px 8px;
        }

        .product-name {
          font-size: 8px;
          font-weight: 700;
          color: #313542;
          min-height: 20px;
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
          font-size: 6px;
        }

        .tag-hot {
          color: #ff3c80;
          background: #fff0f5;
        }

        .tag-auto {
          color: #858994;
          background: #f1f2f4;
        }

        .product-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .product-bottom strong {
          color: #fa3182;
          font-size: 10px;
        }

        .stock-small {
          font-size: 6px;
          color: #aaa;
        }

        .buy-button {
          width: 100%;
          border: 0;
          background: #ff3987;
          color: white;
          border-radius: 5px;
          height: 25px;
          font-size: 8px;
          font-weight: 700;
          cursor: pointer;
        }

        .buy-button:hover:not(:disabled) {
          background: #ed2675;
        }

        .buy-button:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .quick-features {
          margin-top: 9px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 5px;
          background: linear-gradient(
            90deg,
            #fff0f7,
            #ffe8f3
          );
          border-radius: 9px;
          padding: 9px;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 7px;
          color: #777a86;
        }

        .feature-icon {
          color: #ff3987;
          font-size: 17px;
        }

        .feature strong {
          display: block;
          color: #444754;
          font-size: 7px;
        }

        .bottom-area {
          margin-top: 13px;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 9px;
        }

        .action-card {
          border: 1px solid #f0e6ed;
          background: white;
          border-radius: 9px;
          padding: 10px;
          cursor: pointer;
          text-align: left;
        }

        .action-card:hover {
          border-color: #ff8bb9;
        }

        .action-icon {
          font-size: 17px;
        }

        .action-title {
          font-weight: 800;
          font-size: 10px;
          margin-top: 4px;
        }

        .action-text {
          font-size: 8px;
          color: #9a9ca5;
          margin-top: 2px;
        }

        .footer {
          text-align: center;
          color: #a3a4ac;
          font-size: 8px;
          padding: 20px 0 10px;
        }

        .chat-admin {
          position: fixed;
          right: 18px;
          bottom: 18px;
          z-index: 60;
          border: 0;
          background: #ff3987;
          color: white;
          padding: 8px 12px;
          border-radius: 18px;
          box-shadow: 0 8px 22px rgba(255, 40, 125, .3);
          cursor: pointer;
          font-size: 9px;
          font-weight: 800;
        }

        .message {
          position: fixed;
          left: 50%;
          bottom: 22px;
          transform: translateX(-50%);
          z-index: 100;
          background: #20222d;
          color: white;
          border-radius: 8px;
          padding: 9px 15px;
          font-size: 10px;
          box-shadow: 0 8px 25px rgba(0,0,0,.2);
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 90;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(20, 10, 18, .5);
          backdrop-filter: blur(5px);
        }

        .modal {
          width: min(390px, 100%);
          background: white;
          border-radius: 15px;
          padding: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,.25);
        }

        .modal h3 {
          margin: 0 0 8px;
          font-size: 16px;
        }

        .modal-product {
          color: #777;
          font-size: 11px;
          margin-bottom: 13px;
        }

        .modal-price {
          color: #f52e81;
          font-size: 20px;
          font-weight: 900;
          margin-bottom: 15px;
        }

        .modal-buttons {
          display: flex;
          gap: 8px;
        }

        .modal-buttons button {
          flex: 1;
          height: 38px;
          border-radius: 8px;
          border: 1px solid #eee;
          cursor: pointer;
          font-weight: 700;
        }

        .modal-cancel {
          background: #f4f4f5;
        }

        .modal-confirm {
          background: #ff3987;
          color: white;
          border-color: #ff3987 !important;
        }

        .modal-key {
          background: #fff1f7;
          border: 1px dashed #ff5b9a;
          border-radius: 9px;
          padding: 14px;
          word-break: break-all;
          color: #df206d;
          font-size: 13px;
          font-weight: 800;
          margin: 15px 0;
        }

        .copy-button {
          width: 100%;
          height: 38px;
          background: #ff3987;
          color: white;
          border: 0;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 800;
        }

        .loading-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .skeleton-card {
          padding-bottom: 9px;
        }

        .skeleton-image,
        .skeleton-line,
        .skeleton-button {
          margin: 7px;
          border-radius: 5px;
          background: linear-gradient(
            90deg,
            #f4f1f3,
            #faf8f9,
            #f4f1f3
          );
          background-size: 200% 100%;
          animation: shimmer 1.3s infinite;
        }

        .skeleton-image {
          height: 80px;
        }

        .skeleton-line {
          height: 8px;
          width: 70%;
        }

        .skeleton-line.large {
          width: 85%;
        }

        .skeleton-line.price {
          width: 35%;
        }

        .skeleton-button {
          height: 25px;
        }

        @keyframes shimmer {
          to {
            background-position: -200% 0;
          }
        }

        .error-box {
          background: #fff0f3;
          color: #d92d5e;
          border: 1px solid #ffc9d8;
          border-radius: 9px;
          padding: 14px;
          font-size: 11px;
        }

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

          .top-actions {
            margin-left: auto;
          }

          .wallet-button {
            display: none;
          }

          .main {
            padding: 10px 10px 75px;
          }

          .hero {
            height: 145px;
          }

          .shop-layout {
            grid-template-columns: 1fr;
          }

          .sidebar {
            display: none;
          }

          .products-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .quick-features {
            grid-template-columns: repeat(2, 1fr);
          }

          .bottom-area {
            grid-template-columns: 1fr;
          }

          .mobile-bottom-nav {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 70;
            height: 58px;
            background: rgba(255,255,255,.98);
            border-top: 1px solid #eee7ec;
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            box-shadow: 0 -5px 20px rgba(30,20,30,.07);
          }

          .mobile-bottom-nav button {
            border: 0;
            background: transparent;
            color: #777984;
            font-size: 8px;
          }

          .mobile-bottom-nav button:first-child {
            color: #f52f83;
          }

          .mobile-bottom-nav span {
            display: block;
            font-size: 17px;
            margin-bottom: 2px;
          }

          .chat-admin {
            bottom: 70px;
          }
        }

        @media (max-width: 430px) {
          .hero {
            height: 125px;
          }

          .hero-link {
            left: 20px;
            bottom: 11px;
            font-size: 9px;
            padding: 7px 14px;
          }

          .section-title {
            font-size: 13px;
          }

          .product-image-wrap {
            height: 90px;
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
              style={{
                border: 0,
                background: "transparent",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              XENOVA
              <span>PLAY</span>
            </button>

            <nav className="nav">
              {NAV_ITEMS.map(([icon, label, href]) => {
                const active =
                  label === "Cửa hàng";

                return (
                  <button
                    key={label}
                    className={`nav-button ${
                      active ? "active" : ""
                    }`}
                    onClick={() => router.push(href)}
                  >
                    <span className="nav-icon">
                      {icon}
                    </span>

                    {label}
                  </button>
                );
              })}
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
                💳{" "}
                {formatPrice(wallet)}
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
          <div className="hero">
            <button
              className="hero-link"
              onClick={() => {
                if (products.length) {
                  window.scrollTo({
                    top: 350,
                    behavior: "smooth",
                  });
                }
              }}
            >
              MUA NGAY →
            </button>
          </div>

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
                  <span>◈</span>
                  <span>
                    Tất cả sản phẩm
                  </span>

                  <span className="category-count">
                    {products.length}
                  </span>
                </button>

                {categories.map((category) => {
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
                        setSelectedCategory(id)
                      }
                    >
                      <span>◉</span>

                      <span>
                        {name}
                      </span>

                      <span className="category-count">
                        {getCategoryStock(id)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="vip-card">
                <div className="vip-title">
                  👑 THÀNH VIÊN VIP
                </div>

                <div className="vip-text">
                  Nhận thêm ưu đãi
                </div>

                <button
                  className="vip-button"
                  onClick={() =>
                    router.push("/dashboard")
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

            <section className="products-section">
              <div className="section-head">
                <div className="section-title">
                  <span>♨</span>
                  Sản phẩm nổi bật
                </div>

                <button
                  className="see-all"
                  onClick={() =>
                    setSelectedCategory(null)
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
