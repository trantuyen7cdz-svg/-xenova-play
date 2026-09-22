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


/*
|--------------------------------------------------------------------------
| KIỂM TRA QUYỀN WEBSITE
|--------------------------------------------------------------------------
|
| Cho phép:
| - Global admin
| - Owner của website
| - Website admin
|
*/

async function canManageWebsite(
  userId,
  websiteId
) {
  /*
  |--------------------------------------------------------------------------
  | Global admin
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
  | Owner website
  |--------------------------------------------------------------------------
  */

  const {
    data: website,
    error: websiteError,
  } =
    await supabaseAdmin
      .from("websites")
      .select("id, owner_id")
      .eq("id", websiteId)
      .maybeSingle();

  if (
    websiteError ||
    !website
  ) {
    return false;
  }

  if (
    website.owner_id === userId
  ) {
    return true;
  }


  /*
  |--------------------------------------------------------------------------
  | Website admin
  |--------------------------------------------------------------------------
  */

  const {
    data: websiteAdmin,
    error: websiteAdminError,
  } =
    await supabaseAdmin
      .from("website_admins")
      .select("id")
      .eq("website_id", websiteId)
      .eq("user_id", userId)
      .maybeSingle();

  if (
    websiteAdminError ||
    !websiteAdmin
  ) {
    return false;
  }

  return true;
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
    | AUTH
    |--------------------------------------------------------------------------
    */

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


    /*
    |--------------------------------------------------------------------------
    | BODY
    |--------------------------------------------------------------------------
    */

    const body =
      await request.json();

    const depositId =
      Number(body.depositId);

    const websiteId =
      String(
        body.websiteId || ""
      ).trim();

    const reference =
      String(
        body.reference || ""
      ).trim() || null;


    if (
      !Number.isSafeInteger(
        depositId
      ) ||
      depositId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Deposit ID không hợp lệ.",
        },
        {
          status: 400,
        }
      );
    }


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


    /*
    |--------------------------------------------------------------------------
    | QUYỀN
    |--------------------------------------------------------------------------
    */

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
            "Bạn không có quyền duyệt đơn của website này.",
        },
        {
          status: 403,
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | LẤY ĐƠN
    |--------------------------------------------------------------------------
    */

    const {
      data: deposit,
      error: depositError,
    } =
      await supabaseAdmin
        .from("deposit_requests")
        .select(
          `
            id,
            user_id,
            website_id,
            amount,
            status,
            transfer_content
          `
        )
        .eq("id", depositId)
        .eq("website_id", websiteId)
        .maybeSingle();

    if (depositError) {
      console.error(
        "APPROVE DEPOSIT LOOKUP ERROR:",
        depositError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể kiểm tra đơn.",
        },
        {
          status: 500,
        }
      );
    }


    if (!deposit) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy đơn của website này.",
        },
        {
          status: 404,
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | GỌI RPC ATOMIC
    |--------------------------------------------------------------------------
    */

    const {
      data,
      error,
    } =
      await supabaseAdmin.rpc(
        "approve_vietqr_deposit_for_website",
        {
          p_deposit_id:
            depositId,

          p_website_id:
            websiteId,

          p_reference:
            reference,
        }
      );

    if (error) {
      console.error(
        "APPROVE DEPOSIT RPC ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể duyệt đơn.",
        },
        {
          status: 500,
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | RPC RESULT
    |--------------------------------------------------------------------------
    */

    if (
      data &&
      data.ok === false
    ) {
      return NextResponse.json(
        {
          success: false,
          ...data,
        },
        {
          status: 400,
        }
      );
    }


    return NextResponse.json({
      success: true,
      ...data,
    });

  } catch (error) {

    console.error(
      "APPROVE DEPOSIT ERROR:",
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
