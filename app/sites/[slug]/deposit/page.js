"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

function money(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function statusInfo(status) {
  if (status === "completed" || status === "approved") {
    return {
      text: "ĐÃ DUYỆT",
      background: "#eafff2",
      color: "#16834b",
    };
  }

  if (status === "failed" || status === "rejected") {
    return {
      text: "TỪ CHỐI",
      background: "#fff0f0",
      color: "#d33",
    };
  }

  return {
    text: "CHỜ DUYỆT",
    background: "#fff8e5",
    color: "#8a6500",
  };
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

  async function loadData(options = {}) {
    if (!slug) {
      return;
    }

    const {
      showLoading = true,
      clearError = true,
    } = options;

    try {
      if (showLoading) {
        setLoading(true);
      }

      if (clearError) {
        setError("");
      }

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
          walletData?.message ||
            "Không thể tải ví."
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
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadData();
  }, [slug]);

  async function createDeposit() {
    setError("");
    setMessage("");

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

      // Giữ nguyên thông tin đơn vừa tạo
      // để QR + nội dung chuyển khoản hiện ngay.
      setDeposit(result);

      setMessage(
        "Đã tạo yêu cầu nạp tiền. Hãy chuyển khoản đúng số tiền và nội dung."
      );

      setAmount("");

      // Cập nhật số dư + lịch sử,
      // nhưng không làm mất QR của đơn vừa tạo.
      await loadData({
        showLoading: false,
        clearError: false,
      });
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

  function selectAmount(value) {
    setAmount(String(value));
    setError("");
  }

  if (loading) {
    return (
      <main style={styles.center}>
        <div style={styles.loadingBox}>
          <div style={styles.loadingIcon}>
            💳
          </div>

          <div style={styles.loadingText}>
            Đang tải thông tin nạp tiền...
          </div>
        </div>
      </main>
    );
  }

  const bankName =
    deposit?.bank?.name ||
    website?.bank_name ||
    "";

  const accountNumber =
    deposit?.bank?.accountNumber ||
    website?.bank_account_number ||
    "";

  const accountName =
    deposit?.bank?.accountName ||
    website?.bank_account_name ||
    "";

  const qrUrl =
    deposit?.bank?.qrUrl ||
    website?.payment_qr_url ||
    "";

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

        <div style={styles.balanceBox}>
          <span style={styles.balanceLabel}>
            Số dư
          </span>

          <span style={styles.balance}>
            {money(wallet)}
          </span>
        </div>
      </header>

      <section style={styles.container}>
        <div style={styles.topTitle}>
          <div>
            <h1 style={styles.title}>
              Nạp tiền
            </h1>

            <p style={styles.subtitle}>
              Nạp tiền vào ví riêng của website này.
            </p>
          </div>

          <div style={styles.manualBadge}>
            MANUAL
          </div>
        </div>

        {error && (
          <div style={styles.error}>
            <span style={styles.alertIcon}>
              ⚠️
            </span>

            <span>{error}</span>
          </div>
        )}

        {message && (
          <div style={styles.success}>
            <span style={styles.alertIcon}>
              ✓
            </span>

            <span>{message}</span>
          </div>
        )}

        <div style={styles.grid}>
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.heading}>
                  Số tiền nạp
                </h2>

                <p style={styles.cardDescription}>
                  Nhập số tiền bạn muốn nạp vào ví.
                </p>
              </div>

              <div style={styles.cardIcon}>
                💰
              </div>
            </div>

            <div style={styles.amountWrapper}>
              <input
                value={amount}
                onChange={(event) => {
                  setAmount(
                    event.target.value.replace(
                      /\D/g,
                      ""
                    )
                  );
                  setError("");
                }}
                inputMode="numeric"
                placeholder="0"
                style={styles.amountInput}
              />

              <span style={styles.currency}>
                VNĐ
              </span>
            </div>

            {amount && (
              <div style={styles.amountPreview}>
                Số tiền:
                <strong>
                  {money(amount)}
                </strong>
              </div>
            )}

            <div style={styles.quickTitle}>
              Chọn nhanh
            </div>

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
                    selectAmount(value)
                  }
                  style={styles.quickButton}
                >
                  {money(value)}
                </button>
              ))}
            </div>

            <div style={styles.limit}>
              <span>
                Tối thiểu: 10.000đ
              </span>

              <span>
                Tối đa: 100.000.000đ
              </span>
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
                ? "ĐANG TẠO YÊU CẦU..."
                : "TẠO YÊU CẦU NẠP"}
            </button>

            <div style={styles.note}>
              Sau khi tạo yêu cầu, hãy chuyển khoản
              <strong> đúng số tiền </strong>
              và
              <strong> đúng nội dung </strong>
              hiển thị bên phải.
            </div>
          </section>

          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.heading}>
                  Thông tin chuyển khoản
                </h2>

                <p style={styles.cardDescription}>
                  Chuyển khoản theo đúng thông tin bên dưới.
                </p>
              </div>

              <div style={styles.cardIcon}>
                🏦
              </div>
            </div>

            {!accountNumber ? (
              <div style={styles.warning}>
                <div style={styles.warningIcon}>
                  ⚠️
                </div>

                <div>
                  <strong>
                    Chưa có thông tin ngân hàng
                  </strong>

                  <p style={styles.warningText}>
                    Admin chưa cấu hình thông tin
                    ngân hàng cho website này.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {qrUrl && (
                  <div style={styles.qrSection}>
                    <div style={styles.qrTitle}>
                      Quét mã QR để chuyển khoản
                    </div>

                    <div style={styles.qrBox}>
                      <img
                        src={qrUrl}
                        alt="QR chuyển khoản"
                        style={styles.qr}
                      />
                    </div>

                    <div style={styles.qrHint}>
                      Sử dụng ứng dụng ngân hàng
                      để quét mã.
                    </div>
                  </div>
                )}

                <Info
                  label="Ngân hàng"
                  value={bankName}
                />

                <Info
                  label="Số tài khoản"
                  value={accountNumber}
                  copy={copy}
                  type="account"
                  copied={copied}
                />

                <Info
                  label="Chủ tài khoản"
                  value={accountName}
                  copy={copy}
                  type="name"
                  copied={copied}
                />

                {deposit && (
                  <div style={styles.depositBox}>
                    <div style={styles.depositBoxTitle}>
                      Thông tin đơn nạp
                    </div>

                    <Info
                      label="Mã đơn"
                      value={`#${deposit.depositId}`}
                      copy={copy}
                      type="depositId"
                      copied={copied}
                    />

                    <Info
                      label="Số tiền"
                      value={money(
                        deposit.amount
                      )}
                      copy={copy}
                      type="amount"
                      copied={copied}
                    />

                    <Info
                      label="Nội dung"
                      value={
                        deposit.transferContent
                      }
                      copy={copy}
                      type="content"
                      copied={copied}
                      highlight
                    />

                    <div style={styles.pending}>
                      <span>
                        ⏳
                      </span>

                      <span>
                        Đang chờ Admin xác nhận
                      </span>
                    </div>
                  </div>
                )}

                {!deposit && (
                  <div style={styles.instruction}>
                    <span style={styles.instructionIcon}>
                      💡
                    </span>

                    <span>
                      Hãy tạo yêu cầu nạp ở bên trái
                      trước khi chuyển khoản để nhận
                      nội dung chuyển khoản riêng.
                    </span>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.heading}>
                Lịch sử nạp tiền
              </h2>

              <p style={styles.cardDescription}>
                Theo dõi các yêu cầu nạp tiền của bạn.
              </p>
            </div>

            <div style={styles.historyCount}>
              {requests.length}
            </div>
          </div>

          {requests.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                📋
              </div>

              <div>
                <strong>
                  Chưa có giao dịch
                </strong>

                <p>
                  Các yêu cầu nạp tiền sẽ xuất hiện
                  ở đây.
                </p>
              </div>
            </div>
          ) : (
            <div style={styles.historyList}>
              {requests.map((item) => {
                const status =
                  statusInfo(item.status);

                return (
                  <div
                    key={item.id}
                    style={styles.row}
                  >
                    <div style={styles.rowLeft}>
                      <div style={styles.rowIcon}>
                        💳
                      </div>

                      <div>
                        <strong style={styles.rowAmount}>
                          {money(item.amount)}
                        </strong>

                        <div style={styles.small}>
                          Đơn #{item.id}
                        </div>

                        <div style={styles.small}>
                          {item.transfer_content ||
                            "—"}
                        </div>

                        {item.created_at && (
                          <div style={styles.date}>
                            {new Date(
                              item.created_at
                            ).toLocaleString(
                              "vi-VN"
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        ...styles.status,
                        background:
                          status.background,
                        color:
                          status.color,
                      }}
                    >
                      {status.text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={() =>
            router.push(`/sites/${slug}`)
          }
          style={styles.shopButton}
        >
          ← Quay lại cửa hàng
        </button>
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
  highlight = false,
}) {
  return (
    <div
      style={{
        ...styles.info,
        ...(highlight
          ? styles.infoHighlight
          : {}),
      }}
    >
      <span style={styles.infoLabel}>
        {label}
      </span>

      <div style={styles.infoRight}>
        <strong style={styles.infoValue}>
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
    background:
      "linear-gradient(180deg, #fff7fb 0%, #fff 45%, #fff7fb 100%)",
    color: "#222",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    paddingBottom: 50,
  },

  center: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#fff7fb",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  loadingBox: {
    textAlign: "center",
    padding: 30,
  },

  loadingIcon: {
    fontSize: 38,
    marginBottom: 12,
  },

  loadingText: {
    color: "#777",
    fontSize: 13,
    fontWeight: 700,
  },

  header: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    minHeight: 62,
    padding: "0 16px",
    background:
      "rgba(255,255,255,0.96)",
    backdropFilter: "blur(10px)",
    borderBottom:
      "1px solid #eee5ed",
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
    fontWeight: 800,
    fontSize: 13,
    color: "#333",
    padding: "9px 0",
  },

  headerName: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    color: "#222",
  },

  balanceBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    minWidth: 85,
  },

  balanceLabel: {
    color: "#999",
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
  },

  balance: {
    fontWeight: 900,
    color: "#ec2d91",
    whiteSpace: "nowrap",
    fontSize: 13,
  },

  container: {
    width:
      "min(1050px, calc(100% - 24px))",
    margin: "0 auto",
    paddingTop: 28,
  },

  topTitle: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent:
      "space-between",
    gap: 15,
    marginBottom: 20,
  },

  title: {
    margin: 0,
    fontSize: 30,
    fontWeight: 900,
    letterSpacing: "-0.5px",
  },

  subtitle: {
    color: "#888",
    fontSize: 13,
    marginTop: 7,
    marginBottom: 0,
  },

  manualBadge: {
    padding: "7px 10px",
    borderRadius: 999,
    background: "#fff0f7",
    color: "#ec2d91",
    fontSize: 10,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  error: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 13,
    marginBottom: 15,
    borderRadius: 11,
    background: "#fff0f0",
    border:
      "1px solid #ffd8d8",
    color: "#c33",
    fontSize: 12,
    fontWeight: 700,
  },

  success: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 13,
    marginBottom: 15,
    borderRadius: 11,
    background: "#effff5",
    border:
      "1px solid #d3f4df",
    color: "#16834b",
    fontSize: 12,
    fontWeight: 700,
  },

  alertIcon: {
    fontSize: 15,
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: 16,
    alignItems: "start",
  },

  card: {
    background: "#ffffff",
    border:
      "1px solid #eee5ed",
    borderRadius: 18,
    padding: 19,
    marginBottom: 16,
    boxShadow:
      "0 8px 25px rgba(40, 20, 35, 0.04)",
  },

  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent:
      "space-between",
    gap: 15,
    marginBottom: 17,
  },

  heading: {
    margin: 0,
    fontSize: 17,
    fontWeight: 900,
  },

  cardDescription: {
    margin: "5px 0 0",
    color: "#999",
    fontSize: 11,
    lineHeight: 1.5,
  },

  cardIcon: {
    width: 38,
    height: 38,
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: 11,
    background: "#fff0f7",
    fontSize: 18,
  },

  amountWrapper: {
    position: "relative",
    width: "100%",
  },

  amountInput: {
    width: "100%",
    boxSizing: "border-box",
    border:
      "2px solid #f0e3ec",
    borderRadius: 12,
    padding:
      "16px 65px 16px 15px",
    outline: "none",
    fontSize: 25,
    fontWeight: 900,
    color: "#222",
    background: "#fff",
  },

  currency: {
    position: "absolute",
    right: 15,
    top: "50%",
    transform:
      "translateY(-50%)",
    color: "#999",
    fontSize: 11,
    fontWeight: 900,
  },

  amountPreview: {
    display: "flex",
    justifyContent:
      "space-between",
    marginTop: 8,
    padding: "8px 10px",
    borderRadius: 8,
    background: "#fafafa",
    color: "#999",
    fontSize: 11,
  },

  quickTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 11,
    color: "#888",
    fontWeight: 800,
  },

  quick: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: 8,
  },

  quickButton: {
    border:
      "1px solid #eadfea",
    background: "#fff",
    borderRadius: 9,
    padding: 10,
    cursor: "pointer",
    fontWeight: 800,
    color: "#444",
    fontSize: 11,
  },

  limit: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 10,
    marginTop: 10,
    color: "#aaa",
    fontSize: 9,
  },

  submit: {
    width: "100%",
    marginTop: 16,
    border: 0,
    borderRadius: 11,
    padding: 15,
    background:
      "linear-gradient(135deg, #ec2d91, #f04ca0)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    boxShadow:
      "0 7px 18px rgba(236,45,145,0.2)",
  },

  note: {
    marginTop: 12,
    padding: 11,
    borderRadius: 9,
    background: "#fff9fc",
    color: "#888",
    fontSize: 10,
    lineHeight: 1.6,
    textAlign: "center",
  },

  warning: {
    display: "flex",
    gap: 11,
    padding: 14,
    borderRadius: 11,
    background: "#fff8e5",
    border:
      "1px solid #f8e7b5",
    color: "#876300",
    fontSize: 12,
  },

  warningIcon: {
    fontSize: 19,
  },

  warningText: {
    margin: "5px 0 0",
    color: "#9b7b30",
    fontSize: 10,
  },

  qrSection: {
    textAlign: "center",
    marginBottom: 17,
  },

  qrTitle: {
    fontSize: 11,
    fontWeight: 800,
    color: "#777",
    marginBottom: 10,
  },

  qrBox: {
    display: "flex",
    justifyContent: "center",
    padding: 10,
    background: "#fff",
  },

  qr: {
    width: 220,
    height: 220,
    maxWidth: "100%",
    objectFit: "contain",
    borderRadius: 10,
    border:
      "1px solid #eeeeee",
  },

  qrHint: {
    marginTop: 8,
    color: "#aaa",
    fontSize: 9,
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
    fontSize: 11,
  },

  infoHighlight: {
    padding:
      "13px 10px",
    borderRadius: 9,
    background: "#fff5fa",
    border:
      "1px solid #ffd9ec",
  },

  infoLabel: {
    color: "#999",
    flexShrink: 0,
  },

  infoRight: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "flex-end",
    gap: 5,
    textAlign: "right",
    minWidth: 0,
  },

  infoValue: {
    wordBreak: "break-word",
    color: "#333",
  },

  copy: {
    flexShrink: 0,
    marginLeft: 5,
    border: 0,
    borderRadius: 6,
    padding: "5px 7px",
    background: "#fff0f7",
    color: "#ec2d91",
    cursor: "pointer",
    fontSize: 9,
    fontWeight: 800,
  },

  depositBox: {
    marginTop: 15,
    padding: 12,
    borderRadius: 11,
    background: "#fafafa",
    border:
      "1px solid #eeeeee",
  },

  depositBoxTitle: {
    fontSize: 11,
    fontWeight: 900,
    marginBottom: 4,
  },

  pending: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 12,
    padding: 11,
    borderRadius: 9,
    background: "#fff8e5",
    color: "#8a6500",
    textAlign: "center",
    fontWeight: 800,
    fontSize: 10,
  },

  instruction: {
    display: "flex",
    alignItems: "flex-start",
    gap: 9,
    marginTop: 14,
    padding: 11,
    borderRadius: 9,
    background: "#f8f8f8",
    color: "#888",
    fontSize: 10,
    lineHeight: 1.5,
  },

  instructionIcon: {
    fontSize: 14,
  },

  historyCount: {
    minWidth: 28,
    height: 28,
    display: "grid",
    placeItems: "center",
    borderRadius: 9,
    background: "#fff0f7",
    color: "#ec2d91",
    fontSize: 11,
    fontWeight: 900,
  },

  historyList: {
    borderTop:
      "1px solid #eeeeee",
  },

  row: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: 15,
    padding: "13px 0",
    borderBottom:
      "1px solid #eeeeee",
  },

  rowLeft: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    minWidth: 0,
  },

  rowIcon: {
    width: 36,
    height: 36,
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: 10,
    background: "#fff0f7",
  },

  rowAmount: {
    fontSize: 13,
  },

  small: {
    color: "#999",
    fontSize: 9,
    marginTop: 3,
  },

  date: {
    color: "#bbb",
    fontSize: 8,
    marginTop: 3,
  },

  status: {
    flexShrink: 0,
    padding: "6px 9px",
    borderRadius: 7,
    fontSize: 8,
    fontWeight: 900,
  },

  empty: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 25,
    color: "#999",
    fontSize: 11,
    textAlign: "left",
    background: "#fafafa",
    borderRadius: 11,
  },

  emptyIcon: {
    fontSize: 28,
  },

  shopButton: {
    display: "block",
    margin:
      "5px auto 0",
    border:
      "1px solid #eadfea",
    background: "#fff",
    color: "#555",
    borderRadius: 10,
    padding: "11px 18px",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 11,
  },
};

if (typeof window !== "undefined") {
  const styleId =
    "xenova-deposit-responsive";

  if (
    !document.getElementById(styleId)
  ) {
    const style =
      document.createElement("style");

    style.id = styleId;

    style.textContent = `
      @media (max-width: 760px) {
        .deposit-mobile-fix {
          grid-template-columns: 1fr !important;
        }
      }

      @media (max-width: 760px) {
        body {
          overflow-x: hidden;
        }
      }
    `;

    document.head.appendChild(style);
  }
}
