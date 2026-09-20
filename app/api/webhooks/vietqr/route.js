import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST(request) {
  try {
    /* =========================================================
       1. KIỂM TRA WEBHOOK TOKEN
    ========================================================= */

    const expectedToken = process.env.VIETQR_WEBHOOK_TOKEN;

    if (!expectedToken) {
      console.error("Missing VIETQR_WEBHOOK_TOKEN");
      return json(
        {
          success: false,
          message: "Webhook chưa được cấu hình.",
        },
        500
      );
    }

    const receivedToken =
      request.headers.get("secure-token") ||
      request.headers.get("x-webhook-token") ||
      "";

    if (receivedToken !== expectedToken) {
      console.warn("Invalid VietQR webhook token");

      return json(
        {
          success: false,
          message: "Unauthorized",
        },
        401
      );
    }

    /* =========================================================
       2. ĐỌC BODY
    ========================================================= */

    const body = await request.json();

    /*
      VietQR thường gửi:

      {
        code: "00",
        desc: "Success",
        data: [
          {
            orderCode,
            amount,
            description,
            reference,
            transactionDatetime,
            ...
          }
        ]
      }
    */

    const rawData = body?.data;

    if (!rawData) {
      return json({
        success: true,
        message: "No payment data",
      });
    }

    const payments = Array.isArray(rawData)
      ? rawData
      : [rawData];

    /* =========================================================
       3. XỬ LÝ TỪNG GIAO DỊCH
    ========================================================= */

    const results = [];

    for (const payment of payments) {
      try {
        const amount = Number(payment?.amount);

        const description = String(
          payment?.description || ""
        ).trim();

        const reference = String(
          payment?.reference || ""
        ).trim();

        /*
          Chỉ nhận nội dung:

          XENOVA 123
          XENOVA 456
          ...

          Không nhận:
          XENOVA
          XENOVA ABC
          ABC XENOVA 123
        */

        const match = description.match(
          /^XENOVA\s+(\d+)$/i
        );

        if (!match) {
          results.push({
            success: false,
            ignored: true,
            reason: "Invalid XENOVA transfer content",
            description,
          });

          continue;
        }

        const depositId = Number(match[1]);

        if (!Number.isInteger(depositId) || depositId <= 0) {
          results.push({
            success: false,
            ignored: true,
            reason: "Invalid deposit ID",
          });

          continue;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
          results.push({
            success: false,
            ignored: true,
            reason: "Invalid amount",
            depositId,
          });

          continue;
        }

        /* =====================================================
           4. GỌI TRANSACTION DATABASE

           Toàn bộ:
           - khóa đơn
           - kiểm tra trạng thái
           - cộng ví
           - hoàn tất đơn

           được thực hiện ATOMIC.
        ===================================================== */

        const { data, error } = await supabaseAdmin.rpc(
          "process_vietqr_deposit",
          {
            p_deposit_id: depositId,
            p_amount: Math.round(amount),
            p_transfer_content: description,
            p_reference: reference || null,
          }
        );

        if (error) {
          console.error(
            "process_vietqr_deposit RPC error:",
            error
          );

          results.push({
            success: false,
            depositId,
            reason: error.message,
          });

          continue;
        }

        const result = Array.isArray(data)
          ? data[0]
          : data;

        results.push({
          success: result?.success === true,
          depositId,
          status: result?.status || null,
          message: result?.message || null,
        });
      } catch (paymentError) {
        console.error(
          "VietQR payment processing error:",
          paymentError
        );

        results.push({
          success: false,
          reason:
            paymentError?.message ||
            "Payment processing error",
        });
      }
    }

    /* =========================================================
       5. LUÔN TRẢ 2XX CHO WEBHOOK SAU KHI ĐÃ XỬ LÝ
    ========================================================= */

    return json({
      success: true,
      results,
    });
  } catch (error) {
    console.error(
      "VietQR webhook fatal error:",
      error
    );

    /*
      Lỗi hệ thống thật sự -> 500 để VietQR có thể retry.
    */

    return json(
      {
        success: false,
        message: "Internal server error",
      },
      500
    );
  }
}
