"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

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

  // =========================
  // LOAD DATA
  // =========================

  async function loadData() {
    setLoading(true);

    try {
      const [
        depositsResult,
        profilesResult,
      ] = await Promise.all([
        supabase
          .from("deposit_requests")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("profiles")
          .select(
            "id, username, email"
          ),
      ]);

      if (depositsResult.error) {
        console.error(
          depositsResult.error
        );

        alert(
          "Không thể tải yêu cầu nạp tiền:\n" +
            depositsResult.error.message
        );

        return;
      }

      if (profilesResult.error) {
        console.error(
          profilesResult.error
        );
      }

      setDeposits(
        depositsResult.data || []
      );

      setProfiles(
        profilesResult.data || []
      );
    } catch (error) {
      console.error(
        "LOAD DEPOSITS ERROR:",
        error
      );

      alert(
        "Không thể tải dữ liệu."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // USER
  // =========================

  function getUser(userId) {
    return profiles.find(
      (profile) =>
        profile.id === userId
    );
  }

  // =========================
  // FORMAT
  // =========================

  function formatMoney(value) {
    return (
      Number(value || 0).toLocaleString(
        "vi-VN"
      ) + "đ"
    );
  }

  function formatDate(value) {
    if (!value) return "-";

    return new Date(
      value
    ).toLocaleString("vi-VN");
  }

  // =========================
  // DUYỆT
  // =========================

  async function approveDeposit(id) {
    if (processing) return;

    const item = deposits.find(
      (deposit) =>
        deposit.id === id
    );

    if (!item) return;

    if (item.status !== "pending") {
      alert(
        "Yêu cầu này không còn ở trạng thái ĐANG CHỜ."
      );

      return;
    }

    const profile = getUser(
      item.user_id
    );

    const username =
      profile?.username ||
      profile?.email ||
      "Không rõ user";

    const confirmed = confirm(
      `XÁC NHẬN CỘNG TIỀN\n\n` +
        `User: ${username}\n` +
        `Số tiền: ${formatMoney(
          item.amount
        )}\n` +
        `Mã nạp: #${item.id}\n` +
        `Nội dung CK: ${
          item.transfer_content || "-"
        }\n\n` +
        `Hãy chắc chắn bạn đã kiểm tra giao dịch Vietcombank.`
    );

    if (!confirmed) return;

    setProcessing(id);

    try {
      const response = await fetch(
        "/api/admin/approve-deposit",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            depositId: id,
          }),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể duyệt yêu cầu."
        );
      }

      alert(
        `ĐÃ CỘNG TIỀN THÀNH CÔNG\n\n` +
          `Số tiền: ${formatMoney(
            result.amount
          )}\n` +
          `Số dư trước: ${formatMoney(
            result.balanceBefore
          )}\n` +
          `Số dư mới: ${formatMoney(
            result.balanceAfter
          )}`
      );

      await loadData();
    } catch (error) {
      console.error(
        "APPROVE DEPOSIT ERROR:",
        error
      );

      alert(
        "Không thể duyệt:\n" +
          error.message
      );
    } finally {
      setProcessing(null);
    }
  }

  // =========================
  // TỪ CHỐI
  // =========================

  async function rejectDeposit(id) {
    if (processing) return;

    const item = deposits.find(
      (deposit) =>
        deposit.id === id
    );

    if (!item) return;

    if (item.status !== "pending") {
      alert(
        "Yêu cầu này không còn ở trạng thái ĐANG CHỜ."
      );

      return;
    }

    const confirmed = confirm(
      `Đánh dấu yêu cầu #${id} là THẤT BẠI?\n\n` +
        `Số tiền: ${formatMoney(
          item.amount
        )}\n` +
        `Nội dung: ${
          item.transfer_content || "-"
        }`
    );

    if (!confirmed) return;

    setProcessing(id);

    try {
      const response = await fetch(
        "/api/admin/reject-deposit",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            depositId: id,
          }),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể xử lý yêu cầu."
        );
      }

      alert(
        "Đã đánh dấu yêu cầu là THẤT BẠI."
      );

      await loadData();
    } catch (error) {
      console.error(
        "REJECT DEPOSIT ERROR:",
        error
      );

      alert(
        "Không thể xử lý:\n" +
          error.message
      );
    } finally {
      setProcessing(null);
    }
  }

  // =========================
  // FILTER
  // =========================

  const filtered = deposits.filter(
    (item) => {
      const profile = getUser(
        item.user_id
      );

      const keyword =
        search
          .trim()
          .toLowerCase();

      const matchesFilter =
        filter === "all" ||
        item.status === filter;

      const matchesSearch =
        !keyword ||
        String(item.id)
          .toLowerCase()
          .includes(keyword) ||
        String(item.user_id)
          .toLowerCase()
          .includes(keyword) ||
        String(
          item.transfer_content || ""
        )
          .toLowerCase()
          .includes(keyword) ||
        String(
          profile?.username || ""
        )
          .toLowerCase()
          .includes(keyword) ||
        String(
          profile?.email || ""
        )
          .toLowerCase()
          .includes(keyword);

      return (
        matchesFilter &&
        matchesSearch
      );
    }
  );

  // =========================
  // STATS
  // =========================

  const pendingCount =
    deposits.filter(
      (item) =>
        item.status === "pending"
    ).length;

  const completedCount =
    deposits.filter(
      (item) =>
        item.status === "completed"
    ).length;

  const failedCount =
    deposits.filter(
      (item) =>
        item.status === "failed"
    ).length;

  const totalCompleted =
    deposits
      .filter(
        (item) =>
          item.status === "completed"
      )
      .reduce(
        (sum, item) =>
          sum +
          Number(item.amount || 0),
        0
      );

  return (
    <main className="page">
      <div className="container">

        {/* =========================
            HEADER
        ========================= */}

        <header className="header">

          <div>
            <div className="brand">
              XENOVA PLAY
            </div>

            <h1>
              QUẢN LÝ NẠP TIỀN
            </h1>

            <p>
              Kiểm tra chuyển khoản và
              cộng tiền vào ví thành viên.
            </p>
          </div>

          <button
            className="refresh"
            onClick={loadData}
            disabled={loading}
          >
            ↻ {loading
              ? "ĐANG TẢI..."
              : "LÀM MỚI"}
          </button>

        </header>

        {/* =========================
            MENU
        ========================= */}

        <nav className="menu">

          <Link
            href="/admin"
            className="menuItem"
          >
            Tổng quan
          </Link>

          <Link
            href="/admin/products"
            className="menuItem"
          >
            Sản phẩm
          </Link>

          <Link
            href="/admin/keys"
            className="menuItem"
          >
            Kho KEY
          </Link>

          <Link
            href="/admin/orders"
            className="menuItem"
          >
            Đơn hàng
          </Link>

          <Link
            href="/admin/deposits"
            className="menuActive"
          >
            💰 Nạp tiền
          </Link>

          <Link
            href="/admin/users"
            className="menuItem"
          >
            Thành viên
          </Link>

        </nav>

        {/* =========================
            STATS
        ========================= */}

        <section className="stats">

          <div className="stat">
            <span>
              TỔNG YÊU CẦU
            </span>

            <strong>
              {deposits.length}
            </strong>
          </div>

          <div className="stat pendingBox">
            <span>
              ĐANG CHỜ
            </span>

            <strong>
              {pendingCount}
            </strong>
          </div>

          <div className="stat">
            <span>
              HOÀN THÀNH
            </span>

            <strong>
              {completedCount}
            </strong>
          </div>

          <div className="stat">
            <span>
              THẤT BẠI
            </span>

            <strong>
              {failedCount}
            </strong>
          </div>

          <div className="stat moneyBox">
            <span>
              TỔNG TIỀN ĐÃ NẠP
            </span>

            <strong>
              {formatMoney(
                totalCompleted
              )}
            </strong>
          </div>

        </section>

        {/* =========================
            TOOLBAR
        ========================= */}

        <section className="toolbar">

          <input
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Tìm mã nạp, user, email, nội dung chuyển khoản..."
          />

          <select
            value={filter}
            onChange={(e) =>
              setFilter(
                e.target.value
              )
            }
          >
            <option value="all">
              Tất cả
            </option>

            <option value="pending">
              Đang chờ
            </option>

            <option value="completed">
              Hoàn thành
            </option>

            <option value="failed">
              Thất bại
            </option>
          </select>

        </section>

        {/* =========================
            LIST
        ========================= */}

        <section className="card">

          <div className="listHeader">
            <span>
              YÊU CẦU NẠP TIỀN
            </span>

            <b>
              {filtered.length}
            </b>
          </div>

          {loading ? (
            <div className="empty">
              Đang tải dữ liệu...
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              Không có yêu cầu nạp tiền.
            </div>
          ) : (
            <div className="list">

              {filtered.map((item) => {
                const profile =
                  getUser(
                    item.user_id
                  );

                const isProcessing =
                  processing ===
                  item.id;

                return (
                  <div
                    className="deposit"
                    key={item.id}
                  >

                    {/* =================
                        LEFT
                    ================= */}

                    <div className="info">

                      <div className="top">

                        <strong className="id">
                          #{item.id}
                        </strong>

                        <span
                          className={`status ${item.status}`}
                        >
                          {item.status ===
                          "pending"
                            ? "ĐANG CHỜ"
                            : item.status ===
                              "completed"
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
                        {profile?.email ||
                          "Không có email"}
                      </div>

                      <div className="date">
                        🕒{" "}
                        {formatDate(
                          item.created_at
                        )}
                      </div>

                      {/* NỘI DUNG CK */}

                      <div className="transferBox">

                        <div className="transferLabel">
                          NỘI DUNG CHUYỂN KHOẢN
                        </div>

                        <div className="transferContent">
                          {item.transfer_content ||
                            "-"}
                        </div>

                      </div>

                      {item.note && (
                        <div className="note">
                          Ghi chú:{" "}
                          {item.note}
                        </div>
                      )}

                    </div>

                    {/* =================
                        RIGHT
                    ================= */}

                    <div className="actions">

                      <div className="amount">
                        {formatMoney(
                          item.amount
                        )}
                      </div>

                      {item.status ===
                        "pending" && (
                        <>
                          <button
                            className="approve"
                            disabled={
                              isProcessing
                            }
                            onClick={() =>
                              approveDeposit(
                                item.id
                              )
                            }
                          >
                            {isProcessing
                              ? "ĐANG XỬ LÝ..."
                              : "✓ DUYỆT & CỘNG TIỀN"}
                          </button>

                          <button
                            className="reject"
                            disabled={
                              isProcessing
                            }
                            onClick={() =>
                              rejectDeposit(
                                item.id
                              )
                            }
                          >
                            ✕ THẤT BẠI
                          </button>
                        </>
                      )}

                      {item.status ===
                        "completed" && (
                        <div className="done">
                          ✓ ĐÃ CỘNG TIỀN
                        </div>
                      )}

                      {item.status ===
                        "failed" && (
                        <div className="failed">
                          ✕ YÊU CẦU THẤT BẠI
                        </div>
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
          background:
            radial-gradient(
              circle at top,
              #15151f 0%,
              #08080d 42%,
              #000 100%
            );
          color: #fff;
          padding: 25px 14px;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .container {
          width: 100%;
          max-width: 1200px;
          margin: auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
        }

        .brand {
          font-size: 13px;
          letter-spacing: 4px;
          color: #ff1744;
          font-weight: 900;
        }

        h1 {
          margin: 7px 0;
          font-size: 28px;
          font-weight: 900;
        }

        p {
          margin: 0;
          color: #777;
          font-size: 13px;
        }

        .refresh {
          background: #15151d;
          border: 1px solid #30303a;
          color: white;
          border-radius: 9px;
          padding: 11px 15px;
          font-weight: 900;
          cursor: pointer;
        }

        .refresh:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .menu {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
        }

        .menuItem,
        .menuActive {
          text-decoration: none;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 900;
        }

        .menuItem {
          color: #aaa;
          background: #101016;
          border: 1px solid #24242d;
        }

        .menuActive {
          color: white;
          background: #e50932;
          border: 1px solid #e50932;
        }

        .stats {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(170px, 1fr)
            );
          gap: 10px;
          margin-bottom: 15px;
        }

        .stat {
          background:
            linear-gradient(
              145deg,
              #15151d,
              #0b0b10
            );
          border: 1px solid #292934;
          border-radius: 14px;
          padding: 16px;
        }

        .stat span {
          display: block;
          color: #777;
          font-size: 10px;
          font-weight: 900;
          margin-bottom: 8px;
        }

        .stat strong {
          font-size: 21px;
          font-weight: 900;
        }

        .pendingBox strong {
          color: #ffc107;
        }

        .moneyBox strong {
          color: #00e676;
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
          min-width: 0;
        }

        .toolbar select {
          min-width: 145px;
        }

        .card {
          background: #0d0d13;
          border: 1px solid #292934;
          border-radius: 16px;
          overflow: hidden;
        }

        .listHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 18px;
          border-bottom: 1px solid #25252f;
          color: #aaa;
          font-size: 12px;
          font-weight: 900;
        }

        .listHeader b {
          background: #20202a;
          color: white;
          border-radius: 999px;
          padding: 4px 9px;
        }

        .empty {
          padding: 60px 20px;
          text-align: center;
          color: #666;
        }

        .list {
          display: flex;
          flex-direction: column;
        }

        .deposit {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 18px;
          border-bottom: 1px solid #25252f;
        }

        .deposit:last-child {
          border-bottom: 0;
        }

        .info {
          min-width: 0;
          flex: 1;
        }

        .top {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .id {
          font-size: 15px;
        }

        .status {
          font-size: 9px;
          font-weight: 900;
        }

        .status.pending {
          color: #ffc107;
        }

        .status.completed {
          color: #00e676;
        }

        .status.failed {
          color: #ff1744;
        }

        .user {
          margin-top: 10px;
          font-size: 14px;
          font-weight: 800;
        }

        .email,
        .date {
          color: #666;
          font-size: 11px;
          margin-top: 4px;
        }

        .transferBox {
          margin-top: 12px;
          max-width: 500px;
          background: #09090d;
          border: 1px solid #262630;
          border-radius: 9px;
          padding: 10px;
        }

        .transferLabel {
          color: #666;
          font-size: 9px;
          font-weight: 900;
          margin-bottom: 5px;
        }

        .transferContent {
          color: #b7a7ff;
          font-size: 13px;
          font-family: monospace;
          font-weight: 900;
          word-break: break-word;
        }

        .note {
          margin-top: 8px;
          color: #777;
          font-size: 11px;
        }

        .actions {
          width: 220px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .amount {
          color: #00e676;
          font-size: 21px;
          font-weight: 900;
          text-align: right;
          margin-bottom: 4px;
        }

        button {
          border: 0;
          border-radius: 9px;
          padding: 11px;
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .approve {
          background: #08783e;
        }

        .approve:hover {
          background: #09964d;
        }

        .reject {
          background: #631d29;
        }

        .reject:hover {
          background: #7e2332;
        }

        .done,
        .failed {
          text-align: center;
          padding: 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 900;
        }

        .done {
          color: #00e676;
          background: #082719;
          border: 1px solid #0c5730;
        }

        .failed {
          color: #ff1744;
          background: #27090f;
          border: 1px solid #59111d;
        }

        @media (max-width: 750px) {
          .page {
            padding: 18px 10px;
          }

          .header {
            align-items: flex-start;
          }

          h1 {
            font-size: 23px;
          }

          .refresh {
            padding: 9px 10px;
            font-size: 11px;
          }

          .menu {
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 4px;
          }

          .menuItem,
          .menuActive {
            white-space: nowrap;
          }

          .toolbar {
            flex-direction: column;
          }

          .toolbar select {
            width: 100%;
          }

          .deposit {
            flex-direction: column;
          }

          .actions {
            width: 100%;
          }

          .amount {
            text-align: left;
          }

          .transferBox {
            max-width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
