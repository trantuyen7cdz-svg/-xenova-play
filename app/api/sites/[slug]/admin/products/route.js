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

  const { data: website } = await supabase
    .from("websites")
    .select("id,name,slug,status")
    .eq("slug", slug)
    .maybeSingle();

  if (!website) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Website not found" },
        { status: 404 }
      ),
    };
  }

  const { data: admin } = await supabase
    .from("website_admins")
    .select("id,role,active")
    .eq("website_id", website.id)
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (!admin) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    supabase,
    website,
  };
}

export async function GET(request, { params }) {
  const { slug } = await params;

  const auth = await checkAdmin(request, slug);

  if (!auth.ok) return auth.response;

  const { supabase, website } = auth;

  const { data, error } = await supabase
    .from("website_products")
    .select("*")
    .eq("website_id", website.id)
    .order("id", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    products: data || [],
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

  const price = Number(body.price || 0);

  const durationDays =
    body.duration_days === "" ||
    body.duration_days === null ||
    body.duration_days === undefined
      ? null
      : Number(body.duration_days);

  const categoryId =
    body.category_id === "" ||
    body.category_id === null ||
    body.category_id === undefined
      ? null
      : Number(body.category_id);

  if (!name) {
    return NextResponse.json(
      { error: "Tên sản phẩm không được để trống" },
      { status: 400 }
    );
  }

  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json(
      { error: "Giá sản phẩm không hợp lệ" },
      { status: 400 }
    );
  }

  if (categoryId !== null) {
    const { data: category } =
      await supabase
        .from("website_categories")
        .select("id")
        .eq("id", categoryId)
        .eq("website_id", website.id)
        .maybeSingle();

    if (!category) {
      return NextResponse.json(
        { error: "Danh mục không thuộc website này" },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabase
    .from("website_products")
    .insert({
      website_id: website.id,
      category_id: categoryId,
      name,
      description,
      price,
      duration_days: durationDays,
      image_url:
        body.image_url
          ? String(body.image_url)
          : null,
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
    product: data,
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
      { error: "Thiếu ID sản phẩm" },
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

  if (body.price !== undefined) {
    update.price = Number(body.price);
  }

  if (body.duration_days !== undefined) {
    update.duration_days =
      body.duration_days === "" ||
      body.duration_days === null
        ? null
        : Number(body.duration_days);
  }

  if (body.category_id !== undefined) {
    update.category_id =
      body.category_id === "" ||
      body.category_id === null
        ? null
        : Number(body.category_id);
  }

  if (body.image_url !== undefined) {
    update.image_url =
      body.image_url || null;
  }

  if (body.active !== undefined) {
    update.active = Boolean(body.active);
  }

  const { data, error } = await supabase
    .from("website_products")
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
    product: data,
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
      { error: "Thiếu ID sản phẩm" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("website_products")
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
