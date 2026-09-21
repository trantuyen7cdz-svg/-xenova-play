import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function checkAdmin(request, slug) {
  const auth = request.headers.get("authorization") || "";

  if (!auth.startsWith("Bearer ")) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const token = auth.slice(7);
  const supabase = getAdminClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      ),
    };
  }

  const { data: website, error: websiteError } =
    await supabase
      .from("websites")
      .select("id,name,slug,status")
      .eq("slug", slug)
      .maybeSingle();

  if (websiteError || !website) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Website not found" },
        { status: 404 }
      ),
    };
  }

  const { data: admin, error: adminError } =
    await supabase
      .from("website_admins")
      .select("id,role,active")
      .eq("website_id", website.id)
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();

  if (adminError || !admin) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "You are not an admin of this website" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    supabase,
    website,
    user,
    admin,
  };
}

export async function GET(request, { params }) {
  const { slug } = await params;

  const auth = await checkAdmin(request, slug);

  if (!auth.ok) return auth.response;

  const { supabase, website } = auth;

  const { data, error } = await supabase
    .from("website_categories")
    .select("*")
    .eq("website_id", website.id)
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    categories: data || [],
  });
}

export async function POST(request, { params }) {
  const { slug } = await params;

  const auth = await checkAdmin(request, slug);

  if (!auth.ok) return auth.response;

  const { supabase, website } = auth;

  const body = await request.json();

  const name = String(body.name || "").trim();
  const description = String(
    body.description || ""
  ).trim();

  const parentId =
    body.parent_id === null ||
    body.parent_id === undefined ||
    body.parent_id === ""
      ? null
      : Number(body.parent_id);

  if (!name) {
    return NextResponse.json(
      { error: "Tên danh mục không được để trống" },
      { status: 400 }
    );
  }

  if (parentId !== null) {
    const { data: parent } = await supabase
      .from("website_categories")
      .select("id")
      .eq("id", parentId)
      .eq("website_id", website.id)
      .maybeSingle();

    if (!parent) {
      return NextResponse.json(
        { error: "Danh mục cha không hợp lệ" },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabase
    .from("website_categories")
    .insert({
      website_id: website.id,
      name,
      description,
      parent_id: parentId,
      active: true,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    category: data,
  });
}

export async function PATCH(request, { params }) {
  const { slug } = await params;

  const auth = await checkAdmin(request, slug);

  if (!auth.ok) return auth.response;

  const { supabase, website } = auth;

  const body = await request.json();

  const id = Number(body.id);

  if (!id) {
    return NextResponse.json(
      { error: "Thiếu ID danh mục" },
      { status: 400 }
    );
  }

  const update = {};

  if (body.name !== undefined) {
    update.name = String(body.name).trim();
  }

  if (body.description !== undefined) {
    update.description = String(
      body.description || ""
    ).trim();
  }

  if (body.active !== undefined) {
    update.active = Boolean(body.active);
  }

  if (body.parent_id !== undefined) {
    update.parent_id =
      body.parent_id === null ||
      body.parent_id === ""
        ? null
        : Number(body.parent_id);
  }

  const { data, error } = await supabase
    .from("website_categories")
    .update(update)
    .eq("id", id)
    .eq("website_id", website.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    category: data,
  });
}

export async function DELETE(request, { params }) {
  const { slug } = await params;

  const auth = await checkAdmin(request, slug);

  if (!auth.ok) return auth.response;

  const { supabase, website } = auth;

  const { searchParams } = new URL(
    request.url
  );

  const id = Number(searchParams.get("id"));

  if (!id) {
    return NextResponse.json(
      { error: "Thiếu ID danh mục" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("website_categories")
    .delete()
    .eq("id", id)
    .eq("website_id", website.id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
  });
}
