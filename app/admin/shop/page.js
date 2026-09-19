"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";

const BUCKET = "shop-banners";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getExtension(file) {
  const name = file?.name || "";
  const ext = name.split(".").pop()?.toLowerCase();

  if (["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext)) {
    return ext;
  }

  return "png";
}

function isImage(file) {
  return Boolean(file && file.type?.startsWith("image/"));
}

export default function AdminShopPage() {
  const bannerInputRef = useRef(null);
  const logoInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [logoUrl, setLogoUrl] = useState("");
  const [banners, setBanners] = useState([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/admin/shop-settings", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error || "Không thể tải cài đặt SHOP."
        );
      }

      const settings = result.settings || {};

      setLogoUrl(String(settings.logo_url || ""));

      setBanners(
        Array.isArray(settings.banners)
          ? settings.banners.map((banner, index) => ({
              id:
                banner?.id ||
                `banner-${Date.now()}-${index}`,
              image_url: String(banner?.image_url || ""),
              enabled: banner?.enabled !== false,
              order:
                Number.isFinite(Number(banner?.order))
                  ? Number(banner.order)
                  : index,
            }))
          : []
      );
    } catch (err) {
      console.error(err);
      setError(err?.message || "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }

  function clearMessages() {
    setMessage("");
    setError("");
  }

  async function uploadImage(file, type = "banner") {
    if (!file) return null;

    if (!isImage(file)) {
      throw new Error("Chỉ được chọn file hình ảnh.");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error("Ảnh không được vượt quá 10MB.");
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw new Error(userError.message);
    }

    if (!user) {
      throw new Error("Bạn chưa đăng nhập.");
    }

    const extension = getExtension(file);

    const prefix =
      type === "logo" ? "logo" : "banner";

    const fileName = `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}.${extension}`;

    /*
      Dùng trực tiếp thư mục user.id giống hệ thống banner
      hiện tại để không làm thay đổi policy Storage.
    */
    const path = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    if (!publicData?.publicUrl) {
      throw new Error("Không lấy được URL ảnh.");
    }

    return publicData.publicUrl;
  }

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    try {
      clearMessages();
      setUploadingLogo(true);

      const url = await uploadImage(file, "logo");

      setLogoUrl(url);

      setMessage(
        "Đã tải logo lên. Nhấn LƯU CẤU HÌNH để áp dụng."
      );
    } catch (err) {
      console.error(err);
      setError(err?.message || "Upload logo thất bại.");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleBannerUpload(event) {
    const files = Array.from(event.target.files || []);

    event.target.value = "";

    if (!files.length) return;

    try {
      clearMessages();
      setUploadingBanner(true);

      const uploaded = [];

      for (const file of files) {
        const url = await uploadImage(file, "banner");

        uploaded.push({
          id: `banner-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 10)}`,
          image_url: url,
          enabled: true,
          order: banners.length + uploaded.length,
        });
      }

      setBanners((current) => [
        ...current,
        ...uploaded,
      ]);

      setMessage(
        `Đã tải lên ${uploaded.length} banner. Nhấn LƯU CẤU HÌNH để áp dụng.`
      );
    } catch (err) {
      console.error(err);
      setError(err?.message || "Upload banner thất bại.");
    } finally {
      setUploadingBanner(false);
    }
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

  function deleteBanner(id) {
    setBanners((current) =>
      current
        .filter((banner) => banner.id !== id)
        .map((banner, index) => ({
          ...banner,
          order: index,
        }))
    );
  }

  function moveBanner(id, direction) {
    setBanners((current) => {
      const index = current.findIndex(
        (banner) => banner.id === id
      );

      if (index === -1) return current;

      const newIndex =
        direction === "up"
          ? index - 1
          : index + 1;

      if (
        newIndex < 0 ||
        newIndex >= current.length
      ) {
        return current;
      }

      const next = [...current];

      const temp = next[index];
      next[index] = next[newIndex];
      next[newIndex] = temp;

      return next.map((banner, itemIndex) => ({
        ...banner,
        order: itemIndex,
      }));
    });
  }

  async function saveSettings() {
    try {
      setSaving(true);
      clearMessages();

      const cleanBanners = banners
        .filter(
          (banner) =>
            banner &&
            typeof banner.image_url === "string" &&
            banner.image_url.trim()
        )
        .map((banner, index) => ({
          id: banner.id,
          image_url: banner.image_url.trim(),
          enabled: banner.enabled !== false,
          order: index,
        }));

      const response = await fetch(
        "/api/admin/shop-settings",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            logo_url: logoUrl.trim(),
            banners: cleanBanners,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error ||
            "Không thể lưu cài đặt SHOP."
        );
      }

      setLogoUrl(
        String(result?.settings?.logo_url || logoUrl || "")
      );

      setBanners(
        Array.isArray(result?.settings?.banners)
          ? result.settings.banners
          : cleanBanners
      );

      setMessage(
        "Đã lưu cấu hình SHOP thành công."
      );
    } catch (err) {
      console.error(err);
      setError(err?.message || "Lưu cấu hình thất bại.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          Đang tải quản lý SHOP...
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <div style={styles.badge}>
              XENOVA PLAY
            </div>

            <h1 style={styles.title}>
              QUẢN LÝ SHOP
            </h1>

            <p style={styles.subtitle}>
              Quản lý logo và banner hiển thị trên trang
              SHOP.
            </p>
          </div>

          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            style={{
              ...styles.saveButton,
              opacity: saving ? 0.65 : 1,
            }}
          >
            {saving
              ? "ĐANG LƯU..."
              : "💾 LƯU CẤU HÌNH"}
          </button>
        </div>

        {message && (
          <div style={styles.successMessage}>
            ✓ {message}
          </div>
        )}

        {error && (
          <div style={styles.errorMessage}>
            ⚠ {error}
          </div>
        )}

        {/* ================= LOGO ================= */}

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                LOGO SHOP
              </h2>

              <p style={styles.sectionDescription}>
                Logo này sẽ được sử dụng trên giao diện
                SHOP. Bạn có thể thay đổi bất cứ lúc nào.
              </p>
            </div>
          </div>

          <div style={styles.logoArea}>
            <div style={styles.logoPreview}>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="XENOVA PLAY Logo"
                  style={styles.logoImage}
                />
              ) : (
                <div style={styles.noLogo}>
                  <span>𝕏</span>
                  <small>
                    CHƯA CÓ LOGO
                  </small>
                </div>
              )}
            </div>

            <div style={styles.logoActions}>
              <button
                type="button"
                onClick={() =>
                  logoInputRef.current?.click()
                }
                disabled={uploadingLogo}
                style={styles.primaryButton}
              >
                {uploadingLogo
                  ? "ĐANG UPLOAD..."
                  : "🖼️ TẢI LOGO MỚI"}
              </button>

              {logoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoUrl("");
                    setMessage(
                      "Đã xóa logo khỏi cấu hình. Nhấn LƯU CẤU HÌNH để áp dụng."
                    );
                  }}
                  style={styles.deleteButton}
                >
                  🗑️ XÓA LOGO
                </button>
              )}

              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{ display: "none" }}
              />

              <div style={styles.hint}>
                JPG, PNG, WEBP, GIF hoặc AVIF · tối đa
                10MB
              </div>
            </div>
          </div>
        </section>

        {/* ================= BANNER ================= */}

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                BANNER QUẢNG CÁO
              </h2>

              <p style={styles.sectionDescription}>
                Thêm nhiều banner. Banner đang bật sẽ
                tự động chạy trên SHOP.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                bannerInputRef.current?.click()
              }
              disabled={uploadingBanner}
              style={styles.primaryButton}
            >
              {uploadingBanner
                ? "ĐANG UPLOAD..."
                : "＋ THÊM BANNER"}
            </button>

            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleBannerUpload}
              style={{ display: "none" }}
            />
          </div>

          {banners.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                🖼️
              </div>

              <strong>
                Chưa có banner
              </strong>

              <span>
                Nhấn “THÊM BANNER” để tải ảnh quảng cáo
                lên.
              </span>
            </div>
          ) : (
            <div style={styles.bannerList}>
              {banners.map((banner, index) => (
                <div
                  key={banner.id || index}
                  style={{
                    ...styles.bannerItem,
                    opacity:
                      banner.enabled === false
                        ? 0.55
                        : 1,
                  }}
                >
                  <div style={styles.bannerNumber}>
                    {index + 1}
                  </div>

                  <div style={styles.bannerPreview}>
                    {banner.image_url ? (
                      <img
                        src={banner.image_url}
                        alt={`Banner ${index + 1}`}
                        style={styles.bannerImage}
                      />
                    ) : (
                      <div style={styles.invalidImage}>
                        Không có ảnh
                      </div>
                    )}
                  </div>

                  <div style={styles.bannerInfo}>
                    <strong>
                      BANNER {index + 1}
                    </strong>

                    <span
                      style={{
                        ...styles.status,
                        background:
                          banner.enabled === false
                            ? "#3a3a3a"
                            : "#163d29",
                        color:
                          banner.enabled === false
                            ? "#aaa"
                            : "#66e09b",
                      }}
                    >
                      {banner.enabled === false
                        ? "ĐANG TẮT"
                        : "ĐANG BẬT"}
                    </span>
                  </div>

                  <div style={styles.bannerControls}>
                    <button
                      type="button"
                      onClick={() =>
                        moveBanner(
                          banner.id,
                          "up"
                        )
                      }
                      disabled={index === 0}
                      style={{
                        ...styles.smallButton,
                        opacity:
                          index === 0 ? 0.35 : 1,
                      }}
                      title="Đưa lên"
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        moveBanner(
                          banner.id,
                          "down"
                        )
                      }
                      disabled={
                        index ===
                        banners.length - 1
                      }
                      style={{
                        ...styles.smallButton,
                        opacity:
                          index ===
                          banners.length - 1
                            ? 0.35
                            : 1,
                      }}
                      title="Đưa xuống"
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
                        banner.enabled === false
                          ? styles.enableButton
                          : styles.disableButton
                      }
                    >
                      {banner.enabled === false
                        ? "BẬT"
                        : "TẮT"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteBanner(
                          banner.id
                        )
                      }
                      style={styles.deleteButton}
                    >
                      XÓA
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={styles.bottomHint}>
            💡 Banner được hiển thị theo thứ tự từ trên
            xuống. Chỉ banner <b>ĐANG BẬT</b> mới xuất
            hiện trên SHOP.
          </div>
        </section>

        {/* ================= PREVIEW ================= */}

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                XEM TRƯỚC
              </h2>

              <p style={styles.sectionDescription}>
                Kiểm tra nhanh logo và banner trước khi
                lưu.
              </p>
            </div>
          </div>

          <div style={styles.previewShop}>
            <div style={styles.previewTop}>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  style={styles.previewLogo}
                />
              ) : (
                <div style={styles.previewLogoText}>
                  XENOVA
                  <small>PLAY</small>
                </div>
              )}
            </div>

            {banners.filter(
              (banner) =>
                banner.enabled !== false &&
                banner.image_url
            ).length > 0 ? (
              <div style={styles.previewBanner}>
                <img
                  src={
                    banners.find(
                      (banner) =>
                        banner.enabled !== false &&
                        banner.image_url
                    )?.image_url
                  }
                  alt="Banner preview"
                  style={styles.previewBannerImage}
                />
              </div>
            ) : (
              <div style={styles.previewEmpty}>
                Chưa có banner đang bật
              </div>
            )}
          </div>
        </section>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #08090d;
          color: #fff;
        }

        button {
          font-family: inherit;
        }
      `}</style>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #15172a 0%, #08090d 48%, #050507 100%)",
    padding: "30px 16px 80px",
  },

  container: {
    width: "100%",
    maxWidth: "1250px",
    margin: "0 auto",
  },

  loading: {
    minHeight: "80vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#aaa",
    fontSize: "15px",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },

  badge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "rgba(255,255,255,.07)",
    border: "1px solid rgba(255,255,255,.10)",
    color: "#aaa",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "1.5px",
    marginBottom: "8px",
  },

  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: 950,
    letterSpacing: "-1px",
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#858894",
    fontSize: "13px",
  },

  saveButton: {
    border: 0,
    borderRadius: "12px",
    padding: "13px 18px",
    background:
      "linear-gradient(135deg,#ffffff,#d9d9df)",
    color: "#08090d",
    fontWeight: 950,
    fontSize: "12px",
    cursor: "pointer",
  },

  successMessage: {
    marginBottom: "18px",
    padding: "13px 15px",
    borderRadius: "12px",
    background: "rgba(36,150,88,.12)",
    border: "1px solid rgba(70,200,120,.22)",
    color: "#78e2a5",
    fontSize: "13px",
  },

  errorMessage: {
    marginBottom: "18px",
    padding: "13px 15px",
    borderRadius: "12px",
    background: "rgba(220,50,70,.12)",
    border: "1px solid rgba(255,80,100,.22)",
    color: "#ff8a9b",
    fontSize: "13px",
  },

  card: {
    background:
      "linear-gradient(145deg,rgba(24,25,35,.96),rgba(13,14,20,.96))",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: "18px",
    padding: "20px",
    marginBottom: "18px",
    boxShadow:
      "0 20px 60px rgba(0,0,0,.25)",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "18px",
    flexWrap: "wrap",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 950,
    letterSpacing: ".5px",
  },

  sectionDescription: {
    margin: "6px 0 0",
    color: "#777b88",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  primaryButton: {
    border: 0,
    borderRadius: "10px",
    padding: "11px 14px",
    background: "#fff",
    color: "#08090d",
    fontSize: "11px",
    fontWeight: 950,
    cursor: "pointer",
  },

  logoArea: {
    display: "flex",
    gap: "22px",
    alignItems: "center",
    flexWrap: "wrap",
  },

  logoPreview: {
    width: "220px",
    height: "100px",
    borderRadius: "15px",
    border: "1px solid rgba(255,255,255,.10)",
    background:
      "linear-gradient(145deg,#11131b,#090a0e)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  logoImage: {
    maxWidth: "90%",
    maxHeight: "80%",
    objectFit: "contain",
  },

  noLogo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "5px",
    color: "#555965",
  },

  noLogoIcon: {},

  noLogo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
    color: "#555965",
  },

  logoActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "9px",
  },

  deleteButton: {
    border: "1px solid rgba(255,70,90,.20)",
    borderRadius: "9px",
    padding: "9px 12px",
    background: "rgba(255,60,80,.08)",
    color: "#ff7788",
    fontSize: "10px",
    fontWeight: 900,
    cursor: "pointer",
  },

  hint: {
    color: "#555966",
    fontSize: "10px",
  },

  empty: {
    minHeight: "180px",
    borderRadius: "14px",
    border:
      "1px dashed rgba(255,255,255,.10)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    color: "#707480",
    fontSize: "12px",
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: "28px",
    marginBottom: "3px",
  },

  bannerList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  bannerItem: {
    display: "grid",
    gridTemplateColumns:
      "38px minmax(220px,360px) 1fr auto",
    gap: "14px",
    alignItems: "center",
    padding: "12px",
    borderRadius: "14px",
    background:
      "rgba(255,255,255,.025)",
    border: "1px solid rgba(255,255,255,.07)",
    transition: "opacity .2s",
  },

  bannerNumber: {
    width: "32px",
    height: "32px",
    borderRadius: "9px",
    background: "rgba(255,255,255,.07)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 950,
    fontSize: "12px",
    color: "#aaa",
  },

  bannerPreview: {
    width: "100%",
    aspectRatio: "1200 / 320",
    borderRadius: "9px",
    overflow: "hidden",
    background: "#090a0e",
    border:
      "1px solid rgba(255,255,255,.07)",
  },

  bannerImage: {
    width: "100%",
    height: "100%",
    display: "block",
    objectFit: "cover",
  },

  invalidImage: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#666",
    fontSize: "11px",
  },

  bannerInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "7px",
    minWidth: 0,
  },

  status: {
    display: "inline-flex",
    padding: "5px 8px",
    borderRadius: "999px",
    fontSize: "9px",
    fontWeight: 900,
  },

  bannerControls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "6px",
    flexWrap: "wrap",
  },

  smallButton: {
    width: "32px",
    height: "32px",
    border: "1px solid rgba(255,255,255,.10)",
    borderRadius: "8px",
    background: "rgba(255,255,255,.05)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },

  enableButton: {
    border: "1px solid rgba(80,210,130,.20)",
    borderRadius: "8px",
    background: "rgba(70,200,120,.08)",
    color: "#6de29a",
    padding: "8px 10px",
    fontSize: "9px",
    fontWeight: 900,
    cursor: "pointer",
  },

  disableButton: {
    border: "1px solid rgba(255,190,70,.20)",
    borderRadius: "8px",
    background: "rgba(255,180,60,.08)",
    color: "#e8b66a",
    padding: "8px 10px",
    fontSize: "9px",
    fontWeight: 900,
    cursor: "pointer",
  },

  bottomHint: {
    marginTop: "15px",
    padding: "12px",
    borderRadius: "10px",
    background: "rgba(255,255,255,.025)",
    color: "#777b87",
    fontSize: "10px",
    lineHeight: 1.5,
  },

  previewShop: {
    borderRadius: "14px",
    overflow: "hidden",
    background: "#090a0f",
    border:
      "1px solid rgba(255,255,255,.08)",
  },

  previewTop: {
    height: "64px",
    padding: "0 18px",
    display: "flex",
    alignItems: "center",
    borderBottom:
      "1px solid rgba(255,255,255,.06)",
  },

  previewLogo: {
    maxWidth: "150px",
    maxHeight: "42px",
    objectFit: "contain",
  },

  previewLogoText: {
    fontSize: "17px",
    fontWeight: 950,
    letterSpacing: "1px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },

  previewBanner: {
    width: "100%",
    aspectRatio: "1200 / 320",
    overflow: "hidden",
  },

  previewBannerImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  previewEmpty: {
    minHeight: "160px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#555966",
    fontSize: "12px",
  },
};
