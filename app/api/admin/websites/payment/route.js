import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";


async function getUser(request) {
  const authHeader =
    request.headers.get("authorization");

  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ")
  ) {
    return null;
  }

  const token =
    authHeader.substring(7).trim();

  const {
    data: { user },
    error,
  } =
    await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}


async function canManageWebsite(
  userId,
  websiteId
) {

  /*
  |--------------------------------------------------------------------------
  | GLOBAL ADMIN
  |--------------------------------------------------------------------------
  */

  const {
    data: profile,
  } =
    await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

  if (
    profile?.role === "admin"
  ) {
    return true;
  }


  /*
  |--------------------------------------------------------------------------
  | OWNER
  |--------------------------------------------------------------------------
  */

  const {
    data: website,
  } =
    await supabaseAdmin
      .from("websites")
      .select("owner_id")
      .eq("id", websiteId)
      .maybeSingle();

  if (
    website?.owner_id === userId
  ) {
    return true;
  }


  /*
  |--------------------------------------------------------------------------
  | WEBSITE ADMIN
  |--------------------------------------------------------------------------
  */

  const {
    data: websiteAdmin,
  } =
    await supabaseAdmin
      .from("website_admins")
      .select("id")
      .eq("website_id", websiteId)
      .eq("user_id", userId)
      .maybeSingle();

  return !!websiteAdmin;
}


/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
*/

export async function GET(request) {
  try {

    const user =
      await getUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn chưa đăng nhập.",
        },
        {
          status: 401,
        }
      );
    }


    const { searchParams } =
      new URL(request.url);

    const websiteId =
      String(
        searchParams.get(
          "websiteId"
        ) || ""
      ).trim();


    if (!websiteId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Thiếu websiteId.",
        },
        {
          status: 400,
        }
      );
    }


    const allowed =
      await canManageWebsite(
        user.id,
        websiteId
      );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền.",
        },
        {
          status: 403,
        }
      );
    }


    const {
      data: website,
      error,
    } =
      await supabaseAdmin
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

    if (error || !website) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy website.",
        },
        {
          status: 404,
        }
      );
    }


    const settings =
      website.settings &&
      typeof website.settings === "object"
        ? website.settings
        : {};


    /*
    |--------------------------------------------------------------------------
    | KHÔNG BAO GIỜ TRẢ TOKEN RA FRONTEND
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      success: true,

      website: {
        id: website.id,
        name: website.name,
        status: website.status,

        bank_name:
          website.bank_name || "",

        bank_account_number:
          website.bank_account_number ||
          "",

        bank_account_name:
          website.bank_account_name ||
          "",

        payment_qr_url:
          website.payment_qr_url ||
          "",
      },

      payment: {
        mode:
          String(
            settings.payment_mode ||
            "auto"
          )
            .toLowerCase() === "manual"
            ? "manual"
            : "auto",

        hasWebhookToken:
          !!String(
            settings.vietqr_webhook_token ||
            ""
          ).trim(),
      },
    });

  } catch (error) {

    console.error(
      "PAYMENT SETTINGS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Lỗi server.",
      },
      {
        status: 500,
      }
    );
  }
}


/*
|--------------------------------------------------------------------------
| PATCH
|--------------------------------------------------------------------------
*/

export async function PATCH(request) {
  try {

    const user =
      await getUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn chưa đăng nhập.",
        },
        {
          status: 401,
        }
      );
    }


    const body =
      await request.json();

    const websiteId =
      String(
        body.websiteId || ""
      ).trim();


    if (!websiteId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Thiếu websiteId.",
        },
        {
          status: 400,
        }
      );
    }


    const allowed =
      await canManageWebsite(
        user.id,
        websiteId
      );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền.",
        },
        {
          status: 403,
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | MODE
    |--------------------------------------------------------------------------
    */

    let paymentMode =
      String(
        body.paymentMode || ""
      )
        .trim()
        .toLowerCase();


    if (
      paymentMode !== "auto" &&
      paymentMode !== "manual"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "paymentMode phải là auto hoặc manual.",
        },
        {
          status: 400,
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | LẤY SETTINGS CŨ
    |--------------------------------------------------------------------------
    */

    const {
      data: website,
      error: websiteError,
    } =
      await supabaseAdmin
        .from("websites")
        .select(
          "id, settings"
        )
        .eq("id", websiteId)
        .maybeSingle();

    if (
      websiteError ||
      !website
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy website.",
        },
        {
          status: 404,
        }
      );
    }


    const oldSettings =
      website.settings &&
      typeof website.settings === "object"
        ? website.settings
        : {};


    /*
    |--------------------------------------------------------------------------
    | TOKEN
    |--------------------------------------------------------------------------
    |
    | Nếu không gửi token:
    | → giữ token cũ.
    |
    | Nếu gửi token mới:
    | → cập nhật token.
    |
    */

    let webhookToken =
      String(
        body.webhookToken || ""
      ).trim();


    if (!webhookToken) {
      webhookToken =
        String(
          oldSettings.vietqr_webhook_token ||
          ""
        ).trim();
    }


    /*
    |--------------------------------------------------------------------------
    | AUTO PHẢI CÓ TOKEN
    |--------------------------------------------------------------------------
    */

    if (
      paymentMode === "auto" &&
      !webhookToken
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "AUTO cần VietQR webhook token.",
        },
        {
          status: 400,
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | UPDATE SETTINGS
    |--------------------------------------------------------------------------
    */

    const newSettings = {
      ...oldSettings,

      payment_mode:
        paymentMode,

      vietqr_webhook_token:
        webhookToken,
    };


    const {
      error: updateError,
    } =
      await supabaseAdmin
        .from("websites")
        .update({
          settings: newSettings,
        })
        .eq(
          "id",
          websiteId
        );


    if (updateError) {
      console.error(
        "PAYMENT SETTINGS UPDATE ERROR:",
        updateError
      );

      /*
      |--------------------------------------------------------------------------
      | Token trùng shop khác
      |--------------------------------------------------------------------------
      */

      if (
        updateError.code === "23505"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Webhook token này đã được sử dụng bởi website khác.",
          },
          {
            status: 409,
          }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể lưu cấu hình.",
        },
        {
          status: 500,
        }
      );
    }


    return NextResponse.json({
      success: true,

      payment: {
        mode:
          paymentMode,

        hasWebhookToken:
          !!webhookToken,
      },
    });

  } catch (error) {

    console.error(
      "PAYMENT SETTINGS PATCH ERROR:",
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
