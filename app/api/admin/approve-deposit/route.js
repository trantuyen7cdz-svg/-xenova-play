import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();

    const depositId = body.depositId;

    if (!depositId) {
      return NextResponse.json(
        {
          success: false,
          message: "Thiếu depositId.",
        },
        { status: 400 }
      );
    }

    // =========================
    // LẤY TOKEN ADMIN
    // =========================

    const authHeader =
      request.headers.get("authorization");

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập.",
        },
        { status: 401 }
      );
    }

    const token = authHeader
      .substring(7)
      .trim();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Phiên đăng nhập không hợp lệ.",
        },
        { status: 401 }
      );
    }

    // =========================
    // XÁC THỰC USER
    // =========================

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        token
      );

    if (userError || !user) {
      console.error(
        "ADMIN USER ERROR:",
        userError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Phiên đăng nhập không hợp lệ.",
        },
        { status: 401 }
      );
    }

    // =========================
    // KIỂM TRA ROLE ADMIN
    // =========================

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "PROFILE ERROR:",
        profileError
      );

      return NextResponse.json(
        {
          success: false,
          message: "Không thể kiểm tra quyền Admin.",
        },
        { status: 500 }
      );
    }

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn không có quyền Admin.",
        },
        { status: 403 }
      );
    }

    // =========================
    // DUYỆT DEPOSIT
    // =========================

    const {
      data,
      error,
    } = await supabaseAdmin.rpc(
      "approve_deposit",
      {
        p_deposit_id: depositId,
        p_admin_id: user.id,
      }
    );

    if (error) {
      console.error(
        "APPROVE DEPOSIT RPC ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            error.message ||
            "Không thể duyệt nạp tiền.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Đã duyệt nạp tiền và cộng tiền vào ví.",
      data,
    });
  } catch (error) {
    console.error(
      "APPROVE DEPOSIT ERROR:",
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
