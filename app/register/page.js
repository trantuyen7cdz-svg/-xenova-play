"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    setMessage("");

    if (!email || !password || !confirmPassword) {
      setMessage("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Mật khẩu nhập lại không khớp.");
      return;
    }

    if (password.length < 6) {
      setMessage("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (data.user) {
        setMessage(
          "Đăng ký thành công! Hãy kiểm tra email để xác nhận tài khoản."
        );

        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (error) {
      setMessage("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#050505",
        color: "#fff",
        padding: "20px",
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
          boxShadow: "0 20px 60px rgba(0,0,0,.5)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            marginBottom: "8px",
            fontSize: "30px",
            fontWeight: "800",
          }}
        >
          XENOVA PLAY
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#999",
            marginBottom: "28px",
          }}
        >
          Tạo tài khoản mới
        </p>

        <form onSubmit={handleRegister}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              marginBottom: "14px",
              borderRadius: "10px",
              border: "1px solid #333",
              background: "#080808",
              color: "#fff",
              outline: "none",
            }}
          />

          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              marginBottom: "14px",
              borderRadius: "10px",
              border: "1px solid #333",
              background: "#080808",
              color: "#fff",
              outline: "none",
            }}
          />

          <input
            type="password"
            placeholder="Nhập lại mật khẩu"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
            }}
          />

          {message && (
            <div
              style={{
                padding: "12px",
                marginBottom: "16px",
                borderRadius: "10px",
                background: "#1b1b1b",
                color: "#ddd",
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
            {loading ? "Đang đăng ký..." : "ĐĂNG KÝ"}
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
            style={{
              border: "none",
              background: "none",
              color: "#fff",
              fontWeight: "700",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Đăng nhập
          </button>
        </div>
      </div>
    </main>
  );
}
