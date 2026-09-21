import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

async function getWebsite(slug) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase
    .from("websites")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("Website query error:", error);
    return null;
  }

  return data;
}

export default async function WebsitePage({ params }) {
  const { slug } = await params;

  const website = await getWebsite(slug);

  if (!website) {
    notFound();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#fff",
        color: "#111827",
      }}
    >
      {/* BANNER */}
      {website.banner_url ? (
        <div
          style={{
            width: "100%",
            height: "260px",
            overflow: "hidden",
            background: "#f3f4f6",
          }}
        >
          <img
            src={website.banner_url}
            alt={website.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>
      ) : (
        <div
          style={{
            width: "100%",
            height: "180px",
            background:
              website.theme === "blue"
                ? "#2563eb"
                : website.theme === "purple"
                ? "#7c3aed"
                : website.theme === "green"
                ? "#16a34a"
                : website.theme === "dark"
                ? "#111827"
                : "#ec4899",
          }}
        />
      )}

      {/* HEADER */}
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "15px",
          }}
        >
          {website.logo_url && (
            <img
              src={website.logo_url}
              alt={website.name}
              style={{
                width: "70px",
                height: "70px",
                objectFit: "cover",
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                background: "#fff",
              }}
            />
          )}

          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: 800,
              }}
            >
              {website.name}
            </h1>

            {website.description && (
              <p
                style={{
                  margin: "6px 0 0",
                  color: "#6b7280",
                }}
              >
                {website.description}
              </p>
            )}
          </div>
        </div>

        {/* PAYMENT */}
        {(website.bank_name ||
          website.bank_account_number ||
          website.bank_account_name ||
          website.payment_qr_url) && (
          <section
            style={{
              marginTop: "30px",
              padding: "20px",
              borderRadius: "16px",
              border: "1px solid #e5e7eb",
              background: "#fff",
            }}
          >
            <h2
              style={{
                margin: "0 0 15px",
                fontSize: "20px",
              }}
            >
              Thông tin thanh toán
            </h2>

            {website.bank_name && (
              <p>
                <strong>Ngân hàng:</strong>{" "}
                {website.bank_name}
              </p>
            )}

            {website.bank_account_number && (
              <p>
                <strong>Số tài khoản:</strong>{" "}
                {website.bank_account_number}
              </p>
            )}

            {website.bank_account_name && (
              <p>
                <strong>Chủ tài khoản:</strong>{" "}
                {website.bank_account_name}
              </p>
            )}

            {website.payment_qr_url && (
              <img
                src={website.payment_qr_url}
                alt="QR thanh toán"
                style={{
                  display: "block",
                  width: "220px",
                  maxWidth: "100%",
                  marginTop: "15px",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                }}
              />
            )}
          </section>
        )}

        {/* PRODUCTS - PHASE SAU */}
        <section
          style={{
            marginTop: "30px",
            padding: "30px 20px",
            borderRadius: "16px",
            background: "#f8fafc",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "22px",
            }}
          >
            Sản phẩm
          </h2>

          <p
            style={{
              marginTop: "8px",
              color: "#6b7280",
            }}
          >
            Website đã được tạo. Hệ thống sản phẩm
            riêng sẽ được kết nối ở bước tiếp theo.
          </p>
        </section>
      </div>
    </main>
  );
}
