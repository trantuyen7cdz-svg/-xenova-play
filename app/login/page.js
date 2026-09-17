"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
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
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#101010",
          border: "1px solid #292929",
          borderRadius: "18px",
          padding: "28px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "#ff3030",
            fontWeight: "900",
            letterSpacing: "4px",
            fontSize: "13px",
          }}
        >
          XENOVA PLAY
        </div>

        <h1
          style={{
            textAlign: "center",
            marginTop: "12px",
            marginBottom: "25px",
          }}
        >
          ĐĂNG NHẬP
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "14px",
            marginBottom: "12px",
            borderRadius: "10px",
            border: "1px solid #333",
            background: "#181818",
            color: "#fff",
            outline: "none",
          }}
        />

        <input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "14px",
            marginBottom: "15px",
            borderRadius: "10px",
            border: "1px solid #333",
            background: "#181818",
            color: "#fff",
            outline: "none",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "15px",
            border: "none",
            borderRadius: "10px",
            background: "#ff3030",
            color: "#fff",
            fontWeight: "900",
            cursor: "pointer",
          }}
        >
          {loading ? "ĐANG ĐĂNG NHẬP..." : "ĐĂNG NHẬP"}
        </button>

        {message && (
          <p
            style={{
              color: "#ff5555",
              textAlign: "center",
              marginTop: "15px",
            }}
          >
            {message}
          </p>
        )}
      </form>
    </main>
  );
}
