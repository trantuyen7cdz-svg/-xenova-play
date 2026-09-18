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
          message: "Thiếu mã đơn hàng",
        },
        { status: 400 }
      );
    }

    // =========================
    // LẤY ĐƠN HÀNG
    // =========================

    const { data: order, error: orderError } = await supabaseAdmin
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
      console.error("GET ORDER ERROR:", orderError);

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
    // ĐÃ HOÀN THÀNH
    // =========================

    if (order.status === "completed") {
      const { data: existingKey } = await supabaseAdmin
        .from("keys")
        .select("id, key_code, expires_at")
        .eq("order_id", order.id)
        .maybeSingle();

      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        message: "Đơn hàng đã hoàn thành",
        key: existingKey?.key_code || null,
        expires_at: existingKey?.expires_at || null,
      });
    }

    // =========================
    // CHỈ DUYỆT ĐƠN ĐANG CHỜ
    // =========================

    if (order.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          message: `Đơn hàng đang ở trạng thái "${order.status}"`,
        },
        { status: 400 }
      );
    }

    const product = order.products;

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Sản phẩm của đơn hàng không tồn tại",
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
    // KIỂM TRA KEY ĐÃ CẤP
    // =========================

    const { data: existingKey, error: existingKeyError } =
      await supabaseAdmin
        .from("keys")
        .select(`
          id,
          key_code,
          expires_at,
          status
        `)
        .eq("order_id", order.id)
        .maybeSingle();

    if (existingKeyError) {
      console.error("CHECK EXISTING KEY ERROR:", existingKeyError);

      return NextResponse.json(
        {
          success: false,
          message: "Không kiểm tra được KEY của đơn hàng",
        },
        { status: 500 }
      );
    }

    if (existingKey) {
      await supabaseAdmin
        .from("orders")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      return NextResponse.json({
        success: true,
        message: "Đơn hàng đã có KEY",
        key: existingKey.key_code,
        expires_at: existingKey.expires_at,
      });
    }

    // =========================
    // TÌM KEY CÒN KHO
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
      console.error("GET AVAILABLE KEY ERROR:", keyError);

      return NextResponse.json(
        {
          success: false,
          message: "Không lấy được kho KEY",
        },
        { status: 500 }
      );
    }

    // =========================
    // HẾT KEY
    // =========================

    if (!availableKey) {
      return NextResponse.json(
        {
          success: false,
          message: `Kho KEY "${product.name}" đã hết KEY`,
        },
        { status: 400 }
      );
    }

    // =========================
    // TÍNH NGÀY HẾT HẠN
    // =========================

    const now = new Date();

    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    // =========================
    // CẤP KEY
    // =========================

    const { data: assignedKey, error: assignError } =
      await supabaseAdmin
        .from("keys")
        .update({
          user_id: order.user_id,
          order_id: order.id,
          expires_at: expiresAt.toISOString(),
          status: "sold",
          sold_at: now.toISOString(),
        })
        .eq("id", availableKey.id)
        .eq("status", "available")
        .is("user_id", null)
        .is("order_id", null)
        .select()
        .maybeSingle();

    if (assignError) {
      console.error("ASSIGN KEY ERROR:", assignError);

      return NextResponse.json(
        {
          success: false,
          message: "Không thể cấp KEY",
        },
        { status: 500 }
      );
    }

    // Có người khác vừa lấy KEY này
    if (!assignedKey) {
      return NextResponse.json(
        {
          success: false,
          message: "KEY vừa được cấp cho người khác. Hãy thử lại.",
        },
        { status: 409 }
      );
    }

    // =========================
    // HOÀN THÀNH ĐƠN
    // =========================

    const { error: updateOrderError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("status", "pending");

    if (updateOrderError) {
      console.error("UPDATE ORDER ERROR:", updateOrderError);

      return NextResponse.json(
        {
          success: false,
          message: "Đã cấp KEY nhưng không cập nhật được trạng thái đơn",
          key: assignedKey.key_code,
        },
        { status: 500 }
      );
    }

    // =========================
    // THÀNH CÔNG
    // =========================

    return NextResponse.json({
      success: true,
      message: "Duyệt đơn và cấp KEY thành công",
      order_id: order.id,
      key: assignedKey.key_code,
      expires_at: assignedKey.expires_at,
    });
  } catch (error) {
    console.error("APPROVE ORDER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Lỗi server",
      },
      { status: 500 }
    );
  }
}
