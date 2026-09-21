import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function getUser(request, supabase) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization
    .replace("Bearer ", "")
    .trim();

  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

async function getWebsite(
  supabase,
  slug
) {
  const { data, error } = await supabase
    .from("websites")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error(
      "WEBSITE QUERY ERROR:",
      error
    );

    return null;
  }

  return data;
}

async function isWebsiteAdmin(
  supabase,
  websiteId,
  userId
) {
  const { data, error } = await supabase
    .from("website_admins")
    .select("id, role, active")
    .eq("website_id", websiteId)
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error(
      "WEBSITE ADMIN QUERY ERROR:",
      error
    );

    return false;
  }

  return Boolean(data);
}


/* =========================
   GET ORDERS
========================= */

export async function GET(
  request,
  { params }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          error: "Thiếu slug website",
        },
        { status: 400 }
      );
    }

    const supabase =
      getSupabaseAdmin();

    const user = await getUser(
      request,
      supabase
    );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Chưa đăng nhập",
        },
        { status: 401 }
      );
    }

    const website =
      await getWebsite(
        supabase,
        slug
      );

    if (!website) {
      return NextResponse.json(
        {
          success: false,
          error: "Website không tồn tại",
        },
        { status: 404 }
      );
    }

    const allowed =
      await isWebsiteAdmin(
        supabase,
        website.id,
        user.id
      );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bạn không có quyền quản lý website này",
        },
        { status: 403 }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const status =
      searchParams.get("status");

    const limitRaw =
      Number(
        searchParams.get("limit") || 100
      );

    const limit = Math.min(
      Math.max(limitRaw, 1),
      200
    );

    let query = supabase
      .from("website_orders")
      .select("*")
      .eq("website_id", website.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(limit);

    if (
      status &&
      status !== "all"
    ) {
      query = query.eq(
        "status",
        status
      );
    }

    const {
      data: orders,
      error,
    } = await query;

    if (error) {
      console.error(
        "ADMIN ORDERS QUERY ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Không thể lấy đơn hàng",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,

      website: {
        id: website.id,
        name: website.name,
        slug: website.slug,
      },

      orders: orders || [],
    });
  } catch (error) {
    console.error(
      "ADMIN ORDERS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Lỗi máy chủ",
      },
      { status: 500 }
    );
  }
}


/* =========================
   UPDATE ORDER
========================= */

export async function PATCH(
  request,
  { params }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          error: "Thiếu slug website",
        },
        { status: 400 }
      );
    }

    const supabase =
      getSupabaseAdmin();

    const user = await getUser(
      request,
      supabase
    );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Chưa đăng nhập",
        },
        { status: 401 }
      );
    }

    const website =
      await getWebsite(
        supabase,
        slug
      );

    if (!website) {
      return NextResponse.json(
        {
          success: false,
          error: "Website không tồn tại",
        },
        { status: 404 }
      );
    }

    const allowed =
      await isWebsiteAdmin(
        supabase,
        website.id,
        user.id
      );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bạn không có quyền quản lý website này",
        },
        { status: 403 }
      );
    }

    const body =
      await request.json();

    const orderId =
      Number(body?.id);

    if (
      !Number.isInteger(orderId) ||
      orderId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "ID đơn hàng không hợp lệ",
        },
        { status: 400 }
      );
    }

    const allowedStatuses = [
      "pending",
      "paid",
      "processing",
      "completed",
      "cancelled",
      "refunded",
    ];

    const status =
      typeof body?.status === "string"
        ? body.status
        : null;

    if (
      status &&
      !allowedStatuses.includes(status)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Trạng thái đơn hàng không hợp lệ",
        },
        { status: 400 }
      );
    }

    const updates = {};

    if (status) {
      updates.status = status;
    }

    if (
      typeof body?.key_value ===
      "string"
    ) {
      updates.key_value =
        body.key_value.trim();
    }

    if (
      typeof body?.note ===
      "string"
    ) {
      updates.note =
        body.note.trim();
    }

    if (
      Object.keys(updates).length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Không có dữ liệu cần cập nhật",
        },
        { status: 400 }
      );
    }

    const {
      data: order,
      error,
    } = await supabase
      .from("website_orders")
      .update(updates)
      .eq("id", orderId)
      .eq(
        "website_id",
        website.id
      )
      .select("*")
      .maybeSingle();

    if (error) {
      console.error(
        "ADMIN ORDER UPDATE ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Không thể cập nhật đơn hàng",
        },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Không tìm thấy đơn hàng",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error(
      "ADMIN ORDERS PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Lỗi máy chủ",
      },
      { status: 500 }
    );
  }
}


/* =========================
   DELETE ORDER
========================= */

export async function DELETE(
  request,
  { params }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          error: "Thiếu slug website",
        },
        { status: 400 }
      );
    }

    const supabase =
      getSupabaseAdmin();

    const user = await getUser(
      request,
      supabase
    );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Chưa đăng nhập",
        },
        { status: 401 }
      );
    }

    const website =
      await getWebsite(
        supabase,
        slug
      );

    if (!website) {
      return NextResponse.json(
        {
          success: false,
          error: "Website không tồn tại",
        },
        { status: 404 }
      );
    }

    const allowed =
      await isWebsiteAdmin(
        supabase,
        website.id,
        user.id
      );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bạn không có quyền quản lý website này",
        },
        { status: 403 }
      );
    }

    const body =
      await request.json();

    const orderId =
      Number(body?.id);

    if (
      !Number.isInteger(orderId) ||
      orderId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "ID đơn hàng không hợp lệ",
        },
        { status: 400 }
      );
    }

    const {
      data: deleted,
      error,
    } = await supabase
      .from("website_orders")
      .delete()
      .eq("id", orderId)
      .eq(
        "website_id",
        website.id
      )
      .select("id")
      .maybeSingle();

    if (error) {
      console.error(
        "ADMIN ORDER DELETE ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Không thể xóa đơn hàng",
        },
        { status: 500 }
      );
    }

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Không tìm thấy đơn hàng",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted_id: deleted.id,
    });
  } catch (error) {
    console.error(
      "ADMIN ORDERS DELETE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Lỗi máy chủ",
      },
      { status: 500 }
    );
  }
}
