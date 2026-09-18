import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();

    const orderId = Number(body.orderId);

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          message: "Thiếu orderId",
        },
        { status: 400 }
      );
    }

    // =========================
    // LẤY ĐƠN HÀNG
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
          message: "Không lấy được đơn hàng",
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

    // =========================
    // KIỂM TRA ĐÃ CẤP KEY CHƯA
    // =========================

    const { data: existingKey, error: existingError } =
      await supabaseAdmin
        .from("keys")
        .select(`
          id,
          key_code,
          product_id,
          user_id,
          order_id,
          expires_at,
          status
        `)
        .eq("order_id", orderId)
        .maybeSingle();

    if (existingError) {
      console.error(existingError);

      return NextResponse.json(
        {
          success: false,
          message: "Không kiểm tra được KEY cũ",
        },
        { status: 500 }
      );
    }

    if (existingKey) {
      return NextResponse.json({
        success: true,
        message: "Đơn hàng đã được cấp KEY",
        key: existingKey.key_code,
      });
    }

    // =========================
    // KIỂM TRA SẢN PHẨM
    // =========================

    const product = order.products;

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Sản phẩm không tồn tại",
        },
        { status: 400 }
      );
    }

    const durationDays = Number(product.duration_days || 0);

    if (durationDays <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Sản phẩm chưa có thời hạn KEY",
        },
        { status: 400 }
      );
    }

    // =========================
    // TÌM KEY CHƯA BÁN
    // =========================

    const { data: availableKey, error: keyError } =
      await supabaseAdmin
        .from("keys")
        .select(`
          id,
          key_code,
          product_id,
          status
        `)
        .eq("product_id", order.product_id)
        .eq("status", "available")
        .is("user_id", null)
        .is("order_id", null)
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

    if (keyError) {
      console.error(keyError);

      return NextResponse.json(
        {
          success: false,
          message: "Không lấy được kho KEY",
        },
        { status: 500 }
      );
    }

    if (!availableKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Kho KEY "${product.name}" đã hết KEY`,
        },
        { status: 400 }
      );
    }

    // =========================
    // TÍNH NGÀY HẾT HẠN
    // =========================

    const expiresAt = new Date();

    expiresAt.setDate(
      expiresAt.getDate() + durationDays
    );

    // =========================
    // GÁN KEY CHO KHÁCH
    // =========================

    const { data: assignedKey, error: updateKeyError } =
      await supabaseAdmin
        .from("keys")
        .update({
          user_id: order.user_id,
          order_id: order.id,
          expires_at: expiresAt.toISOString(),
          status: "sold",
          sold_at: new Date().toISOString(),
        })
        .eq("id", availableKey.id)
        .eq("status", "available")
        .is("user_id", null)
        .is("order_id", null)
        .select()
        .maybeSingle();

    if (updateKeyError) {
      console.error(updateKeyError);

      return NextResponse.json(
        {
          success: false,
          message: "Không thể cấp KEY",
        },
        { status: 500 }
      );
    }

    if (!assignedKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "KEY vừa được cấp cho người khác, hãy thử lại",
        },
        { status: 409 }
      );
    }

    // =========================
    // CẬP NHẬT ĐƠN HÀNG
    // =========================

    const { error: orderUpdateError } =
      await supabaseAdmin
        .from("orders")
        .update({
          status: "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

    if (orderUpdateError) {
      console.error(orderUpdateError);

      // Trường hợp hiếm: KEY đã cấp nhưng cập nhật order lỗi.
      return NextResponse.json(
        {
          success: false,
          message:
            "Đã cấp KEY nhưng cập nhật đơn hàng thất bại",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Cấp KEY thành công",
      key: assignedKey.key_code,
      expires_at: assignedKey.expires_at,
      order_id: order.id,
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
