"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadCategories() {
    setLoading(true);

    const { data, error } = await supabase
      .from("product_categories")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      setMessage("Không thể tải danh mục: " + error.message);
      setLoading(false);
      return;
    }

    setCategories(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  const parentCategories = useMemo(
    () => categories.filter((item) => !item.parent_id),
    [categories]
  );

  const childrenByParent = useMemo(() => {
    const result = {};

    for (const category of categories) {
      if (!category.parent_id) continue;

      if (!result[category.parent_id]) {
        result[category.parent_id] = [];
      }

      result[category.parent_id].push(category);
    }

    return result;
  }, [categories]);

  async function createCategory(e) {
    e.preventDefault();

    const cleanName = name.trim();

    if (!cleanName) {
      setMessage("Vui lòng nhập tên danh mục.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("product_categories")
      .insert({
        name: cleanName,
        description: description.trim(),
        parent_id: parentId ? Number(parentId) : null,
        active: true,
      });

    if (error) {
      setMessage("Tạo danh mục thất bại: " + error.message);
      setSaving(false);
      return;
    }

    setName("");
    setDescription("");
    setParentId("");

    await loadCategories();

    setMessage(
      parentId
        ? "Đã tạo thư mục con."
        : "Đã tạo thư mục mẹ."
    );

    setSaving(false);
  }

  async function toggleCategory(category) {
    const { error } = await supabase
      .from("product_categories")
      .update({
        active: !category.active,
      })
      .eq("id", category.id);

    if (error) {
      setMessage("Không thể cập nhật: " + error.message);
      return;
    }

    await loadCategories();
  }

  async function deleteCategory(category) {
    const children =
      childrenByParent[category.id] || [];

    if (children.length > 0) {
      setMessage(
        "Không thể xoá thư mục mẹ khi vẫn còn thư mục con."
      );
      return;
    }

    const confirmed = window.confirm(
      `Xoá danh mục "${category.name}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("product_categories")
      .delete()
      .eq("id", category.id);

    if (error) {
      setMessage("Không thể xoá: " + error.message);
      return;
    }

    await loadCategories();
    setMessage("Đã xoá danh mục.");
  }

  return (
    <main className="admin-page">
      <div className="admin-shell">

        <aside className="admin-sidebar">
          <div className="admin-logo">
            XENOVA <span>PLAY</span>
          </div>

          <div className="admin-nav">
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin/products">Sản phẩm</Link>
            <Link href="/admin/categories" className="active">
              Danh mục
            </Link>
            <Link href="/admin/keys">Kho KEY</Link>
            <Link href="/admin/orders">Đơn hàng</Link>
            <Link href="/admin/deposits">Nạp tiền</Link>
            <Link href="/admin/users">Người dùng</Link>
          </div>
        </aside>

        <section className="admin-content">

          <div className="admin-header">
            <div>
              <h1>Quản lý danh mục</h1>
              <p>
                Tạo cấu trúc thư mục mẹ → thư mục con cho cửa hàng.
              </p>
            </div>

            <Link href="/shop" className="shop-link">
              Xem cửa hàng
            </Link>
          </div>

          {message && (
            <div className="admin-message">
              {message}
            </div>
          )}

          <section className="category-form-card">
            <h2>+ Thêm danh mục</h2>

            <form onSubmit={createCategory}>

              <div className="form-grid">

                <div className="field">
                  <label>Tên danh mục</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: ANDROID"
                  />
                </div>

                <div className="field">
                  <label>Thư mục mẹ</label>

                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                  >
                    <option value="">
                      — Tạo thư mục mẹ —
                    </option>

                    {parentCategories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              <div className="field">
                <label>Mô tả</label>

                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  placeholder="Mô tả danh mục..."
                  rows={3}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="save-button"
              >
                {saving
                  ? "Đang lưu..."
                  : parentId
                  ? "Tạo thư mục con"
                  : "Tạo thư mục mẹ"}
              </button>

            </form>
          </section>

          <section className="category-list-card">

            <div className="section-title">
              <div>
                <h2>Cấu trúc cửa hàng</h2>
                <p>
                  {categories.length} danh mục
                </p>
              </div>
            </div>

            {loading ? (
              <div className="loading">
                Đang tải danh mục...
              </div>
            ) : parentCategories.length === 0 ? (
              <div className="empty">
                Chưa có danh mục mẹ.
              </div>
            ) : (
              <div className="tree">

                {parentCategories.map((parent) => {

                  const children =
                    childrenByParent[parent.id] || [];

                  return (
                    <div
                      className="tree-parent"
                      key={parent.id}
                    >

                      <div className="category-row parent-row">

                        <div className="category-name">
                          <span className="folder">
                            📁
                          </span>

                          <div>
                            <strong>
                              {parent.name}
                            </strong>

                            <small>
                              ID: {parent.id}
                            </small>
                          </div>
                        </div>

                        <div className="category-actions">

                          <span
                            className={
                              parent.active
                                ? "status on"
                                : "status off"
                            }
                          >
                            {parent.active
                              ? "Đang hiện"
                              : "Đang ẩn"}
                          </span>

                          <button
                            onClick={() =>
                              toggleCategory(parent)
                            }
                          >
                            {parent.active
                              ? "Ẩn"
                              : "Hiện"}
                          </button>

                          <button
                            className="danger"
                            onClick={() =>
                              deleteCategory(parent)
                            }
                          >
                            Xoá
                          </button>

                        </div>

                      </div>

                      <div className="children">

                        {children.length === 0 ? (
                          <div className="no-child">
                            Chưa có thư mục con
                          </div>
                        ) : (
                          children.map((child) => (
                            <div
                              className="category-row child-row"
                              key={child.id}
                            >

                              <div className="category-name">

                                <span className="branch">
                                  └─
                                </span>

                                <span className="folder">
                                  📂
                                </span>

                                <div>
                                  <strong>
                                    {child.name}
                                  </strong>

                                  <small>
                                    ID: {child.id}
                                  </small>
                                </div>

                              </div>

                              <div className="category-actions">

                                <span
                                  className={
                                    child.active
                                      ? "status on"
                                      : "status off"
                                  }
                                >
                                  {child.active
                                    ? "Đang hiện"
                                    : "Đang ẩn"}
                                </span>

                                <button
                                  onClick={() =>
                                    toggleCategory(child)
                                  }
                                >
                                  {child.active
                                    ? "Ẩn"
                                    : "Hiện"}
                                </button>

                                <button
                                  className="danger"
                                  onClick={() =>
                                    deleteCategory(child)
                                  }
                                >
                                  Xoá
                                </button>

                              </div>

                            </div>
                          ))
                        )}

                      </div>

                    </div>
                  );
                })}

              </div>
            )}

          </section>

        </section>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .admin-page {
          min-height: 100vh;
          background: #f5f6fa;
          color: #171717;
        }

        .admin-shell {
          min-height: 100vh;
          display: flex;
        }

        .admin-sidebar {
          width: 230px;
          flex-shrink: 0;
          background: #111827;
          color: white;
          padding: 24px 14px;
        }

        .admin-logo {
          font-size: 21px;
          font-weight: 900;
          padding: 8px 12px 28px;
        }

        .admin-logo span {
          color: #ff3d8d;
        }

        .admin-nav {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .admin-nav a {
          color: #cbd5e1;
          text-decoration: none;
          padding: 12px 13px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
        }

        .admin-nav a:hover,
        .admin-nav a.active {
          background: #ec2779;
          color: white;
        }

        .admin-content {
          flex: 1;
          max-width: 1200px;
          width: 100%;
          padding: 30px;
        }

        .admin-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }

        .admin-header h1 {
          margin: 0 0 6px;
          font-size: 28px;
        }

        .admin-header p {
          margin: 0;
          color: #64748b;
        }

        .shop-link {
          background: #ec2779;
          color: white;
          text-decoration: none;
          padding: 11px 17px;
          border-radius: 10px;
          font-weight: 800;
        }

        .admin-message {
          padding: 13px 16px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          margin-bottom: 18px;
        }

        .category-form-card,
        .category-list-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 22px;
          margin-bottom: 20px;
        }

        .category-form-card h2,
        .category-list-card h2 {
          margin: 0 0 18px;
          font-size: 18px;
        }

        form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        label {
          font-size: 13px;
          font-weight: 800;
        }

        input,
        select,
        textarea {
          width: 100%;
          border: 1px solid #dfe3ea;
          border-radius: 10px;
          padding: 12px 13px;
          outline: none;
          background: white;
          font: inherit;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: #ec2779;
        }

        textarea {
          resize: vertical;
        }

        .save-button {
          border: 0;
          border-radius: 10px;
          padding: 12px 18px;
          background: #ec2779;
          color: white;
          font-weight: 900;
          cursor: pointer;
          align-self: flex-start;
        }

        .save-button:disabled {
          opacity: .6;
          cursor: wait;
        }

        .section-title {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
        }

        .section-title h2 {
          margin-bottom: 3px;
        }

        .section-title p {
          margin: 0;
          color: #94a3b8;
          font-size: 13px;
        }

        .tree-parent {
          border: 1px solid #e7eaf0;
          border-radius: 13px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .category-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 14px 16px;
        }

        .parent-row {
          background: #fafafa;
        }

        .child-row {
          background: white;
          border-top: 1px solid #edf0f4;
          padding-left: 35px;
        }

        .category-name {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .category-name strong {
          display: block;
          font-size: 14px;
        }

        .category-name small {
          display: block;
          margin-top: 3px;
          color: #94a3b8;
          font-size: 11px;
        }

        .folder {
          font-size: 21px;
        }

        .branch {
          color: #94a3b8;
          font-weight: 900;
        }

        .children {
          background: #fff;
        }

        .no-child {
          padding: 13px 20px 13px 70px;
          color: #94a3b8;
          font-size: 13px;
        }

        .category-actions {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-shrink: 0;
        }

        .category-actions button {
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 8px;
          padding: 7px 10px;
          cursor: pointer;
          font-weight: 700;
        }

        .category-actions button:hover {
          background: #f8fafc;
        }

        .category-actions .danger {
          color: #dc2626;
        }

        .status {
          padding: 5px 8px;
          border-radius: 7px;
          font-size: 11px;
          font-weight: 800;
        }

        .status.on {
          background: #dcfce7;
          color: #15803d;
        }

        .status.off {
          background: #fee2e2;
          color: #b91c1c;
        }

        .loading,
        .empty {
          padding: 35px;
          text-align: center;
          color: #94a3b8;
        }

        @media (max-width: 760px) {
          .admin-shell {
            display: block;
          }

          .admin-sidebar {
            width: 100%;
            padding: 12px;
          }

          .admin-logo {
            padding: 8px 8px 14px;
          }

          .admin-nav {
            flex-direction: row;
            overflow-x: auto;
          }

          .admin-nav a {
            white-space: nowrap;
          }

          .admin-content {
            padding: 16px;
          }

          .admin-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .category-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .category-actions {
            width: 100%;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </main>
  );
}
