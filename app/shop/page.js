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

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadShop() {
    setLoading(true);
    setError("");

    try {
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

      const session =
        sessionResult?.data?.session || null;

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

      setError(
        err?.message || "Không thể tải cửa hàng."
      );
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
        console.error(
          "WALLET LOAD ERROR:",
          walletError
        );
        return;
      }

      setWallet(Number(data?.balance || 0));
    } catch (err) {
      console.error("WALLET ERROR:", err);
    }
  }

  const visibleProducts = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }

    return products.filter(
      (product) =>
        Number(product.category_id) ===
        Number(selectedCategory.id)
    );
  }, [products, selectedCategory]);

  const categoryStock = useMemo(() => {
    const result = {};

    for (const product of products) {
      const categoryId = Number(product.category_id);

      if (!categoryId) {
        continue;
      }

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

  function formatPrice(price) {
    return (
      new Intl.NumberFormat("vi-VN").format(
        Number(price || 0)
      ) + "đ"
    );
  }

  function formatDuration(days) {
    const value = Number(days || 0);

    if (value === 1) {
      return "1 ngày";
    }

    if (value === 7) {
      return "7 ngày";
    }

    if (value === 30) {
      return "1 tháng";
    }

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
      setMessage(
        "Sản phẩm này hiện đã hết KEY."
      );
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    setBuyModal(product);
  }

  async function confirmBuy() {
    if (!buyModal || buying) {
      return;
    }

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
          product_id: Number(product.id),
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

    if (!key) {
      return;
    }

    try {
      await navigator.clipboard.writeText(key);

      setMessage("Đã sao chép KEY.");
    } catch {
      setMessage(
        "Không thể tự động sao chép KEY."
      );
    }
  }

  function closeSuccessModal() {
    setSuccessModal(null);
    setMessage("");
  }

  function goDeposit() {
    router.push("/deposit");
  }

  return (
    <main className="shop-page">
      <div className="shop-container">
        <header className="shop-header">
          <div>
            <div className="shop-brand">
              XENOVA PLAY
            </div>

            <div className="shop-subtitle">
              Kho KEY tự động
            </div>
          </div>

          <div className="shop-wallet">
            <div>
              <div className="wallet-label">
                SỐ DƯ
              </div>

              <div className="wallet-value">
                {user
                  ? formatPrice(wallet)
                  : "Đăng nhập để mua"}
              </div>
            </div>

            <button
              type="button"
              className="deposit-button"
              onClick={goDeposit}
            >
              + NẠP TIỀN
            </button>
          </div>
        </header>

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
            <div className="error-icon">
              !
            </div>

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
          <section className="products-section">
            <div className="section-top">
              <button
                type="button"
                className="back-button"
                onClick={handleBackToCategories}
              >
                ← DANH MỤC
              </button>

              <div>
                <h1>
                  {selectedCategory.name}
                </h1>

                <p>
                  {visibleProducts.length} sản phẩm
                  {" • "}
                  {categoryStock[
                    Number(selectedCategory.id)
                  ] || 0}{" "}
                  KEY có sẵn
                </p>
              </div>
            </div>

            {visibleProducts.length === 0 ? (
              <div className="empty-card">
                <div className="empty-icon">
                  📦
                </div>

                <h2>
                  Chưa có sản phẩm
                </h2>

                <p>
                  Danh mục này hiện chưa có sản phẩm
                  đang bán.
                </p>
              </div>
            ) : (
              <div className="products-grid">
                {visibleProducts.map((product) => {
                  const available =
                    getProductStock(product.id);

                  return (
                    <article
                      key={product.id}
                      className="product-card"
                    >
                      <div className="product-image-wrap">
                        {product.demo_image_url ? (
                          <img
                            src={product.demo_image_url}
                            alt={product.name}
                            className="product-image"
                          />
                        ) : (
                          <div className="product-placeholder">
                            X
                          </div>
                        )}

                        <span
                          className={
                            available > 0
                              ? "stock-badge available"
                              : "stock-badge soldout"
                          }
                        >
                          {available > 0
                            ? `${available} KEY`
                            : "HẾT KEY"}
                        </span>
                      </div>

                      <div className="product-content">
                        <h2>
                          {product.name}
                        </h2>

                        {product.description && (
                          <p className="product-description">
                            {product.description}
                          </p>
                        )}

                        <div className="product-info">
                          <div>
                            <span>
                              Thời hạn
                            </span>

                            <strong>
                              {formatDuration(
                                product.duration_days
                              )}
                            </strong>
                          </div>

                          <div className="product-price">
                            <span>
                              Giá bán
                            </span>

                            <strong>
                              {formatPrice(
                                product.price
                              )}
                            </strong>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="buy-button"
                          disabled={available <= 0}
                          onClick={() =>
                            handleBuyClick(product)
                          }
                        >
                          {available > 0
                            ? "MUA NGAY"
                            : "HẾT KEY"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="categories-section">
            <div className="section-heading">
              <div>
                <span className="section-kicker">
                  XENOVA STORE
                </span>

                <h1>
                  DANH MỤC SẢN PHẨM
                </h1>

                <p>
                  Chọn danh mục để xem các KEY
                  đang được bán.
                </p>
              </div>

              <div className="catalog-count">
                <strong>
                  {categories.length}
                </strong>

                <span>
                  danh mục
                </span>
              </div>
            </div>

            {categories.length === 0 ? (
              <div className="empty-card">
                <div className="empty-icon">
                  📦
                </div>

                <h2>
                  Chưa có danh mục
                </h2>

                <p>
                  Hiện chưa có sản phẩm nào
                  được mở bán.
                </p>
              </div>
            ) : (
              <div className="categories-grid">
                {categories.map((category) => {
                  const available =
                    categoryStock[
                      Number(category.id)
                    ] || 0;

                  const productCount =
                    products.filter(
                      (product) =>
                        Number(
                          product.category_id
                        ) ===
                        Number(category.id)
                    ).length;

                  return (
                    <button
                      type="button"
                      key={category.id}
                      className="category-card"
                      onClick={() =>
                        handleCategoryClick(
                          category
                        )
                      }
                    >
                      <div className="category-image-wrap">
                        {category.demo_image_url ? (
                          <img
                            src={
                              category.demo_image_url
                            }
                            alt={
                              category.name
                            }
                            className="category-image"
                          />
                        ) : (
                          <div className="category-placeholder">
                            X
                          </div>
                        )}
                      </div>

                      <div className="category-content">
                        <div>
                          <h2>
                            {category.name}
                          </h2>

                          <p>
                            {productCount} sản phẩm
                          </p>
                        </div>

                        <div className="category-stock">
                          <span>
                            KEY có sẵn
                          </span>

                          <strong>
                            {available}
                          </strong>
                        </div>
                      </div>

                      <div className="category-footer">
                        <span>
                          XEM TẤT CẢ
                        </span>

                        <span className="arrow">
                          →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}
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
            <div className="modal-icon">
              🛒
            </div>

            <h2>
              Xác nhận mua KEY
            </h2>

            <p>
              Bạn có chắc muốn mua:
            </p>

            <strong className="modal-product-name">
              {buyModal.name}
            </strong>

            <div className="modal-summary">
              <div>
                <span>
                  Giá
                </span>

                <strong>
                  {formatPrice(
                    buyModal.price
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Thời hạn
                </span>

                <strong>
                  {formatDuration(
                    buyModal.duration_days
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Số dư sau mua
                </span>

                <strong>
                  {formatPrice(
                    Number(wallet) -
                      Number(
                        buyModal.price
                      )
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
                {buying ? (
                  <>
                    <span className="spinner" />
                    ĐANG MUA...
                  </>
                ) : (
                  "XÁC NHẬN MUA"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {successModal && (
        <div className="modal-overlay">
          <div className="success-modal">
            <div className="success-icon">
              ✓
            </div>

            <h2>
              Mua KEY thành công
            </h2>

            <p>
              KEY của bạn:
            </p>

            <div className="key-box">
              {successModal.key ? (
                <code>
                  {successModal.key}
                </code>
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
                onClick={closeSuccessModal}
              >
                ĐÓNG
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .shop-page {
          min-height: 100vh;
          padding: 95px 16px 80px;
          background: #f7f8fc;
          color: #111827;
        }

        .shop-container {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
        }

        .shop-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 30px;
          padding: 22px 24px;
          border: 1px solid #e5e7eb;
          border-radius: 22px;
          background: #ffffff;
          box-shadow:
            0 12px 35px rgba(15, 23, 42, 0.07);
        }

        .shop-brand {
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -1px;
        }

        .shop-subtitle {
          margin-top: 5px;
          color: #6b7280;
          font-size: 14px;
        }

        .shop-wallet {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .wallet-label {
          font-size: 11px;
          color: #6b7280;
          font-weight: 800;
        }

        .wallet-value {
          margin-top: 3px;
          font-size: 17px;
          font-weight: 900;
        }

        .deposit-button,
        .buy-button,
        .confirm-button,
        .retry-button,
        .copy-button {
          border: 0;
          cursor: pointer;
          font-weight: 900;
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            opacity 0.18s ease;
        }

        .deposit-button {
          padding: 11px 16px;
          border-radius: 12px;
          color: #fff;
          background: #111827;
        }

        .deposit-button:hover,
        .buy-button:hover,
        .confirm-button:hover,
        .copy-button:hover,
        .retry-button:hover {
          transform: translateY(-2px);
          box-shadow:
            0 9px 22px rgba(15, 23, 42, 0.15);
        }

        .section-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 20px;
        }

        .section-kicker {
          font-size: 11px;
          font-weight: 900;
          color: #6b7280;
          letter-spacing: 1.5px;
        }

        .section-heading h1,
        .section-top h1 {
          margin: 5px 0;
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.8px;
        }

        .section-heading p,
        .section-top p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

        .catalog-count {
          min-width: 100px;
          padding: 13px 18px;
          border-radius: 16px;
          background: #fff;
          border: 1px solid #e5e7eb;
          text-align: center;
        }

        .catalog-count strong {
          display: block;
          font-size: 22px;
        }

        .catalog-count span {
          color: #6b7280;
          font-size: 12px;
        }

        .categories-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .category-card {
          position: relative;
          padding: 0;
          overflow: hidden;
          text-align: left;
          cursor: pointer;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          background: #fff;
          color: inherit;
          box-shadow:
            0 8px 25px rgba(15, 23, 42, 0.05);
          transition:
            transform 0.22s ease,
            box-shadow 0.22s ease,
            border-color 0.22s ease;
        }

        .category-card:hover {
          transform: translateY(-5px);
          border-color: #d1d5db;
          box-shadow:
            0 18px 40px rgba(15, 23, 42, 0.12);
        }

        .category-image-wrap {
          height: 145px;
          overflow: hidden;
          background: #eef2f7;
        }

        .category-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform 0.35s ease;
        }

        .category-card:hover
          .category-image {
          transform: scale(1.06);
        }

        .category-placeholder,
        .product-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            linear-gradient(
              135deg,
              #111827,
              #374151
            );
          color: #fff;
          font-size: 42px;
          font-weight: 900;
        }

        .category-content {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 18px 18px 12px;
        }

        .category-content h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 900;
        }

        .category-content p {
          margin: 5px 0 0;
          color: #6b7280;
          font-size: 13px;
        }

        .category-stock {
          text-align: right;
          flex-shrink: 0;
        }

        .category-stock span {
          display: block;
          color: #6b7280;
          font-size: 10px;
          font-weight: 800;
        }

        .category-stock strong {
          display: block;
          margin-top: 3px;
          font-size: 19px;
        }

        .category-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0 18px;
          padding: 13px 0 17px;
          border-top: 1px solid #f0f1f3;
          color: #111827;
          font-size: 11px;
          font-weight: 900;
        }

        .arrow {
          font-size: 18px;
          transition: transform 0.18s ease;
        }

        .category-card:hover
          .arrow {
          transform: translateX(4px);
        }

        .section-top {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-bottom: 22px;
        }

        .back-button {
          border: 1px solid #e5e7eb;
          background: #fff;
          color: #111827;
          padding: 11px 14px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 900;
        }

        .products-grid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(240px, 1fr)
            );
          gap: 18px;
        }

        .product-card {
          overflow: hidden;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          background: #fff;
          box-shadow:
            0 8px 25px rgba(15, 23, 42, 0.05);
          transition:
            transform 0.22s ease,
            box-shadow 0.22s ease;
        }

        .product-card:hover {
          transform: translateY(-5px);
          box-shadow:
            0 18px 40px rgba(15, 23, 42, 0.12);
        }

        .product-image-wrap {
          position: relative;
          height: 175px;
          overflow: hidden;
          background: #eef2f7;
        }

        .product-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform 0.35s ease;
        }

        .product-card:hover
          .product-image {
          transform: scale(1.06);
        }

        .stock-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
          backdrop-filter: blur(8px);
        }

        .stock-badge.available {
          background: rgba(255,255,255,.92);
          color: #087443;
        }

        .stock-badge.soldout {
          background: rgba(255,255,255,.92);
          color: #b42318;
        }

        .product-content {
          padding: 18px;
        }

        .product-content h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 900;
        }

        .product-description {
          min-height: 40px;
          margin: 7px 0 15px;
          color: #6b7280;
          font-size: 13px;
          line-height: 1.5;
        }

        .product-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 16px;
        }

        .product-info > div {
          padding: 10px;
          border-radius: 12px;
          background: #f8fafc;
        }

        .product-info span {
          display: block;
          color: #6b7280;
          font-size: 10px;
          font-weight: 800;
        }

        .product-info strong {
          display: block;
          margin-top: 3px;
          font-size: 13px;
        }

        .product-price strong {
          font-size: 16px;
        }

        .buy-button {
          width: 100%;
          padding: 13px;
          border-radius: 12px;
          background: #111827;
          color: #fff;
        }

        .buy-button:disabled {
          cursor: not-allowed;
          opacity: .45;
          transform: none;
          box-shadow: none;
        }

        .message-box {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
          padding: 13px 15px;
          border: 1px solid #fed7aa;
          border-radius: 14px;
          background: #fff7ed;
          color: #9a3412;
          font-size: 13px;
          font-weight: 700;
        }

        .message-box span {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 23px;
          height: 23px;
          flex-shrink: 0;
          border-radius: 50%;
          background: #ea580c;
          color: #fff;
          font-weight: 900;
        }

        .error-card,
        .empty-card {
          padding: 55px 20px;
          text-align: center;
          border: 1px solid #e5e7eb;
          border-radius: 22px;
          background: #fff;
        }

        .error-icon,
        .empty-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 55px;
          height: 55px;
          margin: 0 auto 15px;
          border-radius: 50%;
          background: #f3f4f6;
          font-size: 25px;
          font-weight: 900;
        }

        .error-card h2,
        .empty-card h2 {
          margin: 0 0 7px;
        }

        .error-card p,
        .empty-card p {
          margin: 0 0 20px;
          color: #6b7280;
        }

        .retry-button {
          padding: 12px 18px;
          border-radius: 12px;
          background: #111827;
          color: #fff;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(15, 23, 42, .58);
          backdrop-filter: blur(8px);
          animation: xenovaFade .18s ease;
        }

        .buy-modal,
        .success-modal {
          width: 100%;
          max-width: 440px;
          padding: 25px;
          border-radius: 24px;
          background: #fff;
          color: #111827;
          box-shadow:
            0 25px 80px rgba(0,0,0,.25);
          animation: xenovaModal .22s ease;
        }

        .modal-icon,
        .success-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 58px;
          height: 58px;
          margin-bottom: 15px;
          border-radius: 18px;
          background: #f3f4f6;
          font-size: 27px;
        }

        .success-icon {
          background: #dcfce7;
          color: #15803d;
          font-size: 30px;
          font-weight: 900;
        }

        .buy-modal h2,
        .success-modal h2 {
          margin: 0 0 8px;
          font-size: 22px;
          font-weight: 900;
        }

        .buy-modal p,
        .success-modal p {
          margin: 0 0 8px;
          color: #6b7280;
          font-size: 14px;
        }

        .modal-product-name {
          display: block;
          margin-bottom: 18px;
          font-size: 17px;
        }

        .modal-summary {
          display: grid;
          gap: 8px;
          margin-bottom: 20px;
        }

        .modal-summary > div {
          display: flex;
          justify-content: space-between;
          padding: 11px 13px;
          border-radius: 12px;
          background: #f8fafc;
        }

        .modal-summary span {
          color: #6b7280;
          font-size: 12px;
        }

        .modal-summary strong {
          font-size: 13px;
        }

        .modal-actions,
        .success-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .cancel-button,
        .close-button,
        .keys-button {
          padding: 13px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
          color: #111827;
          cursor: pointer;
          font-weight: 900;
        }

        .confirm-button,
        .keys-button {
          background: #111827;
          color: #fff;
        }

        .confirm-button:disabled {
          opacity: .65;
          cursor: wait;
        }

        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          margin-right: 7px;
          vertical-align: -2px;
          border: 2px solid rgba(255,255,255,.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: xenovaSpin .7s linear infinite;
        }

        .key-box {
          margin: 15px 0;
          padding: 15px;
          overflow-x: auto;
          border: 1px dashed #d1d5db;
          border-radius: 14px;
          background: #f8fafc;
        }

        .key-box code {
          word-break: break-all;
          color: #111827;
          font-size: 15px;
          font-weight: 900;
        }

        .copy-button {
          width: 100%;
          padding: 12px;
          margin-bottom: 10px;
          border-radius: 12px;
          background: #111827;
          color: #fff;
        }

        .loading-screen {
          min-height: 45vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 15px;
        }

        .loading-spinner {
          width: 42px;
          height: 42px;
          border: 4px solid #e5e7eb;
          border-top-color: #111827;
          border-radius: 50%;
          animation: xenovaSpin .7s linear infinite;
        }

        .loading-screen span {
          color: #6b7280;
          font-size: 13px;
          font-weight: 700;
        }

        @keyframes xenovaSpin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes xenovaFade {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes xenovaModal {
          from {
            opacity: 0;
            transform: translateY(12px) scale(.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 700px) {
          .shop-page {
            padding: 82px 10px 75px;
          }

          .shop-header {
            align-items: flex-start;
            padding: 17px;
            border-radius: 18px;
          }

          .shop-brand {
            font-size: 22px;
          }

          .shop-wallet {
            flex-direction: column;
            align-items: flex-end;
            gap: 5px;
          }

          .wallet-value {
            font-size: 13px;
            text-align: right;
          }

          .deposit-button {
            margin-top: 5px;
            padding: 9px 11px;
            font-size: 11px;
          }

          .section-heading {
            align-items: center;
          }

          .section-heading h1,
          .section-top h1 {
            font-size: 21px;
          }

          .catalog-count {
            min-width: 75px;
            padding: 10px;
          }

          .categories-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .category-image-wrap {
            height: 105px;
          }

          .category-content {
            display: block;
            padding: 12px;
          }

          .category-content h2 {
            font-size: 14px;
          }

          .category-content p {
            font-size: 11px;
          }

          .category-stock {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 8px;
            text-align: left;
          }

          .category-stock strong {
            font-size: 15px;
          }

          .category-footer {
            margin: 0 12px;
            padding: 10px 0 12px;
            font-size: 9px;
          }

          .section-top {
            align-items: flex-start;
          }

          .back-button {
            padding: 9px;
            font-size: 10px;
            white-space: nowrap;
          }

          .products-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .product-image-wrap {
            height: 120px;
          }

          .product-content {
            padding: 12px;
          }

          .product-content h2 {
            font-size: 14px;
          }

          .product-description {
            min-height: 0;
            font-size: 11px;
          }

          .product-info {
            display: block;
          }

          .product-info > div {
            margin-bottom: 5px;
          }

          .product-info strong {
            font-size: 12px;
          }

          .product-price strong {
            font-size: 14px;
          }

          .buy-button {
            padding: 10px 5px;
            font-size: 11px;
          }

          .modal-actions,
          .success-actions {
            grid-template-columns: 1fr;
          }

          .buy-modal,
          .success-modal {
            padding: 20px;
            border-radius: 20px;
          }
        }

        html[data-theme="dark"] .shop-page {
          background: #080b12;
          color: #f9fafb;
        }

        html[data-theme="dark"] .shop-header,
        html[data-theme="dark"] .category-card,
        html[data-theme="dark"] .product-card,
        html[data-theme="dark"] .catalog-count,
        html[data-theme="dark"] .error-card,
        html[data-theme="dark"] .empty-card,
        html[data-theme="dark"] .back-button {
          background: #111722;
          border-color: #252d3b;
          color: #f9fafb;
        }

        html[data-theme="dark"] .shop-subtitle,
        html[data-theme="dark"] .section-heading p,
        html[data-theme="dark"] .section-top p,
        html[data-theme="dark"] .category-content p,
        html[data-theme="dark"] .product-description,
        html[data-theme="dark"] .error-card p,
        html[data-theme="dark"] .empty-card p,
        html[data-theme="dark"] .catalog-count span,
        html[data-theme="dark"] .wallet-label,
        html[data-theme="dark"] .product-info span,
        html[data-theme="dark"] .category-stock span {
          color: #9ca3af;
        }

        html[data-theme="dark"] .category-footer {
          border-top-color: #252d3b;
          color: #f9fafb;
        }

        html[data-theme="dark"] .product-info > div,
        html[data-theme="dark"] .modal-summary > div,
        html[data-theme="dark"] .key-box {
          background: #0b1019;
        }

        html[data-theme="dark"] .category-image-wrap,
        html[data-theme="dark"] .product-image-wrap {
          background: #0b1019;
        }

        html[data-theme="dark"] .modal-overlay {
          background: rgba(0,0,0,.72);
        }

        html[data-theme="dark"] .buy-modal,
        html[data-theme="dark"] .success-modal {
          background: #111722;
          color: #f9fafb;
        }

        html[data-theme="dark"] .modal-icon {
          background: #202735;
        }

        html[data-theme="dark"] .key-box code {
          color: #f9fafb;
        }

        html[data-theme="dark"] .cancel-button,
        html[data-theme="dark"] .close-button {
          background: #111722;
          border-color: #303949;
          color: #f9fafb;
        }

        html[data-theme="dark"] .back-button {
          color: #f9fafb;
        }
      `}</style>
    </main>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <span>
        Đang tải cửa hàng...
      </span>
    </div>
  );
}
