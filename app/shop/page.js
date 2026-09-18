"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ShopPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState({});

  const [selectedCategory, setSelectedCategory] = useState(null);

  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [successKey, setSuccessKey] = useState(null);

  const [dark, setDark] = useState(false);

  useEffect(() => {
    loadShop();

    const syncTheme = () => {
      setDark(
        document.documentElement.getAttribute("data-theme") === "dark"
      );
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  async function loadShop() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      setUser(currentUser || null);

      const [
        categoriesResult,
        productsResult,
        stockResult,
      ] = await Promise.all([
        supabase
          .from("product_categories")
          .select("id,name,active,demo_image_url")
          .eq("active", true)
          .order("id", { ascending: true }),

        supabase
          .from("products")
          .select(`
            id,
            name,
            description,
            price,
            duration_days,
            active,
            is_active,
            demo_image_url,
            category_id
          `)
          .eq("active", true)
          .eq("is_active", true)
          .order("id", { ascending: true }),

        fetch("/api/shop/stock", {
          cache: "no-store",
        })
          .then((res) => res.json())
          .catch(() => ({
            success: false,
            stock: {},
          })),
      ]);

      if (categoriesResult.error) {
        console.error(
          "CATEGORY LOAD ERROR:",
          categoriesResult.error
        );

        throw new Error(
          "Không thể tải danh mục: " +
            categoriesResult.error.message
        );
      }

      if (productsResult.error) {
        console.error(
          "PRODUCT LOAD ERROR:",
          productsResult.error
        );

        throw new Error(
          "Không thể tải sản phẩm: " +
            productsResult.error.message
        );
      }

      setCategories(categoriesResult.data || []);
      setProducts(productsResult.data || []);

      if (stockResult?.success) {
        setStock(stockResult.stock || {});
      } else {
        setStock({});
      }

      if (currentUser) {
        await loadWallet(currentUser.id);
      } else {
        setWallet(null);
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

  async function loadWallet(userId) {
    try {
      const { data, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("WALLET ERROR:", error);
        return;
      }

      setWallet(data || null);
    } catch (err) {
      console.error("LOAD WALLET ERROR:", err);
    }
  }

  function getCategoryProducts(categoryId) {
    return products.filter(
      (product) =>
        Number(product.category_id) === Number(categoryId)
    );
  }

  function getProductStock(productId) {
    return Number(stock?.[productId]?.available || 0);
  }

  function getCategoryStock(categoryId) {
    const categoryProducts =
      getCategoryProducts(categoryId);

    return categoryProducts.reduce(
      (total, product) =>
        total + getProductStock(product.id),
      0
    );
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("vi-VN");
  }

  function openCategory(category) {
    setSelectedCategory(category);
    setSelectedProduct(null);
    setError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function backToCategories() {
    setSelectedCategory(null);
    setSelectedProduct(null);
    setError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleBuyClick(product) {
    setError("");
    setMessage("");

    const available = getProductStock(product.id);

    if (available <= 0) {
      setError(
        "Sản phẩm này hiện đã hết KEY."
      );
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    setSelectedProduct(product);
  }

  async function confirmBuy() {
    if (!selectedProduct) return;

    if (!user) {
      router.push("/login");
      return;
    }

    setBuying(true);
    setError("");
    setMessage("");
    setSuccessKey(null);

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
          Authorization:
            `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.message || "Mua KEY thất bại."
        );
      }

      setSuccessKey(data);
      setSelectedProduct(null);

      await Promise.all([
        loadWallet(user.id),
        reloadStock(),
      ]);
    } catch (err) {
      console.error("BUY KEY ERROR:", err);

      setError(
        err?.message || "Không thể mua KEY."
      );
    } finally {
      setBuying(false);
    }
  }

  async function reloadStock() {
    try {
      const response = await fetch(
        "/api/shop/stock",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (data?.success) {
        setStock(data.stock || {});
      }
    } catch (err) {
      console.error("RELOAD STOCK ERROR:", err);
    }
  }

  const categoryCount = useMemo(
    () => categories.length,
    [categories]
  );

  if (loading) {
    return (
      <main
        style={{
          ...styles.loadingPage,
          ...themeStyles(dark).page,
        }}
      >
        <div style={styles.loadingLogo}>
          X
        </div>

        <div style={styles.spinner} />

        <div style={styles.loadingTitle}>
          XENOVA PLAY
        </div>

        <div style={styles.loadingText}>
          Đang tải cửa hàng...
        </div>
      </main>
    );
  }

  if (selectedCategory) {
    const categoryProducts =
      getCategoryProducts(
        selectedCategory.id
      );

    const categoryStock =
      getCategoryStock(
        selectedCategory.id
      );

    return (
      <main
        style={{
          ...styles.page,
          ...themeStyles(dark).page,
        }}
      >
        <div style={styles.container}>
          <div style={styles.shopNav}>
            <button
              onClick={backToCategories}
              style={{
                ...styles.navBack,
                ...themeStyles(dark).button,
              }}
            >
              ← DANH MỤC
            </button>

            <div style={styles.navBrand}>
              XENOVA <span>PLAY</span>
            </div>

            <div style={styles.navRight}>
              {user ? (
                <button
                  onClick={() =>
                    router.push("/deposit")
                  }
                  style={styles.balanceButton}
                >
                  <span>💰</span>
                  {formatMoney(
                    wallet?.balance || 0
                  )}
                  đ
                </button>
              ) : (
                <button
                  onClick={() =>
                    router.push("/login")
                  }
                  style={
                    styles.navLogin
                  }
                >
                  ĐĂNG NHẬP
                </button>
              )}
            </div>
          </div>

          <section
            style={{
              ...styles.categoryHero,
              ...themeStyles(dark).card,
            }}
          >
            {selectedCategory.demo_image_url ? (
              <img
                src={
                  selectedCategory.demo_image_url
                }
                alt={selectedCategory.name}
                style={styles.categoryHeroImage}
              />
            ) : (
              <div
                style={
                  styles.categoryHeroNoImage
                }
              >
                📁
              </div>
            )}

            <div style={styles.heroGradient} />

            <div style={styles.heroContent}>
              <div style={styles.heroLabel}>
                XENOVA PLAY SHOP
              </div>

              <h1 style={styles.heroTitle}>
                {selectedCategory.name}
              </h1>

              <div style={styles.heroMeta}>
                {categoryProducts.length} sản phẩm
                <span>•</span>
                Còn {categoryStock} KEY
              </div>
            </div>
          </section>

          {error && (
            <div
              style={{
                ...styles.errorBox,
                ...themeStyles(dark).error,
              }}
            >
              <span>⚠️</span>
              <span>{error}</span>

              <button
                onClick={() => {
                  setError("");
                  loadShop();
                }}
                style={styles.errorRetry}
              >
                Thử lại
              </button>
            </div>
          )}

          {message && (
            <div
              style={{
                ...styles.successBox,
                ...themeStyles(dark).success,
              }}
            >
              ✓ {message}
            </div>
          )}

          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.sectionTitle}>
                SẢN PHẨM
              </div>

              <div
                style={{
                  ...styles.sectionSubtitle,
                  ...themeStyles(dark).muted,
                }}
              >
                Chọn sản phẩm bạn muốn mua
              </div>
            </div>

            <div
              style={{
                ...styles.stockBadge,
                ...themeStyles(dark).soft,
              }}
            >
              🟢 {categoryStock} KEY
            </div>
          </div>

          {categoryProducts.length === 0 ? (
            <EmptyState
              dark={dark}
              text="Danh mục này chưa có sản phẩm."
            />
          ) : (
            <div style={styles.productGrid}>
              {categoryProducts.map(
                (product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    stock={getProductStock(
                      product.id
                    )}
                    onBuy={() =>
                      handleBuyClick(product)
                    }
                    dark={dark}
                    index={index}
                  />
                )
              )}
            </div>
          )}

          <button
            onClick={() =>
              router.push("/deposit")
            }
            style={styles.depositButton}
          >
            <span>💰</span>
            NẠP TIỀN
            <span style={styles.buttonArrow}>
              →
            </span>
          </button>
        </div>

        {selectedProduct && (
          <BuyModal
            product={selectedProduct}
            buying={buying}
            balance={wallet?.balance || 0}
            stock={getProductStock(
              selectedProduct.id
            )}
            onClose={() =>
              setSelectedProduct(null)
            }
            onConfirm={confirmBuy}
            dark={dark}
          />
        )}

        {successKey && (
          <SuccessModal
            result={successKey}
            onClose={() =>
              setSuccessKey(null)
            }
            dark={dark}
          />
        )}
      </main>
    );
  }

  return (
    <main
      style={{
        ...styles.page,
        ...themeStyles(dark).page,
      }}
    >
      <div style={styles.container}>
        {/* TOP NAV */}

        <div style={styles.shopNav}>
          <button
            onClick={() =>
              router.push("/")
            }
            style={{
              ...styles.navHome,
              ...themeStyles(dark).button,
            }}
          >
            <span>⌂</span>
          </button>

          <div style={styles.navBrand}>
            XENOVA <span>PLAY</span>
          </div>

          <div style={styles.navRight}>
            {user ? (
              <>
                <button
                  onClick={() =>
                    router.push("/deposit")
                  }
                  style={styles.balanceButton}
                >
                  <span>💰</span>
                  {formatMoney(
                    wallet?.balance || 0
                  )}
                  đ
                </button>
              </>
            ) : (
              <button
                onClick={() =>
                  router.push("/login")
                }
                style={
                  styles.navLogin
                }
              >
                ĐĂNG NHẬP
              </button>
            )}
          </div>
        </div>

        {/* HERO */}

        <section
          style={{
            ...styles.mainHero,
            ...themeStyles(dark).hero,
          }}
        >
          <div style={styles.heroGlow} />

          <div style={styles.heroInner}>
            <div style={styles.heroPill}>
              <span style={styles.liveDot} />
              XENOVA PLAY SHOP
            </div>

            <h1 style={styles.mainTitle}>
              SHOP
              <span> XENOVA</span>
            </h1>

            <p
              style={{
                ...styles.mainSubtitle,
                ...themeStyles(dark).muted,
              }}
            >
              Chọn sản phẩm yêu thích và
              nhận KEY ngay sau khi thanh toán.
            </p>

            <button
              onClick={() =>
                router.push("/deposit")
              }
              style={styles.mainDeposit}
            >
              <span>💰</span>
              NẠP TIỀN
              <span style={styles.mainDepositArrow}>
                →
              </span>
            </button>
          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div
            style={{
              ...styles.errorBox,
              ...themeStyles(dark).error,
            }}
          >
            <span>⚠️</span>
            <span style={{ flex: 1 }}>
              {error}
            </span>

            <button
              onClick={loadShop}
              style={styles.errorRetry}
            >
              THỬ LẠI
            </button>
          </div>
        )}

        {successKey && (
          <SuccessModal
            result={successKey}
            onClose={() =>
              setSuccessKey(null)
            }
            dark={dark}
          />
        )}

        {/* CATEGORY HEADER */}

        <div style={styles.categoryHeading}>
          <div>
            <div
              style={styles.categoryHeadingTitle}
            >
              🛒 DANH MỤC SẢN PHẨM
            </div>

            <div
              style={{
                ...styles.categoryHeadingSub,
                ...themeStyles(dark).muted,
              }}
            >
              {categoryCount} danh mục • Chọn
              danh mục để xem sản phẩm
            </div>
          </div>

          <div
            style={{
              ...styles.totalBadge,
              ...themeStyles(dark).soft,
            }}
          >
            XENOVA
          </div>
        </div>

        {/* CATEGORY GRID — LUÔN 2 CỘT */}

        {categories.length === 0 ? (
          <EmptyState
            dark={dark}
            text="Hiện chưa có danh mục sản phẩm."
          />
        ) : (
          <div style={styles.categoryGrid}>
            {categories.map(
              (category, index) => {
                const count =
                  getCategoryProducts(
                    category.id
                  ).length;

                const available =
                  getCategoryStock(
                    category.id
                  );

                return (
                  <button
                    key={category.id}
                    onClick={() =>
                      openCategory(
                        category
                      )
                    }
                    style={{
                      ...styles.categoryCard,
                      ...themeStyles(dark).card,
                      animationDelay:
                        `${index * 60}ms`,
                    }}
                  >
                    <div
                      style={
                        styles.categoryImageBox
                      }
                    >
                      {category.demo_image_url ? (
                        <img
                          src={
                            category.demo_image_url
                          }
                          alt={
                            category.name
                          }
                          style={
                            styles.categoryImage
                          }
                        />
                      ) : (
                        <div
                          style={
                            styles.categoryNoImage
                          }
                        >
                          📁
                        </div>
                      )}

                      <div
                        style={
                          styles.imageOverlay
                        }
                      />

                      <div
                        style={
                          styles.categoryTopBadge
                        }
                      >
                        {available > 0
                          ? `CÒN ${available} KEY`
                          : "HẾT KEY"}
                      </div>
                    </div>

                    <div
                      style={
                        styles.categoryContent
                      }
                    >
                      <div
                        style={
                          styles.categoryName
                        }
                      >
                        {category.name}
                      </div>

                      <div
                        style={{
                          ...styles.categoryDescription,
                          ...themeStyles(dark).muted,
                        }}
                      >
                        {count} sản phẩm
                      </div>

                      <div
                        style={
                          styles.categoryBottom
                        }
                      >
                        <span
                          style={{
                            ...styles.availableText,
                            color:
                              available > 0
                                ? "#18a558"
                                : "#999",
                          }}
                        >
                          ●{" "}
                          {available > 0
                            ? `${available} KEY có sẵn`
                            : "Tạm hết hàng"}
                        </span>

                        <span
                          style={
                            styles.viewButton
                          }
                        >
                          XEM TẤT CẢ
                          <span>→</span>
                        </span>
                      </div>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        )}

        {/* FOOTER */}

        <div
          style={{
            ...styles.footer,
            ...themeStyles(dark).muted,
          }}
        >
          <div style={styles.footerLogo}>
            XENOVA PLAY
          </div>

          <div>
            © 2026 XENOVA PLAY • SHOP
          </div>
        </div>
      </div>

      {selectedProduct && (
        <BuyModal
          product={selectedProduct}
          buying={buying}
          balance={wallet?.balance || 0}
          stock={getProductStock(
            selectedProduct.id
          )}
          onClose={() =>
            setSelectedProduct(null)
          }
          onConfirm={confirmBuy}
          dark={dark}
        />
      )}
    </main>
  );
}

/* ============================
   PRODUCT CARD
============================ */

function ProductCard({
  product,
  stock,
  onBuy,
  dark,
  index,
}) {
  const soldOut = stock <= 0;

  return (
    <div
      style={{
        ...styles.productCard,
        ...themeStyles(dark).card,
        animationDelay:
          `${index * 50}ms`,
      }}
    >
      <div style={styles.productImageBox}>
        {product.demo_image_url ? (
          <img
            src={product.demo_image_url}
            alt={product.name}
            style={{
              ...styles.productImage,
              opacity: soldOut ? 0.45 : 1,
            }}
          />
        ) : (
          <div
            style={{
              ...styles.productNoImage,
              ...themeStyles(dark).soft,
            }}
          >
            🔑
          </div>
        )}

        <div style={styles.productImageShade} />

        <div
          style={{
            ...styles.productStockBadge,
            background: soldOut
              ? "#777"
              : "#18a558",
          }}
        >
          {soldOut
            ? "HẾT HÀNG"
            : `CÒN ${stock} KEY`}
        </div>
      </div>

      <div style={styles.productBody}>
        <div style={styles.productName}>
          {product.name}
        </div>

        {product.description && (
          <div
            style={{
              ...styles.productDescription,
              ...themeStyles(dark).muted,
            }}
          >
            {product.description}
          </div>
        )}

        <div
          style={{
            ...styles.productInfo,
            ...themeStyles(dark).soft,
          }}
        >
          <div>
            <span style={styles.productLabel}>
              GIÁ
            </span>

            <strong
              style={styles.productPrice}
            >
              {Number(
                product.price || 0
              ).toLocaleString("vi-VN")}
              đ
            </strong>
          </div>

          <div>
            <span style={styles.productLabel}>
              THỜI HẠN
            </span>

            <strong
              style={{
                ...styles.productDuration,
                ...themeStyles(dark).text,
              }}
            >
              {product.duration_days} ngày
            </strong>
          </div>
        </div>

        <button
          onClick={onBuy}
          disabled={soldOut}
          style={{
            ...styles.buyButton,
            background: soldOut
              ? "#888"
              : "linear-gradient(135deg,#ff3838,#e51f1f)",
            cursor: soldOut
              ? "not-allowed"
              : "pointer",
            opacity: soldOut ? 0.6 : 1,
          }}
        >
          {soldOut
            ? "HẾT KEY"
            : "🛒 MUA NGAY"}
        </button>
      </div>
    </div>
  );
}

/* ============================
   BUY MODAL
============================ */

function BuyModal({
  product,
  buying,
  balance,
  stock,
  onClose,
  onConfirm,
  dark,
}) {
  const price = Number(
    product.price || 0
  );

  const enough =
    Number(balance || 0) >= price;

  const soldOut = Number(stock || 0) <= 0;

  return (
    <div style={styles.modalBackdrop}>
      <div
        style={{
          ...styles.modal,
          ...themeStyles(dark).modal,
        }}
      >
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.modalSmall}>
              XENOVA PLAY
            </div>

            <div style={styles.modalTitle}>
              XÁC NHẬN MUA
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={buying}
            style={{
              ...styles.closeButton,
              ...themeStyles(dark).button,
            }}
          >
            ×
          </button>
        </div>

        {product.demo_image_url && (
          <img
            src={product.demo_image_url}
            alt={product.name}
            style={styles.modalImage}
          />
        )}

        <div
          style={{
            ...styles.confirmProduct,
            ...themeStyles(dark).soft,
          }}
        >
          <div style={styles.confirmName}>
            {product.name}
          </div>

          <div style={styles.confirmRow}>
            <span>Thời hạn</span>
            <strong>
              {product.duration_days} ngày
            </strong>
          </div>

          <div style={styles.confirmRow}>
            <span>Tồn kho</span>
            <strong
              style={{
                color:
                  stock > 0
                    ? "#18a558"
                    : "#ff3838",
              }}
            >
              {stock} KEY
            </strong>
          </div>

          <div style={styles.confirmRow}>
            <span>Giá</span>
            <strong
              style={styles.confirmPrice}
            >
              {price.toLocaleString("vi-VN")}
              đ
            </strong>
          </div>

          <div style={styles.confirmRow}>
            <span>Số dư hiện tại</span>
            <strong>
              {Number(
                balance || 0
              ).toLocaleString("vi-VN")}
              đ
            </strong>
          </div>
        </div>

        {soldOut && (
          <div
            style={styles.warningBox}
          >
            Sản phẩm vừa hết KEY.
          </div>
        )}

        {!soldOut && !enough && (
          <div
            style={styles.warningBox}
          >
            Số dư không đủ để mua sản
            phẩm này.
          </div>
        )}

        <div style={styles.modalActions}>
          <button
            onClick={onClose}
            disabled={buying}
            style={{
              ...styles.cancelButton,
              ...themeStyles(dark).button,
            }}
          >
            HỦY
          </button>

          <button
            onClick={onConfirm}
            disabled={
              buying ||
              !enough ||
              soldOut
            }
            style={{
              ...styles.confirmButton,
              opacity:
                buying ||
                !enough ||
                soldOut
                  ? 0.5
                  : 1,
            }}
          >
            {buying
              ? "⏳ ĐANG MUA..."
              : "🔑 XÁC NHẬN MUA"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================
   SUCCESS MODAL
============================ */

function SuccessModal({
  result,
  onClose,
  dark,
}) {
  return (
    <div style={styles.modalBackdrop}>
      <div
        style={{
          ...styles.successModal,
          ...themeStyles(dark).modal,
        }}
      >
        <div style={styles.successIcon}>
          ✓
        </div>

        <div style={styles.successTitle}>
          MUA KEY THÀNH CÔNG
        </div>

        <div
          style={{
            ...styles.successProduct,
            ...themeStyles(dark).muted,
          }}
        >
          {result.product_name}
        </div>

        <div style={styles.keyBox}>
          <div style={styles.keyLabel}>
            KEY CỦA BẠN
          </div>

          <div style={styles.keyCode}>
            {result.key_code}
          </div>
        </div>

        <div
          style={{
            ...styles.successInfo,
            ...themeStyles(dark).muted,
          }}
        >
          Thời hạn:{" "}
          <strong>
            {result.duration_days} ngày
          </strong>
        </div>

        <button
          onClick={onClose}
          style={styles.confirmButton}
        >
          ĐÃ NHẬN KEY
        </button>
      </div>
    </div>
  );
}

/* ============================
   EMPTY
============================ */

function EmptyState({ dark, text }) {
  return (
    <div
      style={{
        ...styles.empty,
        ...themeStyles(dark).card,
      }}
    >
      <div style={styles.emptyIcon}>
        📦
      </div>

      <div>{text}</div>
    </div>
  );
}

/* ============================
   THEME
============================ */

function themeStyles(dark) {
  if (dark) {
    return {
      page: {
        background: "#070707",
        color: "#fff",
      },

      card: {
        background: "#101010",
        borderColor: "#252525",
        color: "#fff",
      },

      modal: {
        background: "#111",
        borderColor: "#303030",
        color: "#fff",
      },

      button: {
        background: "#151515",
        borderColor: "#333",
        color: "#fff",
      },

      soft: {
        background: "#090909",
        borderColor: "#252525",
        color: "#fff",
      },

      muted: {
        color: "#777",
      },

      text: {
        color: "#fff",
      },

      hero: {
        background:
          "linear-gradient(135deg,#111,#080808)",
        borderColor: "#252525",
      },

      error: {
        background: "#2a0d0d",
        borderColor: "#652020",
        color: "#ff9999",
      },

      success: {
        background: "#092518",
        borderColor: "#185b34",
        color: "#63e996",
      },
    };
  }

  return {
    page: {
      background: "#f7f8fa",
      color: "#16181d",
    },

    card: {
      background: "#fff",
      borderColor: "#e8e9ed",
      color: "#16181d",
    },

    modal: {
      background: "#fff",
      borderColor: "#e4e5e8",
      color: "#16181d",
    },

    button: {
      background: "#fff",
      borderColor: "#dedfe4",
      color: "#16181d",
    },

    soft: {
      background: "#f5f6f8",
      borderColor: "#e6e7eb",
      color: "#16181d",
    },

    muted: {
      color: "#777d87",
    },

    text: {
      color: "#16181d",
    },

    hero: {
      background:
        "linear-gradient(135deg,#ffffff,#f2f3f6)",
      borderColor: "#e5e6ea",
    },

    error: {
      background: "#fff2f2",
      borderColor: "#ffd0d0",
      color: "#c62828",
    },

    success: {
      background: "#effbf4",
      borderColor: "#bce8cc",
      color: "#178344",
    },
  };
}

/* ============================
   STYLES
============================ */

const styles = {
  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  loadingLogo: {
    width: "55px",
    height: "55px",
    borderRadius: "15px",
    background:
      "linear-gradient(135deg,#ff3838,#c91515)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "1000",
    fontSize: "28px",
    marginBottom: "18px",
    boxShadow:
      "0 12px 35px rgba(255,40,40,.25)",
  },

  spinner: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    border: "3px solid rgba(120,120,120,.2)",
    borderTopColor: "#ff3030",
    animation:
      "xenovaShopSpin .7s linear infinite",
    marginBottom: "15px",
  },

  loadingTitle: {
    fontSize: "18px",
    fontWeight: "900",
    letterSpacing: "2px",
  },

  loadingText: {
    color: "#888",
    fontSize: "13px",
    marginTop: "6px",
  },

  page: {
    minHeight: "100vh",
    padding:
      "82px 15px 55px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    transition:
      "background .25s ease,color .25s ease",
  },

  container: {
    width: "100%",
    maxWidth: "1120px",
    margin: "0 auto",
  },

  shopNav: {
    height: "58px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "16px",
  },

  navHome: {
    width: "42px",
    height: "42px",
    border: "1px solid",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  navBack: {
    border: "1px solid",
    padding: "10px 13px",
    borderRadius: "11px",
    cursor: "pointer",
    fontWeight: "800",
    fontSize: "12px",
  },

  navBrand: {
    fontSize: "18px",
    fontWeight: "1000",
    letterSpacing: "1px",
  },

  navBrandSpan: {
    color: "#ff3030",
  },

  navRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  balanceButton: {
    border: "1px solid #ffdddd",
    background: "#fff5f5",
    color: "#e52626",
    borderRadius: "11px",
    padding: "10px 13px",
    cursor: "pointer",
    fontWeight: "900",
    fontSize: "12px",
    whiteSpace: "nowrap",
  },

  navLogin: {
    border: "none",
    background:
      "linear-gradient(135deg,#ff3838,#e51f1f)",
    color: "#fff",
    borderRadius: "11px",
    padding: "11px 14px",
    cursor: "pointer",
    fontWeight: "900",
    fontSize: "11px",
  },

  mainHero: {
    position: "relative",
    overflow: "hidden",
    border: "1px solid",
    borderRadius: "22px",
    minHeight: "260px",
    display: "flex",
    alignItems: "center",
    marginBottom: "34px",
    boxShadow:
      "0 12px 40px rgba(0,0,0,.07)",
  },

  heroGlow: {
    position: "absolute",
    width: "300px",
    height: "300px",
    right: "-100px",
    top: "-130px",
    borderRadius: "50%",
    background:
      "rgba(255,48,48,.13)",
    filter: "blur(10px)",
  },

  heroInner: {
    position: "relative",
    zIndex: 1,
    padding: "35px",
    maxWidth: "650px",
  },

  heroPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    border:
      "1px solid rgba(255,48,48,.2)",
    background:
      "rgba(255,48,48,.07)",
    color: "#e52626",
    borderRadius: "999px",
    padding: "7px 11px",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  liveDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#18a558",
    boxShadow:
      "0 0 0 4px rgba(24,165,88,.12)",
  },

  mainTitle: {
    margin: "16px 0 7px",
    fontSize:
      "clamp(38px,7vw,68px)",
    lineHeight: ".95",
    fontWeight: "1000",
    letterSpacing: "-3px",
  },

  mainSubtitle: {
    margin: 0,
    fontSize: "14px",
    lineHeight: "1.6",
    maxWidth: "540px",
  },

  mainDeposit: {
    marginTop: "22px",
    border: "none",
    background:
      "linear-gradient(135deg,#ff3838,#e51f1f)",
    color: "#fff",
    padding: "13px 18px",
    borderRadius: "11px",
    cursor: "pointer",
    fontWeight: "900",
    boxShadow:
      "0 8px 22px rgba(255,40,40,.25)",
  },

  mainDepositArrow: {
    marginLeft: "13px",
  },

  categoryHeading: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "16px",
  },

  categoryHeadingTitle: {
    fontSize: "21px",
    fontWeight: "1000",
  },

  categoryHeadingSub: {
    fontSize: "12px",
    marginTop: "5px",
  },

  totalBadge: {
    border: "1px solid",
    borderRadius: "999px",
    padding: "7px 10px",
    fontSize: "9px",
    fontWeight: "1000",
    letterSpacing: "1px",
  },

  /* LUÔN 2 CỘT */

  categoryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: "16px",
  },

  categoryCard: {
    padding: 0,
    width: "100%",
    border: "1px solid",
    borderRadius: "17px",
    overflow: "hidden",
    textAlign: "left",
    cursor: "pointer",
    animation:
      "xenovaFadeUp .45s ease both",
    transition:
      "transform .2s ease,box-shadow .2s ease",
  },

  categoryImageBox: {
    position: "relative",
    width: "100%",
    height: "180px",
    overflow: "hidden",
  },

  categoryImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    transition:
      "transform .35s ease",
  },

  categoryNoImage: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "55px",
    background:
      "linear-gradient(135deg,#151515,#292929)",
  },

  imageOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.7))",
  },

  categoryTopBadge: {
    position: "absolute",
    top: "12px",
    right: "12px",
    background:
      "rgba(0,0,0,.65)",
    backdropFilter: "blur(8px)",
    color: "#fff",
    borderRadius: "999px",
    padding: "6px 9px",
    fontSize: "9px",
    fontWeight: "900",
  },

  categoryContent: {
    padding: "15px",
  },

  categoryName: {
    fontSize: "19px",
    fontWeight: "1000",
    lineHeight: "1.2",
  },

  categoryDescription: {
    fontSize: "12px",
    marginTop: "5px",
  },

  categoryBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    marginTop: "14px",
  },

  availableText: {
    fontSize: "10px",
    fontWeight: "900",
  },

  viewButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    color: "#e52626",
    fontSize: "10px",
    fontWeight: "1000",
    whiteSpace: "nowrap",
  },

  categoryHero: {
    position: "relative",
    width: "100%",
    height: "255px",
    overflow: "hidden",
    border: "1px solid",
    borderRadius: "19px",
    marginBottom: "24px",
  },

  categoryHeroImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  categoryHeroNoImage: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "65px",
    background: "#151515",
  },

  heroGradient: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg,transparent 15%,rgba(0,0,0,.88))",
  },

  heroContent: {
    position: "absolute",
    left: "22px",
    right: "22px",
    bottom: "20px",
    color: "#fff",
  },

  heroLabel: {
    color: "#ff4848",
    fontSize: "10px",
    fontWeight: "1000",
    letterSpacing: "2px",
  },

  heroTitle: {
    margin: "5px 0",
    fontSize: "30px",
    fontWeight: "1000",
  },

  heroMeta: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    color: "#ddd",
    fontSize: "12px",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "15px",
  },

  sectionTitle: {
    fontSize: "19px",
    fontWeight: "1000",
  },

  sectionSubtitle: {
    fontSize: "12px",
    marginTop: "4px",
  },

  stockBadge: {
    border: "1px solid",
    borderRadius: "999px",
    padding: "7px 10px",
    fontSize: "10px",
    fontWeight: "900",
  },

  productGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(250px,1fr))",
    gap: "16px",
  },

  productCard: {
    border: "1px solid",
    borderRadius: "16px",
    overflow: "hidden",
    animation:
      "xenovaFadeUp .45s ease both",
    transition:
      "transform .2s ease,box-shadow .2s ease",
  },

  productImageBox: {
    position: "relative",
    width: "100%",
    height: "175px",
    overflow: "hidden",
    background: "#101010",
  },

  productImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    transition:
      "transform .3s ease",
  },

  productNoImage: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "55px",
  },

  productImageShade: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(transparent 35%,rgba(0,0,0,.55))",
  },

  productStockBadge: {
    position: "absolute",
    top: "11px",
    right: "11px",
    color: "#fff",
    borderRadius: "999px",
    padding: "6px 9px",
    fontSize: "9px",
    fontWeight: "1000",
  },

  productBody: {
    padding: "16px",
  },

  productName: {
    fontSize: "18px",
    fontWeight: "1000",
  },

  productDescription: {
    minHeight: "18px",
    fontSize: "12px",
    lineHeight: "1.5",
    marginTop: "6px",
  },

  productInfo: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "10px",
    padding: "11px",
    border: "1px solid",
    borderRadius: "10px",
    marginTop: "13px",
  },

  productLabel: {
    display: "block",
    color: "#888",
    fontSize: "8px",
    fontWeight: "1000",
    marginBottom: "4px",
  },

  productPrice: {
    color: "#e52626",
    fontSize: "15px",
  },

  productDuration: {
    fontSize: "13px",
  },

  buyButton: {
    width: "100%",
    border: "none",
    color: "#fff",
    padding: "13px",
    borderRadius: "10px",
    marginTop: "11px",
    fontWeight: "1000",
  },

  depositButton: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    marginTop: "25px",
    border: "none",
    background:
      "linear-gradient(135deg,#ff3838,#e51f1f)",
    color: "#fff",
    padding: "14px",
    borderRadius: "11px",
    cursor: "pointer",
    fontWeight: "1000",
    boxShadow:
      "0 8px 25px rgba(255,40,40,.18)",
  },

  buttonArrow: {
    marginLeft: "10px",
  },

  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    padding: "12px 14px",
    marginBottom: "18px",
    border: "1px solid",
    borderRadius: "11px",
    fontSize: "12px",
  },

  errorRetry: {
    border: "none",
    background: "#e52626",
    color: "#fff",
    padding: "7px 10px",
    borderRadius: "7px",
    fontSize: "9px",
    fontWeight: "900",
    cursor: "pointer",
  },

  successBox: {
    padding: "12px 14px",
    marginBottom: "18px",
    border: "1px solid",
    borderRadius: "11px",
    fontSize: "12px",
  },

  empty: {
    padding: "55px 20px",
    border: "1px solid",
    borderRadius: "15px",
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: "40px",
    marginBottom: "10px",
  },

  footer: {
    textAlign: "center",
    fontSize: "10px",
    marginTop: "45px",
    paddingBottom: "10px",
  },

  footerLogo: {
    color: "#e52626",
    fontWeight: "1000",
    letterSpacing: "2px",
    marginBottom: "5px",
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 10000,
    background:
      "rgba(0,0,0,.72)",
    backdropFilter: "blur(7px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "15px",
  },

  modal: {
    width: "100%",
    maxWidth: "440px",
    maxHeight: "90vh",
    overflowY: "auto",
    border: "1px solid",
    borderRadius: "18px",
    padding: "20px",
    boxSizing: "border-box",
    boxShadow:
      "0 25px 80px rgba(0,0,0,.35)",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },

  modalSmall: {
    color: "#e52626",
    fontSize: "9px",
    fontWeight: "1000",
    letterSpacing: "2px",
  },

  modalTitle: {
    fontSize: "20px",
    fontWeight: "1000",
    marginTop: "4px",
  },

  closeButton: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    border: "1px solid",
    fontSize: "22px",
    cursor: "pointer",
  },

  modalImage: {
    width: "100%",
    maxHeight: "210px",
    objectFit: "cover",
    borderRadius: "11px",
    marginBottom: "14px",
  },

  confirmProduct: {
    border: "1px solid",
    borderRadius: "11px",
    padding: "14px",
  },

  confirmName: {
    fontSize: "18px",
    fontWeight: "1000",
    marginBottom: "10px",
  },

  confirmRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    padding: "8px 0",
    borderBottom:
      "1px solid rgba(128,128,128,.15)",
    color: "#777",
    fontSize: "12px",
  },

  confirmPrice: {
    color: "#e52626",
  },

  warningBox: {
    marginTop: "12px",
    padding: "11px",
    background: "#fff8e8",
    border: "1px solid #f1d999",
    color: "#9a711b",
    borderRadius: "9px",
    fontSize: "12px",
  },

  modalActions: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1.5fr",
    gap: "9px",
    marginTop: "15px",
  },

  cancelButton: {
    border: "1px solid",
    borderRadius: "9px",
    padding: "12px",
    cursor: "pointer",
    fontWeight: "900",
  },

  confirmButton: {
    border: "none",
    background:
      "linear-gradient(135deg,#ff3838,#e51f1f)",
    color: "#fff",
    borderRadius: "9px",
    padding: "12px",
    cursor: "pointer",
    fontWeight: "900",
  },

  successModal: {
    width: "100%",
    maxWidth: "420px",
    border: "1px solid",
    borderRadius: "18px",
    padding: "25px",
    textAlign: "center",
    boxSizing: "border-box",
    boxShadow:
      "0 25px 80px rgba(0,0,0,.35)",
  },

  successIcon: {
    width: "65px",
    height: "65px",
    margin: "0 auto 15px",
    borderRadius: "50%",
    background: "#0c5b2e",
    color: "#57f18b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "35px",
    fontWeight: "1000",
  },

  successTitle: {
    fontSize: "21px",
    fontWeight: "1000",
  },

  successProduct: {
    marginTop: "6px",
    fontSize: "13px",
  },

  keyBox: {
    margin: "20px 0 15px",
    padding: "17px",
    background: "#080808",
    border: "1px solid #292929",
    borderRadius: "10px",
  },

  keyLabel: {
    color: "#777",
    fontSize: "9px",
    fontWeight: "1000",
    marginBottom: "8px",
  },

  keyCode: {
    color: "#ff4040",
    fontSize: "21px",
    fontWeight: "1000",
    wordBreak: "break-all",
    letterSpacing: "1px",
  },

  successInfo: {
    fontSize: "13px",
    marginBottom: "15px",
  },
};

/* ============================
   ANIMATION
============================ */

if (
  typeof document !== "undefined" &&
  !document.getElementById(
    "xenova-shop-animation"
  )
) {
  const style =
    document.createElement("style");

  style.id = "xenova-shop-animation";

  style.textContent = `
    @keyframes xenovaShopSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes xenovaFadeUp {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 600px) {
      .xenova-category-card:hover {
        transform: none !important;
      }
    }
  `;

  document.head.appendChild(style);
}
