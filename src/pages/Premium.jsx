import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { trackEvent } from "@/components/useAnalytics";
import { PREMIUM } from "@/components/PremiumCTA";
import { firstName } from "@/components/PremiumBanner";

// Coleções premium (slug -> nome/emoji) para marcar o que o usuário já tem.
const B44 = "https://base44.app/api/apps/699707f25ff5e371dc9a1c99/files/mp/public/699707f25ff5e371dc9a1c99";
const MB = "https://media.base44.com/images/public/699707f25ff5e371dc9a1c99";
// count = nº REAL de ricette pubblicate na coleção (≥ número anunciado — over-delivery).
// Exibido só nas coleções que o usuário JÁ TEM, e apenas quando o nome não traz o número.
const COLLECTIONS = [
  { slug: "fitness_pratiche", name: "275 Ricette Fitness", emoji: "🏋️", count: 335, img: `${B44}/12d9cc326_75RicetteFitnessPraticheedEconomiche.png` },
  { slug: "piatti_settimanali_air_fryer", name: "Meal Prep in Air Fryer", emoji: "🍗", count: 99, img: `/covers/airfryer.webp` },
  { slug: "diabetici", name: "365 Ricette Diabete", emoji: "🩺", count: 420, img: `${B44}/a2cea4a8b_365RicetteDelizioseperDiabeticiPianodiRefezionidi52Settimane.png` },
  { slug: "menopausa", name: "Piano Menopausa", emoji: "🌸", count: 100, img: `/covers/menopausa.jpeg` },
  { slug: "dolci_senza_colpa", name: "99 Dolci Senza Colpa", emoji: "🍫", count: 100, img: `/covers/dolci.webp` },
  { slug: "low_carb", name: "Low Carb", emoji: "🥑", count: 32, img: `${MB}/ef3e8a07d_RicetteLowCarb.png` },
  { slug: "gelati_artigianali", name: "Gelati Artigianali", emoji: "🍦", count: 124, img: `/covers/gelati.jpeg` },
  { slug: "insalate_barattolo", name: "Insalate in Barattolo", emoji: "🥗", count: 100, img: `/covers/insalate.jpeg` },
  { slug: "ricette_whey", name: "Ricette con Whey", emoji: "💪", count: 100, img: `/covers/whey.jpeg` },
  { slug: "menu_brucia_grassi", name: "Menu Brucia-Grassi", emoji: "🔥", count: 99, img: `/covers/brucia.webp` },
  { slug: "reset_anti_gonfiore", name: "Anti-Gonfiore", emoji: "🌿", count: 104, img: `/covers/antigonfiore.webp` },
  { slug: "ricette_detox", name: "Detox", emoji: "🍵", count: 60, img: `${MB}/8c0b83736_RicetteDetox.png` },
  { slug: "cucina_senza_tempo", name: "Cucina Veloce", emoji: "⚡", count: 111, img: `/covers/cucina.webp` },
  { slug: "ricette_congelare", name: "Facili da Congelare", emoji: "❄️", count: 353, img: `${MB}/f6571f98e_350ricettefacilidacongelare.png` },
  { slug: "ricette_sane_35", name: "150 Ricette Sane", emoji: "🥦", count: 155, img: `${MB}/cbb40fb0b_150ricettesanepianoalimentaredi35giorni.png` },
  { slug: "senza_zucchero", name: "Senza Zucchero", emoji: "🍯", count: 52, img: `${MB}/a786d7eb2_RicetteSenzaZucchero.png` },
  { slug: "bibite_estate", name: "Bibite Rinfrescanti", emoji: "🥤", count: 100, img: `/covers/bibite.jpeg` },
];

// Dicionário it (padrão dos usuários) + pt (apenas para teste interno via ?lang=pt).
const STR = {
  it: {
    greet: "Ciao", back: "← Torna all'app",
    pill: "Offerta di upgrade · accesso a vita",
    titlePre: "sblocca l'", titleEm: "esperienza completa", titlePost: " di Gosto Puro",
    leadFree: "Stai usando <b>meno dell'1%</b> della piattaforma. Sblocca subito oltre <b>4.000 ricette</b>, strumenti intelligenti e contenuti esclusivi.",
    leadPartial: (n, l, r) => `Hai già sbloccato <b>${r} ricette</b> in ${n} ${n === 1 ? "collezione" : "collezioni"} — ma ti aspettano ancora oltre <b>4.000 ricette</b> e <b>${l} collezioni</b>.`,
    ctaPrimary: "🔓 Sblocca il Premium", ctaGhost: "Vedi tutto incluso",
    trust: (r, m) => `${r} · oltre ${m} cuochi felici`,
    today: "Oggi", withPrem: "Con Premium", access: "Il tuo accesso",
    miniCollez: "collezioni", miniLife: "a vita", miniMonth: "mensile",
    accTitleFree: "Oggi hai accesso a <b>40 ricette gratuite</b>",
    accTitlePartial: (n, r) => `Hai già sbloccato <b>${r} ricette</b> in ${n} collezion${n === 1 ? "e" : "i"}`,
    accSubFree: "Ma puoi sbloccare istantaneamente tutto il resto.",
    accSubPartial: "Ti manca ancora gran parte di Gosto Puro — sbloccala tutta.",
    accOwnFree: "Hai accesso gratuito a", accOwnPartial: "Già tuo",
    freeChips: ["⚡ Ricette veloci ✓", "🥐 Colazione ✓", "🍲 Pranzo e cena ✓"],
    locked: (n) => `Ancora bloccato — ${n} collezioni`,
    catsEyebrow: "Collezioni Premium",
    catsTitlePre: "Una collezione per ", catsTitleEm: "ogni obiettivo", catsTitlePost: ".",
    catsSubFree: "Tutto organizzato. Tutto da sbloccare.",
    catsSubPartial: "Tutto organizzato. Verde = già tuo.",
    badgeOwn: "Tuo ✓",
    featEyebrow: "Strumenti esclusivi",
    featTitlePre: "Non solo ricette. Un ", featTitleEm: "modo migliore", featTitlePost: " di cucinare.",
    feats: [
      ["🗓️", "Planner Intelligente", "Organizza la settimana di pasti in pochi secondi, bilanciata a modo tuo."],
      ["🛒", "Lista della Spesa Automatica", "Scegli le ricette e la lista si crea da sola, senza ripetizioni."],
      ["❤️", "Preferiti Sincronizzati", "Salva ciò che ami e ritrovalo su ogni dispositivo, sempre aggiornato."],
      ["🔍", "Ricerca Intelligente", "Cerca per ingrediente, tempo o obiettivo e trova subito la ricetta giusta."],
      ["✨", "Nuove Ricette ogni Settimana", "Il catalogo cresce di continuo — sempre incluso nel Premium."],
      ["📱", "Accesso Multidispositivo", "Telefono, tablet o cucina — porta Gosto Puro sempre con te."],
    ],
    socialEyebrow: "Prova sociale",
    socialTitlePre: "Approvato da chi ", socialTitleEm: "cucina davvero", socialTitlePost: ".",
    socialStats: [[PREMIUM.members, "Utenti soddisfatti"], [`${PREMIUM.rating}★`, "Valutazione media"], [PREMIUM.recipes, "Ricette"]],
    reviews: [
      ["Non riesco più a usare un'altra app. È diventata parte della mia routine.", "Marta R.", "Premium · verificata"],
      ["Risparmio ore ogni settimana con il planner e la lista della spesa.", "Carlo T.", "Premium · verificato"],
      ["Vale ogni centesimo. La migliore app di ricette che abbia mai pagato.", "Giulia M.", "Premium · verificata"],
    ],
    offerEyebrow: "La tua offerta",
    offerTitlePre: "Un pagamento. ", offerTitleEm: "Accesso per sempre.",
    seal: "✦ Offerta speciale di upgrade", offerH3: "Gosto Puro Premium",
    offerSub: "Tutto sbloccato. Nessun abbonamento, nessun rinnovo.",
    save: "▼ Risparmi oltre il 65% oggi",
    olist: ["Oltre 4.000 ricette + tutte le collezioni", "Planner + lista della spesa intelligente", "Preferiti sincronizzati e nuove ricette", "Aggiornamenti futuri inclusi"],
    buy: (p) => `🔓 Sblocca a ${p}`,
    terms: ["💳 Pagamento unico", "♾️ Accesso a vita", "🔒 Acquisto sicuro"],
    faqEyebrow: "Domande frequenti",
    faqTitlePre: "Tutto quello che devi ", faqTitleEm: "sapere", faqTitlePost: ".",
    faq: [
      ["È davvero un pagamento unico?", (p) => `Sì. Paghi <b>${p} una sola volta</b> e hai accesso a vita al Premium. Nessun abbonamento, nessun rinnovo.`],
      ['Cosa significa "accesso a vita"?', () => "Il Premium è tuo per sempre, incluse tutte le ricette attuali, le nuove ogni settimana e gli aggiornamenti futuri, senza costi extra."],
      ["Quante ricette sblocco?", () => "Passi a <b>oltre 4.000 ricette</b> in tutte le categorie — Fitness, Air Fryer, Low Carb, Diabete, Dolci sani e molto altro."],
      ["Funziona su più dispositivi?", () => "Sì. Con la sincronizzazione, preferiti, liste e planner sono disponibili su telefono, tablet e ovunque usi Gosto Puro."],
    ],
    finalPre: "Sei a ", finalEm: "un clic", finalPost: " dallo sbloccare tutto.",
    finalP: "Oltre 4.000 ricette e strumenti esclusivi ti aspettano.",
    finalBtn: "SBLOCCA IL PREMIUM",
    finalMicro: (m, p) => `Unisciti a oltre ${m} cuochi · pagamento unico di ${p}`,
    foot: "Gosto Puro © 2026 · Pagamento unico e sicuro",
    stickyI: "pagamento unico · accesso a vita", stickyBtn: "Sblocca",
  },
  pt: {
    greet: "Olá", back: "← Voltar ao app",
    pill: "Oferta de upgrade · acesso vitalício",
    titlePre: "desbloqueie a ", titleEm: "experiência completa", titlePost: " do Gosto Puro",
    leadFree: "Você está usando <b>menos de 1%</b> da plataforma. Desbloqueie agora mais de <b>4.000 receitas</b>, ferramentas inteligentes e conteúdos exclusivos.",
    leadPartial: (n, l, r) => `Você já desbloqueou <b>${r} receitas</b> em ${n} ${n === 1 ? "coleção" : "coleções"} — mas ainda esperam por você mais de <b>4.000 receitas</b> e <b>${l} coleções</b>.`,
    ctaPrimary: "🔓 Desbloquear Premium", ctaGhost: "Ver tudo incluído",
    trust: (r, m) => `${r} · mais de ${m} cozinheiros felizes`,
    today: "Hoje", withPrem: "Com Premium", access: "Seu acesso",
    miniCollez: "coleções", miniLife: "vitalício", miniMonth: "mensal",
    accTitleFree: "Hoje você tem acesso a <b>40 receitas gratuitas</b>",
    accTitlePartial: (n, r) => `Você já desbloqueou <b>${r} receitas</b> em ${n} ${n === 1 ? "coleção" : "coleções"}`,
    accSubFree: "Mas você pode desbloquear instantaneamente todo o resto.",
    accSubPartial: "Ainda falta grande parte do Gosto Puro — desbloqueie tudo.",
    accOwnFree: "Você tem acesso gratuito a", accOwnPartial: "Já é seu",
    freeChips: ["⚡ Receitas rápidas ✓", "🥐 Café da manhã ✓", "🍲 Almoço e jantar ✓"],
    locked: (n) => `Ainda bloqueado — ${n} coleções`,
    catsEyebrow: "Coleções Premium",
    catsTitlePre: "Uma coleção para ", catsTitleEm: "cada objetivo", catsTitlePost: ".",
    catsSubFree: "Tudo organizado. Tudo para desbloquear.",
    catsSubPartial: "Tudo organizado. Verde = já é seu.",
    badgeOwn: "Seu ✓",
    featEyebrow: "Ferramentas exclusivas",
    featTitlePre: "Não é só receita. Um ", featTitleEm: "jeito melhor", featTitlePost: " de cozinhar.",
    feats: [
      ["🗓️", "Planejador Inteligente", "Monte a semana inteira de refeições em segundos, balanceada do seu jeito."],
      ["🛒", "Lista de Compras Automática", "Escolha as receitas e a lista se monta sozinha, sem repetições."],
      ["❤️", "Favoritos Sincronizados", "Salve o que ama e encontre em qualquer aparelho, sempre atualizado."],
      ["🔍", "Busca Inteligente", "Procure por ingrediente, tempo ou objetivo e ache a receita certa na hora."],
      ["✨", "Novas Receitas toda Semana", "O catálogo cresce sempre — incluído no Premium."],
      ["📱", "Acesso Multidispositivo", "Celular, tablet ou cozinha — leve o Gosto Puro com você."],
    ],
    socialEyebrow: "Prova social",
    socialTitlePre: "Aprovado por quem ", socialTitleEm: "cozinha de verdade", socialTitlePost: ".",
    socialStats: [[PREMIUM.members, "Usuários satisfeitos"], [`${PREMIUM.rating}★`, "Avaliação média"], [PREMIUM.recipes, "Receitas"]],
    reviews: [
      ["Não consigo mais usar outro aplicativo. Virou parte da minha rotina.", "Mariana R.", "Premium · verificada"],
      ["Economizo horas toda semana com o planejador e a lista de compras.", "Carlos T.", "Premium · verificado"],
      ["Valeu cada centavo. O melhor que já paguei por um app de receitas.", "Juliana M.", "Premium · verificada"],
    ],
    offerEyebrow: "Sua oferta",
    offerTitlePre: "Um pagamento. ", offerTitleEm: "Acesso para sempre.",
    seal: "✦ Oferta especial de upgrade", offerH3: "Gosto Puro Premium",
    offerSub: "Tudo desbloqueado. Sem mensalidade, sem renovação.",
    save: "▼ Você economiza mais de 65% hoje",
    olist: ["Mais de 4.000 receitas + todas as coleções", "Planejador + lista de compras inteligente", "Favoritos sincronizados e novas receitas", "Atualizações futuras incluídas"],
    buy: (p) => `🔓 Desbloquear por ${p}`,
    terms: ["💳 Pagamento único", "♾️ Acesso vitalício", "🔒 Compra segura"],
    faqEyebrow: "Perguntas frequentes",
    faqTitlePre: "Tudo que você precisa ", faqTitleEm: "saber", faqTitlePost: ".",
    faq: [
      ["É realmente um pagamento único?", (p) => `Sim. Você paga <b>${p} uma única vez</b> e tem acesso vitalício ao Premium. Sem mensalidade, sem renovação.`],
      ['O que significa "acesso vitalício"?', () => "O Premium é seu para sempre, incluindo todas as receitas atuais, as novas a cada semana e as atualizações futuras, sem custo extra."],
      ["Quantas receitas eu desbloqueio?", () => "Você passa para <b>mais de 4.000 receitas</b> em todas as categorias — Fitness, Air Fryer, Low Carb, Diabetes, Doces saudáveis e muito mais."],
      ["Funciona em mais de um aparelho?", () => "Sim. Com a sincronização, favoritos, listas e planejador ficam disponíveis no celular, tablet e onde você usar o Gosto Puro."],
    ],
    finalPre: "Você está a ", finalEm: "um clique", finalPost: " de desbloquear tudo.",
    finalP: "Mais de 4.000 receitas e ferramentas exclusivas esperando por você.",
    finalBtn: "DESBLOQUEAR O PREMIUM",
    finalMicro: (m, p) => `Junte-se a mais de ${m} cozinheiros · pagamento único de ${p}`,
    foot: "Gosto Puro © 2026 · Pagamento único e seguro",
    stickyI: "pagamento único · acesso vitalício", stickyBtn: "Desbloquear",
  },
};

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700;800&display=swap');
.gpx{--paper:#fbf8f4;--paper-2:#f3ede4;--ink:#1a1512;--ink-soft:#6b6157;--line:rgba(26,21,18,.08);--glass-line:rgba(255,255,255,.12);--glass:rgba(255,255,255,.06);--amber:#f3b14a;--terra:#e0683a;--rose:#d9534f;--grad:linear-gradient(135deg,#f3b14a 0%,#e0683a 60%,#d2552f 100%);--grad-soft:linear-gradient(135deg,rgba(243,177,74,.18),rgba(224,104,58,.16));--shadow-sm:0 2px 10px rgba(20,15,10,.06);--shadow:0 18px 50px -18px rgba(20,15,10,.28);--shadow-lg:0 40px 90px -30px rgba(20,15,10,.45);--r:22px;--r-lg:30px;--ease:cubic-bezier(.22,.61,.36,1);--maxw:1120px;font-family:'Inter',-apple-system,sans-serif;background:var(--paper);color:var(--ink);line-height:1.55;-webkit-font-smoothing:antialiased;display:block;overflow-x:hidden;min-height:100vh}
.gpx *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
.gpx .serif{font-family:'Fraunces',Georgia,serif}
.gpx .grad-text{background:var(--grad);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.gpx .wrap{width:100%;max-width:var(--maxw);margin:0 auto;padding:0 22px}
.gpx a{color:inherit;text-decoration:none}
.gpx .reveal{opacity:0;transform:translateY(24px);transition:opacity .8s var(--ease),transform .8s var(--ease),filter .8s var(--ease);filter:blur(6px)}
.gpx .reveal.in{opacity:1;transform:none;filter:blur(0)}
.gpx .reveal.d1{transition-delay:.08s}.gpx .reveal.d2{transition-delay:.16s}.gpx .reveal.d3{transition-delay:.24s}.gpx .reveal.d4{transition-delay:.32s}
.gpx section{padding:64px 0}
.gpx .eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--terra)}
.gpx .eyebrow::before{content:"";width:20px;height:1.5px;background:var(--grad)}
.gpx .sec-head{max-width:640px;margin:0 auto;text-align:center}
.gpx .sec-title{font-size:clamp(26px,4.4vw,40px);line-height:1.1;font-weight:600;letter-spacing:-.025em;margin:14px 0 12px}
.gpx .sec-sub{color:var(--ink-soft);font-size:clamp(14px,1.6vw,17px);max-width:54ch;margin:0 auto}
.gpx .btn{appearance:none;border:none;cursor:pointer;font-family:inherit;font-weight:700;border-radius:15px;font-size:15px;padding:15px 24px;transition:transform .25s var(--ease),box-shadow .25s var(--ease);position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:8px}
.gpx .btn:active{transform:scale(.97)}
.gpx .btn-primary{background:var(--grad);color:#fff;box-shadow:0 14px 30px -12px rgba(224,104,58,.7),inset 0 1px 0 rgba(255,255,255,.3)}
.gpx .btn-primary::after{content:"";position:absolute;top:0;left:-120%;width:55%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent);transform:skewX(-18deg);animation:gpxSheen 3.8s ease-in-out infinite}
@keyframes gpxSheen{0%{left:-120%}55%,100%{left:170%}}
.gpx .btn-ghost{background:rgba(255,255,255,.07);color:#f7f1e8;border:1px solid var(--glass-line);font-weight:600}
.gpx .topnav{position:sticky;top:0;z-index:60;backdrop-filter:blur(16px);background:rgba(7,21,14,.66);border-bottom:1px solid rgba(255,255,255,.06)}
.gpx .topnav .wrap{display:flex;align-items:center;justify-content:space-between;height:60px}
.gpx .brand{display:flex;align-items:center;gap:9px;font-weight:700;font-size:16px;color:#f7f1e8}
.gpx .brand .logo{width:30px;height:30px;border-radius:9px;background:var(--grad);display:grid;place-items:center;font-size:16px}
.gpx .back{display:inline-flex;align-items:center;gap:6px;color:rgba(247,241,232,.8);font-size:14px;font-weight:600;cursor:pointer;background:rgba(255,255,255,.06);border:1px solid var(--glass-line);padding:9px 14px;border-radius:11px}
.gpx .hero{position:relative;color:#f7f1e8;overflow:hidden;padding:64px 0 72px;background:radial-gradient(55% 45% at 80% -5%,rgba(58,196,128,.28),transparent 58%),radial-gradient(50% 55% at 4% 8%,rgba(18,120,76,.32),transparent 55%),linear-gradient(180deg,#08180f 0%,#0b2417 65%,#0e2c1d 100%)}
.gpx .hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:44px;align-items:center;position:relative;z-index:2}
@media(max-width:880px){.gpx .hero-grid{grid-template-columns:1fr;gap:32px}}
.gpx .pill{display:inline-flex;align-items:center;gap:8px;padding:7px 13px;border-radius:100px;background:rgba(255,255,255,.06);border:1px solid var(--glass-line);font-size:12px;font-weight:600;color:#f3d8b0}
.gpx .pill .spark{width:6px;height:6px;border-radius:50%;background:var(--amber);animation:gpxPing 2.2s infinite}
@keyframes gpxPing{0%{box-shadow:0 0 0 0 rgba(243,177,74,.6)}70%{box-shadow:0 0 0 10px rgba(243,177,74,0)}100%{box-shadow:0 0 0 0 rgba(243,177,74,0)}}
.gpx .hero h1{font-family:'Fraunces',serif;font-weight:600;font-size:clamp(32px,5.4vw,54px);line-height:1.05;letter-spacing:-.03em;margin:18px 0 0}
.gpx .hero h1 em{font-style:italic}
.gpx .hero .lead{margin-top:18px;color:rgba(247,241,232,.76);font-size:clamp(15px,1.8vw,18px);max-width:50ch}
.gpx .hero .lead b{color:#fff;font-weight:600}
.gpx .cta{display:flex;gap:12px;margin-top:28px;flex-wrap:wrap}
@media(max-width:480px){.gpx .cta{flex-direction:column}.gpx .cta .btn{width:100%}}
.gpx .trust{display:flex;align-items:center;gap:9px;margin-top:20px;font-size:13px;color:rgba(247,241,232,.64)}
.gpx .trust .stars{color:var(--amber);letter-spacing:1px}
.gpx .hcard{position:relative;border-radius:var(--r-lg);padding:24px;background:var(--glass);border:1px solid var(--glass-line);box-shadow:var(--shadow-lg)}
.gpx .counter{display:flex;align-items:center;gap:14px}
.gpx .counter .col{flex:1;text-align:center}
.gpx .counter .lbl{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:rgba(247,241,232,.5);font-weight:600}
.gpx .counter .num{font-family:'Fraunces',serif;font-weight:600;font-size:34px;line-height:1;margin-top:7px}
.gpx .counter .from{color:rgba(247,241,232,.55)}
.gpx .counter .arrow{flex:0 0 auto;width:40px;height:40px;border-radius:50%;background:var(--grad);display:grid;place-items:center;color:#fff;font-size:18px;animation:gpxBob 2.4s ease-in-out infinite}
@keyframes gpxBob{0%,100%{transform:translateY(-3px)}50%{transform:translateY(3px)}}
.gpx .usage{margin-top:20px}
.gpx .usage .track{height:8px;border-radius:100px;background:rgba(255,255,255,.1);overflow:hidden}
.gpx .usage .fill{height:100%;width:1%;border-radius:100px;background:var(--grad);transition:width 1.6s var(--ease)}
.gpx .usage .cap{display:flex;justify-content:space-between;margin-top:9px;font-size:12px;color:rgba(247,241,232,.6)}
.gpx .hcard .mini{display:flex;gap:9px;margin-top:20px}
.gpx .hcard .mini div{flex:1;text-align:center;padding:12px 6px;border-radius:13px;background:rgba(255,255,255,.04);border:1px solid var(--glass-line)}
.gpx .hcard .mini b{font-family:'Fraunces',serif;font-size:18px;display:block}
.gpx .hcard .mini small{font-size:10.5px;color:rgba(247,241,232,.55)}
.gpx .access{background:linear-gradient(180deg,#fbf8f4,#f5efe6)}
.gpx .acard{max-width:760px;margin:36px auto 0;background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--shadow-sm);padding:28px}
.gpx .acard h4{font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:14px}
.gpx .chips{display:flex;flex-wrap:wrap;gap:9px}
.gpx .chip{display:inline-flex;align-items:center;gap:7px;font-size:13.5px;font-weight:600;padding:8px 13px;border-radius:100px;border:1px solid var(--line)}
.gpx .chip.own{background:rgba(58,157,110,.12);color:#2f7d57;border-color:rgba(58,157,110,.25)}
.gpx .chip.lock{background:var(--paper-2);color:var(--ink-soft)}
.gpx .adiv{height:1px;background:var(--line);margin:22px 0}
.gpx .cats{background:#07150e;color:#f7f1e8;background-image:radial-gradient(55% 50% at 100% 0%,rgba(58,196,128,.16),transparent 55%),linear-gradient(180deg,#091a11,#06120c)}
.gpx .cats .sec-title{color:#f7f1e8}.gpx .cats .sec-sub{color:rgba(247,241,232,.65)}
.gpx .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-top:38px}
@media(max-width:900px){.gpx .grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:560px){.gpx .grid{grid-template-columns:repeat(2,1fr)}}
.gpx .cat{position:relative;border-radius:18px;aspect-ratio:4/5;min-height:150px;display:flex;flex-direction:column;justify-content:flex-end;background:#0e2117;border:1px solid var(--glass-line);overflow:hidden;transition:transform .35s var(--ease),border-color .35s}
.gpx .cat:hover{transform:translateY(-4px);border-color:rgba(243,177,74,.5)}
.gpx .cat:hover .cimg img{transform:scale(1.06)}
.gpx .cat.owned{border-color:rgba(58,196,128,.6)}
.gpx .cat .cimg{position:absolute;inset:0}
.gpx .cat .cimg img{width:100%;height:100%;object-fit:cover;object-position:center top;transition:transform .5s var(--ease)}
.gpx .cat .cov{position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,16,11,.05) 0%,rgba(6,16,11,.35) 42%,rgba(6,16,11,.9) 100%)}
.gpx .cat .nm{position:relative;z-index:2;padding:13px 14px;font-weight:600;font-size:13.5px;letter-spacing:-.01em;color:#fff;text-shadow:0 1px 5px rgba(0,0,0,.55)}
.gpx .cat .badge{position:absolute;top:9px;right:9px;z-index:3;font-size:10px;font-weight:700;padding:3px 8px;border-radius:100px;backdrop-filter:blur(4px)}
.gpx .cat .badge.b-own{background:#3a9d6e;color:#fff}
.gpx .cat .badge.b-lock{background:rgba(0,0,0,.45);color:#fff}
.gpx .feat{background:linear-gradient(180deg,#f5efe6,#fbf8f4)}
.gpx .frow{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:38px}
@media(max-width:880px){.gpx .frow{grid-template-columns:repeat(2,1fr)}}
@media(max-width:540px){.gpx .frow{grid-template-columns:1fr}}
.gpx .fcard{padding:22px;border-radius:var(--r);background:#fff;border:1px solid var(--line);box-shadow:var(--shadow-sm);transition:transform .35s var(--ease),box-shadow .35s var(--ease)}
.gpx .fcard:hover{transform:translateY(-4px);box-shadow:var(--shadow)}
.gpx .fico{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;font-size:22px;background:var(--grad-soft);border:1px solid rgba(224,104,58,.18);margin-bottom:14px}
.gpx .fcard h4{font-size:16px;font-weight:600}
.gpx .fcard p{font-size:13.5px;color:var(--ink-soft);margin-top:5px}
.gpx .social{background:#07150e;color:#f7f1e8;background-image:radial-gradient(60% 50% at 0% 0%,rgba(58,196,128,.14),transparent 55%),linear-gradient(180deg,#06120c,#091a11)}
.gpx .social .sec-title{color:#f7f1e8}
.gpx .sstats{display:flex;justify-content:center;gap:18px;margin-top:34px;flex-wrap:wrap}
.gpx .sstat{flex:1;min-width:110px;max-width:200px;text-align:center}
.gpx .sstat b{font-family:'Fraunces',serif;font-weight:600;font-size:clamp(30px,5vw,42px);line-height:1;display:block}
.gpx .sstat small{display:block;margin-top:8px;font-size:12.5px;color:rgba(247,241,232,.6)}
.gpx .reviews{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:40px}
@media(max-width:880px){.gpx .reviews{grid-template-columns:1fr;max-width:560px;margin:40px auto 0}}
.gpx .rev{padding:22px;border-radius:var(--r);background:rgba(255,255,255,.04);border:1px solid var(--glass-line);text-align:left}
.gpx .rev .rstars{color:var(--amber);letter-spacing:2px;font-size:14px}
.gpx .rev .rtext{margin:12px 0 16px;font-size:14.5px;line-height:1.55;color:#f3ede4;font-weight:500}
.gpx .rev .rwho{display:flex;align-items:center;gap:11px}
.gpx .rev .rav{width:38px;height:38px;border-radius:50%;background:var(--grad);display:grid;place-items:center;color:#fff;font-weight:700;font-size:15px;flex:0 0 auto}
.gpx .rev .rname{font-weight:600;font-size:14px}
.gpx .rev .rtag{font-size:11.5px;color:rgba(247,241,232,.5)}
.gpx .offer{background:linear-gradient(180deg,#fbf8f4,#f2e9dc)}
.gpx .obox{position:relative;max-width:600px;margin:36px auto 0;border-radius:var(--r-lg);padding:38px 32px;color:#f7f1e8;overflow:hidden;background:linear-gradient(165deg,#0c2117,#10301f 60%,#15402a);box-shadow:var(--shadow-lg);border:1px solid rgba(58,196,128,.32);text-align:center}
.gpx .obox .seal{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:7px 13px;border-radius:100px;background:var(--grad);color:#fff}
.gpx .obox h3{font-family:'Fraunces',serif;font-weight:600;font-size:26px;margin:16px 0 4px}
.gpx .obox .sub{color:rgba(247,241,232,.66);font-size:14px}
.gpx .priceline{display:flex;align-items:baseline;justify-content:center;gap:12px;margin:18px 0 6px}
.gpx .priceline .old{font-size:20px;color:rgba(247,241,232,.45);text-decoration:line-through;text-decoration-color:rgba(224,104,58,.7)}
.gpx .priceline .new{font-family:'Fraunces',serif;font-size:52px;font-weight:600;line-height:1}
.gpx .save{display:inline-flex;gap:6px;align-items:center;font-size:12.5px;font-weight:700;color:#5fd49b;background:rgba(58,157,110,.15);padding:6px 12px;border-radius:9px}
.gpx .olist{list-style:none;margin:22px auto;display:inline-flex;flex-direction:column;gap:11px;text-align:left}
.gpx .olist li{display:flex;align-items:center;gap:11px;font-size:14.5px;font-weight:500}
.gpx .olist .ic{flex:0 0 auto;width:22px;height:22px;border-radius:7px;display:grid;place-items:center;font-size:12px;font-weight:800;background:rgba(95,212,155,.16);color:#5fd49b}
.gpx .terms{display:flex;justify-content:center;gap:18px;margin-top:16px;font-size:12px;color:rgba(247,241,232,.6);flex-wrap:wrap}
.gpx .terms span{display:flex;align-items:center;gap:5px}
.gpx .faq{background:linear-gradient(180deg,#fbf8f4,#f5efe6)}
.gpx .faq-list{max-width:720px;margin:36px auto 0;display:flex;flex-direction:column;gap:12px}
.gpx .qa{background:#fff;border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--shadow-sm);overflow:hidden}
.gpx .qa summary{list-style:none;cursor:pointer;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;gap:14px;font-weight:600;font-size:15.5px}
.gpx .qa summary::-webkit-details-marker{display:none}
.gpx .qa .chev{flex:0 0 auto;width:28px;height:28px;border-radius:50%;background:var(--grad-soft);border:1px solid rgba(224,104,58,.2);display:grid;place-items:center;color:var(--terra);transition:transform .35s var(--ease)}
.gpx .qa[open] .chev{transform:rotate(45deg)}
.gpx .qa .ans{padding:0 20px 20px;color:var(--ink-soft);font-size:14px;line-height:1.6}
.gpx .final{position:relative;text-align:center;color:#f7f1e8;overflow:hidden;padding:80px 0;background:radial-gradient(55% 55% at 50% 0%,rgba(58,196,128,.26),transparent 60%),linear-gradient(180deg,#091a11,#040d09)}
.gpx .final h2{font-family:'Fraunces',serif;font-weight:600;font-size:clamp(28px,4.6vw,46px);line-height:1.1;letter-spacing:-.025em}
.gpx .final p{color:rgba(247,241,232,.7);font-size:clamp(14px,1.8vw,17px);max-width:46ch;margin:16px auto 0}
.gpx .btn-giant{margin-top:30px;font-size:17px;padding:20px 38px;border-radius:17px;background:var(--grad);color:#fff;font-weight:800;box-shadow:0 22px 50px -16px rgba(224,104,58,.85),inset 0 1px 0 rgba(255,255,255,.35);animation:gpxPulse 2.6s var(--ease) infinite}
@keyframes gpxPulse{0%{box-shadow:0 22px 50px -16px rgba(224,104,58,.85),0 0 0 0 rgba(243,177,74,.5)}70%{box-shadow:0 22px 50px -16px rgba(224,104,58,.85),0 0 0 16px rgba(243,177,74,0)}100%{box-shadow:0 22px 50px -16px rgba(224,104,58,.85),0 0 0 0 rgba(243,177,74,0)}}
.gpx .final .micro{margin-top:16px;font-size:12.5px;color:rgba(247,241,232,.55)}
.gpx .final .micro .stars{color:var(--amber)}
.gpx .sticky{position:fixed;left:0;right:0;bottom:0;z-index:70;display:flex;justify-content:center;padding:12px;pointer-events:none;transform:translateY(160%);transition:transform .5s var(--ease)}
.gpx .sticky.show{transform:none}
.gpx .sticky .inner{pointer-events:auto;width:100%;max-width:680px;display:flex;align-items:center;gap:14px;padding:11px 12px 11px 20px;border-radius:17px;background:rgba(7,21,14,.86);border:1px solid var(--glass-line);backdrop-filter:blur(20px);box-shadow:0 -10px 40px -10px rgba(0,0,0,.6)}
.gpx .sticky .pr{color:#f7f1e8;line-height:1.15;flex:1}
.gpx .sticky .pr b{font-family:'Fraunces',serif;font-size:19px}
.gpx .sticky .pr s{font-size:12px;color:rgba(247,241,232,.45);margin-left:7px}
.gpx .sticky .pr i{font-style:normal;font-size:11.5px;color:rgba(247,241,232,.55);display:block}
.gpx .foot{background:#040d09;color:rgba(247,241,232,.4);text-align:center;font-size:12px;padding:32px 22px 120px}
@media(max-width:600px){.gpx section{padding:46px 0}.gpx .hero{padding:46px 0 54px}.gpx .grid{gap:10px;margin-top:30px}.gpx .frow{gap:12px}.gpx .obox{padding:32px 22px}.gpx .sticky .pr i{display:none}.gpx .sticky .inner{padding:10px 10px 10px 16px}.gpx .acard{padding:22px}}
@media(prefers-reduced-motion:reduce){.gpx *{animation:none!important;transition:none!important}.gpx .reveal{opacity:1;transform:none;filter:none}}
`;

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// Otimiza capas: se for do Supabase Storage, usa o endpoint de transformação
// (redimensiona + webp automático no Accept). As demais (base44) ficam como estão.
function optImg(url, w) {
  if (typeof url === "string" && url.includes("/storage/v1/object/public/")) {
    const base = url.split("?")[0].replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
    return `${base}?width=${w}&quality=62&resize=cover`;
  }
  return url;
}

function buildHTML(user, lang) {
  const L = STR[lang] || STR.it;
  const name = firstName(user);
  const greet = name ? `${L.greet} ${esc(name)}, ` : "";
  const owned = new Set(Array.isArray(user?.purchased_products) ? user.purchased_products : []);
  const ownedList = COLLECTIONS.filter((c) => owned.has(c.slug));
  const lockedList = COLLECTIONS.filter((c) => !owned.has(c.slug));
  const isFree = ownedList.length === 0;
  const pct = isFree ? 1 : Math.min(99, Math.round((ownedList.length / COLLECTIONS.length) * 100));
  // Receitas que o usuário JÁ tem: 40 da degustação + a soma das coleções compradas.
  const ownedRecipes = ownedList.reduce((s, c) => s + (c.count || 0), 0);
  const todayCount = isFree ? 40 : 40 + ownedRecipes;

  const heroLead = isFree ? L.leadFree : L.leadPartial(ownedList.length, lockedList.length, ownedRecipes);
  const ownedChips = ownedList.length
    ? ownedList.map((c) => {
        // Mostra "· X ricette" só quando o nome não já traz o número (evita "275 … · 335").
        const showCount = c.count && !/\d/.test(c.name);
        const countTxt = showCount ? ` · ${c.count} ricette` : "";
        return `<span class="chip own">${c.emoji} ${esc(c.name)}${countTxt} ✓</span>`;
      }).join("")
    : L.freeChips.map((t) => `<span class="chip own">${t}</span>`).join("");
  const lockedChips = lockedList.map((c) => `<span class="chip lock">🔒 ${esc(c.name)}</span>`).join("");
  const accessTitle = isFree ? L.accTitleFree : L.accTitlePartial(ownedList.length, ownedRecipes);

  const cats = COLLECTIONS.map((c) => {
    const own = owned.has(c.slug);
    return `<div class="cat reveal${own ? " owned" : ""}"><div class="cimg"><img src="${optImg(c.img, 480)}" alt="" loading="lazy" decoding="async" fetchpriority="low" onerror="this.style.display='none'"></div><div class="cov"></div><span class="badge ${own ? "b-own" : "b-lock"}">${own ? L.badgeOwn : "🔒"}</span><div class="nm">${c.emoji} ${esc(c.name)}</div></div>`;
  }).join("");

  const feats = L.feats.map(([ic, h, p]) => `<div class="fcard reveal"><div class="fico">${ic}</div><h4>${h}</h4><p>${p}</p></div>`).join("");
  const sstats = L.socialStats.map(([v, l]) => `<div class="sstat reveal"><b class="grad-text">${v}</b><small>${l}</small></div>`).join("");
  const reviews = L.reviews.map(([t, n, tag], i) => `<div class="rev reveal${i ? ` d${i}` : ""}"><div class="rstars">★★★★★</div><p class="rtext">"${esc(t)}"</p><div class="rwho"><div class="rav">${esc(n.charAt(0))}</div><div><div class="rname">${esc(n)}</div><div class="rtag">${esc(tag)}</div></div></div></div>`).join("");
  const olist = L.olist.map((t) => `<li><span class="ic">✓</span> ${t}</li>`).join("");
  const faq = L.faq.map(([q, a], i) => `<details class="qa reveal${i === 0 ? " d1" : ""}"${i === 0 ? " open" : ""}><summary>${q} <span class="chev">+</span></summary><div class="ans">${a(PREMIUM.price)}</div></details>`).join("");

  return `
  <header class="topnav"><div class="wrap"><div class="brand"><span class="logo">🍃</span> Gosto Puro</div><span class="back" data-back>${L.back}</span></div></header>

  <section class="hero"><div class="wrap hero-grid">
    <div>
      <span class="pill reveal in"><span class="spark"></span> ${L.pill}</span>
      <h1 class="reveal in d1">${greet}${L.titlePre}<em class="grad-text">${L.titleEm}</em>${L.titlePost}</h1>
      <p class="lead reveal in d2">${heroLead}</p>
      <div class="cta reveal in d3"><button class="btn btn-primary" data-buy>${L.ctaPrimary}</button><a href="#offerta" class="btn btn-ghost">${L.ctaGhost}</a></div>
      <div class="trust reveal in d4"><span class="stars">★★★★★</span> ${L.trust(PREMIUM.rating, PREMIUM.members)}</div>
    </div>
    <div class="hcard reveal in d2">
      <div class="counter">
        <div class="col"><div class="lbl">${L.today}</div><div class="num from"><span data-count="${todayCount}">${todayCount}</span></div></div>
        <div class="arrow">↑</div>
        <div class="col"><div class="lbl grad-text">${L.withPrem}</div><div class="num grad-text"><span data-count="4000" data-suffix="+">4.000+</span></div></div>
      </div>
      <div class="usage"><div class="track"><div class="fill" data-fill></div></div><div class="cap"><span>${L.access}</span><span>${pct}% di 100%</span></div></div>
      <div class="mini"><div><b class="grad-text">${COLLECTIONS.length}+</b><small>${L.miniCollez}</small></div><div><b class="grad-text">∞</b><small>${L.miniLife}</small></div><div><b class="grad-text">€0</b><small>${L.miniMonth}</small></div></div>
    </div>
  </div></section>

  <section class="access"><div class="wrap">
    <div class="sec-head"><span class="eyebrow reveal">${L.access}</span><h2 class="sec-title serif reveal d1">${accessTitle}</h2><p class="sec-sub reveal d2">${isFree ? L.accSubFree : L.accSubPartial}</p></div>
    <div class="acard reveal d2"><h4>${isFree ? L.accOwnFree : L.accOwnPartial}</h4><div class="chips">${ownedChips}</div>${lockedChips ? `<div class="adiv"></div><h4>${L.locked(lockedList.length)}</h4><div class="chips">${lockedChips}</div>` : ""}</div>
  </div></section>

  <section class="cats"><div class="wrap">
    <div class="sec-head"><span class="eyebrow reveal">${L.catsEyebrow}</span><h2 class="sec-title serif reveal d1">${L.catsTitlePre}<span class="grad-text">${L.catsTitleEm}</span>${L.catsTitlePost}</h2><p class="sec-sub reveal d2">${isFree ? L.catsSubFree : L.catsSubPartial}</p></div>
    <div class="grid">${cats}</div>
  </div></section>

  <section class="feat"><div class="wrap">
    <div class="sec-head"><span class="eyebrow reveal">${L.featEyebrow}</span><h2 class="sec-title serif reveal d1">${L.featTitlePre}<span class="grad-text">${L.featTitleEm}</span>${L.featTitlePost}</h2></div>
    <div class="frow">${feats}</div>
  </div></section>

  <section class="social"><div class="wrap">
    <div class="sec-head"><span class="eyebrow reveal">${L.socialEyebrow}</span><h2 class="sec-title serif reveal d1">${L.socialTitlePre}<span class="grad-text">${L.socialTitleEm}</span>${L.socialTitlePost}</h2></div>
    <div class="sstats">${sstats}</div>
    <div class="reviews">${reviews}</div>
  </div></section>

  <section class="offer" id="offerta"><div class="wrap">
    <div class="sec-head"><span class="eyebrow reveal">${L.offerEyebrow}</span><h2 class="sec-title serif reveal d1">${L.offerTitlePre}<span class="grad-text">${L.offerTitleEm}</span></h2></div>
    <div class="obox reveal d2">
      <span class="seal">${L.seal}</span><h3>${L.offerH3}</h3><div class="sub">${L.offerSub}</div>
      <div class="priceline"><span class="old">${PREMIUM.anchor}</span><span class="new">${PREMIUM.price}</span></div>
      <span class="save">${L.save}</span>
      <ul class="olist">${olist}</ul>
      <button class="btn btn-primary" style="width:100%" data-buy>${L.buy(PREMIUM.price)}</button>
      <div class="terms">${L.terms.map((t) => `<span>${t}</span>`).join("")}</div>
    </div>
  </div></section>

  <section class="faq"><div class="wrap">
    <div class="sec-head"><span class="eyebrow reveal">${L.faqEyebrow}</span><h2 class="sec-title serif reveal d1">${L.faqTitlePre}<span class="grad-text">${L.faqTitleEm}</span>${L.faqTitlePost}</h2></div>
    <div class="faq-list">${faq}</div>
  </div></section>

  <section class="final"><div class="wrap">
    <h2 class="reveal">${L.finalPre}<span class="grad-text">${L.finalEm}</span>${L.finalPost}</h2>
    <p class="reveal d1">${L.finalP}</p>
    <button class="btn btn-giant reveal d2" data-buy>${L.finalBtn}</button>
    <div class="micro reveal d3"><span class="stars">★★★★★</span> ${L.finalMicro(PREMIUM.members, PREMIUM.price)}</div>
  </div></section>

  <div class="foot">${L.foot}</div>

  <div class="sticky" data-sticky><div class="inner"><div class="pr"><b>${PREMIUM.price}</b><s>${PREMIUM.anchor}</s><i>${L.stickyI}</i></div><button class="btn btn-primary" data-buy>${L.stickyBtn}</button></div></div>
  `;
}

export default function Premium() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const rootRef = useRef(null);
  const lang = new URLSearchParams(window.location.search).get("lang") === "pt" ? "pt" : "it";

  useEffect(() => {
    let alive = true;
    base44.auth.me().then((u) => {
      if (!alive) return;
      if (u?.is_full_premium) { navigate("/Home", { replace: true }); return; }
      setUser(u); setReady(true);
      trackEvent("premium_page_view", { plan: u?.plan || "free", products: (u?.purchased_products || []).length });
    }).catch(() => { if (alive) { setUser(null); setReady(true); } });
    return () => { alive = false; };
  }, [navigate]);

  useEffect(() => {
    if (!ready) return;
    const root = rootRef.current;
    if (!root) return;
    const cleanups = [];

    const revs = root.querySelectorAll(".reveal");
    const io = new IntersectionObserver((en) => {
      en.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    revs.forEach((r) => { if (!r.classList.contains("in")) io.observe(r); });
    cleanups.push(() => io.disconnect());

    const fmt = (n) => n.toLocaleString(lang === "pt" ? "pt-BR" : "it-IT");
    const counters = root.querySelectorAll("[data-count]");
    const animateCount = (el) => {
      if (el.dataset.counted) return; el.dataset.counted = "1";
      const t = parseInt(el.getAttribute("data-count"), 10) || 0;
      const suf = el.getAttribute("data-suffix") || "";
      let start = null; const dur = 1300;
      const step = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / dur, 1), e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(Math.floor(e * t)) + (p === 1 ? suf : "");
        if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(t) + suf;
      };
      requestAnimationFrame(step);
    };
    const cio = new IntersectionObserver((en) => {
      en.forEach((e) => { if (e.isIntersecting) { animateCount(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.35 });
    counters.forEach((c) => cio.observe(c));
    cleanups.push(() => cio.disconnect());

    const fill = root.querySelector("[data-fill]");
    const fillT = setTimeout(() => {
      if (fill) {
        const cap = root.querySelector(".usage .cap span:last-child");
        const m = (cap ? cap.textContent : "1%").match(/(\d+)%/);
        fill.style.width = (m ? m[1] : "1") + "%";
      }
    }, 450);
    cleanups.push(() => clearTimeout(fillT));

    const sticky = root.querySelector("[data-sticky]");
    const onScroll = () => { if (sticky) sticky.classList.toggle("show", window.scrollY > 520); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    cleanups.push(() => window.removeEventListener("scroll", onScroll));

    const buy = () => { trackEvent("premium_buy_click", { lang }); window.open(PREMIUM.link, "_blank", "noopener"); };
    root.querySelectorAll("[data-buy]").forEach((b) => b.addEventListener("click", buy));
    const back = () => navigate(-1);
    root.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", back));

    return () => { cleanups.forEach((fn) => fn()); };
  }, [ready, navigate, lang]);

  if (!ready) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0b2417]">
        <div className="w-8 h-8 border-4 border-white/20 border-t-[#F3B14A] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <style>{STYLE}</style>
      <div className="gpx" ref={rootRef} dangerouslySetInnerHTML={{ __html: buildHTML(user, lang) }} />
    </div>
  );
}
