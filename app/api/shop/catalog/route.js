import { NextResponse } from “next/server”;
import { createClient } from “@supabase/supabase-js”;

const supabaseAdmin = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL,
process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
try {
const { data: categories, error: categoryError } =
await supabaseAdmin
.from(“product_categories”)
.select(“id,name,active,demo_image_url”)
.eq(“active”, true)
.order(“id”, { ascending: true });

if (categoryError) {
  console.error("CATALOG CATEGORY ERROR:", categoryError);
  return NextResponse.json(
    {
      success: false,
      message: "Không thể tải danh mục sản phẩm.",
    },
    { status: 500 }
  );
}
const { data: products, error: productError } =
  await supabaseAdmin
    .from("products")
    .select(
      "id,name,description,price,duration_days,active,is_active,demo_image_url,category_id"
    )
    .eq("active", true)
    .eq("is_active", true)
    .order("id", { ascending: true });
if (productError) {
  console.error("CATALOG PRODUCT ERROR:", productError);
  return NextResponse.json(
    {
      success: false,
      message: "Không thể tải sản phẩm.",
    },
    { status: 500 }
  );
}
return NextResponse.json({
  success: true,
  categories: categories || [],
  products: products || [],
});

} catch (error) {
console.error(“CATALOG API ERROR:”, error);

return NextResponse.json(
  {
    success: false,
    message: "Lỗi server.",
  },
  { status: 500 }
);

}
}
