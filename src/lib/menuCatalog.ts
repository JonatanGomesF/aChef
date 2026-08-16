import { products, type Product } from "../data/products";

export type MenuCategory = {
  id: string;
  name: string;
  order: number;
};

export type MenuProduct = Product & {
  categoryId: string;
  order: number;
};

export type MenuCatalog = {
  categories: MenuCategory[];
  products: MenuProduct[];
};

const STORAGE_KEY = "yakinhome_menu_catalog";
const DEFAULT_CATEGORY_ID = "yakissobas";

function normalizeCatalog(catalog: MenuCatalog): MenuCatalog {
  return {
    categories: [...catalog.categories].sort((a, b) => a.order - b.order),
    products: [...catalog.products].sort((a, b) => a.order - b.order),
  };
}

export function getDefaultMenuCatalog(): MenuCatalog {
  const categories = [
    { id: "yakissobas", name: "Yakissobas", order: 0 },
    { id: "marmitas", name: "Marmitas", order: 1 },
    { id: "hot-sushi", name: "Hot & Sushi", order: 2 },
  ];
  return normalizeCatalog({
    categories,
    products: products.map((product, index) => ({
      ...product,
      categoryId: product.categoryId || DEFAULT_CATEGORY_ID,
      order: index,
    })),
  });
}

export function getMenuCatalog(): MenuCatalog {
  if (typeof localStorage === "undefined") return getDefaultMenuCatalog();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultMenuCatalog();

    const parsed = JSON.parse(raw) as MenuCatalog;
    if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.products)) {
      return getDefaultMenuCatalog();
    }

    // Merge default categories and products if they are missing from saved catalog
    const defaultCatalog = getDefaultMenuCatalog();
    let updated = false;

    const mergedCategories = [...parsed.categories];
    for (const defCat of defaultCatalog.categories) {
      if (!mergedCategories.some((c) => c.id === defCat.id)) {
        mergedCategories.push(defCat);
        updated = true;
      }
    }

    const mergedProducts = [...parsed.products];
    for (const defProd of defaultCatalog.products) {
      if (!mergedProducts.some((p) => p.id === defProd.id)) {
        mergedProducts.push(defProd);
        updated = true;
      }
    }

    const mergedCatalog = normalizeCatalog({
      categories: mergedCategories,
      products: mergedProducts,
    });

    if (updated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedCatalog));
    }

    return mergedCatalog;
  } catch {
    return getDefaultMenuCatalog();
  }
}

export function saveMenuCatalog(catalog: MenuCatalog) {
  const normalized = normalizeCatalog(catalog);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent("yakinhome-menu-catalog-updated"));
  return normalized;
}

export function createCategoryId(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${base || "categoria"}-${Date.now()}`;
}

export function createProductId(catalog: MenuCatalog) {
  const highestId = catalog.products.reduce((max, product) => Math.max(max, product.id), 0);
  return highestId + 1;
}
