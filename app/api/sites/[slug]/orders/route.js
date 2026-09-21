import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function getCurrentUser(supabase, request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

async function getWebsite(supabase, slug) {
  const { data, error } = await supabase
    .from("websites")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("WEBSITE QUERY ERROR:", error);
    return null;
  }

  return data;
}

export async function POST(request, { params }) {
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

    const supabase = getSupabaseAdmin();

    const website = await getWebsite(
      supabase,
      slug
    );

    if (!website) {
      return NextResponse.json(
        {
          success: false,
          error: "Website không tồn tại hoặc đang tắt",
        },
        { status: 404 }
      );
    }

    const user = await getCurrentUser(
      supabase,
      request
    );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Vui lòng đăng nhập",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const productId = Number(body?.product_id);
    const quantity = Math.max(
      1,
      Number(body?.quantity || 1)
    );

    if (
      !Number.isInteger(productId) ||
      productId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Sản phẩm không hợp lệ",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      quantity > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Số lượng không hợp lệ",
        },
        { status: 400 }
      );
    }

    const {
      data: product,
      error: productError,
    } = await supabase
      .from("website_products")
      .select(
        `
          id,
          website_id,
          category_id,
          name,
          description,
          price,
          duration_days,
          image_url,
          active
        `
      )
      .eq("id", productId)
      .eq("website_id", website.id)
      .eq("active", true)
      .maybeSingle();

    if (productError) {
      console.error(
        "PRODUCT QUERY ERROR:",
        productError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Không thể kiểm tra sản phẩm",
        },
        { status: 500 }
      );
    }

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: "Sản phẩm không tồn tại",
        },
        { status: 404 }
      );
    }

    const unitPrice = Number(product.price || 0);

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Giá sản phẩm không hợp lệ",
        },
        { status: 400 }
      );
    }

    const totalAmount =
      unitPrice * quantity;

    const customerName =
      typeof body?.customer_name === "string"
        ? body.customer_name.trim()
        : null;

    const customerEmail =
      typeof body?.customer_email === "string"
        ? body.customer_email.trim()
        : user.email || null;

    const customerPhone =
      typeof body?.customer_phone === "string"
        ? body.customer_phone.trim()
        : null;

    const note =
      typeof body?.note === "string"
        ? body.note.trim()
        : null;

    const { data: order, error: orderError } =
      await supabase
        .from("website_orders")
        .insert({
          website_id: website.id,
          user_id: user.id,
          product_id: product.id,
          product_name: product.name,
          quantity,
          unit_price: unitPrice,
          total_amount: totalAmount,
          status: "pending",
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          note,
        })
        .select("*")
        .single();

    if (orderError) {
      console.error(
        "CREATE WEBSITE ORDER ERROR:",
        orderError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Không thể tạo đơn hàng",
          detail: orderError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
      website: {
        id: website.id,
        name: website.name,
        slug: website.slug,
      },
      product: {
        id: product.id,
        name: product.name,
        price: unitPrice,
      },
      payment: {
        amount: totalAmount,
        bank_name: website.bank_name || "",
        bank_account_number:
          website.bank_account_number || "",
        bank_account_name:
          website.bank_account_name || "",
        payment_qr_url:
          website.payment_qr_url || "",
      },
    });
  } catch (error) {
    console.error(
      "WEBSITE ORDER POST ERROR:",
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


export async function GET(request, { params }) {
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

    const supabase = getSupabaseAdmin();

    const website = await getWebsite(
      supabase,
      slug
    );

    if (!website) {
      return NextResponse.json(
        {
          success: false,
          error: "Website không tồn tại hoặc đang tắt",
        },
        { status: 404 }
      );
    }

    const user = await getCurrentUser(
      supabase,
      request
    );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Vui lòng đăng nhập",
        },
        { status: 401 }
      );
    }

    const { data: orders, error } =
      await supabase
        .from("website_orders")
        .select("*")
        .eq("website_id", website.id)
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      console.error(
        "GET WEBSITE ORDERS ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error: "Không thể lấy đơn hàng",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orders: orders || [],
    });
  } catch (error) {
    console.error(
      "WEBSITE ORDER GET ERROR:",
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
