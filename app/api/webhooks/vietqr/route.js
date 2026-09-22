import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

/**
 * Lấy mã đơn từ nội dung:
 *
 * XENOVA 48
 * ABC123 XENOVA 48
 * CSRZ270TZE3 XENOVA 48
 *
 * Chỉ yêu cầu phần cuối là:
 * XENOVA <ID>
 */
function parseXenovaOrder(description) {
  const text = normalizeText(description);

  const match = text.match(
    /XENOVA\s+(\d+)\s*$/i
  );

  if (!match) {
    return null;
  }

  const id = Number(match[1]);

  if (
    !Number.isSafeInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

async function processPayment(payment) {
  const description = normalizeText(
    payment?.description
  );

  if (!description) {
    return {
      ok: true,
      status: "ignored",
      reason: "invalid_description",
    };
  }

  const depositId =
    parseXenovaOrder(description);

  if (!depositId) {
    return {
      ok: true,
      status: "ignored",
      reason: "invalid_description",
      description,
    };
  }

  const amount = Number(payment?.amount);

  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0
  ) {
    return {
      ok: true,
      status: "ignored",
      reason: "invalid_amount",
      deposit_id: depositId,
    };
  }

  /*
   * VietQR thành công thường có code = "00".
   *
   * Nếu provider không gửi code thì vẫn cho RPC xử lý.
   */
  if (
    payment?.code !== undefined &&
    String(payment.code) !== "00"
  ) {
    return {
      ok: true,
      status: "ignored",
      reason: "payment_not_success",
      deposit_id: depositId,
      code: String(payment.code),
    };
  }

  const reference =
    normalizeText(payment?.reference) || null;

  /*
   * Chỉ gọi function mới:
   *
   * process_vietqr_deposit(
   *   bigint,
   *   bigint,
   *   text,
   *   text
   * )
   *
   * Sau khi xóa overload cũ numeric,
   * RPC sẽ không còn ambiguity.
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
    "[VIETQR WEBHOOK] RESULT:",
    JSON.stringify(data)
  );

  /*
   * Function 17959 trả về jsonb.
   *
   * Các trạng thái quan trọng:
   * completed
   * already_completed
   * not_found
   * invalid_status
   * amount_mismatch
   * description_mismatch
   */

  if (
    data &&
    typeof data === "object" &&
    data.ok === false
  ) {
    console.warn(
      "[VIETQR WEBHOOK] PAYMENT REJECTED:",
      JSON.stringify(data)
    );
  }

  return data;
}

export async function POST(request) {
  try {
    /*
     * 1. Kiểm tra webhook token
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
     * 2. Đọc body
     */
    const body = await request.json();

    /*
     * Một số webhook gửi:
     *
     * {
     *   data: {...}
     * }
     *
     * Một số trường hợp có thể gửi:
     *
     * {
     *   data: [{...}, {...}]
     * }
     */
    let payments = body?.data;

    if (!payments) {
      return NextResponse.json({
        ok: true,
        status: "ignored",
        reason: "no_data",
      });
    }

    if (!Array.isArray(payments)) {
      payments = [payments];
    }

    const results = [];

    /*
     * 3. Xử lý từng giao dịch
     */
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

        throw error;
      }
    }

    /*
     * 4. Trả 200 cho webhook
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
