import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getWebsiteBySlug,
  getWebsiteSession,
} from "@/lib/websiteAuth";

export const dynamic = "force-dynamic";

async function getSite(slug) {
  if (!slug) return null;

  return await getWebsiteBySlug(slug);
}

export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    const website = await getSite(slug);

    if (!website) {
      return NextResponse.json(
        {
          error: "Website không tồn tại",
        },
        { status: 404 }
      );
    }

    const session = await getWebsiteSession(website);

    if (!session) {
      return NextResponse.json(
        {
          error: "Bạn chưa đăng nhập",
        },
        { status: 401 }
      );
    }

    if (session.websiteId !== website.id) {
      return NextResponse.json(
        {
          error: "Phiên đăng nhập không hợp lệ",
        },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("website_orders")
      .select(`
        id,
        website_id,
        user_id,
        product_id,
        product_name,
        quantity,
        unit_price,
        total_amount,
        status,
        customer_name,
        customer_email,
        customer_phone,
        customer_note,
        key_value,
        created_at,
        updated_at
      `)
      .eq("website_id", website.id)
      .eq("user_id", session.userId)
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
          error: "Không thể tải đơn hàng",
          detail: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      orders: data || [],
    });
  } catch (error) {
    console.error(
      "GET SITE ORDERS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Lỗi máy chủ",
      },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { slug } = await params;

    const website = await getSite(slug);

    if (!website) {
      return NextResponse.json(
        {
          error: "Website không tồn tại",
        },
        { status: 404 }
      );
    }

    const session = await getWebsiteSession(website);

    if (!session) {
      return NextResponse.json(
        {
          error: "Bạn chưa đăng nhập",
        },
        { status: 401 }
      );
    }

    if (session.websiteId !== website.id) {
      return NextResponse.json(
        {
          error: "Phiên đăng nhập không hợp lệ",
        },
        { status: 401 }
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Dữ liệu gửi lên không hợp lệ",
        },
        { status: 400 }
      );
    }

    const productId = Number(body?.product_id);
    const quantity = Number(body?.quantity || 1);

    if (
      !Number.isInteger(productId) ||
      productId <= 0
    ) {
      return NextResponse.json(
        {
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
          error: "Số lượng không hợp lệ",
        },
        { status: 400 }
      );
    }

    const { data: product, error: productError } =
      await supabaseAdmin
        .from("website_products")
        .select(`
          id,
          website_id,
          category_id,
          name,
          description,
          price,
          duration_days,
          image_url,
          active
        `)
        .eq("id", productId)
        .eq("website_id", website.id)
        .eq("active", true)
        .maybeSingle();

    if (productError) {
      console.error(
        "GET WEBSITE PRODUCT ERROR:",
        productError
      );

      return NextResponse.json(
        {
          error: "Không thể kiểm tra sản phẩm",
        },
        { status: 500 }
      );
    }

    if (!product) {
      return NextResponse.json(
        {
          error: "Sản phẩm không tồn tại hoặc đã ngừng bán",
        },
        { status: 404 }
      );
    }

    const unitPrice = Number(product.price);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return NextResponse.json(
        {
          error: "Giá sản phẩm không hợp lệ",
        },
        { status: 500 }
      );
    }

    const totalAmount =
      unitPrice * quantity;

    const customerName =
      body?.customer_name || null;

    const customerEmail =
      body?.customer_email || null;

    const customerPhone =
      body?.customer_phone || null;

    const customerNote =
      body?.customer_note || null;

    const { data: order, error: orderError } =
      await supabaseAdmin
        .from("website_orders")
        .insert({
          website_id: website.id,
          user_id: session.userId,

          product_id: product.id,
          product_name: product.name,

          quantity,
          unit_price: unitPrice,
          total_amount: totalAmount,

          status: "pending",

          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          customer_note: customerNote,

          key_value: null,
        })
        .select(`
          id,
          website_id,
          user_id,
          product_id,
          product_name,
          quantity,
          unit_price,
          total_amount,
          status,
          customer_name,
          customer_email,
          customer_phone,
          customer_note,
          key_value,
          created_at,
          updated_at
        `)
        .single();

    if (orderError) {
      console.error(
        "CREATE WEBSITE ORDER ERROR:",
        orderError
      );

      return NextResponse.json(
        {
          error: "Không thể tạo đơn hàng",
          detail: orderError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        order,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST SITE ORDERS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Lỗi máy chủ",
      },
      { status: 500 }
    );
  }
}
