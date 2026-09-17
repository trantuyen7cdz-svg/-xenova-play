"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
const QR_URL =
  "https://cdn.phototourl.com/free/2026-09-17-f1d7860e-7807-484d-8bdf-6c19a2e65661.jpg";
export default function PaymentPage() {
  const [product, setProduct] = useState(null);
  const [user, setUser] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    loadPayment();
  }, []);
  async function loadPayment() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setUser(user);
      const params = new URLSearchParams(
        window.location.search
      );
      const productId = params.get("product");
      const orderId = params.get("id");
      /*
       * Nếu đã có ID đơn hàng
       */
      if (orderId) {
        const { data, error } = await supabase
          .from("orders")
          .select(
            `
            id,
            user_id,
            product_id,
            amount,
            status,
            created_at,
            products (
              id,
              name,
              description,
              price,
              duration_days
            )
            `
          )
          .eq("id", orderId)
          .eq("user_id", user.id)
          .single();
        if (error || !data) {
          console.error(error);
          setMessage("Không tìm thấy đơn hàng.");
          setLoading(false);
          return;
        }
        setOrder(data);
        setProduct(data.products);
        setLoading(false);
        return;
      }
      /*
       * Nếu đi trực tiếp từ Shop
       */
      if (productId) {
        const { data, error } = await supabase
          .from("products")
          .select(
            "id,name,description,price,duration_days,active,is_active"
          )
          .eq("id", productId)
          .eq("active", true)
          .single();
        if (error || !data) {
          console.error(error);
          setMessage(
            "Không tìm thấy sản phẩm hoặc sản phẩm đã ngừng bán."
          );
          setLoading(false);
          return;
        }
        setProduct(data);
        setLoading(false);
        return;
      }
      setMessage("Không tìm thấy mã sản phẩm.");
      setLoading(false);
    } catch (error) {
      console.error(error);
      setMessage(
        "Đã xảy ra lỗi khi tải trang thanh toán."
      );
      setLoading(false);
    }
  }
  async function createOrder() {
    if (!user || !product || creating) return;
    setCreating(true);
    setMessage("");
    const { data, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        product_id: product.id,
        amount: Number(product.price || 0),
        status: "pending",
      })
      .select(
        `
        id,
        user_id,
        product_id,
        amount,
        status,
        created_at,
        products (
          id,
          name,
          description,
          price,
          duration_days
        )
        `
      )
      .single();
    if (error) {
      console.error(error);
      setMessage(
        "Không tạo được đơn hàng: " +
          error.message
      );
      setCreating(false);
      return;
    }
    setOrder(data);
    setProduct(data.products);
    setCreating(false);
    /*
     * Giữ URL theo mã đơn hàng
     */
    window.history.replaceState(
      {},
      "",
      "/payment?id=" + data.id
    );
  }
  async function confirmPayment() {
    if (!order) {
      setMessage(
        "Bạn cần tạo đơn hàng trước."
      );
      return;
    }
    setConfirmed(true);
    setMessage(
      "Đã ghi nhận yêu cầu. Đơn hàng đang chờ Admin kiểm tra thanh toán."
    );
  }
  function formatDate(date) {
    if (!date) return "";
    return new Date(date).toLocaleString(
      "vi-VN"
    );
  }
  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          ĐANG TẢI TRANG THANH TOÁN...
        </div>
      </main>
    );
  }
  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <a
          href="/shop"
          style={styles.back}
        >
          ← QUAY LẠI SHOP
        </a>
        <header style={styles.header}>
          <div style={styles.logo}>
            XENOVA PLAY
          </div>
          <h1 style={styles.title}>
            THANH TOÁN
          </h1>
          <p style={styles.subtitle}>
            Thanh toán đơn hàng của bạn
          </p>
        </header>
        {message && (
          <div
            style={{
              ...styles.message,
              color: confirmed
                ? "#69ff96"
                : "#ff7777",
              borderColor: confirmed
                ? "#176b35"
                : "#632020",
              background: confirmed
                ? "#0c2113"
                : "#210d0d",
            }}
          >
            {confirmed ? "✅ " : "❌ "}
            {message}
          </div>
        )}
        {product && (
          <>
            {/* THÔNG TIN SẢN PHẨM */}
            <section style={styles.card}>
              <div style={styles.label}>
                XENOVA KEY
              </div>
              <h2 style={styles.productName}>
                {product.name}
              </h2>
              <p style={styles.description}>
                {product.description ||
                  "Key sử dụng cho XENOVA PLAY"}
              </p>
              <div style={styles.price}>
                {Number(
                  product.price || 0
                ).toLocaleString("vi-VN")}
                ₫
              </div>
              <div style={styles.duration}>
                Thời hạn:{" "}
                <b>
                  {product.duration_days} ngày
                </b>
              </div>
            </section>
            {/* TẠO ĐƠN */}
            {!order && (
              <section style={styles.card}>
                <h2 style={styles.sectionTitle}>
                  🧾 TẠO ĐƠN HÀNG
                </h2>
                <p style={styles.gray}>
                  Tạo đơn hàng để nhận mã đơn
                  và tiến hành thanh toán.
                </p>
                <button
                  onClick={createOrder}
                  disabled={creating}
                  style={{
                    ...styles.button,
                    opacity: creating ? 0.6 : 1,
                  }}
                >
                  {creating
                    ? "ĐANG TẠO ĐƠN..."
                    : "TẠO ĐƠN HÀNG"}
                </button>
              </section>
            )}
            {/* THANH TOÁN */}
            {order && (
              <section style={styles.card}>
                <div style={styles.orderBox}>
                  <span>MÃ ĐƠN HÀNG</span>
                  <strong>
                    #{order.id}
                  </strong>
                </div>
                <h2 style={styles.sectionTitle}>
                  💳 THÔNG TIN THANH TOÁN
                </h2>
                <div style={styles.qrBox}>
                  <img
                    src={QR_URL}
                    alt="QR thanh toán Vietcombank"
                    style={styles.qr}
                  />
                </div>
                <div style={styles.bankInfo}>
                  <div style={styles.infoRow}>
                    <span>NGÂN HÀNG</span>
                    <strong>
                      VIETCOMBANK
                    </strong>
                  </div>
                  <div style={styles.infoRow}>
                    <span>SỐ TÀI KHOẢN</span>
                    <strong>
                      9365717262
                    </strong>
                  </div>
                  <div style={styles.infoRow}>
                    <span>CHỦ TÀI KHOẢN</span>
                    <strong>
                      TRAN VAN TUYEN
                    </strong>
                  </div>
                  <div style={styles.infoRow}>
                    <span>SỐ TIỀN</span>
                    <strong style={styles.red}>
                      {Number(
                        order.amount || 0
                      ).toLocaleString("vi-VN")}
                      ₫
                    </strong>
                  </div>
                  <div style={styles.infoRow}>
                    <span>NỘI DUNG</span>
                    <strong>
                      XENOVA {order.id}
                    </strong>
                  </div>
                </div>
                <div style={styles.notice}>
                  ⚠️ Vui lòng chuyển đúng số tiền
                  và ghi đúng nội dung chuyển khoản
                  để Admin có thể kiểm tra đơn hàng.
                </div>
                {order.status === "pending" && (
                  <button
                    onClick={confirmPayment}
                    disabled={confirmed}
                    style={{
                      ...styles.button,
                      marginTop: "18px",
                      opacity: confirmed
                        ? 0.6
                        : 1,
                    }}
                  >
                    {confirmed
                      ? "ĐÃ GỬI YÊU CẦU"
                      : "TÔI ĐÃ CHUYỂN KHOẢN"}
                  </button>
                )}
                {order.status !== "pending" && (
                  <div style={styles.status}>
                    TRẠNG THÁI:{" "}
                    {order.status}
                  </div>
                )}
                <div style={styles.created}>
                  Tạo đơn:{" "}
                  {formatDate(
                    order.created_at
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #25060d, #080808 45%, #030303)",
    color: "#fff",
    padding: "25px 15px 60px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },
  container: {
    width: "100%",
    maxWidth: "650px",
    margin: "0 auto",
  },
  loading: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ff1744",
    fontWeight: "900",
  },
  back: {
    color: "#aaa",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: "700",
  },
  header: {
    marginTop: "30px",
    marginBottom: "20px",
  },
  logo: {
    color: "#ff1744",
    fontSize: "13px",
    fontWeight: "900",
    letterSpacing: "3px",
  },
  title: {
    margin: "7px 0",
    fontSize: "40px",
    fontWeight: "900",
  },
  subtitle: {
    color: "#777",
    margin: 0,
  },
  message: {
    marginBottom: "15px",
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid",
    lineHeight: 1.5,
  },
  card: {
    marginTop: "15px",
    padding: "22px",
    borderRadius: "18px",
    border: "1px solid #292929",
    background: "#101010",
  },
  label: {
    color: "#ff1744",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "2px",
  },
  productName: {
    margin: "10px 0 8px",
    fontSize: "25px",
    fontWeight: "900",
  },
  description: {
    color: "#888",
    lineHeight: 1.6,
    margin: 0,
  },
  price: {
    marginTop: "18px",
    color: "#ff1744",
    fontSize: "32px",
    fontWeight: "900",
  },
  duration: {
    marginTop: "8px",
    color: "#777",
  },
  sectionTitle: {
    margin: "0 0 10px",
    fontSize: "20px",
    fontWeight: "900",
  },
  gray: {
    color: "#888",
    lineHeight: 1.6,
  },
  button: {
    width: "100%",
    padding: "16px",
    border: "none",
    borderRadius: "11px",
    background:
      "linear-gradient(90deg, #ff1744, #d50032)",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "900",
    cursor: "pointer",
  },
  orderBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    padding: "13px 15px",
    marginBottom: "20px",
    borderRadius: "10px",
    background: "#181818",
    border: "1px solid #292929",
  },
  qrBox: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin: "20px auto",
    padding: "12px",
    width: "fit-content",
    background: "#fff",
    borderRadius: "12px",
  },
  qr: {
    display: "block",
    width: "280px",
    height: "280px",
    objectFit: "contain",
  },
  bankInfo: {
    marginTop: "20px",
    border: "1px solid #292929",
    borderRadius: "12px",
    overflow: "hidden",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    padding: "14px",
    borderBottom: "1px solid #222",
  },
  red: {
    color: "#ff1744",
  },
  notice: {
    marginTop: "15px",
    padding: "14px",
    borderRadius: "10px",
    background: "#241b08",
    border: "1px solid #554014",
    color: "#ffc857",
    fontSize: "13px",
    lineHeight: 1.5,
  },
  status: {
    marginTop: "18px",
    padding: "14px",
    borderRadius: "10px",
    background: "#171717",
    color: "#ffb000",
    textAlign: "center",
    fontWeight: "900",
  },
  created: {
    marginTop: "15px",
    color: "#555",
    fontSize: "12px",
    textAlign: "center",
  },
};
