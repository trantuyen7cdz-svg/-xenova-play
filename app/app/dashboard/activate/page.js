"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function ActivateKeyPage() {
  const [keyCode, setKeyCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function activateKey(e) {
    e.preventDefault();

    setMessage("");

    const code = keyCode.trim();

    if (!code) {
      setMessage("❌ Vui lòng nhập KEY.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/";
      return;
    }

    const { data: key, error } = await supabase
      .from("keys")
      .select("*")
      .eq("key_code", code)
      .maybeSingle();

    if (error) {
      setMessage("❌ Có lỗi khi kiểm tra KEY.");
      setLoading(false);
      return;
    }

    if (!key) {
      setMessage("❌ KEY không tồn tại.");
      setLoading(false);
      return;
    }

    if (key.status !== "available") {
      setMessage("❌ KEY đã bị khóa hoặc không khả dụng.");
      setLoading(false);
      return;
    }

    if (key.user_id && key.user_id !== user.id) {
      setMessage("❌ KEY này đã được sử dụng.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("keys")
      .update({
        user_id: user.id,
      })
      .eq("id", key.id);

    if (updateError) {
      setMessage(
        "❌ Không thể kích hoạt KEY: " +
          updateError.message
      );
      setLoading(false);
      return;
    }

    setMessage("✅ Kích hoạt KEY thành công!");
    setKeyCode("");
    setLoading(false);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "#fff",
        padding: "30px 15px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <a
          href="/dashboard"
          style={{
            color: "#aaa",
            textDecoration: "none",
          }}
        >
          ← Dashboard
        </a>

        <div
          style={{
            marginTop: "30px",
            background: "#111",
            border: "1px solid #292929",
            borderRadius: "20px",
            padding: "25px",
          }}
        >
          <h1>🔑 Kích hoạt KEY</h1>

          <p
            style={{
              color: "#888",
            }}
          >
            Nhập KEY bạn đã mua để kích hoạt.
          </p>

          <form onSubmit={activateKey}>
            <input
              value={keyCode}
              onChange={(e) =>
                setKeyCode(e.target.value)
              }
              placeholder="XENO-XXXX-XXXX-XXXX"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "15px",
                marginTop: "20px",
                borderRadius: "12px",
                border: "1px solid #333",
                background: "#181818",
                color: "#fff",
                fontSize: "16px",
              }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                marginTop: "15px",
                padding: "15px",
                border: "none",
                borderRadius: "12px",
                background: "#ff1744",
                color: "#fff",
                fontWeight: "900",
                fontSize: "16px",
              }}
            >
              {loading
                ? "ĐANG KIỂM TRA..."
                : "KÍCH HOẠT KEY"}
            </button>
          </form>

          {message && (
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                borderRadius: "12px",
                background: "#181818",
              }}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
