const API = process.env.REACT_APP_API_BASE || "http://localhost:8080";
export default API;

export type SeasonalMenu = {
  seasonalTeas: { id: number; name: string }[];
  seasonalFlavors: { id: number; name: string }[];
  seasonalToppings: { id: number; name: string }[];
};

export async function fetchSeasonalMenu(): Promise<SeasonalMenu> {
  const r = await fetch(`${API}/api/menu/seasonal`);
  if (!r.ok) throw new Error("failed to load seasonal menu");
  return r.json();
}

export type ResolvedDrink = { drinkId: number; price: number };

export async function resolveDrink(opts: {
  teaId: number;
  flavorId: number;
  toppingId: number;
  sugarPct: 0 | 50 | 100 | 150;
  icePct: -1 | 0 | 50 | 100 | 200;
}): Promise<ResolvedDrink> {
  const q = new URLSearchParams({
    teaId: String(opts.teaId),
    flavorId: String(opts.flavorId),
    toppingId: String(opts.toppingId),
    sugar: String(opts.sugarPct / 100), 
    ice: String(opts.icePct / 100)
  });
  const r = await fetch(`${API}/api/drinks/resolve?${q}`);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? "drink not found");
  return data;
}

export async function placeOrder(payload: {
  employeeId: number;
  items: Array<{
    drinkId: number;
    teaId: number;
    flavorId: number;
    toppingId: number;
    sugarPct: 0 | 50 | 100;
    icePct: 0 | 50 | 100;
  }>;
}): Promise<{ orderId: number; price: number }> {
  const body = {
    employeeId: payload.employeeId,
    items: payload.items.map(i => ({
      drinkId: i.drinkId,
      teaId: i.teaId,
      flavorId: i.flavorId,
      toppingId: i.toppingId,
      sugar: i.sugarPct / 100,
      ice: i.icePct / 100
    }))
  };
  const r = await fetch(`${API}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? "order failed");
  return data;
}
