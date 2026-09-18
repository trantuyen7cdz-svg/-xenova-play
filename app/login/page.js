"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      // Đăng nhập Supabase
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        throw new Error(loginError.message);
      }

      if (!data?.user) {
        throw new Error("Không tìm thấy tài khoản.");
      }

      // Lấy thông tin role trong profiles
      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, username, email, role")
          .eq("id", data.user.id)
          .maybeSingle();

      if (profileError) {
        console.error("PROFILE ERROR:", profileError);
      }

      // Nếu là admin → trang Admin
      if (profile?.role === "admin") {
        router.replace("/admin");
        return;
      }

      // Tài khoản thường → trang thành viên
      router.replace("/dashboard");
    } catch (err) {
      console.error("LOGIN ERROR:", err);

      setError(
        err?.message || "Đăng nhập thất bại. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#080808",
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
          boxShadow: "0 20px 60px rgba(0,0,0,.45)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            color: "#fff",
            marginBottom: "8px",
            fontSize: "28px",
            fontWeight: "800",
          }}
        >
          XENOVA PLAY
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#888",
            marginBottom: "28px",
          }}
        >
          Đăng nhập tài khoản
        </p>

        <form onSubmit={handleLogin}>
          <label
            style={{
              display: "block",
              color: "#ddd",
              marginBottom: "8px",
              fontSize: "14px",
            }}
          >
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Nhập email"
            required
            autoComplete="email"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px 14px",
              marginBottom: "18px",
              borderRadius: "10px",
              border: "1px solid #333",
              background: "#181818",
              color: "#fff",
              outline: "none",
            }}
          />

          <label
            style={{
              display: "block",
              color: "#ddd",
              marginBottom: "8px",
              fontSize: "14px",
            }}
          >
            Mật khẩu
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu"
            required
            autoComplete="current-password"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px 14px",
              marginBottom: "18px",
              borderRadius: "10px",
              border: "1px solid #333",
              background: "#181818",
              color: "#fff",
              outline: "none",
            }}
          />

          {error && (
            <div
              style={{
                background: "#2a1111",
                border: "1px solid #5b2020",
                color: "#ff8d8d",
                padding: "12px",
                borderRadius: "10px",
                marginBottom: "16px",
                fontSize: "14px",
              }}
            >
              {error}
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
              fontWeight: "800",
              fontSize: "15px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "ĐANG ĐĂNG NHẬP..." : "ĐĂNG NHẬP"}
          </button>
        </form>

        <button
          onClick={() => router.push("/register")}
          style={{
            width: "100%",
            marginTop: "14px",
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid #333",
            background: "transparent",
            color: "#ccc",
            cursor: "pointer",
          }}
        >
          Chưa có tài khoản? Đăng ký
        </button>
      </div>
    </main>
  );
}
