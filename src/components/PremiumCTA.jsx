// Dados oficiais do Premium (espelham a página de vendas). Editar aqui muda em todo o app.
export const PREMIUM = {
  link: "https://pay.hotmart.com/L104095305F?off=swawlhuf&checkoutMode=10",
  price: "34,90 €",
  anchor: "€94,99",
  members: "53.000+",
  rating: "4.9",
  recipes: "5.000+",
};

// Linha de reforço sob os CTAs: ancoragem de preço + garantia + prova social.
// `light` para fundos escuros (texto claro).
export function PremiumReassurance({ light = false }) {
  const sub = light ? "text-white/80" : "text-gray-400 dark:text-gray-500";
  const strong = light ? "text-white" : "text-gray-800 dark:text-gray-200";
  return (
    <div className="space-y-1 text-center">
      <p className={`text-xs ${sub}`}>
        <span className="line-through opacity-70">{PREMIUM.anchor}</span>{" "}
        <span className={`font-bold ${strong}`}>{PREMIUM.price}</span> · pagamento unico
      </p>
      <p className={`text-[11px] ${sub}`}>
        🔒 Garanzia 7 giorni · accesso immediato · {PREMIUM.members} membri ★{PREMIUM.rating}
      </p>
    </div>
  );
}
