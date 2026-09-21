"use client";

import { useEffect, useMemo, useState } from "react";

export default function WebsiteShopPage({ website }) {
  const [catalog, setCatalog] = useState({
    categories: [],
    products: [],
  });

  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] =
    useState(null);

  const [bannerIndex, setBannerIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] =
    useState(null);

  const [petals, setPetals] = useState([]);

  const settings = website?.settings || {};

  const banners = useMemo(() => {
    const list = [];

    if (website?.banner_url) {
      list.push(website.banner_url);
    }

    if (Array.isArray(settings.banners)) {
      settings.banners.forEach((item) => {
        if (!item) return;

        const url =
          typeof item === "string"
            ? item
            : item.url;

        if (url && !list.includes(url)) {
          list.push(url);
        }
      });
    }

    return list;
  }, [website, settings.banners]);

  const themeColor =
    website?.theme ||
    "#ff4fae";

  useEffect(() => {
    if (!website?.slug) return;

    loadCatalog();
  }, [website?.slug]);

  useEffect(() => {
    if (banners.length <= 1) return;

    const timer = setInterval(() => {
      setBannerIndex((current) =>
        (current + 1) % banners.length
      );
    }, 4000);

    return () => clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    const list = Array.from(
      { length: 18 },
      (_, index) => ({
        id: index,
        left:
          Math.random() * 100,
        delay:
          Math.random() * 8,
        duration:
          7 + Math.random() * 8,
        size:
          8 + Math.random() * 8,
      })
    );

    setPetals(list);
  }, []);

  async function loadCatalog() {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/sites/${website.slug}/catalog`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Không thể tải sản phẩm"
        );
      }

      setCatalog({
        categories:
          result.categories || [],
        products:
          result.products || [],
      });
    } catch (error) {
      console.error(error);

      setCatalog({
        categories: [],
        products: [],
      });
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(price) {
    return (
      new Intl.NumberFormat("vi-VN").format(
        Number(price || 0)
      ) + "đ"
    );
  }

  function getCategoryProducts(categoryId) {
    return catalog.products.filter(
      (product) =>
        Number(product.category_id) ===
        Number(categoryId)
    );
  }

  const visibleProducts = useMemo(() => {
    if (selectedCategory === null) {
      return catalog.products;
    }

    return catalog.products.filter(
      (product) =>
        Number(product.category_id) ===
        Number(selectedCategory)
    );
  }, [
    catalog.products,
    selectedCategory,
  ]);

  function goPreviousBanner() {
    if (!banners.length) return;

    setBannerIndex((current) =>
      current === 0
        ? banners.length - 1
        : current - 1
    );
  }

  function goNextBanner() {
    if (!banners.length) return;

    setBannerIndex(
      (current) =>
        (current + 1) %
        banners.length
    );
  }

  function openBuy(product) {
    setSelectedProduct(product);
  }

  function closeBuy() {
    setSelectedProduct(null);
  }

  function buyProduct() {
    if (!selectedProduct) return;

    /*
     * Phần này chỉ mở luồng mua của
     * website riêng.
     *
     * Chưa đụng vào wallet/deposit/order
     * của XENOVA cũ.
     */
    window.location.href =
      `/sites/${website.slug}/checkout?product=${selectedProduct.id}`;
  }

  return (
    <main
      style={{
        ...styles.page,
        "--theme": themeColor,
      }}
    >
      <style>{`
        * {
          box-sizing: border-box;
        }

        html, body {
          margin: 0;
          padding: 0;
          background: #08070c;
        }

        body {
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
        textarea,
        select {
          font: inherit;
        }

        @keyframes petalFall {
          0% {
            transform:
              translate3d(0,-40px,0)
              rotate(0deg);
            opacity: 0;
          }

          10% {
            opacity: .8;
          }

          90% {
            opacity: .55;
          }

          100% {
            transform:
              translate3d(80px,110vh,0)
              rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            box-shadow:
              0 0 0 rgba(255,79,174,0);
          }

          50% {
            box-shadow:
              0 0 28px rgba(255,79,174,.16);
          }
        }

        @media (max-width: 600px) {
          .website-container {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }

          .category-grid {
            grid-template-columns:
              repeat(2,minmax(0,1fr)) !important;
          }

          .product-grid {
            grid-template-columns:
              repeat(2,minmax(0,1fr)) !important;
          }

          .banner-height {
            height: 170px !important;
          }

          .bottom-toolbar {
            left: 8px !important;
            right: 8px !important;
            bottom: 8px !important;
          }
        }
      `}</style>

      <div style={styles.backgroundGlow} />

      {petals.map((petal) => (
        <span
          key={petal.id}
          style={{
            ...styles.petal,
            left: `${petal.left}%`,
            animationDelay:
              `${petal.delay}s`,
            animationDuration:
              `${petal.duration}s`,
            width: `${petal.size}px`,
            height: `${petal.size * 0.7}px`,
          }}
        />
      ))}

      <div
        className="website-container"
        style={styles.container}
      >
        <header style={styles.topbar}>
          <div style={styles.brand}>
            {website?.logo_url ? (
              <img
                src={website.logo_url}
                alt={website.name}
                style={styles.logo}
              />
            ) : (
              <div
                style={{
                  ...styles.logoPlaceholder,
                  background:
                    themeColor,
                }}
              >
                {(website?.name || "S")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

            <div>
              <div style={styles.brandName}>
                {website?.name ||
                  "SHOP"}
              </div>

              <div style={styles.brandSub}>
                SHOP ONLINE
              </div>
            </div>
          </div>

          <a
            href={`/sites/${website.slug}/admin`}
            style={styles.adminLink}
          >
            ADMIN
          </a>
        </header>

        {banners.length > 0 ? (
          <section
            className="banner-height"
            style={styles.banner}
          >
            <img
              src={banners[bannerIndex]}
              alt="Banner"
              style={styles.bannerImage}
            />

            {banners.length > 1 && (
              <>
                <button
                  onClick={
                    goPreviousBanner
                  }
                  style={{
                    ...styles.bannerArrow,
                    left: 10,
                  }}
                >
                  ‹
                </button>

                <button
                  onClick={
                    goNextBanner
                  }
                  style={{
                    ...styles.bannerArrow,
                    right: 10,
                  }}
                >
                  ›
                </button>

                <div
                  style={
                    styles.bannerDots
                  }
                >
                  {banners.map(
                    (_, index) => (
                      <button
                        key={index}
                        onClick={() =>
                          setBannerIndex(
                            index
                          )
                        }
                        style={{
                          ...styles.dot,
                          opacity:
                            index ===
                            bannerIndex
                              ? 1
                              : 0.4,
                        }}
                      />
                    )
                  )}
                </div>
              </>
            )}
          </section>
        ) : (
          <section
            style={{
              ...styles.emptyBanner,
              borderColor:
                `${themeColor}55`,
            }}
          >
            <div>
              {website?.name ||
                "SHOP"}
            </div>

            <span>
              {website?.description ||
                "Chào mừng bạn đến shop"}
            </span>
          </section>
        )}

        <section style={styles.content}>
          <div style={styles.sectionHeading}>
            <div>
              <div style={styles.sectionTitle}>
                DANH MỤC
              </div>

              <div style={styles.sectionLine} />
            </div>

            <button
              onClick={() =>
                setSelectedCategory(null)
              }
              style={{
                ...styles.allButton,
                color:
                  selectedCategory ===
                  null
                    ? themeColor
                    : "#888",
              }}
            >
              TẤT CẢ
            </button>
          </div>

          {loading ? (
            <div style={styles.loading}>
              Đang tải danh mục...
            </div>
          ) : catalog.categories
              .length === 0 ? (
            <div style={styles.empty}>
              Chưa có danh mục.
            </div>
          ) : (
            <div
              className="category-grid"
              style={styles.categoryGrid}
            >
              {catalog.categories
                .filter(
                  (category) =>
                    !category.parent_id
                )
                .map((category) => {
                  const count =
                    getCategoryProducts(
                      category.id
                    ).length;

                  const active =
                    Number(
                      selectedCategory
                    ) ===
                    Number(category.id);

                  return (
                    <button
                      key={category.id}
                      onClick={() =>
                        setSelectedCategory(
                          category.id
                        )
                      }
                      style={{
                        ...styles.categoryCard,
                        borderColor:
                          active
                            ? themeColor
                            : "#28232d",
                        boxShadow:
                          active
                            ? `0 0 20px ${themeColor}22`
                            : "none",
                      }}
                    >
                      {category.image_url ? (
                        <img
                          src={
                            category.image_url
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
                            styles.categoryIcon
                          }
                        >
                          📁
                        </div>
                      )}

                      <div
                        style={
                          styles.categoryText
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
                          style={
                            styles.categoryCount
                          }
                        >
                          {count} sản phẩm
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}

          <div
            style={{
              ...styles.sectionHeading,
              marginTop: 28,
            }}
          >
            <div>
              <div style={styles.sectionTitle}>
                {selectedCategory
                  ? catalog.categories.find(
                      (item) =>
                        Number(item.id) ===
                        Number(
                          selectedCategory
                        )
                    )?.name ||
                    "SẢN PHẨM"
                  : "SẢN PHẨM"}
              </div>

              <div style={styles.sectionLine} />
            </div>

            <div
              style={styles.productCount}
            >
              {visibleProducts.length} sản phẩm
            </div>
          </div>

          {loading ? (
            <div style={styles.loading}>
              Đang tải sản phẩm...
            </div>
          ) : visibleProducts.length ===
            0 ? (
            <div style={styles.empty}>
              Chưa có sản phẩm trong
              danh mục này.
            </div>
          ) : (
            <div
              className="product-grid"
              style={styles.productGrid}
            >
              {visibleProducts.map(
                (product) => (
                  <article
                    key={product.id}
                    style={styles.productCard}
                  >
                    <div
                      style={
                        styles.productImageWrap
                      }
                    >
                      {product.image_url ? (
                        <img
                          src={
                            product.image_url
                          }
                          alt={
                            product.name
                          }
                          style={
                            styles.productImage
                          }
                        />
                      ) : (
                        <div
                          style={
                            styles.productPlaceholder
                          }
                        >
                          📦
                        </div>
                      )}

                      {!product.active && (
                        <div
                          style={
                            styles.soldOut
                          }
                        >
                          TẠM TẮT
                        </div>
                      )}
                    </div>

                    <div
                      style={
                        styles.productBody
                      }
                    >
                      <div
                        style={
                          styles.productName
                        }
                      >
                        {product.name}
                      </div>

                      <div
                        style={
                          styles.productPrice
                        }
                      >
                        {formatPrice(
                          product.price
                        )}
                      </div>

                      {product.duration_days !=
                        null && (
                        <div
                          style={
                            styles.duration
                          }
                        >
                          {product.duration_days}{" "}
                          ngày
                        </div>
                      )}

                      <button
                        disabled={
                          !product.active
                        }
                        onClick={() =>
                          openBuy(product)
                        }
                        style={{
                          ...styles.buyButton,
                          background:
                            product.active
                              ? themeColor
                              : "#29252d",
                          cursor:
                            product.active
                              ? "pointer"
                              : "not-allowed",
                        }}
                      >
                        {product.active
                          ? "MUA NGAY"
                          : "TẠM TẮT"}
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </div>

      <div
        className="bottom-toolbar"
        style={styles.bottomToolbar}
      >
        <a
          href={`/sites/${website.slug}`}
          style={styles.toolbarItem}
        >
          <span>⌂</span>
          <small>SHOP</small>
        </a>

        <a
          href={`/sites/${website.slug}/orders`}
          style={styles.toolbarItem}
        >
          <span>▣</span>
          <small>ĐƠN HÀNG</small>
        </a>

        <a
          href={`/sites/${website.slug}/account`}
          style={styles.toolbarItem}
        >
          <span>●</span>
          <small>TÀI KHOẢN</small>
        </a>
      </div>

      {website?.settings?.zalo_url && (
        <a
          href={
            website.settings.zalo_url
          }
          target="_blank"
          rel="noreferrer"
          style={styles.zalo}
        >
          Z
        </a>
      )}

      {selectedProduct && (
        <div
          style={styles.modalBackdrop}
          onClick={closeBuy}
        >
          <div
            style={styles.modal}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              onClick={closeBuy}
              style={styles.modalClose}
            >
              ×
            </button>

            {selectedProduct.image_url && (
              <img
                src={
                  selectedProduct.image_url
                }
                alt={
                  selectedProduct.name
                }
                style={styles.modalImage}
              />
            )}

            <div
              style={
                styles.modalTitle
              }
            >
              {selectedProduct.name}
            </div>

            <div
              style={
                styles.modalPrice
              }
            >
              {formatPrice(
                selectedProduct.price
              )}
            </div>

            {selectedProduct.duration_days !=
              null && (
              <div
                style={
                  styles.modalDuration
                }
              >
                Thời hạn:{" "}
                {
                  selectedProduct.duration_days
                }{" "}
                ngày
              </div>
            )}

            {selectedProduct.description && (
              <div
                style={
                  styles.modalDescription
                }
              >
                {
                  selectedProduct.description
                }
              </div>
            )}

            <button
              onClick={buyProduct}
              style={{
                ...styles.modalBuy,
                background:
                  themeColor,
              }}
            >
              TIẾP TỤC MUA
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    overflowX: "hidden",
    background:
      "linear-gradient(180deg,#08070c 0%,#0d0a11 55%,#08070c 100%)",
    color: "#fff",
    paddingBottom: 90,
  },

  backgroundGlow: {
    position: "fixed",
    width: 500,
    height: 500,
    left: "50%",
    top: 100,
    transform: "translateX(-50%)",
    background:
      "radial-gradient(circle,rgba(255,79,174,.07),transparent 65%)",
    pointerEvents: "none",
  },

  petal: {
    position: "fixed",
    top: -30,
    background:
      "rgba(255,105,180,.65)",
    borderRadius:
      "100% 0 100% 0",
    transform: "rotate(30deg)",
    animationName: "petalFall",
    animationTimingFunction:
      "linear",
    animationIterationCount:
      "infinite",
    pointerEvents: "none",
    zIndex: 2,
  },

  container: {
    position: "relative",
    zIndex: 3,
    width: "100%",
    maxWidth: 1050,
    margin: "0 auto",
    padding: "0 14px",
  },

  topbar: {
    minHeight: 68,
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: 10,
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  logo: {
    width: 42,
    height: 42,
    objectFit: "cover",
    borderRadius: 12,
    border: "1px solid #342c38",
  },

  logoPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    color: "#fff",
    fontWeight: 950,
  },

  brandName: {
    fontSize: 14,
    fontWeight: 950,
    letterSpacing: ".5px",
  },

  brandSub: {
    marginTop: 2,
    color: "#6e6875",
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: "1px",
  },

  adminLink: {
    color: "#756e7c",
    textDecoration: "none",
    fontSize: 8,
    fontWeight: 900,
    padding: "7px 9px",
    border: "1px solid #29232e",
    borderRadius: 7,
  },

  banner: {
    position: "relative",
    width: "100%",
    height: 270,
    overflow: "hidden",
    borderRadius: 16,
    border: "1px solid #29232e",
    background: "#100d14",
  },

  bannerImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  bannerArrow: {
    position: "absolute",
    top: "50%",
    transform:
      "translateY(-50%)",
    width: 34,
    height: 34,
    border: "1px solid rgba(255,255,255,.18)",
    borderRadius: "50%",
    background:
      "rgba(0,0,0,.35)",
    color: "#fff",
    fontSize: 25,
    lineHeight: "25px",
    cursor: "pointer",
  },

  bannerDots: {
    position: "absolute",
    left: "50%",
    bottom: 10,
    transform:
      "translateX(-50%)",
    display: "flex",
    gap: 5,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    border: "none",
    padding: 0,
    background: "#fff",
    cursor: "pointer",
  },

  emptyBanner: {
    height: 170,
    borderRadius: 16,
    border: "1px solid",
    background:
      "linear-gradient(135deg,#17101a,#0e0c12)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    fontSize: 25,
    fontWeight: 950,
  },

  content: {
    paddingTop: 25,
  },

  sectionHeading: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: 950,
    letterSpacing: ".7px",
  },

  sectionLine: {
    width: 28,
    height: 2,
    marginTop: 6,
    borderRadius: 5,
    background:
      "var(--theme)",
  },

  allButton: {
    border: "none",
    background: "transparent",
    fontSize: 9,
    fontWeight: 950,
    cursor: "pointer",
  },

  productCount: {
    color: "#68626f",
    fontSize: 9,
  },

  categoryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: 9,
  },

  categoryCard: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: 10,
    borderRadius: 12,
    background: "#111016",
    border: "1px solid",
    color: "#fff",
    textAlign: "left",
    cursor: "pointer",
    transition:
      "all .2s ease",
  },

  categoryImage: {
    width: 42,
    height: 42,
    borderRadius: 10,
    objectFit: "cover",
    flexShrink: 0,
  },

  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    background: "#211521",
    flexShrink: 0,
  },

  categoryText: {
    minWidth: 0,
  },

  categoryName: {
    fontSize: 11,
    fontWeight: 900,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  categoryCount: {
    marginTop: 3,
    color: "#716b78",
    fontSize: 8,
  },

  productGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: 10,
  },

  productCard: {
    overflow: "hidden",
    borderRadius: 14,
    background: "#111016",
    border: "1px solid #28232d",
  },

  productImageWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: "1 / 1",
    background: "#09080d",
  },

  productImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  productPlaceholder: {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
    fontSize: 35,
  },

  soldOut: {
    position: "absolute",
    left: 7,
    top: 7,
    padding: "4px 6px",
    borderRadius: 5,
    background:
      "rgba(0,0,0,.65)",
    color: "#aaa",
    fontSize: 7,
    fontWeight: 900,
  },

  productBody: {
    padding: 10,
  },

  productName: {
    minHeight: 28,
    fontSize: 10,
    lineHeight: 1.35,
    fontWeight: 900,
  },

  productPrice: {
    marginTop: 5,
    color: "var(--theme)",
    fontSize: 12,
    fontWeight: 950,
  },

  duration: {
    marginTop: 3,
    color: "#77717d",
    fontSize: 8,
  },

  buyButton: {
    width: "100%",
    height: 33,
    marginTop: 9,
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontSize: 8,
    fontWeight: 950,
  },

  loading: {
    padding: 30,
    textAlign: "center",
    color: "#77717f",
    fontSize: 11,
  },

  empty: {
    padding: 30,
    borderRadius: 12,
    border: "1px dashed #302a36",
    textAlign: "center",
    color: "#68616e",
    fontSize: 11,
  },

  bottomToolbar: {
    position: "fixed",
    zIndex: 50,
    left: "50%",
    bottom: 12,
    transform:
      "translateX(-50%)",
    width: "calc(100% - 28px)",
    maxWidth: 520,
    height: 58,
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-around",
    borderRadius: 16,
    background:
      "rgba(17,16,22,.94)",
    border: "1px solid #312a36",
    backdropFilter:
      "blur(15px)",
  },

  toolbarItem: {
    minWidth: 80,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    color: "#77717f",
    textDecoration: "none",
    fontSize: 15,
  },

  zalo: {
    position: "fixed",
    zIndex: 60,
    right: 14,
    bottom: 82,
    width: 43,
    height: 43,
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background:
      "var(--theme)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 950,
    animation:
      "pulseGlow 2s infinite",
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    background:
      "rgba(0,0,0,.75)",
    backdropFilter:
      "blur(8px)",
  },

  modal: {
    position: "relative",
    width: "100%",
    maxWidth: 400,
    maxHeight:
      "calc(100vh - 30px)",
    overflowY: "auto",
    padding: 20,
    borderRadius: 18,
    background: "#121016",
    border: "1px solid #332b38",
    boxShadow:
      "0 20px 70px rgba(0,0,0,.6)",
  },

  modalClose: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    border: "none",
    borderRadius: "50%",
    background: "#27222c",
    color: "#aaa",
    fontSize: 20,
    cursor: "pointer",
  },

  modalImage: {
    width: "100%",
    maxHeight: 230,
    objectFit: "cover",
    borderRadius: 12,
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 950,
  },

  modalPrice: {
    marginTop: 7,
    color: "var(--theme)",
    fontSize: 17,
    fontWeight: 950,
  },

  modalDuration: {
    marginTop: 5,
    color: "#85808b",
    fontSize: 10,
  },

  modalDescription: {
    marginTop: 14,
    paddingTop: 12,
    borderTop: "1px solid #28232d",
    color: "#a09aa5",
    fontSize: 11,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  },

  modalBuy: {
    width: "100%",
    height: 45,
    marginTop: 18,
    border: "none",
    borderRadius: 10,
    color: "#fff",
    fontSize: 10,
    fontWeight: 950,
    cursor: "pointer",
  },
};
