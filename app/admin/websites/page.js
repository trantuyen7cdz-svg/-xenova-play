"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const emptyForm = {
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
};

export default function WebsitesAdminPage() {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);

  const [adminWebsite, setAdminWebsite] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminRole, setAdminRole] = useState("admin");
  const [adminSaving, setAdminSaving] = useState(false);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadWebsites() {
    try {
      setLoading(true);

      const token = await getToken();

      if (!token) {
        setMessage("Bạn chưa đăng nhập.");
        return;
      }

      const res = await fetch("/api/admin/websites", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Không thể tải danh sách website."
        );
      }

      setWebsites(data.websites || []);
    } catch (error) {
      console.error(error);
      setMessage(
        error.message || "Có lỗi xảy ra."
      );
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

  async function uploadImage(file, field) {
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage(
        "Chỉ được chọn file ảnh JPG, PNG, WEBP, GIF hoặc SVG."
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage(
        "Ảnh không được lớn hơn 10MB."
      );
      return;
    }

    try {
      setUploading(field);
      setMessage("");

      const token = await getToken();

      if (!token) {
        setMessage("Bạn chưa đăng nhập.");
        return;
      }

      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() || "png";

      const safeName =
        file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9-_]/g, "-")
          .slice(0, 50) || "image";

      const filePath = `websites/${crypto.randomUUID()}-${safeName}.${extension}`;

      const { error } = await supabase.storage
        .from("website-assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (error) {
        throw error;
      }

      const { data } = supabase.storage
        .from("website-assets")
        .getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error(
          "Không lấy được URL của file."
        );
      }

      updateForm(field, data.publicUrl);

      setMessage("Upload ảnh thành công.");
    } catch (error) {
      console.error(error);
      setMessage(
        error.message ||
          "Upload ảnh thất bại."
      );
    } finally {
      setUploading("");
    }
  }

  async function createWebsite(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      setMessage(
        "Vui lòng nhập tên website."
      );
      return;
    }

    if (!form.slug.trim()) {
      setMessage(
        "Vui lòng nhập slug."
      );
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

      const res = await fetch(
        "/api/admin/websites",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: form.name.trim(),
            slug: form.slug
              .trim()
              .toLowerCase(),
            domain: form.domain.trim(),
            logo_url: form.logo_url,
            banner_url: form.banner_url,
            theme: form.theme,
            bank_name:
              form.bank_name.trim(),
            bank_account_number:
              form.bank_account_number.trim(),
            bank_account_name:
              form.bank_account_name.trim(),
            payment_qr_url:
              form.payment_qr_url,
            description:
              form.description.trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Không thể tạo website."
        );
      }

      setMessage(
        "Tạo website thành công."
      );

      setForm(emptyForm);

      await loadWebsites();
    } catch (error) {
      console.error(error);
      setMessage(
        error.message ||
          "Có lỗi xảy ra."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleWebsite(website) {
    try {
      const token = await getToken();

      if (!token) {
        setMessage("Bạn chưa đăng nhập.");
        return;
      }

      const res = await fetch(
        `/api/admin/websites?id=${encodeURIComponent(
          website.id
        )}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status:
              website.status === "active"
                ? "inactive"
                : "active",
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Không thể cập nhật."
        );
      }

      await loadWebsites();
    } catch (error) {
      console.error(error);
      setMessage(
        error.message ||
          "Có lỗi xảy ra."
      );
    }
  }

  async function deleteWebsite(website) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa "${website.name}" không?`
    );

    if (!confirmed) return;

    try {
      const token = await getToken();

      if (!token) {
        setMessage("Bạn chưa đăng nhập.");
        return;
      }

      const res = await fetch(
        `/api/admin/websites?id=${encodeURIComponent(
          website.id
        )}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Không thể xóa website."
        );
      }

      setMessage("Đã xóa website.");

      if (
        adminWebsite?.id === website.id
      ) {
        closeAdminManager();
      }

      await loadWebsites();
    } catch (error) {
      console.error(error);
      setMessage(
        error.message ||
          "Có lỗi xảy ra."
      );
    }
  }

  async function loadAdmins(website) {
    try {
      setAdminsLoading(true);
      setMessage("");

      const token = await getToken();

      if (!token) {
        setMessage("Bạn chưa đăng nhập.");
        return;
      }

      const res = await fetch(
        `/api/admin/websites/admins?website_id=${encodeURIComponent(
          website.id
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Không thể tải danh sách admin."
        );
      }

      setAdmins(data.admins || []);
    } catch (error) {
      console.error(error);
      setMessage(
        error.message ||
          "Không thể tải danh sách admin."
      );
    } finally {
      setAdminsLoading(false);
    }
  }

  async function openAdminManager(website) {
    setAdminWebsite(website);
    setAdminEmail("");
    setAdminRole("admin");
    await loadAdmins(website);
  }

  function closeAdminManager() {
    setAdminWebsite(null);
    setAdmins([]);
    setAdminEmail("");
    setAdminRole("admin");
  }

  async function addAdmin(event) {
    event.preventDefault();

    if (!adminWebsite) return;

    const email =
      adminEmail.trim().toLowerCase();

    if (!email) {
      setMessage(
        "Vui lòng nhập email tài khoản."
      );
      return;
    }

    try {
      setAdminSaving(true);
      setMessage("");

      const token = await getToken();

      if (!token) {
        setMessage("Bạn chưa đăng nhập.");
        return;
      }

      const res = await fetch(
        "/api/admin/websites/admins",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            website_id: adminWebsite.id,
            email,
            role: adminRole,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Không thể thêm admin."
        );
      }

      setMessage(
        data?.message ||
          "Thêm admin thành công."
      );

      setAdminEmail("");

      await loadAdmins(adminWebsite);
    } catch (error) {
      console.error(error);
      setMessage(
        error.message ||
          "Có lỗi xảy ra."
      );
    } finally {
      setAdminSaving(false);
    }
  }

  async function toggleAdmin(admin) {
    if (!adminWebsite) return;

    try {
      const token = await getToken();

      if (!token) {
        setMessage("Bạn chưa đăng nhập.");
        return;
      }

      const res = await fetch(
        "/api/admin/websites/admins",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: admin.id,
            website_id:
              adminWebsite.id,
            active: !admin.active,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Không thể cập nhật admin."
        );
      }

      await loadAdmins(adminWebsite);
    } catch (error) {
      console.error(error);
      setMessage(
        error.message ||
          "Có lỗi xảy ra."
      );
    }
  }

  async function deleteAdmin(admin) {
    if (!adminWebsite) return;

    const confirmed = window.confirm(
      `Xóa quyền quản trị của ${admin.email || "tài khoản này"} khỏi website "${adminWebsite.name}"?`
    );

    if (!confirmed) return;

    try {
      const token = await getToken();

      if (!token) {
        setMessage("Bạn chưa đăng nhập.");
        return;
      }

      const res = await fetch(
        `/api/admin/websites/admins?id=${encodeURIComponent(
          admin.id
        )}&website_id=${encodeURIComponent(
          adminWebsite.id
        )}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Không thể xóa admin."
        );
      }

      setMessage(
        "Đã xóa admin khỏi website."
      );

      await loadAdmins(adminWebsite);
    } catch (error) {
      console.error(error);
      setMessage(
        error.message ||
          "Có lỗi xảy ra."
      );
    }
  }

  return (
    <main className="page">
      <div className="container">
        <div className="header">
          <h1>Quản lý Website</h1>

          <p>
            Tạo và quản lý các website riêng
            từ hệ thống XENOVA.
          </p>
        </div>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        <section className="card">
          <h2>Tạo Website Mới</h2>

          <form onSubmit={createWebsite}>
            <div className="grid">
              <Field
                label="Tên Website *"
                value={form.name}
                onChange={(value) =>
                  updateForm(
                    "name",
                    value
                  )
                }
                placeholder="Ví dụ: SHOP NOBITA"
              />

              <Field
                label="Slug *"
                value={form.slug}
                onChange={(value) =>
                  updateForm(
                    "slug",
                    value
                  )
                }
                placeholder="shop-nobita"
              />

              <Field
                label="Domain"
                value={form.domain}
                onChange={(value) =>
                  updateForm(
                    "domain",
                    value
                  )
                }
                placeholder="shopnobita.com"
              />

              <UploadField
                label="Logo"
                value={form.logo_url}
                loading={
                  uploading ===
                  "logo_url"
                }
                onChange={(file) =>
                  uploadImage(
                    file,
                    "logo_url"
                  )
                }
              />

              <UploadField
                label="Banner"
                value={form.banner_url}
                loading={
                  uploading ===
                  "banner_url"
                }
                onChange={(file) =>
                  uploadImage(
                    file,
                    "banner_url"
                  )
                }
              />

              <div>
                <label>
                  Theme
                </label>

                <select
                  value={form.theme}
                  onChange={(e) =>
                    updateForm(
                      "theme",
                      e.target.value
                    )
                  }
                >
                  <option value="pink">
                    Pink
                  </option>
                  <option value="blue">
                    Blue
                  </option>
                  <option value="purple">
                    Purple
                  </option>
                  <option value="green">
                    Green
                  </option>
                  <option value="dark">
                    Dark
                  </option>
                </select>
              </div>

              <Field
                label="Ngân hàng"
                value={form.bank_name}
                onChange={(value) =>
                  updateForm(
                    "bank_name",
                    value
                  )
                }
                placeholder="Vietcombank"
              />

              <Field
                label="Số tài khoản"
                value={
                  form.bank_account_number
                }
                onChange={(value) =>
                  updateForm(
                    "bank_account_number",
                    value
                  )
                }
                placeholder="0123456789"
              />

              <Field
                label="Tên tài khoản"
                value={
                  form.bank_account_name
                }
                onChange={(value) =>
                  updateForm(
                    "bank_account_name",
                    value
                  )
                }
                placeholder="NGUYEN VAN A"
              />

              <UploadField
                label="QR Thanh Toán"
                value={
                  form.payment_qr_url
                }
                loading={
                  uploading ===
                  "payment_qr_url"
                }
                onChange={(file) =>
                  uploadImage(
                    file,
                    "payment_qr_url"
                  )
                }
              />
            </div>

            <div className="textareaWrap">
              <label>
                Mô tả
              </label>

              <textarea
                value={form.description}
                onChange={(e) =>
                  updateForm(
                    "description",
                    e.target.value
                  )
                }
                placeholder="Mô tả website..."
                rows={4}
              />
            </div>

            <button
              type="submit"
              className="createButton"
              disabled={
                saving || !!uploading
              }
            >
              {saving
                ? "Đang tạo..."
                : "＋ Tạo Website Mới"}
            </button>
          </form>
        </section>

        <section className="card">
          <div className="listHeader">
            <h2>
              Danh sách Website
            </h2>

            <button
              type="button"
              className="refreshButton"
              onClick={loadWebsites}
            >
              Làm mới
            </button>
          </div>

          {loading ? (
            <div className="empty">
              Đang tải...
            </div>
          ) : websites.length === 0 ? (
            <div className="empty">
              Chưa có website nào.
            </div>
          ) : (
            <div className="websiteList">
              {websites.map(
                (website) => (
                  <div
                    className="website"
                    key={website.id}
                  >
                    <div className="websiteInfo">
                      {website.logo_url && (
                        <img
                          src={
                            website.logo_url
                          }
                          alt={
                            website.name
                          }
                          className="logoPreview"
                        />
                      )}

                      <div>
                        <div className="nameRow">
                          <h3>
                            {
                              website.name
                            }
                          </h3>

                          <span
                            className={
                              website.status ===
                              "active"
                                ? "active"
                                : "inactive"
                            }
                          >
                            {website.status ===
                            "active"
                              ? "Đang hoạt động"
                              : "Đang tắt"}
                          </span>
                        </div>

                        <div className="muted">
                          Slug:{" "}
                          {
                            website.slug
                          }
                        </div>

                        {website.domain && (
                          <div className="muted">
                            Domain:{" "}
                            {
                              website.domain
                            }
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="actions">
                      <button
                        type="button"
                        className="adminButton"
                        onClick={() =>
                          openAdminManager(
                            website
                          )
                        }
                      >
                        👤 Quản lý Admin
                      </button>

                      <button
                        type="button"
                        className="normalButton"
                        onClick={() =>
                          toggleWebsite(
                            website
                          )
                        }
                      >
                        {website.status ===
                        "active"
                          ? "Tắt Website"
                          : "Bật Website"}
                      </button>

                      <button
                        type="button"
                        className="deleteButton"
                        onClick={() =>
                          deleteWebsite(
                            website
                          )
                        }
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>

      {adminWebsite && (
        <div
          className="modalOverlay"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              closeAdminManager();
            }
          }}
        >
          <div className="adminModal">
            <div className="modalHeader">
              <div>
                <h2>
                  Quản lý Admin
                </h2>

                <p>
                  Website:{" "}
                  <strong>
                    {adminWebsite.name}
                  </strong>
                </p>

                <span className="slugBadge">
                  /sites/
                  {
                    adminWebsite.slug
                  }
                </span>
              </div>

              <button
                type="button"
                className="closeButton"
                onClick={
                  closeAdminManager
                }
              >
                ×
              </button>
            </div>

            <form
              className="addAdminForm"
              onSubmit={addAdmin}
            >
              <div className="adminInput">
                <label>
                  Email tài khoản
                </label>

                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) =>
                    setAdminEmail(
                      e.target.value
                    )
                  }
                  placeholder="admin@gmail.com"
                  required
                />
              </div>

              <div className="adminRole">
                <label>
                  Quyền
                </label>

                <select
                  value={adminRole}
                  onChange={(e) =>
                    setAdminRole(
                      e.target.value
                    )
                  }
                >
                  <option value="admin">
                    Admin
                  </option>

                  <option value="owner">
                    Owner
                  </option>
                </select>
              </div>

              <button
                type="submit"
                className="addAdminButton"
                disabled={
                  adminSaving
                }
              >
                {adminSaving
                  ? "Đang thêm..."
                  : "＋ Thêm Admin"}
              </button>
            </form>

            <div className="adminNotice">
              Tài khoản phải tồn tại trong
              hệ thống XENOVA trước khi thêm
              vào website.
            </div>

            <div className="adminsTitle">
              <h3>
                Admin của website
              </h3>

              <span>
                {admins.length} tài khoản
              </span>
            </div>

            {adminsLoading ? (
              <div className="empty">
                Đang tải admin...
              </div>
            ) : admins.length === 0 ? (
              <div className="empty adminEmpty">
                Website này chưa có admin
                riêng.
              </div>
            ) : (
              <div className="adminList">
                {admins.map(
                  (admin) => (
                    <div
                      className="adminItem"
                      key={admin.id}
                    >
                      <div className="adminUser">
                        <div className="avatar">
                          {(admin.email ||
                            "?")
                            .charAt(
                              0
                            )
                            .toUpperCase()}
                        </div>

                        <div>
                          <div className="adminEmail">
                            {admin.email ||
                              "Không có email"}
                          </div>

                          <div className="adminMeta">
                            <span
                              className={
                                admin.role ===
                                "owner"
                                  ? "roleOwner"
                                  : "roleAdmin"
                              }
                            >
                              {admin.role ===
                              "owner"
                                ? "OWNER"
                                : "ADMIN"}
                            </span>

                            <span
                              className={
                                admin.active
                                  ? "statusOn"
                                  : "statusOff"
                              }
                            >
                              {admin.active
                                ? "Đang hoạt động"
                                : "Đang tắt"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="adminActions">
                        <button
                          type="button"
                          className="normalButton"
                          onClick={() =>
                            toggleAdmin(
                              admin
                            )
                          }
                        >
                          {admin.active
                            ? "Tắt"
                            : "Bật"}
                        </button>

                        <button
                          type="button"
                          className="deleteButton"
                          onClick={() =>
                            deleteAdmin(
                              admin
                            )
                          }
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            <div className="modalFooter">
              <button
                type="button"
                className="closeModalButton"
                onClick={
                  closeAdminManager
                }
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f8fafc;
          padding: 24px;
          color: #111827;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .header {
          margin-bottom: 24px;
        }

        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
        }

        .header p {
          margin: 8px 0 0;
          color: #6b7280;
        }

        .message {
          margin-bottom: 20px;
          padding: 12px 14px;
          border-radius: 10px;
          background: white;
          border: 1px solid #e5e7eb;
          font-size: 14px;
          word-break: break-word;
        }

        .card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 24px;
          box-shadow:
            0 4px 16px rgba(
              0,
              0,
              0,
              0.04
            );
        }

        .card h2 {
          margin: 0 0 18px;
          font-size: 20px;
          font-weight: 800;
        }

        .grid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(240px, 1fr)
            );
          gap: 14px;
        }

        label {
          display: block;
          margin-bottom: 7px;
          font-size: 13px;
          font-weight: 700;
          color: #374151;
        }

        input,
        select,
        textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d1d5db;
          border-radius: 9px;
          padding: 11px 12px;
          background: white;
          color: #111827;
          font-size: 14px;
          outline: none;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: #ec4899;
        }

        textarea {
          resize: vertical;
        }

        .textareaWrap {
          margin-top: 14px;
        }

        .uploadBox {
          border: 1px solid #d1d5db;
          border-radius: 9px;
          padding: 10px;
        }

        .uploadRow {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .fileButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 9px 12px;
          border-radius: 8px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          cursor: pointer;
          font-size: 13px;
          font-weight: 700;
        }

        .preview {
          margin-top: 10px;
          max-width: 100%;
          max-height: 130px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          object-fit: contain;
        }

        .createButton {
          margin-top: 18px;
          width: 100%;
          border: 0;
          border-radius: 10px;
          padding: 13px 18px;
          background: #ec4899;
          color: white;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
        }

        .createButton:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .listHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }

        .listHeader h2 {
          margin: 0;
        }

        .refreshButton,
        .normalButton {
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 9px;
          padding: 9px 12px;
          cursor: pointer;
          font-weight: 700;
        }

        .refreshButton:hover,
        .normalButton:hover {
          background: #f9fafb;
        }

        .websiteList {
          display: grid;
          gap: 14px;
        }

        .website {
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
        }

        .websiteInfo {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .logoPreview {
          width: 54px;
          height: 54px;
          object-fit: cover;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
        }

        .nameRow {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
        }

        .nameRow h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
        }

        .active,
        .inactive {
          padding: 4px 9px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
        }

        .active {
          background: #dcfce7;
          color: #166534;
        }

        .inactive {
          background: #fee2e2;
          color: #991b1b;
        }

        .muted {
          margin-top: 4px;
          color: #6b7280;
          font-size: 14px;
          word-break: break-word;
        }

        .actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .adminButton {
          border: 0;
          background: #7c3aed;
          color: white;
          border-radius: 9px;
          padding: 9px 12px;
          cursor: pointer;
          font-weight: 700;
        }

        .adminButton:hover {
          background: #6d28d9;
        }

        .deleteButton {
          border: 0;
          background: #ef4444;
          color: white;
          border-radius: 9px;
          padding: 9px 12px;
          cursor: pointer;
          font-weight: 700;
        }

        .empty {
          padding: 30px 0;
          text-align: center;
          color: #6b7280;
        }

        /* =========================
           ADMIN MODAL
        ========================= */

        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(
            15,
            23,
            42,
            0.55
          );
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          overflow-y: auto;
        }

        .adminModal {
          width: min(
            760px,
            100%
          );
          max-height: 90vh;
          overflow-y: auto;
          background: white;
          border-radius: 18px;
          box-shadow:
            0 25px 70px rgba(
              0,
              0,
              0,
              0.2
            );
          padding: 22px;
        }

        .modalHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          margin-bottom: 20px;
        }

        .modalHeader h2 {
          margin: 0;
          font-size: 23px;
          font-weight: 800;
        }

        .modalHeader p {
          margin: 6px 0 7px;
          color: #6b7280;
          font-size: 14px;
        }

        .slugBadge {
          display: inline-flex;
          padding: 5px 9px;
          border-radius: 7px;
          background: #f3f4f6;
          color: #4b5563;
          font-size: 12px;
          font-weight: 700;
        }

        .closeButton {
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 9px;
          background: #f3f4f6;
          color: #374151;
          font-size: 25px;
          line-height: 1;
          cursor: pointer;
        }

        .addAdminForm {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            140px
            auto;
          align-items: end;
          gap: 10px;
        }

        .addAdminButton {
          height: 43px;
          border: 0;
          border-radius: 9px;
          padding: 0 16px;
          background: #7c3aed;
          color: white;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .addAdminButton:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .adminNotice {
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 9px;
          background: #f5f3ff;
          border: 1px solid #ddd6fe;
          color: #5b21b6;
          font-size: 13px;
        }

        .adminsTitle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 24px;
          margin-bottom: 12px;
        }

        .adminsTitle h3 {
          margin: 0;
          font-size: 17px;
          font-weight: 800;
        }

        .adminsTitle span {
          color: #6b7280;
          font-size: 13px;
        }

        .adminList {
          display: grid;
          gap: 10px;
        }

        .adminItem {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
        }

        .adminUser {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .avatar {
          flex: 0 0 40px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #ede9fe;
          color: #6d28d9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .adminEmail {
          font-size: 14px;
          font-weight: 800;
          word-break: break-all;
        }

        .adminMeta {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 5px;
        }

        .roleOwner,
        .roleAdmin,
        .statusOn,
        .statusOff {
          display: inline-flex;
          padding: 3px 7px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
        }

        .roleOwner {
          background: #fef3c7;
          color: #92400e;
        }

        .roleAdmin {
          background: #ede9fe;
          color: #6d28d9;
        }

        .statusOn {
          background: #dcfce7;
          color: #166534;
        }

        .statusOff {
          background: #fee2e2;
          color: #991b1b;
        }

        .adminActions {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          flex-shrink: 0;
        }

        .adminEmpty {
          border: 1px dashed #d1d5db;
          border-radius: 10px;
        }

        .modalFooter {
          display: flex;
          justify-content: flex-end;
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .closeModalButton {
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 9px;
          padding: 9px 16px;
          cursor: pointer;
          font-weight: 700;
        }

        @media (max-width: 700px) {
          .addAdminForm {
            grid-template-columns: 1fr;
          }

          .addAdminButton {
            width: 100%;
          }

          .adminItem {
            align-items: flex-start;
            flex-direction: column;
          }

          .adminActions {
            width: 100%;
          }

          .adminActions button {
            flex: 1;
          }
        }

        @media (max-width: 600px) {
          .page {
            padding: 14px;
          }

          .card {
            padding: 15px;
          }

          .header h1 {
            font-size: 24px;
          }

          .website {
            align-items: flex-start;
          }

          .actions {
            width: 100%;
          }

          .actions button {
            flex: 1;
          }

          .adminModal {
            padding: 16px;
            border-radius: 14px;
          }
        }
      `}</style>
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
      <label>{label}</label>

      <input
        type="text"
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
      />
    </div>
  );
}

function UploadField({
  label,
  value,
  loading,
  onChange,
}) {
  return (
    <div>
      <label>{label}</label>

      <div className="uploadBox">
        <div className="uploadRow">
          <label className="fileButton">
            {loading
              ? "Đang upload..."
              : "📁 Chọn ảnh"}

            <input
              type="file"
              accept="image/*"
              hidden
              disabled={loading}
              onChange={(e) => {
                const file =
                  e.target.files?.[0];

                if (file) {
                  onChange(file);
                }

                e.target.value = "";
              }}
            />
          </label>

          {value && (
            <span
              style={{
                fontSize: "12px",
                color: "#16a34a",
                fontWeight: 700,
              }}
            >
              ✓ Đã upload
            </span>
          )}
        </div>

        {value && (
          <img
            src={value}
            alt={label}
            className="preview"
          />
        )}
      </div>
    </div>
  );
}
