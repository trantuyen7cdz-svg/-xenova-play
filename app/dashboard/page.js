"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [keys, setKeys] = useState([]);
  const [balance, setBalance] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUser(user);

      // =========================
      // PROFILE
      // =========================
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      setProfile(profileData);

      // =========================
      // KEYS
      // =========================
      const { data: keyData, error: keyError } = await supabase
        .from("keys")
        .select(`
          *,
          products (
            name,
            description,
            price,
            duration_days
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (keyError) {
        console.error("KEY ERROR:", keyError);
      }

      setKeys(keyData || []);

      // =========================
      // WALLET
      // =========================
      setLoadingWallet(true);

      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (walletError) {
        console.error("WALLET ERROR:", walletError);
        setBalance(0);
      } else {
        setBalance(Number(walletData?.balance || 0));
      }

    } catch (err) {
      console.error(err);
      setError("Không thể tải dữ liệu tài khoản.");
    } finally {
      setLoading(false);
      setLoadingWallet(false);
    }
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("vi-VN").format(Number(value || 0));
  }

  function getKeyStatus(key) {
    const now = new Date();

    // KEY chưa được cấp
    if (key.status === "available") {
      return {
        text: "CHƯA KÍCH HOẠT",
        className: "statusAvailable",
      };
    }

    // KEY bị khóa
    if (key.status === "locked" || key.status === "blocked") {
      return {
        text: "ĐÃ KHÓA",
        className: "statusLocked",
      };
    }

    // KEY đã bán nhưng chưa hết hạn
    if (key.status === "sold") {
      if (key.expires_at) {
        const expires = new Date(key.expires_at);

        if (expires <= now) {
          return {
            text: "HẾT HẠN",
            className: "statusExpired",
          };
        }
      }

      return {
        text: "ĐANG HOẠT ĐỘNG",
        className: "statusActive",
      };
    }

    // fallback
    if (key.user_id) {
      if (key.expires_at) {
        const expires = new Date(key.expires_at);

        if (expires <= now) {
          return {
            text: "HẾT HẠN",
            className: "statusExpired",
          };
        }
      }

      return {
        text: "ĐANG HOẠT ĐỘNG",
        className: "statusActive",
      };
    }

    return {
      text: "CHƯA KÍCH HOẠT",
      className: "statusAvailable",
    };
  }

  function getActiveKeys() {
    const now = new Date();

    return keys.filter((key) => {
      if (!key.user_id) return false;

      if (
        key.status === "locked" ||
        key.status === "blocked"
      ) {
        return false;
      }

      if (key.expires_at) {
        return new Date(key.expires_at) > now;
      }

      return true;
    });
  }

  function formatDate(date) {
    if (!date) return "—";

    return new Date(date).toLocaleString("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  if (loading) {
    return (
      <main className="page">
        <div className="loading">
          Đang tải tài khoản...
        </div>

        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="page">
      {/* ================= HEADER ================= */}
      <header className="header">
        <div>
          <div className="logo">
            XENOVA <span>PLAY</span>
          </div>

          <div className="welcome">
            Xin chào,{" "}
            <strong>
              {profile?.username || user?.email || "Thành viên"}
            </strong>
          </div>
        </div>

        <button
          className="logout"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/login";
          }}
        >
          ĐĂNG XUẤT
        </button>
      </header>

      {/* ================= ERROR ================= */}
      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {/* ================= WALLET ================= */}
      <section className="walletCard">
        <div className="walletLeft">
          <div className="walletLabel">
            SỐ DƯ VÍ
          </div>

          <div className="walletBalance">
            {loadingWallet
              ? "..."
              : `${formatMoney(balance)}đ`}
          </div>

          <div className="walletHint">
            Dùng số dư để mua KEY nhanh chóng
          </div>
        </div>

        <Link href="/deposit" className="depositButton">
          💰 NẠP TIỀN
        </Link>
      </section>

      {/* ================= QUICK MENU ================= */}
      <section className="menuGrid">
        <Link href="/shop" className="menuCard">
          <div className="menuIcon">🛒</div>
          <div className="menuTitle">MUA KEY</div>
          <div className="menuDesc">
            Mua KEY từ cửa hàng
          </div>
        </Link>

        <Link href="/deposit" className="menuCard">
          <div className="menuIcon">💰</div>
          <div className="menuTitle">NẠP TIỀN</div>
          <div className="menuDesc">
            Nạp tiền vào ví
          </div>
        </Link>

        <Link href="/orders" className="menuCard">
          <div className="menuIcon">📦</div>
          <div className="menuTitle">ĐƠN HÀNG</div>
          <div className="menuDesc">
            Xem lịch sử mua KEY
          </div>
        </Link>

        <Link href="/dashboard/activate" className="menuCard">
          <div className="menuIcon">🔑</div>
          <div className="menuTitle">KÍCH HOẠT</div>
          <div className="menuDesc">
            Quản lý KEY của bạn
          </div>
        </Link>
      </section>

      {/* ================= STATISTICS ================= */}
      <section className="stats">
        <div className="stat">
          <div className="statNumber">
            {keys.length}
          </div>

          <div className="statLabel">
            TỔNG KEY
          </div>
        </div>

        <div className="stat">
          <div className="statNumber">
            {getActiveKeys().length}
          </div>

          <div className="statLabel">
            ĐANG HOẠT ĐỘNG
          </div>
        </div>

        <div className="stat">
          <div className="statNumber">
            {keys.filter(
              (key) =>
                key.status === "available"
            ).length}
          </div>

          <div className="statLabel">
            CHƯA KÍCH HOẠT
          </div>
        </div>
      </section>

      {/* ================= KEY LIST ================= */}
      <section className="section">
        <div className="sectionHeader">
          <div>
            <h2>🔑 KEY CỦA TÔI</h2>
            <p>
              Danh sách KEY bạn đang sở hữu
            </p>
          </div>

          <Link
            href="/shop"
            className="shopButton"
          >
            + MUA KEY
          </Link>
        </div>

        {keys.length === 0 ? (
          <div className="empty">
            <div className="emptyIcon">
              🔑
            </div>

            <h3>Bạn chưa có KEY</h3>

            <p>
              Hãy mua KEY để bắt đầu sử dụng.
            </p>

            <Link
              href="/shop"
              className="emptyButton"
            >
              ĐẾN CỬA HÀNG
            </Link>
          </div>
        ) : (
          <div className="keyList">
            {keys.map((key) => {
              const status = getKeyStatus(key);

              return (
                <div
                  className="keyCard"
                  key={key.id}
                >
                  <div className="keyTop">
                    <div>
                      <div className="productName">
                        {key.products?.name ||
                          "KEY XENOVA"}
                      </div>

                      <div className="keyCode">
                        {key.key_code}
                      </div>
                    </div>

                    <div
                      className={`status ${status.className}`}
                    >
                      {status.text}
                    </div>
                  </div>

                  <div className="keyInfo">
                    <div>
                      <span>Sản phẩm</span>
                      <strong>
                        {key.products?.name ||
                          "—"}
                      </strong>
                    </div>

                    <div>
                      <span>Ngày cấp</span>
                      <strong>
                        {formatDate(
                          key.sold_at ||
                            key.created_at
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Hết hạn</span>
                      <strong>
                        {formatDate(
                          key.expires_at
                        )}
                      </strong>
                    </div>
                  </div>

                  {key.order_id && (
                    <div className="orderInfo">
                      Đơn hàng #{key.order_id}
                    </div>
                  )}
                </div>
              );
            })}
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
        circle at top right,
        rgba(0, 255, 200, 0.08),
        transparent 30%
      ),
      radial-gradient(
        circle at top left,
        rgba(0, 120, 255, 0.08),
        transparent 30%
      ),
      #080b12;

    color: #fff;
    padding: 24px;
  }

  .header {
    max-width: 1100px;
    margin: 0 auto 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .logo {
    font-size: 28px;
    font-weight: 900;
    letter-spacing: 1px;
  }

  .logo span {
    color: #00e6b8;
  }

  .welcome {
    margin-top: 5px;
    color: #8f99a8;
    font-size: 14px;
  }

  .welcome strong {
    color: #fff;
  }

  .logout {
    border: 1px solid #303744;
    background: #111620;
    color: #fff;
    padding: 11px 16px;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 700;
  }

  .logout:hover {
    background: #181e2a;
  }

  .error {
    max-width: 1100px;
    margin: 0 auto 18px;
    padding: 14px;
    border-radius: 12px;
    background: rgba(255, 60, 60, 0.1);
    border: 1px solid rgba(255, 60, 60, 0.3);
    color: #ff8585;
  }

  .walletCard {
    max-width: 1100px;
    margin: 0 auto 22px;
    padding: 24px;
    border-radius: 18px;
    border: 1px solid rgba(0, 230, 184, 0.22);
    background:
      linear-gradient(
        135deg,
        rgba(0, 230, 184, 0.12),
        rgba(17, 22, 32, 0.96)
      );
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }

  .walletLabel {
    color: #8f99a8;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 1px;
  }

  .walletBalance {
    margin-top: 6px;
    font-size: 32px;
    font-weight: 900;
    color: #00e6b8;
  }

  .walletHint {
    margin-top: 5px;
    color: #7f8998;
    font-size: 13px;
  }

  .depositButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 150px;
    padding: 14px 20px;
    border-radius: 12px;
    background: #00e6b8;
    color: #06100e;
    text-decoration: none;
    font-weight: 900;
    box-shadow: 0 8px 30px rgba(0, 230, 184, 0.18);
  }

  .depositButton:hover {
    transform: translateY(-1px);
  }

  .menuGrid {
    max-width: 1100px;
    margin: 0 auto 22px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }

  .menuCard {
    text-decoration: none;
    color: #fff;
    padding: 20px;
    border: 1px solid #202633;
    border-radius: 15px;
    background: #10141d;
    transition: 0.2s;
  }

  .menuCard:hover {
    border-color: #00e6b8;
    transform: translateY(-2px);
  }

  .menuIcon {
    font-size: 25px;
  }

  .menuTitle {
    margin-top: 10px;
    font-weight: 900;
    font-size: 15px;
  }

  .menuDesc {
    margin-top: 5px;
    color: #7f8998;
    font-size: 12px;
  }

  .stats {
    max-width: 1100px;
    margin: 0 auto 25px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }

  .stat {
    padding: 20px;
    border-radius: 15px;
    border: 1px solid #202633;
    background: #10141d;
    text-align: center;
  }

  .statNumber {
    font-size: 27px;
    font-weight: 900;
  }

  .statLabel {
    margin-top: 6px;
    color: #7f8998;
    font-size: 11px;
    font-weight: 800;
  }

  .section {
    max-width: 1100px;
    margin: 0 auto;
  }

  .sectionHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 16px;
  }

  .sectionHeader h2 {
    margin: 0;
    font-size: 20px;
  }

  .sectionHeader p {
    margin: 5px 0 0;
    color: #7f8998;
    font-size: 13px;
  }

  .shopButton,
  .emptyButton {
    text-decoration: none;
    background: #00e6b8;
    color: #06100e;
    padding: 11px 16px;
    border-radius: 10px;
    font-weight: 900;
    font-size: 13px;
  }

  .keyList {
    display: grid;
    gap: 14px;
  }

  .keyCard {
    background: #10141d;
    border: 1px solid #202633;
    border-radius: 15px;
    padding: 20px;
  }

  .keyTop {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 15px;
  }

  .productName {
    font-weight: 900;
    font-size: 16px;
  }

  .keyCode {
    margin-top: 8px;
    padding: 10px 12px;
    border-radius: 8px;
    background: #080b12;
    border: 1px solid #202633;
    color: #00e6b8;
    font-family: monospace;
    font-size: 14px;
    word-break: break-all;
  }

  .status {
    white-space: nowrap;
    padding: 7px 10px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 900;
  }

  .statusActive {
    color: #00e6b8;
    background: rgba(0, 230, 184, 0.1);
    border: 1px solid rgba(0, 230, 184, 0.25);
  }

  .statusAvailable {
    color: #ffc857;
    background: rgba(255, 200, 87, 0.1);
    border: 1px solid rgba(255, 200, 87, 0.25);
  }

  .statusExpired,
  .statusLocked {
    color: #ff7777;
    background: rgba(255, 70, 70, 0.1);
    border: 1px solid rgba(255, 70, 70, 0.25);
  }

  .keyInfo {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 15px;
  }

  .keyInfo div {
    padding: 12px;
    background: #0b0f16;
    border-radius: 10px;
  }

  .keyInfo span {
    display: block;
    color: #6f7988;
    font-size: 11px;
    margin-bottom: 5px;
  }

  .keyInfo strong {
    font-size: 12px;
  }

  .orderInfo {
    margin-top: 12px;
    color: #6f7988;
    font-size: 12px;
  }

  .empty {
    padding: 55px 20px;
    text-align: center;
    background: #10141d;
    border: 1px solid #202633;
    border-radius: 15px;
  }

  .emptyIcon {
    font-size: 45px;
  }

  .empty h3 {
    margin: 12px 0 5px;
  }

  .empty p {
    color: #7f8998;
    margin: 0 0 22px;
  }

  .loading {
    min-height: 100vh;
    display: grid;
    place-items: center;
    color: #00e6b8;
    font-weight: 800;
  }

  @media (max-width: 800px) {
    .page {
      padding: 15px;
    }

    .header {
      align-items: flex-start;
    }

    .logo {
      font-size: 23px;
    }

    .walletCard {
      align-items: flex-start;
      flex-direction: column;
    }

    .depositButton {
      width: 100%;
    }

    .menuGrid {
      grid-template-columns: repeat(2, 1fr);
    }

    .stats {
      grid-template-columns: repeat(3, 1fr);
    }

    .stat {
      padding: 14px 8px;
    }

    .statNumber {
      font-size: 22px;
    }

    .keyInfo {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 480px) {
    .header {
      flex-direction: column;
    }

    .logout {
      width: 100%;
    }

    .menuGrid {
      grid-template-columns: 1fr 1fr;
    }

    .sectionHeader {
      align-items: flex-start;
      flex-direction: column;
    }

    .shopButton {
      width: 100%;
      text-align: center;
    }

    .keyTop {
      flex-direction: column;
    }

    .status {
      width: fit-content;
    }
  }
`;
