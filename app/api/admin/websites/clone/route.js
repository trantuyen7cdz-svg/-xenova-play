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

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
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

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ============================================================
// POST
// /api/admin/websites/clone
//
// Nhân bản một website đang có (giao diện, theme, banner,
// danh mục, sản phẩm...) thành MỘT WEBSITE HOÀN TOÀN MỚI VÀ
// ĐỘC LẬP: khác slug, khác tên/thông tin, dữ liệu (đơn hàng,
// ví, key kho) tách biệt hoàn toàn với site gốc.
//
// Body:
// {
//   source_id: <id website muốn nhân bản giao diện>,
//   name: "Tên shop mới",
//   slug: "shop-moi",
//   domain, logo_url, banner_url, theme, bank_name,
//   bank_account_number, bank_account_name, payment_qr_url,
//   description  -> nếu không truyền thì lấy tạm theo site gốc
//                    (trừ name/slug luôn phải nhập riêng)
//   copy_categories: true/false (mặc định true)
//   copy_products: true/false (mặc định true)
// }
// ============================================================

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);

    if (!auth.ok) {
      return auth.response;
    }

    const { user, supabase } = auth;

    const body = await request.json();

    const sourceId = Number(body.source_id);

    if (!sourceId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Thiếu website nguồn để nhân bản.",
        },
        { status: 400 }
      );
    }

    const name = String(body.name || "").trim();
    const slug = slugify(body.slug);

    if (!name) {
      return NextResponse.json(
        {
          ok: false,
          error: "Vui lòng nhập tên website mới.",
        },
        { status: 400 }
      );
    }

    if (!slug || slug.length < 2) {
      return NextResponse.json(
        {
          ok: false,
          error: "Slug mới không hợp lệ (tối thiểu 2 ký tự).",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // Lấy website nguồn
    // --------------------------------------------------------

    const { data: source, error: sourceError } = await supabase
      .from("websites")
      .select("*")
      .eq("id", sourceId)
      .maybeSingle();

    if (sourceError) {
      return NextResponse.json(
        {
          ok: false,
          error: sourceError.message,
        },
        { status: 500 }
      );
    }

    if (!source) {
      return NextResponse.json(
        {
          ok: false,
          error: "Không tìm thấy website nguồn.",
        },
        { status: 404 }
      );
    }

    if (slug === source.slug) {
      return NextResponse.json(
        {
          ok: false,
          error: "Slug mới phải khác slug của website nguồn.",
        },
        { status: 400 }
      );
    }

    const copyCategories = body.copy_categories !== false;
    const copyProducts = body.copy_products !== false;

    // --------------------------------------------------------
    // Tạo website mới: giữ nguyên giao diện (theme/settings)
    // của site nguồn, nhưng dùng thông tin riêng do người
    // dùng nhập (tên, slug, domain, logo, banner, ngân hàng...)
    // --------------------------------------------------------

    const newWebsite = {
      name,
      slug,

      domain: body.domain ? String(body.domain).trim() : null,

      status: "active",

      logo_url: body.logo_url
        ? String(body.logo_url).trim()
        : source.logo_url || null,

      banner_url: body.banner_url
        ? String(body.banner_url).trim()
        : source.banner_url || null,

      theme: body.theme
        ? String(body.theme).trim()
        : source.theme || "pink",

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
        : source.description || null,

      owner_id: user.id,

      // Giữ nguyên các cấu hình giao diện khác (banners phụ,
      // bố cục...) của site gốc, chỉ đổi thông tin định danh.
      settings:
        source.settings && typeof source.settings === "object"
          ? source.settings
          : {},

      cloned_from: source.id,
    };

    let inserted;

    {
      const { data, error } = await supabase
        .from("websites")
        .insert(newWebsite)
        .select("*")
        .single();

      if (error) {
        // Nếu cột cloned_from chưa tồn tại trong DB, thử lại
        // không kèm cột đó để không chặn việc tạo site mới.
        if (
          error.code === "PGRST204" ||
          error.code === "42703" ||
          /cloned_from/i.test(error.message || "") ||
          /column .* does not exist/i.test(error.message || "")
        ) {
          const fallback = { ...newWebsite };
          delete fallback.cloned_from;

          const retry = await supabase
            .from("websites")
            .insert(fallback)
            .select("*")
            .single();

          if (retry.error) {
            if (
              retry.error.code === "23505" ||
              retry.error.message
                ?.toLowerCase()
                .includes("duplicate")
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
                error: retry.error.message,
              },
              { status: 500 }
            );
          }

          inserted = retry.data;
        } else if (
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
        } else {
          return NextResponse.json(
            {
              ok: false,
              error: error.message,
            },
            { status: 500 }
          );
        }
      } else {
        inserted = data;
      }
    }

    let copiedCategoryCount = 0;
    let copiedProductCount = 0;
    let categoryIdMap = new Map();

    // --------------------------------------------------------
    // Nhân bản danh mục (giữ cấu trúc cha/con)
    // --------------------------------------------------------

    if (copyCategories) {
      const { data: sourceCategories, error: catError } =
        await supabase
          .from("website_categories")
          .select("*")
          .eq("website_id", source.id)
          .order("id", { ascending: true });

      if (catError) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Tạo website thành công nhưng lỗi khi sao chép danh mục: " +
              catError.message,
            website: inserted,
          },
          { status: 207 }
        );
      }

      const remaining = [...(sourceCategories || [])];
      let guard = 0;

      // Chèn theo tầng: cha trước, con sau, để map lại
      // parent_id đúng sang bộ id mới.
      while (remaining.length > 0 && guard < 50) {
        guard++;

        const batch = remaining.filter(
          (category) =>
            category.parent_id === null ||
            category.parent_id === undefined ||
            categoryIdMap.has(Number(category.parent_id))
        );

        if (batch.length === 0) {
          // Vòng lặp cha/con bất thường, chèn phần còn lại
          // như danh mục gốc (không cha) để không kẹt lại.
          batch.push(...remaining);
        }

        const payload = batch.map((category) => ({
          website_id: inserted.id,
          name: category.name,
          description: category.description || "",
          image_url: category.image_url || null,
          parent_id:
            category.parent_id === null ||
            category.parent_id === undefined
              ? null
              : categoryIdMap.get(Number(category.parent_id)) ??
                null,
          active:
            category.active === undefined
              ? true
              : category.active,
        }));

        const { data: insertedBatch, error: insertCatError } =
          await supabase
            .from("website_categories")
            .insert(payload)
            .select("*");

        if (insertCatError) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "Tạo website thành công nhưng lỗi khi sao chép danh mục: " +
                insertCatError.message,
              website: inserted,
            },
            { status: 207 }
          );
        }

        insertedBatch.forEach((newCategory, index) => {
          categoryIdMap.set(
            Number(batch[index].id),
            newCategory.id
          );
        });

        copiedCategoryCount += insertedBatch.length;

        for (const category of batch) {
          const position = remaining.indexOf(category);
          if (position !== -1) remaining.splice(position, 1);
        }
      }
    }

    // --------------------------------------------------------
    // Nhân bản sản phẩm (map lại category_id sang site mới)
    //
    // LƯU Ý: KHÔNG sao chép website_keys (key/kho hàng thật).
    // Shop mới là một shop độc lập, kho hàng phải được admin
    // của shop mới tự nhập, tránh bán trùng key với shop gốc.
    // --------------------------------------------------------

    if (copyProducts) {
      const { data: sourceProducts, error: prodError } =
        await supabase
          .from("website_products")
          .select("*")
          .eq("website_id", source.id)
          .order("id", { ascending: true });

      if (prodError) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Tạo website thành công nhưng lỗi khi sao chép sản phẩm: " +
              prodError.message,
            website: inserted,
          },
          { status: 207 }
        );
      }

      if ((sourceProducts || []).length > 0) {
        const payload = sourceProducts.map((product) => ({
          website_id: inserted.id,
          name: product.name,
          description: product.description || "",
          price: product.price,
          duration_days:
            product.duration_days === undefined
              ? null
              : product.duration_days,
          category_id:
            product.category_id === null ||
            product.category_id === undefined
              ? null
              : categoryIdMap.get(Number(product.category_id)) ??
                null,
          image_url: product.image_url || null,
          active:
            product.active === undefined
              ? true
              : product.active,
        }));

        const { data: insertedProducts, error: insertProdError } =
          await supabase
            .from("website_products")
            .insert(payload)
            .select("*");

        if (insertProdError) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "Tạo website thành công nhưng lỗi khi sao chép sản phẩm: " +
                insertProdError.message,
              website: inserted,
            },
            { status: 207 }
          );
        }

        copiedProductCount = insertedProducts.length;
      }
    }

    return NextResponse.json(
      {
        ok: true,
        message: `Đã nhân bản giao diện thành công thành website riêng biệt "${inserted.name}".`,
        website: inserted,
        copied: {
          categories: copiedCategoryCount,
          products: copiedProductCount,
        },
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
