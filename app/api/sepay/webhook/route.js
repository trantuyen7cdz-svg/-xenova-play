import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const webhookSecret = process.env.SEPAY_WEBHOOK_SECRET;

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey
);

export async function POST(request) {
  try {
    // =========================
    // 1. KIỂM TRA SECRET
    // =========================

    if (webhookSecret) {
      const receivedSecret =
        request.headers.get("x-secret-key") ||
        request.headers.get("authorization")?.replace(
          /^Bearer\s+/i,
          ""
        );

      if (receivedSecret !== webhookSecret) {
        return NextResponse.json(
          {
            success: false,
            message: "Unauthorized",
          },
          { status: 401 }
        );
      }
    }

    // =========================
    // 2. ĐỌC DỮ LIỆU SEPAY
    // =========================

    const body = await request.json();

    console.log("SEPAY WEBHOOK:", body);

    const transactionId = body.id;
    const gateway = body.gateway;
    const transferType = body.transferType;
    const amount = Number(body.transferAmount || 0);

    const content = String(
      body.content ||
      body.description ||
      ""
    ).trim();

    // =========================
    // 3. CHỈ NHẬN TIỀN VÀO
    // =========================

    if (transferType !== "in") {
      return NextResponse.json({
        success: true,
        message: "Ignored outgoing transaction",
      });
    }

    if (!transactionId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing transaction ID",
        },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid amount",
        },
        { status: 400 }
      );
    }

    // =========================
    // 4. CHỈ NHẬN VIETCOMBANK
    // =========================

    if (
      gateway &&
      gateway.toLowerCase() !== "vietcombank"
    ) {
      return NextResponse.json({
        success: true,
        message: "Ignored other bank",
      });
    }

    // =========================
    // 5. TÌM MÃ ĐƠN
    //
    // Ví dụ:
    // XENOVA 125
    // =========================

    const match = content.match(
      /XENOVA\s*([0-9]+)/i
    );

    if (!match) {
      return NextResponse.json({
        success: true,
        message: "No XENOVA order code",
      });
    }

    const orderId = Number(match[1]);

    if (!orderId) {
      return NextResponse.json({
        success: true,
        message: "Invalid order ID",
      });
    }

    // =========================
    // 6. TÌM ĐƠN HÀNG
    // =========================

    const { data: order, error: orderError } =
      await supabaseAdmin
        .from("orders")
        .select(`
          id,
          user_id,
          product_id,
          amount,
          status,
          products (
            id,
            name,
            duration_days
          )
        `)
        .eq("id", orderId)
        .maybeSingle();

    if (orderError) {
      console.error(orderError);

      return NextResponse.json(
        {
          success: false,
          message: "Database error",
        },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json({
        success: true,
        message: "Order not found",
      });
    }

    // =========================
    // 7. ĐƠN ĐÃ THANH TOÁN
    // =========================

    if (order.status === "paid") {
      return NextResponse.json({
        success: true,
        message: "Order already paid",
      });
    }

    // =========================
    // 8. KIỂM TRA SỐ TIỀN
    // =========================

    const expectedAmount = Number(
      order.amount || 0
    );

    if (amount !== expectedAmount) {
      console.log(
        `Wrong amount for order ${orderId}: received ${amount}, expected ${expectedAmount}`
      );

      return NextResponse.json({
        success: true,
        message: "Amount does not match order",
      });
    }

    // =========================
    // 9. DUYỆT ĐƠN
    // =========================

    const { error: updateError } =
      await supabaseAdmin
        .from("orders")
        .update({
          status: "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("status", "pending");

    if (updateError) {
      console.error(updateError);

      return NextResponse.json(
        {
          success: false,
          message: "Cannot update order",
        },
        { status: 500 }
      );
    }

    // =========================
    // 10. TRẢ KẾT QUẢ
    // =========================

    console.log(
      `ORDER #${orderId} PAID - ${amount} VND`
    );

    return NextResponse.json({
      success: true,
      message: "Payment confirmed",
      order_id: orderId,
      amount,
    });
  } catch (error) {
    console.error(
      "SEPAY WEBHOOK ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Server error",
      },
      { status: 500 }
    );
  }
}
