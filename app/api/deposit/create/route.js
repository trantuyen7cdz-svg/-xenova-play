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
      console.error(
        "GET USER ERROR:",
        userError
      );

      return NextResponse.json(
        {
          success: false,
          message: "Phiên đăng nhập không hợp lệ.",
        },
        { status: 401 }
      );
    }

    // =========================
    // ĐẢM BẢO USER CÓ WALLET
    // =========================
    const { data: wallet, error: walletError } =
      await supabaseAdmin
        .from("wallets")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (walletError) {
      console.error(
        "CHECK WALLET ERROR:",
        walletError
      );
    }

    if (!wallet) {
      const {
        error: createWalletError,
      } = await supabaseAdmin
        .from("wallets")
        .insert({
          user_id: user.id,
          balance: 0,
        });

      if (createWalletError) {
        // Có thể wallet vừa được tạo đồng thời
        // bởi trigger nên chỉ báo lỗi nếu thực sự
        // không phải lỗi duplicate.
        console.error(
          "CREATE WALLET ERROR:",
          createWalletError
        );

        const { data: walletAfter } =
          await supabaseAdmin
            .from("wallets")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (!walletAfter) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Không thể tạo ví tài khoản.",
            },
            { status: 500 }
          );
        }
      }
    }

    // =========================
    // HẠN ĐƠN: 30 PHÚT
    // =========================
    const expiresAt = new Date(
      Date.now() + 30 * 60 * 1000
    ).toISOString();

    // =========================
    // TẠO ĐƠN NẠP
    // =========================
    const {
      data: deposit,
      error: depositError,
    } = await supabaseAdmin
      .from("deposit_requests")
      .insert({
        user_id: user.id,
        amount,
        status: "pending",
        transfer_content: "XENOVA",
        expires_at: expiresAt,
      })
      .select(
        "id, user_id, amount, status, transfer_content, created_at, updated_at, expires_at"
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
          message:
            "Không thể tạo yêu cầu nạp tiền.",
        },
        { status: 500 }
      );
    }

    // =========================
    // NỘI DUNG CHUYỂN KHOẢN
    // =========================
    const transferContent =
      `XENOVA ${deposit.id}`;

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

      // Xóa đơn nếu không thể tạo
      // nội dung chuyển khoản chính xác.
      await supabaseAdmin
        .from("deposit_requests")
        .delete()
        .eq("id", deposit.id);

      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể hoàn tất yêu cầu nạp tiền.",
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
      expiresAt,
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
