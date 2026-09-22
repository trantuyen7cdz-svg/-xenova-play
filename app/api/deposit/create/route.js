import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PayOS } from "@payos/node";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://xenova-play.vercel.app";


/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function makeTransferContent(depositId) {
  return `XENOVA ${depositId}`;
}


function cleanString(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}


/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
*/

export async function POST(request) {
  try {
    const body = await request.json();

    const amount = Number(body.amount);

    /*
    |--------------------------------------------------------------------------
    | VALIDATE AMOUNT
    |--------------------------------------------------------------------------
    */

    if (
      !Number.isInteger(amount) ||
      amount < 10000
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Số tiền nạp tối thiểu là 10.000đ.",
        },
        {
          status: 400,
        }
      );
    }

    if (amount > 100000000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Số tiền nạp quá lớn.",
        },
        {
          status: 400,
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | AUTH
    |--------------------------------------------------------------------------
    */

    const authHeader =
      request.headers.get("authorization");

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập.",
        },
        {
          status: 401,
        }
      );
    }

    const token =
      authHeader.substring(7).trim();

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        token
      );

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Phiên đăng nhập không hợp lệ.",
        },
        {
          status: 401,
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | WEBSITE ID
    |--------------------------------------------------------------------------
    |
    | Có websiteId:
    |   → shop mới
    |
    | Không có websiteId:
    |   → XENOVA cũ
    |
    */

    const websiteId =
      cleanString(body.websiteId) ||
      null;


    /*
    |--------------------------------------------------------------------------
    | =========================================================
    | SHOP MỚI
    | =========================================================
    |--------------------------------------------------------------------------
    */

    if (websiteId) {

      /*
      |--------------------------------------------------------------------------
      | Kiểm tra website
      |--------------------------------------------------------------------------
      */

      const {
        data: website,
        error: websiteError,
      } = await supabaseAdmin
        .from("websites")
        .select(
          `
            id,
            name,
            status,
            bank_name,
            bank_account_number,
            bank_account_name,
            payment_qr_url,
            settings
          `
        )
        .eq("id", websiteId)
        .maybeSingle();

      if (websiteError) {
        console.error(
          "SHOP WEBSITE ERROR:",
          websiteError
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "Không thể kiểm tra website.",
          },
          {
            status: 500,
          }
        );
      }

      if (!website) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Website không tồn tại.",
          },
          {
            status: 404,
          }
        );
      }

      if (
        String(website.status || "")
          .toLowerCase() !== "active"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Website hiện không hoạt động.",
          },
          {
            status: 403,
          }
        );
      }


      /*
      |--------------------------------------------------------------------------
      | Tạo wallet riêng cho shop
      |--------------------------------------------------------------------------
      */

      let wallet = null;

      const {
        data: existingWallet,
        error: walletLookupError,
      } = await supabaseAdmin
        .from("wallets")
        .select(
          "id, user_id, website_id, balance"
        )
        .eq("user_id", user.id)
        .eq("website_id", website.id)
        .maybeSingle();

      if (walletLookupError) {
        console.error(
          "SHOP WALLET LOOKUP ERROR:",
          walletLookupError
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "Không thể kiểm tra ví.",
          },
          {
            status: 500,
          }
        );
      }

      wallet = existingWallet;


      /*
      |--------------------------------------------------------------------------
      | Chưa có wallet → tạo
      |--------------------------------------------------------------------------
      */

      if (!wallet) {

        const {
          data: newWallet,
          error: createWalletError,
        } =
          await supabaseAdmin
            .from("wallets")
            .insert({
              user_id: user.id,
              website_id: website.id,
              balance: 0,
            })
            .select(
              "id, user_id, website_id, balance"
            )
            .single();

        if (
          !createWalletError &&
          newWallet
        ) {
          wallet = newWallet;
        } else {

          /*
          |--------------------------------------------------------------------------
          | Có thể request đồng thời → thử lấy lại
          |--------------------------------------------------------------------------
          */

          const {
            data: retryWallet,
          } =
            await supabaseAdmin
              .from("wallets")
              .select(
                "id, user_id, website_id, balance"
              )
              .eq(
                "user_id",
                user.id
              )
              .eq(
                "website_id",
                website.id
              )
              .maybeSingle();

          wallet =
            retryWallet || null;
        }
      }


      /*
      |--------------------------------------------------------------------------
      | Tạo deposit
      |--------------------------------------------------------------------------
      */

      const {
        data: deposit,
        error: depositError,
      } =
        await supabaseAdmin
          .from("deposit_requests")
          .insert({
            user_id: user.id,
            website_id: website.id,
            amount,
            status: "pending",
            transfer_content: "XENOVA",
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

      if (
        depositError ||
        !deposit
      ) {
        console.error(
          "SHOP CREATE DEPOSIT ERROR:",
          depositError
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "Không thể tạo yêu cầu nạp tiền.",
          },
          {
            status: 500,
          }
        );
      }


      /*
      |--------------------------------------------------------------------------
      | Tạo nội dung chuyển khoản
      |--------------------------------------------------------------------------
      */

      const transferContent =
        makeTransferContent(
          deposit.id
        );


      const {
        data: updatedDeposit,
        error: updateDepositError,
      } =
        await supabaseAdmin
          .from("deposit_requests")
          .update({
            transfer_content:
              transferContent,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            deposit.id
          )
          .eq(
            "status",
            "pending"
          )
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


      if (
        updateDepositError ||
        !updatedDeposit
      ) {

        await supabaseAdmin
          .from("deposit_requests")
          .delete()
          .eq(
            "id",
            deposit.id
          )
          .eq(
            "status",
            "pending"
          );

        return NextResponse.json(
          {
            success: false,
            message:
              "Không thể tạo mã đơn nạp tiền.",
          },
          {
            status: 500,
          }
        );
      }


      /*
      |--------------------------------------------------------------------------
      | PAYMENT MODE
      |--------------------------------------------------------------------------
      */

      const paymentMode =
        String(
          website?.settings?.payment_mode ||
          "auto"
        )
          .trim()
          .toLowerCase();


      /*
      |--------------------------------------------------------------------------
      | SHOP MỚI KHÔNG DÙNG PAYOS
      |--------------------------------------------------------------------------
      |
      | Frontend sẽ dùng thông tin ngân hàng
      | của chính website.
      |
      */

      return NextResponse.json({
        success: true,

        mode: "website",

        paymentMode:
          paymentMode === "manual"
            ? "manual"
            : "auto",

        depositId:
          updatedDeposit.id,

        orderCode:
          Number(updatedDeposit.id),

        websiteId:
          updatedDeposit.website_id,

        amount:
          Number(updatedDeposit.amount),

        transferContent:
          updatedDeposit.transfer_content,

        bank: {
          name:
            website.bank_name || null,

          accountNumber:
            website.bank_account_number ||
            null,

          accountName:
            website.bank_account_name ||
            null,

          qrUrl:
            website.payment_qr_url ||
            null,
        },

        wallet: wallet
          ? {
              id: wallet.id,

              user_id:
                wallet.user_id,

              website_id:
                wallet.website_id,

              balance:
                Number(
                  wallet.balance || 0
                ),
            }
          : null,
      });
    }


    /*
    |--------------------------------------------------------------------------
    | =========================================================
    | XENOVA CŨ
    | =========================================================
    |--------------------------------------------------------------------------
    |
    | PHẦN NÀY GIỮ NGUYÊN LOGIC CŨ.
    |
    | website_id = NULL
    |
    |--------------------------------------------------------------------------
    */


    let wallet = null;

    const {
      data: existingWallet,
    } =
      await supabaseAdmin
        .from("wallets")
        .select(
          "user_id, balance"
        )
        .eq(
          "user_id",
          user.id
        )
        .is(
          "website_id",
          null
        )
        .maybeSingle();

    wallet = existingWallet;


    /*
    |--------------------------------------------------------------------------
    | Tạo wallet XENOVA cũ
    |--------------------------------------------------------------------------
    */

    if (!wallet) {

      const {
        data: newWallet,
        error: createWalletError,
      } =
        await supabaseAdmin
          .from("wallets")
          .insert({
            user_id: user.id,
            balance: 0,
            website_id: null,
          })
          .select(
            "user_id, balance"
          )
          .single();

      if (
        !createWalletError &&
        newWallet
      ) {
        wallet = newWallet;
      } else {

        const {
          data: retryWallet,
        } =
          await supabaseAdmin
            .from("wallets")
            .select(
              "user_id, balance"
            )
            .eq(
              "user_id",
              user.id
            )
            .is(
              "website_id",
              null
            )
            .maybeSingle();

        wallet =
          retryWallet || null;
      }
    }


    /*
    |--------------------------------------------------------------------------
    | Tạo deposit XENOVA cũ
    |--------------------------------------------------------------------------
    */

    const {
      data: deposit,
      error: depositError,
    } =
      await supabaseAdmin
        .from("deposit_requests")
        .insert({
          user_id: user.id,
          website_id: null,
          amount,
          status: "pending",
          transfer_content: "XENOVA",
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

    if (
      depositError ||
      !deposit
    ) {
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
        {
          status: 500,
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | XENOVA <ID>
    |--------------------------------------------------------------------------
    */

    const transferContent =
      makeTransferContent(
        deposit.id
      );


    const {
      data: updatedDeposit,
      error: updateDepositError,
    } =
      await supabaseAdmin
        .from("deposit_requests")
        .update({
          transfer_content:
            transferContent,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          deposit.id
        )
        .eq(
          "status",
          "pending"
        )
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


    if (
      updateDepositError ||
      !updatedDeposit
    ) {

      await supabaseAdmin
        .from("deposit_requests")
        .delete()
        .eq(
          "id",
          deposit.id
        )
        .eq(
          "status",
          "pending"
        );

      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể tạo mã đơn nạp tiền.",
        },
        {
          status: 500,
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | PAYOS CŨ
    |--------------------------------------------------------------------------
    */

    if (
      !process.env.PAYOS_CLIENT_ID ||
      !process.env.PAYOS_API_KEY ||
      !process.env.PAYOS_CHECKSUM_KEY
    ) {

      console.error(
        "PAYOS ENV MISSING"
      );

      await supabaseAdmin
        .from("deposit_requests")
        .update({
          status: "failed",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          updatedDeposit.id
        )
        .eq(
          "status",
          "pending"
        );

      return NextResponse.json(
        {
          success: false,
          message:
            "PayOS chưa được cấu hình đầy đủ.",
        },
        {
          status: 500,
        }
      );
    }


    const payOS =
      new PayOS({
        clientId:
          process.env.PAYOS_CLIENT_ID,

        apiKey:
          process.env.PAYOS_API_KEY,

        checksumKey:
          process.env.PAYOS_CHECKSUM_KEY,
      });


    const paymentLink =
      await payOS.paymentRequests.create({
        orderCode:
          Number(updatedDeposit.id),

        amount:
          Number(updatedDeposit.amount),

        description:
          updatedDeposit.transfer_content,

        cancelUrl:
          `${SITE_URL}/deposit?payment=cancel&orderCode=${updatedDeposit.id}`,

        returnUrl:
          `${SITE_URL}/deposit?payment=success&orderCode=${updatedDeposit.id}`,

        items: [
          {
            name:
              "Nạp tiền XENOVA PLAY",

            quantity: 1,

            price:
              Number(
                updatedDeposit.amount
              ),
          },
        ],
      });


    /*
    |--------------------------------------------------------------------------
    | RESPONSE CŨ
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      success: true,

      mode: "legacy",

      depositId:
        updatedDeposit.id,

      orderCode:
        Number(
          updatedDeposit.id
        ),

      amount:
        Number(
          updatedDeposit.amount
        ),

      transferContent:
        updatedDeposit.transfer_content,

      checkoutUrl:
        paymentLink.checkoutUrl,

      qrCode:
        paymentLink.qrCode ||
        null,

      paymentLinkId:
        paymentLink.paymentLinkId ||
        paymentLink.id ||
        null,

      wallet: wallet
        ? {
            user_id:
              wallet.user_id,

            balance:
              Number(
                wallet.balance || 0
              ),
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
        message:
          error?.message ||
          "Lỗi server.",
      },
      {
        status: 500,
      }
    );
  }
}
