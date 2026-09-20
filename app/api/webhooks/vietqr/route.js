import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export async function POST(request) {
  try {
    // =================================================
    // BẢO MẬT WEBHOOK
    // =================================================

    const webhookToken =
      process.env.VIETQR_WEBHOOK_TOKEN;

    const receivedToken =
      request.headers.get("secure-token") ||
      request.headers.get("x-webhook-token") ||
      "";

    if (
      !webhookToken ||
      receivedToken !== webhookToken
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // =================================================
    // ĐỌC WEBHOOK
    // =================================================

    const body = await request.json();

    const data = Array.isArray(body?.data)
      ? body.data
      : [];

    if (data.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No transaction.",
      });
    }

    // =================================================
    // XỬ LÝ TỪNG GIAO DỊCH
    // =================================================

    for (const transaction of data) {
      const amount = Number(
        transaction?.amount || 0
      );

      const description =
        normalizeText(
          transaction?.description
        );

      const reference = String(
        transaction?.reference || ""
      ).trim();

      if (!amount || !description) {
        continue;
      }

      // Chỉ nhận nội dung XENOVA <ID>
      if (!description.startsWith("XENOVA ")) {
        continue;
      }

      // =================================================
      // LẤY MÃ ĐƠN
      // =================================================

      const transferContent =
        description;

      // =================================================
      // TÌM ĐƠN
      // =================================================

      const {
        data: deposit,
        error: depositError,
      } = await supabaseAdmin
        .from("deposit_requests")
        .select(
          "id, user_id, amount, status, transfer_content"
        )
        .eq(
          "transfer_content",
          transferContent
        )
        .maybeSingle();

      if (depositError) {
        console.error(
          "WEBHOOK DEPOSIT ERROR:",
          depositError
        );
        continue;
      }

      if (!deposit) {
        continue;
      }

      // =================================================
      // ĐƠN ĐÃ XỬ LÝ
      // =================================================

      if (deposit.status !== "pending") {
        continue;
      }

      // =================================================
      // KIỂM TRA ĐÚNG SỐ TIỀN
      // =================================================

      if (
        Number(deposit.amount) !==
        amount
      ) {
        console.warn(
          "AMOUNT MISMATCH:",
          {
            depositId: deposit.id,
            expected: deposit.amount,
            received: amount,
          }
        );

        continue;
      }

      // =================================================
      // LẤY VÍ
      // =================================================

      let wallet = null;

      const {
        data: existingWallet,
        error: walletError,
      } = await supabaseAdmin
        .from("wallets")
        .select(
          "id, user_id, balance"
        )
        .eq(
          "user_id",
          deposit.user_id
        )
        .maybeSingle();

      if (walletError) {
        console.error(
          "WALLET CHECK ERROR:",
          walletError
        );
        continue;
      }

      wallet = existingWallet;

      // =================================================
      // TẠO VÍ NẾU CHƯA CÓ
      // =================================================

      if (!wallet) {
        const {
          data: newWallet,
          error: createWalletError,
        } = await supabaseAdmin
          .from("wallets")
          .insert({
            user_id: deposit.user_id,
            balance: 0,
          })
          .select(
            "id, user_id, balance"
          )
          .single();

        if (createWalletError) {
          console.error(
            "CREATE WALLET ERROR:",
            createWalletError
          );
          continue;
        }

        wallet = newWallet;
      }

      // =================================================
      // ĐẢM BẢO ĐƠN VẪN ĐANG PENDING
      // =================================================

      const {
        data: claimedDeposit,
        error: claimError,
      } = await supabaseAdmin
        .from("deposit_requests")
        .update({
          status: "processing",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", deposit.id)
        .eq("status", "pending")
        .select(
          "id, user_id, amount, status"
        )
        .maybeSingle();

      if (claimError) {
        console.error(
          "CLAIM DEPOSIT ERROR:",
          claimError
        );
        continue;
      }

      // Request khác đã xử lý trước
      if (!claimedDeposit) {
        continue;
      }

      // =================================================
      // CỘNG TIỀN
      // =================================================

      const oldBalance =
        Number(wallet.balance || 0);

      const newBalance =
        oldBalance +
        Number(deposit.amount);

      const {
        error: updateWalletError,
      } = await supabaseAdmin
        .from("wallets")
        .update({
          balance: newBalance,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", wallet.id);

      // =================================================
      // NẾU CỘNG TIỀN LỖI
      // =================================================

      if (updateWalletError) {
        console.error(
          "UPDATE WALLET ERROR:",
          updateWalletError
        );

        await supabaseAdmin
          .from("deposit_requests")
          .update({
            status: "pending",
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", deposit.id)
          .eq("status", "processing");

        continue;
      }

      // =================================================
      // HOÀN TẤT ĐƠN
      // =================================================

      const {
        data: completedDeposit,
        error: completeError,
      } = await supabaseAdmin
        .from("deposit_requests")
        .update({
          status: "completed",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", deposit.id)
        .eq("status", "processing")
        .select(
          "id, user_id, amount, status, transfer_content"
        )
        .maybeSingle();

      // =================================================
      // NẾU HOÀN TẤT LỖI
      // =================================================

      if (completeError || !completedDeposit) {
        console.error(
          "COMPLETE DEPOSIT ERROR:",
          completeError
        );

        // Đưa lại pending để không mất đơn.
        await supabaseAdmin
          .from("deposit_requests")
          .update({
            status: "pending",
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", deposit.id)
          .eq("status", "processing");

        // Hoàn số dư.
        await supabaseAdmin
          .from("wallets")
          .update({
            balance: oldBalance,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", wallet.id);

        continue;
      }

      console.log(
        "AUTO DEPOSIT COMPLETED:",
        {
          depositId: completedDeposit.id,
          userId: completedDeposit.user_id,
          amount: completedDeposit.amount,
          reference,
        }
      );
    }

    // =================================================
    // TRẢ 2XX CHO VIETQR
    // =================================================

    return NextResponse.json({
      success: true,
      message: "Webhook processed.",
    });
  } catch (error) {
    console.error(
      "VIETQR WEBHOOK ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Webhook error.",
      },
      { status: 500 }
    );
  }
}
