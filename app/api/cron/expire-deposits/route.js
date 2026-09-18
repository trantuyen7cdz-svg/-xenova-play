import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    // =========================
    // KIỂM TRA CRON SECRET
    // =========================
    const authHeader =
      request.headers.get("authorization");

    if (
      process.env.CRON_SECRET &&
      authHeader !==
        `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // =========================
    // THỜI GIAN HIỆN TẠI
    // =========================
    const now = new Date().toISOString();

    // =========================
    // TỰ HỦY ĐƠN QUÁ HẠN
    // =========================
    const {
      data: expiredDeposits,
      error,
    } = await supabaseAdmin
      .from("deposit_requests")
      .update({
        status: "failed",
        updated_at: now,
      })
      .eq("status", "pending")
      .not("expires_at", "is", null)
      .lte("expires_at", now)
      .select(
        "id, user_id, amount, expires_at"
      );

    if (error) {
      console.error(
        "EXPIRE DEPOSITS ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể hủy đơn hết hạn.",
        },
        { status: 500 }
      );
    }

    // =========================
    // KẾT QUẢ
    // =========================
    return NextResponse.json({
      success: true,
      expiredCount:
        expiredDeposits?.length || 0,
      expiredIds:
        expiredDeposits?.map(
          (item) => item.id
        ) || [],
      checkedAt: now,
    });
  } catch (error) {
    console.error(
      "CRON EXPIRE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Lỗi server.",
      },
      { status: 500 }
    );
  }
}
