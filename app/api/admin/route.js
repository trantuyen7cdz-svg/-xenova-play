import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getAdmin(request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      status: 401,
      message: "Bạn chưa đăng nhập.",
    };
  }

  const token = authHeader.substring(7).trim();

  if (!token) {
    return {
      ok: false,
      status: 401,
      message: "Phiên đăng nhập không hợp lệ.",
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    console.error("ADMIN AUTH ERROR:", userError);

    return {
      ok: false,
      status: 401,
      message: "Phiên đăng nhập không hợp lệ.",
    };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id,username,email,role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("ADMIN PROFILE ERROR:", profileError);

    return {
      ok: false,
      status: 500,
      message: "Không thể kiểm tra quyền tài khoản.",
    };
  }

  if (!profile || profile.role !== "admin") {
    return {
      ok: false,
      status: 403,
      message: "Bạn không có quyền truy cập trang quản trị.",
    };
  }

  return {
    ok: true,
    user,
    profile,
  };
}

export async function GET(request) {
  try {
    const admin = await getAdmin(request);

    if (!admin.ok) {
      return NextResponse.json(
        {
          success: false,
          message: admin.message,
        },
        { status: admin.status }
      );
    }

    const [
      categoriesResult,
      productsResult,
      keysResult,
      ordersResult,
      profilesResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("product_categories")
        .select("id,name,active,demo_image_url")
        .order("id", { ascending: true }),

      supabaseAdmin
        .from("products")
        .select(
          "id,name,description,price,duration_days,active,is_active,demo_image_url,category_id,created_at"
        )
        .order("id", { ascending: true }),

      supabaseAdmin
        .from("keys")
        .select("id,key_code,product_id,status,user_id,expires_at,created_at")
        .order("id", { ascending: false }),

      supabaseAdmin
        .from("orders")
        .select("id,user_id,product_id,amount,status,created_at")
        .order("id", { ascending: false })
        .limit(100),

      supabaseAdmin
        .from("profiles")
        .select("id,username,email,role,created_at")
        .order("created_at", { ascending: false }),
    ]);

    if (categoriesResult.error) {
      console.error("ADMIN CATEGORY ERROR:", categoriesResult.error);
    }

    if (productsResult.error) {
      console.error("ADMIN PRODUCT ERROR:", productsResult.error);
    }

    if (keysResult.error) {
      console.error("ADMIN KEY ERROR:", keysResult.error);
    }

    if (ordersResult.error) {
      console.error("ADMIN ORDER ERROR:", ordersResult.error);
    }

    if (profilesResult.error) {
      console.error("ADMIN PROFILE LIST ERROR:", profilesResult.error);
    }

    const categories = categoriesResult.data || [];
    const products = productsResult.data || [];
    const keys = keysResult.data || [];
    const orders = ordersResult.data || [];
    const profiles = profilesResult.data || [];

    const stock = {};

    for (const product of products) {
      stock[product.id] = {
        total: 0,
        available: 0,
        sold: 0,
      };
    }

    for (const key of keys) {
      const productId = Number(key.product_id);

      if (!productId) {
        continue;
      }

      if (!stock[productId]) {
        stock[productId] = {
          total: 0,
          available: 0,
          sold: 0,
        };
      }

      stock[productId].total += 1;

      if (key.status === "available") {
        stock[productId].available += 1;
      } else {
        stock[productId].sold += 1;
      }
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.profile.id,
        username: admin.profile.username,
        email: admin.profile.email,
        role: admin.profile.role,
      },
      categories,
      products,
      keys,
      orders,
      profiles,
      stock,
    });
  } catch (error) {
    console.error("ADMIN GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Lỗi server.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const admin = await getAdmin(request);

    if (!admin.ok) {
      return NextResponse.json(
        {
          success: false,
          message: admin.message,
        },
        { status: admin.status }
      );
    }

    const body = await request.json();

    const action = String(body.action || "").trim();

    if (action === "create_category") {
      const name = String(body.name || "").trim();
      const imageUrl = String(body.demo_image_url || "").trim();

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            message: "Tên danh mục không được để trống.",
          },
          { status: 400 }
        );
      }

      const { data, error } = await supabaseAdmin
        .from("product_categories")
        .insert({
          name,
          active: true,
          demo_image_url: imageUrl || null,
        })
        .select("id,name,active,demo_image_url")
        .single();

      if (error) {
        console.error("CREATE CATEGORY ERROR:", error);

        return NextResponse.json(
          {
            success: false,
            message: error.message || "Không thể tạo danh mục.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Đã tạo danh mục.",
        category: data,
      });
    }

    if (action === "create_product") {
      const name = String(body.name || "").trim();
      const description = String(body.description || "").trim();
      const price = Number(body.price);
      const durationDays = Number(body.duration_days);
      const categoryId = Number(body.category_id);
      const imageUrl = String(body.demo_image_url || "").trim();

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            message: "Tên sản phẩm không được để trống.",
          },
          { status: 400 }
        );
      }

      if (!Number.isInteger(price) || price < 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Giá sản phẩm không hợp lệ.",
          },
          { status: 400 }
        );
      }

      if (!Number.isInteger(durationDays) || durationDays <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Số ngày sử dụng không hợp lệ.",
          },
          { status: 400 }
        );
      }

      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Danh mục không hợp lệ.",
          },
          { status: 400 }
        );
      }

      const { data, error } = await supabaseAdmin
        .from("products")
        .insert({
          name,
          description,
          price,
          duration_days: durationDays,
          active: true,
          is_active: true,
          demo_image_url: imageUrl || null,
          category_id: categoryId,
        })
        .select(
          "id,name,description,price,duration_days,active,is_active,demo_image_url,category_id,created_at"
        )
        .single();

      if (error) {
        console.error("CREATE PRODUCT ERROR:", error);

        return NextResponse.json(
          {
            success: false,
            message: error.message || "Không thể tạo sản phẩm.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Đã tạo sản phẩm.",
        product: data,
      });
    }

    if (action === "add_keys") {
      const productId = Number(body.product_id);
      const rawKeys = String(body.keys || "");

      if (!Number.isInteger(productId) || productId <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Sản phẩm không hợp lệ.",
          },
          { status: 400 }
        );
      }

      const { data: product, error: productError } = await supabaseAdmin
        .from("products")
        .select("id,name")
        .eq("id", productId)
        .maybeSingle();

      if (productError) {
        console.error("CHECK PRODUCT ERROR:", productError);

        return NextResponse.json(
          {
            success: false,
            message: "Không thể kiểm tra sản phẩm.",
          },
          { status: 500 }
        );
      }

      if (!product) {
        return NextResponse.json(
          {
            success: false,
            message: "Không tìm thấy sản phẩm.",
          },
          { status: 404 }
        );
      }

      const keyList = [
        ...new Set(
          rawKeys
            .split(/\r?\n/)
            .map((item) => item.trim())
            .filter(Boolean)
        ),
      ];

      if (keyList.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Chưa có KEY để nhập.",
          },
          { status: 400 }
        );
      }

      if (keyList.length > 5000) {
        return NextResponse.json(
          {
            success: false,
            message: "Mỗi lần chỉ được nhập tối đa 5.000 KEY.",
          },
          { status: 400 }
        );
      }

      const { data: existingKeys, error: existingError } =
        await supabaseAdmin
          .from("keys")
          .select("key_code")
          .in("key_code", keyList);

      if (existingError) {
        console.error("CHECK EXISTING KEYS ERROR:", existingError);

        return NextResponse.json(
          {
            success: false,
            message: "Không thể kiểm tra KEY trùng.",
          },
          { status: 500 }
        );
      }

      const existingSet = new Set(
        (existingKeys || []).map((item) => item.key_code)
      );

      const newKeys = keyList.filter(
        (keyCode) => !existingSet.has(keyCode)
      );

      if (newKeys.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Tất cả KEY đều đã tồn tại.",
            inserted: 0,
            duplicated: keyList.length,
          },
          { status: 400 }
        );
      }

      const rows = newKeys.map((keyCode) => ({
        key_code: keyCode,
        product_id: productId,
        status: "available",
      }));

      const { data: insertedKeys, error: insertError } =
        await supabaseAdmin
          .from("keys")
          .insert(rows)
          .select("id,key_code,product_id,status,created_at");

      if (insertError) {
        console.error("INSERT KEYS ERROR:", insertError);

        return NextResponse.json(
          {
            success: false,
            message: insertError.message || "Không thể nhập KEY.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Đã nhập ${insertedKeys?.length || 0} KEY.`,
        inserted: insertedKeys?.length || 0,
        duplicated: keyList.length - newKeys.length,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "Action không hợp lệ.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("ADMIN POST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Lỗi server.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const admin = await getAdmin(request);

    if (!admin.ok) {
      return NextResponse.json(
        {
          success: false,
          message: admin.message,
        },
        { status: admin.status }
      );
    }

    const body = await request.json();

    const action = String(body.action || "").trim();

    if (action === "update_category") {
      const id = Number(body.id);
      const name = String(body.name || "").trim();
      const active = Boolean(body.active);
      const imageUrl = String(body.demo_image_url || "").trim();

      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: "ID danh mục không hợp lệ.",
          },
          { status: 400 }
        );
      }

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            message: "Tên danh mục không được để trống.",
          },
          { status: 400 }
        );
      }

      const { data, error } = await supabaseAdmin
        .from("product_categories")
        .update({
          name,
          active,
          demo_image_url: imageUrl || null,
        })
        .eq("id", id)
        .select("id,name,active,demo_image_url")
        .single();

      if (error) {
        console.error("UPDATE CATEGORY ERROR:", error);

        return NextResponse.json(
          {
            success: false,
            message: error.message || "Không thể cập nhật danh mục.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Đã cập nhật danh mục.",
        category: data,
      });
    }

    if (action === "update_product") {
      const id = Number(body.id);
      const name = String(body.name || "").trim();
      const description = String(body.description || "").trim();
      const price = Number(body.price);
      const durationDays = Number(body.duration_days);
      const categoryId = Number(body.category_id);
      const imageUrl = String(body.demo_image_url || "").trim();
      const active = Boolean(body.active);
      const isActive = Boolean(body.is_active);

      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: "ID sản phẩm không hợp lệ.",
          },
          { status: 400 }
        );
      }

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            message: "Tên sản phẩm không được để trống.",
          },
          { status: 400 }
        );
      }

      if (!Number.isInteger(price) || price < 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Giá không hợp lệ.",
          },
          { status: 400 }
        );
      }

      if (!Number.isInteger(durationDays) || durationDays <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Số ngày không hợp lệ.",
          },
          { status: 400 }
        );
      }

      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Danh mục không hợp lệ.",
          },
          { status: 400 }
        );
      }

      const { data, error } = await supabaseAdmin
        .from("products")
        .update({
          name,
          description,
          price,
          duration_days: durationDays,
          active,
          is_active: isActive,
          demo_image_url: imageUrl || null,
          category_id: categoryId,
        })
        .eq("id", id)
        .select(
          "id,name,description,price,duration_days,active,is_active,demo_image_url,category_id,created_at"
        )
        .single();

      if (error) {
        console.error("UPDATE PRODUCT ERROR:", error);

        return NextResponse.json(
          {
            success: false,
            message: error.message || "Không thể cập nhật sản phẩm.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Đã cập nhật sản phẩm.",
        product: data,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "Action không hợp lệ.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("ADMIN PATCH ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Lỗi server.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const admin = await getAdmin(request);

    if (!admin.ok) {
      return NextResponse.json(
        {
          success: false,
          message: admin.message,
        },
        { status: admin.status }
      );
    }

    const body = await request.json();

    const action = String(body.action || "").trim();

    if (action === "delete_key") {
      const id = Number(body.id);

      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: "ID KEY không hợp lệ.",
          },
          { status: 400 }
        );
      }

      const { data: key, error: keyError } = await supabaseAdmin
        .from("keys")
        .select("id,status")
        .eq("id", id)
        .maybeSingle();

      if (keyError) {
        console.error("CHECK KEY DELETE ERROR:", keyError);

        return NextResponse.json(
          {
            success: false,
            message: "Không thể kiểm tra KEY.",
          },
          { status: 500 }
        );
      }

      if (!key) {
        return NextResponse.json(
          {
            success: false,
            message: "Không tìm thấy KEY.",
          },
          { status: 404 }
        );
      }

      if (key.status !== "available") {
        return NextResponse.json(
          {
            success: false,
            message: "Không thể xóa KEY đã bán.",
          },
          { status: 400 }
        );
      }

      const { error: deleteError } = await supabaseAdmin
        .from("keys")
        .delete()
        .eq("id", id)
        .eq("status", "available");

      if (deleteError) {
        console.error("DELETE KEY ERROR:", deleteError);

        return NextResponse.json(
          {
            success: false,
            message: deleteError.message || "Không thể xóa KEY.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Đã xóa KEY.",
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "Action không hợp lệ.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("ADMIN DELETE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Lỗi server.",
      },
      { status: 500 }
    );
  }
}
