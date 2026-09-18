import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    // Bảo vệ Cron bằng CRON_SECRET nếu bạn đã cấu hình
    const authHeader = request.headers.get("authorization");

    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const now = new Date().toISOString();

    // Tìm và hủy tất cả đơn:
    // pending + đã quá hạn
    const { data, error } = await supabaseAdmin
      .from("deposit_requests")
      .update({
        status: "failed",
        updated_at: now,
      })
      .eq("status", "pending")
      .not("expires_at", "is", null)
      .lte("expires_at", now)
      .select("id");

    if (error) {
      console.error("EXPIRE DEPOSITS ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Không thể hủy đơn hết hạn.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      expiredCount: data?.length || 0,
      expiredIds: data?.map((item) => item.id) || [],
    });
  } catch (error) {
    console.error("CRON EXPIRE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Lỗi server.",
      },
      { status: 500 }
    );
  }
}
