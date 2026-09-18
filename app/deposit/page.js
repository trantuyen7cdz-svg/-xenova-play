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

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      const { data, error } = await supabase
        .from("deposit_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error) {
        setRequests(data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("vi-VN") + "đ";
  }

  function formatDate(value) {
    return new Date(value).toLocaleString("vi-VN");
  }

  function cleanAmount(value) {
    return value.replace(/\D/g, "");
  }

  async function createDeposit() {
    setMessage("");

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
      const response = await fetch("/api/deposit/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: money,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tạo yêu cầu nạp tiền.");
      }

      setMessage(
        `Đã tạo yêu cầu nạp ${formatMoney(money)}. Vui lòng chuyển khoản đúng nội dung.`
      );

      setAmount("");

      await loadData();
    } catch (error) {
      setMessage(error.message || "Có lỗi xảy ra.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="deposit-page">
        <div className="deposit-box">
          <div className="loading">Đang tải...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="deposit-page">
      <div className="deposit-container">

        <button
          className="back-button"
          onClick={() => router.back()}
        >
          ← Quay lại
        </button>

        <div className="header">
          <div className="logo">XENOVA PLAY</div>
          <div className="subtitle">NẠP TIỀN TÀI KHOẢN</div>
        </div>

        <section className="card">
          <h2>Nạp tiền</h2>

          <p className="muted">
            Nhập số tiền bạn muốn nạp vào tài khoản.
          </p>

          <div className="field">
            <label>Số tiền</label>

            <input
              value={
                amount
                  ? Number(amount).toLocaleString("vi-VN")
                  : ""
              }
              onChange={(e) => {
                setAmount(cleanAmount(e.target.value));
              }}
              placeholder="Ví dụ: 50.000"
              inputMode="numeric"
            />

            <span className="currency">VNĐ</span>
          </div>

          <div className="quick-money">
            {[10000, 20000, 50000, 100000, 200000].map((money) => (
              <button
                key={money}
                onClick={() => setAmount(String(money))}
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
            {submitting ? "ĐANG TẠO..." : "TIẾP TỤC"}
          </button>

          {message && (
            <div className="message">
              {message}
            </div>
          )}
        </section>

        <section className="card">
          <h2>Thông tin chuyển khoản</h2>

          <div className="bank-card">
            <div className="bank-title">
              {BANK_NAME}
            </div>

            <div className="bank-row">
              <span>Chủ tài khoản</span>
              <strong>{ACCOUNT_NAME}</strong>
            </div>

            <div className="bank-row">
              <span>Số tài khoản</span>
              <strong>{ACCOUNT_NUMBER}</strong>
            </div>

            <div className="bank-row">
              <span>Nội dung</span>
              <strong>XENOVA MÃĐƠN</strong>
            </div>
          </div>

          <div className="warning">
            ⚠️ Chỉ chuyển khoản sau khi đã tạo yêu cầu nạp tiền.
            <br />
            Nội dung chuyển khoản phải đúng theo đơn được tạo.
          </div>
        </section>

        <section className="card">
          <h2>Lịch sử nạp tiền</h2>

          {requests.length === 0 ? (
            <div className="empty">
              Chưa có yêu cầu nạp tiền.
            </div>
          ) : (
            <div className="requests">
              {requests.map((item) => (
                <div className="request" key={item.id}>
                  <div>
                    <strong>
                      #{item.id}
                    </strong>

                    <div className="small">
                      {formatDate(item.created_at)}
                    </div>
                  </div>

                  <div className="request-right">
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
          background: rgba(20, 20, 28, 0.95);
          border: 1px solid #292936;
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 16px;
          box-shadow: 0 10px 35px rgba(0, 0, 0, 0.25);
        }

        h2 {
          margin: 0 0 8px;
          font-size: 20px;
        }

        .muted {
          color: #8d8d9b;
          font-size: 14px;
          margin-bottom: 20px;
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
          grid-template-columns: repeat(3, 1fr);
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
        }

        .quick-money button:hover {
          border-color: #7777ff;
        }

        .primary-button {
          width: 100%;
          height: 52px;
          border: 0;
          border-radius: 12px;
          background: linear-gradient(
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

        .bank-card {
          background: linear-gradient(
            135deg,
            #11151c,
            #18131f
          );
          border: 1px solid #343444;
          border-radius: 15px;
          padding: 17px;
          margin-top: 15px;
        }

        .bank-title {
          font-weight: 900;
          font-size: 18px;
          margin-bottom: 15px;
        }

        .bank-row {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 11px 0;
          border-bottom: 1px solid #292934;
          font-size: 13px;
        }

        .bank-row:last-child {
          border-bottom: 0;
        }

        .bank-row span {
          color: #888;
        }

        .bank-row strong {
          text-align: right;
          word-break: break-word;
        }

        .warning {
          margin-top: 15px;
          padding: 12px;
          background: #211b0b;
          border: 1px solid #4d3b10;
          border-radius: 10px;
          color: #e8d28a;
          font-size: 12px;
          line-height: 1.6;
        }

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
        }

        .small {
          color: #777;
          font-size: 11px;
          margin-top: 5px;
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
        }
      `}</style>
    </main>
  );
}
