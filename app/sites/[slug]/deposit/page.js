"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

function money(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function statusText(status) {
  if (status === "approved") {
    return "ĐÃ DUYỆT";
  }

  if (status === "rejected") {
    return "TỪ CHỐI";
  }

  if (status === "failed") {
    return "THẤT BẠI";
  }

  return "CHỜ DUYỆT";
}

export default function DepositPage() {
  const router = useRouter();
  const params = useParams();

  const slug = params?.slug;

  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState(0);
  const [website, setWebsite] = useState(null);
  const [requests, setRequests] = useState([]);
  const [deposit, setDeposit] = useState(null);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");

  async function loadData() {
    if (!slug) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const walletResponse = await fetch(
        `/api/sites/${slug}/wallet`,
        {
          cache: "no-store",
        }
      );

      const walletData = await walletResponse.json();

      if (walletResponse.status === 401) {
        router.replace(`/sites/${slug}/login`);
        return;
      }

      if (!walletResponse.ok) {
        throw new Error(
          walletData?.message || "Không thể tải ví."
        );
      }

      setWallet(
        Number(
          walletData?.wallet?.balance || 0
        )
      );

      setWebsite(
        walletData?.website || null
      );

      const depositResponse = await fetch(
        `/api/sites/${slug}/deposit`,
        {
          cache: "no-store",
        }
      );

      const depositData =
        await depositResponse.json();

      if (depositResponse.status === 401) {
        router.replace(`/sites/${slug}/login`);
        return;
      }

      if (!depositResponse.ok) {
        throw new Error(
          depositData?.message ||
            "Không thể tải lịch sử nạp."
        );
      }

      setRequests(
        depositData?.requests || []
      );
    } catch (err) {
      console.error(
        "DEPOSIT PAGE LOAD ERROR:",
        err
      );

      setError(
        err?.message ||
          "Không thể tải dữ liệu."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [slug]);

  async function createDeposit() {
    setError("");
    setMessage("");
    setDeposit(null);

    const value = Number(
      String(amount).replace(/\D/g, "")
    );

    if (!Number.isInteger(value)) {
      setError(
        "Vui lòng nhập số tiền hợp lệ."
      );
      return;
    }

    if (value < 10000) {
      setError(
        "Số tiền nạp tối thiểu là 10.000đ."
      );
      return;
    }

    if (value > 100000000) {
      setError(
        "Số tiền nạp tối đa là 100.000.000đ."
      );
      return;
    }

    try {
      setCreating(true);

      const response = await fetch(
        `/api/sites/${slug}/deposit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: value,
          }),
        }
      );

      const result =
        await response.json();

      if (response.status === 401) {
        router.replace(
          `/sites/${slug}/login`
        );
        return;
      }

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.message ||
            "Không thể tạo yêu cầu nạp."
        );
      }

      setDeposit(result);

      setMessage(
        "Đã tạo yêu cầu nạp tiền. Hãy chuyển khoản đúng số tiền và nội dung."
      );

      setAmount("");

      await loadData();
    } catch (err) {
      console.error(
        "CREATE DEPOSIT ERROR:",
        err
      );

      setError(
        err?.message ||
          "Không thể tạo yêu cầu nạp tiền."
      );
    } finally {
      setCreating(false);
    }
  }

  async function copy(value, type) {
    try {
      await navigator.clipboard.writeText(
        String(value || "")
      );

      setCopied(type);

      setTimeout(() => {
        setCopied("");
      }, 1500);
    } catch {
      setError(
        "Không thể sao chép."
      );
    }
  }

  if (loading) {
    return (
      <main style={styles.center}>
        <div>
          Đang tải...
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <button
          type="button"
          onClick={() =>
            router.push(`/sites/${slug}`)
          }
          style={styles.back}
        >
          ← Cửa hàng
        </button>

        <strong style={styles.headerName}>
          {website?.name || "Nạp tiền"}
        </strong>

        <span style={styles.balance}>
          {money(wallet)}
        </span>
      </header>

      <section style={styles.container}>
        <h1 style={styles.title}>
          Nạp tiền
        </h1>

        <p style={styles.subtitle}>
          Nạp tiền vào ví riêng của website này.
        </p>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {message && (
          <div style={styles.success}>
            {message}
          </div>
        )}

        <div style={styles.grid}>
          <section style={styles.card}>
            <h2 style={styles.heading}>
              Số tiền nạp
            </h2>

            <input
              value={amount}
              onChange={(event) =>
                setAmount(
                  event.target.value.replace(
                    /\D/g,
                    ""
                  )
                )
              }
              inputMode="numeric"
              placeholder="Nhập số tiền"
              style={styles.input}
            />

            <div style={styles.quick}>
              {[
                10000,
                20000,
                50000,
                100000,
                200000,
                500000,
              ].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setAmount(
                      String(value)
                    )
                  }
                  style={styles.quickButton}
                >
                  {money(value)}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={creating}
              onClick={createDeposit}
              style={{
                ...styles.submit,
                opacity: creating ? 0.6 : 1,
              }}
            >
              {creating
                ? "ĐANG TẠO..."
                : "TẠO YÊU CẦU NẠP"}
            </button>
          </section>

          <section style={styles.card}>
            <h2 style={styles.heading}>
              Thông tin chuyển khoản
            </h2>

            {!website?.bank_account_number &&
            !deposit?.bank?.accountNumber ? (
              <div style={styles.warning}>
                Admin chưa cấu hình thông tin
                ngân hàng cho website.
              </div>
            ) : (
              <>
                {deposit?.bank?.qrUrl && (
                  <div style={styles.qrBox}>
                    <img
                      src={deposit.bank.qrUrl}
                      alt="QR chuyển khoản"
                      style={styles.qr}
                    />
                  </div>
                )}

                <Info
                  label="Ngân hàng"
                  value={
                    deposit?.bank?.name ||
                    website?.bank_name
                  }
                />

                <Info
                  label="Số tài khoản"
                  value={
                    deposit?.bank
                      ?.accountNumber ||
                    website?.bank_account_number
                  }
                  copy={copy}
                  type="account"
                  copied={copied}
                />

                <Info
                  label="Chủ tài khoản"
                  value={
                    deposit?.bank
                      ?.accountName ||
                    website?.bank_account_name
                  }
                  copy={copy}
                  type="name"
                  copied={copied}
                />

                {deposit && (
                  <>
                    <Info
                      label="Số tiền"
                      value={money(
                        deposit.amount
                      )}
                    />

                    <Info
                      label="Nội dung"
                      value={
                        deposit.transferContent
                      }
                      copy={copy}
                      type="content"
                      copied={copied}
                    />

                    <div
                      style={
                        styles.pending
                      }
                    >
                      ⏳ Đang chờ Admin xác nhận
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        </div>

        <section style={styles.card}>
          <h2 style={styles.heading}>
            Lịch sử nạp tiền
          </h2>

          {requests.length === 0 ? (
            <div style={styles.empty}>
              Chưa có giao dịch.
            </div>
          ) : (
            requests.map((item) => (
              <div
                key={item.id}
                style={styles.row}
              >
                <div>
                  <strong>
                    {money(item.amount)}
                  </strong>

                  <div
                    style={styles.small}
                  >
                    {item.transfer_content ||
                      "—"}
                  </div>
                </div>

                <div
                  style={styles.status}
                >
                  {statusText(
                    item.status
                  )}
                </div>
              </div>
            ))
          )}
        </section>
      </section>
    </main>
  );
}

function Info({
  label,
  value,
  copy,
  type,
  copied,
}) {
  return (
    <div style={styles.info}>
      <span>
        {label}
      </span>

      <div style={styles.infoRight}>
        <strong>
          {value || "—"}
        </strong>

        {copy && value && (
          <button
            type="button"
            onClick={() =>
              copy(value, type)
            }
            style={styles.copy}
          >
            {copied === type
              ? "Đã chép"
              : "Sao chép"}
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#fff7fb",
    color: "#222",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    paddingBottom: 40,
  },

  center: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  header: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    minHeight: 60,
    padding: "0 16px",
    background: "#ffffff",
    borderBottom:
      "1px solid #eeeeee",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: 15,
  },

  back: {
    border: 0,
    background: "transparent",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
  },

  headerName: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
  },

  balance: {
    fontWeight: 800,
    color: "#ec2d91",
    whiteSpace: "nowrap",
  },

  container: {
    width:
      "min(1000px, calc(100% - 24px))",
    margin: "0 auto",
    paddingTop: 25,
  },

  title: {
    margin: 0,
    fontSize: 30,
  },

  subtitle: {
    color: "#888",
    fontSize: 13,
    marginTop: 6,
    marginBottom: 20,
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: 15,
  },

  card: {
    background: "#ffffff",
    border:
      "1px solid #eee5ed",
    borderRadius: 16,
    padding: 18,
    marginBottom: 15,
  },

  heading: {
    marginTop: 0,
    fontSize: 17,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border:
      "1px solid #ddd",
    borderRadius: 10,
    padding: 14,
    outline: "none",
    fontSize: 17,
  },

  quick: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: 8,
    marginTop: 12,
  },

  quickButton: {
    border:
      "1px solid #eadfea",
    background: "#ffffff",
    borderRadius: 9,
    padding: 10,
    cursor: "pointer",
    fontWeight: 700,
  },

  submit: {
    width: "100%",
    marginTop: 15,
    border: 0,
    borderRadius: 10,
    padding: 14,
    background: "#ec2d91",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 900,
  },

  info: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: 10,
    padding: "12px 0",
    borderBottom:
      "1px solid #eeeeee",
    fontSize: 12,
  },

  infoRight: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    textAlign: "right",
  },

  copy: {
    marginLeft: 7,
    border: 0,
    borderRadius: 6,
    padding: "5px 7px",
    background: "#fff0f7",
    color: "#ec2d91",
    cursor: "pointer",
    fontSize: 10,
  },

  qrBox: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 15,
  },

  qr: {
    width: 220,
    height: 220,
    objectFit: "contain",
    borderRadius: 10,
  },

  pending: {
    marginTop: 15,
    padding: 12,
    borderRadius: 9,
    background: "#fff8e5",
    color: "#8a6500",
    textAlign: "center",
    fontWeight: 700,
    fontSize: 12,
  },

  warning: {
    padding: 13,
    borderRadius: 9,
    background: "#fff5df",
    color: "#876300",
    fontSize: 12,
  },

  error: {
    padding: 12,
    margin: "15px 0",
    borderRadius: 9,
    background: "#fff0f0",
    color: "#c33",
    fontSize: 12,
  },

  success: {
    padding: 12,
    margin: "15px 0",
    borderRadius: 9,
    background: "#effff5",
    color: "#16834b",
    fontSize: 12,
  },

  row: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: 15,
    padding: "13px 0",
    borderTop:
      "1px solid #eeeeee",
  },

  status: {
    padding: "6px 9px",
    borderRadius: 7,
    background: "#fff8e5",
    color: "#8a6500",
    fontSize: 9,
    fontWeight: 900,
  },

  small: {
    color: "#999",
    fontSize: 10,
    marginTop: 4,
  },

  empty: {
    padding: 20,
    textAlign: "center",
    color: "#999",
    fontSize: 12,
  },
};
