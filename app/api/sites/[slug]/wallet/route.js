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

async function getWebsite(slug) {
  const { data, error } = await supabaseAdmin
    .from("websites")
    .select(
      "id, name, slug, status, bank_name, bank_account_number, bank_account_name, payment_qr_url"
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function GET(request, { params }) {
  try {
    const { slug } = await params;

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

    const website = await getWebsite(slug);

    if (!website) {
      return NextResponse.json(
        {
          success: false,
          message: "Website không tồn tại hoặc đang tắt.",
        },
        { status: 404 }
      );
    }

    // Tìm ví đúng website + đúng user
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select(
        "id, user_id, balance, website_id, created_at, updated_at"
      )
      .eq("website_id", website.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletError) {
      console.error("WEBSITE WALLET GET ERROR:", walletError);

      return NextResponse.json(
        {
          success: false,
          message: "Không thể lấy ví.",
        },
        { status: 500 }
      );
    }

    // Đã có ví
    if (wallet) {
      return NextResponse.json({
        success: true,
        wallet,
        website: {
          id: website.id,
          name: website.name,
          slug: website.slug,
          bank_name: website.bank_name,
          bank_account_number: website.bank_account_number,
          bank_account_name: website.bank_account_name,
          payment_qr_url: website.payment_qr_url,
        },
      });
    }

    // Chưa có ví → tạo ví riêng cho website
    const { data: newWallet, error: createError } =
      await supabaseAdmin.rpc("get_or_create_website_wallet", {
        p_website_id: website.id,
        p_user_id: user.id,
      });

    if (createError) {
      console.error("WEBSITE WALLET CREATE ERROR:", createError);

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
      website: {
        id: website.id,
        name: website.name,
        slug: website.slug,
        bank_name: website.bank_name,
        bank_account_number: website.bank_account_number,
        bank_account_name: website.bank_account_name,
        payment_qr_url: website.payment_qr_url,
      },
    });
  } catch (error) {
    console.error("WEBSITE WALLET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Lỗi server.",
      },
      { status: 500 }
    );
  }
}
