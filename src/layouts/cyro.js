const KEY_W = 120, KEY_H = 140, GAP_X = 22, GAP_Y = 16, START_X = 60, START_Y = 60;
const xs = [...Array(9)].map((_,i)=> START_X + i*(KEY_W+GAP_X));
const ys = [...Array(6)].map((_,i)=> START_Y + i*(KEY_H+GAP_Y));

export default {
  id: "cyro",
  name: "Cyro",
  positions: {
    "28": { x: xs[7], y: ys[0] },
    "29": { x: xs[6], y: ys[1] }, "20": { x: xs[7], y: ys[1] }, "31": { x: xs[8], y: ys[1] },

    "BL3a": { x: xs[0], y: ys[2], blank: true },
    "1": { x: xs[1], y: ys[2] }, "2": { x: xs[2], y: ys[2] }, "3": { x: xs[3], y: ys[2] }, "4": { x: xs[4], y: ys[2] },
    "BL3b": { x: xs[5], y: ys[2], blank: true }, "BL3c": { x: xs[6], y: ys[2], blank: true }, "30": { x: xs[7], y: ys[2] },

    "BL4a": { x: xs[0], y: ys[3], blank: true },
    "5": { x: xs[1], y: ys[3] }, "6": { x: xs[2], y: ys[3] }, "7": { x: xs[3], y: ys[3] }, "8": { x: xs[4], y: ys[3] },
    "ANALOG": { x: xs[5], y: ys[3], analog: true },

    "9":  { x: xs[0], y: ys[4] }, "10": { x: xs[1], y: ys[4] }, "11": { x: xs[2], y: ys[4] }, "12": { x: xs[3], y: ys[4] },
    "MW": { x: xs[4], y: ys[4], split: true },

    "14": { x: xs[0], y: ys[5] }, "15": { x: xs[1], y: ys[5] }, "16": { x: xs[2], y: ys[5] }, "17": { x: xs[3], y: ys[5] },
    "BL6a": { x: xs[4], y: ys[5], blank: true }, "BL6b": { x: xs[5], y: ys[5], blank: true }, "22": { x: xs[6], y: ys[5] },
  }
};