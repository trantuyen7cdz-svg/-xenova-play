import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();

    const amount = Number(body.amount);

    if (!Number.isInteger(amount) || amount < 10000) {
      return NextResponse.json(
        {
          success: false,
          message: "Số tiền nạp tối thiểu là 10.000đ.",
        },
        { status: 400 }
      );
    }

    if (amount > 100000000) {
      return NextResponse.json(
        {
          success: false,
          message: "Số tiền nạp quá lớn.",
        },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập.",
        },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          message: "Phiên đăng nhập không hợp lệ.",
        },
        { status: 401 }
      );
    }

    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!wallet) {
      await supabaseAdmin.from("wallets").insert({
        user_id: user.id,
        balance: 0,
      });
    }

    const { data: deposit, error } = await supabaseAdmin
      .from("deposit_requests")
      .insert({
        user_id: user.id,
        amount,
        status: "pending",
        transfer_content: "XENOVA",
      })
      .select()
      .single();

    if (error) {
      console.error("CREATE DEPOSIT ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Không thể tạo yêu cầu nạp tiền.",
        },
        { status: 500 }
      );
    }

    const transferContent = `XENOVA ${deposit.id}`;

    const { error: updateError } = await supabaseAdmin
      .from("deposit_requests")
      .update({
        transfer_content: transferContent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deposit.id);

    if (updateError) {
      console.error("UPDATE DEPOSIT CONTENT ERROR:", updateError);
    }

    return NextResponse.json({
      success: true,
      depositId: deposit.id,
      amount,
      transferContent,
    });
  } catch (error) {
    console.error("DEPOSIT CREATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Lỗi server.",
      },
      { status: 500 }
    );
  }
}
