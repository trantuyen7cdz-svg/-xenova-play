import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const authHeader =
      request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập.",
        },
        { status: 401 }
      );
    }

    const token =
      authHeader.substring(7).trim();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Phiên đăng nhập không hợp lệ.",
        },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        token
      );

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          message: "Phiên đăng nhập không hợp lệ.",
        },
        { status: 401 }
      );
    }

    /*
    =========================================
    VÍ SHOP XENOVA CŨ
    =========================================

    website_id = NULL

    Không được lấy ví của website mới.
    */

    const {
      data: wallet,
      error: walletError,
    } =
      await supabaseAdmin
        .from("wallets")
        .select(
          `
          id,
          user_id,
          balance,
          website_id,
          created_at,
          updated_at
          `
        )
        .eq(
          "user_id",
          user.id
        )
        .is(
          "website_id",
          null
        )
        .maybeSingle();

    if (walletError) {
      console.error(
        "CURRENT WALLET ERROR:",
        walletError
      );

      return NextResponse.json(
        {
          success: false,
          message: "Không thể lấy số dư.",
          error: walletError.message,
        },
        { status: 500 }
      );
    }

    /*
    =========================================
    CHƯA CÓ VÍ CŨ
    =========================================
    */

    if (!wallet) {
      const {
        data: newWallet,
        error: createError,
      } =
        await supabaseAdmin
          .from("wallets")
          .insert({
            user_id: user.id,
            balance: 0,
            website_id: null,
          })
          .select(
            `
            id,
            user_id,
            balance,
            website_id,
            created_at,
            updated_at
            `
          )
          .single();

      if (createError) {
        console.error(
          "CREATE CURRENT WALLET ERROR:",
          createError
        );

        return NextResponse.json(
          {
            success: false,
            message: "Không thể tạo ví.",
            error: createError.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        wallet: newWallet,
      });
    }

    /*
    =========================================
    CÓ VÍ
    =========================================
    */

    return NextResponse.json({
      success: true,
      wallet,
    });
  } catch (error) {
    console.error(
      "CURRENT WALLET SERVER ERROR:",
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
