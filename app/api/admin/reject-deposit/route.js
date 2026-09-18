import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const depositId = Number(body.depositId);

    if (!depositId) {
      return NextResponse.json(
        {
          success: false,
          message: "Thiếu mã yêu cầu.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("deposit_requests")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", depositId)
      .eq("status", "pending")
      .select()
      .maybeSingle();

    if (error) {
      console.error("REJECT DEPOSIT ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Không thể từ chối yêu cầu.",
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          message: "Yêu cầu không tồn tại hoặc đã được xử lý.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Đã đánh dấu nạp tiền thất bại.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Lỗi server.",
      },
      { status: 500 }
    );
  }
}
