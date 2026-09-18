"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminKeysPage() {
  const [keys, setKeys] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [search, setSearch] = useState("");

  const [showAdd, setShowAdd] = useState(false);

  const [productId, setProductId] = useState("");
  const [keyText, setKeyText] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [keysResult, productsResult] = await Promise.all([
        supabase
          .from("keys")
          .select(`
            id,
            key_code,
            product_id,
            user_id,
            order_id,
            expires_at,
            sold_at,
            status,
            created_at
          `)
          .order("id", { ascending: false }),

        supabase
          .from("products")
          .select(`
            id,
            name,
            price,
            duration_days,
            active,
            is_active
          `)
          .order("id", { ascending: true }),
      ]);

      if (keysResult.error) {
        console.error(keysResult.error);
        throw new Error(keysResult.error.message);
      }

      if (productsResult.error) {
        console.error(productsResult.error);
        throw new Error(productsResult.error.message);
      }

      setKeys(keysResult.data || []);
      setProducts(productsResult.data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const productMap = useMemo(() => {
    const map = {};

    for (const product of products) {
      map[product.id] = product;
    }

    return map;
  }, [products]);

  const filteredKeys = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return keys.filter((key) => {
      if (
        selectedProduct !== "all" &&
        String(key.product_id) !== String(selectedProduct)
      ) {
        return false;
      }

      if (
        selectedStatus !== "all" &&
        key.status !== selectedStatus
      ) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const productName =
        productMap[key.product_id]?.name || "";

      return (
        String(key.key_code || "")
          .toLowerCase()
          .includes(keyword) ||
        String(key.user_id || "")
          .toLowerCase()
          .includes(keyword) ||
        String(key.order_id || "")
          .toLowerCase()
          .includes(keyword) ||
        productName.toLowerCase().includes(keyword)
      );
    });
  }, [
    keys,
    selectedProduct,
    selectedStatus,
    search,
    productMap,
  ]);

  const stats = useMemo(() => {
    let available = 0;
    let sold = 0;
    let locked = 0;

    for (const key of keys) {
      if (key.status === "available") available++;
      else if (key.status === "sold") sold++;
      else if (key.status === "locked") locked++;
    }

    return {
      total: keys.length,
      available,
      sold,
      locked,
    };
  }, [keys]);

  function clearMessages() {
    setMessage("");
    setError("");
  }

  function getStatusLabel(status) {
    if (status === "available") return "CHƯA BÁN";
    if (status === "sold") return "ĐÃ BÁN";
    if (status === "locked") return "ĐÃ KHÓA";

    return String(status || "KHÔNG RÕ").toUpperCase();
  }

  function getStatusClass(status) {
    if (status === "available") return "status available";
    if (status === "sold") return "status sold";
    if (status === "locked") return "status locked";

    return "status";
  }

  function formatDate(date) {
    if (!date) return "-";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return "-";
    }

    return d.toLocaleString("vi-VN");
  }

  function isExpired(expiresAt) {
    if (!expiresAt) return false;

    return new Date(expiresAt).getTime() <= Date.now();
  }

  async function addKeys() {
    clearMessages();

    if (!productId) {
      setError("Vui lòng chọn sản phẩm.");
      return;
    }

    const lines = keyText
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setError("Vui lòng nhập ít nhất 1 KEY.");
      return;
    }

    // Loại bỏ KEY trùng nhau trong chính ô nhập
    const uniqueKeys = [...new Set(lines)];

    if (uniqueKeys.length !== lines.length) {
      setError("Danh sách có KEY bị trùng. Hãy kiểm tra lại.");
      return;
    }

    try {
      setSaving(true);

      // Kiểm tra KEY đã tồn tại
      const { data: existingKeys, error: existingError } =
        await supabase
          .from("keys")
          .select("key_code")
          .in("key_code", uniqueKeys);

      if (existingError) {
        console.error(existingError);
        throw new Error(existingError.message);
      }

      const existingSet = new Set(
        (existingKeys || []).map((item) => item.key_code)
      );

      const duplicated = uniqueKeys.filter((key) =>
        existingSet.has(key)
      );

      if (duplicated.length > 0) {
        setError(
          `KEY đã tồn tại: ${duplicated.slice(0, 5).join(", ")}${
            duplicated.length > 5 ? " ..." : ""
          }`
        );
        return;
      }

      const rows = uniqueKeys.map((key) => ({
        key_code: key,
        product_id: Number(productId),
        user_id: null,
        order_id: null,
        expires_at: null,
        sold_at: null,
        status: "available",
      }));

      const { error: insertError } = await supabase
        .from("keys")
        .insert(rows);

      if (insertError) {
        console.error(insertError);
        throw new Error(insertError.message);
      }

      setMessage(`Đã thêm ${uniqueKeys.length} KEY vào kho.`);

      setKeyText("");
      setProductId("");
      setShowAdd(false);

      await loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || "Không thể thêm KEY.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteKey(key) {
    clearMessages();

    if (key.status !== "available") {
      setError("Chỉ được xóa KEY chưa bán.");
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa KEY:\n\n${key.key_code}`
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      const { error: deleteError } = await supabase
        .from("keys")
        .delete()
        .eq("id", key.id)
        .eq("status", "available");

      if (deleteError) {
        console.error(deleteError);
        throw new Error(deleteError.message);
      }

      setMessage("Đã xóa KEY.");

      await loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || "Không thể xóa KEY.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleLock(key) {
    clearMessages();

    if (key.status === "sold") {
      setError("KEY đã bán không thể khóa/mở khóa tại đây.");
      return;
    }

    if (
      key.status !== "available" &&
      key.status !== "locked"
    ) {
      setError("Trạng thái KEY không hợp lệ.");
      return;
    }

    const newStatus =
      key.status === "available"
        ? "locked"
        : "available";

    try {
      setSaving(true);

      const { error: updateError } = await supabase
        .from("keys")
        .update({
          status: newStatus,
        })
        .eq("id", key.id);

      if (updateError) {
        console.error(updateError);
        throw new Error(updateError.message);
      }

      setMessage(
        newStatus === "locked"
          ? "Đã khóa KEY."
          : "Đã mở khóa KEY."
      );

      await loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || "Không thể cập nhật KEY.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAllAvailable() {
    clearMessages();

    const availableCount = keys.filter(
      (key) => key.status === "available"
    ).length;

    if (availableCount === 0) {
      setError("Không có KEY chưa bán để xóa.");
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa toàn bộ ${availableCount} KEY chưa bán?`
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      const { error: deleteError } = await supabase
        .from("keys")
        .delete()
        .eq("status", "available");

      if (deleteError) {
        console.error(deleteError);
        throw new Error(deleteError.message);
      }

      setMessage(
        `Đã xóa ${availableCount} KEY chưa bán.`
      );

      await loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || "Không thể xóa KEY.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page">
      <div className="container">

        <div className="topbar">
          <div>
            <div className="brand">XENOVA PLAY</div>
            <div className="subtitle">
              QUẢN LÝ KHO KEY
            </div>
          </div>

          <a href="/admin" className="backButton">
            ← ADMIN
          </a>
        </div>

        <div className="statsGrid">

          <div className="statCard">
            <div className="statTitle">TỔNG KEY</div>
            <div className="statValue">
              {stats.total}
            </div>
          </div>

          <div className="statCard availableCard">
            <div className="statTitle">
              KEY TRONG KHO
            </div>
            <div className="statValue">
              {stats.available}
            </div>
          </div>

          <div className="statCard soldCard">
            <div className="statTitle">ĐÃ BÁN</div>
            <div className="statValue">
              {stats.sold}
            </div>
          </div>

          <div className="statCard lockedCard">
            <div className="statTitle">ĐÃ KHÓA</div>
            <div className="statValue">
              {stats.locked}
            </div>
          </div>

        </div>

        <div className="toolbar">

          <button
            className="primaryButton"
            onClick={() => {
              clearMessages();
              setShowAdd(!showAdd);
            }}
          >
            {showAdd ? "ĐÓNG" : "+ THÊM KEY"}
          </button>

          <button
            className="dangerButton"
            onClick={deleteAllAvailable}
            disabled={saving}
          >
            XÓA KEY TRONG KHO
          </button>

          <button
            className="refreshButton"
            onClick={loadData}
            disabled={loading || saving}
          >
            ↻ TẢI LẠI
          </button>

        </div>

        {message && (
          <div className="message successMessage">
            {message}
          </div>
        )}

        {error && (
          <div className="message errorMessage">
            {error}
          </div>
        )}

        {showAdd && (
          <section className="panel">

            <div className="panelTitle">
              THÊM KEY VÀO KHO
            </div>

            <div className="formGroup">
              <label>SẢN PHẨM</label>

              <select
                value={productId}
                onChange={(e) =>
                  setProductId(e.target.value)
                }
              >
                <option value="">
                  -- CHỌN SẢN PHẨM --
                </option>

                {products.map((product) => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="formGroup">
              <label>KEY</label>

              <textarea
                value={keyText}
                onChange={(e) =>
                  setKeyText(e.target.value)
                }
                placeholder={`Mỗi KEY một dòng

KEY-AAAA-BBBB
KEY-CCCC-DDDD
KEY-EEEE-FFFF`}
                rows={8}
              />

              <div className="help">
                Mỗi dòng là một KEY. Có thể nhập nhiều KEY
                cùng lúc.
              </div>
            </div>

            <div className="previewBox">

              <div className="previewTitle">
                XEM TRƯỚC
              </div>

              {keyText
                .split(/\r?\n/)
                .map((item) => item.trim())
                .filter(Boolean)
                .slice(0, 20)
                .map((item, index) => (
                  <div
                    className="previewKey"
                    key={`${item}-${index}`}
                  >
                    {item}
                  </div>
                ))}

              {keyText
                .split(/\r?\n/)
                .map((item) => item.trim())
                .filter(Boolean).length > 20 && (
                <div className="moreText">
                  + còn nhiều KEY khác...
                </div>
              )}

            </div>

            <button
              className="submitButton"
              onClick={addKeys}
              disabled={saving}
            >
              {saving
                ? "ĐANG THÊM..."
                : "THÊM KEY VÀO KHO"}
            </button>

          </section>
        )}

        <section className="panel">

          <div className="panelHeader">

            <div>
              <div className="panelTitle">
                DANH SÁCH KEY
              </div>

              <div className="resultCount">
                Hiển thị {filteredKeys.length} /{" "}
                {keys.length} KEY
              </div>
            </div>

          </div>

          <div className="filters">

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Tìm KEY, User ID, Order ID..."
            />

            <select
              value={selectedProduct}
              onChange={(e) =>
                setSelectedProduct(e.target.value)
              }
            >
              <option value="all">
                TẤT CẢ SẢN PHẨM
              </option>

              {products.map((product) => (
                <option
                  key={product.id}
                  value={product.id}
                >
                  {product.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) =>
                setSelectedStatus(e.target.value)
              }
            >
              <option value="all">
                TẤT CẢ TRẠNG THÁI
              </option>

              <option value="available">
                CHƯA BÁN
              </option>

              <option value="sold">
                ĐÃ BÁN
              </option>

              <option value="locked">
                ĐÃ KHÓA
              </option>
            </select>

          </div>

          {loading ? (
            <div className="empty">
              ĐANG TẢI DỮ LIỆU...
            </div>
          ) : filteredKeys.length === 0 ? (
            <div className="empty">
              Không có KEY phù hợp.
            </div>
          ) : (
            <div className="tableWrap">

              <table>

                <thead>
                  <tr>
                    <th>ID</th>
                    <th>KEY</th>
                    <th>SẢN PHẨM</th>
                    <th>TRẠNG THÁI</th>
                    <th>USER</th>
                    <th>ĐƠN HÀNG</th>
                    <th>HẾT HẠN</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>

                <tbody>

                  {filteredKeys.map((key) => {
                    const product =
                      productMap[key.product_id];

                    const expired =
                      key.status === "sold" &&
                      isExpired(key.expires_at);

                    return (
                      <tr key={key.id}>

                        <td>
                          #{key.id}
                        </td>

                        <td>
                          <div className="keyCode">
                            {key.key_code}
                          </div>
                        </td>

                        <td>
                          <div className="productName">
                            {product?.name ||
                              `Product #${key.product_id}`}
                          </div>

                          {product?.duration_days && (
                            <div className="smallText">
                              {product.duration_days} ngày
                            </div>
                          )}
                        </td>

                        <td>

                          <span
                            className={getStatusClass(
                              key.status
                            )}
                          >
                            {getStatusLabel(
                              key.status
                            )}
                          </span>

                          {expired && (
                            <div className="expiredText">
                              ĐÃ HẾT HẠN
                            </div>
                          )}

                        </td>

                        <td>
                          {key.user_id ? (
                            <span
                              className="idText"
                              title={key.user_id}
                            >
                              {String(key.user_id).slice(
                                0,
                                8
                              )}
                              ...
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td>
                          {key.order_id
                            ? `#${key.order_id}`
                            : "-"}
                        </td>

                        <td>
                          {key.expires_at
                            ? formatDate(
                                key.expires_at
                              )
                            : "-"}
                        </td>

                        <td>

                          <div className="actions">

                            {key.status ===
                              "available" && (
                              <>
                                <button
                                  className="smallButton lockButton"
                                  onClick={() =>
                                    toggleLock(key)
                                  }
                                  disabled={saving}
                                >
                                  KHÓA
                                </button>

                                <button
                                  className="smallButton deleteButton"
                                  onClick={() =>
                                    deleteKey(key)
                                  }
                                  disabled={saving}
                                >
                                  XÓA
                                </button>
                              </>
                            )}

                            {key.status ===
                              "locked" && (
                              <button
                                className="smallButton unlockButton"
                                onClick={() =>
                                  toggleLock(key)
                                }
                                disabled={saving}
                              >
                                MỞ KHÓA
                              </button>
                            )}

                            {key.status ===
                              "sold" && (
                              <span className="soldNote">
                                Đã bán
                              </span>
                            )}

                          </div>

                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top,
              #172033 0%,
              #080b12 42%,
              #05070b 100%
            );
          color: #fff;
          padding: 24px;
        }

        .container {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }

        .brand {
          font-size: 28px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .subtitle {
          color: #8d99ad;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 2px;
          margin-top: 5px;
        }

        .backButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 18px;
          border-radius: 10px;
          background: #161c28;
          border: 1px solid #2b3445;
          color: #fff;
          text-decoration: none;
          font-weight: 800;
          font-size: 13px;
        }

        .backButton:hover {
          background: #202938;
        }

        .statsGrid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .statCard {
          background: rgba(15, 20, 30, 0.92);
          border: 1px solid #252e3d;
          border-radius: 14px;
          padding: 20px;
          box-shadow:
            0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .availableCard {
          border-color: rgba(34, 197, 94, 0.3);
        }

        .soldCard {
          border-color: rgba(59, 130, 246, 0.3);
        }

        .lockedCard {
          border-color: rgba(239, 68, 68, 0.3);
        }

        .statTitle {
          color: #8994a7;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .statValue {
          font-size: 30px;
          font-weight: 900;
          margin-top: 8px;
        }

        .toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 18px;
        }

        button {
          font-family: inherit;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .primaryButton,
        .dangerButton,
        .refreshButton {
          border: 0;
          border-radius: 10px;
          min-height: 42px;
          padding: 0 18px;
          color: #fff;
          font-weight: 800;
          font-size: 12px;
        }

        .primaryButton {
          background: #2563eb;
        }

        .primaryButton:hover {
          background: #1d4ed8;
        }

        .dangerButton {
          background: #991b1b;
        }

        .dangerButton:hover {
          background: #b91c1c;
        }

        .refreshButton {
          background: #252d3a;
        }

        .refreshButton:hover {
          background: #303a4b;
        }

        .message {
          border-radius: 10px;
          padding: 13px 15px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 700;
        }

        .successMessage {
          background: rgba(22, 163, 74, 0.12);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #86efac;
        }

        .errorMessage {
          background: rgba(220, 38, 38, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }

        .panel {
          background: rgba(10, 14, 21, 0.94);
          border: 1px solid #252e3d;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 18px;
          box-shadow:
            0 15px 45px rgba(0, 0, 0, 0.18);
        }

        .panelTitle {
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 0.8px;
        }

        .panelHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .resultCount {
          margin-top: 5px;
          color: #758196;
          font-size: 12px;
        }

        .formGroup {
          margin-top: 18px;
        }

        label {
          display: block;
          margin-bottom: 8px;
          color: #9ba6b8;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        input,
        select,
        textarea {
          width: 100%;
          border: 1px solid #2a3444;
          outline: none;
          border-radius: 10px;
          background: #0b1018;
          color: #fff;
          padding: 12px 13px;
          font-family: inherit;
          font-size: 13px;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: #3b82f6;
        }

        textarea {
          resize: vertical;
          min-height: 150px;
          line-height: 1.6;
        }

        select {
          cursor: pointer;
        }

        .help {
          color: #6f7b8e;
          font-size: 11px;
          margin-top: 7px;
        }

        .previewBox {
          margin-top: 16px;
          border: 1px solid #252e3d;
          border-radius: 10px;
          background: #080c12;
          padding: 13px;
        }

        .previewTitle {
          color: #7e8a9e;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
          margin-bottom: 10px;
        }

        .previewKey {
          padding: 7px 9px;
          margin-bottom: 5px;
          border-radius: 7px;
          background: #111722;
          color: #dce3ee;
          font-family: monospace;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .moreText {
          color: #718096;
          font-size: 11px;
          margin-top: 8px;
        }

        .submitButton {
          margin-top: 16px;
          width: 100%;
          min-height: 44px;
          border: 0;
          border-radius: 10px;
          background: #2563eb;
          color: #fff;
          font-weight: 900;
          font-size: 13px;
        }

        .submitButton:hover {
          background: #1d4ed8;
        }

        .filters {
          display: grid;
          grid-template-columns:
            minmax(200px, 1.5fr)
            minmax(180px, 1fr)
            minmax(180px, 1fr);
          gap: 10px;
          margin-bottom: 18px;
        }

        .tableWrap {
          width: 100%;
          overflow-x: auto;
          border: 1px solid #242d3c;
          border-radius: 12px;
        }

        table {
          width: 100%;
          min-width: 1100px;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          background: #101621;
          color: #7f8ba0;
          padding: 12px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.8px;
          white-space: nowrap;
        }

        td {
          padding: 12px;
          border-top: 1px solid #1d2532;
          vertical-align: middle;
          font-size: 12px;
          color: #d8dee8;
        }

        tbody tr:hover {
          background: rgba(255, 255, 255, 0.025);
        }

        .keyCode {
          max-width: 280px;
          color: #fff;
          font-family: monospace;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .productName {
          font-weight: 800;
          color: #e8edf5;
        }

        .smallText {
          color: #6f7b8d;
          font-size: 10px;
          margin-top: 4px;
        }

        .status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 5px 8px;
          border-radius: 6px;
          font-size: 9px;
          font-weight: 900;
          white-space: nowrap;
          background: #252c38;
          color: #cbd5e1;
        }

        .status.available {
          background: rgba(22, 163, 74, 0.12);
          color: #86efac;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .status.sold {
          background: rgba(37, 99, 235, 0.12);
          color: #93c5fd;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        .status.locked {
          background: rgba(220, 38, 38, 0.12);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .expiredText {
          color: #f87171;
          font-size: 9px;
          font-weight: 800;
          margin-top: 5px;
        }

        .idText {
          color: #9ca8ba;
          font-family: monospace;
          font-size: 10px;
        }

        .actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }

        .smallButton {
          border: 0;
          border-radius: 6px;
          padding: 7px 9px;
          color: #fff;
          font-size: 9px;
          font-weight: 900;
        }

        .lockButton {
          background: #92400e;
        }

        .lockButton:hover {
          background: #b45309;
        }

        .unlockButton {
          background: #166534;
        }

        .unlockButton:hover {
          background: #15803d;
        }

        .deleteButton {
          background: #991b1b;
        }

        .deleteButton:hover {
          background: #b91c1c;
        }

        .soldNote {
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
        }

        .empty {
          min-height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #69768a;
          font-size: 13px;
          font-weight: 700;
        }

        @media (max-width: 900px) {
          .statsGrid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .filters {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .page {
            padding: 12px;
          }

          .topbar {
            align-items: flex-start;
          }

          .brand {
            font-size: 22px;
          }

          .statsGrid {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .statCard {
            padding: 14px;
          }

          .statValue {
            font-size: 24px;
          }

          .toolbar {
            display: grid;
            grid-template-columns: 1fr;
          }

          .primaryButton,
          .dangerButton,
          .refreshButton {
            width: 100%;
          }

          .panel {
            padding: 14px;
          }

          .backButton {
            padding: 0 12px;
          }
        }
      `}</style>
    </main>
  );
}
