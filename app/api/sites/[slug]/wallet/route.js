import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getWebsiteBySlug,
  getWebsiteSession,
} from "@/lib/websiteAuth";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message: "Thiếu slug website.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // LẤY WEBSITE
    // ==========================================

    const website =
      await getWebsiteBySlug(slug);

    if (!website) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Website không tồn tại hoặc đang tắt.",
        },
        { status: 404 }
      );
    }

    // ==========================================
    // LẤY WEBSITE SESSION
    // ==========================================

    const session =
      await getWebsiteSession(website);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập.",
        },
        { status: 401 }
      );
    }

    // ==========================================
    // USER PHẢI THUỘC ĐÚNG WEBSITE
    // ==========================================

    if (
      session.websiteId !== website.id ||
      session.userId !== session.user.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Phiên đăng nhập không hợp lệ.",
        },
        { status: 401 }
      );
    }

    // ==========================================
    // TÌM VÍ:
    // website_id + website_users.id
    // ==========================================

    const {
      data: wallet,
      error: walletError,
    } = await supabaseAdmin
      .from("wallets")
      .select(
        "id, user_id, balance, website_id, created_at, updated_at"
      )
      .eq("website_id", website.id)
      .eq("user_id", session.userId)
      .maybeSingle();

    if (walletError) {
      console.error(
        "WEBSITE WALLET GET ERROR:",
        walletError
      );

      return NextResponse.json(
        {
          success: false,
          message: "Không thể lấy ví.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // ĐÃ CÓ VÍ
    // ==========================================

    if (wallet) {
      return NextResponse.json({
        success: true,
        wallet,
        user: {
          id: session.user.id,
          username: session.user.username,
          email: session.user.email,
          role: session.user.role,
        },
        website: {
          id: website.id,
          name: website.name,
          slug: website.slug,
          bank_name:
            website.bank_name || null,
          bank_account_number:
            website.bank_account_number || null,
          bank_account_name:
            website.bank_account_name || null,
          payment_qr_url:
            website.payment_qr_url || null,
        },
      });
    }

    // ==========================================
    // CHƯA CÓ VÍ → TẠO VÍ RIÊNG WEBSITE
    // ==========================================

    const {
      data: newWallet,
      error: createError,
    } = await supabaseAdmin.rpc(
      "get_or_create_website_wallet",
      {
        p_website_id: website.id,
        p_user_id: session.userId,
      }
    );

    if (createError) {
      console.error(
        "WEBSITE WALLET CREATE ERROR:",
        createError
      );

      return NextResponse.json(
        {
          success: false,
          message: "Không thể tạo ví.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      wallet: newWallet,
      user: {
        id: session.user.id,
        username: session.user.username,
        email: session.user.email,
        role: session.user.role,
      },
      website: {
        id: website.id,
        name: website.name,
        slug: website.slug,
        bank_name:
          website.bank_name || null,
        bank_account_number:
          website.bank_account_number || null,
        bank_account_name:
          website.bank_account_name || null,
        payment_qr_url:
          website.payment_qr_url || null,
      },
    });
  } catch (error) {
    console.error(
      "WEBSITE WALLET ERROR:",
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
