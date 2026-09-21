import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminClient() {
  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

async function getUserFromRequest(request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7).trim();

  if (!token) {
    return null;
  }

  const supabase = getAdminClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

async function requireAdmin(request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "Bạn chưa đăng nhập.",
        },
        { status: 401 }
      ),
    };
  }

  const supabase = getAdminClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "Không thể kiểm tra quyền admin.",
          detail: error.message,
        },
        { status: 500 }
      ),
    };
  }

  if (!profile || profile.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "Bạn không có quyền admin.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    user,
    supabase,
  };
}


// ============================================================
// GET
// /api/admin/websites
// ============================================================

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);

    if (!auth.ok) {
      return auth.response;
    }

    const { supabase } = auth;

    const { data, error } = await supabase
      .from("websites")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      websites: data || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Lỗi server.",
      },
      { status: 500 }
    );
  }
}


// ============================================================
// POST
// /api/admin/websites
// ============================================================

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);

    if (!auth.ok) {
      return auth.response;
    }

    const { user, supabase } = auth;

    const body = await request.json();

    const name = String(body.name || "").trim();
    const slug = String(body.slug || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!name) {
      return NextResponse.json(
        {
          ok: false,
          error: "Vui lòng nhập tên website.",
        },
        { status: 400 }
      );
    }

    if (!slug) {
      return NextResponse.json(
        {
          ok: false,
          error: "Vui lòng nhập slug website.",
        },
        { status: 400 }
      );
    }

    if (slug.length < 2) {
      return NextResponse.json(
        {
          ok: false,
          error: "Slug phải có ít nhất 2 ký tự.",
        },
        { status: 400 }
      );
    }

    const website = {
      name,
      slug,
      domain: body.domain
        ? String(body.domain).trim()
        : null,

      status: "active",

      logo_url: body.logo_url
        ? String(body.logo_url).trim()
        : null,

      banner_url: body.banner_url
        ? String(body.banner_url).trim()
        : null,

      theme: body.theme
        ? String(body.theme).trim()
        : "pink",

      bank_name: body.bank_name
        ? String(body.bank_name).trim()
        : null,

      bank_account_number: body.bank_account_number
        ? String(body.bank_account_number).trim()
        : null,

      bank_account_name: body.bank_account_name
        ? String(body.bank_account_name).trim()
        : null,

      payment_qr_url: body.payment_qr_url
        ? String(body.payment_qr_url).trim()
        : null,

      description: body.description
        ? String(body.description).trim()
        : null,

      owner_id: user.id,

      settings:
        body.settings &&
        typeof body.settings === "object"
          ? body.settings
          : {},
    };

    const { data, error } = await supabase
      .from("websites")
      .insert(website)
      .select("*")
      .single();

    if (error) {
      if (
        error.code === "23505" ||
        error.message?.toLowerCase().includes("duplicate")
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "Slug website đã tồn tại.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Tạo website thành công.",
        website: data,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Lỗi server.",
      },
      { status: 500 }
    );
  }
}


// ============================================================
// PATCH
// /api/admin/websites?id=WEBSITE_ID
// ============================================================

export async function PATCH(request) {
  try {
    const auth = await requireAdmin(request);

    if (!auth.ok) {
      return auth.response;
    }

    const { supabase } = auth;

    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Thiếu ID website.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const allowedFields = [
      "name",
      "slug",
      "domain",
      "status",
      "logo_url",
      "banner_url",
      "theme",
      "bank_name",
      "bank_account_number",
      "bank_account_name",
      "payment_qr_url",
      "description",
      "settings",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        updates[field] = body[field];
      }
    }

    if (updates.slug !== undefined) {
      updates.slug = String(updates.slug || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Không có dữ liệu cần cập nhật.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("websites")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Cập nhật website thành công.",
      website: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Lỗi server.",
      },
      { status: 500 }
    );
  }
}


// ============================================================
// DELETE
// /api/admin/websites?id=WEBSITE_ID
// ============================================================

export async function DELETE(request) {
  try {
    const auth = await requireAdmin(request);

    if (!auth.ok) {
      return auth.response;
    }

    const { supabase } = auth;

    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Thiếu ID website.",
        },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("websites")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Đã xóa website.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Lỗi server.",
      },
      { status: 500 }
    );
  }
}
