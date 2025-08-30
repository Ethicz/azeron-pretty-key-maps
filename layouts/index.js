// Auto register all layout files
const modules = import.meta.glob("./*.js", { eager: true, import: "default" });

const all = Object.values(modules)
  .filter(Boolean)
  .map(m => ({ id: m.id, name: m.name, positions: m.positions }));

// dropdown order
const order = ["cyro", "classic", "compact", "cyborg", "keyzen"];
export const layouts = all
  .filter(l => order.includes(l.id))
  .sort((a,b) => order.indexOf(a.id) - order.indexOf(b.id));

export const byId = new Map(layouts.map(l => [l.id, l]));
