export interface CurrentSelection {
  size: string;
  tea: string;
  flavors: string[];
  toppings: string[];
  sweetness: string;
  ice: string;
}

export interface OrderItem extends CurrentSelection {
  lineId: number;     
  drinkId: number; 
  price: number;  
  teaId: number;   
  flavorIds: number[];
  toppingIds: number[];
  sugarPct: 0 | 50 | 100 | 150;
  icePct: -1 | 0 | 50 | 100 | 200;
  quantity: number;
}

export interface InventoryItem {
  id: number;
  name: string;
  quantityLeft: number;
  quantityUsed: number;
  salePrice: number;
  reorderPrice: number;
}
