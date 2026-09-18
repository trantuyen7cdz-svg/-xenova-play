import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const depositId = Number(body.depositId);

    if (!depositId) {
      return NextResponse.json(
        {
          success: false,
          message: "Thiếu mã yêu cầu nạp tiền.",
        },
        { status: 400 }
      );
    }

    // Lấy yêu cầu nạp
    const { data: deposit, error: depositError } =
      await supabaseAdmin
        .from("deposit_requests")
        .select("*")
        .eq("id", depositId)
        .maybeSingle();

    if (depositError) {
      console.error("GET DEPOSIT ERROR:", depositError);

      return NextResponse.json(
        {
          success: false,
          message: "Không lấy được yêu cầu nạp tiền.",
        },
        { status: 500 }
      );
    }

    if (!deposit) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy yêu cầu nạp tiền.",
        },
        { status: 404 }
      );
    }

    // Đã hoàn thành trước đó
    if (deposit.status === "completed") {
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        message: "Yêu cầu này đã được duyệt trước đó.",
      });
    }

    // Chỉ duyệt pending
    if (deposit.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          message: `Yêu cầu đang ở trạng thái "${deposit.status}".`,
        },
        { status: 400 }
      );
    }

    const amount = Number(deposit.amount);

    if (!amount || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Số tiền nạp không hợp lệ.",
        },
        { status: 400 }
      );
    }

    // Lấy ví
    const { data: wallet, error: walletError } =
      await supabaseAdmin
        .from("wallets")
        .select("*")
        .eq("user_id", deposit.user_id)
        .maybeSingle();

    if (walletError) {
      console.error("GET WALLET ERROR:", walletError);

      return NextResponse.json(
        {
          success: false,
          message: "Không lấy được ví của người dùng.",
        },
        { status: 500 }
      );
    }

    // Nếu chưa có ví thì tạo
    let currentBalance = 0;

    if (!wallet) {
      const { data: newWallet, error: createWalletError } =
        await supabaseAdmin
          .from("wallets")
          .insert({
            user_id: deposit.user_id,
            balance: 0,
          })
          .select()
          .single();

      if (createWalletError) {
        console.error(
          "CREATE WALLET ERROR:",
          createWalletError
        );

        return NextResponse.json(
          {
            success: false,
            message: "Không thể tạo ví.",
          },
          { status: 500 }
        );
      }

      currentBalance = Number(newWallet.balance || 0);
    } else {
      currentBalance = Number(wallet.balance || 0);
    }

    const newBalance = currentBalance + amount;

    // Cập nhật số dư
    const { data: updatedWallet, error: updateWalletError } =
      await supabaseAdmin
        .from("wallets")
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", deposit.user_id)
        .select()
        .maybeSingle();

    if (updateWalletError || !updatedWallet) {
      console.error(
        "UPDATE WALLET ERROR:",
        updateWalletError
      );

      return NextResponse.json(
        {
          success: false,
          message: "Không thể cộng số dư.",
        },
        { status: 500 }
      );
    }

    // Ghi lịch sử
    const { error: transactionError } =
      await supabaseAdmin
        .from("wallet_transactions")
        .insert({
          user_id: deposit.user_id,
          type: "deposit",
          amount,
          balance_before: currentBalance,
          balance_after: newBalance,
          status: "completed",
          description: `Nạp tiền #${deposit.id}`,
          reference_id: deposit.id,
        });

    if (transactionError) {
      console.error(
        "CREATE TRANSACTION ERROR:",
        transactionError
      );

      // Hoàn số dư nếu ghi lịch sử thất bại
      await supabaseAdmin
        .from("wallets")
        .update({
          balance: currentBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", deposit.user_id);

      return NextResponse.json(
        {
          success: false,
          message: "Không thể ghi lịch sử giao dịch.",
        },
        { status: 500 }
      );
    }

    // Đánh dấu nạp tiền hoàn thành
    const { error: updateDepositError } =
      await supabaseAdmin
        .from("deposit_requests")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", deposit.id)
        .eq("status", "pending");

    if (updateDepositError) {
      console.error(
        "UPDATE DEPOSIT ERROR:",
        updateDepositError
      );

      return NextResponse.json(
        {
          success: false,
          message: "Đã cộng tiền nhưng không cập nhật được trạng thái.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Duyệt nạp tiền thành công.",
      depositId: deposit.id,
      amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
    });
  } catch (error) {
    console.error("APPROVE DEPOSIT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Lỗi server.",
      },
      { status: 500 }
    );
  }
}
