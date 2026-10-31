import type { ProductExtra } from "./products";

export type { ProductExtra };

export const extras: ProductExtra[] = [
  {
    id: 1,
    name: "Raspas de Gengibre",
    price: 0,
    category: "Adicionais",
    available: true,
  },
  {
    id: 2,
    name: "Pimentão Vermelho",
    price: 0,
    category: "Adicionais",
    available: true,
  },
  {
    id: 3,
    name: "Carne Extra (80g)",
    price: 9.9,
    category: "Adicionais",
    available: true,
  },
  {
    id: 4,
    name: "Frango Extra (80g)",
    price: 6.9,
    category: "Adicionais",
    available: true,
  },
  {
    id: 5,
    name: "Camarão Extra (4 unid)",
    price: 12.9,
    category: "Adicionais",
    available: true,
  },
  {
    id: 6,
    name: "Coca Cola caçulinha 227ml",
    price: 4.0,
    category: "Refrigerantes",
    available: true,
  },
  // Sushi / Hot specific extras
  {
    id: 7,
    name: "Tarê",
    price: 3.0,
    category: "Sushi",
    available: true,
  },
  {
    id: 8,
    name: "Gergelim",
    price: 0,
    category: "Sushi",
    available: true,
  },
  {
    id: 9,
    name: "Cream Cheese Extra",
    price: 4.5,
    category: "Sushi",
    available: true,
  },
  {
    id: 10,
    name: "Porção de 5 un. extra",
    price: 12.0,
    category: "Sushi",
    available: true,
  },
  {
    id: 11,
    name: "Shoyu",
    price: 2.0,
    category: "Sushi",
    available: true,
  },
];

export function getDefaultExtrasForProduct(productNameOrCategory?: string): ProductExtra[] {
  const lower = (productNameOrCategory || "").toLowerCase();
  const isSushi = /hot|temaky|filad|sushi/i.test(lower);
  if (isSushi) {
    return [
      { id: "sushi-1", name: "Tarê", price: 3.0, category: "Sushi", available: true },
      { id: "sushi-2", name: "Shoyu", price: 2.0, category: "Sushi", available: true },
      { id: "sushi-3", name: "Cream Cheese Extra", price: 4.5, category: "Sushi", available: true },
      { id: "sushi-4", name: "Gergelim", price: 0, category: "Sushi", available: true },
      { id: "sushi-5", name: "Porção de 5 un. extra", price: 12.0, category: "Sushi", available: true },
    ];
  }
  return [
    { id: "ext-1", name: "Raspas de Gengibre", price: 0, category: "Adicionais", available: true },
    { id: "ext-2", name: "Pimentão Vermelho", price: 0, category: "Adicionais", available: true },
    { id: "ext-3", name: "Carne Extra (80g)", price: 9.9, category: "Adicionais", available: true },
    { id: "ext-4", name: "Frango Extra (80g)", price: 6.9, category: "Adicionais", available: true },
    { id: "ext-5", name: "Camarão Extra (4 unid)", price: 12.9, category: "Adicionais", available: true },
    { id: "ext-6", name: "Coca Cola caçulinha 227ml", price: 4.0, category: "Refrigerantes", available: true },
  ];
}
