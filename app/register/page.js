"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    setMessage("");
    setSuccess(false);

    const cleanEmail = email.trim();

    if (!cleanEmail || !password || !confirmPassword) {
      setMessage("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    if (password.length < 6) {
      setMessage("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Mật khẩu nhập lại không khớp.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data.user) {
        setMessage("Không thể tạo tài khoản. Vui lòng thử lại.");
        return;
      }

      setSuccess(true);
      setMessage(
        "Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản."
      );

      setEmail("");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch (error) {
      console.error(error);
      setMessage("Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "#fff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#111",
          border: "1px solid #292929",
          borderRadius: "18px",
          padding: "30px",
          boxSizing: "border-box",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "28px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "30px",
              fontWeight: "800",
              letterSpacing: "1px",
            }}
          >
            XENOVA PLAY
          </h1>

          <p
            style={{
              marginTop: "8px",
              marginBottom: 0,
              color: "#999",
              fontSize: "14px",
            }}
          >
            Tạo tài khoản mới
          </p>
        </div>

        <form onSubmit={handleRegister}>
          <label
            style={{
              display: "block",
              marginBottom: "7px",
              fontSize: "14px",
              color: "#ccc",
            }}
          >
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Nhập email"
            autoComplete="email"
            disabled={loading}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              marginBottom: "16px",
              borderRadius: "10px",
              border: "1px solid #333",
              background: "#080808",
              color: "#fff",
              outline: "none",
              fontSize: "15px",
            }}
          />

          <label
            style={{
              display: "block",
              marginBottom: "7px",
              fontSize: "14px",
              color: "#ccc",
            }}
          >
            Mật khẩu
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu"
            autoComplete="new-password"
            disabled={loading}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              marginBottom: "16px",
              borderRadius: "10px",
              border: "1px solid #333",
              background: "#080808",
              color: "#fff",
              outline: "none",
              fontSize: "15px",
            }}
          />

          <label
            style={{
              display: "block",
              marginBottom: "7px",
              fontSize: "14px",
              color: "#ccc",
            }}
          >
            Nhập lại mật khẩu
          </label>

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu"
            autoComplete="new-password"
            disabled={loading}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              marginBottom: "18px",
              borderRadius: "10px",
              border: "1px solid #333",
              background: "#080808",
              color: "#fff",
              outline: "none",
              fontSize: "15px",
            }}
          />

          {message && (
            <div
              style={{
                padding: "12px",
                marginBottom: "16px",
                borderRadius: "10px",
                background: success ? "#102415" : "#211414",
                border: `1px solid ${
                  success ? "#245b32" : "#5b2929"
                }`,
                color: success ? "#8ff0a4" : "#ff9b9b",
                fontSize: "14px",
                lineHeight: "1.5",
              }}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "10px",
              background: loading ? "#555" : "#fff",
              color: "#000",
              fontSize: "16px",
              fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "ĐANG ĐĂNG KÝ..." : "ĐĂNG KÝ"}
          </button>
        </form>

        <div
          style={{
            textAlign: "center",
            marginTop: "22px",
            color: "#888",
            fontSize: "14px",
          }}
        >
          Đã có tài khoản?{" "}
          <button
            type="button"
            onClick={() => router.push("/login")}
            disabled={loading}
            style={{
              border: "none",
              background: "transparent",
              color: "#fff",
              fontWeight: "700",
              cursor: "pointer",
              padding: 0,
              fontSize: "14px",
            }}
          >
            Đăng nhập
          </button>
        </div>
      </div>
    </main>
  );
}
