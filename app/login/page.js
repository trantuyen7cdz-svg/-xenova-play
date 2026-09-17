"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#070707",
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
        }}
      >
        <div
          style={{
            background: "#101010",
            border: "1px solid #292929",
            borderRadius: "18px",
            padding: "28px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              textAlign: "center",
              color: "#ff3030",
              fontSize: "13px",
              fontWeight: "900",
              letterSpacing: "4px",
              marginBottom: "10px",
            }}
          >
            XENOVA PLAY
          </div>

          <h1
            style={{
              textAlign: "center",
              fontSize: "30px",
              margin: "0 0 25px",
              fontWeight: "900",
            }}
          >
            ĐĂNG NHẬP
          </h1>

          <form onSubmit={handleLogin}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "700",
              }}
            >
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Nhập email"
              required
              autoComplete="email"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "14px",
                marginBottom: "16px",
                borderRadius: "10px",
                border: "1px solid #333",
                background: "#181818",
                color: "#fff",
                fontSize: "15px",
                outline: "none",
              }}
            />

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "700",
              }}
            >
              Mật khẩu
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nhập mật khẩu"
              required
              autoComplete="current-password"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "14px",
                marginBottom: "16px",
                borderRadius: "10px",
                border: "1px solid #333",
                background: "#181818",
                color: "#fff",
                fontSize: "15px",
                outline: "none",
              }}
            />

            {message && (
              <div
                style={{
                  background: "#2a1010",
                  border: "1px solid #552020",
                  color: "#ff6666",
                  padding: "12px",
                  borderRadius: "10px",
                  marginBottom: "15px",
                  fontSize: "14px",
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
                padding: "15px",
                border: "none",
                borderRadius: "10px",
                background: loading ? "#772020" : "#ff3030",
                color: "#fff",
                fontSize: "15px",
                fontWeight: "900",
                cursor: loading ? "default" : "pointer",
              }}
            >
              {loading ? "ĐANG ĐĂNG NHẬP..." : "ĐĂNG NHẬP"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => router.push("/")}
            style={{
              width: "100%",
              marginTop: "12px",
              padding: "13px",
              borderRadius: "10px",
              border: "1px solid #333",
              background: "#171717",
              color: "#aaa",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            ← VỀ TRANG CHỦ
          </button>
        </div>

        <p
          style={{
            textAlign: "center",
            color: "#555",
            fontSize: "12px",
            marginTop: "20px",
          }}
        >
          © 2026 XENOVA PLAY
        </p>
      </div>
    </main>
  );
}
