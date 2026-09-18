"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const BANK_NAME = "VIETCOMBANK";
const ACCOUNT_NAME = "TRAN VAN TUYEN";
const ACCOUNT_NUMBER = "9365717262";

// QR đặt trong thư mục public:
// public/qr-vietcombank.jpg
const QR_IMAGE = "/qr-vietcombank.jpg";

export default function DepositPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [amount, setAmount] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");
  const [requests, setRequests] = useState([]);

  // Thông tin thanh toán chỉ hiện sau khi tạo yêu cầu
  const [paymentInfo, setPaymentInfo] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error(error);
      }

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      await loadRequests(user.id);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function loadRequests(userId) {
    const { data, error } = await supabase
      .from("deposit_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("LOAD DEPOSIT ERROR:", error);
      return;
    }

    setRequests(data || []);
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("vi-VN") + "đ";
  }

  function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleString("vi-VN");
  }

  function cleanAmount(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function copyText(text) {
    navigator.clipboard
      ?.writeText(String(text))
      .then(() => {
        setMessage("Đã sao chép.");
        setTimeout(() => {
          setMessage("");
        }, 1500);
      })
      .catch(() => {
        setMessage("Không thể sao chép tự động.");
      });
  }

  async function createDeposit() {
    setMessage("");

    const money = Number(amount);

    if (!money || money < 10000) {
      setMessage("Số tiền nạp tối thiểu là 10.000đ.");
      return;
    }

    if (money > 100000000) {
      setMessage("Số tiền nạp tối đa là 100.000.000đ.");
      return;
    }

    setSubmitting(true);

    try {
      // ================================
      // LẤY SESSION ĐỂ GỬI ACCESS TOKEN
      // ================================
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessage(
          "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại."
        );

        setTimeout(() => {
          router.push("/login");
        }, 1200);

        return;
      }

      // ================================
      // GỌI API TẠO YÊU CẦU NẠP
      // ================================
      const response = await fetch(
        "/api/deposit/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            amount: money,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Không thể tạo yêu cầu nạp tiền."
        );
      }

      // ================================
      // HIỆN THÔNG TIN THANH TOÁN
      // ================================
      setPaymentInfo({
        id: result.depositId,
        amount: result.amount || money,
        transferContent:
          result.transferContent ||
          `XENOVA ${result.depositId}`,
      });

      setMessage(
        "Đã tạo yêu cầu nạp tiền. Hãy chuyển khoản đúng thông tin bên dưới."
      );

      // Xóa ô nhập tiền
      setAmount("");

      // Cập nhật lịch sử
      if (user?.id) {
        await loadRequests(user.id);
      }
    } catch (error) {
      console.error("CREATE DEPOSIT ERROR:", error);

      setMessage(
        error.message ||
          "Có lỗi xảy ra khi tạo yêu cầu nạp tiền."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="deposit-page">
        <div className="deposit-box">
          <div className="loading">
            Đang tải...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="deposit-page">
      <div className="deposit-container">

        {/* ================= BACK ================= */}

        <button
          className="back-button"
          onClick={() => router.back()}
        >
          ← Quay lại
        </button>

        {/* ================= HEADER ================= */}

        <div className="header">
          <div className="logo">
            XENOVA PLAY
          </div>

          <div className="subtitle">
            NẠP TIỀN TÀI KHOẢN
          </div>
        </div>

        {/* ================= CHỌN TIỀN ================= */}

        <section className="card">
          <h2>💰 Nạp tiền</h2>

          <p className="muted">
            Chọn số tiền bạn muốn nạp.
            Thông tin thanh toán sẽ chỉ hiện
            sau khi tạo yêu cầu.
          </p>

          <div className="field">
            <label>Số tiền muốn nạp</label>

            <input
              value={
                amount
                  ? Number(amount).toLocaleString(
                      "vi-VN"
                    )
                  : ""
              }
              onChange={(e) => {
                setAmount(
                  cleanAmount(e.target.value)
                );
              }}
              placeholder="Ví dụ: 50.000"
              inputMode="numeric"
            />

            <span className="currency">
              VNĐ
            </span>
          </div>

          {/* SỐ TIỀN NHANH */}

          <div className="quick-money">
            {[
              10000,
              20000,
              50000,
              100000,
              200000,
              500000,
            ].map((money) => (
              <button
                key={money}
                type="button"
                className={
                  Number(amount) === money
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  setAmount(String(money))
                }
              >
                {formatMoney(money)}
              </button>
            ))}
          </div>

          <button
            className="primary-button"
            disabled={submitting}
            onClick={createDeposit}
          >
            {submitting
              ? "ĐANG TẠO..."
              : "TIẾP TỤC"}
          </button>

          {message && (
            <div className="message">
              {message}
            </div>
          )}
        </section>

        {/* ================================================= */}
        {/* THÔNG TIN THANH TOÁN                              */}
        {/* CHỈ HIỆN SAU KHI TẠO YÊU CẦU                    */}
        {/* ================================================= */}

        {paymentInfo && (
          <section className="card payment-card">

            <div className="payment-title">
              <div className="success-icon">
                ✓
              </div>

              <div>
                <h2>
                  Thông tin thanh toán
                </h2>

                <p>
                  Yêu cầu #{paymentInfo.id}
                </p>
              </div>
            </div>

            {/* QR */}

            <div className="qr-section">
              <div className="qr-title">
                QUÉT MÃ QR ĐỂ CHUYỂN KHOẢN
              </div>

              <div className="qr-box">
                <img
                  src={QR_IMAGE}
                  alt="QR Vietcombank"
                  className="qr-image"
                />
              </div>

              <div className="qr-note">
                Số tiền trên QR sẽ theo yêu cầu
                bạn vừa tạo.
              </div>
            </div>

            {/* BANK */}

            <div className="bank-card">

              <div className="bank-title">
                🏦 {BANK_NAME}
              </div>

              <div className="bank-row">
                <span>
                  Chủ tài khoản
                </span>

                <div className="copy-value">
                  <strong>
                    {ACCOUNT_NAME}
                  </strong>

                  <button
                    onClick={() =>
                      copyText(ACCOUNT_NAME)
                    }
                  >
                    COPY
                  </button>
                </div>
              </div>

              <div className="bank-row">
                <span>
                  Số tài khoản
                </span>

                <div className="copy-value">
                  <strong>
                    {ACCOUNT_NUMBER}
                  </strong>

                  <button
                    onClick={() =>
                      copyText(
                        ACCOUNT_NUMBER
                      )
                    }
                  >
                    COPY
                  </button>
                </div>
              </div>

              <div className="bank-row">
                <span>
                  Số tiền
                </span>

                <div className="copy-value">
                  <strong className="money">
                    {formatMoney(
                      paymentInfo.amount
                    )}
                  </strong>

                  <button
                    onClick={() =>
                      copyText(
                        paymentInfo.amount
                      )
                    }
                  >
                    COPY
                  </button>
                </div>
              </div>

              <div className="bank-row">
                <span>
                  Nội dung
                </span>

                <div className="copy-value">
                  <strong className="content">
                    {paymentInfo.transferContent}
                  </strong>

                  <button
                    onClick={() =>
                      copyText(
                        paymentInfo.transferContent
                      )
                    }
                  >
                    COPY
                  </button>
                </div>
              </div>

            </div>

            {/* WARNING */}

            <div className="warning">
              ⚠️ <strong>LƯU Ý</strong>
              <br />
              Chuyển khoản đúng số tiền:
              <strong>
                {" "}
                {formatMoney(
                  paymentInfo.amount
                )}
              </strong>
              <br />
              Nội dung chuyển khoản:
              <strong>
                {" "}
                {paymentInfo.transferContent}
              </strong>
              <br />
              Sau khi chuyển khoản, vui lòng chờ
              Admin kiểm tra và cộng tiền vào ví.
            </div>

            <button
              className="new-deposit"
              onClick={() => {
                setPaymentInfo(null);
                setMessage("");
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }}
            >
              + TẠO YÊU CẦU NẠP KHÁC
            </button>
          </section>
        )}

        {/* ================= HISTORY ================= */}

        <section className="card">
          <h2>📋 Lịch sử nạp tiền</h2>

          {requests.length === 0 ? (
            <div className="empty">
              Chưa có yêu cầu nạp tiền.
            </div>
          ) : (
            <div className="requests">
              {requests.map((item) => (
                <div
                  className="request"
                  key={item.id}
                >
                  <div>
                    <strong>
                      #{item.id}
                    </strong>

                    <div className="small">
                      {formatDate(
                        item.created_at
                      )}
                    </div>

                    {item.transfer_content && (
                      <div className="history-content">
                        {item.transfer_content}
                      </div>
                    )}
                  </div>

                  <div className="request-right">
                    <strong>
                      {formatMoney(item.amount)}
                    </strong>

                    <span
                      className={`status ${item.status}`}
                    >
                      {item.status ===
                      "pending"
                        ? "ĐANG CHỜ"
                        : item.status ===
                          "completed"
                        ? "HOÀN THÀNH"
                        : "THẤT BẠI"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .deposit-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top,
              rgba(70, 70, 120, 0.25),
              transparent 40%
            ),
            #07070b;
          color: #fff;
          padding: 20px;
        }

        .deposit-container {
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
        }

        .back-button {
          border: 0;
          background: transparent;
          color: #aaa;
          font-size: 14px;
          cursor: pointer;
          padding: 5px 0 20px;
        }

        .header {
          text-align: center;
          margin-bottom: 25px;
        }

        .logo {
          font-size: 30px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .subtitle {
          margin-top: 6px;
          color: #8d8d9b;
          font-size: 13px;
          letter-spacing: 2px;
        }

        .card {
          background: rgba(
            20,
            20,
            28,
            0.95
          );
          border: 1px solid #292936;
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 16px;
          box-shadow:
            0 10px 35px
            rgba(0, 0, 0, 0.25);
        }

        h2 {
          margin: 0 0 8px;
          font-size: 20px;
        }

        .muted {
          color: #8d8d9b;
          font-size: 14px;
          margin-bottom: 20px;
          line-height: 1.6;
        }

        .field {
          position: relative;
        }

        label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          color: #aaa;
        }

        input {
          width: 100%;
          height: 56px;
          border: 1px solid #333341;
          border-radius: 13px;
          background: #0e0e14;
          color: white;
          padding: 0 60px 0 16px;
          font-size: 20px;
          outline: none;
        }

        input:focus {
          border-color: #7070ff;
        }

        .currency {
          position: absolute;
          right: 16px;
          top: 39px;
          color: #888;
          font-size: 13px;
        }

        .quick-money {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 8px;
          margin: 12px 0;
        }

        .quick-money button {
          border: 1px solid #333341;
          border-radius: 10px;
          background: #111119;
          color: #ddd;
          padding: 10px 5px;
          cursor: pointer;
          transition: 0.15s;
        }

        .quick-money button:hover {
          border-color: #7777ff;
        }

        .quick-money button.selected {
          border-color: #7777ff;
          background: #1c1c36;
          color: #fff;
        }

        .primary-button {
          width: 100%;
          height: 52px;
          border: 0;
          border-radius: 12px;
          background:
            linear-gradient(
              135deg,
              #6262ff,
              #8a4dff
            );
          color: white;
          font-weight: 800;
          cursor: pointer;
          margin-top: 5px;
        }

        .primary-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .message {
          margin-top: 14px;
          padding: 12px;
          border-radius: 10px;
          background: #151522;
          color: #bdbdff;
          font-size: 13px;
          line-height: 1.5;
        }

        /* ================= PAYMENT ================= */

        .payment-card {
          border-color: #3d3d70;
        }

        .payment-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .payment-title h2 {
          margin: 0;
        }

        .payment-title p {
          margin: 4px 0 0;
          color: #888;
          font-size: 12px;
        }

        .success-icon {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #17351f;
          color: #55e68a;
          font-size: 23px;
          font-weight: 900;
        }

        .qr-section {
          text-align: center;
          padding: 5px 0 20px;
        }

        .qr-title {
          font-size: 12px;
          color: #aaa;
          font-weight: 800;
          letter-spacing: 1px;
          margin-bottom: 13px;
        }

        .qr-box {
          width: 240px;
          height: 240px;
          padding: 10px;
          margin: 0 auto;
          background: white;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .qr-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }

        .qr-note {
          color: #777;
          font-size: 11px;
          margin-top: 10px;
        }

        .bank-card {
          background:
            linear-gradient(
              135deg,
              #11151c,
              #18131f
            );
          border: 1px solid #343444;
          border-radius: 15px;
          padding: 17px;
          margin-top: 5px;
        }

        .bank-title {
          font-weight: 900;
          font-size: 18px;
          margin-bottom: 15px;
        }

        .bank-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          padding: 12px 0;
          border-bottom: 1px solid #292934;
          font-size: 13px;
        }

        .bank-row:last-child {
          border-bottom: 0;
        }

        .bank-row > span {
          color: #888;
          flex-shrink: 0;
        }

        .copy-value {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 7px;
          text-align: right;
        }

        .copy-value strong {
          word-break: break-word;
        }

        .copy-value button {
          border: 1px solid #38384a;
          background: #151522;
          color: #aaaaff;
          border-radius: 7px;
          padding: 5px 7px;
          font-size: 9px;
          font-weight: 800;
          cursor: pointer;
        }

        .copy-value button:hover {
          border-color: #7777ff;
          color: white;
        }

        .money {
          color: #5ee88b;
        }

        .content {
          color: #aaaaff;
        }

        .warning {
          margin-top: 15px;
          padding: 13px;
          background: #211b0b;
          border: 1px solid #4d3b10;
          border-radius: 10px;
          color: #e8d28a;
          font-size: 12px;
          line-height: 1.7;
        }

        .new-deposit {
          width: 100%;
          height: 46px;
          margin-top: 14px;
          border: 1px solid #343444;
          border-radius: 10px;
          background: #111119;
          color: #ccc;
          font-weight: 800;
          cursor: pointer;
        }

        .new-deposit:hover {
          border-color: #7777ff;
          color: white;
        }

        /* ================= HISTORY ================= */

        .empty {
          padding: 25px 5px;
          text-align: center;
          color: #777;
          font-size: 14px;
        }

        .request {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 15px 0;
          border-bottom: 1px solid #292934;
        }

        .request:last-child {
          border-bottom: 0;
        }

        .request-right {
          text-align: right;
          flex-shrink: 0;
        }

        .small {
          color: #777;
          font-size: 11px;
          margin-top: 5px;
        }

        .history-content {
          margin-top: 6px;
          color: #7777ff;
          font-size: 11px;
        }

        .status {
          display: block;
          margin-top: 5px;
          font-size: 10px;
          font-weight: 800;
        }

        .status.pending {
          color: #e9c34a;
        }

        .status.completed {
          color: #49d27c;
        }

        .status.failed {
          color: #ff6262;
        }

        .loading {
          text-align: center;
          padding: 80px 20px;
          color: #aaa;
        }

        @media (max-width: 430px) {
          .deposit-page {
            padding: 14px;
          }

          .card {
            padding: 16px;
          }

          .logo {
            font-size: 26px;
          }

          .qr-box {
            width: 210px;
            height: 210px;
          }

          .bank-row {
            align-items: flex-start;
          }

          .copy-value {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </main>
  );
}
