import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập.",
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7).trim();

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error("AUTH ERROR:", userError);

      return NextResponse.json(
        {
          success: false,
          message: "Phiên đăng nhập không hợp lệ.",
        },
        { status: 401 }
      );
    }

    // Kiểm tra tài khoản Admin
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, email, role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error("PROFILE ERROR:", profileError);

      return NextResponse.json(
        {
          success: false,
          message: "Không thể kiểm tra quyền admin.",
        },
        { status: 500 }
      );
    }

    if (!profile || profile.role !== "admin") {
      console.error("NOT ADMIN:", {
        authUserId: user.id,
        authEmail: user.email,
        profile,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Bạn không có quyền admin.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const depositId = Number(body.depositId);

    if (!Number.isInteger(depositId) || depositId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã yêu cầu nạp không hợp lệ.",
        },
        { status: 400 }
      );
    }

    // Duyệt tiền bằng RPC
    const { data, error } = await supabaseAdmin.rpc("approve_deposit", {
      p_deposit_id: depositId,
      p_admin_id: user.id,
    });

    if (error) {
      console.error("APPROVE DEPOSIT RPC ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          message: error.message || "Không thể duyệt nạp tiền.",
        },
        { status: 500 }
      );
    }

    if (!data || data.success !== true) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Duyệt nạp tiền thất bại.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: data.message || "Duyệt nạp tiền thành công.",
      depositId: data.deposit_id,
      userId: data.user_id,
      amount: data.amount,
      newBalance: data.new_balance,
    });
  } catch (error) {
    console.error("APPROVE DEPOSIT SERVER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Lỗi server.",
      },
      { status: 500 }
    );
  }
}
