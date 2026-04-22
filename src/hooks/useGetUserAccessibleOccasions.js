// Mapping produto slug → ocasiões desbloqueadas (incluindo aliases)
const PRODUCT_OCCASION_MAP = {
  ricette_sane_35: ["Ricette Sane"],
  ricette_veloci_pratiche: ["Veloci"],
  cene_friggitrice: ["Friggitrice ad Aria"],
  ricette_congelare: ["Facili da Congelare"],
  diabetici: ["365 Ricette Deliziose per Diabetici", "Diabete", "Diabetico"],
  fitness_pratiche: ["275 Ricette Fitness Pratiche ed Economiche", "Fit"],
  ricette_detox: ["Detox"],
  low_carb: ["Low carb"],
  senza_zucchero: ["Senza zucchero"],
};

// Ocasiões sempre acessíveis com qualquer compra
const ALWAYS_ACCESSIBLE_WITH_PURCHASE = [
  "Colazione",
  "Pranzo",
  "Cena",
  "Leggera",
];

export function getUserAccessibleOccasions(user) {
  // PREMIUM: acessa tudo
  if (user?.role === "admin" || user?.plan === "premium" || user?.role === "premium") {
    return ["ALL"];
  }

  // FREE: sem acesso a Prodotti
  if (!user?.purchased_products || user.purchased_products.length === 0) {
    return [];
  }

  // COM COMPRAS: ocasiões do giorno + ocasiões dos produtos (com aliases)
  const accessible = [...ALWAYS_ACCESSIBLE_WITH_PURCHASE];

  user.purchased_products.forEach((slug) => {
    const occasions = PRODUCT_OCCASION_MAP[slug] || [];
    occasions.forEach(occ => {
      if (!accessible.includes(occ)) accessible.push(occ);
    });
  });

  return accessible;
}