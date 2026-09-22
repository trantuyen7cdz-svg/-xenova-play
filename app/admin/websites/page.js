import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function getGlobalAdmin(request) {
  const supabaseAdmin = getSupabaseAdmin();

  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      error: "Thiếu token đăng nhập.",
      status: 401,
    };
  }

  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return {
      error: "Token không hợp lệ.",
      status: 401,
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return {
      error: "Phiên đăng nhập không hợp lệ.",
      status: 401,
    };
  }

  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

  if (profileError) {
    console.error(profileError);

    return {
      error: "Không thể kiểm tra quyền quản trị.",
      status: 500,
    };
  }

  if (profile?.role !== "admin") {
    return {
      error: "Bạn không có quyền quản trị hệ thống.",
      status: 403,
    };
  }

  return {
    supabaseAdmin,
    user,
  };
}

async function getWebsite(supabaseAdmin, websiteId) {
  if (!websiteId) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("websites")
    .select("id, name, slug")
    .eq("id", websiteId)
    .maybeSingle();

  if (error) {
    console.error(error);
    throw new Error("Không thể tải website.");
  }

  return data;
}

/*
  GET
  /api/admin/websites/admins?website_id=...
*/
export async function GET(request) {
  try {
    const auth = await getGlobalAdmin(request);

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { supabaseAdmin } = auth;

    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get("website_id");

    if (!websiteId) {
      return NextResponse.json(
        { error: "Thiếu website_id." },
        { status: 400 }
      );
    }

    const website = await getWebsite(
      supabaseAdmin,
      websiteId
    );

    if (!website) {
      return NextResponse.json(
        { error: "Website không tồn tại." },
        { status: 404 }
      );
    }

    const { data: admins, error } = await supabaseAdmin
      .from("website_admins")
      .select(
        "id, website_id, user_id, email, role, active, created_at, updated_at"
      )
      .eq("website_id", websiteId)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          error:
            error.message ||
            "Không thể tải danh sách admin.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      website,
      admins: admins || [],
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Có lỗi xảy ra khi tải admin.",
      },
      { status: 500 }
    );
  }
}

/*
  POST
  Thêm admin bằng email

  Body:
  {
    website_id: "...",
    email: "abc@gmail.com",
    role: "admin"
  }
*/
export async function POST(request) {
  try {
    const auth = await getGlobalAdmin(request);

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { supabaseAdmin } = auth;

    const body = await request.json();

    const websiteId = String(
      body?.website_id || ""
    ).trim();

    const email = String(
      body?.email || ""
    )
      .trim()
      .toLowerCase();

    const role =
      body?.role === "owner" ? "owner" : "admin";

    if (!websiteId) {
      return NextResponse.json(
        { error: "Thiếu website_id." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Vui lòng nhập email tài khoản." },
        { status: 400 }
      );
    }

    const website = await getWebsite(
      supabaseAdmin,
      websiteId
    );

    if (!website) {
      return NextResponse.json(
        { error: "Website không tồn tại." },
        { status: 404 }
      );
    }

    /*
      Tìm user trong Supabase Auth theo email.
    */
    let targetUser = null;
    let page = 1;

    while (!targetUser && page <= 20) {
      const {
        data: usersData,
        error: usersError,
      } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

      if (usersError) {
        console.error(usersError);

        return NextResponse.json(
          {
            error:
              usersError.message ||
              "Không thể tìm tài khoản.",
          },
          { status: 500 }
        );
      }

      const users = usersData?.users || [];

      targetUser = users.find(
        (user) =>
          user.email?.toLowerCase() === email
      );

      if (
        users.length < 1000 ||
        !usersData?.nextPage
      ) {
        break;
      }

      page++;
    }

    if (!targetUser) {
      return NextResponse.json(
        {
          error:
            "Không tìm thấy tài khoản với email này. Tài khoản phải đăng ký/đăng nhập XENOVA trước.",
        },
        { status: 404 }
      );
    }

    /*
      Kiểm tra đã là admin của website chưa.
    */
    const {
      data: existing,
      error: existingError,
    } = await supabaseAdmin
      .from("website_admins")
      .select(
        "id, website_id, user_id, email, role, active"
      )
      .eq("website_id", websiteId)
      .eq("user_id", targetUser.id)
      .maybeSingle();

    if (existingError) {
      console.error(existingError);

      return NextResponse.json(
        {
          error:
            existingError.message ||
            "Không thể kiểm tra admin.",
        },
        { status: 500 }
      );
    }

    if (existing) {
      /*
        Nếu admin cũ đang bị tắt thì POST sẽ bật lại.
      */
      const { data: updated, error: updateError } =
        await supabaseAdmin
          .from("website_admins")
          .update({
            email:
              targetUser.email?.toLowerCase() ||
              email,
            role,
            active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select(
            "id, website_id, user_id, email, role, active, created_at, updated_at"
          )
          .single();

      if (updateError) {
        console.error(updateError);

        return NextResponse.json(
          {
            error:
              updateError.message ||
              "Không thể cập nhật admin.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "Đã bật lại admin cho website.",
        admin: updated,
      });
    }

    const { data: admin, error: insertError } =
      await supabaseAdmin
        .from("website_admins")
        .insert({
          website_id: websiteId,
          user_id: targetUser.id,
          email:
            targetUser.email?.toLowerCase() ||
            email,
          role,
          active: true,
        })
        .select(
          "id, website_id, user_id, email, role, active, created_at, updated_at"
        )
        .single();

    if (insertError) {
      console.error(insertError);

      return NextResponse.json(
        {
          error:
            insertError.message ||
            "Không thể thêm admin.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Thêm admin thành công.",
      admin,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Có lỗi xảy ra khi thêm admin.",
      },
      { status: 500 }
    );
  }
}

/*
  PATCH
  Bật / tắt admin
*/
export async function PATCH(request) {
  try {
    const auth = await getGlobalAdmin(request);

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { supabaseAdmin } = auth;

    const body = await request.json();

    const id = Number(body?.id);
    const websiteId = String(
      body?.website_id || ""
    ).trim();

    if (!id || !websiteId) {
      return NextResponse.json(
        { error: "Thiếu thông tin admin." },
        { status: 400 }
      );
    }

    const website = await getWebsite(
      supabaseAdmin,
      websiteId
    );

    if (!website) {
      return NextResponse.json(
        { error: "Website không tồn tại." },
        { status: 404 }
      );
    }

    const update = {};

    if (typeof body.active === "boolean") {
      update.active = body.active;
    }

    if (
      body.role === "admin" ||
      body.role === "owner"
    ) {
      update.role = body.role;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "Không có dữ liệu cần cập nhật." },
        { status: 400 }
      );
    }

    update.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("website_admins")
      .update(update)
      .eq("id", id)
      .eq("website_id", websiteId)
      .select(
        "id, website_id, user_id, email, role, active, created_at, updated_at"
      )
      .maybeSingle();

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          error:
            error.message ||
            "Không thể cập nhật admin.",
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Admin không tồn tại." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Cập nhật admin thành công.",
      admin: data,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Có lỗi xảy ra khi cập nhật admin.",
      },
      { status: 500 }
    );
  }
}

/*
  DELETE
  Xóa admin khỏi website
*/
export async function DELETE(request) {
  try {
    const auth = await getGlobalAdmin(request);

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { supabaseAdmin } = auth;

    const { searchParams } = new URL(request.url);

    const id = Number(
      searchParams.get("id")
    );

    const websiteId = String(
      searchParams.get("website_id") || ""
    ).trim();

    if (!id || !websiteId) {
      return NextResponse.json(
        { error: "Thiếu thông tin admin." },
        { status: 400 }
      );
    }

    const website = await getWebsite(
      supabaseAdmin,
      websiteId
    );

    if (!website) {
      return NextResponse.json(
        { error: "Website không tồn tại." },
        { status: 404 }
      );
    }

    const { error } = await supabaseAdmin
      .from("website_admins")
      .delete()
      .eq("id", id)
      .eq("website_id", websiteId);

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          error:
            error.message ||
            "Không thể xóa admin.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Đã xóa admin khỏi website.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Có lỗi xảy ra khi xóa admin.",
      },
      { status: 500 }
    );
  }
}
