"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

const DEFAULT_SETTINGS = {
  logo_url: "",
  shop_badge: "XENOVA PLAY SHOP",
  shop_title: "Cửa hàng",
  shop_description:
    "Chọn danh mục để xem sản phẩm và mua KEY.",
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
  const [shopDescription, setShopDescription] =
    useState(DEFAULT_SETTINGS.shop_description);

  const [banners, setBanners] = useState([]);

  useEffect(() => {
    loadSettings();
  }, []);

  async function getAccessToken() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      throw new Error(
        error.message ||
          "Không thể lấy phiên đăng nhập."
      );
    }

    if (!session?.access_token) {
      throw new Error(
        "Phiên đăng nhập không tồn tại. Hãy đăng nhập lại."
      );
    }

    return session.access_token;
  }

  async function loadSettings() {
    setLoading(true);
    setMessage("");

    try {
      const accessToken =
        await getAccessToken();

      const response = await fetch(
        "/api/admin/shop-settings",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
        }
      );

      const result =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Không thể tải cài đặt Shop."
        );
      }

      const settings =
        result.settings ||
        DEFAULT_SETTINGS;

      setLogoUrl(
        settings.logo_url || ""
      );

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

      const loadedBanners =
        Array.isArray(settings.banners)
          ? settings.banners
              .map((banner, index) => ({
                id:
                  banner?.id ||
                  `banner-${Date.now()}-${index}`,

                image_url:
                  banner?.image_url || "",

                title:
                  banner?.title || "",

                enabled:
                  banner?.enabled !== false,

                order:
                  Number.isFinite(
                    Number(banner?.order)
                  )
                    ? Number(banner.order)
                    : index,
              }))
              .sort(
                (a, b) =>
                  Number(a.order) -
                  Number(b.order)
              )
              .map((banner, index) => ({
                ...banner,
                order: index,
              }))
          : [];

      setBanners(loadedBanners);
    } catch (error) {
      console.error(
        "LOAD SHOP SETTINGS:",
        error
      );

      setMessage(
        error?.message ||
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

  function updateBanner(
    id,
    field,
    value
  ) {
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
    const confirmed =
      window.confirm(
        "Bạn có chắc muốn xóa banner này?"
      );

    if (!confirmed) return;

    setBanners((current) =>
      current
        .filter(
          (banner) =>
            banner.id !== id
        )
        .map((banner, index) => ({
          ...banner,
          order: index,
        }))
    );
  }

  function moveBanner(
    index,
    direction
  ) {
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

      return next.map(
        (banner, i) => ({
          ...banner,
          order: i,
        })
      );
    });
  }

  function toggleBanner(id) {
    setBanners((current) =>
      current.map((banner) =>
        banner.id === id
          ? {
              ...banner,
              enabled:
                !banner.enabled,
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
      const accessToken =
        await getAccessToken();

      const cleanBanners =
        banners
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
            (banner) =>
              banner.image_url
          );

      const response = await fetch(
        "/api/admin/shop-settings",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${accessToken}`,
          },

          body: JSON.stringify({
            logo_url:
              logoUrl.trim(),

            shop_badge:
              shopBadge.trim(),

            shop_title:
              shopTitle.trim(),

            shop_description:
              shopDescription.trim(),

            banners:
              cleanBanners,
          }),
        }
      );

      const result =
        await response.json();

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
      console.error(
        "SAVE SHOP SETTINGS:",
        error
      );

      setMessage(
        error?.message ||
          "Không thể lưu cài đặt."
      );
    } finally {
      setSaving(false);
    }
  }

  const enabledBanners =
    banners.filter(
      (banner) =>
        banner.enabled &&
        banner.image_url
    );

  return (
    <main style={styles.page}>
      <div style={styles.glowOne} />
      <div style={styles.glowTwo} />

      <div style={styles.container}>
        {/* HEADER */}
        <header style={styles.header}>
          <div>
            <div style={styles.brand}>
              XENOVA PLAY
            </div>

            <h1 style={styles.heading}>
              CÀI ĐẶT SHOP
            </h1>

            <p style={styles.subheading}>
              Quản lý logo, nội dung và
              banner của cửa hàng.
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

        {/* MESSAGE */}
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
            <div style={styles.loadingIcon}>
              ◌
            </div>

            Đang tải cài đặt Shop...
          </div>
        ) : (
          <>
            {/* SHOP INFORMATION */}
            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <div style={styles.sectionTag}>
                    SHOP SETTINGS
                  </div>

                  <h2 style={styles.cardTitle}>
                    THÔNG TIN SHOP
                  </h2>

                  <p style={styles.cardDescription}>
                    Thay đổi nội dung hiển thị
                    trên trang cửa hàng.
                  </p>
                </div>
              </div>

              <div style={styles.formGrid}>
                {/* LOGO */}
                <div style={styles.fieldFull}>
                  <label style={styles.label}>
                    LOGO SHOP
                  </label>

                  <input
                    type="text"
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
                    Nhập URL ảnh logo.
                    Không nhập gì nếu muốn
                    dùng logo mặc định.
                  </div>

                  {logoUrl && (
                    <div style={styles.logoPreview}>
                      <img
                        src={logoUrl}
                        alt="Logo"
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

                {/* BADGE */}
                <div>
                  <label style={styles.label}>
                    BADGE
                  </label>

                  <input
                    type="text"
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

                {/* TITLE */}
                <div>
                  <label style={styles.label}>
                    TIÊU ĐỀ SHOP
                  </label>

                  <input
                    type="text"
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

                {/* DESCRIPTION */}
                <div style={styles.fieldFull}>
                  <label style={styles.label}>
                    MÔ TẢ
                  </label>

                  <textarea
                    value={
                      shopDescription
                    }
                    onChange={(e) =>
                      setShopDescription(
                        e.target.value
                      )
                    }
                    placeholder="Chọn danh mục để xem sản phẩm và mua KEY."
                    style={styles.textarea}
                  />
                </div>
              </div>
            </section>

            {/* BANNERS */}
            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <div style={styles.sectionTag}>
                    ADVERTISEMENT
                  </div>

                  <h2 style={styles.cardTitle}>
                    QUẢN LÝ BANNER
                  </h2>

                  <p style={styles.cardDescription}>
                    Thêm nhiều banner. Shop sẽ
                    tự động chuyển banner.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addBanner}
                  style={styles.addButton}
                >
                  ＋ THÊM BANNER
                </button>
              </div>

              {banners.length === 0 ? (
                <div style={styles.empty}>
                  <div style={styles.emptyIcon}>
                    🖼️
                  </div>

                  <strong>
                    Chưa có banner
                  </strong>

                  <p>
                    Thêm banner để hiển thị
                    quảng cáo trên Shop.
                  </p>

                  <button
                    type="button"
                    onClick={addBanner}
                    style={styles.emptyButton}
                  >
                    ＋ Thêm banner
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
                        {/* BANNER HEADER */}
                        <div
                          style={
                            styles.bannerHeader
                          }
                        >
                          <div
                            style={
                              styles.bannerIndex
                            }
                          >
                            BANNER{" "}
                            {index + 1}
                          </div>

                          <div
                            style={
                              styles.bannerActions
                            }
                          >
                            <button
                              type="button"
                              disabled={
                                index === 0
                              }
                              onClick={() =>
                                moveBanner(
                                  index,
                                  "up"
                                )
                              }
                              style={
                                styles.iconButton
                              }
                            >
                              ↑
                            </button>

                            <button
                              type="button"
                              disabled={
                                index ===
                                banners.length -
                                  1
                              }
                              onClick={() =>
                                moveBanner(
                                  index,
                                  "down"
                                )
                              }
                              style={
                                styles.iconButton
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
                                  ? styles.onButton
                                  : styles.offButton
                              }
                            >
                              {banner.enabled
                                ? "● ĐANG HIỆN"
                                : "○ ĐANG ẨN"}
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
                              XÓA
                            </button>
                          </div>
                        </div>

                        {/* BANNER CONTENT */}
                        <div
                          style={
                            styles.bannerContent
                          }
                        >
                          <div
                            style={
                              styles.bannerInputs
                            }
                          >
                            <label
                              style={styles.label}
                            >
                              URL ẢNH
                            </label>

                            <input
                              type="text"
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
                              style={{
                                ...styles.label,
                                marginTop:
                                  "16px",
                              }}
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
                              type="text"
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
                              Banner chỉ hiển
                              thị ảnh, không có
                              link chuyển trang.
                            </div>
                          </div>

                          {/* PREVIEW */}
                          <div
                            style={
                              styles.previewBox
                            }
                          >
                            <div
                              style={
                                styles.previewTitle
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
                                  styles.bannerImage
                                }
                                onError={(e) => {
                                  e.currentTarget.style.display =
                                    "none";

                                  const errorBox =
                                    e.currentTarget
                                      .parentElement
                                      .querySelector(
                                        ".banner-image-error"
                                      );

                                  if (
                                    errorBox
                                  ) {
                                    errorBox.style.display =
                                      "flex";
                                  }
                                }}
                              />
                            ) : null}

                            <div
                              className="banner-image-error"
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
                                : "Chưa nhập URL ảnh"}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>

            {/* SHOP PREVIEW */}
            <section style={styles.card}>
              <div style={styles.sectionTag}>
                LIVE PREVIEW
              </div>

              <h2 style={styles.cardTitle}>
                XEM TRƯỚC SHOP
              </h2>

              <p
                style={{
                  ...styles.cardDescription,
                  marginBottom: "20px",
                }}
              >
                Đây là bản xem trước nội dung
                Shop.
              </p>

              <div style={styles.shopPreview}>
                {/* LOGO */}
                <div
                  style={
                    styles.previewLogoArea
                  }
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      style={
                        styles.previewLogo
                      }
                      onError={(e) => {
                        e.currentTarget.style.display =
                          "none";
                      }}
                    />
                  ) : (
                    <div
                      style={
                        styles.defaultLogo
                      }
                    >
                      XENOVA
                      <span> PLAY</span>
                    </div>
                  )}
                </div>

                {/* BADGE */}
                <div
                  style={
                    styles.previewBadge
                  }
                >
                  {shopBadge ||
                    "XENOVA PLAY SHOP"}
                </div>

                {/* TITLE */}
                <h3
                  style={
                    styles.previewShopTitle
                  }
                >
                  {shopTitle ||
                    "Cửa hàng"}
                </h3>

                {/* DESCRIPTION */}
                <p
                  style={
                    styles.previewDescription
                  }
                >
                  {shopDescription ||
                    DEFAULT_SETTINGS.shop_description}
                </p>

                {/* BANNER */}
                <div
                  style={
                    styles.previewBannerArea
                  }
                >
                  {enabledBanners.length >
                  0 ? (
                    <img
                      src={
                        enabledBanners[0]
                          .image_url
                      }
                      alt="Banner preview"
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
                    ? 0.6
                    : 1,

                  cursor: saving
                    ? "wait"
                    : "pointer",
                }}
              >
                {saving
                  ? "ĐANG LƯU..."
                  : "💾 LƯU TẤT CẢ"}
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
      "radial-gradient(circle at top,#24102f 0%,#08070b 42%,#040407 100%)",
    color: "#fff",
    fontFamily:
      "Arial,Helvetica,sans-serif",
    padding:
      "30px 18px 110px",
    position: "relative",
    overflow: "hidden",
  },

  glowOne: {
    position: "fixed",
    width: "450px",
    height: "450px",
    borderRadius: "50%",
    background:
      "rgba(255,45,170,.08)",
    filter: "blur(100px)",
    top: "-220px",
    right: "-150px",
    pointerEvents: "none",
  },

  glowTwo: {
    position: "fixed",
    width: "350px",
    height: "350px",
    borderRadius: "50%",
    background:
      "rgba(115,45,255,.07)",
    filter: "blur(100px)",
    bottom: "-150px",
    left: "-100px",
    pointerEvents: "none",
  },

  container: {
    maxWidth: "1150px",
    width: "100%",
    margin: "0 auto",
    position: "relative",
    zIndex: 1,
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "25px",
    flexWrap: "wrap",
  },

  brand: {
    color: "#ff4db7",
    fontSize: "12px",
    fontWeight: "900",
    letterSpacing: "4px",
    marginBottom: "7px",
  },

  heading: {
    margin: 0,
    fontSize: "32px",
    lineHeight: 1.1,
    fontWeight: "950",
    letterSpacing: "1px",
  },

  subheading: {
    margin:
      "9px 0 0",
    color: "#8f8b98",
    fontSize: "14px",
  },

  headerActions: {
    display: "flex",
    gap: "9px",
    flexWrap: "wrap",
  },

  backButton: {
    textDecoration: "none",
    color: "#fff",
    background: "#17141d",
    border:
      "1px solid #302b39",
    padding:
      "12px 17px",
    borderRadius: "11px",
    fontWeight: "800",
  },

  shopButton: {
    textDecoration: "none",
    color: "#fff",
    background:
      "linear-gradient(135deg,#8c32ff,#ff319f)",
    padding:
      "12px 17px",
    borderRadius: "11px",
    fontWeight: "900",
    boxShadow:
      "0 10px 30px rgba(255,49,159,.2)",
  },

  message: {
    borderRadius: "12px",
    padding: "14px 16px",
    marginBottom: "18px",
    fontSize: "14px",
    fontWeight: "700",
  },

  successMessage: {
    background:
      "rgba(0,230,118,.09)",
    border:
      "1px solid rgba(0,230,118,.28)",
    color: "#55ff9f",
  },

  errorMessage: {
    background:
      "rgba(255,40,80,.08)",
    border:
      "1px solid rgba(255,40,80,.25)",
    color: "#ff7188",
  },

  loading: {
    minHeight: "300px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: "12px",
    background:
      "rgba(15,13,20,.9)",
    border:
      "1px solid #292530",
    borderRadius: "18px",
    color: "#88838f",
  },

  loadingIcon: {
    fontSize: "34px",
    color: "#ff45ae",
  },

  card: {
    background:
      "linear-gradient(145deg,rgba(20,18,27,.97),rgba(9,8,13,.97))",
    border:
      "1px solid rgba(255,255,255,.075)",
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow:
      "0 20px 60px rgba(0,0,0,.22)",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: "20px",
    marginBottom: "22px",
    flexWrap: "wrap",
  },

  sectionTag: {
    color: "#ff4db7",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "2px",
    marginBottom: "7px",
  },

  cardTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "950",
  },

  cardDescription: {
    color: "#85818d",
    fontSize: "13px",
    margin:
      "7px 0 0",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: "18px",
  },

  fieldFull: {
    gridColumn:
      "1 / -1",
  },

  label: {
    display: "block",
    color: "#aaa6b2",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "1px",
    marginBottom: "8px",
  },

  optional: {
    color: "#66616e",
    fontWeight: "500",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border:
      "1px solid #302b37",
    background: "#09080d",
    color: "#fff",
    borderRadius: "10px",
    padding:
      "13px 14px",
    outline: "none",
    fontSize: "14px",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "90px",
    resize: "vertical",
    border:
      "1px solid #302b37",
    background: "#09080d",
    color: "#fff",
    borderRadius: "10px",
    padding:
      "13px 14px",
    outline: "none",
    fontSize: "14px",
    fontFamily:
      "Arial,Helvetica,sans-serif",
  },

  hint: {
    color: "#68636f",
    fontSize: "11px",
    marginTop: "7px",
    lineHeight: 1.5,
  },

  logoPreview: {
    marginTop: "12px",
    minHeight: "80px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "15px",
    background: "#07060a",
    border:
      "1px solid #292530",
    borderRadius: "11px",
  },

  logoPreviewImage: {
    maxWidth: "240px",
    maxHeight: "90px",
    objectFit: "contain",
  },

  addButton: {
    border: 0,
    color: "#fff",
    background:
      "linear-gradient(135deg,#ff329f,#8635ff)",
    borderRadius: "11px",
    padding:
      "12px 17px",
    fontWeight: "900",
    cursor: "pointer",
  },

  empty: {
    border:
      "1px dashed #35303c",
    borderRadius: "15px",
    textAlign: "center",
    padding:
      "45px 20px",
    color: "#77727f",
  },

  emptyIcon: {
    fontSize: "38px",
    marginBottom: "10px",
  },

  emptyButton: {
    marginTop: "12px",
    border:
      "1px solid #3b3544",
    background: "#15121b",
    color: "#fff",
    borderRadius: "10px",
    padding:
      "10px 15px",
    cursor: "pointer",
    fontWeight: "800",
  },

  bannerList: {
    display: "grid",
    gap: "15px",
  },

  bannerCard: {
    background: "#0a090e",
    border:
      "1px solid #292530",
    borderRadius: "15px",
    overflow: "hidden",
    transition:
      "opacity .2s ease",
  },

  bannerHeader: {
    minHeight: "58px",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: "12px",
    padding:
      "10px 13px",
    borderBottom:
      "1px solid #25212c",
    flexWrap: "wrap",
  },

  bannerIndex: {
    color: "#ff4db7",
    fontSize: "11px",
    fontWeight: "950",
    letterSpacing: "1px",
  },

  bannerActions: {
    display: "flex",
    gap: "7px",
    alignItems: "center",
    flexWrap: "wrap",
  },

  iconButton: {
    width: "34px",
    height: "34px",
    border:
      "1px solid #37313f",
    background: "#15121b",
    color: "#fff",
    borderRadius: "8px",
    fontWeight: "900",
    cursor: "pointer",
  },

  onButton: {
    height: "34px",
    border:
      "1px solid rgba(0,230,118,.3)",
    background:
      "rgba(0,230,118,.08)",
    color: "#4cff9b",
    borderRadius: "8px",
    padding:
      "0 11px",
    cursor: "pointer",
    fontWeight: "900",
    fontSize: "10px",
  },

  offButton: {
    height: "34px",
    border:
      "1px solid #38333f",
    background: "#15121b",
    color: "#85808c",
    borderRadius: "8px",
    padding:
      "0 11px",
    cursor: "pointer",
    fontWeight: "900",
    fontSize: "10px",
  },

  deleteButton: {
    height: "34px",
    border:
      "1px solid rgba(255,40,75,.3)",
    background:
      "rgba(255,40,75,.07)",
    color: "#ff637d",
    borderRadius: "8px",
    padding:
      "0 11px",
    cursor: "pointer",
    fontWeight: "900",
    fontSize: "10px",
  },

  bannerContent: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1fr) minmax(280px,450px)",
    gap: "18px",
    padding: "18px",
  },

  bannerInputs: {
    minWidth: 0,
  },

  previewBox: {
    minWidth: 0,
  },

  previewTitle: {
    color: "#66616e",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "1px",
    marginBottom: "7px",
  },

  bannerImage: {
    width: "100%",
    aspectRatio:
      "1200 / 320",
    objectFit: "cover",
    display: "block",
    borderRadius: "10px",
    border:
      "1px solid #2b2732",
    background: "#060509",
  },

  imageError: {
    width: "100%",
    aspectRatio:
      "1200 / 320",
    border:
      "1px dashed #37323f",
    borderRadius: "10px",
    alignItems: "center",
    justifyContent: "center",
    color: "#68636f",
    background: "#07060a",
    fontSize: "12px",
  },

  shopPreview: {
    background:
      "radial-gradient(circle at top,#29112e,#09080d 58%)",
    border:
      "1px solid #292530",
    borderRadius: "17px",
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
    maxWidth: "240px",
    maxHeight: "75px",
    objectFit: "contain",
  },

  defaultLogo: {
    fontSize: "27px",
    fontWeight: "950",
    letterSpacing: "2px",
  },

  previewBadge: {
    display: "inline-block",
    color: "#ff64bd",
    background:
      "rgba(255,61,171,.09)",
    border:
      "1px solid rgba(255,61,171,.3)",
    borderRadius: "999px",
    padding:
      "7px 12px",
    fontSize: "10px",
    fontWeight: "900",
  },

  previewShopTitle: {
    margin:
      "14px 0 5px",
    fontSize: "25px",
    fontWeight: "950",
  },

  previewDescription: {
    maxWidth: "700px",
    margin:
      "0 auto 20px",
    color: "#898490",
    fontSize: "13px",
  },

  previewBannerArea: {
    width: "100%",
    maxWidth: "900px",
    margin: "0 auto",
  },

  previewShopBanner: {
    width: "100%",
    aspectRatio:
      "1200 / 320",
    objectFit: "cover",
    borderRadius: "12px",
    display: "block",
  },

  noBanner: {
    width: "100%",
    aspectRatio:
      "1200 / 320",
    border:
      "1px dashed #37323f",
    borderRadius: "12px",
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
    zIndex: 30,
    pointerEvents: "none",
  },

  saveButton: {
    pointerEvents: "auto",
    border: 0,
    color: "#fff",
    background:
      "linear-gradient(135deg,#ff329f,#7736ff)",
    borderRadius: "14px",
    padding:
      "15px 30px",
    fontSize: "14px",
    fontWeight: "950",
    boxShadow:
      "0 15px 45px rgba(150,40,255,.3)",
  },
};
