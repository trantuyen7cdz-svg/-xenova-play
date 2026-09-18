"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function DepositPage() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
    }

    loadUser();
  }, []);

  async function handleDeposit() {
    setResult(null);

    const money = Number(amount);

    if (!Number.isInteger(money) || money < 10000) {
      setResult({
        success: false,
        message: "Số tiền nạp tối thiểu là 10.000đ.",
      });
      return;
    }

    if (money > 100000000) {
      setResult({
        success: false,
        message: "Số tiền nạp quá lớn.",
      });
      return;
    }

    if (!user) {
      setResult({
        success: false,
        message: "Bạn chưa đăng nhập.",
      });
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setResult({
          success: false,
          message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        });
        return;
      }

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

      const data = await response.json();

      if (!response.ok || !data.success) {
        setResult({
          success: false,
          message: data.message || "Không thể tạo yêu cầu nạp tiền.",
        });
        return;
      }

      setResult({
        success: true,
        message: "Tạo yêu cầu nạp tiền thành công.",
        depositId: data.depositId,
        amount: data.amount,
        transferContent: data.transferContent,
      });
    } catch (error) {
      console.error("DEPOSIT PAGE ERROR:", error);

      setResult({
        success: false,
        message: "Không thể kết nối máy chủ.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0b0f",
        color: "#fff",
        padding: "30px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            fontSize: "28px",
            marginBottom: "30px",
          }}
        >
          NẠP TIỀN
        </h1>

        <div
          style={{
            background: "#15151c",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          <label
            style={{
              display: "block",
              marginBottom: "10px",
              fontWeight: "600",
            }}
          >
            Số tiền muốn nạp
          </label>

          <input
            type="number"
            min="10000"
            step="1000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Nhập số tiền..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid #333",
              background: "#0d0d12",
              color: "#fff",
              fontSize: "16px",
              outline: "none",
              marginBottom: "15px",
            }}
          />

          <button
            type="button"
            onClick={handleDeposit}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "10px",
              background: loading ? "#555" : "#e00000",
              color: "#fff",
              fontSize: "16px",
              fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "ĐANG TẠO..." : "NẠP TIỀN"}
          </button>

          {result && (
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                borderRadius: "10px",
                background: result.success ? "#102718" : "#291313",
                border: `1px solid ${
                  result.success ? "#1f7a3d" : "#8b2b2b"
                }`,
              }}
            >
              <div style={{ marginBottom: "8px" }}>
                {result.message}
              </div>

              {result.success && (
                <>
                  <div style={{ marginTop: "12px" }}>
                    <strong>Số tiền:</strong>{" "}
                    {Number(result.amount).toLocaleString("vi-VN")}đ
                  </div>

                  <div style={{ marginTop: "8px" }}>
                    <strong>Nội dung chuyển khoản:</strong>
                  </div>

                  <div
                    style={{
                      marginTop: "8px",
                      padding: "12px",
                      background: "#000",
                      borderRadius: "8px",
                      fontWeight: "700",
                      wordBreak: "break-all",
                    }}
                  >
                    {result.transferContent}
                  </div>

                  <div
                    style={{
                      marginTop: "12px",
                      fontSize: "13px",
                      opacity: 0.8,
                    }}
                  >
                    Hãy chuyển khoản đúng số tiền và đúng nội dung trên.
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
