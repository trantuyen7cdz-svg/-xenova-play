"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/";
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error || profile?.role !== "admin") {
        setAllowed(false);
        setLoading(false);
        return;
      }

      setUser(user);
      setAllowed(true);
      setLoading(false);
    }

    checkAdmin();
  }, []);

  if (loading) {
    return (
      <main className="admin-page">
        <div className="admin-card">Đang kiểm tra quyền...</div>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="admin-page">
        <div className="admin-card">
          <h1>Không có quyền truy cập</h1>
          <p>Tài khoản này không phải Admin.</p>
          <a href="/dashboard">Quay lại Dashboard</a>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <div className="admin-logo">XENOVA PLAY</div>
            <h1>ADMIN PANEL</h1>
            <p>{user?.email}</p>
          </div>

          <a href="/dashboard" className="admin-back">
            ← Dashboard
          </a>
        </div>

        <div className="admin-grid">
          <a href="#products" className="admin-box">
            <span>📦</span>
            <strong>Sản phẩm</strong>
            <small>Quản lý các gói KEY</small>
          </a>

          <a href="#keys" className="admin-box">
            <span>🔑</span>
            <strong>KEY</strong>
            <small>Tạo và quản lý KEY</small>
          </a>

          <a href="#users" className="admin-box">
            <span>👤</span>
            <strong>Người dùng</strong>
            <small>Quản lý tài khoản</small>
          </a>

          <a href="#orders" className="admin-box">
            <span>🧾</span>
            <strong>Đơn hàng</strong>
            <small>Quản lý giao dịch</small>
          </a>
        </div>

        <section id="products" className="admin-section">
          <h2>📦 Sản phẩm</h2>
          <p>Phần quản lý sản phẩm sẽ được thêm ở bước tiếp theo.</p>
        </section>

        <section id="keys" className="admin-section">
          <h2>🔑 KEY</h2>
          <p>Phần tạo và quản lý KEY sẽ được thêm ở bước tiếp theo.</p>
        </section>

        <section id="users" className="admin-section">
          <h2>👤 Người dùng</h2>
          <p>Phần quản lý người dùng sẽ được thêm ở bước tiếp theo.</p>
        </section>

        <section id="orders" className="admin-section">
          <h2>🧾 Đơn hàng</h2>
          <p>Phần quản lý đơn hàng sẽ được thêm ở bước tiếp theo.</p>
        </section>
      </div>
    </main>
  );
}
