"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("vi-VN");
  } catch {
    return "—";
  }
}

function getStatusText(status) {
  const value = String(status || "").toLowerCase();

  if (value === "available") return "Chưa sử dụng";
  if (value === "sold") return "Đã bán";
  if (value === "used") return "Đã sử dụng";
  if (value === "expired") return "Hết hạn";

  return status || "Không rõ";
}

function getStatusClass(status) {
  const value = String(status || "").toLowerCase();

  if (value === "available") return "available";
  if (value === "sold") return "sold";
  if (value === "used") return "used";
  if (value === "expired") return "expired";

  return "";
}

export default function WebsiteKeysPage() {
  const router = useRouter();
  const params = useParams();

  const slug = params?.slug;

  const [website, setWebsite] = useState(null);
  const [user, setUser] = useState(null);
  const [keys, setKeys] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPage() {
    try {
      setLoading(true);
      setError("");

      if (!slug) {
        throw new Error("Không xác định được website.");
      }

      /*
       * ================================
       * WEBSITE
       * ================================
       */

      const websiteResponse = await fetch(
        `/api/sites/${slug}/catalog`,
        {
          cache: "no-store",
        }
      );

      /*
       * ================================
       * USER
       * ================================
       */

      const userResponse = await fetch(
        `/api/sites/${slug}/auth/me`,
        {
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
       * ================================
       * LOAD WEBSITE KEYS
       * ================================
       */

      const keysResponse = await fetch(
        `/api/sites/${slug}/keys`,
        {
          cache: "no-store",
        }
      );

      const keysData =
        await keysResponse.json();

      if (!keysResponse.ok) {
        throw new Error(
          keysData?.error ||
            keysData?.message ||
            "Không tải được kho KEY."
        );
      }

      setKeys(
        Array.isArray(keysData?.keys)
          ? keysData.keys
          : []
      );

      /*
       * catalog chỉ được gọi để đảm bảo
       * website slug còn tồn tại.
       */
      if (!websiteResponse.ok) {
        throw new Error(
          "Website không tồn tại hoặc đã bị tắt."
        );
      }

      setWebsite({
        slug,
      });
    } catch (err) {
      console.error(
        "WEBSITE KEYS ERROR:",
        err
      );

      setError(
        err?.message ||
          "Không thể tải kho KEY."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, [slug]);

  async function logout() {
    try {
      await fetch(
        `/api/sites/${slug}/auth/logout`,
        {
          method: "POST",
        }
      );
    } catch (error) {
      console.error(
        "LOGOUT ERROR:",
        error
      );
    }

    router.replace(
      `/sites/${slug}/login`
    );
  }

  if (loading) {
    return (
      <>
        <div className="loading">
          <div className="spinner" />

          <p>
            Đang tải kho KEY...
          </p>
        </div>

        <style jsx>{styles}</style>
      </>
    );
  }

  return (
    <main className="page">

      <header className="topbar">
        <div className="topbar-inner">

          <button
            className="brand"
            onClick={() =>
              router.push(
                `/sites/${slug}`
              )
            }
          >
            <div className="brand-icon">
              🔑
            </div>

            <div>
              <strong>
                KHO KEY
              </strong>

              <span>
                {slug}
              </span>
            </div>
          </button>

          <nav>
            <button
              onClick={() =>
                router.push(
                  `/sites/${slug}`
                )
              }
            >
              Trang chủ
            </button>

            <button
              className="active"
            >
              Kho KEY
            </button>

            <button
              onClick={() =>
                router.push(
                  `/sites/${slug}/orders`
                )
              }
            >
              Đơn hàng
            </button>

            <button
              onClick={() =>
                router.push(
                  `/sites/${slug}/account`
                )
              }
            >
              Tài khoản
            </button>
          </nav>

          {user && (
            <button
              className="logout"
              onClick={logout}
            >
              Đăng xuất
            </button>
          )}
        </div>
      </header>

      <section className="container">

        <div className="heading">
          <div>
            <button
              className="back"
              onClick={() =>
                router.push(
                  `/sites/${slug}`
                )
              }
            >
              ← QUAY LẠI
            </button>

            <h1>
              Kho KEY của tôi
            </h1>

            <p>
              Các KEY thuộc tài khoản
              của website này.
            </p>
          </div>

          <div className="count">
            {keys.length} KEY
          </div>
        </div>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {!error &&
          keys.length === 0 && (
            <div className="empty">
              <div className="empty-icon">
                🔑
              </div>

              <h2>
                Chưa có KEY
              </h2>

              <p>
                Bạn chưa có KEY nào
                trong website này.
              </p>

              <button
                onClick={() =>
                  router.push(
                    `/sites/${slug}`
                  )
                }
              >
                ĐẾN CỬA HÀNG
              </button>
            </div>
          )}

        {keys.length > 0 && (
          <div className="key-list">
            {keys.map((item) => (
              <div
                key={item.id}
                className="key-card"
              >
                <div className="key-top">

                  <div className="key-icon">
                    🔑
                  </div>

                  <div className="key-info">
                    <span>
                      KEY
                    </span>

                    <strong>
                      {item.key_code ||
                        item.key_value ||
                        "—"}
                    </strong>
                  </div>

                  <span
                    className={`status ${getStatusClass(
                      item.status
                    )}`}
                  >
                    {getStatusText(
                      item.status
                    )}
                  </span>
                </div>

                <div className="details">

                  <div>
                    <span>
                      Sản phẩm
                    </span>

                    <strong>
                      {item.product_name ||
                        item.product?.name ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Ngày mua
                    </span>

                    <strong>
                      {formatDate(
                        item.sold_at ||
                          item.created_at
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Hạn sử dụng
                    </span>

                    <strong>
                      {formatDate(
                        item.expires_at
                      )}
                    </strong>
                  </div>

                </div>

                <div className="key-actions">

                  <button
                    onClick={() => {
                      const value =
                        item.key_code ||
                        item.key_value ||
                        "";

                      if (!value) return;

                      navigator.clipboard.writeText(
                        value
                      );
                    }}
                  >
                    📋 SAO CHÉP KEY
                  </button>

                  <button
                    className="shop-button"
                    onClick={() =>
                      router.push(
                        `/sites/${slug}`
                      )
                    }
                  >
                    🛒 CỬA HÀNG
                  </button>

                </div>
              </div>
            ))}
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
  padding-bottom: 40px;
}

.topbar {
  height: 64px;
  position: sticky;
  top: 0;
  z-index: 100;
  background:
    rgba(255,255,255,.96);
  border-bottom:
    1px solid #eee;
  backdrop-filter:
    blur(15px);
}

.topbar-inner {
  max-width: 1220px;
  height: 100%;
  margin: auto;
  padding: 0 18px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
}

.brand {
  border: 0;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
  text-align: left;
}

.brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 11px;

  display: grid;
  place-items: center;

  background: #fff0f7;
  font-size: 20px;
}

.brand strong {
  display: block;
  color: #222;
  font-size: 14px;
}

.brand span {
  display: block;
  margin-top: 2px;
  color: #aaa;
  font-size: 9px;
}

nav {
  display: flex;
  gap: 4px;
}

nav button {
  border: 0;
  background: transparent;
  padding: 10px 13px;
  border-radius: 9px;

  color: #666;
  font-weight: 700;
  cursor: pointer;
}

nav button:hover,
nav button.active {
  color: #e83d94;
  background: #fff0f7;
}

.logout {
  border: 0;
  border-radius: 9px;
  padding: 9px 12px;

  background: #222;
  color: white;

  cursor: pointer;
  font-weight: 700;
}

.container {
  max-width: 1000px;
  margin: auto;
  padding: 25px 18px;
}

.heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 15px;

  margin-bottom: 20px;
}

.back {
  border: 0;
  background: transparent;
  padding: 0;

  color: #e83d94;
  font-size: 11px;
  font-weight: 900;

  cursor: pointer;
}

h1 {
  margin: 7px 0 4px;
  font-size: 25px;
}

.heading p {
  margin: 0;
  color: #999;
  font-size: 12px;
}

.count {
  padding: 8px 13px;
  border-radius: 999px;

  background: white;
  border: 1px solid #eee;

  color: #e83d94;
  font-size: 11px;
  font-weight: 900;
}

.error {
  padding: 13px;
  margin-bottom: 15px;

  border-radius: 10px;

  background: #fff0f0;
  color: #c33;

  font-size: 12px;
}

.key-list {
  display: grid;
  gap: 13px;
}

.key-card {
  padding: 17px;

  background: white;
  border: 1px solid #eee;
  border-radius: 15px;

  box-shadow:
    0 8px 30px
    rgba(30,20,50,.05);
}

.key-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.key-icon {
  width: 45px;
  height: 45px;

  display: grid;
  place-items: center;

  border-radius: 12px;
  background: #fff0f7;

  font-size: 21px;
}

.key-info {
  flex: 1;
  min-width: 0;
}

.key-info span {
  display: block;

  color: #aaa;
  font-size: 9px;
  font-weight: 900;
}

.key-info strong {
  display: block;
  margin-top: 3px;

  color: #222;
  font-size: 14px;

  word-break: break-all;
}

.status {
  padding: 6px 9px;
  border-radius: 999px;

  font-size: 9px;
  font-weight: 900;
  white-space: nowrap;
}

.status.available {
  background: #eafff2;
  color: #159653;
}

.status.sold {
  background: #fff4df;
  color: #a46a00;
}

.status.used {
  background: #f1f1f1;
  color: #777;
}

.status.expired {
  background: #ffecec;
  color: #c33;
}

.details {
  display: grid;
  grid-template-columns:
    repeat(3,1fr);

  gap: 10px;

  margin-top: 15px;
  padding-top: 14px;

  border-top:
    1px solid #eee;
}

.details div {
  min-width: 0;
}

.details span {
  display: block;
  color: #aaa;
  font-size: 9px;
}

.details strong {
  display: block;
  margin-top: 4px;

  color: #555;
  font-size: 11px;

  word-break: break-word;
}

.key-actions {
  display: flex;
  gap: 8px;
  margin-top: 15px;
}

.key-actions button {
  flex: 1;

  border: 0;
  border-radius: 9px;

  padding: 10px;

  background: #f5f5f7;
  color: #555;

  cursor: pointer;
  font-size: 10px;
  font-weight: 900;
}

.key-actions button:hover {
  background: #fff0f7;
  color: #e83d94;
}

.key-actions .shop-button {
  background: #e83d94;
  color: white;
}

.empty {
  min-height: 350px;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  padding: 30px;

  border:
    1px solid #eee;
  border-radius: 18px;

  background: white;
  text-align: center;
}

.empty-icon {
  width: 70px;
  height: 70px;

  display: grid;
  place-items: center;

  border-radius: 20px;
  background: #fff0f7;

  font-size: 32px;
}

.empty h2 {
  margin: 15px 0 5px;
  color: #444;
}

.empty p {
  margin: 0;
  color: #999;
  font-size: 12px;
}

.empty button {
  margin-top: 18px;

  border: 0;
  border-radius: 9px;

  padding: 11px 16px;

  background: #e83d94;
  color: white;

  cursor: pointer;
  font-size: 10px;
  font-weight: 900;
}

.loading {
  min-height: 100vh;

  display: grid;
  place-items: center;
  align-content: center;
  gap: 12px;

  background: #f7f8fc;
  color: #888;
}

.spinner {
  width: 40px;
  height: 40px;

  border:
    4px solid #eee;

  border-top-color:
    #e83d94;

  border-radius: 50%;

  animation:
    spin .8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 760px) {

  .topbar {
    height: 58px;
  }

  .topbar-inner {
    padding: 0 11px;
  }

  nav {
    display: none;
  }

  .logout {
    padding: 8px 10px;
    font-size: 10px;
  }

  .container {
    padding: 18px 12px;
  }

  .heading {
    align-items: flex-start;
  }

  h1 {
    font-size: 21px;
  }

  .details {
    grid-template-columns:
      1fr;
  }

  .key-actions {
    display: grid;
    grid-template-columns:
      1fr 1fr;
  }
}

@media (max-width: 420px) {

  .key-top {
    align-items: flex-start;
  }

  .status {
    font-size: 8px;
  }

  .key-actions {
    grid-template-columns:
      1fr;
  }
}
`;
