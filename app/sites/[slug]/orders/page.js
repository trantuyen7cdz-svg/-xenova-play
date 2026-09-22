"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

function formatPrice(value) {
  return (
    new Intl.NumberFormat("vi-VN").format(
      Number(value || 0)
    ) + "đ"
  );
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString(
      "vi-VN"
    );
  } catch {
    return value;
  }
}

function getStatusLabel(status) {
  const value = String(
    status || ""
  ).toLowerCase();

  if (
    value === "completed" ||
    value === "success" ||
    value === "paid"
  ) {
    return "Hoàn thành";
  }

  if (
    value === "pending" ||
    value === "processing"
  ) {
    return "Đang xử lý";
  }

  if (
    value === "cancelled" ||
    value === "canceled"
  ) {
    return "Đã hủy";
  }

  if (
    value === "failed" ||
    value === "error"
  ) {
    return "Thất bại";
  }

  return status || "Chưa xác định";
}

function getStatusClass(status) {
  const value = String(
    status || ""
  ).toLowerCase();

  if (
    value === "completed" ||
    value === "success" ||
    value === "paid"
  ) {
    return "success";
  }

  if (
    value === "cancelled" ||
    value === "canceled" ||
    value === "failed" ||
    value === "error"
  ) {
    return "danger";
  }

  return "pending";
}

export default function WebsiteOrdersPage() {
  const router = useRouter();
  const params = useParams();

  const slug =
    typeof params?.slug === "string"
      ? params.slug
      : "";

  const [user, setUser] = useState(null);
  const [website, setWebsite] = useState(null);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [refreshing, setRefreshing] =
    useState(false);

  /*
  =========================================
  LOAD USER
  =========================================
  */

  async function loadUser() {
    const response = await fetch(
      `/api/sites/${slug}/auth/me`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data?.success ||
      !data?.user
    ) {
      return null;
    }

    return data.user;
  }

  /*
  =========================================
  LOAD ORDERS
  =========================================
  */

  async function loadOrders(
    showRefresh = false
  ) {
    if (!slug) return;

    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      /*
      -----------------------------------------
      KIỂM TRA ĐĂNG NHẬP WEBSITE
      -----------------------------------------
      */

      const userResponse =
        await fetch(
          `/api/sites/${slug}/auth/me`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const userData =
        await userResponse.json();

      if (
        !userResponse.ok ||
        !userData?.success ||
        !userData?.user
      ) {
        router.replace(
          `/sites/${slug}/login`
        );

        return;
      }

      setUser(userData.user);

      /*
      -----------------------------------------
      LẤY ĐƠN HÀNG WEBSITE
      -----------------------------------------
      */

      const response =
        await fetch(
          `/api/sites/${slug}/orders`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (
        response.status === 401
      ) {
        router.replace(
          `/sites/${slug}/login`
        );

        return;
      }

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Không thể tải đơn hàng."
        );
      }

      setWebsite(
        data.website || null
      );

      setOrders(
        Array.isArray(data.orders)
          ? data.orders
          : []
      );
    } catch (err) {
      console.error(
        "WEBSITE ORDERS PAGE ERROR:",
        err
      );

      setError(
        err?.message ||
          "Không thể tải đơn hàng."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [slug]);

  /*
  =========================================
  NAVIGATION
  =========================================
  */

  function goHome() {
    router.push(
      `/sites/${slug}`
    );
  }

  function goShop() {
    router.push(
      `/sites/${slug}/shop`
    );
  }

  function goKeys() {
    router.push(
      `/sites/${slug}/keys`
    );
  }

  function goAccount() {
    router.push(
      `/sites/${slug}/account`
    );
  }

  /*
  =========================================
  LOADING
  =========================================
  */

  if (loading) {
    return (
      <>
        <main className="loading-page">
          <div className="spinner" />

          <p>
            Đang tải đơn hàng...
          </p>
        </main>

        <style jsx>{styles}</style>
      </>
    );
  }

  return (
    <main className="page">

      {/* TOPBAR */}

      <header className="topbar">
        <div className="topbar-inner">

          <button
            className="logo"
            onClick={goHome}
          >
            <span className="logo-icon">
              {website?.name
                ? String(
                    website.name
                  )
                    .trim()
                    .charAt(0)
                    .toUpperCase()
                : "S"}
            </span>

            <span className="logo-name">
              {website?.name ||
                "Shop"}
            </span>
          </button>

          <nav className="nav">

            <button
              onClick={goHome}
            >
              Trang chủ
            </button>

            <button
              onClick={goShop}
            >
              Cửa hàng
            </button>

            <button
              onClick={goKeys}
            >
              Kho KEY
            </button>

            <button className="active">
              Đơn hàng
            </button>

          </nav>

          <button
            className="account"
            onClick={goAccount}
          >
            👤
          </button>

        </div>
      </header>

      {/* CONTENT */}

      <section className="container">

        <div className="heading">

          <div>
            <button
              className="back"
              onClick={goHome}
            >
              ← QUAY LẠI SHOP
            </button>

            <h1>
              Đơn hàng của tôi
            </h1>

            <p>
              {user?.username ||
                user?.email ||
                "Tài khoản"}
            </p>
          </div>

          <button
            className="refresh"
            onClick={() =>
              loadOrders(true)
            }
            disabled={refreshing}
          >
            {refreshing
              ? "ĐANG TẢI..."
              : "↻ LÀM MỚI"}
          </button>

        </div>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {/* EMPTY */}

        {!error &&
          orders.length === 0 && (
            <div className="empty">

              <div className="empty-icon">
                🛒
              </div>

              <h2>
                Chưa có đơn hàng
              </h2>

              <p>
                Bạn chưa mua sản phẩm
                nào tại shop này.
              </p>

              <button
                className="shop-button"
                onClick={goShop}
              >
                ĐI TỚI CỬA HÀNG
              </button>

            </div>
          )}

        {/* ORDERS */}

        {orders.length > 0 && (
          <div className="orders">

            {orders.map(
              (order) => (
                <article
                  key={order.id}
                  className="order-card"
                >

                  <div className="order-top">

                    <div>

                      <span className="order-label">
                        MÃ ĐƠN
                      </span>

                      <strong>
                        #{order.id}
                      </strong>

                    </div>

                    <span
                      className={`status ${getStatusClass(
                        order.status
                      )}`}
                    >
                      {getStatusLabel(
                        order.status
                      )}
                    </span>

                  </div>

                  <div className="order-main">

                    <div className="product-info">

                      {order.product
                        ?.image_url ? (
                        <img
                          src={
                            order
                              .product
                              .image_url
                          }
                          alt={
                            order.product_name ||
                            "Sản phẩm"
                          }
                        />
                      ) : (
                        <div className="product-placeholder">
                          🛒
                        </div>
                      )}

                      <div>

                        <h3>
                          {order.product_name ||
                            order.product
                              ?.name ||
                            "Sản phẩm"}
                        </h3>

                        <p>
                          Số lượng:{" "}
                          {Number(
                            order.quantity ||
                              1
                          )}
                        </p>

                      </div>

                    </div>

                    <div className="price-box">

                      <span>
                        Tổng tiền
                      </span>

                      <strong>
                        {formatPrice(
                          order.total_amount
                        )}
                      </strong>

                    </div>

                  </div>

                  <div className="order-info">

                    <div>
                      <span>
                        Ngày đặt
                      </span>

                      <strong>
                        {formatDate(
                          order.created_at
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Đơn giá
                      </span>

                      <strong>
                        {formatPrice(
                          order.unit_price
                        )}
                      </strong>
                    </div>

                    {order.key_value && (
                      <div>
                        <span>
                          KEY
                        </span>

                        <strong className="key">
                          {order.key_value}
                        </strong>
                      </div>
                    )}

                  </div>

                  <div className="order-actions">

                    <button
                      className="secondary"
                      onClick={() =>
                        router.push(
                          `/sites/${slug}/checkout/${order.id}`
                        )
                      }
                    >
                      XEM CHI TIẾT
                    </button>

                    {order.key_value && (
                      <button
                        className="primary"
                        onClick={() =>
                          navigator.clipboard.writeText(
                            order.key_value
                          )
                        }
                      >
                        📋 SAO CHÉP KEY
                      </button>
                    )}

                  </div>

                </article>
              )
            )}

          </div>
        )}

      </section>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `

* {
  box-sizing: border-box;
}

.page {
  min-height: 100vh;
  background:
    radial-gradient(
      circle at 10% 5%,
      rgba(255,80,170,.12),
      transparent 28%
    ),
    radial-gradient(
      circle at 90% 10%,
      rgba(130,80,255,.10),
      transparent 28%
    ),
    #f7f8fc;

  color: #222;

  font-family:
    Arial,
    Helvetica,
    sans-serif;

  padding-bottom: 70px;
}

/* =========================
   TOPBAR
========================= */

.topbar {
  height: 64px;

  background:
    rgba(255,255,255,.96);

  border-bottom:
    1px solid #eee;

  position: sticky;
  top: 0;

  z-index: 100;

  backdrop-filter:
    blur(15px);
}

.topbar-inner {
  max-width: 1220px;
  height: 100%;

  margin: auto;

  padding:
    0 18px;

  display: flex;

  align-items: center;

  justify-content:
    space-between;

  gap: 15px;
}

.logo {
  border: 0;
  background: transparent;

  display: flex;

  align-items: center;

  gap: 9px;

  cursor: pointer;

  color: #151515;

  font-size: 17px;

  font-weight: 900;
}

.logo-icon {
  width: 37px;
  height: 37px;

  border-radius: 11px;

  display: grid;

  place-items: center;

  background:
    linear-gradient(
      135deg,
      #ff4ba6,
      #8d54ff
    );

  color: white;

  box-shadow:
    0 8px 20px
    rgba(232,61,148,.25);
}

.logo-name {
  max-width: 180px;

  overflow: hidden;

  white-space: nowrap;

  text-overflow: ellipsis;
}

.nav {
  display: flex;

  gap: 4px;
}

.nav button {
  border: 0;

  background:
    transparent;

  padding:
    10px 13px;

  border-radius: 9px;

  cursor: pointer;

  color: #666;

  font-weight: 700;
}

.nav button:hover,
.nav button.active {
  color: #e83d94;

  background:
    #fff0f7;
}

.account {
  width: 40px;
  height: 40px;

  border: 0;

  border-radius: 50%;

  background:
    #222;

  color: white;

  cursor: pointer;

  font-size: 17px;
}

/* =========================
   CONTAINER
========================= */

.container {
  max-width: 1100px;

  margin: auto;

  padding:
    30px 18px;
}

/* =========================
   HEADING
========================= */

.heading {
  display: flex;

  align-items:
    flex-end;

  justify-content:
    space-between;

  gap: 20px;

  margin-bottom:
    22px;
}

.back {
  border: 0;

  background:
    transparent;

  padding: 0;

  color:
    #e83d94;

  cursor: pointer;

  font-size: 11px;

  font-weight: 900;
}

.heading h1 {
  margin:
    8px 0 4px;

  font-size: 27px;
}

.heading p {
  margin: 0;

  color: #999;

  font-size: 12px;
}

.refresh {
  border: 1px solid #eee;

  background: white;

  color: #e83d94;

  border-radius: 9px;

  padding:
    10px 13px;

  cursor: pointer;

  font-size: 10px;

  font-weight: 900;
}

.refresh:disabled {
  opacity: .5;

  cursor:
    not-allowed;
}

/* =========================
   ERROR
========================= */

.error {
  margin-bottom:
    15px;

  padding:
    13px 15px;

  border-radius:
    10px;

  background:
    #fff0f0;

  color:
    #c33;

  font-size:
    12px;
}

/* =========================
   EMPTY
========================= */

.empty {
  min-height:
    390px;

  border:
    1px solid #eee;

  border-radius:
    18px;

  background:
    white;

  display: flex;

  flex-direction:
    column;

  align-items:
    center;

  justify-content:
    center;

  text-align:
    center;
}

.empty-icon {
  width: 70px;
  height: 70px;

  border-radius:
    20px;

  display: grid;

  place-items:
    center;

  background:
    #fff0f7;

  font-size:
    32px;
}

.empty h2 {
  margin:
    15px 0 5px;

  font-size:
    20px;
}

.empty p {
  margin:
    0 0 18px;

  color:
    #999;

  font-size:
    12px;
}

.shop-button {
  border:
    0;

  border-radius:
    9px;

  padding:
    11px 16px;

  background:
    #e83d94;

  color:
    white;

  cursor:
    pointer;

  font-weight:
    900;

  font-size:
    10px;
}

/* =========================
   ORDERS
========================= */

.orders {
  display:
    grid;

  gap:
    14px;
}

.order-card {
  background:
    white;

  border:
    1px solid #eee;

  border-radius:
    17px;

  padding:
    18px;

  box-shadow:
    0 8px 30px
    rgba(30,20,50,.04);
}

/* =========================
   ORDER TOP
========================= */

.order-top {
  display:
    flex;

  align-items:
    center;

  justify-content:
    space-between;

  padding-bottom:
    13px;

  border-bottom:
    1px solid #eee;
}

.order-top > div {
  display:
    flex;

  flex-direction:
    column;

  gap: 3px;
}

.order-label {
  color:
    #aaa;

  font-size:
    8px;

  font-weight:
    900;
}

.order-top strong {
  font-size:
    14px;
}

.status {
  padding:
    6px 9px;

  border-radius:
    999px;

  font-size:
    9px;

  font-weight:
    900;
}

.status.success {
  color:
    #159957;

  background:
    #e9fff1;
}

.status.pending {
  color:
    #a36a00;

  background:
    #fff5d9;
}

.status.danger {
  color:
    #c33;

  background:
    #fff0f0;
}

/* =========================
   ORDER MAIN
========================= */

.order-main {
  display:
    flex;

  align-items:
    center;

  justify-content:
    space-between;

  gap:
    20px;

  padding:
    17px 0;
}

.product-info {
  display:
    flex;

  align-items:
    center;

  gap:
    12px;

  min-width:
    0;
}

.product-info img,
.product-placeholder {
  width:
    62px;

  height:
    62px;

  flex:
    0 0 62px;

  border-radius:
    12px;

  object-fit:
    cover;
}

.product-placeholder {
  display:
    grid;

  place-items:
    center;

  background:
    linear-gradient(
      135deg,
      #f7edf4,
      #eeeafd
    );

  font-size:
    25px;
}

.product-info h3 {
  margin:
    0 0 5px;

  font-size:
    14px;

  white-space:
    nowrap;

  overflow:
    hidden;

  text-overflow:
    ellipsis;
}

.product-info p {
  margin:
    0;

  color:
    #999;

  font-size:
    10px;
}

.price-box {
  text-align:
    right;

  flex:
    0 0 auto;
}

.price-box span {
  display:
    block;

  color:
    #aaa;

  font-size:
    9px;

  margin-bottom:
    4px;
}

.price-box strong {
  color:
    #e52f8d;

  font-size:
    17px;
}

/* =========================
   ORDER INFO
========================= */

.order-info {
  display:
    grid;

  grid-template-columns:
    repeat(3,1fr);

  gap:
    10px;

  padding:
    13px 0;

  border-top:
    1px solid #eee;

  border-bottom:
    1px solid #eee;
}

.order-info > div {
  min-width:
    0;
}

.order-info span {
  display:
    block;

  color:
    #aaa;

  font-size:
    9px;

  margin-bottom:
    5px;
}

.order-info strong {
  display:
    block;

  font-size:
    11px;

  overflow:
    hidden;

  text-overflow:
    ellipsis;

  white-space:
    nowrap;
}

.order-info .key {
  color:
    #e83d94;
}

/* =========================
   ACTIONS
========================= */

.order-actions {
  display:
    flex;

  justify-content:
    flex-end;

  gap:
    8px;

  padding-top:
    14px;
}

.order-actions button {
  border:
    0;

  border-radius:
    8px;

  padding:
    9px 12px;

  cursor:
    pointer;

  font-size:
    9px;

  font-weight:
    900;
}

.secondary {
  background:
    #f3f3f6;

  color:
    #555;
}

.primary {
  background:
    #e83d94;

  color:
    white;
}

/* =========================
   LOADING
========================= */

.loading-page {
  min-height:
    100vh;

  display:
    grid;

  place-items:
    center;

  align-content:
    center;

  gap:
    12px;

  background:
    #f7f8fc;

  color:
    #888;

  font-family:
    Arial,
    Helvetica,
    sans-serif;
}

.spinner {
  width:
    40px;

  height:
    40px;

  border:
    4px solid #eee;

  border-top-color:
    #e83d94;

  border-radius:
    50%;

  animation:
    spin .8s linear infinite;
}

@keyframes spin {
  to {
    transform:
      rotate(360deg);
  }
}

/* =========================
   MOBILE
========================= */

@media (max-width: 760px) {

  .topbar {
    height:
      58px;
  }

  .topbar-inner {
    padding:
      0 11px;
  }

  .nav {
    display:
      none;
  }

  .logo-name {
    max-width:
      145px;
  }

  .container {
    padding:
      20px 12px;
  }

  .heading {
    align-items:
      flex-start;
  }

  .heading h1 {
    font-size:
      22px;
  }

  .order-main {
    align-items:
      flex-start;
  }

  .product-info {
    min-width:
      0;
  }

  .product-info img,
  .product-placeholder {
    width:
      52px;

    height:
      52px;

    flex-basis:
      52px;
  }

  .product-info h3 {
    max-width:
      145px;
  }

  .price-box strong {
    font-size:
      14px;
  }

  .order-info {
    grid-template-columns:
      1fr 1fr;
  }

  .order-info > div:last-child {
    grid-column:
      1 / -1;
  }

  .order-actions {
    display:
      grid;

    grid-template-columns:
      1fr 1fr;
  }

  .order-actions button {
    width:
      100%;
  }
}

@media (max-width: 390px) {

  .order-card {
    padding:
      13px;
  }

  .order-main {
    gap:
      8px;
  }

  .product-info img,
  .product-placeholder {
    width:
      45px;

    height:
      45px;

    flex-basis:
      45px;
  }

  .product-info h3 {
    max-width:
      120px;

    font-size:
      12px;
  }

  .price-box strong {
    font-size:
      12px;
  }
}
`;
