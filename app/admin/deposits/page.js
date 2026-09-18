"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [
      { data: depositsData },
      { data: profilesData },
    ] = await Promise.all([
      supabase
        .from("deposit_requests")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("profiles")
        .select("id, username, email"),
    ]);

    setDeposits(depositsData || []);
    setProfiles(profilesData || []);
    setLoading(false);
  }

  function getUser(userId) {
    return profiles.find((p) => p.id === userId);
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("vi-VN") + "đ";
  }

  function formatDate(value) {
    return new Date(value).toLocaleString("vi-VN");
  }

  async function approveDeposit(id) {
    if (!confirm("Bạn chắc chắn đã nhận được tiền?")) {
      return;
    }

    setProcessing(id);

    try {
      const response = await fetch(
        "/api/admin/approve-deposit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            depositId: id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.message || "Không thể duyệt.");
        return;
      }

      alert(
        `Đã cộng ${formatMoney(result.amount)} vào tài khoản.\n\nSố dư mới: ${formatMoney(result.balanceAfter)}`
      );

      await loadData();
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra.");
    } finally {
      setProcessing(null);
    }
  }

  async function rejectDeposit(id) {
    if (!confirm("Đánh dấu yêu cầu này là THẤT BẠI?")) {
      return;
    }

    setProcessing(id);

    try {
      const response = await fetch(
        "/api/admin/reject-deposit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            depositId: id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.message || "Không thể xử lý.");
        return;
      }

      await loadData();
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra.");
    } finally {
      setProcessing(null);
    }
  }

  const filtered = deposits.filter((item) => {
    const profile = getUser(item.user_id);

    const matchesFilter =
      filter === "all" || item.status === filter;

    const keyword = search.toLowerCase();

    const matchesSearch =
      !keyword ||
      String(item.id).includes(keyword) ||
      String(item.user_id).toLowerCase().includes(keyword) ||
      String(profile?.username || "")
        .toLowerCase()
        .includes(keyword) ||
      String(profile?.email || "")
        .toLowerCase()
        .includes(keyword);

    return matchesFilter && matchesSearch;
  });

  const pendingCount = deposits.filter(
    (x) => x.status === "pending"
  ).length;

  const completedCount = deposits.filter(
    (x) => x.status === "completed"
  ).length;

  const failedCount = deposits.filter(
    (x) => x.status === "failed"
  ).length;

  const totalCompleted = deposits
    .filter((x) => x.status === "completed")
    .reduce((sum, x) => sum + Number(x.amount || 0), 0);

  return (
    <main className="page">
      <div className="container">

        <header className="header">
          <div>
            <div className="brand">
              XENOVA PLAY
            </div>

            <h1>QUẢN LÝ NẠP TIỀN</h1>

            <p>
              Kiểm tra chuyển khoản và cộng tiền vào ví.
            </p>
          </div>
        </header>

        <section className="stats">

          <div className="stat">
            <span>ĐANG CHỜ</span>
            <strong>{pendingCount}</strong>
          </div>

          <div className="stat">
            <span>HOÀN THÀNH</span>
            <strong>{completedCount}</strong>
          </div>

          <div className="stat">
            <span>THẤT BẠI</span>
            <strong>{failedCount}</strong>
          </div>

          <div className="stat">
            <span>ĐÃ NẠP</span>
            <strong>{formatMoney(totalCompleted)}</strong>
          </div>

        </section>

        <section className="toolbar">

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã đơn, username, email..."
          />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Tất cả</option>
            <option value="pending">Đang chờ</option>
            <option value="completed">
              Hoàn thành
            </option>
            <option value="failed">
              Thất bại
            </option>
          </select>

        </section>

        <section className="card">

          {loading ? (
            <div className="empty">
              Đang tải...
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              Không có yêu cầu nạp tiền.
            </div>
          ) : (
            <div className="list">

              {filtered.map((item) => {
                const profile = getUser(item.user_id);

                return (
                  <div
                    className="deposit"
                    key={item.id}
                  >

                    <div className="info">

                      <div className="top">
                        <strong>
                          #{item.id}
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

                      <div className="user">
                        👤{" "}
                        {profile?.username ||
                          "Không rõ user"}
                      </div>

                      <div className="email">
                        {profile?.email || ""}
                      </div>

                      <div className="date">
                        {formatDate(item.created_at)}
                      </div>

                      <div className="content">
                        Nội dung:
                        <strong>
                          {item.transfer_content}
                        </strong>
                      </div>

                    </div>

                    <div className="actions">

                      <div className="amount">
                        {formatMoney(item.amount)}
                      </div>

                      {item.status === "pending" && (
                        <>
                          <button
                            className="approve"
                            disabled={
                              processing === item.id
                            }
                            onClick={() =>
                              approveDeposit(item.id)
                            }
                          >
                            {processing === item.id
                              ? "ĐANG XỬ LÝ..."
                              : "✓ DUYỆT & CỘNG TIỀN"}
                          </button>

                          <button
                            className="reject"
                            disabled={
                              processing === item.id
                            }
                            onClick={() =>
                              rejectDeposit(item.id)
                            }
                          >
                            ✕ THẤT BẠI
                          </button>
                        </>
                      )}

                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </section>

      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background: #08080d;
          color: #fff;
          padding: 25px;
        }

        .container {
          max-width: 1200px;
          margin: auto;
        }

        .header {
          margin-bottom: 25px;
        }

        .brand {
          font-size: 14px;
          letter-spacing: 3px;
          color: #7e7eff;
          font-weight: 900;
        }

        h1 {
          margin: 7px 0;
          font-size: 30px;
        }

        p {
          margin: 0;
          color: #858593;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 15px;
        }

        .stat {
          background: #13131b;
          border: 1px solid #282832;
          border-radius: 16px;
          padding: 18px;
        }

        .stat span {
          display: block;
          color: #858593;
          font-size: 11px;
          margin-bottom: 8px;
        }

        .stat strong {
          font-size: 23px;
        }

        .toolbar {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }

        .toolbar input,
        .toolbar select {
          height: 46px;
          border-radius: 10px;
          border: 1px solid #30303b;
          background: #121219;
          color: white;
          padding: 0 13px;
          outline: none;
        }

        .toolbar input {
          flex: 1;
        }

        .card {
          background: #111118;
          border: 1px solid #292934;
          border-radius: 18px;
          overflow: hidden;
        }

        .empty {
          padding: 60px 20px;
          text-align: center;
          color: #777;
        }

        .deposit {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 20px;
          border-bottom: 1px solid #272731;
        }

        .deposit:last-child {
          border-bottom: 0;
        }

        .info {
          min-width: 0;
        }

        .top {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .status {
          font-size: 10px;
          font-weight: 900;
        }

        .status.pending {
          color: #e7c247;
        }

        .status.completed {
          color: #45d47b;
        }

        .status.failed {
          color: #ff6060;
        }

        .user {
          margin-top: 9px;
          font-weight: 700;
        }

        .email,
        .date {
          color: #777;
          font-size: 12px;
          margin-top: 4px;
        }

        .content {
          margin-top: 10px;
          color: #999;
          font-size: 12px;
        }

        .content strong {
          color: #aaaaff;
          margin-left: 5px;
        }

        .actions {
          min-width: 210px;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 7px;
        }

        .amount {
          text-align: right;
          font-size: 20px;
          font-weight: 900;
          margin-bottom: 3px;
        }

        button {
          border: 0;
          border-radius: 9px;
          padding: 11px;
          color: white;
          font-weight: 800;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .approve {
          background: #176b3c;
        }

        .reject {
          background: #651d27;
        }

        @media (max-width: 750px) {
          .page {
            padding: 15px;
          }

          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .toolbar {
            flex-direction: column;
          }

          .deposit {
            flex-direction: column;
          }

          .actions {
            min-width: 0;
          }

          .amount {
            text-align: left;
          }
        }
      `}</style>
    </main>
  );
}
