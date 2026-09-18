import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
export async function POST(request) {
  try {
    // =========================
    // ĐỌC REQUEST
    // =========================
    const body = await request.json();
    const amount = Number(body.amount);
    // =========================
    // KIỂM TRA SỐ TIỀN
    // =========================
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
    // =========================
    // KIỂM TRA ĐĂNG NHẬP
    // =========================
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
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          message: "Phiên đăng nhập không hợp lệ.",
        },
        { status: 401 }
      );
    }
    const token = authHeader
      .replace("Bearer ", "")
      .trim();
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Phiên đăng nhập không hợp lệ.",
        },
        { status: 401 }
      );
    }
    // =========================
    // XÁC THỰC USER
    // =========================
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
    // =========================
    // KIỂM TRA WALLET
    // =========================
    let { data: wallet, error: walletError } =
      await supabaseAdmin
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
          error: walletError.message,
        },
        { status: 500 }
      );
    }
    // =========================
    // NẾU CHƯA CÓ WALLET → TẠO
    // =========================
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
        // Có thể request khác vừa tạo wallet.
        const {
          data: walletAfter,
          error: walletAfterError,
        } = await supabaseAdmin
          .from("wallets")
          .select("user_id, balance")
          .eq("user_id", user.id)
          .maybeSingle();
        if (walletAfterError || !walletAfter) {
          return NextResponse.json(
            {
              success: false,
              message: "Không thể tạo ví tài khoản.",
              error: createWalletError.message,
            },
            { status: 500 }
          );
        }
        wallet = walletAfter;
      } else {
        wallet = newWallet;
      }
    }
    // =========================
    // TẠO ĐƠN NẠP TIỀN
    // KHÔNG CÓ THỜI HẠN
    // =========================
    const {
      data: deposit,
      error: depositError,
    } = await supabaseAdmin
      .from("deposit_requests")
      .insert({
        user_id: user.id,
        amount: amount,
        status: "pending",
        transfer_content: "XENOVA",
      })
      .select(
        "id, user_id, amount, status, transfer_content, created_at, updated_at"
      )
      .single();
    if (depositError) {
      console.error(
        "CREATE DEPOSIT ERROR:",
        depositError
      );
      return NextResponse.json(
        {
          success: false,
          message: "Không thể tạo yêu cầu nạp tiền.",
          error: depositError.message,
        },
        { status: 500 }
      );
    }
    // =========================
    // TẠO NỘI DUNG CHUYỂN KHOẢN
    // =========================
    const transferContent = `XENOVA ${deposit.id}`;
    const {
      error: updateError,
    } = await supabaseAdmin
      .from("deposit_requests")
      .update({
        transfer_content: transferContent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deposit.id)
      .eq("status", "pending");
    if (updateError) {
      console.error(
        "UPDATE DEPOSIT CONTENT ERROR:",
        updateError
      );
      // Xóa đơn nếu không thể cập nhật nội dung.
      await supabaseAdmin
        .from("deposit_requests")
        .delete()
        .eq("id", deposit.id);
      return NextResponse.json(
        {
          success: false,
          message: "Không thể hoàn tất yêu cầu nạp tiền.",
          error: updateError.message,
        },
        { status: 500 }
      );
    }
    // =========================
    // TRẢ KẾT QUẢ
    // =========================
    return NextResponse.json({
      success: true,
      depositId: deposit.id,
      amount: deposit.amount,
      transferContent,
    });
  } catch (error) {
    console.error("DEPOSIT CREATE ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi server.",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
