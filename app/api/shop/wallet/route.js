import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUser(request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7).trim();

  if (!token) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

export async function GET(request) {
  try {
    const user = await getUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập.",
        },
        { status: 401 }
      );
    }

    // CHỈ lấy ví XENOVA cũ.
    // website_id = NULL
    const { data: wallet, error } =
      await supabaseAdmin
        .from("wallets")
        .select(
          "id, user_id, balance, website_id, created_at, updated_at"
        )
        .eq("user_id", user.id)
        .is("website_id", null)
        .maybeSingle();

    if (error) {
      console.error(
        "OLD SHOP WALLET ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message: "Không thể đọc số dư ví.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,

      wallet:
        wallet || {
          id: null,
          user_id: user.id,
          balance: 0,
          website_id: null,
        },
    });
  } catch (error) {
    console.error(
      "OLD SHOP WALLET SERVER ERROR:",
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
