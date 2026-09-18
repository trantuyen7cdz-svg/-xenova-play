"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ShopPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [selectedCategory, setSelectedCategory] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [selectedProduct, setSelectedProduct] =
    useState(null);

  const [successKey, setSuccessKey] = useState(null);

  useEffect(() => {
    loadShop();
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
      ] = await Promise.all([
        supabase
          .from("product_categories")
          .select(
            "id,name,active,demo_image_url"
          )
          .eq("active", true)
          .order("id", {
            ascending: true,
          }),

        supabase
          .from("products")
          .select(
            `
            id,
            name,
            description,
            price,
            duration_days,
            active,
            is_active,
            demo_image_url,
            category_id
          `
          )
          .eq("active", true)
          .eq("is_active", true)
          .order("id", {
            ascending: true,
          }),
      ]);

      if (categoriesResult.error) {
        console.error(
          "CATEGORY LOAD ERROR:",
          categoriesResult.error
        );

        throw new Error(
          "Không thể tải thư mục: " +
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

      const loadedCategories =
        categoriesResult.data || [];

      const loadedProducts =
        productsResult.data || [];

      setCategories(loadedCategories);
      setProducts(loadedProducts);

      if (currentUser) {
        await loadWallet(currentUser.id);
      }
    } catch (err) {
      console.error(
        "SHOP LOAD ERROR:",
        err
      );

      setError(
        err?.message ||
          "Không thể tải cửa hàng."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadWallet(userId) {
    try {
      const { data, error } =
        await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", userId)
          .maybeSingle();

      if (error) {
        console.error(
          "WALLET ERROR:",
          error
        );
        return;
      }

      setWallet(data || null);
    } catch (err) {
      console.error(
        "LOAD WALLET ERROR:",
        err
      );
    }
  }

  function getCategoryProducts(categoryId) {
    return products.filter(
      (product) =>
        Number(product.category_id) ===
        Number(categoryId)
    );
  }

  function getAvailableCount(categoryId) {
    /*
     * Đếm số sản phẩm thuộc thư mục.
     * Stock KEY thật sẽ được kiểm tra khi khách mua
     * thông qua buy_key.
     */
    return getCategoryProducts(categoryId)
      .length;
  }

  function openCategory(category) {
    setSelectedCategory(category);
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

  function formatMoney(value) {
    return Number(
      value || 0
    ).toLocaleString("vi-VN");
  }

  function handleBuyClick(product) {
    setError("");
    setMessage("");

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
        data: {
          session,
        },
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
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            productId:
              selectedProduct.id,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.message ||
            "Mua KEY thất bại."
        );
      }

      setSuccessKey(data);

      setSelectedProduct(null);

      await loadWallet(user.id);
    } catch (err) {
      console.error(
        "BUY KEY ERROR:",
        err
      );

      setError(
        err?.message ||
          "Không thể mua KEY."
      );
    } finally {
      setBuying(false);
    }
  }

  if (loading) {
    return (
      <main style={styles.loadingPage}>
        <div style={styles.spinner} />

        <div style={styles.loadingTitle}>
          ĐANG TẢI CỬA HÀNG
        </div>

        <div style={styles.loadingText}>
          Đang tải thư mục và sản phẩm...
        </div>
      </main>
    );
  }

  /*
   * ============================
   * CHI TIẾT THƯ MỤC
   * ============================
   */
  if (selectedCategory) {
    const categoryProducts =
      getCategoryProducts(
        selectedCategory.id
      );

    return (
      <main style={styles.page}>
        <div style={styles.container}>
          {/* HEADER */}

          <div style={styles.topBar}>
            <button
              onClick={backToCategories}
              style={styles.backButton}
            >
              ← QUAY LẠI
            </button>

            <div style={styles.walletBox}>
              <span style={styles.walletLabel}>
                SỐ DƯ
              </span>

              <strong>
                {formatMoney(
                  wallet?.balance || 0
                )}
                đ
              </strong>
            </div>
          </div>

          {/* CATEGORY HEADER */}

          <section style={styles.categoryHero}>
            {selectedCategory.demo_image_url ? (
              <img
                src={
                  selectedCategory.demo_image_url
                }
                alt={
                  selectedCategory.name
                }
                style={
                  styles.categoryHeroImage
                }
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

            <div style={styles.heroOverlay}>
              <div
                style={
                  styles.categorySmall
                }
              >
                XENOVA PLAY
              </div>

              <h1
                style={
                  styles.categoryTitle
                }
              >
                {selectedCategory.name}
              </h1>

              <div
                style={
                  styles.categoryCount
                }
              >
                {categoryProducts.length} sản
                phẩm
              </div>
            </div>
          </section>

          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}

          {message && (
            <div
              style={
                styles.successBox
              }
            >
              {message}
            </div>
          )}

          {/* PRODUCTS */}

          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.sectionTitle}>
                SẢN PHẨM
              </div>

              <div
                style={
                  styles.sectionSubtitle
                }
              >
                Chọn sản phẩm bạn muốn mua
              </div>
            </div>
          </div>

          {categoryProducts.length ===
          0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                📦
              </div>

              <div>
                Thư mục này chưa có sản
                phẩm.
              </div>
            </div>
          ) : (
            <div style={styles.productGrid}>
              {categoryProducts.map(
                (product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onBuy={() =>
                      handleBuyClick(
                        product
                      )
                    }
                  />
                )
              )}
            </div>
          )}

          {/* DEPOSIT */}

          <button
            onClick={() =>
              router.push("/deposit")
            }
            style={
              styles.depositButton
            }
          >
            💰 NẠP TIỀN
          </button>
        </div>

        {selectedProduct && (
          <BuyModal
            product={selectedProduct}
            buying={buying}
            balance={
              wallet?.balance || 0
            }
            onClose={() =>
              setSelectedProduct(null)
            }
            onConfirm={confirmBuy}
          />
        )}

        {successKey && (
          <SuccessModal
            result={successKey}
            onClose={() =>
              setSuccessKey(null)
            }
          />
        )}
      </main>
    );
  }

  /*
   * ============================
   * TRANG THƯ MỤC MẸ
   * ============================
   */

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        {/* HEADER */}

        <div style={styles.header}>
          <div>
            <div style={styles.brand}>
              XENOVA PLAY
            </div>

            <h1 style={styles.title}>
              CỬA HÀNG
            </h1>

            <div style={styles.subtitle}>
              Chọn danh mục sản phẩm
            </div>
          </div>

          <div style={styles.headerRight}>
            {user ? (
              <>
                <div
                  style={
                    styles.walletBox
                  }
                >
                  <span
                    style={
                      styles.walletLabel
                    }
                  >
                    SỐ DƯ
                  </span>

                  <strong>
                    {formatMoney(
                      wallet?.balance ||
                        0
                    )}
                    đ
                  </strong>
                </div>

                <button
                  onClick={() =>
                    router.push(
                      "/deposit"
                    )
                  }
                  style={
                    styles.depositSmall
                  }
                >
                  + NẠP
                </button>
              </>
            ) : (
              <button
                onClick={() =>
                  router.push("/login")
                }
                style={
                  styles.loginButton
                }
              >
                ĐĂNG NHẬP
              </button>
            )}
          </div>
        </div>

        {error && (
          <div style={styles.errorBox}>
            {error}

            <button
              onClick={loadShop}
              style={styles.retryButton}
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
          />
        )}

        {/* CATEGORY LIST */}

        <div style={styles.sectionHeader}>
          <div>
            <div style={styles.sectionTitle}>
              DANH MỤC
            </div>

            <div
              style={
                styles.sectionSubtitle
              }
            >
              Chọn thư mục để xem sản phẩm
            </div>
          </div>
        </div>

        {categories.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>
              📁
            </div>

            <div>
              Hiện chưa có thư mục sản
              phẩm.
            </div>
          </div>
        ) : (
          <div style={styles.categoryGrid}>
            {categories.map(
              (category) => {
                const count =
                  getAvailableCount(
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
                    style={
                      styles.categoryCard
                    }
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
                          styles.imageDark
                        }
                      />
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
                        style={
                          styles.categoryMeta
                        }
                      >
                        <span>
                          {count} sản phẩm
                        </span>

                        <span
                          style={
                            styles.viewAll
                          }
                        >
                          XEM TẤT CẢ →
                        </span>
                      </div>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        )}

        <div style={styles.footer}>
          © 2026 XENOVA PLAY
        </div>
      </div>
    </main>
  );
}

/*
 * ============================
 * PRODUCT CARD
 * ============================
 */

function ProductCard({
  product,
  onBuy,
}) {
  return (
    <div style={styles.productCard}>
      <div style={styles.productImageBox}>
        {product.demo_image_url ? (
          <img
            src={product.demo_image_url}
            alt={product.name}
            style={styles.productImage}
          />
        ) : (
          <div
            style={
              styles.productNoImage
            }
          >
            🔑
          </div>
        )}
      </div>

      <div style={styles.productBody}>
        <div
          style={
            styles.productName
          }
        >
          {product.name}
        </div>

        {product.description && (
          <div
            style={
              styles.productDescription
            }
          >
            {product.description}
          </div>
        )}

        <div
          style={
            styles.productInfo
          }
        >
          <div>
            <span
              style={
                styles.productInfoLabel
              }
            >
              GIÁ
            </span>

            <strong
              style={
                styles.productPrice
              }
            >
              {Number(
                product.price || 0
              ).toLocaleString(
                "vi-VN"
              )}
              đ
            </strong>
          </div>

          <div>
            <span
              style={
                styles.productInfoLabel
              }
            >
              HẠN
            </span>

            <strong>
              {product.duration_days} ngày
            </strong>
          </div>
        </div>

        <button
          onClick={onBuy}
          style={styles.buyButton}
        >
          🛒 MUA NGAY
        </button>
      </div>
    </div>
  );
}

/*
 * ============================
 * BUY MODAL
 * ============================
 */

function BuyModal({
  product,
  buying,
  balance,
  onClose,
  onConfirm,
}) {
  const price = Number(
    product.price || 0
  );

  const enough =
    Number(balance || 0) >= price;

  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div>
            <div
              style={
                styles.modalSmall
              }
            >
              XENOVA PLAY
            </div>

            <div
              style={
                styles.modalTitle
              }
            >
              XÁC NHẬN MUA
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={buying}
            style={
              styles.closeButton
            }
          >
            ×
          </button>
        </div>

        {product.demo_image_url && (
          <img
            src={
              product.demo_image_url
            }
            alt={product.name}
            style={
              styles.modalImage
            }
          />
        )}

        <div
          style={
            styles.confirmProduct
          }
        >
          <div
            style={
              styles.confirmName
            }
          >
            {product.name}
          </div>

          <div
            style={
              styles.confirmRow
            }
          >
            <span>Thời hạn</span>
            <strong>
              {product.duration_days} ngày
            </strong>
          </div>

          <div
            style={
              styles.confirmRow
            }
          >
            <span>Giá</span>
            <strong
              style={
                styles.confirmPrice
              }
            >
              {price.toLocaleString(
                "vi-VN"
              )}
              đ
            </strong>
          </div>

          <div
            style={
              styles.confirmRow
            }
          >
            <span>Số dư hiện tại</span>
            <strong>
              {Number(
                balance || 0
              ).toLocaleString(
                "vi-VN"
              )}
              đ
            </strong>
          </div>
        </div>

        {!enough && (
          <div
            style={
              styles.warningBox
            }
          >
            Số dư không đủ để mua sản
            phẩm này.
          </div>
        )}

        <div
          style={
            styles.modalActions
          }
        >
          <button
            onClick={onClose}
            disabled={buying}
            style={
              styles.cancelButton
            }
          >
            HỦY
          </button>

          <button
            onClick={onConfirm}
            disabled={
              buying || !enough
            }
            style={{
              ...styles.confirmButton,
              opacity:
                buying || !enough
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

/*
 * ============================
 * SUCCESS MODAL
 * ============================
 */

function SuccessModal({
  result,
  onClose,
}) {
  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.successModal}>
        <div
          style={
            styles.successIcon
          }
        >
          ✓
        </div>

        <div
          style={
            styles.successTitle
          }
        >
          MUA KEY THÀNH CÔNG
        </div>

        <div
          style={
            styles.successProduct
          }
        >
          {result.product_name}
        </div>

        <div
          style={
            styles.keyBox
          }
        >
          <div
            style={
              styles.keyLabel
            }
          >
            KEY CỦA BẠN
          </div>

          <div
            style={
              styles.keyCode
            }
          >
            {result.key_code}
          </div>
        </div>

        <div
          style={
            styles.successInfo
          }
        >
          Thời hạn:{" "}
          <strong>
            {result.duration_days} ngày
          </strong>
        </div>

        <button
          onClick={onClose}
          style={
            styles.confirmButton
          }
        >
          ĐÃ NHẬN KEY
        </button>
      </div>
    </div>
  );
}

const styles = {
  loadingPage: {
    minHeight: "100vh",
    background: "#070707",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily:
      "Arial, sans-serif",
    padding: "20px",
  },

  spinner: {
    width: "45px",
    height: "45px",
    borderRadius: "50%",
    border: "4px solid #222",
    borderTop:
      "4px solid #ff3030",
    animation:
      "xenovaShopSpin 0.8s linear infinite",
    marginBottom: "20px",
  },

  loadingTitle: {
    fontSize: "18px",
    fontWeight: "900",
  },

  loadingText: {
    color: "#666",
    marginTop: "8px",
  },

  page: {
    minHeight: "100vh",
    background: "#070707",
    color: "#fff",
    padding:
      "85px 15px 50px",
    fontFamily:
      "Arial, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "1050px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    marginBottom: "28px",
  },

  brand: {
    color: "#ff3333",
    fontSize: "12px",
    fontWeight: "900",
    letterSpacing: "4px",
  },

  title: {
    margin:
      "7px 0 5px",
    fontSize: "32px",
    fontWeight: "900",
  },

  subtitle: {
    color: "#777",
    fontSize: "14px",
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  walletBox: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    padding:
      "9px 13px",
    background: "#111",
    border:
      "1px solid #292929",
    borderRadius: "10px",
    fontSize: "14px",
  },

  walletLabel: {
    color: "#666",
    fontSize: "9px",
    fontWeight: "900",
  },

  depositSmall: {
    border: "none",
    background: "#ff3030",
    color: "#fff",
    padding:
      "12px 14px",
    borderRadius: "9px",
    fontWeight: "900",
    cursor: "pointer",
  },

  loginButton: {
    border:
      "1px solid #333",
    background: "#171717",
    color: "#fff",
    padding:
      "12px 16px",
    borderRadius: "9px",
    fontWeight: "900",
    cursor: "pointer",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginBottom: "15px",
  },

  sectionTitle: {
    fontSize: "18px",
    fontWeight: "900",
  },

  sectionSubtitle: {
    color: "#666",
    fontSize: "13px",
    marginTop: "4px",
  },

  categoryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(280px,1fr))",
    gap: "16px",
  },

  categoryCard: {
    padding: 0,
    width: "100%",
    border:
      "1px solid #252525",
    borderRadius: "16px",
    overflow: "hidden",
    background: "#101010",
    color: "#fff",
    cursor: "pointer",
    textAlign: "left",
  },

  categoryImageBox: {
    position: "relative",
    width: "100%",
    height: "190px",
    background: "#090909",
    overflow: "hidden",
  },

  categoryImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    transition:
      "transform .25s ease",
  },

  imageDark: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(transparent 25%,rgba(0,0,0,.85))",
  },

  categoryNoImage: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "55px",
  },

  categoryContent: {
    padding: "17px",
  },

  categoryName: {
    fontSize: "20px",
    fontWeight: "900",
  },

  categoryMeta: {
    marginTop: "10px",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    color: "#777",
    fontSize: "12px",
  },

  viewAll: {
    color: "#ff4040",
    fontWeight: "900",
  },

  categoryHero: {
    position: "relative",
    width: "100%",
    height: "250px",
    overflow: "hidden",
    borderRadius: "16px",
    border:
      "1px solid #252525",
    background: "#101010",
    marginBottom: "25px",
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
    fontSize: "70px",
  },

  heroOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    padding: "25px",
    background:
      "linear-gradient(transparent 25%,rgba(0,0,0,.9))",
  },

  categorySmall: {
    color: "#ff3838",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "3px",
  },

  categoryTitle: {
    margin:
      "5px 0 3px",
    fontSize: "30px",
    fontWeight: "900",
  },

  categoryCount: {
    color: "#aaa",
    fontSize: "13px",
  },

  topBar: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: "20px",
    gap: "10px",
  },

  backButton: {
    border:
      "1px solid #333",
    background: "#151515",
    color: "#fff",
    padding:
      "11px 15px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "800",
  },

  productGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(270px,1fr))",
    gap: "16px",
  },

  productCard: {
    background: "#101010",
    border:
      "1px solid #252525",
    borderRadius: "15px",
    overflow: "hidden",
  },

  productImageBox: {
    width: "100%",
    height: "175px",
    background: "#090909",
    overflow: "hidden",
  },

  productImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  productNoImage: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "55px",
  },

  productBody: {
    padding: "17px",
  },

  productName: {
    fontSize: "19px",
    fontWeight: "900",
  },

  productDescription: {
    color: "#777",
    fontSize: "12px",
    lineHeight: "1.5",
    marginTop: "7px",
    minHeight: "18px",
  },

  productInfo: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "10px",
    padding: "12px",
    background: "#090909",
    borderRadius: "9px",
    marginTop: "14px",
  },

  productInfoLabel: {
    display: "block",
    color: "#555",
    fontSize: "9px",
    fontWeight: "900",
    marginBottom: "4px",
  },

  productPrice: {
    color: "#ff4141",
  },

  buyButton: {
    width: "100%",
    border: "none",
    background: "#ff3030",
    color: "#fff",
    padding: "13px",
    borderRadius: "9px",
    marginTop: "12px",
    cursor: "pointer",
    fontWeight: "900",
  },

  depositButton: {
    width: "100%",
    marginTop: "25px",
    border:
      "1px solid #3a3a3a",
    background: "#151515",
    color: "#fff",
    padding: "14px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "900",
  },

  errorBox: {
    padding: "13px",
    marginBottom: "18px",
    background: "#2a0d0d",
    border:
      "1px solid #652020",
    borderRadius: "10px",
    color: "#ff8888",
  },

  successBox: {
    padding: "13px",
    marginBottom: "18px",
    background: "#092518",
    border:
      "1px solid #185b34",
    borderRadius: "10px",
    color: "#63e996",
  },

  retryButton: {
    marginTop: "10px",
    border:
      "1px solid #633030",
    background: "#3b1515",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: "7px",
    cursor: "pointer",
  },

  empty: {
    padding: "55px 20px",
    background: "#101010",
    border:
      "1px solid #222",
    borderRadius: "15px",
    textAlign: "center",
    color: "#666",
  },

  emptyIcon: {
    fontSize: "40px",
    marginBottom: "10px",
  },

  footer: {
    textAlign: "center",
    color: "#444",
    fontSize: "11px",
    marginTop: "40px",
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 10000,
    background:
      "rgba(0,0,0,.78)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "15px",
  },

  modal: {
    width: "100%",
    maxWidth: "450px",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#111",
    border:
      "1px solid #303030",
    borderRadius: "16px",
    padding: "20px",
    boxSizing: "border-box",
  },

  modalHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },

  modalSmall: {
    color: "#ff3333",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "2px",
  },

  modalTitle: {
    fontSize: "20px",
    fontWeight: "900",
    marginTop: "4px",
  },

  closeButton: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    border:
      "1px solid #333",
    background: "#191919",
    color: "#fff",
    fontSize: "23px",
    cursor: "pointer",
  },

  modalImage: {
    width: "100%",
    maxHeight: "220px",
    objectFit: "cover",
    borderRadius: "11px",
    marginBottom: "15px",
  },

  confirmProduct: {
    background: "#090909",
    borderRadius: "10px",
    padding: "14px",
  },

  confirmName: {
    fontSize: "18px",
    fontWeight: "900",
    marginBottom: "12px",
  },

  confirmRow: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: "10px",
    padding:
      "8px 0",
    borderBottom:
      "1px solid #1c1c1c",
    color: "#888",
    fontSize: "13px",
  },

  confirmPrice: {
    color: "#ff4040",
  },

  warningBox: {
    marginTop: "12px",
    padding: "11px",
    background: "#2b1e08",
    border:
      "1px solid #654711",
    color: "#e6b95d",
    borderRadius: "8px",
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
    border:
      "1px solid #333",
    background: "#191919",
    color: "#fff",
    borderRadius: "9px",
    padding: "12px",
    cursor: "pointer",
    fontWeight: "900",
  },

  confirmButton: {
    border: "none",
    background: "#ff3030",
    color: "#fff",
    borderRadius: "9px",
    padding: "12px",
    cursor: "pointer",
    fontWeight: "900",
  },

  successModal: {
    width: "100%",
    maxWidth: "420px",
    background: "#111",
    border:
      "1px solid #303030",
    borderRadius: "16px",
    padding: "25px",
    textAlign: "center",
    boxSizing: "border-box",
  },

  successIcon: {
    width: "65px",
    height: "65px",
    margin:
      "0 auto 15px",
    borderRadius: "50%",
    background: "#0c5b2e",
    color: "#57f18b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "35px",
    fontWeight: "900",
  },

  successTitle: {
    fontSize: "21px",
    fontWeight: "900",
  },

  successProduct: {
    color: "#888",
    marginTop: "6px",
  },

  keyBox: {
    margin:
      "20px 0 15px",
    padding: "17px",
    background: "#080808",
    border:
      "1px solid #292929",
    borderRadius: "10px",
  },

  keyLabel: {
    color: "#666",
    fontSize: "10px",
    fontWeight: "900",
    marginBottom: "8px",
  },

  keyCode: {
    color: "#ff4040",
    fontSize: "21px",
    fontWeight: "900",
    wordBreak: "break-all",
    letterSpacing: "1px",
  },

  successInfo: {
    color: "#888",
    fontSize: "13px",
    marginBottom: "15px",
  },
};

/*
 * Inject animation.
 */

if (
  typeof document !==
    "undefined" &&
  !document.getElementById(
    "xenova-shop-animation"
  )
) {
  const style =
    document.createElement(
      "style"
    );

  style.id =
    "xenova-shop-animation";

  style.textContent = `
    @keyframes xenovaShopSpin {
      from {
        transform: rotate(0deg);
      }

      to {
        transform: rotate(360deg);
      }
    }
  `;

  document.head.appendChild(style);
}
