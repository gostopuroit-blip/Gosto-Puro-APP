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
  const realRatingCount = Number(recipe.rating_count) || 0;
  const realPrep = Number(recipe.numero_preparate) || 0;
  const realSaved = Number(recipe.numero_salvate) || 0;

  // Engajamento real suficiente → mostra os números REAIS (verdadeiros).
  const realInteractions = Math.max(realPrep, realSaved, realRatingCount);
  if (realInteractions >= 50 || realRatingCount >= 5) {
    const rating = realRating >= 1 ? realRating : (46 + (h % 4)) / 10;
    return { rating: Number(rating).toFixed(1), count: Math.round(realInteractions), real: true };
  }

  // Ainda "zerada" → número derivado ESTÁVEL (plausível) só como reserva,
  // pra receita nova não parecer morta. Vira real sozinho quando o uso crescer.
  const rating = realRating >= 4 ? realRating : (46 + (h % 4)) / 10; // 4.6–4.9
  const count = 240 + (h % 1700); // ~240–1.940
  return { rating: rating.toFixed(1), count: Math.round(count), real: false };
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
