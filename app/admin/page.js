“use client”;

import { useEffect, useState } from “react”;
import { supabase } from “../../lib/supabase”;
import styles from “./admin.module.css”;

export default function AdminPage() {
const [loading, setLoading] = useState(true);
const [allowed, setAllowed] = useState(false);
const [user, setUser] = useState(null);

const [products, setProducts] = useState([]);
const [orders, setOrders] = useState([]);

const [loadingProducts, setLoadingProducts] = useState(false);
const [loadingOrders, setLoadingOrders] = useState(false);
const [processingOrder, setProcessingOrder] = useState(null);

const [form, setForm] = useState({
name: “”,
description: “”,
price: “”,
duration_days: “”,
});

const [editingId, setEditingId] = useState(null);
const [message, setMessage] = useState(””);

useEffect(() => {
checkAdmin();
}, []);

async function checkAdmin() {
const {
data: { user },
} = await supabase.auth.getUser();

if (!user) {
  window.location.href = "/";
  return;
}
const { data: profile, error } = await supabase
  .from("profiles")
  .select("role")
  .eq("id", user.id)
  .single();
if (error || profile?.role !== "admin") {
  setAllowed(false);
  setLoading(false);
  return;
}
setUser(user);
setAllowed(true);
await loadProducts();
await loadOrders();
setLoading(false);

}

async function loadProducts() {
setLoadingProducts(true);

const { data, error } = await supabase
  .from("products")
  .select("*")
  .order("created_at", {
    ascending: false,
  });
if (error) {
  setMessage(
    "Không tải được sản phẩm: " + error.message
  );
} else {
  setProducts(data || []);
}
setLoadingProducts(false);

}

async function loadOrders() {
setLoadingOrders(true);

const { data, error } = await supabase
  .from("orders")
  .select(`
    id,
    user_id,
    product_id,
    amount,
    status,
    created_at,
    updated_at,
    products (
      id,
      name,
      duration_days
    )
  `)
  .order("created_at", {
    ascending: false,
  });
if (error) {
  setMessage(
    "Không tải được đơn hàng: " + error.message
  );
  setOrders([]);
} else {
  setOrders(data || []);
}
setLoadingOrders(false);

}

function resetForm() {
setForm({
name: “”,
description: “”,
price: “”,
duration_days: “”,
});

setEditingId(null);

}

function editProduct(product) {
setEditingId(product.id);

setForm({
  name: product.name || "",
  description: product.description || "",
  price: product.price ?? "",
  duration_days: product.duration_days ?? "",
});
window.scrollTo({
  top: 0,
  behavior: "smooth",
});

}

async function saveProduct(event) {
event.preventDefault();
setMessage(””);

if (!form.name.trim()) {
  setMessage("Vui lòng nhập tên sản phẩm.");
  return;
}
if (!form.price || Number(form.price) < 0) {
  setMessage("Giá sản phẩm không hợp lệ.");
  return;
}
if (
  !form.duration_days ||
  Number(form.duration_days) <= 0
) {
  setMessage("Thời hạn KEY không hợp lệ.");
  return;
}
const productData = {
  name: form.name.trim(),
  description: form.description.trim(),
  price: Number(form.price),
  duration_days: Number(form.duration_days),
};
if (editingId) {
  const { error } = await supabase
    .from("products")
    .update(productData)
    .eq("id", editingId);
  if (error) {
    setMessage(
      "Không cập nhật được: " + error.message
    );
    return;
  }
  setMessage("Cập nhật sản phẩm thành công.");
} else {
  const { error } = await supabase
    .from("products")
    .insert({
      ...productData,
      active: true,
      is_active: true,
    });
  if (error) {
    setMessage(
      "Không thêm được sản phẩm: " +
        error.message
    );
    return;
  }
  setMessage("Thêm sản phẩm thành công.");
}
resetForm();
await loadProducts();

}

async function toggleProduct(product) {
const newValue = !product.is_active;

const { error } = await supabase
  .from("products")
  .update({
    is_active: newValue,
    active: newValue,
  })
  .eq("id", product.id);
if (error) {
  setMessage(
    "Không thay đổi được trạng thái: " +
      error.message
  );
  return;
}
await loadProducts();

}

async function deleteProduct(product) {
const ok = window.confirm(
Bạn có chắc muốn xóa sản phẩm "${product.name}" không?
);

if (!ok) return;
const { error } = await supabase
  .from("products")
  .delete()
  .eq("id", product.id);
if (error) {
  setMessage(
    "Không thể xóa sản phẩm: " +
      error.message
  );
  return;
}
setMessage("Đã xóa sản phẩm.");
await loadProducts();

}

async function approveOrder(order) {
if (processingOrder) return;

const ok = window.confirm(
  `Duyệt đơn #${order.id}?\n\n` +
    `Sản phẩm: ${
      order.products?.name || "Không xác định"
    }\n` +
    `Số tiền: ${Number(
      order.amount || 0
    ).toLocaleString("vi-VN")} ₫`
);
if (!ok) return;
setProcessingOrder(order.id);
setMessage("");
const { data, error } = await supabase
  .from("orders")
  .update({
    status: "paid",
    updated_at: new Date().toISOString(),
  })
  .eq("id", order.id)
  .eq("status", "pending")
  .select()
  .single();
if (error) {
  console.error(error);
  setMessage(
    "Không duyệt được đơn #" +
      order.id +
      ": " +
      error.message
  );
  setProcessingOrder(null);
  return;
}
if (!data) {
  setMessage(
    "Đơn #" +
      order.id +
      " không còn ở trạng thái chờ duyệt."
  );
  await loadOrders();
  setProcessingOrder(null);
  return;
}
setMessage(
  "Đã duyệt đơn #" +
    order.id +
    " thành công."
);
await loadOrders();
setProcessingOrder(null);

}

async function rejectOrder(order) {
if (processingOrder) return;

const ok = window.confirm(
  `Từ chối đơn #${order.id}?`
);
if (!ok) return;
setProcessingOrder(order.id);
setMessage("");
const { data, error } = await supabase
  .from("orders")
  .update({
    status: "rejected",
    updated_at: new Date().toISOString(),
  })
  .eq("id", order.id)
  .eq("status", "pending")
  .select()
  .single();
if (error) {
  console.error(error);
  setMessage(
    "Không từ chối được đơn #" +
      order.id +
      ": " +
      error.message
  );
  setProcessingOrder(null);
  return;
}
if (!data) {
  setMessage(
    "Đơn #" +
      order.id +
      " không còn ở trạng thái chờ duyệt."
  );
  await loadOrders();
  setProcessingOrder(null);
  return;
}
setMessage(
  "Đã từ chối đơn #" +
    order.id +
    "."
);
await loadOrders();
setProcessingOrder(null);

}

function formatDate(date) {
if (!date) return “—”;

return new Date(date).toLocaleString(
  "vi-VN"
);

}

function getStatusText(status) {
if (status === “paid”) return “ĐÃ DUYỆT”;
if (status === “pending”) return “CHỜ DUYỆT”;
if (status === “rejected”) return “ĐÃ TỪ CHỐI”;
if (status === “cancelled”) return “ĐÃ HỦY”;

return String(status || "KHÔNG RÕ").toUpperCase();

}

if (loading) {
return (
Đang kiểm tra quyền Admin…
);
}

if (!allowed) {
return (
Không có quyền

      <p>
        Tài khoản này không phải Admin.
      </p>
      <a href="/dashboard">
        ← Quay lại Dashboard
      </a>
    </div>
  </main>
);

}

const pendingOrders = orders.filter(
(order) => order.status === “pending”
);

return (
    <header className={styles.adminHeader}>
      <div>
        <div className={styles.logo}>
          XENOVA PLAY
        </div>
        <h1 className={styles.title}>
          ADMIN PANEL
        </h1>
        <p className={styles.email}>
          {user?.email}
        </p>
      </div>
      <a
        href="/dashboard"
        className={styles.backButton}
      >
        ← Dashboard
      </a>
    </header>
    {message && (
      <div className={styles.message}>
        {message}
      </div>
    )}
    <div className={styles.menuGrid}>
      <a
        href="#products"
        className={styles.menuCard}
      >
        <span className={styles.menuIcon}>
          📦
        </span>
        <span className={styles.menuTitle}>
          Sản phẩm
        </span>
        <span className={styles.menuDescription}>
          Quản lý các gói KEY
        </span>
      </a>
      <a
        href="#keys"
        className={styles.menuCard}
      >
        <span className={styles.menuIcon}>
          🔑
        </span>
        <span className={styles.menuTitle}>
          KEY
        </span>
        <span className={styles.menuDescription}>
          Tạo và quản lý KEY
        </span>
      </a>
      <a
        href="#users"
        className={styles.menuCard}
      >
        <span className={styles.menuIcon}>
          👤
        </span>
        <span className={styles.menuTitle}>
          Người dùng
        </span>
        <span className={styles.menuDescription}>
          Quản lý tài khoản
        </span>
      </a>
      <a
        href="#orders"
        className={styles.menuCard}
      >
        <span className={styles.menuIcon}>
          🧾
        </span>
        <span className={styles.menuTitle}>
          Đơn hàng
        </span>
        <span className={styles.menuDescription}>
          Quản lý giao dịch
        </span>
      </a>
    </div>
    <section
      id="products"
      className={styles.section}
    >
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>
            📦 Quản lý sản phẩm
          </h2>
          <p className={styles.sectionText}>
            Thêm và quản lý các gói KEY.
          </p>
        </div>
        <span className={styles.countBadge}>
          {products.length} sản phẩm
        </span>
      </div>
      <form
        onSubmit={saveProduct}
        className={styles.form}
      >
        <h3>
          {editingId
            ? "✏️ Sửa sản phẩm"
            : "➕ Thêm sản phẩm"}
        </h3>
        <input
          className={styles.input}
          placeholder="Tên sản phẩm"
          value={form.name}
          onChange={(e) =>
            setForm({
              ...form,
              name: e.target.value,
            })
          }
        />
        <textarea
          className={styles.textarea}
          placeholder="Mô tả sản phẩm"
          value={form.description}
          onChange={(e) =>
            setForm({
              ...form,
              description: e.target.value,
            })
          }
        />
        <div className={styles.formGrid}>
          <input
            className={styles.input}
            type="number"
            min="0"
            placeholder="Giá"
            value={form.price}
            onChange={(e) =>
              setForm({
                ...form,
                price: e.target.value,
              })
            }
          />
          <input
            className={styles.input}
            type="number"
            min="1"
            placeholder="Số ngày"
            value={form.duration_days}
            onChange={(e) =>
              setForm({
                ...form,
                duration_days: e.target.value,
              })
            }
          />
        </div>
        <div className={styles.formButtons}>
          <button
            type="submit"
            className={styles.primaryButton}
          >
            {editingId
              ? "💾 LƯU THAY ĐỔI"
              : "➕ THÊM SẢN PHẨM"}
          </button>
          {editingId && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={resetForm}
            >
              HỦY
            </button>
          )}
        </div>
      </form>
      <div className={styles.productList}>
        {loadingProducts && (
          <div className={styles.empty}>
            Đang tải sản phẩm...
          </div>
        )}
        {!loadingProducts &&
          products.length === 0 && (
            <div className={styles.empty}>
              Chưa có sản phẩm nào.
            </div>
          )}
        {!loadingProducts &&
          products.map((product) => (
            <div
              key={product.id}
              className={styles.productItem}
            >
              <div>
                <div className={styles.productName}>
                  {product.name}
                </div>
                <div className={styles.productDescription}>
                  {product.description ||
                    "Không có mô tả"}
                </div>
                <div className={styles.productMeta}>
                  <b>
                    {Number(
                      product.price || 0
                    ).toLocaleString("vi-VN")}
                    ₫
                  </b>
                  <span>
                    {product.duration_days} ngày
                  </span>
                  <span
                    className={
                      product.is_active
                        ? styles.active
                        : styles.inactive
                    }
                  >
                    {product.is_active
                      ? "ĐANG BÁN"
                      : "ĐÃ TẮT"}
                  </span>
                </div>
              </div>
              <div className={styles.productActions}>
                <button
                  className={styles.smallButton}
                  onClick={() =>
                    editProduct(product)
                  }
                >
                  ✏️ Sửa
                </button>
                <button
                  className={styles.smallButton}
                  onClick={() =>
                    toggleProduct(product)
                  }
                >
                  {product.is_active
                    ? "⛔ Tắt"
                    : "✅ Bật"}
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={() =>
                    deleteProduct(product)
                  }
                >
                  🗑 Xóa
                </button>
              </div>
            </div>
          ))}
      </div>
    </section>
    <section
      id="keys"
      className={styles.section}
    >
      <h2 className={styles.sectionTitle}>
        🔑 Quản lý KEY
      </h2>
      <p className={styles.sectionText}>
        Phần tạo và quản lý KEY sẽ được kết nối
        tiếp theo.
      </p>
      <span className={styles.badge}>
        ĐANG PHÁT TRIỂN
      </span>
    </section>
    <section
      id="users"
      className={styles.section}
    >
      <h2 className={styles.sectionTitle}>
        👤 Người dùng
      </h2>
      <p className={styles.sectionText}>
        Phần quản lý người dùng sẽ được kết nối
        tiếp theo.
      </p>
      <span className={styles.badge}>
        ĐANG PHÁT TRIỂN
      </span>
    </section>
    <section
      id="orders"
      className={styles.section}
    >
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>
            🧾 Quản lý đơn hàng
          </h2>
          <p className={styles.sectionText}>
            Kiểm tra và duyệt đơn hàng.
          </p>
        </div>
        <span className={styles.countBadge}>
          {pendingOrders.length} chờ duyệt
        </span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "16px",
        }}
      >
        <button
          className={styles.smallButton}
          onClick={loadOrders}
          disabled={loadingOrders}
        >
          🔄{" "}
          {loadingOrders
            ? "Đang tải..."
            : "Làm mới"}
        </button>
      </div>
      {loadingOrders && (
        <div className={styles.empty}>
          Đang tải đơn hàng...
        </div>
      )}
      {!loadingOrders &&
        orders.length === 0 && (
          <div className={styles.empty}>
            Chưa có đơn hàng nào.
          </div>
        )}
      {!loadingOrders &&
        orders.length > 0 && (
          <div className={styles.productList}>
            {orders.map((order) => (
              <div
                key={order.id}
                className={styles.productItem}
              >
                <div>
                  <div className={styles.productName}>
                    Đơn #{order.id}
                  </div>
                  <div
                    className={
                      styles.productDescription
                    }
                  >
                    Sản phẩm:{" "}
                    <b>
                      {order.products?.name ||
                        "Không xác định"}
                    </b>
                  </div>
                  <div
                    className={
                      styles.productDescription
                    }
                  >
                    User ID:{" "}
                    {order.user_id ||
                      "Không xác định"}
                  </div>
                  <div className={styles.productMeta}>
                    <b>
                      {Number(
                        order.amount || 0
                      ).toLocaleString(
                        "vi-VN"
                      )}
                      ₫
                    </b>
                    <span>
                      {order.products
                        ?.duration_days ||
                        "?"}{" "}
                      ngày
                    </span>
                    <span>
                      Tạo:{" "}
                      {formatDate(
                        order.created_at
                      )}
                    </span>
                    <span
                      className={
                        order.status === "paid"
                          ? styles.active
                          : order.status === "pending"
                          ? styles.badge
                          : styles.inactive
                      }
                    >
                      {getStatusText(
                        order.status
                      )}
                    </span>
                  </div>
                </div>
                {order.status === "pending" && (
                  <div
                    className={
                      styles.productActions
                    }
                  >
                    <button
                      className={
                        styles.primaryButton
                      }
                      onClick={() =>
                        approveOrder(order)
                      }
                      disabled={
                        processingOrder ===
                        order.id
                      }
                    >
                      {processingOrder ===
                      order.id
                        ? "ĐANG XỬ LÝ..."
                        : "✅ DUYỆT ĐƠN"}
                    </button>
                    <button
                      className={
                        styles.deleteButton
                      }
                      onClick={() =>
                        rejectOrder(order)
                      }
                      disabled={
                        processingOrder ===
                        order.id
                      }
                    >
                      ❌ TỪ CHỐI
                    </button>
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
