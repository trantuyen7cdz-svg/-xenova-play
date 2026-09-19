"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DEFAULT_SETTINGS = {
  logo_url: "",
  shop_badge: "XENOVA PLAY SHOP",
  shop_title: "Cửa hàng",
  shop_description: "Chọn danh mục để xem sản phẩm và mua KEY.",
  banners: [],
};

function createBanner() {
  return {
    id: `banner-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    image_url: "",
    title: "",
    enabled: true,
    order: 0,
  };
}

export default function AdminShopPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [logoUrl, setLogoUrl] = useState("");
  const [shopBadge, setShopBadge] = useState(
    DEFAULT_SETTINGS.shop_badge
  );
  const [shopTitle, setShopTitle] = useState(
    DEFAULT_SETTINGS.shop_title
  );
  const [shopDescription, setShopDescription] = useState(
    DEFAULT_SETTINGS.shop_description
  );

  const [banners, setBanners] = useState([]);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/shop-settings",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Không thể tải cài đặt Shop."
        );
      }

      const settings =
        result.settings || DEFAULT_SETTINGS;

      setLogoUrl(settings.logo_url || "");
      setShopBadge(
        settings.shop_badge ||
          DEFAULT_SETTINGS.shop_badge
      );
      setShopTitle(
        settings.shop_title ||
          DEFAULT_SETTINGS.shop_title
      );
      setShopDescription(
        settings.shop_description ||
          DEFAULT_SETTINGS.shop_description
      );

      const loadedBanners = Array.isArray(
        settings.banners
      )
        ? settings.banners
            .map((banner, index) => ({
              id:
                banner.id ||
                `banner-${Date.now()}-${index}`,
              image_url:
                banner.image_url || "",
              title:
                banner.title || "",
              enabled:
                banner.enabled !== false,
              order:
                Number.isFinite(
                  Number(banner.order)
                )
                  ? Number(banner.order)
                  : index,
            }))
            .sort(
              (a, b) =>
                Number(a.order) -
                Number(b.order)
            )
        : [];

      setBanners(loadedBanners);
    } catch (error) {
      console.error(error);
      setMessage(
        error.message ||
          "Không thể tải cài đặt Shop."
      );
    } finally {
      setLoading(false);
    }
  }

  function addBanner() {
    setBanners((current) => [
      ...current,
      {
        ...createBanner(),
        order: current.length,
      },
    ]);
  }

  function updateBanner(id, field, value) {
    setBanners((current) =>
      current.map((banner) =>
        banner.id === id
          ? {
              ...banner,
              [field]: value,
            }
          : banner
      )
    );
  }

  function deleteBanner(id) {
    if (
      !window.confirm(
        "Bạn có chắc muốn xóa banner này?"
      )
    ) {
      return;
    }

    setBanners((current) =>
      current
        .filter((banner) => banner.id !== id)
        .map((banner, index) => ({
          ...banner,
          order: index,
        }))
    );
  }

  function moveBanner(index, direction) {
    setBanners((current) => {
      const next = [...current];

      const target =
        direction === "up"
          ? index - 1
          : index + 1;

      if (
        target < 0 ||
        target >= next.length
      ) {
        return current;
      }

      const temp = next[index];

      next[index] = next[target];
      next[target] = temp;

      return next.map((banner, i) => ({
        ...banner,
        order: i,
      }));
    });
  }

  function toggleBanner(id) {
    setBanners((current) =>
      current.map((banner) =>
        banner.id === id
          ? {
              ...banner,
              enabled: !banner.enabled,
            }
          : banner
      )
    );
  }

  async function saveSettings() {
    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const cleanBanners = banners
        .map((banner, index) => ({
          id:
            banner.id ||
            `banner-${Date.now()}-${index}`,
          image_url: String(
            banner.image_url || ""
          ).trim(),
          title: String(
            banner.title || ""
          ).trim(),
          enabled:
            banner.enabled !== false,
          order: index,
        }))
        .filter(
          (banner) => banner.image_url
        );

      const response = await fetch(
        "/api/admin/shop-settings",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            logo_url: logoUrl.trim(),
            shop_badge:
              shopBadge.trim(),
            shop_title:
              shopTitle.trim(),
            shop_description:
              shopDescription.trim(),
            banners: cleanBanners,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Không thể lưu cài đặt."
        );
      }

      setBanners(cleanBanners);

      setMessage(
        "✓ Đã lưu cài đặt Shop thành công."
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Không thể lưu cài đặt."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.backgroundGlow} />

      <div style={styles.container}>
        {/* HEADER */}
        <header style={styles.header}>
          <div>
            <div style={styles.logo}>
              XENOVA PLAY
            </div>

            <h1 style={styles.heading}>
              CÀI ĐẶT SHOP
            </h1>

            <p style={styles.subheading}>
              Chỉnh logo, nội dung và banner
              hiển thị trên Shop.
            </p>
          </div>

          <div style={styles.headerActions}>
            <Link
              href="/admin"
              style={styles.backButton}
            >
              ← Admin
            </Link>

            <Link
              href="/shop"
              target="_blank"
              style={styles.shopButton}
            >
              Xem Shop ↗
            </Link>
          </div>
        </header>

        {message && (
          <div
            style={{
              ...styles.message,
              ...(message.startsWith("✓")
                ? styles.successMessage
                : styles.errorMessage),
            }}
          >
            {message}
          </div>
        )}

        {loading ? (
          <div style={styles.loading}>
            Đang tải cài đặt...
          </div>
        ) : (
          <>
            {/* THÔNG TIN SHOP */}
            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h2 style={styles.cardTitle}>
                    THÔNG TIN SHOP
                  </h2>

                  <p style={styles.cardDescription}>
                    Các nội dung này sẽ được
                    hiển thị ở đầu trang Shop.
                  </p>
                </div>
              </div>

              <div style={styles.formGrid}>
                <div style={styles.fieldFull}>
                  <label style={styles.label}>
                    LOGO SHOP
                  </label>

                  <input
                    value={logoUrl}
                    onChange={(e) =>
                      setLogoUrl(
                        e.target.value
                      )
                    }
                    placeholder="https://..."
                    style={styles.input}
                  />

                  <div style={styles.hint}>
                    Dán URL ảnh logo. Để trống
                    nếu muốn dùng logo mặc định.
                  </div>

                  {logoUrl && (
                    <div style={styles.logoPreview}>
                      <img
                        src={logoUrl}
                        alt="Logo preview"
                        style={
                          styles.logoPreviewImage
                        }
                        onError={(e) => {
                          e.currentTarget.style.display =
                            "none";
                        }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label style={styles.label}>
                    BADGE SHOP
                  </label>

                  <input
                    value={shopBadge}
                    onChange={(e) =>
                      setShopBadge(
                        e.target.value
                      )
                    }
                    placeholder="XENOVA PLAY SHOP"
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={styles.label}>
                    TIÊU ĐỀ
                  </label>

                  <input
                    value={shopTitle}
                    onChange={(e) =>
                      setShopTitle(
                        e.target.value
                      )
                    }
                    placeholder="Cửa hàng"
                    style={styles.input}
                  />
                </div>

                <div style={styles.fieldFull}>
                  <label style={styles.label}>
                    MÔ TẢ
                  </label>

                  <textarea
                    value={shopDescription}
                    onChange={(e) =>
                      setShopDescription(
                        e.target.value
                      )
                    }
                    placeholder="Chọn danh mục để xem sản phẩm và mua KEY."
                    style={styles.textareaSmall}
                  />
                </div>
              </div>
            </section>

            {/* BANNER */}
            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h2 style={styles.cardTitle}>
                    QUẢN LÝ BANNER
                  </h2>

                  <p style={styles.cardDescription}>
                    Banner chỉ hiển thị ảnh, không
                    cần link. Shop sẽ tự động
                    chuyển banner.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addBanner}
                  style={styles.addButton}
                >
                  ＋ Thêm banner
                </button>
              </div>

              {banners.length === 0 ? (
                <div style={styles.empty}>
                  <div style={styles.emptyIcon}>
                    🖼️
                  </div>

                  <div>
                    Chưa có banner.
                  </div>

                  <button
                    type="button"
                    onClick={addBanner}
                    style={styles.emptyButton}
                  >
                    Thêm banner đầu tiên
                  </button>
                </div>
              ) : (
                <div style={styles.bannerList}>
                  {banners.map(
                    (banner, index) => (
                      <div
                        key={banner.id}
                        style={{
                          ...styles.bannerCard,
                          opacity:
                            banner.enabled
                              ? 1
                              : 0.55,
                        }}
                      >
                        <div
                          style={
                            styles.bannerTop
                          }
                        >
                          <div
                            style={
                              styles.bannerNumber
                            }
                          >
                            #{index + 1}
                          </div>

                          <div
                            style={
                              styles.bannerActions
                            }
                          >
                            <button
                              type="button"
                              onClick={() =>
                                moveBanner(
                                  index,
                                  "up"
                                )
                              }
                              disabled={
                                index === 0
                              }
                              style={
                                styles.smallButton
                              }
                            >
                              ↑
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                moveBanner(
                                  index,
                                  "down"
                                )
                              }
                              disabled={
                                index ===
                                banners.length - 1
                              }
                              style={
                                styles.smallButton
                              }
                            >
                              ↓
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                toggleBanner(
                                  banner.id
                                )
                              }
                              style={
                                banner.enabled
                                  ? styles.enabledButton
                                  : styles.disabledButton
                              }
                            >
                              {banner.enabled
                                ? "ĐANG HIỆN"
                                : "ĐANG ẨN"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteBanner(
                                  banner.id
                                )
                              }
                              style={
                                styles.deleteButton
                              }
                            >
                              Xóa
                            </button>
                          </div>
                        </div>

                        <div
                          style={
                            styles.bannerBody
                          }
                        >
                          <div
                            style={
                              styles.bannerForm
                            }
                          >
                            <label
                              style={styles.label}
                            >
                              URL ẢNH BANNER
                            </label>

                            <input
                              value={
                                banner.image_url
                              }
                              onChange={(e) =>
                                updateBanner(
                                  banner.id,
                                  "image_url",
                                  e.target.value
                                )
                              }
                              placeholder="https://..."
                              style={styles.input}
                            />

                            <label
                              style={styles.label}
                            >
                              TÊN BANNER
                              <span
                                style={
                                  styles.optional
                                }
                              >
                                {" "}
                                (không bắt buộc)
                              </span>
                            </label>

                            <input
                              value={
                                banner.title
                              }
                              onChange={(e) =>
                                updateBanner(
                                  banner.id,
                                  "title",
                                  e.target.value
                                )
                              }
                              placeholder="Banner XENOVA"
                              style={styles.input}
                            />

                            <div
                              style={
                                styles.hint
                              }
                            >
                              Không cần nhập link
                              chuyển trang. Banner
                              chỉ là ảnh.
                            </div>
                          </div>

                          <div
                            style={
                              styles.previewWrapper
                            }
                          >
                            <div
                              style={
                                styles.previewLabel
                              }
                            >
                              PREVIEW
                            </div>

                            {banner.image_url ? (
                              <img
                                src={
                                  banner.image_url
                                }
                                alt={
                                  banner.title ||
                                  `Banner ${
                                    index + 1
                                  }`
                                }
                                style={
                                  styles.bannerPreview
                                }
                                onError={(e) => {
                                  e.currentTarget.style.display =
                                    "none";
                                  e.currentTarget.parentElement.querySelector(
                                    ".image-error"
                                  ).style.display =
                                    "flex";
                                }}
                              />
                            ) : null}

                            <div
                              className="image-error"
                              style={{
                                ...styles.imageError,
                                display:
                                  banner.image_url
                                    ? "none"
                                    : "flex",
                              }}
                            >
                              {banner.image_url
                                ? "Không tải được ảnh"
                                : "Chưa có ảnh"}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>

            {/* PREVIEW */}
            <section style={styles.card}>
              <h2 style={styles.cardTitle}>
                XEM TRƯỚC
              </h2>

              <div style={styles.shopPreview}>
                <div
                  style={styles.previewLogoArea}
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      style={
                        styles.previewLogo
                      }
                    />
                  ) : (
                    <div
                      style={
                        styles.previewTextLogo
                      }
                    >
                      XENOVA
                      <span> PLAY</span>
                    </div>
                  )}
                </div>

                <div
                  style={styles.previewBadge}
                >
                  {shopBadge ||
                    "XENOVA PLAY SHOP"}
                </div>

                <h3
                  style={
                    styles.previewShopTitle
                  }
                >
                  {shopTitle || "Cửa hàng"}
                </h3>

                <p
                  style={
                    styles.previewDescription
                  }
                >
                  {shopDescription ||
                    DEFAULT_SETTINGS.shop_description}
                </p>

                <div
                  style={
                    styles.previewBannerArea
                  }
                >
                  {banners.filter(
                    (banner) =>
                      banner.enabled &&
                      banner.image_url
                  ).length > 0 ? (
                    <img
                      src={
                        banners.filter(
                          (banner) =>
                            banner.enabled &&
                            banner.image_url
                        )[0].image_url
                      }
                      alt="Shop banner"
                      style={
                        styles.previewShopBanner
                      }
                    />
                  ) : (
                    <div
                      style={
                        styles.noBanner
                      }
                    >
                      Chưa có banner đang bật
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* SAVE */}
            <div style={styles.saveArea}>
              <button
                type="button"
                onClick={saveSettings}
                disabled={saving}
                style={{
                  ...styles.saveButton,
                  opacity: saving
                    ? 0.65
                    : 1,
                }}
              >
                {saving
                  ? "ĐANG LƯU..."
                  : "💾 LƯU TẤT CẢ CÀI ĐẶT"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #24102f 0%, #08070b 42%, #040407 100%)",
    color: "#fff",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    padding: "30px 18px 100px",
    position: "relative",
    overflow: "hidden",
  },

  backgroundGlow: {
    position: "fixed",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background:
      "rgba(255, 55, 170, 0.08)",
    filter: "blur(100px)",
    top: "-220px",
    right: "-180px",
    pointerEvents: "none",
  },

  container: {
    width: "100%",
    maxWidth: "1150px",
    margin: "0 auto",
    position: "relative",
    zIndex: 1,
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },

  logo: {
    fontSize: "13px",
    fontWeight: "900",
    letterSpacing: "4px",
    color: "#ff4db8",
    marginBottom: "8px",
  },

  heading: {
    margin: 0,
    fontSize: "32px",
    fontWeight: "950",
    letterSpacing: "1px",
  },

  subheading: {
    margin:
      "8px 0 0",
    color: "#9e9eab",
    fontSize: "14px",
  },

  headerActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  backButton: {
    textDecoration: "none",
    color: "#fff",
    background: "#17151d",
    border:
      "1px solid #302b3b",
    borderRadius: "12px",
    padding: "12px 18px",
    fontWeight: "800",
  },

  shopButton: {
    textDecoration: "none",
    color: "#fff",
    background:
      "linear-gradient(135deg,#8b32ff,#ff319f)",
    borderRadius: "12px",
    padding: "12px 18px",
    fontWeight: "900",
    boxShadow:
      "0 10px 30px rgba(255,49,159,.2)",
  },

  message: {
    padding: "14px 16px",
    borderRadius: "12px",
    marginBottom: "18px",
    fontWeight: "700",
  },

  successMessage: {
    background:
      "rgba(0,230,118,.1)",
    border:
      "1px solid rgba(0,230,118,.3)",
    color: "#5dffab",
  },

  errorMessage: {
    background:
      "rgba(255,23,68,.1)",
    border:
      "1px solid rgba(255,23,68,.3)",
    color: "#ff7188",
  },

  loading: {
    background: "#111017",
    border:
      "1px solid #292531",
    borderRadius: "18px",
    padding: "60px",
    textAlign: "center",
    color: "#aaa",
  },

  card: {
    background:
      "linear-gradient(145deg, rgba(20,18,27,.96), rgba(10,9,14,.96))",
    border:
      "1px solid rgba(255,255,255,.08)",
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow:
      "0 20px 60px rgba(0,0,0,.25)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "22px",
    flexWrap: "wrap",
  },

  cardTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "950",
  },

  cardDescription: {
    color: "#888592",
    margin:
      "7px 0 0",
    fontSize: "13px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: "18px",
  },

  fieldFull: {
    gridColumn: "1 / -1",
  },

  label: {
    display: "block",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "1px",
    color: "#aaa6b4",
    marginBottom: "8px",
  },

  optional: {
    color: "#65616d",
    fontWeight: "500",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "#0a090e",
    border:
      "1px solid #302c38",
    borderRadius: "11px",
    color: "#fff",
    padding: "13px 14px",
    outline: "none",
    fontSize: "14px",
  },

  textareaSmall: {
    width: "100%",
    minHeight: "90px",
    boxSizing: "border-box",
    resize: "vertical",
    background: "#0a090e",
    border:
      "1px solid #302c38",
    borderRadius: "11px",
    color: "#fff",
    padding: "13px 14px",
    outline: "none",
    fontSize: "14px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  hint: {
    color: "#696572",
    fontSize: "11px",
    marginTop: "7px",
  },

  logoPreview: {
    marginTop: "12px",
    background: "#08070b",
    border:
      "1px solid #28242f",
    borderRadius: "12px",
    padding: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "80px",
  },

  logoPreviewImage: {
    maxWidth: "220px",
    maxHeight: "90px",
    objectFit: "contain",
  },

  addButton: {
    border: 0,
    background:
      "linear-gradient(135deg,#ff329f,#8c35ff)",
    color: "#fff",
    borderRadius: "11px",
    padding: "12px 16px",
    fontWeight: "900",
    cursor: "pointer",
  },

  empty: {
    border:
      "1px dashed #34303c",
    borderRadius: "15px",
    padding: "45px 20px",
    textAlign: "center",
    color: "#77737e",
  },

  emptyIcon: {
    fontSize: "35px",
    marginBottom: "8px",
  },

  emptyButton: {
    marginTop: "15px",
    border:
      "1px solid #413849",
    background: "#15121b",
    color: "#fff",
    padding: "10px 15px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "800",
  },

  bannerList: {
    display: "grid",
    gap: "15px",
  },

  bannerCard: {
    background: "#0b0a10",
    border:
      "1px solid #292531",
    borderRadius: "16px",
    overflow: "hidden",
    transition:
      "opacity .2s ease",
  },

  bannerTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    padding: "12px 14px",
    borderBottom:
      "1px solid #24212a",
    flexWrap: "wrap",
  },

  bannerNumber: {
    fontWeight: "950",
    color: "#ff4caf",
  },

  bannerActions: {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap",
  },

  smallButton: {
    minWidth: "34px",
    height: "34px",
    border:
      "1px solid #38333f",
    background: "#16131c",
    color: "#fff",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "900",
  },

  enabledButton: {
    height: "34px",
    border:
      "1px solid rgba(0,230,118,.3)",
    background:
      "rgba(0,230,118,.08)",
    color: "#49ff9a",
    borderRadius: "8px",
    padding: "0 10px",
    cursor: "pointer",
    fontWeight: "900",
    fontSize: "11px",
  },

  disabledButton: {
    height: "34px",
    border:
      "1px solid #3a3541",
    background: "#16131c",
    color: "#8a8591",
    borderRadius: "8px",
    padding: "0 10px",
    cursor: "pointer",
    fontWeight: "900",
    fontSize: "11px",
  },

  deleteButton: {
    height: "34px",
    border:
      "1px solid rgba(255,23,68,.3)",
    background:
      "rgba(255,23,68,.08)",
    color: "#ff637e",
    borderRadius: "8px",
    padding: "0 12px",
    cursor: "pointer",
    fontWeight: "900",
  },

  bannerBody: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1fr) minmax(280px,430px)",
    gap: "18px",
    padding: "18px",
  },

  bannerForm: {
    minWidth: 0,
  },

  previewWrapper: {
    minWidth: 0,
  },

  previewLabel: {
    fontSize: "10px",
    color: "#696572",
    fontWeight: "900",
    letterSpacing: "1px",
    marginBottom: "7px",
  },

  bannerPreview: {
    width: "100%",
    aspectRatio: "1200 / 320",
    objectFit: "cover",
    display: "block",
    borderRadius: "11px",
    border:
      "1px solid #2c2833",
    background: "#07070a",
  },

  imageError: {
    width: "100%",
    aspectRatio: "1200 / 320",
    borderRadius: "11px",
    border:
      "1px dashed #37323f",
    alignItems: "center",
    justifyContent: "center",
    color: "#68636f",
    background: "#08070b",
    fontSize: "12px",
  },

  shopPreview: {
    background:
      "radial-gradient(circle at top,#29112e,#09080d 55%)",
    border:
      "1px solid #292431",
    borderRadius: "18px",
    padding: "30px",
    textAlign: "center",
    overflow: "hidden",
  },

  previewLogoArea: {
    minHeight: "65px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "12px",
  },

  previewLogo: {
    maxWidth: "230px",
    maxHeight: "70px",
    objectFit: "contain",
  },

  previewTextLogo: {
    fontSize: "27px",
    fontWeight: "950",
    letterSpacing: "2px",
  },

  previewTextLogoSpan: {},

  previewBadge: {
    display: "inline-block",
    padding: "7px 12px",
    borderRadius: "999px",
    background:
      "rgba(255,61,171,.1)",
    border:
      "1px solid rgba(255,61,171,.3)",
    color: "#ff65bd",
    fontSize: "11px",
    fontWeight: "900",
  },

  previewShopTitle: {
    margin:
      "14px 0 5px",
    fontSize: "25px",
    fontWeight: "950",
  },

  previewDescription: {
    color: "#8f8a97",
    fontSize: "13px",
    margin:
      "0 auto 20px",
    maxWidth: "650px",
  },

  previewBannerArea: {
    width: "100%",
    maxWidth: "900px",
    margin: "0 auto",
  },

  previewShopBanner: {
    width: "100%",
    aspectRatio: "1200 / 320",
    objectFit: "cover",
    borderRadius: "13px",
    display: "block",
  },

  noBanner: {
    aspectRatio: "1200 / 320",
    border:
      "1px dashed #37323f",
    borderRadius: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#68636f",
    fontSize: "12px",
  },

  saveArea: {
    position: "sticky",
    bottom: "15px",
    display: "flex",
    justifyContent: "center",
    zIndex: 20,
    pointerEvents: "none",
  },

  saveButton: {
    pointerEvents: "auto",
    border: 0,
    background:
      "linear-gradient(135deg,#ff329f,#7d35ff)",
    color: "#fff",
    borderRadius: "14px",
    padding: "15px 28px",
    fontSize: "14px",
    fontWeight: "950",
    cursor: "pointer",
    boxShadow:
      "0 15px 45px rgba(174,40,255,.35)",
  },
};
