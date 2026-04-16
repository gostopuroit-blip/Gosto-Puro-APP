// Mapping produto slug → ocasião desbloqueada
const PRODUCT_OCCASION_MAP = {
  ricette_sane_35: "Ricette Sane",
  ricette_veloci_pratiche: "Veloci",
  cene_friggitrice: "Friggitrice ad Aria",
  ricette_congelare: "Facili da Congelare",
  diabetici: "365 Ricette Deliziose per Diabetici",
  fitness_pratiche: "275 Ricette Fitness Pratiche ed Economiche",
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

  // COM COMPRAS: dia do giorno + ocasiões dos produtos
  const accessible = [...ALWAYS_ACCESSIBLE_WITH_PURCHASE];
  
  user.purchased_products.forEach((slug) => {
    const occasion = PRODUCT_OCCASION_MAP[slug];
    if (occasion && !accessible.includes(occasion)) {
      accessible.push(occasion);
    }
  });

  return accessible;
}