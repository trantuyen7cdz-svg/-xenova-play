import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Tạo mã chuyển khoản ngẫu nhiên
function generateTransferContent() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "XN";

  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }

  return result;
}

export async function POST(request) {
  try {
    const body = await request.json();

    const amount = Number(body.amount);

    // Kiểm tra số tiền
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

    // ==============================
    // KIỂM TRA ĐĂNG NHẬP
    // ==============================

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

    // ==============================
    // KIỂM TRA / TẠO VÍ
    // ==============================

    const {
      data: wallet,
      error: walletError,
    } = await supabaseAdmin
      .from("wallets")
      .select("user_id, balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletError) {
      console.error("CHECK WALLET ERROR:", walletError);

      return NextResponse.json(
        {
          success: false,
          message: "Không thể kiểm tra ví tài khoản.",
        },
        { status: 500 }
      );
    }

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

      if (createWalletError) {
        console.error(
          "CREATE WALLET ERROR:",
          createWalletError
        );

        // Có thể một request khác vừa tạo ví
        const {
          data: existingWallet,
          error: existingWalletError,
        } = await supabaseAdmin
          .from("wallets")
          .select("user_id, balance")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingWalletError || !existingWallet) {
          return NextResponse.json(
            {
              success: false,
              message: "Không thể tạo ví tài khoản.",
            },
            { status: 500 }
          );
        }
      }
    }

    // ==============================
    // TẠO ĐƠN NẠP
    // ==============================

    let deposit = null;
    let transferContent = null;

    // Thử tối đa 10 lần để tạo mã không trùng
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

      if (!depositError && data) {
        deposit = data;
        transferContent = randomContent;
        break;
      }

      // Nếu lỗi do trùng mã thì thử mã khác
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

    // Không tạo được sau nhiều lần
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

    // ==============================
    // TRẢ KẾT QUẢ
    // ==============================

    return NextResponse.json({
      success: true,
      depositId: deposit.id,
      amount: deposit.amount,
      transferContent: transferContent,
      wallet: {
        user_id: user.id,
        balance: 0,
      },
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
