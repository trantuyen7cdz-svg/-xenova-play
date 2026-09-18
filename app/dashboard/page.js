"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/";
      return;
    }

    setUser(user);

    const { data, error } = await supabase
      .from("keys")
      .select(`
        *,
        products (
          name,
          duration_days
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (!error && data) {
      setKeys(data);
    }

    if (error) {
      console.error("LOAD KEYS ERROR:", error);
    }

    setLoading(false);
  }

  async function copyKey(key) {
    try {
      await navigator.clipboard.writeText(key.key_code);

      setCopiedId(key.id);

      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (error) {
      console.error(error);
      alert("Không thể copy KEY.");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  function formatDate(date) {
    if (!date) {
      return "Không giới hạn";
    }

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return "Không xác định";
    }

    return d.toLocaleString("vi-VN");
  }

  function isExpired(key) {
    if (!key.expires_at) {
      return false;
    }

    return new Date(key.expires_at).getTime() <= Date.now();
  }

  function getStatus(key) {
    const status = String(key.status || "").toLowerCase();

    /*
     * available = KEY đang nằm trong kho,
     * chưa được cấp cho khách.
     */
    if (status === "available") {
      return {
        text: "CHƯA KÍCH HOẠT",
        color: "#ffb300",
      };
    }

    /*
     * locked / blocked = Admin thực sự khóa KEY.
     */
    if (
      status === "locked" ||
      status === "blocked"
    ) {
      return {
        text: "ĐÃ KHÓA",
        color: "#ff1744",
      };
    }

    /*
     * sold = KEY đã được cấp cho tài khoản.
     *
     * Không được hiển thị "ĐÃ KHÓA".
     * Chỉ kiểm tra thời gian hết hạn.
     */
    if (status === "sold") {
      if (isExpired(key)) {
        return {
          text: "HẾT HẠN",
          color: "#ff1744",
        };
      }

      return {
        text: "ĐANG HOẠT ĐỘNG",
        color: "#00c853",
      };
    }

    /*
     * Trường hợp KEY có user_id nhưng
     * database đang có status khác.
     *
     * Nếu chưa hết hạn thì vẫn xem là đang hoạt động.
     */
    if (key.user_id) {
      if (isExpired(key)) {
        return {
          text: "HẾT HẠN",
          color: "#ff1744",
        };
      }

      return {
        text: "ĐANG HOẠT ĐỘNG",
        color: "#00c853",
      };
    }

    /*
     * Trạng thái không xác định.
     */
    return {
      text: "CHƯA KÍCH HOẠT",
      color: "#ffb300",
    };
  }

  const activeKeys = keys.filter((key) => {
    const status = String(
      key.status || ""
    ).toLowerCase();

    if (
      status === "locked" ||
      status === "blocked"
    ) {
      return false;
    }

    if (status === "available") {
      return false;
    }

    return !isExpired(key);
  });

  if (loading) {
    return (
      <main style={styles.loading}>
        ĐANG TẢI DASHBOARD...
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.logo}>
              XENOVA PLAY
            </div>

            <h1 style={styles.title}>
              DASHBOARD
            </h1>

            <p style={styles.email}>
              {user?.email}
            </p>
          </div>

          <button
            style={styles.logout}
            onClick={logout}
          >
            ĐĂNG XUẤT
          </button>
        </header>

        <section style={styles.stats}>
          <div style={styles.stat}>
            <span>KEY CỦA TÔI</span>
            <strong>{keys.length}</strong>
          </div>

          <div style={styles.stat}>
            <span>KEY ĐANG HOẠT ĐỘNG</span>

            <strong>
              {activeKeys.length}
            </strong>
          </div>

          <div style={styles.stat}>
            <span>TÀI KHOẢN</span>
            <strong>USER</strong>
          </div>
        </section>

        <section style={styles.buttons}>
          <button
            style={styles.primaryButton}
            onClick={() => {
              window.location.href =
                "/dashboard/activate";
            }}
          >
            🔑 KÍCH HOẠT KEY
          </button>

          <button
            style={styles.primaryButton}
            onClick={() => {
              window.location.href =
                "/shop";
            }}
          >
            🛒 MUA KEY
          </button>

          <button
            style={styles.secondaryButton}
            onClick={() => {
              window.location.href =
                "/dashboard/orders";
            }}
          >
            🧾 ĐƠN HÀNG
          </button>
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>
            🔐 KEY CỦA TÔI
          </h2>

          <p style={styles.cardSub}>
            Danh sách KEY của tài khoản
          </p>

          {keys.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                🔑
              </div>

              <h3>CHƯA CÓ KEY</h3>

              <p>
                Bạn chưa có KEY nào.
              </p>

              <button
                style={styles.emptyButton}
                onClick={() => {
                  window.location.href =
                    "/shop";
                }}
              >
                MUA KEY
              </button>
            </div>
          ) : (
            <div style={styles.keyList}>
              {keys.map((key) => {
                const status =
                  getStatus(key);

                return (
                  <div
                    key={key.id}
                    style={styles.keyItem}
                  >
                    <div style={styles.productName}>
                      {key.products?.name ||
                        "KEY"}
                    </div>

                    <div style={styles.keyBox}>
                      <code
                        style={styles.keyCode}
                      >
                        {key.key_code}
                      </code>

                      <button
                        style={styles.copyButton}
                        onClick={() =>
                          copyKey(key)
                        }
                      >
                        {copiedId === key.id
                          ? "✓ ĐÃ COPY"
                          : "COPY KEY"}
                      </button>
                    </div>

                    <div style={styles.keyTop}>
                      <span
                        style={{
                          ...styles.status,
                          color: status.color,
                          borderColor:
                            status.color,
                        }}
                      >
                        {status.text}
                      </span>
                    </div>

                    <div style={styles.info}>
                      <div>
                        <span>HẾT HẠN</span>

                        <strong>
                          {formatDate(
                            key.expires_at
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>NGÀY NHẬN</span>

                        <strong>
                          {formatDate(
                            key.created_at
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #260914, #080808 50%, #030303)",
    color: "#fff",
    padding: "30px 16px 60px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  loading: {
    minHeight: "100vh",
    background: "#050505",
    color: "#ff1744",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
  },

  container: {
    maxWidth: "1100px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "30px",
  },

  logo: {
    color: "#ff1744",
    fontWeight: "900",
    letterSpacing: "3px",
    fontSize: "13px",
    marginBottom: "8px",
  },

  title: {
    margin: 0,
    fontSize: "32px",
    fontWeight: "900",
  },

  email: {
    color: "#777",
    marginTop: "8px",
  },

  logout: {
    background: "#111",
    border: "1px solid #333",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  stats: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: "15px",
    marginBottom: "20px",
  },

  stat: {
    background: "#0d0d0d",
    border: "1px solid #242424",
    borderRadius: "15px",
    padding: "22px",
  },

  buttons: {
    display: "flex",
    gap: "12px",
    marginBottom: "20px",
  },

  primaryButton: {
    flex: 1,
    background:
      "linear-gradient(90deg, #ff1744, #d50032)",
    border: "none",
    color: "#fff",
    padding: "15px",
    borderRadius: "11px",
    fontWeight: "900",
    cursor: "pointer",
  },

  secondaryButton: {
    flex: 1,
    background: "#111",
    border: "1px solid #333",
    color: "#fff",
    padding: "15px",
    borderRadius: "11px",
    fontWeight: "900",
    cursor: "pointer",
  },

  card: {
    background: "#0c0c0c",
    border: "1px solid #242424",
    borderRadius: "18px",
    padding: "24px",
  },

  cardTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "900",
  },

  cardSub: {
    color: "#777",
    marginTop: "7px",
  },

  empty: {
    textAlign: "center",
    padding: "50px 20px",
    color: "#777",
  },

  emptyIcon: {
    fontSize: "45px",
  },

  emptyButton: {
    marginTop: "15px",
    background: "#ff1744",
    border: "none",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: "9px",
    fontWeight: "900",
    cursor: "pointer",
  },

  keyList: {
    display: "grid",
    gap: "12px",
    marginTop: "20px",
  },

  keyItem: {
    background: "#070707",
    border: "1px solid #222",
    borderRadius: "13px",
    padding: "18px",
  },

  productName: {
    fontSize: "16px",
    fontWeight: "900",
    marginBottom: "12px",
  },

  keyBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#050505",
    border: "1px solid #2a2a2a",
    borderRadius: "10px",
    padding: "10px",
  },

  keyCode: {
    flex: 1,
    color: "#ff1744",
    fontWeight: "900",
    letterSpacing: "1px",
    wordBreak: "break-all",
  },

  copyButton: {
    background: "#ff1744",
    border: "none",
    color: "#fff",
    padding: "9px 12px",
    borderRadius: "8px",
    fontWeight: "900",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  keyTop: {
    marginTop: "14px",
  },

  status: {
    display: "inline-block",
    border: "1px solid",
    borderRadius: "6px",
    padding: "5px 8px",
    fontSize: "9px",
    fontWeight: "900",
  },

  info: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginTop: "18px",
    paddingTop: "15px",
    borderTop: "1px solid #1b1b1b",
  },
};
