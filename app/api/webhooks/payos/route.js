import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PayOS } from "@payos/node";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    if (
      !process.env.PAYOS_CLIENT_ID ||
      !process.env.PAYOS_API_KEY ||
      !process.env.PAYOS_CHECKSUM_KEY
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "PayOS chưa được cấu hình.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const payOS = new PayOS({
      clientId:
        process.env.PAYOS_CLIENT_ID,

      apiKey:
        process.env.PAYOS_API_KEY,

      checksumKey:
        process.env.PAYOS_CHECKSUM_KEY,
    });

    // XÁC MINH CHỮ KÝ PAYOS
    const webhookData =
      payOS.webhooks.verify(body);

    const orderCode =
      Number(webhookData.orderCode);

    const amount =
      Number(webhookData.amount);

    const description =
      String(
        webhookData.description || ""
      ).trim();

    if (
      !Number.isSafeInteger(orderCode) ||
      orderCode <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "orderCode không hợp lệ.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isSafeInteger(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "amount không hợp lệ.",
        },
        { status: 400 }
      );
    }

    // Chỉ nhận đơn XENOVA
    if (
      !/^XENOVA\s+\d+$/i.test(
        description
      )
    ) {
      return NextResponse.json({
        success: true,
        status: "ignored",
        reason:
          "invalid_description",
      });
    }

    // ==========================================
    // TÌM ĐƠN
    // ==========================================

    const {
      data: deposit,
      error: depositError,
    } = await supabaseAdmin
      .from("deposit_requests")
      .select(
        "id, user_id, amount, status, transfer_content"
      )
      .eq("id", orderCode)
      .maybeSingle();

    if (depositError) {
      throw depositError;
    }

    if (!deposit) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy đơn nạp.",
        },
        { status: 404 }
      );
    }

    // ==========================================
    // KIỂM TRA SỐ TIỀN
    // ==========================================

    if (
      Number(deposit.amount) !== amount
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Số tiền không khớp.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // KIỂM TRA NỘI DUNG
    // ==========================================

    if (
      String(
        deposit.transfer_content
      ).trim() !== description
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Nội dung chuyển khoản không khớp.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // TRANSACTION HIỆN TẠI CỦA XENOVA
    // ==========================================
    //
    // RPC này đã được hệ thống XENOVA dùng
    // cho webhook VietQR hiện tại.
    //
    // Quan trọng:
    // pending -> completed
    // + cộng ví
    // phải nằm trong transaction.
    //

    const {
      data,
      error,
    } = await supabaseAdmin.rpc(
      "process_vietqr_deposit",
      {
        p_deposit_id:
          orderCode,

        p_amount:
          amount,

        p_reference:
          webhookData.reference ||
          null,

        p_description:
          description,
      }
    );

    if (error) {
      console.error(
        "[PAYOS WEBHOOK] RPC ERROR:",
        error
      );

      throw error;
    }

    console.log(
      "[PAYOS WEBHOOK] PROCESSED:",
      {
        orderCode,
        amount,
        result: data,
      }
    );

    return NextResponse.json({
      success: true,
      status: "processed",
      orderCode,
      result: data,
    });
  } catch (error) {
    console.error(
      "[PAYOS WEBHOOK] ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}
