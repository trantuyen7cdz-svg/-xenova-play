"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const BANK_NAME = "VIETCOMBANK";
const ACCOUNT_NAME = "TRAN VAN TUYEN";
const ACCOUNT_NUMBER = "9365717262";

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
        <div className="loading-logo">XENOVA PLAY</div>
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
            font-size: 28px;
            font-weight: 900;
            letter-spacing: 2px;
            color: #ed4f91;
          }

          .loading-spinner {
            width: 30px;
            height: 30px;
            margin-top: 18px;
            border: 3px solid #ffd5e7;
            border-top-color: #ed4f91;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          p {
            color: #999;
            font-size: 13px;
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
    <main className="site">

      {/* ================= HEADER ================= */}

      <header className="top-header">
        <div className="header-inner">

          <button
            className="brand"
            onClick={() => router.push("/")}
          >
            <div className="brand-icon">X</div>

            <div>
              <div className="brand-name">XENOVA PLAY</div>
              <div className="brand-sub">
                DIGITAL STORE
              </div>
            </div>
          </button>

          <nav className="desktop-nav">
            <button onClick={() => router.push("/")}>
              Trang chủ
            </button>

            <button onClick={() => router.push("/shop")}>
              Cửa hàng
            </button>

            <button className="active">
              Nạp tiền
            </button>

            <button onClick={() => router.push("/keys")}>
              KEY của tôi
            </button>

            <button onClick={() => router.push("/orders")}>
              Đơn hàng
            </button>

            <button onClick={() => router.push("/dashboard")}>
              Tài khoản
            </button>

            <button onClick={() => router.push("/settings")}>
              Cài đặt
            </button>
          </nav>

          <div className="header-actions">

            <div className="wallet">
              <span className="wallet-icon">₫</span>
              <span>Ví của tôi</span>
            </div>

            <button
              className="user-button"
              onClick={() => router.push("/dashboard")}
            >
              <span className="user-circle">
                {user?.email?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </button>

          </div>

        </div>
      </header>

      {/* ================= MOBILE NAV ================= */}

      <div className="mobile-nav">

        <button onClick={() => router.push("/")}>
          <span>⌂</span>
          Trang chủ
        </button>

        <button onClick={() => router.push("/shop")}>
          <span>🛍</span>
          Shop
        </button>

        <button className="mobile-active">
          <span>₫</span>
          Nạp tiền
        </button>

        <button onClick={() => router.push("/keys")}>
          <span>🔑</span>
          KEY
        </button>

        <button onClick={() => router.push("/dashboard")}>
          <span>☻</span>
          Tôi
        </button>

      </div>

      {/* ================= MAIN ================= */}

      <div className="page-background">

        <div className="pink-decoration decoration-one" />
        <div className="pink-decoration decoration-two" />
        <div className="petal petal-one">✿</div>
        <div className="petal petal-two">❀</div>
        <div className="petal petal-three">✿</div>

        <div className="content">

          {/* BREADCRUMB */}

          <div className="breadcrumb">
            <button onClick={() => router.push("/")}>
              Trang chủ
            </button>

            <span>/</span>

            <strong>Nạp tiền</strong>
          </div>

          {/* TITLE */}

          <div className="page-heading">
            <div className="heading-icon">
              ₫
            </div>

            <div>
              <h1>Nạp tiền</h1>
              <p>
                Nạp tiền vào ví XENOVA PLAY để mua sản phẩm
              </p>
            </div>
          </div>

          {/* ================= TWO COLUMNS ================= */}

          <div className="deposit-layout">

            {/* ================= LEFT ================= */}

            <section className="main-card">

              <div className="card-title">
                <div className="title-icon pink">
                  ₫
                </div>

                <div>
                  <h2>Nạp tiền vào ví</h2>
                  <p>
                    Nhập số tiền bạn muốn nạp
                  </p>
                </div>
              </div>

              <div className="amount-label">
                Số tiền nạp
              </div>

              <div className="amount-input-wrap">

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

              <div className="quick-title">
                Chọn nhanh
              </div>

              <div className="quick-money">

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

              <div className="minimum-note">
                <span>ⓘ</span>
                Số tiền nạp tối thiểu: <b>10.000đ</b>
              </div>

              <button
                className="continue-button"
                disabled={submitting}
                onClick={createDeposit}
              >
                {submitting ? (
                  <>
                    <span className="button-spinner" />
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
                  <span>✓</span>
                  <div>{message}</div>
                </div>
              )}

            </section>

            {/* ================= RIGHT ================= */}

            <aside className="side-column">

              <div className="info-card">

                <div className="side-title">
                  <span className="side-title-icon">
                    ♡
                  </span>

                  <div>
                    <h3>Hướng dẫn nạp tiền</h3>
                    <p>
                      Thực hiện theo các bước
                    </p>
                  </div>
                </div>

                <div className="steps">

                  <div className="step">
                    <div className="step-number">1</div>

                    <div>
                      <strong>
                        Nhập số tiền
                      </strong>

                      <p>
                        Chọn hoặc nhập số tiền muốn nạp.
                      </p>
                    </div>
                  </div>

                  <div className="step">
                    <div className="step-number">2</div>

                    <div>
                      <strong>
                        Tạo yêu cầu
                      </strong>

                      <p>
                        Nhấn nút tiếp tục để tạo đơn nạp.
                      </p>
                    </div>
                  </div>

                  <div className="step">
                    <div className="step-number">3</div>

                    <div>
                      <strong>
                        Chuyển khoản
                      </strong>

                      <p>
                        Quét QR và chuyển đúng số tiền,
                        nội dung.
                      </p>
                    </div>
                  </div>

                  <div className="step">
                    <div className="step-number">4</div>

                    <div>
                      <strong>
                        Nhận tiền
                      </strong>

                      <p>
                        Hệ thống xử lý sau khi xác nhận.
                      </p>
                    </div>
                  </div>

                </div>

              </div>

              <div className="support-card">

                <div className="support-icon">
                  💬
                </div>

                <div>
                  <strong>Cần hỗ trợ?</strong>
                  <p>
                    Liên hệ Admin nếu gặp vấn đề
                  </p>
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

          </div>

          {/* ================= QR ================= */}

          {depositInfo && (
            <section className="qr-section">

              <div className="section-heading">
                <div className="heading-icon">
                  QR
                </div>

                <div>
                  <h2>Thanh toán</h2>
                  <p>
                    Quét mã QR để chuyển khoản nhanh chóng
                  </p>
                </div>
              </div>

              <div className="qr-content">

                <div className="qr-left">

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

                <div className="payment-details">

                  <div className="payment-header">
                    <span>Thông tin chuyển khoản</span>
                    <b>ĐƠN #{depositInfo.depositId}</b>
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

          {/* ================= BANK INFO ================= */}

          <section className="bank-section">

            <div className="section-heading">

              <div className="heading-icon">
                🏦
              </div>

              <div>
                <h2>Thông tin chuyển khoản</h2>
                <p>
                  Thông tin tài khoản nhận tiền
                </p>
              </div>

            </div>

            <div className="bank-grid">

              <div className="bank-main">

                <div className="bank-logo">
                  VCB
                </div>

                <div>
                  <div className="bank-name">
                    {BANK_NAME}
                  </div>

                  <div className="bank-description">
                    Tài khoản ngân hàng XENOVA PLAY
                  </div>
                </div>

              </div>

              <div className="bank-details">

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

          {/* ================= HISTORY ================= */}

          <section className="history-section">

            <div className="section-heading">

              <div className="heading-icon">
                ↕
              </div>

              <div>
                <h2>Lịch sử nạp tiền</h2>
                <p>
                  Theo dõi các yêu cầu nạp tiền của bạn
                </p>
              </div>

            </div>

            {requests.length === 0 ? (
              <div className="empty-history">
                <div className="empty-icon">
                  ₫
                </div>

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

        </div>
      </div>

      {/* ================= STYLE ================= */}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .site {
          min-height: 100vh;
          background: #fff;
          color: #302a31;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        /* HEADER */

        .top-header {
          height: 72px;
          background: rgba(255, 255, 255, 0.96);
          border-bottom: 1px solid #f0e7ed;
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(15px);
        }

        .header-inner {
          max-width: 1240px;
          height: 100%;
          margin: 0 auto;
          padding: 0 22px;
          display: flex;
          align-items: center;
          gap: 28px;
        }

        .brand {
          border: 0;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          padding: 0;
          flex-shrink: 0;
        }

        .brand-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          color: white;
          font-weight: 1000;
          font-size: 18px;
          background:
            linear-gradient(
              135deg,
              #ff79b3,
              #eb3f86
            );
          box-shadow:
            0 7px 18px rgba(235, 63, 134, 0.22);
        }

        .brand-name {
          color: #29222a;
          font-size: 16px;
          font-weight: 950;
          letter-spacing: 0.4px;
        }

        .brand-sub {
          margin-top: 2px;
          color: #b5aab3;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .desktop-nav {
          display: flex;
          align-items: center;
          gap: 3px;
          flex: 1;
        }

        .desktop-nav button {
          border: 0;
          background: transparent;
          color: #766d75;
          font-size: 12px;
          font-weight: 700;
          padding: 9px 11px;
          border-radius: 9px;
          cursor: pointer;
          white-space: nowrap;
        }

        .desktop-nav button:hover {
          background: #fff2f7;
          color: #ed4f91;
        }

        .desktop-nav button.active {
          background: #fff0f6;
          color: #e9488b;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .wallet {
          border: 1px solid #f0dfe8;
          background: #fff9fc;
          border-radius: 999px;
          padding: 8px 13px;
          display: flex;
          align-items: center;
          gap: 7px;
          color: #695f68;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .wallet-icon {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #ffe3ef;
          color: #e74789;
          font-weight: 900;
        }

        .user-button {
          border: 0;
          background: transparent;
          padding: 0;
          cursor: pointer;
        }

        .user-circle {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: white;
          font-size: 12px;
          font-weight: 900;
          background:
            linear-gradient(
              135deg,
              #ff92bd,
              #e84589
            );
        }

        /* BACKGROUND */

        .page-background {
          min-height: calc(100vh - 72px);
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(
              180deg,
              #fff8fb 0%,
              #fff 22%,
              #fff 100%
            );
        }

        .pink-decoration {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(1px);
        }

        .decoration-one {
          width: 350px;
          height: 350px;
          right: -150px;
          top: 100px;
          background: rgba(255, 197, 221, 0.22);
        }

        .decoration-two {
          width: 280px;
          height: 280px;
          left: -160px;
          top: 540px;
          background: rgba(255, 214, 231, 0.18);
        }

        .petal {
          position: absolute;
          color: #f4a7c5;
          opacity: 0.4;
          font-size: 30px;
          pointer-events: none;
        }

        .petal-one {
          right: 7%;
          top: 75px;
          transform: rotate(20deg);
        }

        .petal-two {
          left: 5%;
          top: 280px;
          font-size: 22px;
          transform: rotate(-25deg);
        }

        .petal-three {
          right: 12%;
          top: 610px;
          font-size: 20px;
          transform: rotate(45deg);
        }

        /* CONTENT */

        .content {
          width: min(1160px, calc(100% - 34px));
          margin: 0 auto;
          padding: 26px 0 80px;
          position: relative;
          z-index: 2;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #aaa0a8;
          font-size: 11px;
          margin-bottom: 18px;
        }

        .breadcrumb button {
          border: 0;
          background: transparent;
          color: #9c919a;
          padding: 0;
          cursor: pointer;
          font-size: 11px;
        }

        .breadcrumb button:hover {
          color: #e9498b;
        }

        .breadcrumb strong {
          color: #e64b8b;
        }

        .page-heading {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 25px;
        }

        .heading-icon {
          width: 43px;
          height: 43px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          color: #e94b8c;
          background: #ffe7f1;
          font-weight: 950;
          font-size: 15px;
          flex-shrink: 0;
        }

        .page-heading h1,
        .section-heading h2 {
          margin: 0;
          color: #302932;
          font-weight: 950;
        }

        .page-heading h1 {
          font-size: 25px;
        }

        .page-heading p,
        .section-heading p {
          margin: 4px 0 0;
          color: #a59aa2;
          font-size: 12px;
        }

        /* MAIN GRID */

        .deposit-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(300px, 0.9fr);
          gap: 18px;
          align-items: start;
        }

        .main-card,
        .info-card,
        .support-card,
        .qr-section,
        .bank-section,
        .history-section {
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid #f0e5eb;
          border-radius: 18px;
          box-shadow:
            0 10px 30px rgba(67, 30, 51, 0.045);
        }

        .main-card {
          padding: 25px;
        }

        .card-title,
        .side-title,
        .section-heading {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .title-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          font-weight: 900;
        }

        .title-icon.pink {
          color: #e64a8b;
          background: #ffe6f1;
        }

        .card-title h2,
        .side-title h3 {
          margin: 0;
          color: #332b33;
          font-size: 17px;
          font-weight: 900;
        }

        .card-title p,
        .side-title p {
          margin: 3px 0 0;
          color: #aaa0a8;
          font-size: 11px;
        }

        .amount-label {
          margin-top: 27px;
          margin-bottom: 8px;
          color: #625862;
          font-size: 12px;
          font-weight: 800;
        }

        .amount-input-wrap {
          height: 57px;
          position: relative;
        }

        .amount-input-wrap input {
          width: 100%;
          height: 100%;
          border: 1px solid #e8dce3;
          border-radius: 12px;
          outline: none;
          background: #fff;
          color: #322b32;
          padding: 0 72px 0 16px;
          font-size: 19px;
          font-weight: 800;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.015);
        }

        .amount-input-wrap input:focus {
          border-color: #ef8fb6;
          box-shadow:
            0 0 0 3px rgba(239, 143, 182, 0.11);
        }

        .amount-input-wrap input::placeholder {
          color: #c5bbc2;
          font-weight: 500;
        }

        .amount-input-wrap span {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #aaa0a8;
          font-size: 11px;
          font-weight: 900;
        }

        .quick-title {
          margin-top: 17px;
          margin-bottom: 8px;
          color: #716771;
          font-size: 11px;
          font-weight: 800;
        }

        .quick-money {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 7px;
        }

        .quick-money button {
          border: 1px solid #ebdfe6;
          background: #fffafd;
          border-radius: 9px;
          padding: 9px 3px;
          color: #766b74;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.15s;
        }

        .quick-money button:hover {
          border-color: #f0a2c3;
          color: #e7488a;
          background: #fff2f7;
        }

        .minimum-note {
          margin-top: 12px;
          color: #aaa0a8;
          font-size: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .minimum-note span {
          color: #e95896;
          font-size: 13px;
        }

        .minimum-note b {
          color: #756b73;
        }

        .continue-button {
          width: 100%;
          height: 50px;
          margin-top: 18px;
          border: 0;
          border-radius: 11px;
          background:
            linear-gradient(
              135deg,
              #f267a1,
              #df4085
            );
          color: #fff;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          box-shadow:
            0 8px 20px rgba(226, 67, 132, 0.17);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
        }

        .continue-button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .continue-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .button-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .message-box {
          margin-top: 13px;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid #f4d7e4;
          background: #fff6fa;
          color: #776b73;
          font-size: 11px;
          line-height: 1.55;
          display: flex;
          gap: 8px;
        }

        .message-box > span {
          color: #df4788;
          font-weight: 900;
        }

        /* SIDEBAR */

        .side-column {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .info-card {
          padding: 19px;
        }

        .side-title-icon {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #ffe8f1;
          color: #e74c8b;
          font-size: 15px;
        }

        .steps {
          margin-top: 20px;
        }

        .step {
          display: grid;
          grid-template-columns: 27px 1fr;
          gap: 9px;
          position: relative;
          padding-bottom: 17px;
        }

        .step:last-child {
          padding-bottom: 0;
        }

        .step:not(:last-child)::after {
          content: "";
          position: absolute;
          left: 13px;
          top: 27px;
          bottom: 0;
          width: 1px;
          background: #f0dfe7;
        }

        .step-number {
          width: 27px;
          height: 27px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #fff0f6;
          color: #e74a8b;
          font-size: 10px;
          font-weight: 900;
          position: relative;
          z-index: 2;
        }

        .step strong {
          display: block;
          color: #554c54;
          font-size: 11px;
        }

        .step p {
          margin: 4px 0 0;
          color: #aaa0a8;
          font-size: 10px;
          line-height: 1.5;
        }

        .support-card {
          padding: 15px;
          display: grid;
          grid-template-columns: 37px 1fr;
          gap: 10px;
          align-items: center;
          background:
            linear-gradient(
              135deg,
              #fff7fb,
              #fff
            );
        }

        .support-icon {
          width: 37px;
          height: 37px;
          border-radius: 11px;
          display: grid;
          place-items: center;
          background: #ffe6f1;
          font-size: 16px;
        }

        .support-card strong {
          color: #4e454d;
          font-size: 11px;
        }

        .support-card p {
          margin: 3px 0 0;
          color: #aaa0a8;
          font-size: 9px;
        }

        .support-card button {
          grid-column: 1 / -1;
          width: 100%;
          height: 35px;
          border: 1px solid #f0b5cf;
          border-radius: 9px;
          background: #fff;
          color: #df4889;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .support-card button:hover {
          background: #fff0f6;
        }

        /* SECTIONS */

        .qr-section,
        .bank-section,
        .history-section {
          margin-top: 18px;
          padding: 23px;
        }

        .section-heading {
          margin-bottom: 20px;
        }

        .qr-content {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 28px;
          align-items: center;
        }

        .qr-left {
          display: flex;
          align-items: center;
          flex-direction: column;
        }

        .qr-box {
          background: #fff;
          padding: 12px;
          border: 1px solid #eee3e9;
          border-radius: 14px;
          box-shadow:
            0 8px 25px rgba(55, 25, 42, 0.06);
        }

        .qr-image {
          display: block;
          width: 270px;
          height: 270px;
          object-fit: contain;
        }

        .qr-note {
          margin-top: 9px;
          color: #a69ba3;
          font-size: 10px;
        }

        .payment-details {
          border: 1px solid #eee3e9;
          border-radius: 13px;
          overflow: hidden;
        }

        .payment-header {
          padding: 13px 15px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          background: #fff7fa;
          border-bottom: 1px solid #f1e2e9;
          color: #625861;
          font-size: 11px;
          font-weight: 800;
        }

        .payment-header b {
          color: #e64a8b;
          font-size: 9px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 12px 15px;
          border-bottom: 1px solid #f2e9ed;
          font-size: 11px;
        }

        .detail-row span {
          color: #a59ba2;
        }

        .detail-row strong {
          color: #4c444b;
          text-align: right;
          word-break: break-word;
        }

        .pink-value {
          color: #e4498a !important;
          font-size: 13px;
        }

        .transfer-box {
          margin: 12px;
          padding: 12px;
          border-radius: 10px;
          background: #fff5f9;
          border: 1px solid #f3dce7;
        }

        .transfer-box span {
          display: block;
          color: #9d929a;
          font-size: 9px;
          margin-bottom: 6px;
        }

        .transfer-box strong {
          color: #dd4385;
          font-size: 13px;
          letter-spacing: 0.5px;
          word-break: break-all;
        }

        .warning-box,
        .bank-warning {
          display: flex;
          gap: 9px;
          padding: 12px;
          border-radius: 10px;
          background: #fffaf0;
          border: 1px solid #f3e4c2;
          color: #9a7c43;
          font-size: 10px;
          line-height: 1.55;
        }

        .warning-box {
          margin: 12px;
        }

        /* BANK */

        .bank-grid {
          display: grid;
          grid-template-columns: 0.9fr 1.6fr;
          gap: 15px;
          border: 1px solid #eee3e9;
          border-radius: 13px;
          padding: 16px;
        }

        .bank-main {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .bank-logo {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background:
            linear-gradient(
              135deg,
              #f8e8ef,
              #fff5f9
            );
          color: #e14a88;
          font-weight: 950;
          font-size: 13px;
        }

        .bank-name {
          color: #514850;
          font-size: 14px;
          font-weight: 900;
        }

        .bank-description {
          margin-top: 3px;
          color: #aaa0a8;
          font-size: 9px;
        }

        .bank-details {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .bank-details div {
          padding-left: 12px;
          border-left: 1px solid #eee4e9;
        }

        .bank-details span {
          display: block;
          color: #aaa0a8;
          font-size: 9px;
          margin-bottom: 5px;
        }

        .bank-details strong {
          display: block;
          color: #50474f;
          font-size: 11px;
          word-break: break-word;
        }

        .bank-warning {
          margin-top: 12px;
        }

        /* HISTORY */

        .history-list {
          border: 1px solid #eee3e9;
          border-radius: 13px;
          overflow: hidden;
        }

        .history-item {
          min-height: 70px;
          padding: 13px 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          border-bottom: 1px solid #f0e7eb;
          background: #fff;
        }

        .history-item:last-child {
          border-bottom: 0;
        }

        .history-item:hover {
          background: #fffafd;
        }

        .history-id {
          color: #514950;
          font-size: 11px;
          font-weight: 900;
        }

        .history-date {
          margin-top: 3px;
          color: #aaa0a8;
          font-size: 9px;
        }

        .history-content {
          display: inline-block;
          margin-top: 6px;
          padding: 3px 6px;
          border-radius: 5px;
          background: #fff4f8;
          border: 1px solid #f1d9e5;
          color: #dd4a88;
          font-size: 8px;
          word-break: break-all;
        }

        .history-right {
          text-align: right;
          flex-shrink: 0;
        }

        .history-right > strong {
          display: block;
          color: #e04887;
          font-size: 12px;
        }

        .status {
          display: inline-block;
          margin-top: 5px;
          padding: 4px 7px;
          border-radius: 999px;
          font-size: 8px;
          font-weight: 900;
        }

        .status.pending {
          color: #aa7b16;
          background: #fff6d9;
        }

        .status.completed {
          color: #258c50;
          background: #e9faef;
        }

        .status.failed {
          color: #c43e4b;
          background: #fff0f1;
        }

        .empty-history {
          border: 1px dashed #eadfe5;
          border-radius: 13px;
          padding: 45px 20px;
          text-align: center;
        }

        .empty-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 10px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: #fff0f6;
          color: #e64b8b;
          font-weight: 900;
        }

        .empty-history strong {
          display: block;
          color: #665d64;
          font-size: 12px;
        }

        .empty-history p {
          margin: 5px 0 0;
          color: #aaa0a8;
          font-size: 10px;
        }

        /* MOBILE NAV */

        .mobile-nav {
          display: none;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* TABLET */

        @media (max-width: 900px) {
          .desktop-nav {
            display: none;
          }

          .header-inner {
            justify-content: space-between;
          }

          .deposit-layout {
            grid-template-columns: 1fr;
          }

          .qr-content {
            grid-template-columns: 1fr;
          }

          .qr-left {
            order: 1;
          }

          .payment-details {
            order: 2;
          }

          .bank-grid {
            grid-template-columns: 1fr;
          }

          .bank-details {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        /* MOBILE */

        @media (max-width: 620px) {
          .top-header {
            height: 62px;
          }

          .header-inner {
            padding: 0 15px;
          }

          .brand-icon {
            width: 34px;
            height: 34px;
            border-radius: 10px;
          }

          .brand-name {
            font-size: 14px;
          }

          .brand-sub {
            display: none;
          }

          .wallet {
            display: none;
          }

          .user-circle {
            width: 32px;
            height: 32px;
          }

          .page-background {
            min-height: calc(100vh - 62px);
            padding-bottom: 64px;
          }

          .content {
            width: calc(100% - 24px);
            padding-top: 18px;
          }

          .page-heading h1 {
            font-size: 22px;
          }

          .main-card,
          .qr-section,
          .bank-section,
          .history-section {
            padding: 17px;
            border-radius: 15px;
          }

          .quick-money {
            grid-template-columns: repeat(3, 1fr);
          }

          .qr-image {
            width: 245px;
            height: 245px;
          }

          .detail-row {
            flex-direction: column;
            gap: 4px;
          }

          .detail-row strong {
            text-align: left;
          }

          .bank-details {
            grid-template-columns: 1fr;
          }

          .bank-details div {
            padding: 9px 0 0;
            border-left: 0;
            border-top: 1px solid #eee4e9;
          }

          .bank-details div:first-child {
            border-top: 0;
          }

          .history-item {
            align-items: flex-start;
          }

          .mobile-nav {
            position: fixed;
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            left: 0;
            right: 0;
            bottom: 0;
            height: 61px;
            background: rgba(255,255,255,.97);
            border-top: 1px solid #eee2e8;
            z-index: 200;
            backdrop-filter: blur(15px);
          }

          .mobile-nav button {
            border: 0;
            background: transparent;
            color: #aaa0a8;
            font-size: 8px;
            font-weight: 800;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            cursor: pointer;
          }

          .mobile-nav button span {
            font-size: 17px;
            line-height: 17px;
          }

          .mobile-nav button.mobile-active {
            color: #e64b8b;
          }

          .mobile-nav button.mobile-active span {
            color: #e64b8b;
          }

          .support-card {
            display: none;
          }

          .petal {
            display: none;
          }
        }

        @media (max-width: 390px) {
          .brand-name {
            font-size: 13px;
          }

          .quick-money button {
            font-size: 9px;
          }

          .qr-image {
            width: 220px;
            height: 220px;
          }
        }
      `}</style>
    </main>
  );
}
