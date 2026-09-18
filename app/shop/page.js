"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ShopPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState({});

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState("");
  const [successKey, setSuccessKey] = useState(null);

  useEffect(() => {
    loadShop();
  }, []);

  async function loadShop() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      setUser(currentUser || null);

      const [categoriesResult, productsResult, stockResult] =
        await Promise.all([
          supabase
            .from("product_categories")
            .select("id,name,active,demo_image_url")
            .eq("active", true)
            .order("id", { ascending: true }),

          supabase
            .from("products")
            .select(`
              id,
              name,
              description,
              price,
              duration_days,
              active,
              is_active,
              demo_image_url,
              category_id
            `)
            .eq("active", true)
            .eq("is_active", true)
            .order("id", { ascending: true }),

          fetch("/api/shop/stock").then(async (res) => {
            if (!res.ok) return { success: false };

            try {
              return await res.json();
            } catch {
              return { success: false };
            }
          }),
        ]);

      if (categoriesResult.error) {
        throw new Error(
          "Không thể tải danh mục: " +
            categoriesResult.error.message
        );
      }

      if (productsResult.error) {
        throw new Error(
          "Không thể tải sản phẩm: " +
            productsResult.error.message
        );
      }

      setCategories(categoriesResult.data || []);
      setProducts(productsResult.data || []);

      if (stockResult?.success) {
        setStock(stockResult.stock || {});
      } else {
        setStock({});
      }

      if (currentUser) {
        await loadWallet(currentUser.id);
      }
    } catch (err) {
      console.error("SHOP LOAD ERROR:", err);

      setError(
        err?.message || "Không thể tải cửa hàng."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadWallet(userId) {
    try {
      const { data, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("WALLET ERROR:", error);
        return;
      }

      setWallet(data || null);
    } catch (err) {
      console.error("LOAD WALLET ERROR:", err);
    }
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("vi-VN");
  }

  function getCategoryProducts(categoryId) {
    return products.filter(
      (product) =>
        Number(product.category_id) === Number(categoryId)
    );
  }

  function getProductStock(productId) {
    return Number(stock?.[String(productId)] || 0);
  }

  function getCategoryStock(categoryId) {
    return getCategoryProducts(categoryId).reduce(
      (total, product) =>
        total + getProductStock(product.id),
      0
    );
  }

  function openCategory(category) {
    setSelectedCategory(category);
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function backToCategories() {
    setSelectedCategory(null);
    setSelectedProduct(null);
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleBuyClick(product) {
    setError("");

    if (!user) {
      router.push("/login");
      return;
    }

    if (getProductStock(product.id) <= 0) {
      setError("Sản phẩm này hiện đã hết KEY.");
      return;
    }

    setSelectedProduct(product);
  }

  async function confirmBuy() {
    if (!selectedProduct || buying) return;

    if (!user) {
      router.push("/login");
      return;
    }

    setBuying(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/buy-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.message || "Mua KEY thất bại."
        );
      }

      setSelectedProduct(null);
      setSuccessKey(data);

      await Promise.all([
        loadWallet(user.id),
        reloadStock(),
      ]);
    } catch (err) {
      console.error("BUY KEY ERROR:", err);

      setError(
        err?.message || "Không thể mua KEY."
      );
    } finally {
      setBuying(false);
    }
  }

  async function reloadStock() {
    try {
      const response = await fetch(
        "/api/shop/stock",
        { cache: "no-store" }
      );

      if (!response.ok) return;

      const data = await response.json();

      if (data?.success) {
        setStock(data.stock || {});
      }
    } catch (err) {
      console.error("STOCK REFRESH ERROR:", err);
    }
  }

  const selectedProducts = useMemo(() => {
    if (!selectedCategory) return [];

    return getCategoryProducts(
      selectedCategory.id
    );
  }, [selectedCategory, products]);

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <main className="x-shop-page">
      <style>{`
        .x-shop-page {
          min-height: 100vh;
          background: #f5f7fb;
          color: #151922;
          padding: 78px 16px 70px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .x-shop-container {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
        }

        .x-shop-hero {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          padding: 38px;
          margin-bottom: 28px;
          background:
            radial-gradient(circle at 90% 15%, rgba(255,71,87,.16), transparent 30%),
            radial-gradient(circle at 10% 100%, rgba(255,71,87,.10), transparent 30%),
            #ffffff;
          border: 1px solid #e7eaf0;
          box-shadow: 0 15px 45px rgba(20,30,50,.07);
        }

        .x-shop-hero:after {
          content: "";
          position: absolute;
          width: 220px;
          height: 220px;
          right: -90px;
          top: -100px;
          border-radius: 50%;
          background: rgba(255,48,63,.06);
        }

        .x-brand {
          color: #ff3344;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 4px;
          margin-bottom: 9px;
        }

        .x-shop-title {
          margin: 0;
          font-size: clamp(28px, 5vw, 46px);
          line-height: 1;
          font-weight: 950;
          letter-spacing: -1.5px;
        }

        .x-shop-description {
          margin: 12px 0 0;
          color: #747b89;
          font-size: 14px;
        }

        .x-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 24px;
        }

        .x-primary-button,
        .x-secondary-button {
          border: 0;
          border-radius: 11px;
          padding: 13px 18px;
          font-weight: 900;
          cursor: pointer;
          transition: .2s ease;
        }

        .x-primary-button {
          color: #fff;
          background: linear-gradient(135deg,#ff3b4d,#e7192f);
          box-shadow: 0 9px 25px rgba(235,30,50,.22);
        }

        .x-secondary-button {
          color: #252b35;
          background: #f0f2f6;
          border: 1px solid #e0e4eb;
        }

        .x-primary-button:hover,
        .x-secondary-button:hover {
          transform: translateY(-2px);
        }

        .x-section {
          margin-top: 25px;
        }

        .x-section-head {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 15px;
          margin-bottom: 15px;
        }

        .x-section-title {
          font-size: 21px;
          font-weight: 950;
          letter-spacing: -.3px;
        }

        .x-section-subtitle {
          margin-top: 5px;
          color: #8a919e;
          font-size: 13px;
        }

        .x-category-grid {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 18px;
        }

        .x-category-card {
          position: relative;
          overflow: hidden;
          min-width: 0;
          padding: 0;
          text-align: left;
          border: 1px solid #e4e7ed;
          border-radius: 18px;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 8px 25px rgba(30,40,60,.06);
          transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
        }

        .x-category-card:hover {
          transform: translateY(-5px);
          border-color: #ff9aa3;
          box-shadow: 0 17px 38px rgba(30,40,60,.12);
        }

        .x-category-image {
          position: relative;
          height: 190px;
          overflow: hidden;
          background: #eef1f5;
        }

        .x-category-image img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform .35s ease;
        }

        .x-category-card:hover .x-category-image img {
          transform: scale(1.055);
        }

        .x-category-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(0,0,0,.68),
            rgba(0,0,0,0) 65%
          );
        }

        .x-category-icon {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 58px;
        }

        .x-category-stock {
          position: absolute;
          right: 12px;
          top: 12px;
          padding: 6px 9px;
          border-radius: 999px;
          color: #fff;
          background: rgba(0,0,0,.58);
          backdrop-filter: blur(8px);
          font-size: 11px;
          font-weight: 900;
        }

        .x-category-body {
          padding: 16px;
        }

        .x-category-name {
          font-size: 19px;
          font-weight: 950;
          color: #171b23;
        }

        .x-category-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-top: 9px;
          color: #8a919e;
          font-size: 12px;
        }

        .x-view {
          color: #ef263a;
          font-weight: 900;
          white-space: nowrap;
        }

        .x-error {
          margin: 0 0 18px;
          padding: 13px 15px;
          border: 1px solid #ffc8ce;
          border-radius: 12px;
          color: #b51f2f;
          background: #fff1f3;
          font-size: 13px;
          font-weight: 700;
        }

        .x-category-page-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .x-back {
          border: 1px solid #e0e4eb;
          background: #fff;
          color: #252b35;
          padding: 11px 15px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 900;
          transition: .2s ease;
        }

        .x-back:hover {
          transform: translateX(-2px);
          border-color: #ff929c;
        }

        .x-balance {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 13px;
          border-radius: 11px;
          background: #fff;
          border: 1px solid #e3e7ee;
          box-shadow: 0 6px 18px rgba(20,30,50,.05);
          font-size: 13px;
          font-weight: 900;
        }

        .x-balance-label {
          color: #969daa;
          font-size: 10px;
        }

        .x-category-hero {
          position: relative;
          height: 260px;
          overflow: hidden;
          border-radius: 20px;
          margin-bottom: 25px;
          background: #16191f;
          box-shadow: 0 12px 35px rgba(20,25,35,.12);
        }

        .x-category-hero img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .x-category-hero:after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(0,0,0,.82),
            rgba(0,0,0,.08)
          );
        }

        .x-category-hero-content {
          position: absolute;
          z-index: 2;
          left: 25px;
          right: 25px;
          bottom: 22px;
          color: #fff;
        }

        .x-category-hero-small {
          color: #ff6976;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 3px;
        }

        .x-category-hero-title {
          margin: 5px 0;
          font-size: clamp(25px,5vw,37px);
          font-weight: 950;
        }

        .x-category-hero-count {
          color: #d2d5da;
          font-size: 13px;
        }

        .x-product-grid {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 18px;
        }

        .x-product {
          overflow: hidden;
          border: 1px solid #e4e7ed;
          border-radius: 17px;
          background: #fff;
          box-shadow: 0 8px 25px rgba(30,40,60,.06);
          transition: .22s ease;
        }

        .x-product:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 35px rgba(30,40,60,.11);
        }

        .x-product-image {
          height: 190px;
          overflow: hidden;
          background: #eef1f5;
        }

        .x-product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform .3s ease;
        }

        .x-product:hover .x-product-image img {
          transform: scale(1.05);
        }

        .x-no-image {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 58px;
        }

        .x-product-body {
          padding: 17px;
        }

        .x-product-name {
          font-size: 18px;
          font-weight: 950;
        }

        .x-product-description {
          min-height: 19px;
          margin-top: 7px;
          color: #818895;
          font-size: 12px;
          line-height: 1.5;
        }

        .x-product-data {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 14px;
        }

        .x-product-data-box {
          padding: 10px;
          border-radius: 10px;
          background: #f5f6f8;
        }

        .x-product-data-label {
          display: block;
          margin-bottom: 4px;
          color: #9ca2ad;
          font-size: 9px;
          font-weight: 900;
        }

        .x-product-price {
          color: #ed2539;
          font-size: 16px;
          font-weight: 950;
        }

        .x-stock-ok {
          color: #159456;
          font-weight: 900;
        }

        .x-stock-empty {
          color: #b2b6be;
          font-weight: 900;
        }

        .x-buy {
          width: 100%;
          margin-top: 12px;
          border: 0;
          border-radius: 10px;
          padding: 13px;
          color: #fff;
          background: linear-gradient(135deg,#ff3b4d,#e7192f);
          cursor: pointer;
          font-weight: 950;
          transition: .2s ease;
        }

        .x-buy:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 9px 22px rgba(235,30,50,.22);
        }

        .x-buy:disabled {
          cursor: not-allowed;
          background: #dfe2e7;
          color: #9297a0;
        }

        .x-empty {
          padding: 55px 20px;
          text-align: center;
          border: 1px solid #e4e7ed;
          border-radius: 17px;
          background: #fff;
          color: #858b96;
        }

        .x-empty-icon {
          font-size: 45px;
          margin-bottom: 9px;
        }

        .x-footer {
          padding-top: 38px;
          text-align: center;
          color: #a0a5ae;
          font-size: 11px;
        }

        .x-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 15px;
          background: rgba(9,12,17,.72);
          backdrop-filter: blur(7px);
          animation: xFade .18s ease;
        }

        .x-modal {
          width: 100%;
          max-width: 450px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 20px;
          box-sizing: border-box;
          border-radius: 19px;
          background: #fff;
          color: #151922;
          box-shadow: 0 25px 80px rgba(0,0,0,.3);
          animation: xModal .2s ease;
        }

        .x-modal-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .x-modal-small {
          color: #ef263a;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .x-modal-title {
          margin-top: 4px;
          font-size: 20px;
          font-weight: 950;
        }

        .x-close {
          width: 35px;
          height: 35px;
          border: 1px solid #e1e4e9;
          border-radius: 50%;
          background: #f5f6f8;
          color: #252b35;
          font-size: 22px;
          cursor: pointer;
        }

        .x-modal-image {
          width: 100%;
          max-height: 220px;
          object-fit: cover;
          border-radius: 12px;
          margin-bottom: 14px;
        }

        .x-confirm-box {
          padding: 14px;
          border-radius: 12px;
          background: #f6f7f9;
        }

        .x-confirm-name {
          margin-bottom: 9px;
          font-size: 18px;
          font-weight: 950;
        }

        .x-confirm-row {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 9px 0;
          border-bottom: 1px solid #e6e8ec;
          color: #858b96;
          font-size: 13px;
        }

        .x-confirm-price {
          color: #ed2539;
          font-weight: 950;
        }

        .x-warning {
          margin-top: 12px;
          padding: 11px;
          border-radius: 9px;
          color: #946c13;
          background: #fff8df;
          border: 1px solid #f2dfa3;
          font-size: 12px;
          font-weight: 700;
        }

        .x-modal-actions {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 9px;
          margin-top: 15px;
        }

        .x-cancel,
        .x-confirm {
          border: 0;
          border-radius: 10px;
          padding: 12px;
          cursor: pointer;
          font-weight: 950;
        }

        .x-cancel {
          background: #f0f2f5;
          color: #303640;
        }

        .x-confirm {
          color: #fff;
          background: linear-gradient(135deg,#ff3b4d,#e7192f);
        }

        .x-confirm:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .x-success {
          width: 100%;
          max-width: 420px;
          padding: 25px;
          box-sizing: border-box;
          text-align: center;
          border-radius: 19px;
          background: #fff;
          box-shadow: 0 25px 80px rgba(0,0,0,.3);
          animation: xModal .2s ease;
        }

        .x-success-icon {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 15px;
          border-radius: 50%;
          background: #e8fff2;
          color: #159456;
          font-size: 34px;
          font-weight: 950;
        }

        .x-success-title {
          font-size: 21px;
          font-weight: 950;
        }

        .x-success-product {
          margin-top: 6px;
          color: #858b96;
        }

        .x-key-box {
          margin: 20px 0 15px;
          padding: 17px;
          border-radius: 11px;
          background: #f5f6f8;
          border: 1px solid #e4e7ed;
        }

        .x-key-label {
          color: #969daa;
          font-size: 10px;
          font-weight: 900;
          margin-bottom: 8px;
        }

        .x-key {
          color: #ed2539;
          font-size: 20px;
          font-weight: 950;
          word-break: break-all;
          letter-spacing: 1px;
        }

        .x-success-info {
          color: #858b96;
          font-size: 13px;
          margin-bottom: 15px;
        }

        .x-loading {
          min-height: 100vh;
          padding: 120px 16px;
          box-sizing: border-box;
          background: #f5f7fb;
        }

        .x-loading-inner {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
        }

        .x-skeleton {
          background: linear-gradient(
            90deg,
            #e9ecf1 25%,
            #f5f6f8 37%,
            #e9ecf1 63%
          );
          background-size: 400% 100%;
          animation: xSkeleton 1.4s ease infinite;
          border-radius: 16px;
        }

        .x-skeleton-hero {
          height: 230px;
          margin-bottom: 25px;
        }

        .x-skeleton-grid {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 18px;
        }

        .x-skeleton-card {
          height: 280px;
        }

        @keyframes xSkeleton {
          0% { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }

        @keyframes xFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes xModal {
          from {
            opacity: 0;
            transform: translateY(12px) scale(.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 700px) {
          .x-shop-page {
            padding-left: 10px;
            padding-right: 10px;
            padding-top: 72px;
          }

          .x-shop-hero {
            padding: 25px 18px;
            border-radius: 18px;
          }

          .x-category-grid,
          .x-product-grid,
          .x-skeleton-grid {
            grid-template-columns: repeat(2,minmax(0,1fr));
            gap: 9px;
          }

          .x-category-image {
            height: 125px;
          }

          .x-product-image {
            height: 125px;
          }

          .x-category-body {
            padding: 11px;
          }

          .x-category-name {
            font-size: 14px;
          }

          .x-category-info {
            display: block;
            font-size: 10px;
          }

          .x-view {
            display: block;
            margin-top: 6px;
          }

          .x-product-body {
            padding: 11px;
          }

          .x-product-name {
            font-size: 14px;
          }

          .x-product-description {
            font-size: 10px;
          }

          .x-product-data {
            grid-template-columns: 1fr;
            gap: 5px;
          }

          .x-product-data-box {
            padding: 7px;
          }

          .x-product-price {
            font-size: 13px;
          }

          .x-buy {
            padding: 10px 5px;
            font-size: 11px;
          }

          .x-category-hero {
            height: 205px;
          }

          .x-category-hero-content {
            left: 17px;
            right: 17px;
            bottom: 17px;
          }

          .x-category-page-top {
            align-items: stretch;
          }

          .x-balance {
            font-size: 11px;
          }
        }

        @media (max-width: 420px) {
          .x-category-grid,
          .x-product-grid {
            gap: 7px;
          }

          .x-category-image,
          .x-product-image {
            height: 110px;
          }

          .x-category-stock {
            top: 6px;
            right: 6px;
            padding: 4px 6px;
            font-size: 9px;
          }

          .x-category-name {
            font-size: 13px;
          }

          .x-shop-title {
            font-size: 28px;
          }
        }

        html[data-theme="dark"] .x-shop-page {
          background: #080a0e;
          color: #f4f5f7;
        }

        html[data-theme="dark"] .x-shop-hero,
        html[data-theme="dark"] .x-category-card,
        html[data-theme="dark"] .x-product,
        html[data-theme="dark"] .x-empty,
        html[data-theme="dark"] .x-balance,
        html[data-theme="dark"] .x-back {
          background: #11151b;
          border-color: #252b34;
          color: #f4f5f7;
        }

        html[data-theme="dark"] .x-shop-description,
        html[data-theme="dark"] .x-section-subtitle,
        html[data-theme="dark"] .x-category-info,
        html[data-theme="dark"] .x-product-description {
          color: #858c98;
        }

        html[data-theme="dark"] .x-category-name,
        html[data-theme="dark"] .x-product-name {
          color: #f4f5f7;
        }

        html[data-theme="dark"] .x-secondary-button,
        html[data-theme="dark"] .x-product-data-box {
          background: #191e26;
          border-color: #2b313b;
          color: #e8eaf0;
        }

        html[data-theme="dark"] .x-modal,
        html[data-theme="dark"] .x-success {
          background: #11151b;
          color: #f4f5f7;
        }

        html[data-theme="dark"] .x-confirm-box,
        html[data-theme="dark"] .x-key-box {
          background: #0a0d11;
          border-color: #252b34;
        }

        html[data-theme="dark"] .x-confirm-row {
          border-color: #252b34;
        }
      `}</style>

      <div className="x-shop-container">
        {!selectedCategory ? (
          <>
            <section className="x-shop-hero">
              <div className="x-brand">
                XENOVA PLAY
              </div>

              <h1 className="x-shop-title">
                SHOP
              </h1>

              <p className="x-shop-description">
                Mua KEY và sản phẩm nhanh chóng,
                an toàn và tự động.
              </p>

              <div className="x-hero-actions">
                <button
                  className="x-primary-button"
                  onClick={() => router.push("/deposit")}
                >
                  💰 NẠP TIỀN
                </button>

                {user ? (
                  <button
                    className="x-secondary-button"
                    onClick={() =>
                      router.push("/orders")
                    }
                  >
                    📦 ĐƠN HÀNG
                  </button>
                ) : (
                  <button
                    className="x-secondary-button"
                    onClick={() =>
                      router.push("/login")
                    }
                  >
                    ĐĂNG NHẬP
                  </button>
                )}
              </div>
            </section>

            {error && (
              <div className="x-error">
                {error}
              </div>
            )}

            <section className="x-section">
              <div className="x-section-head">
                <div>
                  <div className="x-section-title">
                    🛒 DANH MỤC SẢN PHẨM
                  </div>

                  <div className="x-section-subtitle">
                    Chọn danh mục để xem các sản phẩm
                  </div>
                </div>

                {user && (
                  <div className="x-balance">
                    <span className="x-balance-label">
                      SỐ DƯ
                    </span>
                    {formatMoney(
                      wallet?.balance || 0
                    )}
                    đ
                  </div>
                )}
              </div>

              {categories.length === 0 ? (
                <div className="x-empty">
                  <div className="x-empty-icon">
                    📁
                  </div>
                  Hiện chưa có danh mục sản phẩm.
                </div>
              ) : (
                <div className="x-category-grid">
                  {categories.map((category) => {
                    const productCount =
                      getCategoryProducts(
                        category.id
                      ).length;

                    const categoryStock =
                      getCategoryStock(
                        category.id
                      );

                    return (
                      <button
                        key={category.id}
                        className="x-category-card"
                        onClick={() =>
                          openCategory(category)
                        }
                      >
                        <div className="x-category-image">
                          {category.demo_image_url ? (
                            <img
                              src={
                                category.demo_image_url
                              }
                              alt={category.name}
                            />
                          ) : (
                            <div className="x-category-icon">
                              📁
                            </div>
                          )}

                          <div className="x-category-gradient" />

                          <div className="x-category-stock">
                            {categoryStock > 0
                              ? `Còn ${categoryStock} KEY`
                              : "Hết hàng"}
                          </div>
                        </div>

                        <div className="x-category-body">
                          <div className="x-category-name">
                            {category.name}
                          </div>

                          <div className="x-category-info">
                            <span>
                              {productCount} sản phẩm
                            </span>

                            <span className="x-view">
                              XEM TẤT CẢ →
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="x-footer">
              © 2026 XENOVA PLAY
            </div>
          </>
        ) : (
          <>
            <div className="x-category-page-top">
              <button
                className="x-back"
                onClick={backToCategories}
              >
                ← DANH MỤC
              </button>

              {user && (
                <div className="x-balance">
                  <span className="x-balance-label">
                    SỐ DƯ
                  </span>

                  {formatMoney(
                    wallet?.balance || 0
                  )}
                  đ
                </div>
              )}
            </div>

            <section className="x-category-hero">
              {selectedCategory.demo_image_url ? (
                <img
                  src={
                    selectedCategory.demo_image_url
                  }
                  alt={selectedCategory.name}
                />
              ) : (
                <div className="x-category-icon">
                  📁
                </div>
              )}

              <div className="x-category-hero-content">
                <div className="x-category-hero-small">
                  XENOVA PLAY
                </div>

                <div className="x-category-hero-title">
                  {selectedCategory.name}
                </div>

                <div className="x-category-hero-count">
                  {selectedProducts.length} sản phẩm
                  {" • "}
                  {getCategoryStock(
                    selectedCategory.id
                  )}{" "}
                  KEY còn lại
                </div>
              </div>
            </section>

            {error && (
              <div className="x-error">
                {error}
              </div>
            )}

            <section className="x-section">
              <div className="x-section-head">
                <div>
                  <div className="x-section-title">
                    SẢN PHẨM
                  </div>

                  <div className="x-section-subtitle">
                    Chọn sản phẩm bạn muốn mua
                  </div>
                </div>
              </div>

              {selectedProducts.length === 0 ? (
                <div className="x-empty">
                  <div className="x-empty-icon">
                    📦
                  </div>
                  Danh mục này chưa có sản phẩm.
                </div>
              ) : (
                <div className="x-product-grid">
                  {selectedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      stock={getProductStock(product.id)}
                      onBuy={() =>
                        handleBuyClick(product)
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {selectedProduct && (
        <BuyModal
          product={selectedProduct}
          stock={getProductStock(selectedProduct.id)}
          buying={buying}
          balance={wallet?.balance || 0}
          onClose={() =>
            !buying && setSelectedProduct(null)
          }
          onConfirm={confirmBuy}
        />
      )}

      {successKey && (
        <SuccessModal
          result={successKey}
          onClose={() => setSuccessKey(null)}
        />
      )}
    </main>
  );
}

function ProductCard({
  product,
  stock,
  onBuy,
}) {
  const available = Number(stock) > 0;

  return (
    <div className="x-product">
      <div className="x-product-image">
        {product.demo_image_url ? (
          <img
            src={product.demo_image_url}
            alt={product.name}
          />
        ) : (
          <div className="x-no-image">
            🔑
          </div>
        )}
      </div>

      <div className="x-product-body">
        <div className="x-product-name">
          {product.name}
        </div>

        <div className="x-product-description">
          {product.description ||
            "Sản phẩm XENOVA PLAY"}
        </div>

        <div className="x-product-data">
          <div className="x-product-data-box">
            <span className="x-product-data-label">
              GIÁ
            </span>

            <span className="x-product-price">
              {Number(
                product.price || 0
              ).toLocaleString("vi-VN")}
              đ
            </span>
          </div>

          <div className="x-product-data-box">
            <span className="x-product-data-label">
              KHO
            </span>

            <span
              className={
                available
                  ? "x-stock-ok"
                  : "x-stock-empty"
              }
            >
              {available
                ? `Còn ${stock}`
                : "Hết hàng"}
            </span>
          </div>
        </div>

        <div className="x-product-data">
          <div className="x-product-data-box">
            <span className="x-product-data-label">
              THỜI HẠN
            </span>

            <strong>
              {product.duration_days} ngày
            </strong>
          </div>

          <div className="x-product-data-box">
            <span className="x-product-data-label">
              TRẠNG THÁI
            </span>

            <span
              className={
                available
                  ? "x-stock-ok"
                  : "x-stock-empty"
              }
            >
              {available
                ? "Đang bán"
                : "Tạm hết"}
            </span>
          </div>
        </div>

        <button
          className="x-buy"
          disabled={!available}
          onClick={onBuy}
        >
          {available
            ? "🛒 MUA NGAY"
            : "HẾT HÀNG"}
        </button>
      </div>
    </div>
  );
}

function BuyModal({
  product,
  stock,
  buying,
  balance,
  onClose,
  onConfirm,
}) {
  const price = Number(product.price || 0);
  const enough = Number(balance || 0) >= price;
  const available = Number(stock || 0) > 0;

  return (
    <div
      className="x-modal-backdrop"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !buying
        ) {
          onClose();
        }
      }}
    >
      <div className="x-modal">
        <div className="x-modal-head">
          <div>
            <div className="x-modal-small">
              XENOVA PLAY
            </div>

            <div className="x-modal-title">
              XÁC NHẬN MUA
            </div>
          </div>

          <button
            className="x-close"
            disabled={buying}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {product.demo_image_url && (
          <img
            className="x-modal-image"
            src={product.demo_image_url}
            alt={product.name}
          />
        )}

        <div className="x-confirm-box">
          <div className="x-confirm-name">
            {product.name}
          </div>

          <div className="x-confirm-row">
            <span>Giá</span>
            <strong className="x-confirm-price">
              {price.toLocaleString("vi-VN")}đ
            </strong>
          </div>

          <div className="x-confirm-row">
            <span>Thời hạn</span>
            <strong>
              {product.duration_days} ngày
            </strong>
          </div>

          <div className="x-confirm-row">
            <span>Còn lại</span>
            <strong>
              {stock} KEY
            </strong>
          </div>

          <div className="x-confirm-row">
            <span>Số dư</span>
            <strong>
              {Number(
                balance || 0
              ).toLocaleString("vi-VN")}đ
            </strong>
          </div>
        </div>

        {!enough && (
          <div className="x-warning">
            Số dư không đủ. Vui lòng nạp thêm tiền
            trước khi mua.
          </div>
        )}

        {!available && (
          <div className="x-warning">
            Sản phẩm vừa hết hàng. Vui lòng đóng
            cửa sổ này và chọn sản phẩm khác.
          </div>
        )}

        <div className="x-modal-actions">
          <button
            className="x-cancel"
            disabled={buying}
            onClick={onClose}
          >
            HỦY
          </button>

          <button
            className="x-confirm"
            disabled={
              buying ||
              !enough ||
              !available
            }
            onClick={onConfirm}
          >
            {buying
              ? "⏳ ĐANG MUA..."
              : "🔑 XÁC NHẬN MUA"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessModal({
  result,
  onClose,
}) {
  return (
    <div className="x-modal-backdrop">
      <div className="x-success">
        <div className="x-success-icon">
          ✓
        </div>

        <div className="x-success-title">
          MUA KEY THÀNH CÔNG
        </div>

        <div className="x-success-product">
          {result?.product_name}
        </div>

        <div className="x-key-box">
          <div className="x-key-label">
            KEY CỦA BẠN
          </div>

          <div className="x-key">
            {result?.key_code}
          </div>
        </div>

        <div className="x-success-info">
          Thời hạn:{" "}
          <strong>
            {result?.duration_days} ngày
          </strong>
        </div>

        <button
          className="x-confirm"
          style={{ width: "100%" }}
          onClick={onClose}
        >
          ĐÃ NHẬN KEY
        </button>
      </div>
    </div>
  );
}

function LoadingPage() {
  return (
    <main className="x-loading">
      <style>{`
        .x-loading {
          min-height: 100vh;
          padding: 110px 16px;
          box-sizing: border-box;
          background: #f5f7fb;
        }

        .x-loading-inner {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
        }

        .x-skeleton {
          border-radius: 18px;
          background: linear-gradient(
            90deg,
            #e9ecf1 25%,
            #f6f7f9 37%,
            #e9ecf1 63%
          );
          background-size: 400% 100%;
          animation: loadingMove 1.3s ease infinite;
        }

        .x-skeleton-hero {
          height: 230px;
          margin-bottom: 25px;
        }

        .x-skeleton-grid {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 18px;
        }

        .x-skeleton-card {
          height: 280px;
        }

        @keyframes loadingMove {
          0% {
            background-position: 100% 50%;
          }

          100% {
            background-position: 0 50%;
          }
        }
      `}</style>

      <div className="x-loading-inner">
        <div className="x-skeleton x-skeleton-hero" />

        <div className="x-skeleton-grid">
          <div className="x-skeleton x-skeleton-card" />
          <div className="x-skeleton x-skeleton-card" />
          <div className="x-skeleton x-skeleton-card" />
          <div className="x-skeleton x-skeleton-card" />
        </div>
      </div>
    </main>
  );
}
