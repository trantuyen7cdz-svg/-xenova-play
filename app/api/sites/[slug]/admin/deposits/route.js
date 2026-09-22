import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

async function checkAdmin(slug, request) {
  if (!slug) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Thiếu slug website.",
        },
        {
          status: 400,
        }
      ),
    };
  }

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
        {
          status: 401,
        }
      ),
    };
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Phiên đăng nhập không hợp lệ.",
        },
        {
          status: 401,
        }
      ),
    };
  }

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
        {
          status: 401,
        }
      ),
    };
  }

  const {
    data: website,
    error: websiteError,
  } = await supabaseAdmin
    .from("websites")
    .select(
      `
        id,
        name,
        slug,
        status,
        owner_id
      `
    )
    .eq("slug", slug)
    .maybeSingle();

  if (websiteError) {
    console.error(
      "WEBSITE LOAD ERROR:",
      websiteError
    );

    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Không thể kiểm tra website.",
        },
        {
          status: 500,
        }
      ),
    };
  }

  if (!website) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Website không tồn tại.",
        },
        {
          status: 404,
        }
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
        {
          status: 403,
        }
      ),
    };
  }

  const {
    data: profile,
  } = await supabaseAdmin
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
    .select(
      `
        id,
        website_id,
        user_id,
        role,
        active
      `
    )
    .eq("website_id", website.id)
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (websiteAdminError) {
    console.error(
      "WEBSITE ADMIN CHECK ERROR:",
      websiteAdminError
    );

    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Không thể kiểm tra quyền quản trị.",
        },
        {
          status: 500,
        }
      ),
    };
  }

  if (!websiteAdmin) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền quản trị website này.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  return {
    ok: true,
    user,
    website,
  };
}

export async function GET(request, { params }) {
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

    const {
      data: deposits,
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
          note,
          created_at,
          updated_at,
          expires_at
        `
      )
      .eq("website_id", website.id)
      .order("created_at", {
        ascending: false,
      });

    if (depositError) {
      console.error(
        "ADMIN WEBSITE DEPOSITS ERROR:",
        depositError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể tải danh sách nạp tiền.",
        },
        {
          status: 500,
        }
      );
    }

    const userIds = [
      ...new Set(
        (deposits || [])
          .map((item) => item.user_id)
          .filter(Boolean)
      ),
    ];

    let users = [];

    if (userIds.length > 0) {
      const {
        data: websiteUsers,
        error: usersError,
      } = await supabaseAdmin
        .from("website_users")
        .select(
          `
            id,
            username,
            email
          `
        )
        .in("id", userIds);

      if (!usersError) {
        users = websiteUsers || [];
      }
    }

    const userMap = new Map(
      users.map((user) => [
        user.id,
        user,
      ])
    );

    const result = (deposits || []).map(
      (deposit) => ({
        ...deposit,
        user:
          userMap.get(deposit.user_id) ||
          null,
      })
    );

    const pending = result.filter(
      (item) => item.status === "pending"
    );

    const completed = result.filter(
      (item) => item.status === "completed"
    );

    const failed = result.filter(
      (item) => item.status === "failed"
    );

    const totalPending = pending.reduce(
      (total, item) =>
        total + Number(item.amount || 0),
      0
    );

    return NextResponse.json({
      success: true,

      website: {
        id: website.id,
        name: website.name,
        slug: website.slug,
      },

      deposits: result,

      stats: {
        total: result.length,
        pending: pending.length,
        completed: completed.length,
        failed: failed.length,
        totalPending,
      },
    });
  } catch (error) {
    console.error(
      "WEBSITE ADMIN DEPOSITS ERROR:",
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
