import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import {
  createCategoryId,
  createProductId,
  fetchMenuCatalog,
  getMenuCatalog,
  saveMenuCatalog,
  subscribeMenuCatalog,
  type MenuCatalog,
  type MenuCategory,
  type MenuProduct,
  type ProductExtra,
} from "../lib/menuCatalog";
import { getDefaultExtrasForProduct } from "../data/extras";
import { setProductAvailability } from "../lib/productAvailability";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Cloud,
  CloudCheck,
  GripVertical,
  ImagePlus,
  Layers,
  Link as LinkIcon,
  Loader2,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  PlusCircle,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

type ProductForm = {
  id: number | null;
  name: string;
  description: string;
  price: string;
  size: string;
  image: string;
  categoryId: string;
  extras: ProductExtra[];
};

const emptyForm: ProductForm = {
  id: null,
  name: "",
  description: "",
  price: "",
  size: "",
  image: "",
  categoryId: "yakissobas",
  extras: [],
};

function toForm(product: MenuProduct): ProductForm {
  const extras = product.extras !== undefined
    ? [...product.extras]
    : [...getDefaultExtrasForProduct(product.name)];

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: String(product.price),
    size: product.size,
    image: product.image,
    categoryId: product.categoryId,
    extras,
  };
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (toIndex < 0 || toIndex >= items.length) return items;
  const next = [...items];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
}

/**
 * Redimensiona e comprime imagem no cliente para evitar payload gigante em localStorage/Supabase
 */
async function compressImage(file: File, maxWidth = 800, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Gera dataURL comprimido JPEG/WebP
        const compressed = canvas.toDataURL("image/jpeg", quality);
        resolve(compressed);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function AdminCardapio() {
  const [catalog, setCatalog] = useState<MenuCatalog>(() => getMenuCatalog());
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [categoryName, setCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [draggedProductId, setDraggedProductId] = useState<number | null>(null);

  // Estados de feedback & busca
  const [searchTerm, setSearchTerm] = useState("");
  const [imageInputMode, setImageInputMode] = useState<"file" | "url">("file");
  const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Modais de exclusão
  const [productToDelete, setProductToDelete] = useState<MenuProduct | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<MenuCategory | null>(null);

  // Modal de gerenciamento de adicionais (por item)
  const [extrasModalProduct, setExtrasModalProduct] = useState<MenuProduct | null>(null);
  const [modalExtras, setModalExtras] = useState<ProductExtra[]>([]);
  const [editingExtraId, setEditingExtraId] = useState<string | number | null>(null);
  const [extraName, setExtraName] = useState("");
  const [extraPrice, setExtraPrice] = useState("");
  const [extraCategory, setExtraCategory] = useState("Adicionais");
  const [extrasFilterCategory, setExtrasFilterCategory] = useState("all");

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Carrega catálogo inicial e busca no Supabase
  useEffect(() => {
    let isMounted = true;

    async function initCatalog() {
      setInitialLoading(true);
      try {
        const remote = await fetchMenuCatalog();
        if (isMounted && remote) {
          setCatalog(remote);
          setSyncStatus("saved");
          setSyncMessage("Sincronizado com a nuvem");
        }
      } catch (err) {
        console.warn("Erro ao buscar cardápio da nuvem:", err);
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    }

    initCatalog();

    // Inscrição em tempo real no Supabase
    const unsubscribe = subscribeMenuCatalog((updatedCatalog) => {
      if (isMounted) {
        setCatalog(updatedCatalog);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const selectedCategory = useMemo(
    () => catalog.categories.find((c) => c.id === form.categoryId) ?? catalog.categories[0],
    [catalog.categories, form.categoryId]
  );

  // Persistência local e na nuvem
  const persist = async (nextCatalog: MenuCatalog, successNotice?: string) => {
    setCatalog(nextCatalog);
    setSyncStatus("saving");
    setSyncMessage("Salvando no servidor...");

    const result = await saveMenuCatalog(nextCatalog);

    if (result.success) {
      setSyncStatus("saved");
      setSyncMessage("Sincronizado na nuvem (Supabase)");
      if (successNotice) {
        showToast("success", successNotice);
      }
    } else {
      setSyncStatus("error");
      setSyncMessage(result.error ? `Erro ao salvar: ${result.error}` : "Salvo apenas localmente");
      showToast("error", "Salvo localmente, mas houve erro ao sincronizar na nuvem. Verifique sua conexão.");
    }
  };

  const resetForm = () => {
    setForm({
      ...emptyForm,
      categoryId: selectedCategory?.id ?? catalog.categories[0]?.id ?? "yakissobas",
    });
  };

  // ── CATEGORIAS ──
  const addCategory = async () => {
    const name = categoryName.trim();
    if (!name) return;

    const newCat: MenuCategory = {
      id: createCategoryId(name),
      name,
      order: catalog.categories.length,
    };

    const nextCatalog = {
      ...catalog,
      categories: [...catalog.categories, newCat],
    };

    setCategoryName("");
    await persist(nextCatalog, `Categoria "${name}" criada com sucesso!`);
  };

  const startRenameCategory = (cat: MenuCategory) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
  };

  const saveRenameCategory = async (categoryId: string) => {
    const trimmed = editingCategoryName.trim();
    if (!trimmed) {
      setEditingCategoryId(null);
      return;
    }

    const nextCategories = catalog.categories.map((cat) =>
      cat.id === categoryId ? { ...cat, name: trimmed } : cat
    );

    setEditingCategoryId(null);
    await persist({ ...catalog, categories: nextCategories }, `Categoria renomeada para "${trimmed}"`);
  };

  const handleConfirmRemoveCategory = async () => {
    if (!categoryToDelete) return;
    const cat = categoryToDelete;
    setCategoryToDelete(null);

    const nextCategories = catalog.categories
      .filter((c) => c.id !== cat.id)
      .map((c, order) => ({ ...c, order }));

    const nextProducts = catalog.products.filter((p) => p.categoryId !== cat.id);

    if (form.categoryId === cat.id) {
      resetForm();
    }

    await persist(
      { categories: nextCategories, products: nextProducts },
      `Categoria "${cat.name}" e seus itens foram removidos permanentemente!`
    );
  };

  const moveCategoryOrder = async (categoryId: string, direction: "up" | "down") => {
    const index = catalog.categories.findIndex((c) => c.id === categoryId);
    if (index < 0) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= catalog.categories.length) return;

    const reordered = moveItem(catalog.categories, index, targetIndex).map((c, order) => ({
      ...c,
      order,
    }));

    await persist({ ...catalog, categories: reordered });
  };

  const toggleCategoryPause = async (categoryId: string) => {
    const cat = catalog.categories.find((c) => c.id === categoryId);
    if (!cat) return;
    const willBePaused = cat.available !== false;
    const nextAvailability = !willBePaused;

    const nextCategories = catalog.categories.map((c) =>
      c.id === categoryId ? { ...c, available: nextAvailability } : c
    );

    // Se estiver pausando a categoria, reflete também em product_availability
    catalog.products
      .filter((p) => p.categoryId === categoryId)
      .forEach((p) => {
        setProductAvailability(p.id, nextAvailability ? (p.available !== false) : false).catch(() => {});
      });

    await persist(
      { ...catalog, categories: nextCategories },
      willBePaused
        ? `Categoria "${cat.name}" pausada no cardápio!`
        : `Categoria "${cat.name}" ativada no cardápio!`
    );
  };

  // ── PRODUTOS ──
  const saveProduct = async () => {
    const price = Number(form.price.replace(",", "."));

    if (!form.name.trim()) {
      showToast("error", "Informe o nome do item.");
      return;
    }
    if (!form.description.trim()) {
      showToast("error", "Informe a descrição do item.");
      return;
    }
    if (isNaN(price) || price <= 0) {
      showToast("error", "Informe um preço válido maior que zero.");
      return;
    }
    if (!form.size.trim()) {
      showToast("error", "Informe o tamanho ou porção (ex: 450g, 1 un, Individual).");
      return;
    }
    if (!form.image.trim()) {
      showToast("error", "Adicione uma imagem para o produto (arquivo ou link URL).");
      return;
    }

    if (form.id) {
      // Atualização (Update)
      const nextProducts = catalog.products.map((p) =>
        p.id === form.id
          ? {
              ...p,
              name: form.name.trim(),
              description: form.description.trim(),
              price,
              size: form.size.trim(),
              image: form.image.trim(),
              categoryId: form.categoryId,
              extras: form.extras ?? p.extras ?? [],
            }
          : p
      );

      const updatedName = form.name.trim();
      resetForm();
      await persist({ ...catalog, products: nextProducts }, `Item "${updatedName}" atualizado com sucesso!`);
      return;
    }

    // Criação (Create)
    const productsInCategory = catalog.products.filter((p) => p.categoryId === form.categoryId);
    const newProduct: MenuProduct = {
      id: createProductId(catalog),
      name: form.name.trim(),
      description: form.description.trim(),
      price,
      size: form.size.trim(),
      image: form.image.trim(),
      categoryId: form.categoryId,
      order: productsInCategory.length,
      extras: form.extras ?? [],
    };

    const nextProducts = [...catalog.products, newProduct];
    const createdName = form.name.trim();
    resetForm();
    await persist({ ...catalog, products: nextProducts }, `Item "${createdName}" adicionado ao cardápio!`);
  };

  const handleConfirmRemoveProduct = async () => {
    if (!productToDelete) return;
    const prod = productToDelete;
    setProductToDelete(null);

    const nextProducts = catalog.products.filter((p) => p.id !== prod.id);

    if (form.id === prod.id) {
      resetForm();
    }

    await persist(
      { ...catalog, products: nextProducts },
      `Item "${prod.name}" excluído permanentemente do cardápio!`
    );
  };

  const moveProductOrder = async (productId: number, categoryId: string, direction: "up" | "down") => {
    const categoryProducts = catalog.products.filter((p) => p.categoryId === categoryId);
    const otherProducts = catalog.products.filter((p) => p.categoryId !== categoryId);
    const index = categoryProducts.findIndex((p) => p.id === productId);
    if (index < 0) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categoryProducts.length) return;

    const reordered = moveItem(categoryProducts, index, targetIndex).map((p, order) => ({
      ...p,
      order,
    }));

    await persist({ ...catalog, products: [...otherProducts, ...reordered] });
  };

  const toggleProductPause = async (productId: number) => {
    const prod = catalog.products.find((p) => p.id === productId);
    if (!prod) return;
    const willBePaused = prod.available !== false;
    const nextAvailability = !willBePaused;

    const nextProducts = catalog.products.map((p) =>
      p.id === productId ? { ...p, available: nextAvailability } : p
    );

    // Atualiza também o estoque em product_availability para sincronismo total
    setProductAvailability(productId, nextAvailability).catch(() => {});

    await persist(
      { ...catalog, products: nextProducts },
      willBePaused
        ? `Item "${prod.name}" pausado no cardápio!`
        : `Item "${prod.name}" liberado no cardápio!`
    );
  };

  // ── GERENCIAMENTO DE ADICIONAIS POR ITEM (CRIAR, DELETAR, ATUALIZAR) ──
  const openExtrasModal = (product: MenuProduct) => {
    setExtrasModalProduct(product);
    const existing = product.extras !== undefined
      ? product.extras.map((e) => ({ ...e }))
      : getDefaultExtrasForProduct(product.name).map((e) => ({ ...e }));
    setModalExtras(existing);
    setEditingExtraId(null);
    setExtraName("");
    setExtraPrice("");
    setExtraCategory("Adicionais");
    setExtrasFilterCategory("all");
  };

  const closeExtrasModal = () => {
    setExtrasModalProduct(null);
    setModalExtras([]);
    setEditingExtraId(null);
    setExtraName("");
    setExtraPrice("");
  };

  const openFormExtrasModal = () => {
    const dummyProduct: MenuProduct = {
      id: form.id ?? 0,
      name: form.name.trim() || "Item em Cadastro",
      description: form.description,
      price: Number(form.price.replace(",", ".")) || 0,
      size: form.size || "1 un",
      image: form.image,
      categoryId: form.categoryId,
      order: 0,
      extras: [...(form.extras || [])],
    };
    setExtrasModalProduct(dummyProduct);
    setModalExtras([...(form.extras || [])]);
    setEditingExtraId(null);
    setExtraName("");
    setExtraPrice("");
    setExtraCategory("Adicionais");
    setExtrasFilterCategory("all");
  };

  const handleSaveOrAddExtra = () => {
    const trimmedName = extraName.trim();
    if (!trimmedName) {
      showToast("error", "Informe o nome do adicional.");
      return;
    }

    const priceNum = Number(extraPrice.replace(",", "."));
    if (isNaN(priceNum) || priceNum < 0) {
      showToast("error", "Informe um preço válido maior ou igual a zero (0 = Grátis).");
      return;
    }

    const categoryTrimmed = extraCategory.trim() || "Adicionais";

    if (editingExtraId !== null) {
      // Atualização de adicional existente (Update)
      setModalExtras((prev) =>
        prev.map((extra) =>
          extra.id === editingExtraId
            ? {
                ...extra,
                name: trimmedName,
                price: priceNum,
                category: categoryTrimmed,
              }
            : extra
        )
      );
      setEditingExtraId(null);
      setExtraName("");
      setExtraPrice("");
      showToast("info", `Adicional "${trimmedName}" atualizado!`);
    } else {
      // Criação de novo adicional (Create)
      const newExtra: ProductExtra = {
        id: `ext-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: trimmedName,
        price: priceNum,
        category: categoryTrimmed,
        available: true,
      };
      setModalExtras((prev) => [...prev, newExtra]);
      setExtraName("");
      setExtraPrice("");
      showToast("info", `Adicional "${trimmedName}" adicionado à lista!`);
    }
  };

  const handleStartEditExtra = (extra: ProductExtra) => {
    setEditingExtraId(extra.id);
    setExtraName(extra.name);
    setExtraPrice(String(extra.price));
    setExtraCategory(extra.category || "Adicionais");
  };

  const handleCancelEditExtra = () => {
    setEditingExtraId(null);
    setExtraName("");
    setExtraPrice("");
    setExtraCategory("Adicionais");
  };

  const handleDeleteExtra = (extraId: string | number) => {
    setModalExtras((prev) => prev.filter((e) => e.id !== extraId));
    if (editingExtraId === extraId) {
      handleCancelEditExtra();
    }
  };

  const handleToggleExtraAvailability = (extraId: string | number) => {
    setModalExtras((prev) =>
      prev.map((e) => (e.id === extraId ? { ...e, available: e.available === false ? true : false } : e))
    );
  };

  const handleMoveExtraOrder = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= modalExtras.length) return;
    setModalExtras((prev) => moveItem(prev, index, targetIndex));
  };

  const handleResetExtrasToDefault = () => {
    if (!extrasModalProduct) return;
    const defaults = getDefaultExtrasForProduct(extrasModalProduct.name);
    setModalExtras(defaults.map((e) => ({ ...e })));
    handleCancelEditExtra();
    showToast("info", "Adicionais padrão restaurados nesta janela.");
  };

  const handleClearAllExtras = () => {
    setModalExtras([]);
    handleCancelEditExtra();
    showToast("info", "Todos os adicionais foram removidos desta lista.");
  };

  const handleSaveModalExtrasToProduct = async () => {
    if (!extrasModalProduct) return;

    // Se o modal veio do formulário de cadastro/edição na barra lateral:
    if (extrasModalProduct.id === 0 || form.id === extrasModalProduct.id) {
      setForm((prev) => ({ ...prev, extras: [...modalExtras] }));
    }

    if (extrasModalProduct.id !== 0) {
      // Salva direto no produto do catálogo e sincroniza na nuvem
      const nextProducts = catalog.products.map((p) =>
        p.id === extrasModalProduct.id ? { ...p, extras: [...modalExtras] } : p
      );
      await persist(
        { ...catalog, products: nextProducts },
        `Adicionais de "${extrasModalProduct.name}" atualizados com sucesso!`
      );
    } else {
      showToast("success", "Adicionais vinculados ao formulário do prato!");
    }

    closeExtrasModal();
  };

  const handleImageFile = async (file?: File) => {
    if (!file) return;
    try {
      const compressedDataUrl = await compressImage(file, 800, 0.82);
      setForm((current) => ({ ...current, image: compressedDataUrl }));
      showToast("info", "Imagem carregada e otimizada!");
    } catch (err) {
      console.error("Erro ao processar imagem:", err);
      showToast("error", "Não foi possível carregar a imagem.");
    }
  };

  // Drag and Drop
  const handleDropCategory = (targetCategoryId: string) => {
    if (!draggedCategoryId || draggedCategoryId === targetCategoryId) return;
    const fromIndex = catalog.categories.findIndex((c) => c.id === draggedCategoryId);
    const toIndex = catalog.categories.findIndex((c) => c.id === targetCategoryId);
    if (fromIndex < 0 || toIndex < 0) return;

    const reordered = moveItem(catalog.categories, fromIndex, toIndex).map((c, order) => ({
      ...c,
      order,
    }));
    persist({ ...catalog, categories: reordered });
    setDraggedCategoryId(null);
  };

  const handleDropProduct = (targetProductId: number, categoryId: string) => {
    if (!draggedProductId || draggedProductId === targetProductId) return;
    const categoryProducts = catalog.products.filter((p) => p.categoryId === categoryId);
    const otherProducts = catalog.products.filter((p) => p.categoryId !== categoryId);
    const fromIndex = categoryProducts.findIndex((p) => p.id === draggedProductId);
    const toIndex = categoryProducts.findIndex((p) => p.id === targetProductId);
    if (fromIndex < 0 || toIndex < 0) return;

    const reordered = moveItem(categoryProducts, fromIndex, toIndex).map((p, order) => ({
      ...p,
      order,
    }));
    persist({ ...catalog, products: [...otherProducts, ...reordered] });
    setDraggedProductId(null);
  };

  // Filtragem de busca
  const cleanSearch = searchTerm.trim().toLowerCase();
  const totalProducts = catalog.products.length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Toast Notificação */}
        {toast && (
          <div
            className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl transition-all duration-300 ${
              toast.type === "success"
                ? "bg-emerald-950/90 text-emerald-200 border border-emerald-500/30"
                : toast.type === "error"
                ? "bg-red-950/90 text-red-200 border border-red-500/30"
                : "bg-blue-950/90 text-blue-200 border border-blue-500/30"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 size={18} className="text-emerald-400" />}
            {toast.type === "error" && <AlertTriangle size={18} className="text-red-400" />}
            {toast.type === "info" && <Check size={18} className="text-blue-400" />}
            <span className="text-sm font-semibold">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Header Principal */}
        <div className="rounded-3xl p-6 border border-white/[0.06] bg-[#141414] shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-white font-black text-2xl tracking-tight">Cardápio</h1>
                {/* Badge de Sincronização em Tempo Real */}
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                    syncStatus === "saving"
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                      : syncStatus === "saved"
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : syncStatus === "error"
                      ? "bg-red-500/15 text-red-300 border border-red-500/30"
                      : "bg-white/5 text-white/40 border border-white/10"
                  }`}
                >
                  {syncStatus === "saving" && <Loader2 size={12} className="animate-spin" />}
                  {syncStatus === "saved" && <CloudCheck size={13} className="text-emerald-400" />}
                  {syncStatus === "error" && <AlertTriangle size={12} className="text-red-400" />}
                  {syncStatus === "idle" && <Cloud size={12} />}
                  <span>{syncMessage || "Nuvem ativa"}</span>
                </div>
              </div>
              <p className="text-white/40 text-xs font-medium mt-1.5 max-w-2xl">
                Gerencie categorias e itens do cardápio. Exclusões, edições e novos pratos são sincronizados
                automaticamente na nuvem e no site em tempo real ({totalProducts} pratos cadastrados).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Input e Botão de Nova Categoria */}
              <div className="flex items-center gap-2">
                <input
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                  placeholder="Nome da nova categoria..."
                  className="bg-white/[0.04] border border-white/[0.08] focus:border-primary rounded-xl px-4 py-2.5 text-white text-sm outline-none placeholder:text-white/20 w-44 sm:w-56"
                />
                <button
                  onClick={addCategory}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-[#e06900] px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-orange-950/40 transition-all cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Categoria</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Busca de Produtos */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/[0.06] bg-[#141414]">
          <Search size={18} className="text-white/30 flex-shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar prato por nome, descrição ou porção..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/25"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Layout Principal: Formulário na Esquerda + Lista de Categorias e Itens na Direita */}
        <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6">
          {/* ── FORMULÁRIO DO PRODUTO (CREATE / UPDATE) ── */}
          <div
            className={`rounded-3xl border ${
              form.id ? "border-primary/40 bg-[#16120e]" : "border-white/[0.06] bg-[#141414]"
            } p-6 h-fit sticky top-6 shadow-2xl transition-all duration-300`}
          >
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/[0.06]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-white font-black text-lg">
                    {form.id ? "Editar Item" : "Cadastrar Novo Item"}
                  </h2>
                  {form.id && (
                    <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/30 text-[10px] font-black uppercase">
                      ID #{form.id}
                    </span>
                  )}
                </div>
                <p className="text-white/40 text-xs mt-0.5">
                  {form.id
                    ? "Altere os campos abaixo e clique em Salvar Alterações."
                    : "Preencha as informações do novo item do cardápio."}
                </p>
              </div>
              {form.id && (
                <button
                  onClick={resetForm}
                  title="Cancelar edição"
                  className="p-2 rounded-xl border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Seletor de Imagem */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                    Foto do Prato
                  </span>
                  <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setImageInputMode("file")}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                        imageInputMode === "file"
                          ? "bg-primary text-white"
                          : "text-white/40 hover:text-white"
                      }`}
                    >
                      <Upload size={10} className="inline mr-1" />
                      Arquivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode("url")}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                        imageInputMode === "url"
                          ? "bg-primary text-white"
                          : "text-white/40 hover:text-white"
                      }`}
                    >
                      <LinkIcon size={10} className="inline mr-1" />
                      Link URL
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-3 text-center">
                  {form.image ? (
                    <div className="relative group">
                      <img
                        src={form.image}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded-xl border border-white/[0.08]"
                      />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, image: "" })}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white hover:bg-red-600 transition-all cursor-pointer"
                        title="Remover imagem"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="h-32 rounded-xl bg-black/20 flex flex-col items-center justify-center text-white/25 gap-2">
                      <ImagePlus size={32} />
                      <span className="text-xs">Nenhuma foto selecionada</span>
                    </div>
                  )}

                  {imageInputMode === "file" ? (
                    <label className="mt-3 block cursor-pointer">
                      <span className="block text-[11px] font-bold text-primary hover:underline">
                        {form.image ? "Trocar foto (clique aqui)" : "Selecionar foto do computador"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFile(e.target.files?.[0])}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="mt-3">
                      <input
                        type="url"
                        value={form.image.startsWith("data:") ? "" : form.image}
                        onChange={(e) => setForm({ ...form, image: e.target.value })}
                        placeholder="https://exemplo.com/foto-do-prato.jpg"
                        className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-primary rounded-xl px-3 py-2 text-white text-xs outline-none placeholder:text-white/20"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1.5">
                  Nome do Prato *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Yakisoba de Camarão Gourmet"
                  className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-primary rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-white/20"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1.5">
                  Descrição &amp; Ingredientes *
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ex: Macarrão oriental com camarões frescos, legumes e molho especial."
                  rows={3}
                  className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-primary rounded-xl px-4 py-3 text-white text-sm outline-none resize-none placeholder:text-white/20"
                />
              </div>

              {/* Preço e Tamanho */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1.5">
                    Preço (R$) *
                  </label>
                  <input
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="39.90"
                    className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-primary rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-white/20 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1.5">
                    Tamanho / Porção *
                  </label>
                  <input
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                    placeholder="Ex: 750g, 10 un"
                    className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-primary rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-white/20 font-bold"
                  />
                </div>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1.5">
                  Categoria *
                </label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-white/[0.08] focus:border-primary rounded-xl px-4 py-3 text-white text-sm outline-none cursor-pointer"
                >
                  {catalog.categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Adicionais do Item */}
              <div className="pt-3 border-t border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                      Adicionais do Item
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-white/60 text-[10px] font-black">
                      {form.extras?.length || 0}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={openFormExtrasModal}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-[#e06900] hover:underline cursor-pointer"
                  >
                    <PlusCircle size={12} />
                    <span>Gerenciar Adicionais</span>
                  </button>
                </div>

                {form.extras && form.extras.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {form.extras.map((extra) => (
                      <div
                        key={extra.id}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-white/80 font-medium truncate">{extra.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.05] text-white/40 border border-white/[0.06]">
                            {extra.category || "Adicionais"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[11px] font-bold ${Number(extra.price) > 0 ? "text-emerald-400" : "text-white/40"}`}>
                            {Number(extra.price) > 0 ? `+ R$ ${Number(extra.price).toFixed(2)}` : "Grátis"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, extras: prev.extras.filter((e) => e.id !== extra.id) }))}
                            className="p-1 rounded text-white/30 hover:text-red-400 cursor-pointer"
                            title="Remover adicional"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-dashed border-white/[0.08] text-center text-white/30 text-xs">
                    Nenhum adicional vinculado.{" "}
                    <button
                      type="button"
                      onClick={openFormExtrasModal}
                      className="text-primary hover:underline font-bold cursor-pointer"
                    >
                      Clique para adicionar
                    </button>
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={saveProduct}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-[#e06900] px-4 py-3.5 text-sm font-black text-white shadow-xl shadow-orange-950/40 transition-all cursor-pointer active:scale-98"
                >
                  <Save size={16} />
                  <span>{form.id ? "Salvar Alterações" : "Cadastrar Item"}</span>
                </button>

                {form.id && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] px-4 py-2.5 text-xs font-bold text-white/70 hover:text-white transition-all cursor-pointer"
                  >
                    <span>Cancelar Edição</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── LISTA DE CATEGORIAS E PRODUTOS (READ, UPDATE, DELETE, REORDER) ── */}
          <div className="space-y-6">
            {initialLoading ? (
              <div className="rounded-3xl border border-white/[0.06] bg-[#141414] p-12 text-center flex flex-col items-center justify-center gap-3">
                <Loader2 size={32} className="animate-spin text-primary" />
                <span className="text-white/40 text-sm font-medium">Carregando cardápio...</span>
              </div>
            ) : catalog.categories.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/[0.1] bg-[#141414] p-12 text-center text-white/40">
                Nenhuma categoria cadastrada. Adicione uma categoria acima para começar!
              </div>
            ) : (
              catalog.categories.map((category, catIndex) => {
                let categoryProducts = catalog.products.filter((p) => p.categoryId === category.id);

                if (cleanSearch) {
                  categoryProducts = categoryProducts.filter(
                    (p) =>
                      p.name.toLowerCase().includes(cleanSearch) ||
                      p.description.toLowerCase().includes(cleanSearch) ||
                      p.size.toLowerCase().includes(cleanSearch)
                  );
                }

                const isEditingCat = editingCategoryId === category.id;

                return (
                  <section
                    key={category.id}
                    draggable
                    onDragStart={() => setDraggedCategoryId(category.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropCategory(category.id)}
                    className="rounded-3xl border border-white/[0.06] bg-[#141414] p-5 shadow-xl transition-all"
                  >
                    {/* Header da Categoria */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-white/[0.06]">
                      <div className="flex items-center gap-3 min-w-0">
                        <span title="Arraste para reordenar categoria">
                          <GripVertical
                            size={18}
                            className="text-white/20 hover:text-white/50 cursor-grab active:cursor-grabbing flex-shrink-0"
                          />
                        </span>

                        {isEditingCat ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingCategoryName}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && saveRenameCategory(category.id)}
                              className="bg-white/[0.06] border border-primary rounded-xl px-3 py-1.5 text-white text-base font-black outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => saveRenameCategory(category.id)}
                              className="p-1.5 rounded-lg bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50"
                              title="Salvar nome"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => setEditingCategoryId(null)}
                              className="p-1.5 rounded-lg bg-white/10 text-white/50 hover:text-white"
                              title="Cancelar"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-white font-black text-lg tracking-tight">
                                {category.name}
                              </h2>
                              {category.available === false && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                                  <PauseCircle size={11} />
                                  Pausada
                                </span>
                              )}
                              <button
                                onClick={() => startRenameCategory(category)}
                                className="p-1 rounded-md text-white/25 hover:text-white hover:bg-white/5 transition-all"
                                title="Renomear categoria"
                              >
                                <Pencil size={13} />
                              </button>
                            </div>
                            <span className="text-white/30 text-xs">
                              {categoryProducts.length} item(ns)
                              {cleanSearch && ` encontrado(s) na busca`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Controles da Categoria (Pausar, Mover Cima/Baixo e Excluir) */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                        {/* Botão Pausar / Ativar Categoria */}
                        <button
                          type="button"
                          onClick={() => toggleCategoryPause(category.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                            category.available === false
                              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 shadow-sm"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                          }`}
                          title={category.available === false ? "Liberar categoria" : "Pausar categoria inteira no cardápio"}
                        >
                          {category.available === false ? (
                            <>
                              <PlayCircle size={14} className="text-emerald-400" />
                              <span>Ativar Categoria</span>
                            </>
                          ) : (
                            <>
                              <PauseCircle size={14} className="text-amber-400" />
                              <span>Pausar Categoria</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => moveCategoryOrder(category.id, "up")}
                          disabled={catIndex === 0}
                          title="Mover categoria para cima"
                          className="p-2 rounded-xl border border-white/[0.08] text-white/30 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => moveCategoryOrder(category.id, "down")}
                          disabled={catIndex === catalog.categories.length - 1}
                          title="Mover categoria para baixo"
                          className="p-2 rounded-xl border border-white/[0.08] text-white/30 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
                        >
                          <ArrowDown size={14} />
                        </button>

                        <button
                          onClick={() => setCategoryToDelete(category)}
                          title="Excluir categoria"
                          className="p-2 rounded-xl border border-red-500/20 text-red-400/60 hover:text-red-300 hover:bg-red-500/10 cursor-pointer transition-all ml-1"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Lista de Produtos da Categoria */}
                    {categoryProducts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/[0.06] p-8 text-center text-white/25 text-xs">
                        {cleanSearch
                          ? "Nenhum prato corresponde à busca nesta categoria."
                          : "Nenhum prato nesta categoria ainda. Cadastre um item usando o formulário ao lado."}
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {categoryProducts.map((product, prodIndex) => {
                          const isBeingEdited = form.id === product.id;

                          return (
                            <div
                              key={product.id}
                              draggable
                              onDragStart={() => setDraggedProductId(product.id)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => handleDropProduct(product.id, category.id)}
                              className={`rounded-2xl border ${
                                isBeingEdited
                                  ? "border-primary/60 bg-primary/[0.08] shadow-lg shadow-orange-950/20"
                                  : "border-white/[0.06] bg-white/[0.03] hover:border-white/[0.12] hover:bg-white/[0.05]"
                              } p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all group`}
                            >
                              <span title="Arraste para reorganizar ordem" className="hidden sm:inline-block">
                                <GripVertical
                                  size={16}
                                  className="text-white/20 hover:text-white/60 cursor-grab active:cursor-grabbing flex-shrink-0"
                                />
                              </span>

                              {/* Imagem do Produto */}
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-black/40 border border-white/[0.08] flex-shrink-0 relative">
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                                    product.available === false || category.available === false
                                      ? "grayscale opacity-50"
                                      : ""
                                  }`}
                                />
                                {(product.available === false || category.available === false) && (
                                  <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center text-amber-400">
                                    <PauseCircle size={22} />
                                  </div>
                                )}
                              </div>

                              {/* Detalhes do Produto */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="text-white font-black text-sm sm:text-base leading-snug truncate">
                                    {product.name}
                                  </h3>
                                  <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.06] text-white/60 border border-white/[0.08] flex-shrink-0">
                                    {product.size}
                                  </span>
                                </div>

                                <p className="text-white/40 text-xs mt-1 line-clamp-2 leading-relaxed">
                                  {product.description}
                                </p>

                                <div className="mt-2.5 flex items-center gap-3 flex-wrap">
                                  <span className="text-sm font-black text-emerald-400">
                                    R$ {product.price.toFixed(2)}
                                  </span>

                                  {/* Botão Pill: Gerenciar Adicionais deste Prato */}
                                  <button
                                    type="button"
                                    onClick={() => openExtrasModal(product)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 hover:border-orange-500/50 transition-all cursor-pointer shadow-sm group/btn"
                                    title="Gerenciar adicionais deste prato (criar, deletar ou atualizar)"
                                  >
                                    <PlusCircle size={12} className="text-primary group-hover/btn:scale-110 transition-transform" />
                                    <span>
                                      {product.extras !== undefined
                                        ? `${product.extras.length} adicional(is)`
                                        : `${getDefaultExtrasForProduct(product.name).length} adicional(is)`}
                                    </span>
                                  </button>
                                  {isBeingEdited && (
                                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/30">
                                      Em edição
                                    </span>
                                  )}
                                  {(product.available === false || category.available === false) && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-300 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                                      <PauseCircle size={11} />
                                      {category.available === false ? "Pausado (Categoria)" : "Pausado"}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Ações do Produto (Pausar, Editar, Mover, Excluir) */}
                              <div className="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.06] w-full sm:w-auto justify-end flex-wrap">
                                {/* Botão Pausar / Liberar Prato */}
                                <button
                                  type="button"
                                  onClick={() => toggleProductPause(product.id)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                                    product.available === false
                                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 shadow-sm"
                                      : "border-amber-500/20 bg-amber-500/10 text-amber-300/80 hover:text-amber-200 hover:bg-amber-500/20"
                                  }`}
                                  title={product.available === false ? "Liberar item no cardápio" : "Pausar item no cardápio"}
                                >
                                  {product.available === false ? (
                                    <>
                                      <PlayCircle size={13} className="text-emerald-400" />
                                      <span>Liberar</span>
                                    </>
                                  ) : (
                                    <>
                                      <PauseCircle size={13} className="text-amber-400" />
                                      <span>Pausar</span>
                                    </>
                                  )}
                                </button>
                                {/* Botões mover cima / baixo */}
                                <button
                                  onClick={() => moveProductOrder(product.id, category.id, "up")}
                                  disabled={prodIndex === 0}
                                  title="Mover para cima"
                                  className="p-2 rounded-xl border border-white/[0.08] text-white/30 hover:text-white hover:bg-white/5 disabled:opacity-15 disabled:pointer-events-none cursor-pointer"
                                >
                                  <ArrowUp size={13} />
                                </button>
                                <button
                                  onClick={() => moveProductOrder(product.id, category.id, "down")}
                                  disabled={prodIndex === categoryProducts.length - 1}
                                  title="Mover para baixo"
                                  className="p-2 rounded-xl border border-white/[0.08] text-white/30 hover:text-white hover:bg-white/5 disabled:opacity-15 disabled:pointer-events-none cursor-pointer"
                                >
                                  <ArrowDown size={13} />
                                </button>

                                {/* Botão Gerenciar Adicionais (Ícone) */}
                                <button
                                  type="button"
                                  onClick={() => openExtrasModal(product)}
                                  title="Gerenciar adicionais deste prato (criar, deletar, atualizar)"
                                  className="p-2 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 hover:text-white hover:border-orange-500 transition-all cursor-pointer"
                                >
                                  <Layers size={14} />
                                </button>

                                {/* Botão Editar */}
                                <button
                                  onClick={() => {
                                    setForm(toForm(product));
                                    window.scrollTo({ top: 180, behavior: "smooth" });
                                  }}
                                  title="Editar informações do produto"
                                  className="p-2 rounded-xl border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                                >
                                  <Pencil size={15} />
                                </button>

                                {/* Botão Excluir (Lixeira) */}
                                <button
                                  onClick={() => setProductToDelete(product)}
                                  title="Excluir este item do cardápio"
                                  className="p-2 rounded-xl border border-red-500/25 text-red-400 hover:text-white hover:bg-red-600 transition-all cursor-pointer"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL: CONFIRMAR EXCLUSÃO DE PRODUTO ── */}
      {productToDelete && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setProductToDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-[#171717] border border-red-500/30 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-400 flex-shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-white font-black text-lg">Remover Item do Cardápio</h3>
                <p className="text-white/40 text-xs mt-0.5">Esta ação é permanente na nuvem e no site.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
              <img
                src={productToDelete.image}
                alt={productToDelete.name}
                className="w-14 h-14 rounded-xl object-cover bg-black/40"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-white font-bold text-sm truncate">{productToDelete.name}</h4>
                <p className="text-white/40 text-xs truncate mt-0.5">{productToDelete.size}</p>
                <span className="text-emerald-400 font-black text-xs mt-1 block">
                  R$ {productToDelete.price.toFixed(2)}
                </span>
              </div>
            </div>

            <p className="text-white/60 text-xs leading-relaxed">
              Tem certeza que deseja excluir <strong className="text-white">"{productToDelete.name}"</strong>? O item
              será removido imediatamente do site oficial (<code className="text-primary">sabordapraia.vercel.app</code>)
              e não poderá ser recuperado automaticamente.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.06] text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveProduct}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all shadow-lg shadow-red-950/40 cursor-pointer"
              >
                Sim, Excluir Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRMAR EXCLUSÃO DE CATEGORIA ── */}
      {categoryToDelete && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setCategoryToDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-[#171717] border border-red-500/30 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-400 flex-shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-white font-black text-lg">Excluir Categoria</h3>
                <p className="text-white/40 text-xs mt-0.5">Atenção: ação irreversível</p>
              </div>
            </div>

            <p className="text-white/70 text-xs leading-relaxed">
              Tem certeza que deseja excluir a categoria{" "}
              <strong className="text-white">"{categoryToDelete.name}"</strong>?{" "}
              <span className="text-red-400 font-bold block mt-1">
                Todos os pratos contidos nesta categoria também serão excluídos do cardápio!
              </span>
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.06] text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveCategory}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all shadow-lg shadow-red-950/40 cursor-pointer"
              >
                Excluir Categoria e Pratos
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ── MODAL: GERENCIAMENTO DE ADICIONAIS DO ITEM (CRIAR, DELETAR, ATUALIZAR) ── */}
      {extrasModalProduct && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
          onClick={closeExtrasModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-3xl bg-[#171717] border border-white/[0.1] p-5 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col"
          >
            {/* Header do Modal */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.08] flex-shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                {extrasModalProduct.image ? (
                  <img
                    src={extrasModalProduct.image}
                    alt={extrasModalProduct.name}
                    className="w-14 h-14 rounded-2xl object-cover bg-black/40 border border-white/[0.08] flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-primary flex-shrink-0">
                    <Layers size={24} />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-white font-black text-lg truncate">
                      Adicionais: {extrasModalProduct.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 text-[10px] font-black uppercase">
                      {extrasModalProduct.size || "Item"}
                    </span>
                  </div>
                  <p className="text-white/40 text-xs mt-0.5">
                    Crie, edite ou remova os adicionais e opções que o cliente poderá escolher para este prato.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeExtrasModal}
                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex-shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo com rolagem */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1 -mr-1">
              {/* Formulário: Criar / Editar Adicional */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white flex items-center gap-2">
                    {editingExtraId !== null ? (
                      <>
                        <Pencil size={13} className="text-primary" />
                        <span>Editar Adicional Selecionado</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle size={13} className="text-primary" />
                        <span>Cadastrar Novo Adicional</span>
                      </>
                    )}
                  </span>
                  {editingExtraId !== null && (
                    <button
                      type="button"
                      onClick={handleCancelEditExtra}
                      className="text-[11px] font-bold text-white/40 hover:text-white cursor-pointer"
                    >
                      Cancelar Edição
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_160px] gap-3">
                  {/* Nome do adicional */}
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">
                      Nome do Adicional *
                    </label>
                    <input
                      type="text"
                      value={extraName}
                      onChange={(e) => setExtraName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveOrAddExtra()}
                      placeholder="Ex: Bacon Extra (80g), Molho..."
                      className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-primary rounded-xl px-3.5 py-2.5 text-white text-xs outline-none placeholder:text-white/20"
                    />
                  </div>

                  {/* Preço */}
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">
                      Preço (R$) *
                    </label>
                    <input
                      type="text"
                      value={extraPrice}
                      onChange={(e) => setExtraPrice(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveOrAddExtra()}
                      placeholder="0.00 (Grátis)"
                      className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-primary rounded-xl px-3.5 py-2.5 text-white text-xs outline-none placeholder:text-white/20 font-bold"
                    />
                  </div>

                  {/* Categoria / Grupo */}
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">
                      Categoria / Grupo
                    </label>
                    <input
                      type="text"
                      value={extraCategory}
                      onChange={(e) => setExtraCategory(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveOrAddExtra()}
                      placeholder="Ex: Adicionais, Bebidas..."
                      className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-primary rounded-xl px-3.5 py-2.5 text-white text-xs outline-none placeholder:text-white/20"
                    />
                  </div>
                </div>

                {/* Sugestões rápidas de categoria + Botão de Ação */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-white/30 font-semibold mr-1">Sugestões:</span>
                    {["Adicionais", "Molhos", "Refrigerantes", "Sushi", "Bebidas", "Acompanhamentos"].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setExtraCategory(cat)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                          extraCategory.toLowerCase() === cat.toLowerCase()
                            ? "bg-primary/20 text-primary border-primary/40 font-bold"
                            : "bg-white/[0.03] text-white/40 border-white/[0.06] hover:text-white/70"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveOrAddExtra}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-[#e06900] px-4 py-2 text-xs font-black text-white shadow-md shadow-orange-950/30 transition-all cursor-pointer active:scale-98"
                  >
                    {editingExtraId !== null ? <Check size={14} /> : <Plus size={14} />}
                    <span>{editingExtraId !== null ? "Salvar Alteração" : "Adicionar à Lista"}</span>
                  </button>
                </div>
              </div>

              {/* Lista de Adicionais Existentes */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-xs uppercase tracking-wider">
                      Adicionais Cadastrados
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/[0.08] text-white/80 text-[11px] font-black">
                      {modalExtras.length}
                    </span>
                  </div>

                  {/* Ações rápidas */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetExtrasToDefault}
                      title="Restaura os adicionais padrão sugeridos para este tipo de prato"
                      className="text-[11px] font-bold text-white/40 hover:text-white flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <RotateCcw size={12} />
                      <span>Restaurar Padrão</span>
                    </button>
                    <span className="text-white/20">•</span>
                    <button
                      type="button"
                      onClick={handleClearAllExtras}
                      title="Deixa este prato sem nenhum adicional"
                      className="text-[11px] font-bold text-red-400/70 hover:text-red-300 flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Trash2 size={12} />
                      <span>Limpar Todos</span>
                    </button>
                  </div>
                </div>

                {/* Filtro de categorias caso haja mais de uma */}
                {(() => {
                  const uniqueCats = Array.from(new Set(modalExtras.map((e) => e.category?.trim() || "Adicionais")));
                  if (uniqueCats.length <= 1) return null;

                  return (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-white/30 font-semibold mr-1">Filtrar:</span>
                      <button
                        type="button"
                        onClick={() => setExtrasFilterCategory("all")}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                          extrasFilterCategory === "all"
                            ? "bg-white/20 text-white border-white/30"
                            : "bg-white/[0.03] text-white/40 border-white/[0.06] hover:text-white"
                        }`}
                      >
                        Todos ({modalExtras.length})
                      </button>
                      {uniqueCats.map((cat) => {
                        const count = modalExtras.filter((e) => (e.category?.trim() || "Adicionais") === cat).length;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setExtrasFilterCategory(cat)}
                            className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                              extrasFilterCategory === cat
                                ? "bg-primary text-white border-primary"
                                : "bg-white/[0.03] text-white/40 border-white/[0.06] hover:text-white"
                            }`}
                          >
                            {cat} ({count})
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Itens */}
                {modalExtras.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/[0.08] p-8 text-center text-white/30 text-xs space-y-1">
                    <p className="font-semibold">Nenhum adicional vinculado a este prato.</p>
                    <p className="text-[11px] text-white/20">
                      O cliente fará o pedido sem opções de adicionais. Utilize o formulário acima para adicionar caso desejar!
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {modalExtras
                      .map((extra, index) => ({ extra, index }))
                      .filter(({ extra }) => {
                        if (extrasFilterCategory === "all") return true;
                        return (extra.category?.trim() || "Adicionais") === extrasFilterCategory;
                      })
                      .map(({ extra, index }) => {
                        const isEditingThis = editingExtraId === extra.id;

                        return (
                          <div
                            key={extra.id}
                            className={`rounded-xl border ${
                              isEditingThis
                                ? "border-primary bg-primary/[0.08]"
                                : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                            } p-3 flex items-center justify-between gap-3 transition-all`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Reordenar */}
                              <div className="flex flex-col gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleMoveExtraOrder(index, "up")}
                                  disabled={index === 0}
                                  className="text-white/20 hover:text-white disabled:opacity-10 cursor-pointer disabled:pointer-events-none"
                                >
                                  <ArrowUp size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveExtraOrder(index, "down")}
                                  disabled={index === modalExtras.length - 1}
                                  className="text-white/20 hover:text-white disabled:opacity-10 cursor-pointer disabled:pointer-events-none"
                                >
                                  <ArrowDown size={11} />
                                </button>
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-white font-bold text-xs truncate">
                                    {extra.name}
                                  </span>
                                  <span className="px-2 py-0.2 rounded-md bg-white/[0.04] text-white/50 border border-white/[0.06] text-[10px] font-semibold">
                                    {extra.category || "Adicionais"}
                                  </span>
                                  {extra.available === false && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase">
                                      Pausado
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                              {/* Preço */}
                              <span
                                className={`text-xs font-black ${
                                  Number(extra.price) > 0 ? "text-emerald-400" : "text-white/40"
                                }`}
                              >
                                {Number(extra.price) > 0 ? `+ R$ ${Number(extra.price).toFixed(2)}` : "Grátis"}
                              </span>

                              {/* Ações: Pausar/Liberar, Editar, Excluir */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleToggleExtraAvailability(extra.id)}
                                  className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                                    extra.available === false
                                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                                      : "border-white/[0.08] text-white/30 hover:text-white hover:bg-white/10"
                                  }`}
                                  title={extra.available === false ? "Liberar este adicional" : "Pausar este adicional"}
                                >
                                  {extra.available === false ? <PlayCircle size={13} /> : <PauseCircle size={13} />}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleStartEditExtra(extra)}
                                  className="p-1.5 rounded-lg border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/10 cursor-pointer transition-all"
                                  title="Editar adicional"
                                >
                                  <Pencil size={13} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteExtra(extra.id)}
                                  className="p-1.5 rounded-lg border border-red-500/20 text-red-400/60 hover:text-red-300 hover:bg-red-500/10 cursor-pointer transition-all"
                                  title="Remover adicional"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={closeExtrasModal}
                className="px-4 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-white/70 hover:text-white transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveModalExtrasToProduct}
                className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-[#e06900] px-6 py-2.5 text-xs font-black text-white shadow-xl shadow-orange-950/40 transition-all cursor-pointer active:scale-98"
              >
                <Save size={15} />
                <span>Salvar Adicionais do Prato</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
