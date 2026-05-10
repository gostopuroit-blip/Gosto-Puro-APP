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
  "504_ricette_collezione": ["Collezione Gosto Puro", "Colazione", "Pranzo", "Cena", "Leggera", "Instagram", "In famiglia", "Per due", "Con amici", "Estate", "Autunno", "Inverno", "Primavera", "Natale e Capodanno"],
  cucina_senza_tempo: ["Cucina Senza Tempo"],
};

// Ocasiões sempre acessíveis com qualquer compra
const ALWAYS_ACCESSIBLE_WITH_PURCHASE = [
  "Colazione",
  "Pranzo",
  "Cena",
  "Leggera",
];

export function getUserAccessibleOccasions(user) {
  // OPEN ACCESS: todos os usuários têm acesso total
  return ["ALL"];
}