import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function getWebhookToken(request) {
  return (
    request.headers.get("secure-token") ||
    request.headers.get("x-webhook-token") ||
    ""
  );
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function parseXenovaOrder(description) {
  const text = normalizeText(description);

  /*
   * Chỉ chấp nhận:
   *
   * XENOVA 123
   * XENOVA 456
   *
   * Không chấp nhận nội dung linh tinh.
   */
  const match = text.match(/^XENOVA\s+(\d+)$/i);

  if (!match) {
    return null;
  }

  const id = Number(match[1]);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

async function processPayment(payment) {
  const description = normalizeText(payment?.description);

  const depositId = parseXenovaOrder(description);

  /*
   * Không phải giao dịch của XENOVA.
   */
  if (!depositId) {
    return {
      ok: true,
      status: "ignored",
      reason: "invalid_description",
    };
  }

  const amount = Number(payment?.amount);

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return {
      ok: true,
      status: "ignored",
      reason: "invalid_amount",
      depositId,
    };
  }

  /*
   * Chỉ xử lý giao dịch thành công.
   */
  if (
    payment?.code !== undefined &&
    String(payment.code) !== "00"
  ) {
    return {
      ok: true,
      status: "ignored",
      reason: "payment_not_success",
      depositId,
    };
  }

  const reference =
    normalizeText(payment?.reference) || null;

  /*
   * Gọi PostgreSQL transaction.
   *
   * Đây là nơi chống cộng tiền 2 lần.
   */
  const { data, error } =
    await supabaseAdmin.rpc(
      "process_vietqr_deposit",
      {
        p_deposit_id: depositId,
        p_amount: amount,
        p_reference: reference,
        p_description: description,
      }
    );

  if (error) {
    console.error(
      "[VIETQR WEBHOOK] RPC ERROR:",
      error
    );

    throw new Error(
      "Không thể xử lý giao dịch"
    );
  }

  console.log(
    "[VIETQR WEBHOOK]",
    JSON.stringify(data)
  );

  return data;
}

export async function POST(request) {
  try {
    /*
     * ==========================================
     * 1. KIỂM TRA WEBHOOK TOKEN
     * ==========================================
     */

    const expectedToken =
      process.env.VIETQR_WEBHOOK_TOKEN || "";

    const receivedToken =
      getWebhookToken(request);

    if (
      !expectedToken ||
      !receivedToken ||
      receivedToken !== expectedToken
    ) {
      console.warn(
        "[VIETQR WEBHOOK] Unauthorized request"
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }


    /*
     * ==========================================
     * 2. ĐỌC BODY
     * ==========================================
     */

    const body = await request.json();

    let payments = body?.data;

    if (!payments) {
      return NextResponse.json({
        ok: true,
        status: "ignored",
        reason: "no_data",
      });
    }

    /*
     * VietQR trả data dạng array.
     * Nhưng vẫn hỗ trợ object để tránh lỗi.
     */
    if (!Array.isArray(payments)) {
      payments = [payments];
    }


    /*
     * ==========================================
     * 3. XỬ LÝ TỪNG GIAO DỊCH
     * ==========================================
     */

    const results = [];

    for (const payment of payments) {
      try {
        const result =
          await processPayment(payment);

        results.push(result);
      } catch (error) {
        console.error(
          "[VIETQR WEBHOOK] PAYMENT ERROR:",
          error
        );

        /*
         * Throw ra ngoài để VietQR có thể gửi lại webhook.
         *
         * Vì transaction trong PostgreSQL đã chống
         * cộng tiền trùng nên webhook retry vẫn an toàn.
         */
        throw error;
      }
    }


    /*
     * ==========================================
     * 4. TRẢ 200
     * ==========================================
     */

    return NextResponse.json({
      ok: true,
      results,
    });

  } catch (error) {
    console.error(
      "[VIETQR WEBHOOK] FATAL ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Webhook processing failed",
      },
      {
        status: 500,
      }
    );
  }
}
