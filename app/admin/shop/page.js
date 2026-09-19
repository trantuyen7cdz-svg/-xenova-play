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

function makeBanner() {
  return {
    id:
      Date.now().toString() +
      Math.random().toString(36).slice(2),
    image_url: "",
    title: "",
    enabled: true,
    order: 0,
  };
}

export default function AdminShopPage() {
  const [settings, setSettings] =
    useState(DEFAULT_SETTINGS);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");

      const response =
        await fetch(
          "/api/shop/settings",
          {
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ||
            "Không tải được cài đặt Shop."
        );
      }

      setSettings({
        ...DEFAULT_SETTINGS,
        ...(data.settings || {}),
        banners: Array.isArray(
          data.settings?.banners
        )
          ? data.settings.banners
          : [],
      });
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Không thể tải cài đặt."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateField(
    field,
    value
  ) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function addBanner() {
    setSettings((current) => ({
      ...current,
      banners: [
        ...(current.banners || []),
        {
          ...makeBanner(),
          order:
            current.banners?.length ||
            0,
        },
      ],
    }));
  }

  function updateBanner(
    index,
    field,
    value
  ) {
    setSettings((current) => {
      const banners = [
        ...(current.banners || []),
      ];

      banners[index] = {
        ...banners[index],
        [field]: value,
      };

      return {
        ...current,
        banners,
      };
    });
  }

  function removeBanner(index) {
    setSettings((current) => ({
      ...current,
      banners: current.banners
        .filter(
          (_, i) => i !== index
        )
        .map(
          (banner, i) => ({
            ...banner,
            order: i,
          })
        ),
    }));
  }

  function moveBanner(
    index,
    direction
  ) {
    setSettings((current) => {
      const banners = [
        ...(current.banners || []),
      ];

      const target =
        index + direction;

      if (
        target < 0 ||
        target >= banners.length
      ) {
        return current;
      }

      const temp =
        banners[index];

      banners[index] =
        banners[target];

      banners[target] = temp;

      return {
        ...current,
        banners:
          banners.map(
            (banner, i) => ({
              ...banner,
              order: i,
            })
          ),
      };
    });
  }

  async function saveSettings() {
    if (saving) return;

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const banners = (
        settings.banners || []
      )
        .filter(
          (banner) =>
            banner.image_url?.trim()
        )
        .map(
          (banner, index) => ({
            id:
              banner.id ||
              `${Date.now()}-${index}`,
            image_url:
              banner.image_url.trim(),
            title:
              banner.title || "",
            enabled:
              banner.enabled !== false,
            order: index,
          })
        );

      const payload = {
        logo_url:
          settings.logo_url?.trim() ||
          "",
        shop_badge:
          settings.shop_badge?.trim() ||
          "XENOVA PLAY SHOP",
        shop_title:
          settings.shop_title?.trim() ||
          "Cửa hàng",
        shop_description:
          settings.shop_description?.trim() ||
          "Chọn danh mục để xem sản phẩm và mua KEY.",
        banners,
      };

      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Phiên đăng nhập đã hết. Hãy đăng nhập lại."
        );
      }

      const response =
        await fetch(
          "/api/admin/shop-settings",
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ||
            "Không thể lưu cài đặt."
        );
      }

      setSettings({
        ...DEFAULT_SETTINGS,
        ...(data.settings || payload),
        banners:
          data.settings?.banners ||
          banners,
      });

      setMessage(
        "Đã lưu giao diện Shop thành công."
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Lưu thất bại."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          Đang tải...
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        <header style={styles.header}>
          <div>
            <div style={styles.logo}>
              XENOVA PLAY
            </div>

            <h1 style={styles.title}>
              GIAO DIỆN SHOP
            </h1>

            <p style={styles.subtitle}>
              Chỉnh logo, tiêu đề,
              mô tả và banner của
              cửa hàng.
            </p>
          </div>

          <Link
            href="/admin"
            style={styles.back}
          >
            ← ADMIN
          </Link>
        </header>

        <nav style={styles.nav}>
          <Link
            href="/admin"
            style={styles.navItem}
          >
            Tổng quan
          </Link>

          <Link
            href="/admin/products"
            style={styles.navItem}
          >
            Sản phẩm
          </Link>

          <Link
            href="/admin/keys"
            style={styles.navItem}
          >
            Kho KEY
          </Link>

          <Link
            href="/admin/orders"
            style={styles.navItem}
          >
            Đơn hàng
          </Link>

          <Link
            href="/admin/deposits"
            style={styles.navItem}
          >
            💰 Nạp tiền
          </Link>

          <Link
            href="/admin/users"
            style={styles.navItem}
          >
            Thành viên
          </Link>

          <Link
            href="/admin/shop"
            style={styles.navActive}
          >
            🎨 Giao diện Shop
          </Link>
        </nav>

        {message && (
          <div style={styles.success}>
            {message}
          </div>
        )}

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>
            THÔNG TIN SHOP
          </h2>

          <label style={styles.label}>
            Logo URL
          </label>

          <input
            value={
              settings.logo_url
            }
            onChange={(e) =>
              updateField(
                "logo_url",
                e.target.value
              )
            }
            placeholder="https://..."
            style={styles.input}
          />

          <div style={styles.logoPreview}>
            {settings.logo_url ? (
              <img
                src={
                  settings.logo_url
                }
                alt="Logo"
                style={
                  styles.logoPreviewImage
                }
              />
            ) : (
              <span>
                Chưa có logo
              </span>
            )}
          </div>

          <label style={styles.label}>
            Badge
          </label>

          <input
            value={
              settings.shop_badge
            }
            onChange={(e) =>
              updateField(
                "shop_badge",
                e.target.value
              )
            }
            style={styles.input}
          />

          <label style={styles.label}>
            Tiêu đề Shop
          </label>

          <input
            value={
              settings.shop_title
            }
            onChange={(e) =>
              updateField(
                "shop_title",
                e.target.value
              )
            }
            style={styles.input}
          />

          <label style={styles.label}>
            Mô tả
          </label>

          <textarea
            value={
              settings.shop_description
            }
            onChange={(e) =>
              updateField(
                "shop_description",
                e.target.value
              )
            }
            rows={4}
            style={styles.textarea}
          />
        </section>

        <section style={styles.card}>
          <div style={styles.bannerHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                BANNER QUẢNG CÁO
              </h2>

              <p style={styles.help}>
                Chỉ cần nhập URL ảnh.
                Banner không có link
                chuyển trang.
              </p>
            </div>

            <button
              onClick={addBanner}
              style={styles.addButton}
            >
              + THÊM BANNER
            </button>
          </div>

          {(settings.banners || [])
            .length === 0 ? (
            <div style={styles.empty}>
              Chưa có banner.
              <br />
              Bấm “+ THÊM BANNER”
              để tạo banner.
            </div>
          ) : (
            <div>
              {settings.banners.map(
                (banner, index) => (
                  <div
                    key={
                      banner.id ||
                      index
                    }
                    style={styles.bannerCard}
                  >
                    <div
                      style={
                        styles.bannerTop
                      }
                    >
                      <strong>
                        BANNER #
                        {index + 1}
                      </strong>

                      <div
                        style={
                          styles.bannerActions
                        }
                      >
                        <button
                          onClick={() =>
                            moveBanner(
                              index,
                              -1
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
                          onClick={() =>
                            moveBanner(
                              index,
                              1
                            )
                          }
                          disabled={
                            index ===
                            settings
                              .banners
                              .length -
                              1
                          }
                          style={
                            styles.smallButton
                          }
                        >
                          ↓
                        </button>

                        <button
                          onClick={() =>
                            updateBanner(
                              index,
                              "enabled",
                              !banner.enabled
                            )
                          }
                          style={{
                            ...styles.smallButton,
                            color:
                              banner.enabled
                                ? "#159957"
                                : "#999",
                          }}
                        >
                          {banner.enabled
                            ? "ĐANG HIỆN"
                            : "ĐANG ẨN"}
                        </button>

                        <button
                          onClick={() =>
                            removeBanner(
                              index
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

                    <label
                      style={
                        styles.label
                      }
                    >
                      URL ảnh
                    </label>

                    <input
                      value={
                        banner.image_url ||
                        ""
                      }
                      onChange={(e) =>
                        updateBanner(
                          index,
                          "image_url",
                          e.target.value
                        )
                      }
                      placeholder="https://..."
                      style={
                        styles.input
                      }
                    />

                    <label
                      style={
                        styles.label
                      }
                    >
                      Tên ghi chú
                    </label>

                    <input
                      value={
                        banner.title ||
                        ""
                      }
                      onChange={(e) =>
                        updateBanner(
                          index,
                          "title",
                          e.target.value
                        )
                      }
                      placeholder="Banner XENOVA"
                      style={
                        styles.input
                      }
                    />

                    {banner.image_url && (
                      <div
                        style={
                          styles.preview
                        }
                      >
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
                            styles.previewImage
                          }
                        />
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </section>

        <section style={styles.previewShop}>
          <div style={styles.previewBadge}>
            {settings.shop_badge}
          </div>

          <h2>
            {settings.shop_title}
          </h2>

          <p>
            {settings.shop_description}
          </p>

          {settings.banners
            ?.filter(
              (banner) =>
                banner.image_url &&
                banner.enabled !== false
            )
            .slice(0, 1)
            .map((banner) => (
              <img
                key={banner.id}
                src={
                  banner.image_url
                }
                alt="Preview"
                style={
                  styles.previewShopImage
                }
              />
            ))}
        </section>

        <button
          onClick={saveSettings}
          disabled={saving}
          style={styles.saveButton}
        >
          {saving
            ? "ĐANG LƯU..."
            : "💾 LƯU TẤT CẢ"}
        </button>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#090b12,#15101b)",
    color: "#fff",
    padding: "30px 15px 100px",
    fontFamily:
      "Arial,Helvetica,sans-serif",
  },

  container: {
    maxWidth: 1100,
    margin: "auto",
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: 20,
    marginBottom: 20,
  },

  logo: {
    color: "#ff4ba6",
    fontWeight: 900,
    letterSpacing: 2,
    fontSize: 13,
  },

  title: {
    margin: "5px 0",
    fontSize: 30,
  },

  subtitle: {
    margin: 0,
    color: "#999",
    fontSize: 13,
  },

  back: {
    textDecoration: "none",
    color: "#fff",
    background: "#242632",
    padding: "10px 14px",
    borderRadius: 10,
  },

  nav: {
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
    padding: 10,
    background: "#141720",
    border:
      "1px solid #292d38",
    borderRadius: 14,
    marginBottom: 18,
  },

  navItem: {
    color: "#aaa",
    textDecoration: "none",
    padding: "9px 12px",
    borderRadius: 8,
    fontSize: 12,
  },

  navActive: {
    color: "#fff",
    textDecoration: "none",
    padding: "9px 12px",
    borderRadius: 8,
    background:
      "linear-gradient(135deg,#e83d94,#8d54ff)",
    fontWeight: 800,
    fontSize: 12,
  },

  card: {
    background: "#141720",
    border:
      "1px solid #292d38",
    borderRadius: 16,
    padding: 20,
    marginBottom: 18,
  },

  sectionTitle: {
    margin: "0 0 16px",
    fontSize: 17,
  },

  label: {
    display: "block",
    margin:
      "14px 0 7px",
    color: "#aaa",
    fontSize: 12,
    fontWeight: 700,
  },

  input: {
    width: "100%",
    height: 43,
    border:
      "1px solid #303542",
    borderRadius: 9,
    background: "#0e1118",
    color: "#fff",
    padding: "0 12px",
    outline: "none",
  },

  textarea: {
    width: "100%",
    border:
      "1px solid #303542",
    borderRadius: 9,
    background: "#0e1118",
    color: "#fff",
    padding: 12,
    outline: "none",
    resize: "vertical",
  },

  logoPreview: {
    marginTop: 10,
    height: 90,
    borderRadius: 10,
    border:
      "1px dashed #383d4b",
    display: "grid",
    placeItems: "center",
    color: "#777",
    background: "#0d1016",
  },

  logoPreviewImage: {
    maxHeight: 70,
    maxWidth: "90%",
    objectFit: "contain",
  },

  bannerHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: 15,
  },

  help: {
    margin: 0,
    color: "#777",
    fontSize: 12,
  },

  addButton: {
    border: 0,
    borderRadius: 9,
    padding: "11px 14px",
    background: "#e83d94",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },

  bannerCard: {
    marginTop: 15,
    padding: 15,
    border:
      "1px solid #303542",
    borderRadius: 13,
    background: "#0f1219",
  },

  bannerTop: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: 10,
  },

  bannerActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },

  smallButton: {
    border:
      "1px solid #383e4b",
    borderRadius: 7,
    background: "#1b1f29",
    color: "#ddd",
    padding: "6px 9px",
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 800,
  },

  deleteButton: {
    border: 0,
    borderRadius: 7,
    background: "#7e2439",
    color: "#fff",
    padding: "6px 9px",
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 800,
  },

  preview: {
    marginTop: 12,
    borderRadius: 10,
    overflow: "hidden",
    background: "#090b10",
  },

  previewImage: {
    width: "100%",
    maxHeight: 280,
    display: "block",
    objectFit: "cover",
  },

  previewShop: {
    marginTop: 20,
    padding: 22,
    borderRadius: 16,
    background:
      "linear-gradient(110deg,#ffd9ec,#ffeef8,#eee4ff)",
    color: "#222",
  },

  previewBadge: {
    display: "inline-block",
    padding: "6px 11px",
    borderRadius: 999,
    background: "#fff",
    color: "#e83d94",
    fontSize: 11,
    fontWeight: 900,
  },

  previewShopImage: {
    width: "100%",
    marginTop: 15,
    borderRadius: 14,
    maxHeight: 280,
    objectFit: "cover",
  },

  saveButton: {
    width: "100%",
    marginTop: 18,
    height: 52,
    border: 0,
    borderRadius: 12,
    background:
      "linear-gradient(135deg,#e83d94,#8d54ff)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },

  success: {
    marginBottom: 15,
    padding: 13,
    borderRadius: 10,
    background: "#143522",
    color: "#63e49a",
  },

  error: {
    marginBottom: 15,
    padding: 13,
    borderRadius: 10,
    background: "#401923",
    color: "#ff879e",
  },

  empty: {
    padding: 30,
    textAlign: "center",
    color: "#777",
    border:
      "1px dashed #343946",
    borderRadius: 12,
  },

  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    color: "#aaa",
  },
};
