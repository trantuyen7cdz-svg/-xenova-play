import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

async function checkAdmin(slug, request) {
  const authorization =
    request.headers.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập.",
        },
        { status: 401 }
      ),
    };
  }

  const token = authorization.slice(7).trim();

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Phiên đăng nhập đã hết hạn.",
        },
        { status: 401 }
      ),
    };
  }

  const {
    data: website,
    error: websiteError,
  } = await supabaseAdmin
    .from("websites")
    .select("id,name,slug,status,owner_id")
    .eq("slug", slug)
    .maybeSingle();

  if (websiteError || !website) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Website không tồn tại.",
        },
        { status: 404 }
      ),
    };
  }

  if (website.status !== "active") {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Website đang tắt.",
        },
        { status: 403 }
      ),
    };
  }

  const { data: profile } =
    await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

  if (profile?.role === "admin") {
    return {
      ok: true,
      user,
      website,
    };
  }

  if (website.owner_id === user.id) {
    return {
      ok: true,
      user,
      website,
    };
  }

  const {
    data: websiteAdmin,
    error: websiteAdminError,
  } = await supabaseAdmin
    .from("website_admins")
    .select("id,website_id,user_id,role,active")
    .eq("website_id", website.id)
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (websiteAdminError || !websiteAdmin) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền quản trị website này.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    user,
    website,
  };
}

export async function POST(request, { params }) {
  try {
    const { slug } = await params;

    const auth = await checkAdmin(
      slug,
      request
    );

    if (!auth.ok) {
      return auth.response;
    }

    const { website } = auth;

    let body = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const depositId = Number(body.depositId);

    if (
      !Number.isSafeInteger(depositId) ||
      depositId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Deposit ID không hợp lệ.",
        },
        { status: 400 }
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
          transfer_content
        `
      )
      .eq("id", depositId)
      .eq("website_id", website.id)
      .maybeSingle();

    if (depositError) {
      console.error(
        "REJECT DEPOSIT LOOKUP ERROR:",
        depositError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể kiểm tra đơn nạp tiền.",
        },
        { status: 500 }
      );
    }

    if (!deposit) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy đơn của website này.",
        },
        { status: 404 }
      );
    }

    if (deposit.status === "completed") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Đơn này đã hoàn thành và không thể từ chối.",
        },
        { status: 400 }
      );
    }

    if (deposit.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Đơn này không còn ở trạng thái chờ duyệt.",
          status: deposit.status,
        },
        { status: 400 }
      );
    }

    const {
      data: updatedDeposit,
      error: updateError,
    } = await supabaseAdmin
      .from("deposit_requests")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", deposit.id)
      .eq("website_id", website.id)
      .eq("status", "pending")
      .select(
        `
          id,
          user_id,
          website_id,
          amount,
          status,
          transfer_content,
          updated_at
        `
      )
      .maybeSingle();

    if (updateError) {
      console.error(
        "REJECT DEPOSIT UPDATE ERROR:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể từ chối đơn nạp tiền.",
        },
        { status: 500 }
      );
    }

    if (!updatedDeposit) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Đơn vừa được xử lý bởi một quản trị viên khác.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Đã từ chối đơn nạp tiền.",
      deposit: updatedDeposit,
    });
  } catch (error) {
    console.error(
      "REJECT WEBSITE DEPOSIT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Lỗi server.",
      },
      { status: 500 }
    );
  }
}
