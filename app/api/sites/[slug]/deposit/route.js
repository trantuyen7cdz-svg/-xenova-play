import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getWebsiteBySlug,
  getWebsiteSession,
} from "@/lib/websiteAuth";

export const dynamic = "force-dynamic";

function makeTransferContent(slug, depositId) {
  const prefix = String(slug || "SHOP")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);

  return `${prefix || "SHOP"} ${depositId}`;
}

async function getWebsitePaymentInfo(websiteId) {
  const { data, error } = await supabaseAdmin
    .from("websites")
    .select(
      `
        id,
        name,
        slug,
        status,
        bank_name,
        bank_account_number,
        bank_account_name,
        payment_qr_url,
        settings
      `
    )
    .eq("id", websiteId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error(
      "GET WEBSITE PAYMENT INFO ERROR:",
      error
    );

    return null;
  }

  return data || null;
}

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

    const website = await getWebsiteBySlug(slug);

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

    const session = await getWebsiteSession(website);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập.",
        },
        { status: 401 }
      );
    }

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

    const { data, error } = await supabaseAdmin
      .from("deposit_requests")
      .select(
        `
          id,
          user_id,
          website_id,
          amount,
          status,
          transfer_content,
          created_at,
          updated_at
        `
      )
      .eq("website_id", website.id)
      .eq("user_id", session.userId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "GET WEBSITE DEPOSIT HISTORY ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể tải lịch sử nạp tiền.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      requests: data || [],
    });
  } catch (error) {
    console.error(
      "WEBSITE DEPOSIT GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Lỗi server.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
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

    const website = await getWebsiteBySlug(slug);

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

    const session = await getWebsiteSession(website);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập.",
        },
        { status: 401 }
      );
    }

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

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "Dữ liệu gửi lên không hợp lệ.",
        },
        { status: 400 }
      );
    }

    const amount = Number(body?.amount);

    if (!Number.isInteger(amount)) {
      return NextResponse.json(
        {
          success: false,
          message: "Số tiền không hợp lệ.",
        },
        { status: 400 }
      );
    }

    if (amount < 10000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Số tiền nạp tối thiểu là 10.000đ.",
        },
        { status: 400 }
      );
    }

    if (amount > 100000000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Số tiền nạp tối đa là 100.000.000đ.",
        },
        { status: 400 }
      );
    }

    const paymentWebsite =
      await getWebsitePaymentInfo(website.id);

    if (!paymentWebsite) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể lấy thông tin thanh toán của website.",
        },
        { status: 500 }
      );
    }

    const {
      data: wallet,
      error: walletError,
    } = await supabaseAdmin
      .from("wallets")
      .select(
        "id, user_id, website_id, balance"
      )
      .eq("user_id", session.userId)
      .eq("website_id", website.id)
      .maybeSingle();

    if (walletError) {
      console.error(
        "WEBSITE WALLET LOOKUP ERROR:",
        walletError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể kiểm tra ví.",
        },
        { status: 500 }
      );
    }

    let currentWallet = wallet;

    if (!currentWallet) {
      const {
        data: createdWallet,
        error: createWalletError,
      } = await supabaseAdmin.rpc(
        "get_or_create_website_wallet",
        {
          p_website_id: website.id,
          p_user_id: session.userId,
        }
      );

      if (createWalletError) {
        console.error(
          "WEBSITE WALLET CREATE ERROR:",
          createWalletError
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "Không thể tạo ví website.",
          },
          { status: 500 }
        );
      }

      currentWallet = createdWallet;
    }

    const {
      data: deposit,
      error: depositError,
    } = await supabaseAdmin
      .from("deposit_requests")
      .insert({
        user_id: session.userId,
        website_id: website.id,
        amount,
        status: "pending",
        transfer_content: "PENDING",
      })
      .select(
        `
          id,
          user_id,
          website_id,
          amount,
          status,
          transfer_content,
          created_at,
          updated_at
        `
      )
      .single();

    if (depositError || !deposit) {
      console.error(
        "CREATE WEBSITE DEPOSIT ERROR:",
        depositError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể tạo yêu cầu nạp tiền.",
        },
        { status: 500 }
      );
    }

    const transferContent =
      makeTransferContent(
        paymentWebsite.slug,
        deposit.id
      );

    const {
      data: updatedDeposit,
      error: updateError,
    } = await supabaseAdmin
      .from("deposit_requests")
      .update({
        transfer_content: transferContent,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", deposit.id)
      .eq("website_id", website.id)
      .eq("user_id", session.userId)
      .eq("status", "pending")
      .select(
        `
          id,
          user_id,
          website_id,
          amount,
          status,
          transfer_content,
          created_at,
          updated_at
        `
      )
      .single();

    if (updateError || !updatedDeposit) {
      console.error(
        "UPDATE WEBSITE DEPOSIT ERROR:",
        updateError
      );

      await supabaseAdmin
        .from("deposit_requests")
        .delete()
        .eq("id", deposit.id)
        .eq("website_id", website.id)
        .eq("user_id", session.userId)
        .eq("status", "pending");

      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể tạo nội dung chuyển khoản.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        mode: "manual",
        depositId: updatedDeposit.id,
        websiteId:
          updatedDeposit.website_id,
        amount:
          Number(updatedDeposit.amount),
        transferContent:
          updatedDeposit.transfer_content,
        status: updatedDeposit.status,

        bank: {
          name:
            paymentWebsite.bank_name ||
            null,

          accountNumber:
            paymentWebsite.bank_account_number ||
            null,

          accountName:
            paymentWebsite.bank_account_name ||
            null,

          qrUrl:
            paymentWebsite.payment_qr_url ||
            null,
        },

        wallet: currentWallet || null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "WEBSITE DEPOSIT POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Lỗi server.",
      },
      { status: 500 }
    );
  }
}
