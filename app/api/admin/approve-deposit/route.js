import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

async function getUser(request) {
  const authHeader =
    request.headers.get("authorization") || "";

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader
    .slice(7)
    .trim();

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

async function canManageWebsite(
  userId,
  websiteId
) {
  if (!userId || !websiteId) {
    return false;
  }

  /*
   * Global admin.
   */
  const {
    data: profile,
    error: profileError,
  } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (
    !profileError &&
    profile?.role === "admin"
  ) {
    return true;
  }

  /*
   * Chủ website.
   */
  const {
    data: website,
    error: websiteError,
  } = await supabaseAdmin
    .from("websites")
    .select(
      "id, owner_id, status"
    )
    .eq("id", websiteId)
    .maybeSingle();

  if (
    websiteError ||
    !website
  ) {
    return false;
  }

  /*
   * Website phải đang active.
   */
  if (website.status !== "active") {
    return false;
  }

  /*
   * Owner được quản lý website.
   */
  if (
    website.owner_id === userId
  ) {
    return true;
  }

  /*
   * Admin riêng của website.
   *
   * Quan trọng:
   * active phải = true.
   */
  const {
    data: websiteAdmin,
    error: websiteAdminError,
  } = await supabaseAdmin
    .from("website_admins")
    .select(
      "id, website_id, user_id, role, active"
    )
    .eq(
      "website_id",
      websiteId
    )
    .eq(
      "user_id",
      userId
    )
    .eq(
      "active",
      true
    )
    .maybeSingle();

  if (
    websiteAdminError ||
    !websiteAdmin
  ) {
    return false;
  }

  return true;
}

export async function POST(request) {
  try {
    /*
     * 1. Xác thực Supabase Auth.
     */
    const user =
      await getUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn chưa đăng nhập hoặc phiên đã hết hạn.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * 2. Đọc body.
     */
    let body = {};

    try {
      body =
        await request.json();
    } catch {
      body = {};
    }

    const depositId =
      Number(body.depositId);

    const reference =
      String(
        body.reference || ""
      ).trim() || null;

    /*
     * 3. Kiểm tra ID.
     */
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

    /*
     * 4. Lấy đơn nạp tiền.
     *
     * Không nhận websiteId từ frontend.
     * Website được lấy trực tiếp từ deposit.
     */
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
      .eq(
        "id",
        depositId
      )
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
            "Không thể kiểm tra đơn nạp tiền.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * 5. Không tìm thấy đơn.
     */
    if (!deposit) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy đơn nạp tiền.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * 6. Đơn phải thuộc website.
     */
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

    const websiteId =
      deposit.website_id;

    /*
     * 7. Kiểm tra quyền quản trị
     * trên chính website của đơn.
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
     * 8. Không cho duyệt trực tiếp đơn
     * đã có trạng thái khác pending.
     *
     * RPC vẫn có kiểm tra riêng,
     * nhưng kiểm tra sớm giúp response rõ hơn.
     */
    if (
      deposit.status !==
      "pending"
    ) {
      if (
        deposit.status ===
        "completed"
      ) {
        return NextResponse.json({
          success: true,
          message:
            "Đơn này đã được duyệt trước đó.",
          alreadyCompleted: true,
          depositId:
            deposit.id,
          websiteId,
          status:
            deposit.status,
        });
      }

      return NextResponse.json(
        {
          success: false,
          message:
            "Đơn này không còn ở trạng thái chờ duyệt.",
          status:
            deposit.status,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * 9. Gọi RPC transaction.
     *
     * RPC chịu trách nhiệm:
     * - khóa đơn
     * - khóa ví
     * - cộng tiền
     * - chuyển deposit -> completed
     * - chống cộng tiền 2 lần
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
            "Không thể duyệt đơn nạp tiền.",
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
     * 10. Xử lý response từ RPC.
     */
    if (
      data &&
      data.ok === false
    ) {
      let message =
        "Không thể duyệt đơn nạp tiền.";

      if (
        data.status ===
        "not_found"
      ) {
        message =
          "Không tìm thấy đơn nạp tiền.";
      }

      if (
        data.status ===
        "legacy_deposit"
      ) {
        message =
          "Đơn này là đơn nạp tiền cũ và không thuộc website.";
      }

      if (
        data.status ===
        "website_mismatch"
      ) {
        message =
          "Website của đơn nạp tiền không khớp.";
      }

      if (
        data.status ===
        "invalid_status"
      ) {
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

    /*
     * 11. RPC báo đã hoàn thành.
     */
    if (
      data &&
      data.ok === true &&
      data.status ===
        "already_completed"
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Đơn này đã được duyệt trước đó.",
        ...data,
      });
    }

    /*
     * 12. Thành công.
     */
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
