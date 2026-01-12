import React, { useState, useEffect } from 'react';
import { OrderItem, CurrentSelection } from '../types/order';
import './cashierPage.css';

//const API = process.env.REACT_APP_API_BASE || 'http://localhost:8080';
// for running locally
const API = 'http://localhost:8080';

const CashierPage: React.FC = () => {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [currentSelection, setCurrentSelection] = useState<CurrentSelection>({
    size: '',
    tea: '',
    flavors: [],
    toppings: [],
    sweetness: '',
    ice: ''
  });

  const [seasonalMenu, setSeasonalMenu] = useState<{
    seasonalTeas: { id: number; name: string }[];
    seasonalFlavors: { id: number; name: string }[];
    seasonalToppings: { id: number; name: string }[];
  } | null>(null);


  // setting up state variables

  const [employeeId, setEmployeeId] = useState<string>(''); 
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [points, setPoints] = useState<number | null>(null);
  const [useReward, setUseReward] = useState(false);

  const baseTeaOptions = ['Green Tea', 'Black Tea', 'Osmanthus Oolong Tea', 'High Mountain Pouchong Tea', 'Dong Ding Oolong Tea', 'Cassia Black Tea', 'Lychee Tea', 'Thai Tea', 'Coffee', 'Taro Tea', 'Matcha'];
  const baseFlavorOptions = ['None', 'Honey', 'Lemon Juice', 'Passion Fruit', 'Mango', 'Cream', 'Mousse', 'Milk', 'Oat Milk', 'Wintermelon', 'Strawberry'];
  const baseToppingOptions = ['None', 'Bubble', 'Konjac', 'Coconut Jelly', 'Grass Jelly', 'Taro Ball', 'Lychee Jelly', 'Pudding', 'Popping Boba', 'Crystal Boba'];
  const sweetnessOptions = ['None', 'Light', 'Perfect', 'Extra'];
  const iceOptions = ['Hot', 'No Ice', 'Light Ice', 'Regular Ice', 'Blended'];
  const sizes = ['Small', 'Medium', 'Large'];

  // combine with seasonal options
  const teaOptions = [
    ...baseTeaOptions,
    ...(seasonalMenu?.seasonalTeas.map(t => t.name) || [])
  ];
  const flavorOptions = [
    ...baseFlavorOptions,
    ...(seasonalMenu?.seasonalFlavors.map(f => f.name) || [])
  ];
  const toppingOptions = [
    ...baseToppingOptions,
    ...(seasonalMenu?.seasonalToppings.map(t => t.name) || [])
  ];

  // mapping selection names to their respective IDs
  const TEA_ID: Record<string, number> = {
    'Lychee Tea': 10,
    'Green Tea': 11,
    'Osmanthus Oolong Tea': 12,
    'Black Tea': 13,
    'Cassia Black Tea': 14,
    'High Mountain Pouchong Tea': 15,
    'Dong Ding Oolong Tea': 16,
    'Thai Tea': 17,
    'Coffee': 18,
    'Taro Tea': 19,
    'Matcha': 20,
  };
  const FLAVOR_ID: Record<string, number> = {
    'Honey': 21,
    'Lemon Juice': 22,
    'Passion Fruit': 23,
    'Mango': 24,
    'Cream': 25,
    'Mousse': 26,
    'Milk': 27,
    'Oat Milk': 28,
    'Wintermelon': 29,
    'Strawberry': 30,
    'None': 0,
  };
  const TOPPING_ID: Record<string, number> = {
    'Bubble': 31, 
    'Konjac': 32, 
    'Coconut Jelly': 33, 
    'Grass Jelly': 34,
    'Taro Ball': 35,
    'Lychee Jelly': 36,
    'Pudding': 37,
    'Popping Boba': 39,
    'Crystal Boba': 38,
    'None': 0,
  };
  const SIZE_PRICE: Record<string, number> = {
    'Small': 0,
    'Medium': 0.5,
    'Large': 1.0,
  };

  // seasonal IDs
  if (seasonalMenu) {
    seasonalMenu.seasonalTeas.forEach(tea => {
      TEA_ID[tea.name] = tea.id;
    });
    seasonalMenu.seasonalFlavors.forEach(flavor => {
      FLAVOR_ID[flavor.name] = flavor.id;
    });
    seasonalMenu.seasonalToppings.forEach(topping => {
      TOPPING_ID[topping.name] = topping.id;
    });
  }

  const SWEET_TO_PCT: Record<string, 0 | 50 | 100 | 150> = { 'None': 0, 'Light': 50, 'Perfect': 100, 'Extra': 150 };
  const ICE_TO_PCT:   Record<string, -1 | 0 | 50 | 100 | 200> = { 'Hot':-1, 'No Ice': 0, 'Light Ice': 50, 'Regular Ice': 100, 'Blended':200 };

  // fetch seasonal menu on component mount
  useEffect(() => {
    const fetchSeasonalMenu = async () => {
      try {
        const response = await fetch(`${API}/api/menu/seasonal`);
        if (response.ok) {
          const data = await response.json();
          setSeasonalMenu(data);
        }
      } catch (err) {
        console.error('Failed to load seasonal menu:', err);
      } finally {
        setLoadingMenu(false);
      }
    };

    fetchSeasonalMenu();
  }, []);

  type HappyHourInfo = {
    isCurrentlyActive: boolean;
    discountPercent: number;
  };
  
  const [happyHour, setHappyHour] = useState<HappyHourInfo | null>(null);
  
  useEffect(() => {
    const fetchHappyHour = async () => {
      try {
        const res = await fetch(`${API}/api/happy-hour`);
        if (!res.ok) return; // just silently ignore if it fails
        const data = await res.json();
        setHappyHour({
          isCurrentlyActive: !!data.isCurrentlyActive,
          discountPercent: Number(data.discountPercent) || 0,
        });
      } catch (err) {
        console.error('Error fetching happy hour info:', err);
      }
    };
  
    fetchHappyHour();
  }, []);  

  // backend helpers
  async function resolveDrink(teaId: number, flavorIds: number[], toppingIds: number[], sugarPct: 0|50|100|150, icePct: -1|0|50|100|200, size: 'Small' | 'Medium' | 'Large') {
    const qs = new URLSearchParams({
      teaId: String(teaId),
      flavorIds: flavorIds.join(','),
      toppingIds: toppingIds.join(','),
      sugar: String(sugarPct / 100), 
      ice: String(icePct / 100),
      size: size,
    });
    const r = await fetch(`${API}/api/drinks/resolve?${qs.toString()}`);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error ?? 'Drink not found (ensure row exists in drinks table)');
    return data as { drinkId: number; price: number };
  }

  async function postOrder(items: OrderItem[], empId: number) {
    const payload = {
      employeeId: empId,
      items: items.map(d => ({
        drinkId: d.drinkId,
        teaId: d.teaId,
        flavorId: d.flavorIds,
        toppingId: d.toppingIds,
        sugar: d.sugarPct / 100,
        ice: d.icePct / 100,
      })),
    };
    const r = await fetch(`${API}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error ?? 'Order failed');
    return data as { orderId: number; price: number };
  }

  // order selection handlers
  const handleSelection = (category: keyof CurrentSelection, value: string) => {
      setCurrentSelection(prev => {
        // handle multi-select flavor and toppings
        if (category === 'flavors' || category === 'toppings') {
          let arr = prev[category] as string[];
  
          // if None is selected, clear all others
          if (value == 'None') {
            return {
              ...prev,
              [category]: ['None']
            }
          };
  
          // remove None if other value is selected
          arr = arr.filter(v => v !== 'None');
  
          // toggle selection
          if (arr.includes(value)) {
            arr = arr.filter(v => v !== value);
          } else {
            arr.push(value);
          }
          return {
            ...prev,
            [category]: arr 
          };
        }
        // single select for other categories
        return {
          ...prev,
          [category]: prev[category] === value ? '' : value
        };
      });
    };

    const addToOrder = async () => {
      setError('');
      if (
        !currentSelection.size ||
        !currentSelection.tea ||
        currentSelection.flavors.length === 0 ||
        currentSelection.toppings.length === 0 ||
        !currentSelection.sweetness ||
        !currentSelection.ice
      ) {
        setError('Please select size, tea, flavor, topping, sweetness, and ice.');
        return;
      }
    
      const teaId = TEA_ID[currentSelection.tea] ?? 0;
      const flavorIds = (currentSelection.flavors.length
        ? currentSelection.flavors.map(f => FLAVOR_ID[f] ?? 0)
        : [0]);
      const toppingIds = (currentSelection.toppings.length
        ? currentSelection.toppings.map(t => TOPPING_ID[t] ?? 0)
        : [0]);
      const sugarPct = (SWEET_TO_PCT[currentSelection.sweetness] ?? 100) as 0 | 50 | 100;
      const icePct = (ICE_TO_PCT[currentSelection.ice] ?? 100) as 0 | 50 | 100;
      const size = currentSelection.size as 'Small' | 'Medium' | 'Large';
    
      if (!teaId) {
        setError(`Unknown tea selection: ${currentSelection.tea}`);
        return;
      }
    
      setBusy(true);
      try {
        const { drinkId, price } = await resolveDrink(
          teaId,
          flavorIds,
          toppingIds,
          sugarPct,
          icePct,
          size,
        );
    
        const newItemBase: Omit<OrderItem, 'quantity'> = {
          lineId: Date.now(),
          ...currentSelection,
          drinkId,
          price,
          teaId,
          flavorIds,
          toppingIds,
          sugarPct,
          icePct,
        };
    
        setOrders(prev => {
          const sameArray = (a: string[], b: string[]) =>
            a.length === b.length && a.every((v, i) => v === b[i]);
    
          // look for an identical drink already in the order
          const idx = prev.findIndex(o =>
            o.size === newItemBase.size &&
            o.tea === newItemBase.tea &&
            sameArray(o.flavors, newItemBase.flavors) &&
            sameArray(o.toppings, newItemBase.toppings) &&
            o.sweetness === newItemBase.sweetness &&
            o.ice === newItemBase.ice &&
            o.sugarPct === newItemBase.sugarPct &&
            o.icePct === newItemBase.icePct
          );
    
          if (idx !== -1) {
            // bump quantity instead of adding a new line
            const copy = [...prev];
            copy[idx] = {
              ...copy[idx],
              quantity: (copy[idx].quantity ?? 1) + 1,
            };
            return copy;
          }
    
          // otherwise add a new line with quantity 1
          return [...prev, { ...newItemBase, quantity: 1 }];
        });
    
        setCurrentSelection({
          size: '',
          tea: '',
          flavors: [],
          toppings: [],
          sweetness: '',
          ice: '',
        });
      } catch (e: any) {
        setError(String(e.message ?? e));
      } finally {
        setBusy(false);
      }
    };
    
  const updateQuantity = (lineId: number, delta: number) => {
    setOrders(prev =>
      prev.map(o =>
        o.lineId === lineId
          ? { ...o, quantity: Math.max(1, (o.quantity ?? 1) + delta) }
          : o
      )
    );
  };

  // remove and complete functionality
  const removeOrder = (lineId: number) => {
    setOrders(orders.filter(order => order.lineId !== lineId));
  };  

  const completeOrder = async () => {
    setError('');
    if (!orders.length) return;

    const empId = Number(employeeId);
    if (!employeeId || Number.isNaN(empId)) {
      setError('Enter a valid Employee ID before completing the order.');
      return;
    }

    setBusy(true);
    try {
      const expandedItems = orders.flatMap(d =>
        Array.from({ length: d.quantity ?? 1 }, () => ({
          drinkId: d.drinkId,
          teaId: d.teaId,
          flavorIds: d.flavorIds,
          toppingIds: d.toppingIds,
          sugar: d.sugarPct / 100,
          ice: d.icePct / 100,
        }))
      );

      const payload = {
        employeeId: empId,
        items: expandedItems,
      };

      const r = await fetch(`${API}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (r.ok) {
        const data = await r.json();
        alert(`Order #${data.orderId} completed! Total: $${finalTotal.toFixed(2)}`);

        // updating the customer's points if they logged in
        if(phoneNumber) {
          // $1 = 1 point
          const addPoints = Math.floor(finalTotal);
          let newPointTotal = points ?? 0;

          // subtract redeemed points
          if(useReward && points !== null && points >= 50) {
            newPointTotal -= 50;
          }

          newPointTotal += addPoints;

          await fetch(`${API}/api/rewards/${phoneNumber}`, {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ points: newPointTotal })
          });

          setPoints(newPointTotal);
          setUseReward(false);
        }

        // resets the rewards box once the order is complete
        setPhoneNumber("");
        setPoints(null);
        setUseReward(false);

        setOrders([]);
        setEmployeeId('');
        return;
      }

      let msg = `Order failed (${r.status})`;
      const text = await r.text();
      try {
        const asJson = JSON.parse(text);
        const errField = asJson?.error ?? asJson?.message ?? asJson;
        if (typeof errField === 'string') msg = errField;
        else msg = JSON.stringify(errField); 
      } catch {
        if (text) msg = text; 
      }
      throw new Error(msg);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }

  };

  const originalSubtotal = orders.reduce(
    (sum, d) => sum + d.price * (d.quantity ?? 1),
    0
  );

  // for submitting a phone number for rewards
  const handlePhoneSubmit = async () => {
    if (phoneNumber.replace(/\D/g, "").length < 10) {
      alert("Please enter a valid 10-digit phone number.");
      return;
    }
    setError(null);
    setBusy(true);

    try {
      // getting points from the database
      const res = await fetch(`${API}/api/rewards/${phoneNumber}`);
      const text = await res.text();

      // if the phone number is in the database, display points
      if(res.ok) {
        const data = JSON.parse(text);
        setPoints(data.points);
      }
      // if not found, add with 0 points
      else {
        const upsert = await fetch(`${API}/api/rewards/${phoneNumber}`, {
          method: "PUT",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({points:0})
        });

        const upsertText = await upsert.text();
        if (!upsert.ok) throw new Error(upsertText);

        const newData = JSON.parse(upsertText);
        setPoints(newData.reward.points);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const logoutRewards = () => {
    setPhoneNumber('');
    setPoints(null);
    setUseReward(false);
  };

  let discountedSubtotal =
    happyHour?.isCurrentlyActive && happyHour.discountPercent > 0
      ? Number(
          (originalSubtotal * (1 - happyHour.discountPercent / 100)).toFixed(2)
        )
      : originalSubtotal;

  let finalTotal = discountedSubtotal;
  let orderTax = (finalTotal*0.0825).toFixed(2);
  finalTotal = finalTotal*1.0825;
  // calculating the total after rewards if necessary, happens after happy hour
  const discount = useReward && points !== null && points >= 50 ? 5 : 0;
  finalTotal = Math.max(0, finalTotal - discount);

  // checking if item is seasonal helper function
  const isSeasonalItem = (name: string, category: 'tea' | 'flavor' | 'topping') => {
  let id = 0;
  
  if (category === 'tea') {
    id = TEA_ID[name] ?? 0;
    return id >= 50 && id <= 59;  // seasonal teas
  } else if (category === 'flavor') {
    id = FLAVOR_ID[name] ?? 0;
    return id >= 60 && id <= 69;  // seasonal flavors
  } else if (category === 'topping') {
    id = TOPPING_ID[name] ?? 0;
    return id >= 70 && id <= 79;  // seasonal toppings
  }
  
  return false;
};

  // update date and time
  const [dAndT, setDandT] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setDandT(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

    // add weather
    const [temp, setTemp] = useState<number | null>(null);
    const [weatherCode, setWeatherCode] = useState<number | null>(null);
    useEffect(() => {
      const fetchWeather = async () => {
        try {
          const res = await fetch(`${API}/api/weather`);
          const data = await res.json();
  
          if (res.ok && data.temp !== undefined) {
            setTemp(data.temp);
          } else {
            setError(data.error || "Failed to load weather");
          }
          if (res.ok && data.weatherCode !== undefined) {
            setWeatherCode(data.weatherCode);
          } else {
            setError(data.error || "Failed to load weather");
          }
        } catch (err) {
          console.error(err);
        } 
      };
      fetchWeather();
    }, []);
  

  // rendering GUI
  return (
    <div className="order-container">
      <div className="order-wrapper">
        <header className="order-header">
          <h1 className="order-title">ChiCha San Chen</h1>
          <div className="order-date-info">
            <div className="weather-info">
              {weatherCode == 0 ? <div>☀️ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 1 ? <div>🌤️ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 2 ? <div>⛅ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 3 ? <div>☁️ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 45 || weatherCode == 48 ? <div>🌫️ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 51 || weatherCode == 53 || weatherCode == 55 ? <div>🌦️ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 56 || weatherCode == 57 || weatherCode == 66 || weatherCode == 67 ? <div>🌧️❄️ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 61 || weatherCode == 63 || weatherCode == 65 ? <div>🌧️ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 71 || weatherCode == 72 || weatherCode == 73 || weatherCode == 75 || weatherCode == 77? <div>❄️ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 80 || weatherCode == 81 ? <div>🌧️ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 82 || weatherCode == 95 ? <div>⛈️ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 85 || weatherCode == 86 ? <div>🌨️ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 96 || weatherCode == 99 ? <div>⛈️❄️ {temp?.toFixed(1)}°F</div> : null}
            </div>
            <span> 
              {dAndT.toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </span>
            <span>
              {dAndT.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        </header>

        <div className="order-content">
          <div className="order-selection-panel">
            <header className="order-panel-title">Create Your Order</header>

            {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}

            <div className="order-section">
              <label className="order-label">SIZE:</label>
              <div className="button-grid button-grid-6">
                {sizes.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelection('size', option)}
                    className={`option-button ${currentSelection.size === option ? 'selected' : ''}`}
                    disabled={busy}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                  >
                    <span>{option}</span>
                    {SIZE_PRICE[option] > 0 && (
                      <span style={{ fontSize: '0.8em', marginTop: 2 }}>
                        +${SIZE_PRICE[option].toFixed(2)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="order-section">
              <label className="order-label">DRINK BASE:</label>
              <div className="button-grid button-grid-6">
                {teaOptions.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelection('tea', option)}
                    className={`option-button ${currentSelection.tea === option ? 'selected' : ''} ${isSeasonalItem(option, 'tea') ? 'seasonal' : ''}`}
                    disabled={busy}
                  >
                    {option} {isSeasonalItem(option, 'tea') && '⭐'}
                  </button>
                ))}
              </div>
            </div>

            <div className="order-section">
              <label className="order-label">FLAVOR: CHOOSE UP TO 10</label>
              <div className="button-grid button-grid-6">
                {flavorOptions.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelection('flavors', option)}
                    className={`option-button ${currentSelection.flavors.includes(option) ? 'selected' : ''} ${isSeasonalItem(option, 'flavor') ? 'seasonal' : ''}`}
                    disabled={busy}
                  >
                    {option} {isSeasonalItem(option, 'flavor') && '⭐'}
                  </button>
                ))}
              </div>
            </div>

            <div className="order-section">
              <label className="order-label">TOPPINGS: CHOOSE UP TO 10</label>
              <div className="button-grid button-grid-6">
                {toppingOptions.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelection('toppings', option)}
                    className={`option-button ${currentSelection.toppings.includes(option) ? 'selected' : ''} ${isSeasonalItem(option, 'topping') ? 'seasonal' : ''}`}
                    disabled={busy}
                  >
                    {option} {isSeasonalItem(option, 'topping') && '⭐'}
                  </button>
                ))}
              </div>
            </div>

            <div className="order-section">
              <label className="order-label">SWEETNESS:</label>
              <div className="button-grid button-grid-5">
                {sweetnessOptions.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelection('sweetness', option)}
                    className={`option-button ${currentSelection.sweetness === option ? 'selected' : ''}`}
                    disabled={busy}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="order-section">
              <label className="order-label">ICE:</label>
              <div className="button-grid button-grid-4">
                {iceOptions.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelection('ice', option)}
                    className={`option-button ${currentSelection.ice === option ? 'selected' : ''}`}
                    disabled={busy}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="add-button-container">
              <button
                onClick={addToOrder}
                className="add-button"
                disabled={
                  busy ||
                  !currentSelection.size ||
                  !currentSelection.tea ||
                  currentSelection.flavors.length === 0 ||
                  currentSelection.toppings.length === 0 ||
                  !currentSelection.sweetness ||
                  !currentSelection.ice
                }
              >
                {busy ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>

          <div className="order-summary-panel">
          {happyHour?.isCurrentlyActive && happyHour.discountPercent > 0 && (
            <div className="happy-hour-banner">
              <div>
                🎉 <strong>Happy Hour!</strong>{' '}
                <span>
                  All drinks {happyHour.discountPercent}% off.
                </span>
              </div>
            </div>
          )}
            <header className="order-summary-title">Current Order</header>

            <div style={{ marginBottom: 10 }}>
              <label>
                Employee ID:&nbsp;
                <input
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="e.g., 123"
                  disabled={busy}
                  style={{ padding: '6px 8px' }}
                />
              </label>
            </div>

            <div className="order-items-container">
              {orders.length === 0 ? (
                <p className="empty-order">No items yet</p>
              ) : (
                orders.map((order, idx) => (
                  <div key={order.lineId} className="order-item">
                    <div className="order-item-title">Drink {idx + 1}:</div>
                    <ul className="order-item-list">
                      <li>• {order.size}</li>
                      <li>• {order.tea}</li>
                      <li>
                        • {Array.isArray(order.flavors) ? order.flavors.join(', ') : order.flavors}
                      </li>
                      <li>
                        • {Array.isArray(order.toppings) ? order.toppings.join(', ') : order.toppings}
                      </li>
                      <li>• {order.sweetness}</li>
                      <li>• {order.ice}</li>
                      <li>• Qty: {order.quantity ?? 1}</li>
                      <li>
                        • Line total: $
                        {(order.price * (order.quantity ?? 1)).toFixed(2)}
                      </li>
                    </ul>

                    {/* quantity / duplicate controls */}
                    <div className="quantity-controls">
                      <button
                        className="qty-btn"
                        onClick={() => updateQuantity(order.lineId, -1)}
                        disabled={busy || (order.quantity ?? 1) <= 1}
                      >
                        −
                      </button>
                      <span className="qty-value">{order.quantity ?? 1}</span>
                      <button
                        className="qty-btn"
                        onClick={() => updateQuantity(order.lineId, +1)}
                        disabled={busy}
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeOrder(order.lineId)}
                      className="remove-button"
                      disabled={busy}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: 8, fontWeight: 600, fontSize: '1.2rem' }}>
              {happyHour?.isCurrentlyActive && happyHour.discountPercent > 0 ? (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                    Original total:{' '}
                    <span style={{ textDecoration: 'line-through' }}>
                      ${originalSubtotal.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                    Happy Hour total:{' '}
                    <span>
                      ${discountedSubtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <p></p>
              )}
            </div>
            <p style={{fontSize: '1rem'}}>Tax: ${orderTax}</p>
            <p style={{fontSize: '1.2rem', fontWeight: 700}}>Final Total: ${finalTotal.toFixed(2)}</p>
            {discount > 0 && <span style={{color: "green"}}> (-$5 reward redeemed)</span>}

            <button
              onClick={completeOrder}
              className="complete-button"
              disabled={busy || orders.length === 0}
            >
              {busy ? 'Completing…' : 'Complete'}
            </button>

            {points !== null ? (
                <div className='customer-rewards-container'>
                  <header>Welcome!</header>
                  <p>Phone: {phoneNumber}</p>
                  <p>Customer Points: {points}</p>

                  {points >= 50 ? (
                    <label style={{marginTop: "10px", display: "block"}}>
                      <input
                        type="checkbox"
                        checked={useReward}
                        onChange={() => setUseReward(!useReward)}
                      />
                      Redeem 50 points for $5 off
                    </label>
                  ) : (
                    <p>Customer needs at least 50 points to redeem.</p>
                  )}
                </div>
              ) : (
                <div className="customer-rewards-container">
                  Earn Rewards! $1 = 1 point<br></br>
                  Enter your phone number (only digits) below to log in or create an account:<br></br>
                  <div className="form-row">
                    <input 
                      value={phoneNumber} 
                      onChange={e => {const digitsOnly = e.target.value.replace(/\D/g, "");
                        setPhoneNumber(digitsOnly)}}
                      maxLength={10} 
                      minLength={10} 
                      disabled={busy} 
                      placeholder='ex. 1234567890'
                    />
                  </div>
                  <button disabled={busy} onClick={handlePhoneSubmit}>Submit</button>
                </div>
              )}

              {points !== null && (
                <button
                  onClick={logoutRewards}
                  className="logout-rewards-btn"
                >
                  Log Out
                </button>
              )}

          </div>
        </div>
      </div>
    </div>
  );
};
export default CashierPage;