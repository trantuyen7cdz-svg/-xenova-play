"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function WebsitesAdminPage() {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    slug: "",
    domain: "",
    logo_url: "",
    banner_url: "",
    theme: "pink",
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
    payment_qr_url: "",
    description: "",
  });

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || "";
  }

  async function loadWebsites() {
    try {
      setLoading(true);
      setError("");

      const token = await getAccessToken();

      if (!token) {
        setError("Bạn chưa đăng nhập.");
        return;
      }

      const response = await fetch("/api/admin/websites", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Không thể tải danh sách website."
        );
      }

      setWebsites(result.websites || []);
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWebsites();
  }, []);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function createWebsite(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!form.name.trim()) {
      setError("Vui lòng nhập tên website.");
      return;
    }

    if (!form.slug.trim()) {
      setError("Vui lòng nhập slug website.");
      return;
    }

    try {
      setCreating(true);

      const token = await getAccessToken();

      if (!token) {
        throw new Error("Phiên đăng nhập đã hết hạn.");
      }

      const response = await fetch("/api/admin/websites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Không thể tạo website."
        );
      }

      setMessage("🎉 Tạo website thành công.");

      setForm({
        name: "",
        slug: "",
        domain: "",
        logo_url: "",
        banner_url: "",
        theme: "pink",
        bank_name: "",
        bank_account_number: "",
        bank_account_name: "",
        payment_qr_url: "",
        description: "",
      });

      await loadWebsites();
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleWebsite(website) {
    try {
      setError("");
      setMessage("");

      const token = await getAccessToken();

      if (!token) {
        throw new Error("Phiên đăng nhập đã hết hạn.");
      }

      const newStatus =
        website.status === "active"
          ? "inactive"
          : "active";

      const response = await fetch(
        `/api/admin/websites?id=${website.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Không thể cập nhật website."
        );
      }

      await loadWebsites();
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra.");
    }
  }

  async function deleteWebsite(website) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa website "${website.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setMessage("");

      const token = await getAccessToken();

      if (!token) {
        throw new Error("Phiên đăng nhập đã hết hạn.");
      }

      const response = await fetch(
        `/api/admin/websites?id=${website.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Không thể xóa website."
        );
      }

      setMessage("Đã xóa website.");
      await loadWebsites();
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra.");
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px",
        background: "#fff5f9",
        color: "#222",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: "24px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: 800,
            }}
          >
            🌐 Quản lý Website
          </h1>

          <p
            style={{
              marginTop: "8px",
              color: "#666",
            }}
          >
            Tạo và quản lý nhiều website riêng từ XENOVA.
          </p>
        </div>

        {message && (
          <div
            style={{
              padding: "12px 14px",
              marginBottom: "16px",
              borderRadius: "12px",
              background: "#e9fff1",
              border: "1px solid #b9f0cc",
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "12px 14px",
              marginBottom: "16px",
              borderRadius: "12px",
              background: "#fff0f0",
              border: "1px solid #ffcaca",
              color: "#c00",
            }}
          >
            {error}
          </div>
        )}

        <section
          style={{
            background: "#fff",
            borderRadius: "18px",
            padding: "20px",
            marginBottom: "24px",
            boxShadow: "0 5px 25px rgba(0,0,0,.06)",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: "18px",
              fontSize: "20px",
            }}
          >
            ➕ Tạo Website mới
          </h2>

          <form onSubmit={createWebsite}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "14px",
              }}
            >
              <Field
                label="Tên website *"
                value={form.name}
                onChange={(value) =>
                  updateForm("name", value)
                }
                placeholder="NOBITA SHOP"
              />

              <Field
                label="Slug *"
                value={form.slug}
                onChange={(value) =>
                  updateForm("slug", value)
                }
                placeholder="nobita"
              />

              <Field
                label="Tên miền"
                value={form.domain}
                onChange={(value) =>
                  updateForm("domain", value)
                }
                placeholder="nobitashop.com"
              />

              <Field
                label="Logo URL"
                value={form.logo_url}
                onChange={(value) =>
                  updateForm("logo_url", value)
                }
                placeholder="https://..."
              />

              <Field
                label="Banner URL"
                value={form.banner_url}
                onChange={(value) =>
                  updateForm("banner_url", value)
                }
                placeholder="https://..."
              />

              <div>
                <label style={labelStyle}>
                  Giao diện
                </label>

                <select
                  value={form.theme}
                  onChange={(event) =>
                    updateForm(
                      "theme",
                      event.target.value
                    )
                  }
                  style={inputStyle}
                >
                  <option value="pink">
                    Hồng
                  </option>
                  <option value="blue">
                    Xanh
                  </option>
                  <option value="dark">
                    Tối
                  </option>
                  <option value="purple">
                    Tím
                  </option>
                </select>
              </div>

              <Field
                label="Ngân hàng"
                value={form.bank_name}
                onChange={(value) =>
                  updateForm("bank_name", value)
                }
                placeholder="BIDV"
              />

              <Field
                label="Số tài khoản"
                value={form.bank_account_number}
                onChange={(value) =>
                  updateForm(
                    "bank_account_number",
                    value
                  )
                }
                placeholder="0123456789"
              />

              <Field
                label="Tên chủ tài khoản"
                value={form.bank_account_name}
                onChange={(value) =>
                  updateForm(
                    "bank_account_name",
                    value
                  )
                }
                placeholder="NOBITA SHOP"
              />

              <Field
                label="QR thanh toán URL"
                value={form.payment_qr_url}
                onChange={(value) =>
                  updateForm(
                    "payment_qr_url",
                    value
                  )
                }
                placeholder="https://..."
              />
            </div>

            <div style={{ marginTop: "14px" }}>
              <label style={labelStyle}>
                Mô tả website
              </label>

              <textarea
                value={form.description}
                onChange={(event) =>
                  updateForm(
                    "description",
                    event.target.value
                  )
                }
                placeholder="Mô tả shop..."
                rows={4}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              style={{
                marginTop: "18px",
                width: "100%",
                border: 0,
                borderRadius: "12px",
                padding: "14px 18px",
                background: creating
                  ? "#aaa"
                  : "#ff4f9a",
                color: "#fff",
                fontSize: "16px",
                fontWeight: 800,
                cursor: creating
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {creating
                ? "⏳ Đang tạo..."
                : "🚀 TẠO WEBSITE"}
            </button>
          </form>
        </section>

        <section>
          <h2
            style={{
              marginBottom: "14px",
              fontSize: "20px",
            }}
          >
            🌐 Website đã tạo
          </h2>

          {loading ? (
            <div
              style={{
                background: "#fff",
                padding: "24px",
                borderRadius: "16px",
              }}
            >
              Đang tải...
            </div>
          ) : websites.length === 0 ? (
            <div
              style={{
                background: "#fff",
                padding: "24px",
                borderRadius: "16px",
                color: "#777",
              }}
            >
              Chưa có website nào.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "14px",
              }}
            >
              {websites.map((website) => (
                <div
                  key={website.id}
                  style={{
                    background: "#fff",
                    borderRadius: "16px",
                    padding: "18px",
                    boxShadow:
                      "0 5px 25px rgba(0,0,0,.05)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "flex-start",
                      gap: "15px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "19px",
                          fontWeight: 800,
                        }}
                      >
                        {website.name}
                      </div>

                      <div
                        style={{
                          marginTop: "5px",
                          color: "#777",
                        }}
                      >
                        /{website.slug}
                      </div>

                      {website.domain && (
                        <div
                          style={{
                            marginTop: "5px",
                          }}
                        >
                          🌐 {website.domain}
                        </div>
                      )}

                      <div
                        style={{
                          marginTop: "8px",
                          fontSize: "14px",
                        }}
                      >
                        💳{" "}
                        {website.bank_name ||
                          "Chưa cấu hình thanh toán"}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "6px 10px",
                        borderRadius: "999px",
                        background:
                          website.status ===
                          "active"
                            ? "#e8fff0"
                            : "#eee",
                        color:
                          website.status ===
                          "active"
                            ? "#159447"
                            : "#777",
                        fontWeight: 700,
                      }}
                    >
                      {website.status ===
                      "active"
                        ? "🟢 Hoạt động"
                        : "⚪ Tắt"}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      marginTop: "16px",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        toggleWebsite(website)
                      }
                      style={smallButtonStyle}
                    >
                      {website.status ===
                      "active"
                        ? "Tắt website"
                        : "Bật website"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteWebsite(website)
                      }
                      style={{
                        ...smallButtonStyle,
                        background: "#fff0f0",
                        color: "#d22",
                      }}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
      </label>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  fontSize: "14px",
  fontWeight: 700,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "12px",
  fontSize: "15px",
  outline: "none",
  background: "#fff",
};

const smallButtonStyle = {
  border: 0,
  borderRadius: "10px",
  padding: "10px 14px",
  background: "#ffe5f0",
  color: "#e52f7e",
  fontWeight: 700,
  cursor: "pointer",
};
