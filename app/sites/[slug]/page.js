import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import WebsiteShopPage from "./WebsiteShopPage";

export const dynamic = "force-dynamic";

async function getWebsite(slug) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase
    .from("websites")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("Website query error:", error);
    return null;
  }

  return data;
}

export default async function WebsitePage({ params }) {
  const { slug } = await params;

  const website = await getWebsite(slug);

  if (!website) {
    notFound();
  }

  return <WebsiteShopPage website={website} />;
}
