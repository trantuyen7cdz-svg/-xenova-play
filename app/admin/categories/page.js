"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadCategories() {
    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("product_categories")
      .select("*")
      .order("id", { ascending: true });

    if (loadError) {
      console.error(loadError);
      setError(loadError.message);
      setCategories([]);
    } else {
      setCategories(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  const parents = useMemo(() => {
    return categories.filter(
      (category) =>
        category.parent_id === null ||
        category.parent_id === undefined
    );
  }, [categories]);

  const childrenByParent = useMemo(() => {
    const result = {};

    categories.forEach((category) => {
      if (
        category.parent_id !== null &&
        category.parent_id !== undefined
      ) {
        const id = Number(category.parent_id);

        if (!result[id]) {
          result[id] = [];
        }

        result[id].push(category);
      }
    });

    return result;
  }, [categories]);

  async function createCategory(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    const cleanName = name.trim();
    const cleanDescription = description.trim();

    if (!cleanName) {
      setError("Vui lòng nhập tên danh mục.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: cleanName,
        description: cleanDescription || null,
        active: true,
      };

      if (parentId) {
        payload.parent_id = Number(parentId);
      } else {
        payload.parent_id = null;
      }

      const { error: insertError } = await supabase
        .from("product_categories")
        .insert(payload);

      if (insertError) {
        throw insertError;
      }

      setName("");
      setDescription("");
      setParentId("");

      setMessage("Đã tạo danh mục thành công.");

      await loadCategories();
    } catch (err) {
      console.error(err);
      setError(err.message || "Không thể tạo danh mục.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCategory(category) {
    setMessage("");
    setError("");

    const { error: updateError } = await supabase
      .from("product_categories")
      .update({
        active: !category.active,
      })
      .eq("id", category.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadCategories();
  }

  async function deleteCategory(category) {
    setMessage("");
    setError("");

    const children =
      childrenByParent[Number(category.id)] || [];

    if (children.length > 0) {
      setError(
        "Không thể xóa danh mục cha khi vẫn còn danh mục con."
      );
      return;
    }

    const { count } = await supabase
      .from("products")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("category_id", category.id);

    if (Number(count || 0) > 0) {
      setError(
        "Danh mục này đang có sản phẩm. Hãy chuyển sản phẩm sang danh mục khác trước."
      );
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa "${category.name}"?`
    );

    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("product_categories")
      .delete()
      .eq("id", category.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage("Đã xóa danh mục.");

    await loadCategories();
  }

  return (
    <div className="admin-page">
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f7f7fb;
          color: #282530;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        button,
        input,
        textarea,
        select {
          font: inherit;
        }

        .admin-page {
          min-height: 100vh;
          padding: 25px;
        }

        .admin-container {
          max-width: 1100px;
          margin: auto;
        }

        .admin-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 20px;
        }

        .admin-title {
          margin: 0;
          font-size: 25px;
          font-weight: 950;
        }

        .admin-subtitle {
          color: #96929e;
          font-size: 12px;
          margin-top: 4px;
        }

        .back-button {
          border: 0;
          background: white;
          border: 1px solid #e8e8ef;
          color: #686470;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .grid {
          display: grid;
          grid-template-columns: 350px minmax(0, 1fr);
          gap: 18px;
        }

        .card {
          background: white;
          border: 1px solid #e9e9f0;
          border-radius: 17px;
          padding: 18px;
        }

        .card-title {
          margin: 0 0 15px;
          font-size: 15px;
          font-weight: 950;
        }

        .field {
          margin-bottom: 13px;
        }

        .label {
          display: block;
          margin-bottom: 6px;
          font-size: 11px;
          font-weight: 850;
          color: #686470;
        }

        input,
        textarea,
        select {
          width: 100%;
          border: 1px solid #e4e4eb;
          border-radius: 10px;
          outline: none;
          background: #fafafd;
          color: #35313b;
          padding: 10px 11px;
          font-size: 12px;
        }

        textarea {
          resize: vertical;
          min-height: 85px;
        }

        input:focus,
        textarea:focus,
        select:focus {
          border-color: #e6a4ca;
          background: white;
        }

        .save-button {
          width: 100%;
          border: 0;
          border-radius: 10px;
          background: linear-gradient(
            135deg,
            #ec3b97,
            #a83fe6
          );
          color: white;
          padding: 11px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .save-button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .message {
          margin-top: 12px;
          padding: 10px;
          border-radius: 9px;
          background: #effaf2;
          color: #34814b;
          font-size: 11px;
          font-weight: 700;
        }

        .error {
          margin-top: 12px;
          padding: 10px;
          border-radius: 9px;
          background: #fff0f3;
          color: #c44766;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.5;
        }

        .tree {
          display: grid;
          gap: 10px;
        }

        .parent {
          border: 1px solid #ececf2;
          border-radius: 13px;
          overflow: hidden;
        }

        .parent-head {
          padding: 12px;
          background: #fff7fb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .parent-name {
          font-size: 13px;
          font-weight: 950;
        }

        .parent-id {
          color: #aaa6b1;
          font-size: 9px;
          margin-top: 2px;
        }

        .children {
          padding: 7px;
          display: grid;
          gap: 6px;
        }

        .child {
          padding: 10px;
          border-radius: 9px;
          background: #fafafd;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .child-name {
          font-size: 12px;
          font-weight: 750;
        }

        .actions {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .small-button {
          border: 0;
          border-radius: 7px;
          padding: 6px 8px;
          font-size: 9px;
          font-weight: 850;
          cursor: pointer;
        }

        .on {
          background: #eaf9ef;
          color: #3d8953;
        }

        .off {
          background: #f1f1f4;
          color: #92909a;
        }

        .delete {
          background: #fff0f2;
          color: #d44c68;
        }

        .empty {
          padding: 30px;
          text-align: center;
          color: #9b98a3;
          font-size: 12px;
        }

        @media (max-width: 800px) {
          .admin-page {
            padding: 14px;
          }

          .grid {
            grid-template-columns: 1fr;
          }

          .admin-header {
            align-items: flex-start;
          }

          .admin-title {
            font-size: 21px;
          }
        }
      `}</style>

      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">
              Quản lý danh mục
            </h1>

            <div className="admin-subtitle">
              XENOVA PLAY • Parent → Child
            </div>
          </div>

          <button
            className="back-button"
            onClick={() => {
              window.location.href = "/admin";
            }}
          >
            ← Admin
          </button>
        </div>

        <div className="grid">
          <section className="card">
            <h2 className="card-title">
              Tạo danh mục
            </h2>

            <form onSubmit={createCategory}>
              <div className="field">
                <label className="label">
                  Tên danh mục
                </label>

                <input
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Ví dụ: ANDROID"
                />
              </div>

              <div className="field">
                <label className="label">
                  Mô tả
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Mô tả danh mục..."
                />
              </div>

              <div className="field">
                <label className="label">
                  Danh mục cha
                </label>

                <select
                  value={parentId}
                  onChange={(event) =>
                    setParentId(event.target.value)
                  }
                >
                  <option value="">
                    — Danh mục cha —
                  </option>

                  {parents.map((parent) => (
                    <option
                      key={parent.id}
                      value={parent.id}
                    >
                      {parent.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="save-button"
                disabled={saving}
                type="submit"
              >
                {saving
                  ? "Đang tạo..."
                  : parentId
                  ? "Tạo danh mục con"
                  : "Tạo danh mục cha"}
              </button>
            </form>

            {message && (
              <div className="message">
                {message}
              </div>
            )}

            {error && (
              <div className="error">
                {error}
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="card-title">
              Cây danh mục
            </h2>

            {loading ? (
              <div className="empty">
                Đang tải...
              </div>
            ) : parents.length === 0 ? (
              <div className="empty">
                Chưa có danh mục.
              </div>
            ) : (
              <div className="tree">
                {parents.map((parent) => {
                  const children =
                    childrenByParent[
                      Number(parent.id)
                    ] || [];

                  return (
                    <div
                      className="parent"
                      key={parent.id}
                    >
                      <div className="parent-head">
                        <div>
                          <div className="parent-name">
                            {parent.name}
                          </div>

                          <div className="parent-id">
                            ID: {parent.id}
                          </div>
                        </div>

                        <div className="actions">
                          <button
                            className={`small-button ${
                              parent.active
                                ? "on"
                                : "off"
                            }`}
                            onClick={() =>
                              toggleCategory(parent)
                            }
                          >
                            {parent.active
                              ? "Đang bật"
                              : "Đang tắt"}
                          </button>

                          <button
                            className="small-button delete"
                            onClick={() =>
                              deleteCategory(parent)
                            }
                          >
                            Xóa
                          </button>
                        </div>
                      </div>

                      {children.length > 0 && (
                        <div className="children">
                          {children.map((child) => (
                            <div
                              className="child"
                              key={child.id}
                            >
                              <div>
                                <div className="child-name">
                                  └─ {child.name}
                                </div>

                                <div className="parent-id">
                                  ID: {child.id}
                                </div>
                              </div>

                              <div className="actions">
                                <button
                                  className={`small-button ${
                                    child.active
                                      ? "on"
                                      : "off"
                                  }`}
                                  onClick={() =>
                                    toggleCategory(child)
                                  }
                                >
                                  {child.active
                                    ? "Bật"
                                    : "Tắt"}
                                </button>

                                <button
                                  className="small-button delete"
                                  onClick={() =>
                                    deleteCategory(child)
                                  }
                                >
                                  Xóa
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
