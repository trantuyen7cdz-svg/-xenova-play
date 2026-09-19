"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const BANK_NAME = "VIETCOMBANK";
const ACCOUNT_NAME = "TRAN VAN TUYEN";
const ACCOUNT_NUMBER = "9365717262";

const NAV_ITEMS = [
  ["⌂", "Trang chủ", "/"],
  ["🛒", "Cửa hàng", "/shop"],
  ["▣", "Nạp tiền", "/deposit"],
  ["♢", "KEY của tôi", "/keys"],
  ["▤", "Đơn hàng", "/orders"],
  ["♙", "Tài khoản", "/dashboard"],
  ["⚙", "Cài đặt", "/settings"],
];

export default function DepositPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [requests, setRequests] = useState([]);
  const [depositInfo, setDepositInfo] = useState(null);

  useEffect(() => {
    loadData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);

      if (!session?.user) {
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  async function loadData() {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("SESSION ERROR:", sessionError);
      }

      const currentUser = session?.user;

      if (!currentUser) {
        setUser(null);
        router.push("/login");
        return;
      }

      setUser(currentUser);

      const { data, error } = await supabase
        .from("deposit_requests")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("LOAD DEPOSITS ERROR:", error);
      } else {
        setRequests(data || []);
      }
    } catch (error) {
      console.error("LOAD DATA ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("vi-VN") + "đ";
  }

  function formatDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleString("vi-VN");
  }

  function cleanAmount(value) {
    return value.replace(/\D/g, "");
  }

  async function createDeposit() {
    setMessage("");
    setDepositInfo(null);

    const money = Number(amount);

    if (!money || money < 10000) {
      setMessage("Số tiền nạp tối thiểu là 10.000đ.");
      return;
    }

    if (money > 100000000) {
      setMessage("Số tiền nạp quá lớn.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("GET SESSION ERROR:", sessionError);
      }

      if (!session?.user || !session?.access_token) {
        setUser(null);
        setMessage(
          "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại."
        );
        return;
      }

      setUser(session.user);

      const response = await fetch("/api/deposit/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount: money,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Không thể tạo yêu cầu nạp tiền."
        );
      }

      setDepositInfo({
        depositId: result.depositId,
        amount: result.amount,
        transferContent: result.transferContent,
      });

      setMessage(
        `Đã tạo yêu cầu nạp ${formatMoney(
          result.amount
        )}. Vui lòng chuyển khoản đúng nội dung bên dưới.`
      );

      setAmount("");

      const { data, error } = await supabase
        .from("deposit_requests")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!error) {
        setRequests(data || []);
      } else {
        console.error("RELOAD DEPOSITS ERROR:", error);
      }
    } catch (error) {
      console.error("CREATE DEPOSIT ERROR:", error);

      setMessage(
        error.message || "Có lỗi xảy ra khi tạo yêu cầu nạp tiền."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function getQrUrl() {
    if (!depositInfo) return "";

    const params = new URLSearchParams({
      amount: String(depositInfo.amount),
      addInfo: depositInfo.transferContent,
      accountName: ACCOUNT_NAME,
    });

    return `https://img.vietqr.io/image/VCB-${ACCOUNT_NUMBER}-compact2.png?${params.toString()}`;
  }

  if (loading) {
    return (
      <main className="loading-page">
        <div className="loading-logo">
          XENOVA
          <span>PLAY</span>
        </div>

        <div className="loading-spinner" />

        <p>Đang tải...</p>

        <style jsx>{`
          .loading-page {
            min-height: 100vh;
            background: #fff7fb;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            color: #25202a;
          }

          .loading-logo {
            font-size: 27px;
            line-height: 0.8;
            font-weight: 950;
            letter-spacing: 1px;
            color: #171925;
          }

          .loading-logo span {
            display: block;
            color: #f22f82;
            margin-left: 38px;
            margin-top: 5px;
            font-size: 15px;
          }

          .loading-spinner {
            width: 30px;
            height: 30px;
            margin-top: 20px;
            border: 3px solid #ffd7e8;
            border-top-color: #f22f82;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          p {
            color: #999;
            font-size: 12px;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #fff7fb;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        body {
          color: #292631;
        }

        button,
        input {
          font-family: inherit;
        }
      `}</style>

      <div className="xenova-page">
        <header className="topbar">
          <div className="topbar-inner">
            <button
              className="brand"
              onClick={() => router.push("/")}
            >
              <span className="brand-main">XENOVA</span>
              <span className="brand-play">PLAY</span>
            </button>

            <nav className="desktop-nav">
              {NAV_ITEMS.map(([icon, label, href]) => (
                <button
                  key={label}
                  className={`nav-item ${
                    label === "Nạp tiền" ? "active" : ""
                  }`}
                  onClick={() => router.push(href)}
                >
                  <span className="nav-icon">{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </nav>

            <div className="header-right">
              <button
                className="wallet-button"
                onClick={() => router.push("/deposit")}
              >
                <span>💳</span>
                <span>Ví của tôi</span>
              </button>

              <button
                className="avatar-button"
                onClick={() => router.push("/dashboard")}
              >
                {user?.email?.charAt(0)?.toUpperCase() || "U"}
              </button>
            </div>
          </div>
        </header>

        <main className="main">
          <div className="petal petal-one">✿</div>
          <div className="petal petal-two">❀</div>
          <div className="petal petal-three">✿</div>

          <div className="breadcrumb">
            <button onClick={() => router.push("/")}>
              Trang chủ
            </button>

            <span>/</span>

            <strong>Nạp tiền</strong>
          </div>

          <section className="page-title">
            <div className="title-icon">₫</div>

            <div>
              <h1>Nạp tiền</h1>

              <p>
                Nạp tiền vào ví XENOVA PLAY để mua sản phẩm
              </p>
            </div>
          </section>

          <section className="deposit-grid">
            <div className="deposit-card">
              <div className="card-heading">
                <div className="heading-icon">₫</div>

                <div>
                  <h2>Nạp tiền vào ví</h2>
                  <p>Nhập số tiền bạn muốn nạp</p>
                </div>
              </div>

              <label className="input-label">
                Số tiền nạp
              </label>

              <div className="amount-input">
                <input
                  value={
                    amount
                      ? Number(amount).toLocaleString("vi-VN")
                      : ""
                  }
                  onChange={(e) => {
                    setAmount(cleanAmount(e.target.value));
                    setDepositInfo(null);
                    setMessage("");
                  }}
                  placeholder="Nhập số tiền..."
                  inputMode="numeric"
                />

                <span>VNĐ</span>
              </div>

              <div className="quick-label">
                Chọn nhanh
              </div>

              <div className="quick-grid">
                {[10000, 20000, 50000, 100000, 200000].map(
                  (money) => (
                    <button
                      key={money}
                      onClick={() => {
                        setAmount(String(money));
                        setDepositInfo(null);
                        setMessage("");
                      }}
                    >
                      {formatMoney(money)}
                    </button>
                  )
                )}
              </div>

              <div className="minimum">
                <span>ⓘ</span>
                Số tiền nạp tối thiểu:
                <b>10.000đ</b>
              </div>

              <button
                className="submit-button"
                disabled={submitting}
                onClick={createDeposit}
              >
                {submitting ? (
                  <>
                    <span className="spinner" />
                    ĐANG TẠO...
                  </>
                ) : (
                  <>
                    Tiếp tục
                    <span>→</span>
                  </>
                )}
              </button>

              {message && (
                <div className="message-box">
                  <span className="message-icon">
                    ✓
                  </span>

                  <div>{message}</div>
                </div>
              )}
            </div>

            <aside className="side-column">
              <div className="guide-card">
                <div className="guide-heading">
                  <div className="guide-icon">♡</div>

                  <div>
                    <h3>Hướng dẫn nạp tiền</h3>
                    <p>Thực hiện theo các bước</p>
                  </div>
                </div>

                <div className="steps">
                  {[
                    [
                      "1",
                      "Nhập số tiền",
                      "Chọn hoặc nhập số tiền muốn nạp.",
                    ],
                    [
                      "2",
                      "Tạo yêu cầu",
                      "Nhấn tiếp tục để tạo đơn nạp.",
                    ],
                    [
                      "3",
                      "Chuyển khoản",
                      "Quét QR và chuyển đúng số tiền, nội dung.",
                    ],
                    [
                      "4",
                      "Nhận tiền",
                      "Hệ thống xử lý sau khi xác nhận.",
                    ],
                  ].map(([number, title, text]) => (
                    <div className="step" key={number}>
                      <div className="step-number">
                        {number}
                      </div>

                      <div>
                        <strong>{title}</strong>
                        <p>{text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="support-card">
                <div className="support-top">
                  <div className="support-icon">
                    💬
                  </div>

                  <div>
                    <strong>Cần hỗ trợ?</strong>
                    <p>Liên hệ Admin nếu gặp vấn đề</p>
                  </div>
                </div>

                <button
                  onClick={() =>
                    window.open(
                      "https://zalo.me/84365717262",
                      "_blank"
                    )
                  }
                >
                  Chat Admin
                </button>
              </div>
            </aside>
          </section>

          {depositInfo && (
            <section className="section-card qr-section">
              <div className="section-heading">
                <div className="section-icon">QR</div>

                <div>
                  <h2>Thanh toán</h2>

                  <p>
                    Quét mã QR để chuyển khoản nhanh chóng
                  </p>
                </div>
              </div>

              <div className="qr-layout">
                <div className="qr-side">
                  <div className="qr-box">
                    <img
                      src={getQrUrl()}
                      alt="QR chuyển khoản XENOVA PLAY"
                      className="qr-image"
                    />
                  </div>

                  <div className="qr-note">
                    Quét mã QR bằng ứng dụng ngân hàng
                  </div>
                </div>

                <div className="payment-card">
                  <div className="payment-header">
                    <span>Thông tin chuyển khoản</span>

                    <b>
                      ĐƠN #{depositInfo.depositId}
                    </b>
                  </div>

                  <div className="detail-row">
                    <span>Ngân hàng</span>
                    <strong>{BANK_NAME}</strong>
                  </div>

                  <div className="detail-row">
                    <span>Chủ tài khoản</span>
                    <strong>{ACCOUNT_NAME}</strong>
                  </div>

                  <div className="detail-row">
                    <span>Số tài khoản</span>
                    <strong>{ACCOUNT_NUMBER}</strong>
                  </div>

                  <div className="detail-row">
                    <span>Số tiền</span>

                    <strong className="pink-value">
                      {formatMoney(depositInfo.amount)}
                    </strong>
                  </div>

                  <div className="transfer-box">
                    <span>Nội dung chuyển khoản</span>

                    <strong>
                      {depositInfo.transferContent}
                    </strong>
                  </div>

                  <div className="warning-box">
                    <span>⚠️</span>

                    <div>
                      Vui lòng chuyển khoản{" "}
                      <b>đúng số tiền</b> và{" "}
                      <b>đúng nội dung</b>.
                      <br />
                      Mỗi đơn có một mã chuyển khoản riêng.
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="section-card bank-section">
            <div className="section-heading">
              <div className="section-icon">🏦</div>

              <div>
                <h2>Thông tin chuyển khoản</h2>
                <p>Thông tin tài khoản nhận tiền</p>
              </div>
            </div>

            <div className="bank-box">
              <div className="bank-main">
                <div className="bank-logo">
                  VCB
                </div>

                <div>
                  <div className="bank-name">
                    {BANK_NAME}
                  </div>

                  <div className="bank-sub">
                    Tài khoản ngân hàng XENOVA PLAY
                  </div>
                </div>
              </div>

              <div className="bank-info">
                <div>
                  <span>Chủ tài khoản</span>
                  <strong>{ACCOUNT_NAME}</strong>
                </div>

                <div>
                  <span>Số tài khoản</span>
                  <strong>{ACCOUNT_NUMBER}</strong>
                </div>

                <div>
                  <span>Nội dung</span>
                  <strong>Mã đơn riêng</strong>
                </div>
              </div>
            </div>

            <div className="bank-warning">
              <span>⚠️</span>

              <div>
                Chỉ chuyển khoản sau khi đã tạo yêu cầu
                nạp tiền. Nội dung chuyển khoản phải đúng
                theo đơn được tạo.
              </div>
            </div>
          </section>

          <section className="section-card history-section">
            <div className="section-heading">
              <div className="section-icon">↕</div>

              <div>
                <h2>Lịch sử nạp tiền</h2>

                <p>
                  Theo dõi các yêu cầu nạp tiền của bạn
                </p>
              </div>
            </div>

            {requests.length === 0 ? (
              <div className="empty-history">
                <div className="empty-icon">₫</div>

                <strong>
                  Chưa có yêu cầu nạp tiền
                </strong>

                <p>
                  Các giao dịch nạp tiền của bạn sẽ xuất hiện
                  tại đây.
                </p>
              </div>
            ) : (
              <div className="history-list">
                {requests.map((item) => (
                  <div
                    className="history-item"
                    key={item.id}
                  >
                    <div className="history-left">
                      <div className="history-id">
                        #{item.id}
                      </div>

                      <div className="history-date">
                        {formatDate(item.created_at)}
                      </div>

                      {item.transfer_content && (
                        <div className="history-content">
                          {item.transfer_content}
                        </div>
                      )}
                    </div>

                    <div className="history-right">
                      <strong>
                        {formatMoney(item.amount)}
                      </strong>

                      <span
                        className={`status ${item.status}`}
                      >
                        {item.status === "pending"
                          ? "ĐANG CHỜ"
                          : item.status === "completed"
                          ? "HOÀN THÀNH"
                          : item.status === "failed"
                          ? "THẤT BẠI"
                          : item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <footer className="footer">
            © {new Date().getFullYear()} XENOVA PLAY
            — All rights reserved.
          </footer>
        </main>

        <button
          className="chat-admin"
          onClick={() =>
            window.open(
              "https://zalo.me/84365717262",
              "_blank"
            )
          }
        >
          Chat Admin 💬
        </button>

        <div className="mobile-bottom-nav">
          {[
            ["⌂", "Trang chủ", "/"],
            ["🛒", "Cửa hàng", "/shop"],
            ["▣", "Nạp tiền", "/deposit"],
            ["♢", "KEY", "/keys"],
            ["♙", "Tài khoản", "/dashboard"],
          ].map(([icon, label, href]) => (
            <button
              key={label}
              className={
                label === "Nạp tiền"
                  ? "mobile-active"
                  : ""
              }
              onClick={() => router.push(href)}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        .xenova-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 8% 18%,
              rgba(255, 78, 153, 0.08),
              transparent 19%
            ),
            radial-gradient(
              circle at 94% 48%,
              rgba(255, 120, 190, 0.08),
              transparent 20%
            ),
            #fff7fb;
          position: relative;
          overflow-x: hidden;
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 100;
          height: 62px;
          background: rgba(255, 255, 255, 0.97);
          border-bottom: 1px solid #eee7ed;
          box-shadow: 0 2px 15px rgba(40, 20, 35, 0.04);
          backdrop-filter: blur(12px);
        }

        .topbar-inner {
          max-width: 1220px;
          height: 100%;
          margin: auto;
          padding: 0 18px;
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .brand {
          width: 105px;
          border: 0;
          background: transparent;
          text-align: left;
          cursor: pointer;
          padding: 0;
          line-height: 0.82;
          flex-shrink: 0;
        }

        .brand-main {
          display: block;
          color: #111523;
          font-size: 19px;
          font-weight: 950;
          letter-spacing: -0.8px;
        }

        .brand-play {
          display: block;
          color: #f22f82;
          margin-left: 36px;
          margin-top: 5px;
          font-size: 12px;
          font-weight: 900;
        }

        .desktop-nav {
          flex: 1;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .nav-item {
          height: 42px;
          min-width: 67px;
          border: 0;
          background: transparent;
          border-radius: 10px;
          color: #555865;
          cursor: pointer;
          font-size: 9px;
          padding: 4px 7px;
          position: relative;
        }

        .nav-icon {
          display: block;
          font-size: 15px;
          line-height: 16px;
          margin-bottom: 2px;
        }

        .nav-item:hover,
        .nav-item.active {
          color: #f12e81;
          background: #fff0f7;
        }

        .nav-item.active::after {
          content: "";
          position: absolute;
          left: 17px;
          right: 17px;
          bottom: 1px;
          height: 2px;
          border-radius: 10px;
          background: #ff3486;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .wallet-button {
          height: 34px;
          border: 1px solid #eee2e9;
          background: white;
          border-radius: 18px;
          padding: 0 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          color: #e82e7e;
          font-size: 9px;
          font-weight: 800;
          cursor: pointer;
        }

        .avatar-button {
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 50%;
          color: white;
          background: linear-gradient(
            135deg,
            #ff72aa,
            #ed2d7e
          );
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .main {
          width: min(1160px, calc(100% - 30px));
          margin: auto;
          padding: 18px 0 80px;
          position: relative;
          z-index: 1;
        }

        .petal {
          position: absolute;
          color: #f0a1c3;
          opacity: 0.42;
          pointer-events: none;
          font-size: 25px;
        }

        .petal-one {
          right: 3%;
          top: 35px;
          transform: rotate(25deg);
        }

        .petal-two {
          left: -20px;
          top: 300px;
          transform: rotate(-25deg);
        }

        .petal-three {
          right: 5%;
          top: 650px;
          transform: rotate(50deg);
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #aaa1a9;
          font-size: 9px;
          margin-bottom: 14px;
        }

        .breadcrumb button {
          border: 0;
          background: transparent;
          padding: 0;
          color: #99909a;
          font-size: 9px;
          cursor: pointer;
        }

        .breadcrumb button:hover {
          color: #ed2f81;
        }

        .breadcrumb strong {
          color: #ed2f81;
        }

        .page-title {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 15px;
        }

        .title-icon,
        .section-icon,
        .heading-icon {
          display: grid;
          place-items: center;
          color: #ed347f;
          background: #ffe8f2;
          font-weight: 900;
        }

        .title-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          font-size: 16px;
        }

        .page-title h1 {
          margin: 0;
          color: #20232f;
          font-size: 22px;
          font-weight: 950;
        }

        .page-title p {
          margin: 3px 0 0;
          color: #a49aa2;
          font-size: 10px;
        }

        .deposit-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.65fr) minmax(280px, 0.8fr);
          gap: 12px;
          align-items: start;
        }

        .deposit-card,
        .guide-card,
        .support-card,
        .section-card {
          background: rgba(255, 255, 255, 0.97);
          border: 1px solid #eee5eb;
          border-radius: 13px;
          box-shadow: 0 5px 18px rgba(35, 20, 30, 0.045);
        }

        .deposit-card {
          padding: 18px;
        }

        .card-heading,
        .guide-heading,
        .section-heading {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .heading-icon {
          width: 35px;
          height: 35px;
          border-radius: 10px;
          font-size: 13px;
          flex-shrink: 0;
        }

        .card-heading h2,
        .guide-heading h3,
        .section-heading h2 {
          margin: 0;
          color: #292631;
          font-size: 14px;
          font-weight: 900;
        }

        .card-heading p,
        .guide-heading p,
        .section-heading p {
          margin: 3px 0 0;
          color: #aaa0a8;
          font-size: 9px;
        }

        .input-label,
        .quick-label {
          display: block;
          color: #625963;
          font-size: 10px;
          font-weight: 800;
        }

        .input-label {
          margin-top: 21px;
          margin-bottom: 7px;
        }

        .amount-input {
          height: 52px;
          position: relative;
        }

        .amount-input input {
          width: 100%;
          height: 100%;
          border: 1px solid #e8dce4;
          border-radius: 10px;
          outline: none;
          background: white;
          color: #302a32;
          padding: 0 65px 0 14px;
          font-size: 17px;
          font-weight: 850;
        }

        .amount-input input:focus {
          border-color: #ef76a9;
          box-shadow: 0 0 0 3px rgba(239, 118, 169, 0.1);
        }

        .amount-input input::placeholder {
          color: #c4bac2;
          font-weight: 500;
        }

        .amount-input span {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #aaa0a8;
          font-size: 9px;
          font-weight: 900;
        }

        .quick-label {
          margin-top: 13px;
          margin-bottom: 6px;
        }

        .quick-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
        }

        .quick-grid button {
          border: 1px solid #eadfe6;
          background: #fffafd;
          border-radius: 8px;
          padding: 8px 2px;
          color: #716771;
          font-size: 9px;
          font-weight: 800;
          cursor: pointer;
        }

        .quick-grid button:hover {
          color: #ed347f;
          border-color: #f0a1c3;
          background: #fff0f6;
        }

        .minimum {
          margin-top: 9px;
          display: flex;
          align-items: center;
          gap: 5px;
          color: #aaa0a8;
          font-size: 9px;
        }

        .minimum span {
          color: #ed4386;
          font-size: 12px;
        }

        .minimum b {
          color: #716770;
        }

        .submit-button {
          width: 100%;
          height: 45px;
          margin-top: 14px;
          border: 0;
          border-radius: 9px;
          background: linear-gradient(
            135deg,
            #ff5796,
            #ed2e7f
          );
          color: white;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 7px 18px rgba(238, 45, 126, 0.2);
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .submit-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .spinner {
          width: 13px;
          height: 13px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .message-box {
          margin-top: 10px;
          padding: 10px;
          display: flex;
          gap: 7px;
          border: 1px solid #f2d7e4;
          border-radius: 8px;
          background: #fff5f9;
          color: #766a72;
          font-size: 9px;
          line-height: 1.5;
        }

        .message-icon {
          color: #e43c82;
          font-weight: 900;
        }

        .side-column {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .guide-card {
          padding: 15px;
        }

        .guide-icon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #ffe7f1;
          color: #e73580;
          font-size: 14px;
        }

        .steps {
          margin-top: 15px;
        }

        .step {
          display: grid;
          grid-template-columns: 24px 1fr;
          gap: 8px;
          position: relative;
          padding-bottom: 13px;
        }

        .step:last-child {
          padding-bottom: 0;
        }

        .step:not(:last-child)::after {
          content: "";
          position: absolute;
          left: 11px;
          top: 24px;
          bottom: 0;
          width: 1px;
          background: #f0dce6;
        }

        .step-number {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #fff0f6;
          color: #e9337f;
          font-size: 9px;
          font-weight: 900;
          position: relative;
          z-index: 2;
        }

        .step strong {
          color: #554b53;
          font-size: 9px;
        }

        .step p {
          margin: 3px 0 0;
          color: #aaa0a8;
          font-size: 8px;
          line-height: 1.45;
        }

        .support-card {
          padding: 12px;
        }

        .support-top {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .support-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: #ffe7f1;
          font-size: 14px;
        }

        .support-card strong {
          color: #554b53;
          font-size: 9px;
        }

        .support-card p {
          margin: 2px 0 0;
          color: #aaa0a8;
          font-size: 8px;
        }

        .support-card button {
          width: 100%;
          height: 32px;
          margin-top: 9px;
          border: 1px solid #f1b3cd;
          border-radius: 8px;
          background: white;
          color: #df327d;
          font-size: 9px;
          font-weight: 900;
          cursor: pointer;
        }

        .section-card {
          margin-top: 12px;
          padding: 17px;
        }

        .section-heading {
          margin-bottom: 14px;
        }

        .section-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          font-size: 10px;
        }

        .qr-layout {
          display: grid;
          grid-template-columns: 300px minmax(0, 1fr);
          gap: 22px;
          align-items: center;
        }

        .qr-side {
          display: flex;
          align-items: center;
          flex-direction: column;
        }

        .qr-box {
          padding: 9px;
          border: 1px solid #eee1e9;
          border-radius: 12px;
          background: white;
          box-shadow: 0 7px 20px rgba(40, 20, 35, 0.06);
        }

        .qr-image {
          display: block;
          width: 245px;
          height: 245px;
          object-fit: contain;
        }

        .qr-note {
          margin-top: 7px;
          color: #aaa0a8;
          font-size: 8px;
        }

        .payment-card {
          overflow: hidden;
          border: 1px solid #eee2e9;
          border-radius: 10px;
        }

        .payment-header {
          padding: 11px 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          background: #fff5fa;
          border-bottom: 1px solid #f1e2e9;
          color: #5e555d;
          font-size: 9px;
          font-weight: 800;
        }

        .payment-header b {
          color: #e43380;
          font-size: 8px;
        }

        .detail-row {
          min-height: 39px;
          padding: 9px 13px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid #f1e8ec;
          font-size: 9px;
        }

        .detail-row span {
          color: #aaa0a8;
        }

        .detail-row strong {
          color: #4f4750;
          text-align: right;
          word-break: break-word;
        }

        .pink-value {
          color: #e5317e !important;
          font-size: 11px;
        }

        .transfer-box {
          margin: 10px;
          padding: 10px;
          border: 1px solid #f1d8e5;
          border-radius: 8px;
          background: #fff4f9;
        }

        .transfer-box span {
          display: block;
          margin-bottom: 5px;
          color: #9e949b;
          font-size: 8px;
        }

        .transfer-box strong {
          color: #dc2e79;
          font-size: 11px;
          word-break: break-all;
        }

        .warning-box,
        .bank-warning {
          display: flex;
          gap: 7px;
          padding: 10px;
          border: 1px solid #f0e0bf;
          border-radius: 8px;
          background: #fffaf0;
          color: #917641;
          font-size: 8px;
          line-height: 1.5;
        }

        .warning-box {
          margin: 10px;
        }

        .bank-box {
          display: grid;
          grid-template-columns: 0.9fr 1.7fr;
          gap: 15px;
          padding: 13px;
          border: 1px solid #eee2e9;
          border-radius: 10px;
        }

        .bank-main {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .bank-logo {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: #fff0f5;
          color: #df347e;
          font-size: 11px;
          font-weight: 950;
        }

        .bank-name {
          color: #4e464e;
          font-size: 12px;
          font-weight: 900;
        }

        .bank-sub {
          margin-top: 2px;
          color: #aaa0a8;
          font-size: 8px;
        }

        .bank-info {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .bank-info > div {
          padding-left: 9px;
          border-left: 1px solid #eee3e8;
        }

        .bank-info span {
          display: block;
          color: #aaa0a8;
          font-size: 8px;
          margin-bottom: 4px;
        }

        .bank-info strong {
          display: block;
          color: #514950;
          font-size: 9px;
          word-break: break-word;
        }

        .bank-warning {
          margin-top: 9px;
        }

        .history-list {
          overflow: hidden;
          border: 1px solid #eee2e9;
          border-radius: 10px;
        }

        .history-item {
          min-height: 61px;
          padding: 10px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          background: white;
          border-bottom: 1px solid #f0e7eb;
        }

        .history-item:last-child {
          border-bottom: 0;
        }

        .history-item:hover {
          background: #fffafd;
        }

        .history-id {
          color: #514850;
          font-size: 9px;
          font-weight: 900;
        }

        .history-date {
          margin-top: 2px;
          color: #aaa0a8;
          font-size: 7px;
        }

        .history-content {
          display: inline-block;
          margin-top: 4px;
          padding: 2px 5px;
          border: 1px solid #f1d9e5;
          border-radius: 4px;
          background: #fff4f8;
          color: #dd3c80;
          font-size: 7px;
          word-break: break-all;
        }

        .history-right {
          text-align: right;
          flex-shrink: 0;
        }

        .history-right strong {
          display: block;
          color: #e3337f;
          font-size: 10px;
        }

        .status {
          display: inline-block;
          margin-top: 4px;
          padding: 3px 6px;
          border-radius: 999px;
          font-size: 7px;
          font-weight: 900;
        }

        .status.pending {
          color: #a77a13;
          background: #fff5d7;
        }

        .status.completed {
          color: #25864e;
          background: #e9faef;
        }

        .status.failed {
          color: #c33e4a;
          background: #fff0f1;
        }

        .empty-history {
          padding: 35px 15px;
          border: 1px dashed #eadfe5;
          border-radius: 10px;
          text-align: center;
        }

        .empty-icon {
          width: 43px;
          height: 43px;
          margin: auto auto 8px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: #fff0f6;
          color: #e63680;
          font-weight: 900;
        }

        .empty-history strong {
          display: block;
          color: #665c64;
          font-size: 10px;
        }

        .empty-history p {
          margin: 4px 0 0;
          color: #aaa0a8;
          font-size: 8px;
        }

        .footer {
          padding: 18px 0 5px;
          text-align: center;
          color: #aaa1a8;
          font-size: 8px;
        }

        .chat-admin {
          position: fixed;
          right: 18px;
          bottom: 18px;
          z-index: 120;
          border: 0;
          border-radius: 18px;
          padding: 8px 12px;
          background: #ff3987;
          color: white;
          font-size: 9px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 8px 22px rgba(255, 40, 125, 0.28);
        }

        .mobile-bottom-nav {
          display: none;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 900px) {
          .desktop-nav {
            display: none;
          }

          .topbar-inner {
            justify-content: space-between;
          }

          .deposit-grid {
            grid-template-columns: 1fr;
          }

          .qr-layout {
            grid-template-columns: 1fr;
          }

          .qr-side {
            order: 1;
          }

          .payment-card {
            order: 2;
          }

          .bank-box {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 620px) {
          .topbar {
            height: 57px;
          }

          .topbar-inner {
            padding: 0 13px;
          }

          .brand-main {
            font-size: 17px;
          }

          .brand-play {
            font-size: 10px;
            margin-left: 32px;
          }

          .wallet-button {
            display: none;
          }

          .main {
            width: calc(100% - 20px);
            padding: 14px 0 76px;
          }

          .petal {
            display: none;
          }

          .page-title {
            margin-bottom: 12px;
          }

          .page-title h1 {
            font-size: 20px;
          }

          .page-title p {
            font-size: 9px;
          }

          .deposit-card,
          .section-card {
            padding: 14px;
            border-radius: 12px;
          }

          .quick-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .qr-image {
            width: 220px;
            height: 220px;
          }

          .detail-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .detail-row strong {
            text-align: left;
          }

          .bank-info {
            grid-template-columns: 1fr;
          }

          .bank-info > div {
            padding: 7px 0 0;
            border-left: 0;
            border-top: 1px solid #eee3e8;
          }

          .bank-info > div:first-child {
            border-top: 0;
          }

          .history-item {
            align-items: flex-start;
          }

          .support-card {
            display: none;
          }

          .chat-admin {
            bottom: 72px;
            right: 12px;
          }

          .mobile-bottom-nav {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            height: 59px;
            z-index: 110;
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            background: rgba(255, 255, 255, 0.97);
            border-top: 1px solid #eee5eb;
            box-shadow: 0 -5px 20px rgba(30, 20, 30, 0.07);
            backdrop-filter: blur(12px);
          }

          .mobile-bottom-nav button {
            border: 0;
            background: transparent;
            color: #85818a;
            font-size: 7px;
            font-weight: 800;
            cursor: pointer;
          }

          .mobile-bottom-nav span {
            display: block;
            margin-bottom: 2px;
            font-size: 16px;
          }

          .mobile-bottom-nav button.mobile-active {
            color: #ed2f80;
          }

          .mobile-bottom-nav button.mobile-active span {
            color: #ed2f80;
          }
        }

        @media (max-width: 390px) {
          .quick-grid button {
            font-size: 8px;
          }

          .qr-image {
            width: 205px;
            height: 205px;
          }
        }
      `}</style>
    </>
  );
}
