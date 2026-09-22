import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

async function getUser(request) {
  const authHeader = request.headers.get("authorization") || "";

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    console.error("GET USER ERROR:", error);
    return null;
  }

  return user;
}

async function canManageWebsite(userId, websiteId) {
  if (!userId || !websiteId) {
    return false;
  }

  // =========================
  // GLOBAL ADMIN
  // =========================

  const {
    data: profile,
    error: profileError,
  } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  if (!profileError && profile?.role === "admin") {
    return true;
  }

  // =========================
  // WEBSITE
  // =========================

  const {
    data: website,
    error: websiteError,
  } = await supabaseAdmin
    .from("websites")
    .select("id, owner_id, status")
    .eq("id", websiteId)
    .maybeSingle();

  if (websiteError || !website) {
    return false;
  }

  if (website.status !== "active") {
    return false;
  }

  // =========================
  // WEBSITE OWNER
  // =========================

  if (website.owner_id === userId) {
    return true;
  }

  // =========================
  // WEBSITE ADMIN
  // =========================

  const {
    data: websiteAdmin,
    error: websiteAdminError,
  } = await supabaseAdmin
    .from("website_admins")
    .select("id, website_id, user_id, role, active")
    .eq("website_id", websiteId)
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (websiteAdminError || !websiteAdmin) {
    return false;
  }

  return true;
}

export async function POST(request, { params }) {
  try {
    // =========================
    // 1. KIỂM TRA ĐĂNG NHẬP
    // =========================

    const user = await getUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập hoặc phiên đã hết hạn.",
        },
        { status: 401 }
      );
    }

    // =========================
    // 2. LẤY SLUG
    // =========================

    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message: "Slug website không hợp lệ.",
        },
        { status: 400 }
      );
    }

    // =========================
    // 3. LẤY WEBSITE
    // =========================

    const {
      data: website,
      error: websiteError,
    } = await supabaseAdmin
      .from("websites")
      .select("id, name, slug, status, owner_id")
      .eq("slug", slug)
      .maybeSingle();

    if (websiteError) {
      console.error("GET WEBSITE ERROR:", websiteError);

      return NextResponse.json(
        {
          success: false,
          message: "Không thể kiểm tra website.",
        },
        { status: 500 }
      );
    }

    if (!website) {
      return NextResponse.json(
        {
          success: false,
          message: "Website không tồn tại.",
        },
        { status: 404 }
      );
    }

    if (website.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          message: "Website đang tắt.",
        },
        { status: 403 }
      );
    }

    // =========================
    // 4. LẤY DEPOSIT ID
    // =========================

    let body = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const depositId = Number(body.depositId);

    if (!Number.isSafeInteger(depositId) || depositId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Deposit ID không hợp lệ.",
        },
        { status: 400 }
      );
    }

    // =========================
    // 5. KIỂM TRA QUYỀN
    // =========================

    const allowed = await canManageWebsite(
      user.id,
      website.id
    );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn không có quyền từ chối đơn của website này.",
        },
        { status: 403 }
      );
    }

    // =========================
    // 6. LẤY ĐƠN NẠP
    // =========================

    const {
      data: deposit,
      error: depositError,
    } = await supabaseAdmin
      .from("deposit_requests")
      .select(
        "id, user_id, website_id, amount, status, transfer_content, note, created_at, updated_at"
      )
      .eq("id", depositId)
      .maybeSingle();

    if (depositError) {
      console.error("GET DEPOSIT ERROR:", depositError);

      return NextResponse.json(
        {
          success: false,
          message: "Không thể kiểm tra đơn nạp tiền.",
        },
        { status: 500 }
      );
    }

    if (!deposit) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy đơn nạp tiền.",
        },
        { status: 404 }
      );
    }

    // =========================
    // 7. KIỂM TRA WEBSITE
    // =========================

    if (!deposit.website_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Đây là đơn nạp tiền cũ không thuộc website riêng.",
        },
        { status: 400 }
      );
    }

    if (deposit.website_id !== website.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Đơn nạp tiền không thuộc website này.",
        },
        { status: 403 }
      );
    }

    // =========================
    // 8. KIỂM TRA TRẠNG THÁI
    // =========================

    if (deposit.status === "failed") {
      return NextResponse.json({
        success: true,
        message: "Đơn này đã bị từ chối trước đó.",
        alreadyRejected: true,
        depositId: deposit.id,
        websiteId: website.id,
        status: deposit.status,
      });
    }

    if (deposit.status === "completed") {
      return NextResponse.json(
        {
          success: false,
          message: "Đơn này đã được duyệt, không thể từ chối.",
          status: deposit.status,
        },
        { status: 400 }
      );
    }

    if (deposit.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          message: "Đơn này không còn ở trạng thái chờ duyệt.",
          status: deposit.status,
        },
        { status: 400 }
      );
    }

    // =========================
    // 9. TỪ CHỐI
    // pending -> failed
    // =========================

    const {
      data: rejectedDeposit,
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
        "id, user_id, website_id, amount, status, transfer_content, note, created_at, updated_at"
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
          message: "Không thể từ chối đơn nạp tiền.",
          error: updateError.message,
        },
        { status: 500 }
      );
    }

    if (!rejectedDeposit) {
      return NextResponse.json(
        {
          success: false,
          message: "Đơn không tồn tại hoặc đã được xử lý trước đó.",
        },
        { status: 400 }
      );
    }

    // =========================
    // 10. THÀNH CÔNG
    // =========================

    return NextResponse.json({
      success: true,
      message: "Đã từ chối đơn nạp tiền.",
      depositId: rejectedDeposit.id,
      websiteId: rejectedDeposit.website_id,
      userId: rejectedDeposit.user_id,
      amount: rejectedDeposit.amount,
      status: rejectedDeposit.status,
      transferContent: rejectedDeposit.transfer_content,
      updatedAt: rejectedDeposit.updated_at,
    });
  } catch (error) {
    console.error(
      "REJECT WEBSITE DEPOSIT SERVER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Lỗi server.",
      },
      { status: 500 }
    );
  }
}
