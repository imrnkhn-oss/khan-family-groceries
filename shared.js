// Store sections in walking order, with keywords used to sort items automatically.
const AISLES = [
  ["produce", "Produce", ["apple","banana","orange","lemon","lime","grape","berr","avocado","tomato","potato","onion","garlic","ginger","lettuce","spinach","kale","carrot","cucumber","pepper","broccoli","cauliflower","mushroom","cilantro","mint","parsley","herb","mango","melon","fruit","veg","zucchini","eggplant","okra","celery","corn","peach","pear","salad"]],
  ["bakery", "Bakery", ["bread","bagel","bun","roll","naan","pita","tortilla","croissant","muffin","cake","roti","paratha"]],
  ["meat", "Meat & fish", ["chicken","beef","lamb","goat","mutton","turkey","fish","salmon","shrimp","tuna","meat","steak","mince","keema","sausage"]],
  ["dairy", "Dairy & eggs", ["milk","egg","cheese","yogurt","yoghurt","butter","cream","dahi","paneer","ghee"]],
  ["pantry", "Pantry", ["rice","flour","atta","sugar","salt","oil","pasta","noodle","lentil","dal","daal","bean","chickpea","chana","spice","masala","cereal","oat","tea","chai","earl grey","coffee","sauce","ketchup","honey","jam","nut","almond","snack","chip","cookie","biscuit","can","soup","vinegar","peanut","chocolate"]],
  ["frozen", "Frozen", ["frozen","ice cream","pizza","fries"]],
  ["drinks", "Drinks", ["water","juice","soda","coke","pepsi","sprite","drink","seltzer"]],
  ["household", "Household", ["paper towel","toilet","tissue","soap","detergent","dish","bleach","trash bag","foil","wrap","sponge","shampoo","toothpaste","napkin","battery","litter","cat food"]],
  ["other", "Other", []]
];
function guessAisle(name) {
  const n = String(name).toLowerCase();
  for (const [key, , words] of AISLES) if (words.some(w => n.includes(w))) return key;
  return "other";
}
function emptyState() { return { items: [], history: [], applied: [], updated: null }; }
// Applies one change to the list. Ops carry ids so a retried request is applied once.
function apply(state, op) {
  if (!op || typeof op.id !== "string" || state.applied.includes(op.id)) return false;
  const items = state.items;
  if (op.t === "add" && op.item && op.item.name) {
    const name = String(op.item.name).slice(0, 60);
    const dupe = items.find(i => !i.checked && i.name.toLowerCase() === name.toLowerCase());
    if (dupe) { if (op.item.qty) dupe.qty = String(op.item.qty).slice(0, 12); }
    else items.push({ id: String(op.item.id || op.id).slice(0, 40), name, qty: String(op.item.qty || "").slice(0, 12),
      aisle: guessAisle(name), checked: false, by: String(op.item.by || "").slice(0, 20), at: new Date().toISOString() });
  } else if (op.t === "toggle") {
    const it = items.find(i => i.id === op.itemId); if (it) it.checked = !!op.checked;
  } else if (op.t === "qty") {
    const it = items.find(i => i.id === op.itemId); if (it) it.qty = String(op.qty || "").slice(0, 12);
  } else if (op.t === "del") {
    state.items = items.filter(i => i.id !== op.itemId);
  } else if (op.t === "clear" && Array.isArray(op.ids)) {
    const at = new Date().toISOString();
    for (const b of items.filter(i => i.checked && op.ids.includes(i.id))) {
      const h = state.history.find(x => x.name.toLowerCase() === b.name.toLowerCase());
      if (h) { h.count = (h.count || 1) + 1; h.last = at; h.aisle = b.aisle; }
      else state.history.push({ name: b.name, aisle: b.aisle, count: 1, last: at });
    }
    state.items = items.filter(i => !(i.checked && op.ids.includes(i.id)));
    state.history.sort((a, b) => (b.last || "").localeCompare(a.last || ""));
    state.history = state.history.slice(0, 60);
  } else return false;
  state.applied.push(op.id);
  if (state.applied.length > 500) state.applied = state.applied.slice(-500);
  state.updated = new Date().toISOString();
  return true;
}
if (typeof module !== "undefined") module.exports = { AISLES, guessAisle, apply, emptyState };
