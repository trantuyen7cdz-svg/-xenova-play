import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const body = await request.json();

    const orderId = Number(body.orderId);

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          message: "Order ID không hợp lệ",
        },
        { status: 400 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Thiếu cấu hình Supabase server",
        },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey
    );

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
          message: "Không đọc được đơn hàng",
        },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy đơn hàng",
        },
        { status: 404 }
      );
    }

    if (order.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Đơn hàng không còn ở trạng thái chờ duyệt",
        },
        { status: 400 }
      );
    }

    const durationDays = Number(
      order.products?.duration_days || 0
    );

    if (durationDays <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Sản phẩm chưa có thời hạn KEY hợp lệ",
        },
        { status: 400 }
      );
    }

    const randomPart =
      Math.random().toString(36).substring(2, 10).toUpperCase();

    const timePart = Date.now()
      .toString(36)
      .toUpperCase();

    const keyCode =
      `XENOVA-${timePart}-${randomPart}`;

    const expiresAt = new Date();

    expiresAt.setDate(
      expiresAt.getDate() + durationDays
    );

    const { data: createdKey, error: keyError } =
      await supabaseAdmin
        .from("keys")
        .insert({
          key_code: keyCode,
          product_id: order.product_id,
          user_id: order.user_id,
          expires_at: expiresAt.toISOString(),
          status: "available",
        })
        .select()
        .single();

    if (keyError) {
      console.error(keyError);

      return NextResponse.json(
        {
          success: false,
          message: "Không tạo được KEY",
        },
        { status: 500 }
      );
    }

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

      await supabaseAdmin
        .from("keys")
        .delete()
        .eq("id", createdKey.id);

      return NextResponse.json(
        {
          success: false,
          message:
            "Không cập nhật được đơn hàng",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Duyệt đơn và cấp KEY thành công",
      key: {
        id: createdKey.id,
        key_code: createdKey.key_code,
        expires_at: createdKey.expires_at,
      },
    });
  } catch (error) {
    console.error(
      "APPROVE ORDER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Lỗi server",
      },
      { status: 500 }
    );
  }
}
