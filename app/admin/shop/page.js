"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

const BUCKET = "shop-banners";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function AdminShopPage() {
  const fileInputs = useRef({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({});
  const [message, setMessage] = useState("");
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    loadSettings();
  }, []);

  async function getSessionToken() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      throw new Error("Không thể lấy phiên đăng nhập.");
    }

    if (!session?.access_token) {
      throw new Error(
        "Chưa nhận được phiên đăng nhập. Hãy đăng xuất rồi đăng nhập lại."
      );
    }

    return session.access_token;
  }

  async function loadSettings() {
    setLoading(true);
    setMessage("");

    try {
      const token = await getSessionToken();

      const response = await fetch("/api/admin/shop-settings", {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Không thể tải cài đặt Shop."
        );
      }

      const loaded = Array.isArray(result.settings?.banners)
        ? result.settings.banners
        : [];

      setBanners(
        loaded
          .map((banner, index) => ({
            id:
              banner?.id ||
              `banner-${Date.now()}-${index}`,
            image_url: String(banner?.image_url || ""),
            title: String(banner?.title || ""),
            enabled: banner?.enabled !== false,
            order: index,
          }))
          .sort(
            (a, b) =>
              Number(a.order) - Number(b.order)
          )
      );
    } catch (error) {
      console.error("ADMIN SHOP LOAD:", error);

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
        id:
          `banner-${Date.now()}-` +
          Math.random()
            .toString(36)
            .slice(2, 8),
        image_url: "",
        title: "",
        enabled: true,
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
        .filter(
          (banner) => banner.id !== id
        )
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

  async function uploadBannerFile(id, file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Chỉ được chọn file ảnh.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setMessage(
        "Ảnh quá lớn. Vui lòng chọn ảnh dưới 10MB."
      );
      return;
    }

    setUploading((current) => ({
      ...current,
      [id]: true,
    }));

    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Phiên đăng nhập không còn hợp lệ. Hãy đăng nhập lại."
        );
      }

      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() || "jpg";

      const fileName =
        `${Date.now()}-` +
        Math.random()
          .toString(36)
          .slice(2, 10) +
        `.${extension}`;

      const filePath =
        `${user.id}/${fileName}`;

      const { error: uploadError } =
        await supabase.storage
          .from(BUCKET)
          .upload(
            filePath,
            file,
            {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type,
            }
          );

      if (uploadError) {
        throw new Error(
          uploadError.message ||
            "Upload ảnh thất bại."
        );
      }

      const {
        data: publicData,
      } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filePath);

      const publicUrl =
        publicData?.publicUrl || "";

      if (!publicUrl) {
        throw new Error(
          "Không lấy được URL ảnh sau khi upload."
        );
      }

      updateBanner(
        id,
        "image_url",
        publicUrl
      );

      setMessage(
        "✓ Upload ảnh thành công. Nhớ bấm LƯU."
      );
    } catch (error) {
      console.error(
        "BANNER UPLOAD ERROR:",
        error
      );

      setMessage(
        error?.message ||
          "Không thể upload banner."
      );
    } finally {
      setUploading((current) => ({
        ...current,
        [id]: false,
      }));
    }
  }

  async function saveSettings() {
    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const token =
        await getSessionToken();

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
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            banners:
              cleanBanners,
          }),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Không thể lưu cài đặt."
        );
      }

      setBanners(cleanBanners);

      setMessage(
        "✓ Đã lưu banner thành công."
      );
    } catch (error) {
      console.error(
        "ADMIN SHOP SAVE:",
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

  return (
    <main style={styles.page}>
      <div style={styles.glow} />

      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.logo}>
              XENOVA PLAY
            </div>

            <h1 style={styles.heading}>
              QUẢN LÝ BANNER SHOP
            </h1>

            <p style={styles.subheading}>
              Chọn ảnh trực tiếp từ thiết bị.
              Không cần nhập link ảnh.
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
            Đang tải banner...
          </div>
        ) : (
          <>
            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <div style={styles.tag}>
                    ADVERTISEMENT
                  </div>

                  <h2 style={styles.cardTitle}>
                    BANNER QUẢNG CÁO
                  </h2>

                  <p
                    style={
                      styles.cardDescription
                    }
                  >
                    Upload ảnh trực tiếp.
                    Banner trên Shop sẽ
                    tự động chuyển.
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
                  <div
                    style={
                      styles.emptyIcon
                    }
                  >
                    🖼️
                  </div>

                  <div>
                    Chưa có banner
                  </div>

                  <button
                    type="button"
                    onClick={addBanner}
                    style={
                      styles.emptyButton
                    }
                  >
                    ＋ THÊM BANNER ĐẦU TIÊN
                  </button>
                </div>
              ) : (
                <div style={styles.list}>
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
                            styles.bannerHeader
                          }
                        >
                          <strong>
                            BANNER #
                            {index + 1}
                          </strong>

                          <div
                            style={
                              styles.actions
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
                                styles.iconButton
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
                                banners.length -
                                  1
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
                              XÓA
                            </button>
                          </div>
                        </div>

                        <div
                          style={
                            styles.bannerContent
                          }
                        >
                          <div
                            style={
                              styles.uploadArea
                            }
                          >
                            <input
                              ref={(element) => {
                                fileInputs.current[
                                  banner.id
                                ] = element;
                              }}
                              type="file"
                              accept="image/*"
                              style={
                                styles.hiddenInput
                              }
                              onChange={(
                                event
                              ) => {
                                const file =
                                  event.target
                                    .files?.[0];

                                if (file) {
                                  uploadBannerFile(
                                    banner.id,
                                    file
                                  );
                                }

                                event.target.value =
                                  "";
                              }}
                            />

                            <button
                              type="button"
                              onClick={() =>
                                fileInputs.current[
                                  banner.id
                                ]?.click()
                              }
                              disabled={
                                uploading[
                                  banner.id
                                ]
                              }
                              style={
                                styles.uploadButton
                              }
                            >
                              {uploading[
                                banner.id
                              ]
                                ? "⏳ ĐANG UPLOAD..."
                                : "📁 CHỌN ẢNH TỪ THIẾT BỊ"}
                            </button>

                            <div
                              style={
                                styles.fileHint
                              }
                            >
                              JPG / PNG / WEBP
                              · tối đa 10MB
                            </div>

                            <div
                              style={
                                styles.titleLabel
                              }
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
                            </div>

                            <input
                              value={
                                banner.title
                              }
                              onChange={(
                                event
                              ) =>
                                updateBanner(
                                  banner.id,
                                  "title",
                                  event.target
                                    .value
                                )
                              }
                              placeholder="Banner XENOVA"
                              style={
                                styles.input
                              }
                            />
                          </div>

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
                                  "Banner"
                                }
                                style={
                                  styles.previewImage
                                }
                              />
                            ) : (
                              <div
                                style={
                                  styles.noImage
                                }
                              >
                                Chưa chọn ảnh
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>

            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <div style={styles.tag}>
                    LIVE PREVIEW
                  </div>

                  <h2 style={styles.cardTitle}>
                    XEM TRƯỚC SHOP
                  </h2>
                </div>
              </div>

              <div style={styles.shopPreview}>
                {banners.some(
                  (banner) =>
                    banner.enabled &&
                    banner.image_url
                ) ? (
                  <img
                    src={
                      banners.find(
                        (banner) =>
                          banner.enabled &&
                          banner.image_url
                      )?.image_url
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
            </section>

            <div style={styles.saveArea}>
              <button
                type="button"
                onClick={saveSettings}
                disabled={
                  saving ||
                  Object.values(
                    uploading
                  ).some(Boolean)
                }
                style={{
                  ...styles.saveButton,
                  opacity:
                    saving ? 0.6 : 1,
                }}
              >
                {saving
                  ? "ĐANG LƯU..."
                  : "💾 LƯU TẤT CẢ BANNER"}
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
  },

  glow: {
    position: "fixed",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background:
      "rgba(255,55,170,.08)",
    filter: "blur(100px)",
    top: "-220px",
    right: "-180px",
    pointerEvents: "none",
  },

  container: {
    maxWidth: "1150px",
    margin: "0 auto",
    position: "relative",
    zIndex: 1,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "25px",
    flexWrap: "wrap",
  },

  logo: {
    color: "#ff4db8",
    fontWeight: "900",
    fontSize: "13px",
    letterSpacing: "4px",
    marginBottom: "8px",
  },

  heading: {
    margin: 0,
    fontSize: "30px",
    fontWeight: "950",
  },

  subheading: {
    margin:
      "8px 0 0",
    color: "#92909c",
    fontSize: "13px",
  },

  headerActions: {
    display: "flex",
    gap: "10px",
  },

  backButton: {
    textDecoration: "none",
    color: "#fff",
    background: "#17151d",
    border:
      "1px solid #302b3b",
    borderRadius: "12px",
    padding:
      "12px 18px",
    fontWeight: "800",
  },

  shopButton: {
    textDecoration: "none",
    color: "#fff",
    background:
      "linear-gradient(135deg,#8b32ff,#ff319f)",
    borderRadius: "12px",
    padding:
      "12px 18px",
    fontWeight: "900",
  },

  message: {
    padding:
      "14px 16px",
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
    padding: "60px",
    textAlign: "center",
    background: "#111017",
    border:
      "1px solid #292531",
    borderRadius: "18px",
    color: "#aaa",
  },

  card: {
    background:
      "linear-gradient(145deg,rgba(20,18,27,.96),rgba(10,9,14,.96))",
    border:
      "1px solid rgba(255,255,255,.08)",
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "20px",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },

  tag: {
    color: "#ff4db8",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "2px",
    marginBottom: "7px",
  },

  cardTitle: {
    margin: 0,
    fontSize: "19px",
    fontWeight: "950",
  },

  cardDescription: {
    color: "#85818e",
    margin:
      "7px 0 0",
    fontSize: "13px",
  },

  addButton: {
    border: 0,
    background:
      "linear-gradient(135deg,#ff329f,#8c35ff)",
    color: "#fff",
    borderRadius: "11px",
    padding:
      "13px 17px",
    fontWeight: "900",
    cursor: "pointer",
  },

  empty: {
    textAlign: "center",
    border:
      "1px dashed #34303c",
    borderRadius: "15px",
    padding:
      "45px 20px",
    color: "#77737e",
  },

  emptyIcon: {
    fontSize: "40px",
    marginBottom: "10px",
  },

  emptyButton: {
    marginTop: "15px",
    border:
      "1px solid #413849",
    background: "#15121b",
    color: "#fff",
    padding:
      "11px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "800",
  },

  list: {
    display: "grid",
    gap: "15px",
  },

  bannerCard: {
    background: "#0b0a10",
    border:
      "1px solid #292531",
    borderRadius: "16px",
    overflow: "hidden",
  },

  bannerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    padding:
      "12px 14px",
    borderBottom:
      "1px solid #24212a",
    flexWrap: "wrap",
    color: "#ff4caf",
  },

  actions: {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap",
  },

  iconButton: {
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

  onButton: {
    height: "34px",
    border:
      "1px solid rgba(0,230,118,.3)",
    background:
      "rgba(0,230,118,.08)",
    color: "#49ff9a",
    borderRadius: "8px",
    padding:
      "0 10px",
    cursor: "pointer",
    fontWeight: "900",
    fontSize: "11px",
  },

  offButton: {
    height: "34px",
    border:
      "1px solid #3a3541",
    background: "#16131c",
    color: "#8a8591",
    borderRadius: "8px",
    padding:
      "0 10px",
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
    padding:
      "0 12px",
    cursor: "pointer",
    fontWeight: "900",
  },

  bannerContent: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1fr) minmax(280px,450px)",
    gap: "20px",
    padding: "20px",
  },

  uploadArea: {
    minWidth: 0,
  },

  hiddenInput: {
    display: "none",
  },

  uploadButton: {
    width: "100%",
    border:
      "1px dashed rgba(255,61,171,.5)",
    background:
      "rgba(255,61,171,.06)",
    color: "#ff65bd",
    borderRadius: "13px",
    padding:
      "22px 15px",
    cursor: "pointer",
    fontWeight: "950",
    fontSize: "14px",
  },

  fileHint: {
    color: "#66616e",
    fontSize: "11px",
    marginTop: "8px",
    marginBottom: "20px",
    textAlign: "center",
  },

  titleLabel: {
    color: "#aaa6b4",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "1px",
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
    padding:
      "13px 14px",
    outline: "none",
    fontSize: "14px",
  },

  previewBox: {
    minWidth: 0,
  },

  previewTitle: {
    fontSize: "10px",
    color: "#696572",
    fontWeight: "900",
    letterSpacing: "1px",
    marginBottom: "7px",
  },

  previewImage: {
    width: "100%",
    aspectRatio:
      "1200 / 320",
    objectFit: "cover",
    display: "block",
    borderRadius: "11px",
    border:
      "1px solid #2c2833",
    background: "#07070a",
  },

  noImage: {
    width: "100%",
    aspectRatio:
      "1200 / 320",
    border:
      "1px dashed #37323f",
    borderRadius: "11px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#68636f",
    background: "#08070b",
    fontSize: "12px",
  },

  shopPreview: {
    background: "#08070c",
    border:
      "1px solid #292431",
    borderRadius: "16px",
    padding: "15px",
  },

  previewShopBanner: {
    width: "100%",
    aspectRatio:
      "1200 / 320",
    objectFit: "cover",
    borderRadius: "13px",
    display: "block",
  },

  noBanner: {
    aspectRatio:
      "1200 / 320",
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
  },

  saveButton: {
    border: 0,
    background:
      "linear-gradient(135deg,#ff329f,#7d35ff)",
    color: "#fff",
    borderRadius: "14px",
    padding:
      "16px 30px",
    fontSize: "14px",
    fontWeight: "950",
    cursor: "pointer",
    boxShadow:
      "0 15px 45px rgba(174,40,255,.35)",
  },
};
