import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ========================================
// TẠO MÃ CHUYỂN KHOẢN NGẪU NHIÊN
// ========================================

function generateTransferContent() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "XN";

  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }

  return result;
}

// ========================================
// POST
// ========================================

export async function POST(request) {
  try {
    // ========================================
    // ĐỌC BODY
    // ========================================

    const body = await request.json();

    const amount = Number(body.amount);

    // ========================================
    // KIỂM TRA SỐ TIỀN
    // ========================================

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

    // ========================================
    // KIỂM TRA ĐĂNG NHẬP
    // ========================================

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
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error("GET USER ERROR:", userError);

      return NextResponse.json(
        {
          success: false,
          message: "Phiên đăng nhập không hợp lệ.",
        },
        { status: 401 }
      );
    }

    // ========================================
    // KIỂM TRA / TẠO VÍ
    //
    // Quan trọng:
    // Lỗi tạo ví KHÔNG làm hỏng việc tạo đơn.
    // ========================================

    let wallet = null;

    const {
      data: existingWallet,
      error: walletCheckError,
    } = await supabaseAdmin
      .from("wallets")
      .select("user_id, balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletCheckError) {
      console.error(
        "CHECK WALLET ERROR:",
        walletCheckError
      );
    } else {
      wallet = existingWallet;
    }

    // Nếu chưa có ví thì thử tạo
    if (!wallet) {
      const {
        data: newWallet,
        error: createWalletError,
      } = await supabaseAdmin
        .from("wallets")
        .insert({
          user_id: user.id,
          balance: 0,
        })
        .select("user_id, balance")
        .single();

      if (!createWalletError && newWallet) {
        wallet = newWallet;
      } else {
        console.error(
          "CREATE WALLET ERROR:",
          createWalletError
        );

        // Có thể ví vừa được tạo bởi request khác.
        // Kiểm tra lại một lần.
        const {
          data: retryWallet,
          error: retryWalletError,
        } = await supabaseAdmin
          .from("wallets")
          .select("user_id, balance")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!retryWalletError && retryWallet) {
          wallet = retryWallet;
        }
      }
    }

    // ========================================
    // TẠO ĐƠN NẠP
    // ========================================

    let deposit = null;
    let transferContent = null;

    for (let attempt = 0; attempt < 10; attempt++) {
      const randomContent = generateTransferContent();

      const {
        data,
        error: depositError,
      } = await supabaseAdmin
        .from("deposit_requests")
        .insert({
          user_id: user.id,
          amount,
          status: "pending",
          transfer_content: randomContent,
        })
        .select(
          "id, user_id, amount, status, transfer_content, created_at, updated_at"
        )
        .single();

      // Tạo thành công
      if (!depositError && data) {
        deposit = data;
        transferContent = data.transfer_content;
        break;
      }

      // Nếu mã bị trùng thì sinh mã khác
      if (
        depositError?.code === "23505" ||
        String(depositError?.message || "")
          .toLowerCase()
          .includes("duplicate")
      ) {
        continue;
      }

      console.error(
        "CREATE DEPOSIT ERROR:",
        depositError
      );

      return NextResponse.json(
        {
          success: false,
          message: "Không thể tạo yêu cầu nạp tiền.",
        },
        { status: 500 }
      );
    }

    // ========================================
    // KHÔNG TẠO ĐƯỢC ĐƠN
    // ========================================

    if (!deposit || !transferContent) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể tạo mã chuyển khoản. Vui lòng thử lại.",
        },
        { status: 500 }
      );
    }

    // ========================================
    // TRẢ KẾT QUẢ
    // ========================================

    return NextResponse.json({
      success: true,

      depositId: deposit.id,

      amount: deposit.amount,

      transferContent: deposit.transfer_content,

      wallet: wallet
        ? {
            user_id: wallet.user_id,
            balance: Number(wallet.balance || 0),
          }
        : null,
    });
  } catch (error) {
    console.error(
      "DEPOSIT CREATE ERROR:",
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
