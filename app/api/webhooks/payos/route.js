import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PayOS } from "@payos/node";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =====================================================
// PAYOS
// =====================================================

function getPayOS() {
  if (
    !process.env.PAYOS_CLIENT_ID ||
    !process.env.PAYOS_API_KEY ||
    !process.env.PAYOS_CHECKSUM_KEY
  ) {
    throw new Error(
      "PayOS chưa được cấu hình đầy đủ."
    );
  }

  return new PayOS({
    clientId:
      process.env.PAYOS_CLIENT_ID,

    apiKey:
      process.env.PAYOS_API_KEY,

    checksumKey:
      process.env.PAYOS_CHECKSUM_KEY,
  });
}

// =====================================================
// NORMALIZE TEXT
// =====================================================

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

// =====================================================
// PARSE XENOVA ORDER
// =====================================================

function parseXenovaOrder(description) {
  const text = normalizeText(description);

  /*
   * Chỉ chấp nhận:
   *
   * XENOVA 123
   * XENOVA 456
   */

  const match =
    text.match(/^XENOVA\s+(\d+)$/i);

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

// =====================================================
// PROCESS PAYMENT
// =====================================================

async function processPayment(webhookData) {
  /*
   * PayOS webhook sau khi verify sẽ có:
   *
   * {
   *   orderCode,
   *   amount,
   *   description,
   *   reference,
   *   ...
   * }
   */

  const orderCode = Number(
    webhookData?.orderCode
  );

  const amount = Number(
    webhookData?.amount
  );

  const description = normalizeText(
    webhookData?.description
  );

  const reference =
    normalizeText(
      webhookData?.reference
    ) || null;

  // ===================================================
  // KIỂM TRA ORDER CODE
  // ===================================================

  if (
    !Number.isSafeInteger(orderCode) ||
    orderCode <= 0
  ) {
    return {
      ok: true,
      status: "ignored",
      reason: "invalid_order_code",
    };
  }

  // ===================================================
  // KIỂM TRA AMOUNT
  // ===================================================

  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0
  ) {
    return {
      ok: true,
      status: "ignored",
      reason: "invalid_amount",
      orderCode,
    };
  }

  // ===================================================
  // KIỂM TRA NỘI DUNG XENOVA
  // ===================================================

  const depositId =
    parseXenovaOrder(description);

  if (!depositId) {
    return {
      ok: true,
      status: "ignored",
      reason: "invalid_description",
      orderCode,
    };
  }

  /*
   * orderCode của PayOS phải trùng ID đơn XENOVA.
   */

  if (depositId !== orderCode) {
    return {
      ok: true,
      status: "ignored",
      reason: "order_code_mismatch",
      orderCode,
      depositId,
    };
  }

  // ===================================================
  // KIỂM TRA ĐƠN TRONG DATABASE
  // ===================================================

  const {
    data: deposit,
    error: depositError,
  } = await supabaseAdmin
    .from("deposit_requests")
    .select(
      "id, user_id, amount, status, transfer_content"
    )
    .eq("id", depositId)
    .maybeSingle();

  if (depositError) {
    console.error(
      "[PAYOS WEBHOOK] LOAD DEPOSIT ERROR:",
      depositError
    );

    throw new Error(
      "Không thể kiểm tra đơn nạp."
    );
  }

  if (!deposit) {
    return {
      ok: true,
      status: "ignored",
      reason: "deposit_not_found",
      orderCode,
      depositId,
    };
  }

  // ===================================================
  // KIỂM TRA SỐ TIỀN
  // ===================================================

  if (
    Number(deposit.amount) !== amount
  ) {
    console.error(
      "[PAYOS WEBHOOK] AMOUNT MISMATCH",
      {
        depositAmount:
          Number(deposit.amount),

        webhookAmount: amount,

        depositId,
      }
    );

    throw new Error(
      "Số tiền giao dịch không khớp."
    );
  }

  // ===================================================
  // KIỂM TRA NỘI DUNG
  // ===================================================

  if (
    normalizeText(
      deposit.transfer_content
    ) !== description
  ) {
    console.error(
      "[PAYOS WEBHOOK] DESCRIPTION MISMATCH",
      {
        database:
          deposit.transfer_content,

        webhook:
          description,

        depositId,
      }
    );

    throw new Error(
      "Nội dung chuyển khoản không khớp."
    );
  }

  // ===================================================
  // NẾU ĐÃ XỬ LÝ THÌ KHÔNG XỬ LÝ LẠI
  // ===================================================

  const currentStatus =
    String(
      deposit.status || ""
    ).toLowerCase();

  if (
    currentStatus === "approved" ||
    currentStatus === "success" ||
    currentStatus === "completed"
  ) {
    return {
      ok: true,
      status: "already_processed",
      depositId,
      orderCode,
    };
  }

  // ===================================================
  // GỌI DATABASE TRANSACTION
  // ===================================================

  /*
   * Dùng lại RPC hiện tại của XENOVA.
   *
   * RPC này chịu trách nhiệm:
   *
   * - kiểm tra đơn
   * - cộng tiền vào ví
   * - cập nhật trạng thái
   * - chống cộng tiền 2 lần
   */

  const {
    data,
    error,
  } = await supabaseAdmin.rpc(
    "process_vietqr_deposit",
    {
      p_deposit_id:
        depositId,

      p_amount:
        amount,

      p_reference:
        reference,

      p_description:
        description,
    }
  );

  if (error) {
    console.error(
      "[PAYOS WEBHOOK] RPC ERROR:",
      error
    );

    throw new Error(
      "Không thể xử lý giao dịch."
    );
  }

  console.log(
    "[PAYOS WEBHOOK] PROCESSED:",
    JSON.stringify({
      orderCode,
      depositId,
      amount,
      reference,
      result: data,
    })
  );

  return {
    ok: true,
    status: "processed",
    orderCode,
    depositId,
    amount,
    reference,
    result: data,
  };
}

// =====================================================
// POST
// =====================================================

export async function POST(request) {
  try {
    // =================================================
    // 1. KIỂM TRA PAYOS ENV
    // =================================================

    if (
      !process.env.PAYOS_CLIENT_ID ||
      !process.env.PAYOS_API_KEY ||
      !process.env.PAYOS_CHECKSUM_KEY
    ) {
      console.error(
        "[PAYOS WEBHOOK] ENV MISSING"
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "PayOS chưa được cấu hình.",
        },
        {
          status: 500,
        }
      );
    }

    // =================================================
    // 2. ĐỌC BODY
    // =================================================

    const body =
      await request.json();

    console.log(
      "[PAYOS WEBHOOK] RECEIVED:",
      JSON.stringify(body)
    );

    // =================================================
    // 3. VERIFY WEBHOOK
    // =================================================

    const payOS =
      getPayOS();

    const webhookData =
      await payOS.webhooks.verify(
        body
      );

    console.log(
      "[PAYOS WEBHOOK] VERIFIED:",
      JSON.stringify(
        webhookData
      )
    );

    // =================================================
    // 4. KIỂM TRA PAYOS CODE
    // =================================================

    /*
     * PayOS webhook có code:
     *
     * 00 = giao dịch thành công
     */

    if (
      body?.code !== undefined &&
      String(body.code) !== "00"
    ) {
      return NextResponse.json({
        ok: true,
        status: "ignored",
        reason: "payment_not_success",
        code: body.code,
        desc: body.desc || null,
      });
    }

    // =================================================
    // 5. XỬ LÝ THANH TOÁN
    // =================================================

    const result =
      await processPayment(
        webhookData
      );

    // =================================================
    // 6. TRẢ 200
    // =================================================

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    console.error(
      "[PAYOS WEBHOOK] FATAL ERROR:",
      error
    );

    /*
     * Trả 500 để PayOS có thể retry
     * nếu server/database gặp lỗi.
     */

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Webhook processing failed.",
      },
      {
        status: 500,
      }
    );
  }
}
