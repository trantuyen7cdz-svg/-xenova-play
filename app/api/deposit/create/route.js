import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =====================================================
// TẠO MÃ ĐƠN
// =====================================================
// Mã đơn cuối cùng sẽ dựa trên ID của deposit_requests.
// ID là khóa duy nhất của từng đơn nên không thể trùng.
//
// Ví dụ:
// XENOVA 125
// XENOVA 126
// XENOVA 127
// =====================================================

function makeTransferContent(depositId) {
  return `XENOVA ${depositId}`;
}

export async function POST(request) {
  try {
    // =================================================
    // ĐỌC BODY
    // =================================================

    const body = await request.json();
    const amount = Number(body.amount);

    // =================================================
    // KIỂM TRA SỐ TIỀN
    // =================================================

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

    // =================================================
    // KIỂM TRA ĐĂNG NHẬP
    // =================================================

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

    // =================================================
    // KIỂM TRA / TẠO VÍ
    // =================================================

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
      console.error("CHECK WALLET ERROR:", walletCheckError);
    } else {
      wallet = existingWallet;
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

      if (!createWalletError && newWallet) {
        wallet = newWallet;
      } else {
        console.error(
          "CREATE WALLET ERROR:",
          createWalletError
        );

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

    // =================================================
    // TẠO ĐƠN NẠP
    // =================================================
    //
    // Bước 1:
    // Tạo deposit trước để lấy ID duy nhất.
    //
    // Bước 2:
    // Dùng ID đó tạo nội dung:
    //
    // XENOVA <ID>
    //
    // =================================================

    const {
      data: deposit,
      error: depositError,
    } = await supabaseAdmin
      .from("deposit_requests")
      .insert({
        user_id: user.id,
        amount,
        status: "pending",

        // Giá trị tạm thời.
        // Ngay sau khi có ID sẽ được đổi thành
        // XENOVA <ID>.
        transfer_content: "XENOVA",
      })
      .select(
        "id, user_id, amount, status, transfer_content, created_at, updated_at"
      )
      .single();

    if (depositError || !deposit) {
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

    // =================================================
    // TẠO NỘI DUNG CHUYỂN KHOẢN DUY NHẤT
    // =================================================

    const transferContent = makeTransferContent(
      deposit.id
    );

    const {
      data: updatedDeposit,
      error: updateDepositError,
    } = await supabaseAdmin
      .from("deposit_requests")
      .update({
        transfer_content: transferContent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deposit.id)
      .select(
        "id, user_id, amount, status, transfer_content, created_at, updated_at"
      )
      .single();

    if (updateDepositError || !updatedDeposit) {
      console.error(
        "UPDATE TRANSFER CONTENT ERROR:",
        updateDepositError
      );

      // Xóa đơn lỗi để không để lại đơn XENOVA chưa hoàn chỉnh.
      await supabaseAdmin
        .from("deposit_requests")
        .delete()
        .eq("id", deposit.id)
        .eq("status", "pending");

      return NextResponse.json(
        {
          success: false,
          message: "Không thể tạo mã đơn nạp tiền.",
        },
        { status: 500 }
      );
    }

    // =================================================
    // TRẢ KẾT QUẢ
    // =================================================

    return NextResponse.json({
      success: true,

      depositId: updatedDeposit.id,

      amount: Number(updatedDeposit.amount),

      transferContent:
        updatedDeposit.transfer_content,

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
