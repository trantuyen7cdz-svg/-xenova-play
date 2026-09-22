import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/*
|--------------------------------------------------------------------------
| TOKEN
|--------------------------------------------------------------------------
*/

function getWebhookToken(request) {
  return (
    request.headers.get("secure-token") ||
    request.headers.get("x-webhook-token") ||
    ""
  ).trim();
}


/*
|--------------------------------------------------------------------------
| TEXT
|--------------------------------------------------------------------------
*/

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}


/*
|--------------------------------------------------------------------------
| PARSE XENOVA ORDER
|--------------------------------------------------------------------------
|
| Ví dụ:
|
| XENOVA 48
| ABC123 XENOVA 48
| CSRZ270TZE3 XENOVA 48
|
*/

function parseXenovaOrder(description) {
  const text = normalizeText(description);

  const match = text.match(
    /XENOVA\s+(\d+)\s*$/i
  );

  if (!match) {
    return null;
  }

  const id = Number(match[1]);

  if (
    !Number.isSafeInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}


/*
|--------------------------------------------------------------------------
| PAYMENT STATUS
|--------------------------------------------------------------------------
*/

function isSuccessfulPayment(payment) {
  if (
    payment?.code !== undefined &&
    String(payment.code) !== "00"
  ) {
    return false;
  }

  return true;
}


/*
|--------------------------------------------------------------------------
| SHOP MỚI
|--------------------------------------------------------------------------
*/

async function findWebsiteByToken(token) {
  if (!token) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("websites")
    .select(
      "id, name, status, settings"
    )
    .eq(
      "settings->>vietqr_webhook_token",
      token
    )
    .maybeSingle();

  if (error) {
    console.error(
      "[VIETQR WEBHOOK] WEBSITE LOOKUP ERROR:",
      error
    );

    throw new Error(
      "Không thể xác định website"
    );
  }

  return data || null;
}


/*
|--------------------------------------------------------------------------
| PROCESS LEGACY XENOVA
|--------------------------------------------------------------------------
|
| QUAN TRỌNG:
| Không thay đổi logic cũ.
|
| website_id = NULL
| → function cũ
| → wallet cũ
| → tự động cộng tiền
|
*/

async function processLegacyPayment(payment) {
  const description = normalizeText(
    payment?.description
  );

  if (!description) {
    return {
      ok: true,
      status: "ignored",
      reason: "invalid_description",
    };
  }

  const depositId =
    parseXenovaOrder(description);

  if (!depositId) {
    return {
      ok: true,
      status: "ignored",
      reason: "invalid_description",
      description,
    };
  }

  const amount = Number(payment?.amount);

  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0
  ) {
    return {
      ok: true,
      status: "ignored",
      reason: "invalid_amount",
      deposit_id: depositId,
    };
  }

  if (!isSuccessfulPayment(payment)) {
    return {
      ok: true,
      status: "ignored",
      reason: "payment_not_success",
      deposit_id: depositId,
      code: String(payment.code),
    };
  }

  const reference =
    normalizeText(payment?.reference) || null;

  const { data, error } =
    await supabaseAdmin.rpc(
      "process_vietqr_deposit",
      {
        p_deposit_id: depositId,
        p_amount: amount,
        p_reference: reference,
        p_description: description,
      }
    );

  if (error) {
    console.error(
      "[VIETQR WEBHOOK] LEGACY RPC ERROR:",
      error
    );

    throw new Error(
      "Không thể xử lý giao dịch cũ"
    );
  }

  console.log(
    "[VIETQR WEBHOOK] LEGACY RESULT:",
    JSON.stringify(data)
  );

  return data;
}


/*
|--------------------------------------------------------------------------
| PROCESS SHOP MỚI
|--------------------------------------------------------------------------
*/

async function processWebsitePayment(
  payment,
  website
) {
  const description = normalizeText(
    payment?.description
  );

  if (!description) {
    return {
      ok: true,
      status: "ignored",
      reason: "invalid_description",
    };
  }

  const depositId =
    parseXenovaOrder(description);

  if (!depositId) {
    return {
      ok: true,
      status: "ignored",
      reason: "invalid_description",
      description,
    };
  }

  const amount = Number(payment?.amount);

  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0
  ) {
    return {
      ok: true,
      status: "ignored",
      reason: "invalid_amount",
      deposit_id: depositId,
      website_id: website.id,
    };
  }

  if (!isSuccessfulPayment(payment)) {
    return {
      ok: true,
      status: "ignored",
      reason: "payment_not_success",
      deposit_id: depositId,
      website_id: website.id,
      code: String(payment.code),
    };
  }

  const reference =
    normalizeText(payment?.reference) || null;

  /*
  |--------------------------------------------------------------------------
  | KIỂM TRA ĐƠN THUỘC ĐÚNG SHOP
  |--------------------------------------------------------------------------
  */

  const { data: deposit, error: depositError } =
    await supabaseAdmin
      .from("deposit_requests")
      .select(
        "id, website_id, user_id, amount, status, transfer_content"
      )
      .eq("id", depositId)
      .maybeSingle();

  if (depositError) {
    console.error(
      "[VIETQR WEBHOOK] DEPOSIT LOOKUP ERROR:",
      depositError
    );

    throw new Error(
      "Không thể kiểm tra đơn nạp"
    );
  }

  if (!deposit) {
    return {
      ok: true,
      status: "ignored",
      reason: "deposit_not_found",
      deposit_id: depositId,
      website_id: website.id,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | KHÔNG CHO TOKEN SHOP NÀY XỬ LÝ ĐƠN SHOP KHÁC
  |--------------------------------------------------------------------------
  */

  if (
    !deposit.website_id ||
    deposit.website_id !== website.id
  ) {
    console.warn(
      "[VIETQR WEBHOOK] WEBSITE MISMATCH",
      {
        deposit_id: depositId,
        deposit_website_id:
          deposit.website_id,
        webhook_website_id:
          website.id,
      }
    );

    return {
      ok: false,
      status: "website_mismatch",
      deposit_id: depositId,
      website_id: website.id,
    };
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
  | MANUAL
  |--------------------------------------------------------------------------
  |
  | Không cộng tiền.
  | Đơn vẫn pending để admin duyệt.
  |
  */

  if (paymentMode === "manual") {
    console.log(
      "[VIETQR WEBHOOK] MANUAL PAYMENT:",
      {
        website_id: website.id,
        deposit_id: depositId,
        amount,
        reference,
      }
    );

    return {
      ok: true,
      status: "pending_manual",
      deposit_id: depositId,
      website_id: website.id,
      amount,
      reference,
      payment_mode: "manual",
    };
  }

  /*
  |--------------------------------------------------------------------------
  | AUTO
  |--------------------------------------------------------------------------
  */

  const {
    data,
    error,
  } = await supabaseAdmin.rpc(
    "process_vietqr_deposit_for_website",
    {
      p_deposit_id: depositId,
      p_amount: amount,
      p_reference: reference,
      p_description: description,
      p_website_id: website.id,
    }
  );

  if (error) {
    console.error(
      "[VIETQR WEBHOOK] WEBSITE RPC ERROR:",
      error
    );

    throw new Error(
      "Không thể xử lý giao dịch shop"
    );
  }

  console.log(
    "[VIETQR WEBHOOK] WEBSITE RESULT:",
    JSON.stringify(data)
  );

  return data;
}


/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
*/

export async function POST(request) {
  try {
    /*
    |--------------------------------------------------------------------------
    | LẤY TOKEN
    |--------------------------------------------------------------------------
    */

    const receivedToken =
      getWebhookToken(request);

    if (!receivedToken) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | TOKEN GLOBAL CŨ
    |--------------------------------------------------------------------------
    |
    | Nếu đúng token cũ:
    | → xử lý XENOVA cũ
    | → không đụng website mới
    |
    */

    const legacyToken =
      process.env.VIETQR_WEBHOOK_TOKEN || "";

    const isLegacyToken =
      legacyToken &&
      receivedToken === legacyToken;


    /*
    |--------------------------------------------------------------------------
    | BODY
    |--------------------------------------------------------------------------
    */

    const body = await request.json();

    let payments = body?.data;

    if (!payments) {
      return NextResponse.json({
        ok: true,
        status: "ignored",
        reason: "no_data",
      });
    }

    if (!Array.isArray(payments)) {
      payments = [payments];
    }


    /*
    |--------------------------------------------------------------------------
    | LEGACY
    |--------------------------------------------------------------------------
    */

    if (isLegacyToken) {
      const results = [];

      for (const payment of payments) {
        try {
          const result =
            await processLegacyPayment(
              payment
            );

          results.push(result);
        } catch (error) {
          console.error(
            "[VIETQR WEBHOOK] LEGACY PAYMENT ERROR:",
            error
          );

          throw error;
        }
      }

      return NextResponse.json({
        ok: true,
        mode: "legacy",
        results,
      });
    }


    /*
    |--------------------------------------------------------------------------
    | SHOP TOKEN
    |--------------------------------------------------------------------------
    */

    const website =
      await findWebsiteByToken(
        receivedToken
      );

    if (!website) {
      console.warn(
        "[VIETQR WEBHOOK] INVALID SHOP TOKEN"
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | SHOP PHẢI ACTIVE
    |--------------------------------------------------------------------------
    */

    if (
      String(website.status || "")
        .toLowerCase() !== "active"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Website inactive",
        },
        {
          status: 403,
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | XỬ LÝ TỪNG PAYMENT
    |--------------------------------------------------------------------------
    */

    const results = [];

    for (const payment of payments) {
      try {
        const result =
          await processWebsitePayment(
            payment,
            website
          );

        results.push(result);
      } catch (error) {
        console.error(
          "[VIETQR WEBHOOK] SHOP PAYMENT ERROR:",
          error
        );

        throw error;
      }
    }


    return NextResponse.json({
      ok: true,
      mode: "website",
      website_id: website.id,
      results,
    });

  } catch (error) {
    console.error(
      "[VIETQR WEBHOOK] FATAL ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Webhook processing failed",
      },
      {
        status: 500,
      }
    );
  }
}
