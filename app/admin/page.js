"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    duration_days: "",
    keys: "",
  });

  // =========================
  // LOAD DATA
  // =========================

  async function loadData() {
    setLoading(true);

    const { data: productData, error: productError } =
      await supabase
        .from("products")
        .select("*")
        .order("id", { ascending: false });

    if (productError) {
      console.error(productError);
      alert("Không tải được sản phẩm");
    }

    const { data: orderData, error: orderError } =
      await supabase
        .from("orders")
        .select(`
          id,
          user_id,
          product_id,
          amount,
          status,
          created_at,
          products (
            id,
            name,
            duration_days
          )
        `)
        .order("id", { ascending: false });

    if (orderError) {
      console.error(orderError);
    }

    const productList = productData || [];

    // Lấy số KEY còn trong kho của từng sản phẩm
    const productsWithStock = await Promise.all(
      productList.map(async (product) => {
        const { count } = await supabase
          .from("keys")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("product_id", product.id)
          .eq("status", "available")
          .is("user_id", null)
          .is("order_id", null);

        return {
          ...product,
          stock: count || 0,
        };
      })
    );

    setProducts(productsWithStock);
    setOrders(orderData || []);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  // =========================
  // FORM
  // =========================

  function updateForm(field, value) {
    setForm((old) => ({
      ...old,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm({
      name: "",
      description: "",
      price: "",
      duration_days: "",
      keys: "",
    });

    setEditingId(null);
  }

  // =========================
  // THÊM / SỬA SẢN PHẨM
  // =========================

  async function saveProduct(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Vui lòng nhập tên sản phẩm");
      return;
    }

    if (!form.price || Number(form.price) <= 0) {
      alert("Vui lòng nhập giá sản phẩm");
      return;
    }

    if (
      !form.duration_days ||
      Number(form.duration_days) <= 0
    ) {
      alert("Vui lòng nhập thời hạn KEY");
      return;
    }

    setSaving(true);

    try {
      let productId = editingId;

      // =========================
      // TẠO SẢN PHẨM
      // =========================

      if (!editingId) {
        const { data, error } = await supabase
          .from("products")
          .insert({
            name: form.name.trim(),
            description: form.description.trim(),
            price: Number(form.price),
            duration_days: Number(form.duration_days),
            active: true,
            is_active: true,
          })
          .select()
          .single();

        if (error) {
          console.error(error);
          throw new Error(error.message);
        }

        productId = data.id;
      } else {
        // =========================
        // SỬA SẢN PHẨM
        // =========================

        const { error } = await supabase
          .from("products")
          .update({
            name: form.name.trim(),
            description: form.description.trim(),
            price: Number(form.price),
            duration_days: Number(form.duration_days),
          })
          .eq("id", editingId);

        if (error) {
          console.error(error);
          throw new Error(error.message);
        }
      }

      // =========================
      // THÊM KEY VÀO KHO
      // =========================

      const keyLines = form.keys
        .split("\n")
        .map((key) => key.trim())
        .filter(Boolean);

      if (keyLines.length > 0) {
        // Loại KEY trùng trong chính danh sách vừa nhập
        const uniqueKeys = [
          ...new Set(keyLines),
        ];

        const keyRows = uniqueKeys.map((keyCode) => ({
          key_code: keyCode,
          product_id: productId,
          status: "available",
          user_id: null,
          order_id: null,
          expires_at: null,
        }));

        const { error: keyError } =
          await supabase
            .from("keys")
            .insert(keyRows);

        if (keyError) {
          console.error(keyError);
          throw new Error(
            "Sản phẩm đã lưu nhưng thêm KEY thất bại: " +
              keyError.message
          );
        }
      }

      alert(
        editingId
          ? "Đã cập nhật sản phẩm"
          : "Đã thêm sản phẩm và KEY vào kho"
      );

      resetForm();
      await loadData();
    } catch (error) {
      console.error(error);
      alert(error.message || "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // EDIT
  // =========================

  function editProduct(product) {
    setEditingId(product.id);

    setForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price || "",
      duration_days: product.duration_days || "",
      keys: "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =========================
  // BẬT / TẮT SẢN PHẨM
  // =========================

  async function toggleProduct(product) {
    const newValue = !product.active;

    const { error } = await supabase
      .from("products")
      .update({
        active: newValue,
        is_active: newValue,
      })
      .eq("id", product.id);

    if (error) {
      console.error(error);
      alert("Không thể thay đổi trạng thái");
      return;
    }

    await loadData();
  }

  // =========================
  // XÓA SẢN PHẨM
  // =========================

  async function deleteProduct(product) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa sản phẩm "${product.name}"?`
    );

    if (!confirmed) return;

    const { count } = await supabase
      .from("keys")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("product_id", product.id);

    if (count && count > 0) {
      alert(
        "Không thể xóa sản phẩm đang có KEY trong kho."
      );
      return;
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      console.error(error);
      alert("Không thể xóa sản phẩm");
      return;
    }

    await loadData();
  }

  // =========================
  // DUYỆT ĐƠN
  // =========================

  async function approveOrder(orderId) {
    const confirmed = window.confirm(
      "Duyệt đơn này và cấp 1 KEY trong kho sản phẩm?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        "/api/admin/approve-order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(
          result.message ||
            "Không thể cấp KEY"
        );
        return;
      }

      alert(
        "Đã cấp KEY thành công:\n\n" +
          result.key
      );

      await loadData();
    } catch (error) {
      console.error(error);
      alert("Lỗi kết nối server");
    }
  }

  // =========================
  // TỪ CHỐI ĐƠN
  // =========================

  async function rejectOrder(orderId) {
    const confirmed = window.confirm(
      "Bạn có chắc muốn từ chối đơn này?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("orders")
      .update({
        status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      console.error(error);
      alert("Không thể từ chối đơn");
      return;
    }

    await loadData();
  }

  // =========================
  // FORMAT
  // =========================

  function formatPrice(price) {
    return Number(price || 0).toLocaleString("vi-VN");
  }

  function formatDate(date) {
    if (!date) return "";

    return new Date(date).toLocaleString(
      "vi-VN"
    );
  }

  // =========================
  // UI
  // =========================

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          Đang tải Admin...
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        <h1 style={styles.title}>
          XENOVA ADMIN
        </h1>

        <p style={styles.subtitle}>
          Quản lý sản phẩm và kho KEY
        </p>

        {/* =========================
            FORM SẢN PHẨM
        ========================= */}

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>
            {editingId
              ? "CHỈNH SỬA SẢN PHẨM"
              : "THÊM SẢN PHẨM"}
          </h2>

          <form onSubmit={saveProduct}>

            <label style={styles.label}>
              TÊN SẢN PHẨM
            </label>

            <input
              style={styles.input}
              value={form.name}
              onChange={(e) =>
                updateForm(
                  "name",
                  e.target.value
                )
              }
              placeholder="Ví dụ: KEY 1 NGÀY"
            />

            <label style={styles.label}>
              MÔ TẢ
            </label>

            <textarea
              style={styles.input}
              value={form.description}
              onChange={(e) =>
                updateForm(
                  "description",
                  e.target.value
                )
              }
              placeholder="Ví dụ: Dùng trong 24 giờ"
              rows={3}
            />

            <label style={styles.label}>
              GIÁ
            </label>

            <input
              style={styles.input}
              type="number"
              value={form.price}
              onChange={(e) =>
                updateForm(
                  "price",
                  e.target.value
                )
              }
              placeholder="10000"
            />

            <label style={styles.label}>
              THỜI HẠN KEY
            </label>

            <input
              style={styles.input}
              type="number"
              value={form.duration_days}
              onChange={(e) =>
                updateForm(
                  "duration_days",
                  e.target.value
                )
              }
              placeholder="1"
            />

            <div style={styles.hint}>
              Nhập số ngày. Ví dụ: 1 = 1 ngày,
              7 = 7 ngày, 30 = 30 ngày.
            </div>

            <label style={styles.label}>
              KEY CÓ SẴN
            </label>

            <textarea
              style={styles.keyBox}
              value={form.keys}
              onChange={(e) =>
                updateForm(
                  "keys",
                  e.target.value
                )
              }
              placeholder={
                "Dán KEY vào đây\n" +
                "mỗi dòng 1 KEY\n\n" +
                "KEY-AAA\n" +
                "KEY-BBB\n" +
                "KEY-CCC"
              }
              rows={8}
            />

            <div style={styles.hint}>
              Mỗi dòng là 1 KEY. KEY sẽ được
              đưa vào kho riêng của sản phẩm này.
            </div>

            <div style={styles.buttonRow}>

              <button
                type="submit"
                disabled={saving}
                style={styles.primaryButton}
              >
                {saving
                  ? "ĐANG LƯU..."
                  : editingId
                  ? "LƯU THAY ĐỔI"
                  : "THÊM SẢN PHẨM"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  style={styles.secondaryButton}
                >
                  HỦY
                </button>
              )}

            </div>
          </form>
        </section>

        {/* =========================
            KHO SẢN PHẨM
        ========================= */}

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>
            KHO SẢN PHẨM
          </h2>

          {products.length === 0 ? (
            <div style={styles.empty}>
              Chưa có sản phẩm.
            </div>
          ) : (
            <div style={styles.productList}>

              {products.map((product) => (
                <div
                  key={product.id}
                  style={styles.product}
                >

                  <div
                    style={
                      styles.productHeader
                    }
                  >
                    <div>
                      <div
                        style={
                          styles.productName
                        }
                      >
                        {product.name}
                      </div>

                      <div
                        style={
                          styles.productDescription
                        }
                      >
                        {product.description ||
                          "Không có mô tả"}
                      </div>
                    </div>

                    <div
                      style={{
                        ...styles.status,
                        background:
                          product.active
                            ? "#123b24"
                            : "#3b1515",
                        color:
                          product.active
                            ? "#4ade80"
                            : "#f87171",
                      }}
                    >
                      {product.active
                        ? "ĐANG BÁN"
                        : "TẮT"}
                    </div>
                  </div>

                  <div style={styles.infoGrid}>

                    <div>
                      <span
                        style={styles.infoLabel}
                      >
                        GIÁ
                      </span>

                      <strong>
                        {formatPrice(
                          product.price
                        )}{" "}
                        VNĐ
                      </strong>
                    </div>

                    <div>
                      <span
                        style={styles.infoLabel}
                      >
                        THỜI HẠN
                      </span>

                      <strong>
                        {product.duration_days}{" "}
                        ngày
                      </strong>
                    </div>

                    <div>
                      <span
                        style={styles.infoLabel}
                      >
                        KEY CÒN LẠI
                      </span>

                      <strong
                        style={{
                          color:
                            product.stock > 0
                              ? "#4ade80"
                              : "#f87171",
                        }}
                      >
                        {product.stock}
                      </strong>
                    </div>

                  </div>

                  <div style={styles.productButtons}>

                    <button
                      onClick={() =>
                        editProduct(product)
                      }
                      style={styles.editButton}
                    >
                      SỬA
                    </button>

                    <button
                      onClick={() =>
                        toggleProduct(product)
                      }
                      style={
                        styles.toggleButton
                      }
                    >
                      {product.active
                        ? "TẮT BÁN"
                        : "BẬT BÁN"}
                    </button>

                    <button
                      onClick={() =>
                        deleteProduct(product)
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
        </section>

        {/* =========================
            ĐƠN HÀNG
        ========================= */}

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>
            QUẢN LÝ ĐƠN HÀNG
          </h2>

          {orders.length === 0 ? (
            <div style={styles.empty}>
              Chưa có đơn hàng.
            </div>
          ) : (
            <div style={styles.orderList}>

              {orders.map((order) => (
                <div
                  key={order.id}
                  style={styles.order}
                >

                  <div
                    style={
                      styles.orderTop
                    }
                  >
                    <strong>
                      ĐƠN #{order.id}
                    </strong>

                    <span
                      style={
                        styles.orderStatus
                      }
                    >
                      {order.status}
                    </span>
                  </div>

                  <div style={styles.orderInfo}>
                    <div>
                      Sản phẩm:{" "}
                      <strong>
                        {order.products?.name ||
                          "Không rõ"}
                      </strong>
                    </div>

                    <div>
                      Số tiền:{" "}
                      <strong>
                        {formatPrice(
                          order.amount
                        )}{" "}
                        VNĐ
                      </strong>
                    </div>

                    <div>
                      Thời gian:{" "}
                      {formatDate(
                        order.created_at
                      )}
                    </div>

                    <div
                      style={{
                        wordBreak:
                          "break-all",
                      }}
                    >
                      User ID: {order.user_id}
                    </div>
                  </div>

                  {order.status ===
                    "pending" ||
                    order.status === "paid" ? (
                    <div
                      style={
                        styles.orderButtons
                      }
                    >
                      <button
                        onClick={() =>
                          approveOrder(
                            order.id
                          )
                        }
                        style={
                          styles.approveButton
                        }
                      >
                        DUYỆT + CẤP KEY
                      </button>

                      <button
                        onClick={() =>
                          rejectOrder(
                            order.id
                          )
                        }
                        style={
                          styles.rejectButton
                        }
                      >
                        TỪ CHỐI
                      </button>
                    </div>
                  ) : (
                    <div
                      style={
                        styles.completed
                      }
                    >
                      Đơn đã xử lý
                    </div>
                  )}

                </div>
              ))}

            </div>
          )}
        </section>

      </div>
    </main>
  );
}

// =========================
// STYLE
// =========================

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, #050505 0%, #0d0d0d 100%)",
    color: "#fff",
    padding: "30px 15px 60px",
  },

  container: {
    maxWidth: "900px",
    margin: "0 auto",
  },

  loading: {
    textAlign: "center",
    paddingTop: "100px",
    fontSize: "18px",
  },

  title: {
    textAlign: "center",
    fontSize: "32px",
    fontWeight: "900",
    margin: "0",
    letterSpacing: "2px",
  },

  subtitle: {
    textAlign: "center",
    color: "#888",
    marginBottom: "30px",
  },

  card: {
    background: "#111",
    border: "1px solid #292929",
    borderRadius: "18px",
    padding: "22px",
    marginBottom: "22px",
    boxShadow:
      "0 10px 30px rgba(0,0,0,.25)",
  },

  cardTitle: {
    fontSize: "20px",
    marginTop: 0,
    marginBottom: "20px",
    fontWeight: "800",
  },

  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "800",
    color: "#aaa",
    marginTop: "15px",
    marginBottom: "7px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    borderRadius: "10px",
    border: "1px solid #333",
    background: "#080808",
    color: "#fff",
    outline: "none",
    fontSize: "15px",
  },

  keyBox: {
    width: "100%",
    boxSizing: "border-box",
    padding: "15px",
    borderRadius: "10px",
    border: "1px solid #333",
    background: "#080808",
    color: "#fff",
    outline: "none",
    fontSize: "14px",
    fontFamily: "monospace",
    resize: "vertical",
  },

  hint: {
    color: "#777",
    fontSize: "12px",
    marginTop: "6px",
  },

  buttonRow: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
  },

  primaryButton: {
    flex: 1,
    border: 0,
    borderRadius: "10px",
    padding: "14px",
    background: "#fff",
    color: "#000",
    fontWeight: "900",
    cursor: "pointer",
  },

  secondaryButton: {
    border: 0,
    borderRadius: "10px",
    padding: "14px 20px",
    background: "#333",
    color: "#fff",
    fontWeight: "800",
    cursor: "pointer",
  },

  productList: {
    display: "grid",
    gap: "14px",
  },

  product: {
    border: "1px solid #292929",
    borderRadius: "14px",
    padding: "18px",
    background: "#0b0b0b",
  },

  productHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
  },

  productName: {
    fontSize: "18px",
    fontWeight: "900",
  },

  productDescription: {
    color: "#888",
    marginTop: "5px",
    fontSize: "13px",
  },

  status: {
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: "10px",
    marginTop: "18px",
    paddingTop: "15px",
    borderTop: "1px solid #222",
  },

  infoLabel: {
    display: "block",
    color: "#666",
    fontSize: "10px",
    fontWeight: "800",
    marginBottom: "4px",
  },

  productButtons: {
    display: "flex",
    gap: "8px",
    marginTop: "18px",
  },

  editButton: {
    flex: 1,
    border: 0,
    borderRadius: "9px",
    padding: "11px",
    background: "#222",
    color: "#fff",
    fontWeight: "800",
    cursor: "pointer",
  },

  toggleButton: {
    flex: 1,
    border: 0,
    borderRadius: "9px",
    padding: "11px",
    background: "#18324a",
    color: "#60a5fa",
    fontWeight: "800",
    cursor: "pointer",
  },

  deleteButton: {
    border: 0,
    borderRadius: "9px",
    padding: "11px",
    background: "#3b1515",
    color: "#f87171",
    fontWeight: "800",
    cursor: "pointer",
  },

  empty: {
    color: "#666",
    textAlign: "center",
    padding: "20px",
  },

  orderList: {
    display: "grid",
    gap: "14px",
  },

  order: {
    background: "#0b0b0b",
    border: "1px solid #292929",
    borderRadius: "14px",
    padding: "18px",
  },

  orderTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
  },

  orderStatus: {
    fontSize: "12px",
    color: "#60a5fa",
    fontWeight: "800",
  },

  orderInfo: {
    display: "grid",
    gap: "7px",
    color: "#aaa",
    fontSize: "13px",
    marginTop: "14px",
  },

  orderButtons: {
    display: "flex",
    gap: "10px",
    marginTop: "18px",
  },

  approveButton: {
    flex: 1,
    border: 0,
    borderRadius: "9px",
    padding: "12px",
    background: "#166534",
    color: "#fff",
    fontWeight: "900",
    cursor: "pointer",
  },

  rejectButton: {
    flex: 1,
    border: 0,
    borderRadius: "9px",
    padding: "12px",
    background: "#7f1d1d",
    color: "#fff",
    fontWeight: "900",
    cursor: "pointer",
  },

  completed: {
    marginTop: "15px",
    color: "#777",
    fontSize: "13px",
  },
};
