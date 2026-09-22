import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

async function getUser(request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7).trim();

  if (!token) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

async function canManageWebsite(userId, websiteId) {
  if (!userId || !websiteId) {
    return false;
  }

  const {
    data: profile,
    error: profileError,
  } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!profileError && profile?.role === "admin") {
    return true;
  }

  const {
    data: website,
    error: websiteError,
  } = await supabaseAdmin
    .from("websites")
    .select("id, owner_id")
    .eq("id", websiteId)
    .maybeSingle();

  if (websiteError || !website) {
    return false;
  }

  if (website.owner_id === userId) {
    return true;
  }

  const {
    data: websiteAdmin,
    error: websiteAdminError,
  } = await supabaseAdmin
    .from("website_admins")
    .select("id")
    .eq("website_id", websiteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (websiteAdminError || !websiteAdmin) {
    return false;
  }

  return true;
}

export async function POST(request) {
  try {
    const user = await getUser(request);

    if (!user) {
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

    let body = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const depositId = Number(body.depositId);

    const reference =
      String(body.reference || "").trim() || null;

    if (!Number.isSafeInteger(depositId) || depositId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Deposit ID không hợp lệ.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: deposit,
      error: depositError,
    } = await supabaseAdmin
      .from("deposit_requests")
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
      .eq("id", depositId)
      .maybeSingle();

    if (depositError) {
      console.error(
        "APPROVE DEPOSIT LOOKUP ERROR:",
        depositError
      );

      return NextResponse.json(
        {
          success: false,
          message: "Không thể kiểm tra đơn nạp tiền.",
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
          message: "Không tìm thấy đơn nạp tiền.",
        },
        {
          status: 404,
        }
      );
    }

    if (!deposit.website_id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Đây là đơn nạp tiền cũ không thuộc website riêng.",
        },
        {
          status: 400,
        }
      );
    }

    const websiteId = deposit.website_id;

    const allowed = await canManageWebsite(
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

    const {
      data,
      error,
    } = await supabaseAdmin.rpc(
      "approve_vietqr_deposit_for_website",
      {
        p_deposit_id: depositId,
        p_website_id: websiteId,
        p_reference: reference,
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
          message: "Không thể duyệt đơn nạp tiền.",
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    if (data && data.ok === false) {
      let message = "Không thể duyệt đơn nạp tiền.";

      if (data.status === "not_found") {
        message = "Không tìm thấy đơn nạp tiền.";
      }

      if (data.status === "legacy_deposit") {
        message =
          "Đơn này là đơn nạp tiền cũ và không thuộc website.";
      }

      if (data.status === "website_mismatch") {
        message =
          "Website của đơn nạp tiền không khớp.";
      }

      if (data.status === "invalid_status") {
        message =
          "Trạng thái đơn không hợp lệ.";
      }

      return NextResponse.json(
        {
          success: false,
          message,
          ...data,
        },
        {
          status: 400,
        }
      );
    }

    if (
      data &&
      data.ok === true &&
      data.status === "already_completed"
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Đơn này đã được duyệt trước đó.",
        ...data,
      });
    }

    return NextResponse.json({
      success: true,
      message:
        "Đã duyệt nạp tiền và cộng tiền vào đúng ví website.",
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
