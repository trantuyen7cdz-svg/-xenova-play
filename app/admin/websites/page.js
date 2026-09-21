"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function WebsitesAdminPage() {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadWebsites() {
    try {
      setLoading(true);
      setMessage("");

      const token = await getToken();

      if (!token) {
        setMessage("Bạn chưa đăng nhập.");
        return;
      }

      const res = await fetch("/api/admin/websites", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Không thể tải danh sách website");
      }

      setWebsites(data.websites || []);
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWebsites();
  }, []);

  function updateForm(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function resetForm() {
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
  }

  async function createWebsite(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      setMessage("Vui lòng nhập tên website.");
      return;
    }

    if (!form.slug.trim()) {
      setMessage("Vui lòng nhập slug website.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const token = await getToken();

      if (!token) {
        setMessage("Bạn chưa đăng nhập.");
        return;
      }

      const res = await fetch("/api/admin/websites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim().toLowerCase(),
          domain: form.domain.trim(),
          logo_url: form.logo_url.trim(),
          banner_url: form.banner_url.trim(),
          theme: form.theme,
          bank_name: form.bank_name.trim(),
          bank_account_number: form.bank_account_number.trim(),
          bank_account_name: form.bank_account_name.trim(),
          payment_qr_url: form.payment_qr_url.trim(),
          description: form.description.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Không thể tạo website");
      }

      setMessage("Tạo website thành công.");
      resetForm();
      await loadWebsites();
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Có lỗi xảy ra khi tạo website");
    } finally {
      setSaving(false);
    }
  }

  async function toggleWebsite(website) {
    try {
      setMessage("");

      const token = await getToken();

      if (!token) {
        setMessage("Bạn chưa đăng nhập.");
        return;
      }

      const res = await fetch(
        `/api/admin/websites?id=${encodeURIComponent(website.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: website.status === "active" ? "inactive" : "active",
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Không thể cập nhật website");
      }

      await loadWebsites();
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Có lỗi xảy ra");
    }
  }

  async function deleteWebsite(website) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa website "${website.name}" không?`
    );

    if (!confirmed) return;

    try {
      setMessage("");

      const token = await getToken();

      if (!token) {
        setMessage("Bạn chưa đăng nhập.");
        return;
      }

      const res = await fetch(
        `/api/admin/websites?id=${encodeURIComponent(website.id)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Không thể xóa website");
      }

      setMessage("Đã xóa website.");
      await loadWebsites();
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Có lỗi xảy ra khi xóa website");
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "24px",
        color: "#111827",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
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
            Quản lý Website
          </h1>

          <p
            style={{
              marginTop: "8px",
              marginBottom: 0,
              color: "#6b7280",
            }}
          >
            Tạo và quản lý các website riêng từ hệ thống XENOVA.
          </p>
        </div>

        {/* MESSAGE */}
        {message && (
          <div
            style={{
              marginBottom: "20px",
              padding: "12px 14px",
              borderRadius: "10px",
              background: "#fff",
              border: "1px solid #e5e7eb",
              fontSize: "14px",
            }}
          >
            {message}
          </div>
        )}

        {/* CREATE WEBSITE */}
        <section
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "24px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
          }}
        >
          <h2
            style={{
              margin: "0 0 18px",
              fontSize: "20px",
              fontWeight: 800,
            }}
          >
            Tạo Website Mới
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
                label="Tên Website *"
                value={form.name}
                onChange={(value) => updateForm("name", value)}
                placeholder="Ví dụ: NOBITA SHOP"
              />

              <Field
                label="Slug *"
                value={form.slug}
                onChange={(value) => updateForm("slug", value)}
                placeholder="nobita-shop"
              />

              <Field
                label="Domain"
                value={form.domain}
                onChange={(value) => updateForm("domain", value)}
                placeholder="shopnobita.com"
              />

              <Field
                label="Logo URL"
                value={form.logo_url}
                onChange={(value) => updateForm("logo_url", value)}
                placeholder="https://..."
              />

              <Field
                label="Banner URL"
                value={form.banner_url}
                onChange={(value) => updateForm("banner_url", value)}
                placeholder="https://..."
              />

              <div>
                <label style={labelStyle}>Theme</label>

                <select
                  value={form.theme}
                  onChange={(e) => updateForm("theme", e.target.value)}
                  style={inputStyle}
                >
                  <option value="pink">Pink</option>
                  <option value="blue">Blue</option>
                  <option value="purple">Purple</option>
                  <option value="green">Green</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <Field
                label="Ngân hàng"
                value={form.bank_name}
                onChange={(value) => updateForm("bank_name", value)}
                placeholder="Vietcombank"
              />

              <Field
                label="Số tài khoản"
                value={form.bank_account_number}
                onChange={(value) =>
                  updateForm("bank_account_number", value)
                }
                placeholder="0123456789"
              />

              <Field
                label="Tên tài khoản"
                value={form.bank_account_name}
                onChange={(value) =>
                  updateForm("bank_account_name", value)
                }
                placeholder="NGUYEN VAN A"
              />

              <Field
                label="QR thanh toán URL"
                value={form.payment_qr_url}
                onChange={(value) =>
                  updateForm("payment_qr_url", value)
                }
                placeholder="https://..."
              />
            </div>

            <div style={{ marginTop: "14px" }}>
              <label style={labelStyle}>Mô tả</label>

              <textarea
                value={form.description}
                onChange={(e) =>
                  updateForm("description", e.target.value)
                }
                placeholder="Mô tả website..."
                rows={4}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                marginTop: "18px",
                width: "100%",
                border: 0,
                borderRadius: "10px",
                padding: "13px 18px",
                background: saving ? "#9ca3af" : "#ec4899",
                color: "#fff",
                fontSize: "15px",
                fontWeight: 800,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Đang tạo..." : "＋ Tạo Website Mới"}
            </button>
          </form>
        </section>

        {/* WEBSITE LIST */}
        <section
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              marginBottom: "18px",
              flexWrap: "wrap",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 800,
              }}
            >
              Danh sách Website
            </h2>

            <button
              type="button"
              onClick={loadWebsites}
              style={{
                border: "1px solid #e5e7eb",
                background: "#fff",
                borderRadius: "9px",
                padding: "9px 14px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Làm mới
            </button>
          </div>

          {loading ? (
            <div
              style={{
                padding: "30px 0",
                textAlign: "center",
                color: "#6b7280",
              }}
            >
              Đang tải...
            </div>
          ) : websites.length === 0 ? (
            <div
              style={{
                padding: "30px 0",
                textAlign: "center",
                color: "#6b7280",
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
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    padding: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "15px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "18px",
                            fontWeight: 800,
                          }}
                        >
                          {website.name}
                        </h3>

                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 9px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: 800,
                            background:
                              website.status === "active"
                                ? "#dcfce7"
                                : "#fee2e2",
                            color:
                              website.status === "active"
                                ? "#166534"
                                : "#991b1b",
                          }}
                        >
                          {website.status === "active"
                            ? "Đang hoạt động"
                            : "Đang tắt"}
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop: "8px",
                          color: "#6b7280",
                          fontSize: "14px",
                          wordBreak: "break-word",
                        }}
                      >
                        Slug: {website.slug}
                      </div>

                      {website.domain && (
                        <div
                          style={{
                            marginTop: "4px",
                            color: "#6b7280",
                            fontSize: "14px",
                            wordBreak: "break-word",
                          }}
                        >
                          Domain: {website.domain}
                        </div>
                      )}

                      {website.description && (
                        <div
                          style={{
                            marginTop: "8px",
                            color: "#374151",
                            fontSize: "14px",
                          }}
                        >
                          {website.description}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleWebsite(website)}
                        style={{
                          border: "1px solid #e5e7eb",
                          background: "#fff",
                          borderRadius: "9px",
                          padding: "9px 12px",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        {website.status === "active"
                          ? "Tắt Website"
                          : "Bật Website"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteWebsite(website)}
                        style={{
                          border: 0,
                          background: "#ef4444",
                          color: "#fff",
                          borderRadius: "9px",
                          padding: "9px 12px",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        Xóa
                      </button>
                    </div>
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

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  fontSize: "13px",
  fontWeight: 700,
  color: "#374151",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #d1d5db",
  borderRadius: "9px",
  padding: "11px 12px",
  background: "#fff",
  color: "#111827",
  outline: "none",
  fontSize: "14px",
};
