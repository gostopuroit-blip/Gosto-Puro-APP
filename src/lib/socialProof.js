// Prova social ESTÁVEL por receita: o mesmo id gera sempre o mesmo número
// (não muda a cada reload — senão pareceria falso). Usa sinais reais quando
// existem (media_rating, numero_preparate) e completa com um valor derivado
// do id para a receita parecer "viva" mesmo sendo nova.

function hashId(id = "") {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function getSocialProof(recipe = {}) {
  const h = hashId(recipe.id || recipe.title || "");
  const realRating = Number(recipe.media_rating) || 0;
  const rating = realRating >= 4 ? realRating : (46 + (h % 4)) / 10; // 4.6–4.9
  const realPrep = Number(recipe.numero_preparate) || 0;
  const count = realPrep + 240 + (h % 1700); // ~240–1.940+
  return { rating: rating.toFixed(1), count: Math.round(count) };
}

export function formatCount(n) {
  return Math.round(n).toLocaleString("it-IT"); // 1.203
}

// Frase humanizada (presente, pertencimento) com leve variação por receita,
// para não soar robótico quando aparece em várias telas.
export function socialProofLine(recipe = {}) {
  const { rating, count } = getSocialProof(recipe);
  const c = formatCount(count);
  const variants = [
    `${c} persone l'hanno già cucinata`,
    `amata da ${c} persone`,
    `${c} l'hanno provata e rifatta`,
  ];
  const h = hashId(recipe.id || recipe.title || "");
  return { rating, count: c, text: variants[h % variants.length] };
}
