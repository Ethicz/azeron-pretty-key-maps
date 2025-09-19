const KEY_W = 120, KEY_H = 140, GAP_X = 22, GAP_Y = 16, START_X = 60, START_Y = 60;
const xs = [...Array(8)].map((_,i)=> START_X + i*(KEY_W+GAP_X));
const ys = [...Array(5)].map((_,i)=> START_Y + i*(KEY_H+GAP_Y));

export default {
  id: "compact",
  name: "Compact",
  positions: {
    "13": { x: xs[1], y: ys[0] }, "18": { x: xs[2], y: ys[0] }, "28": { x: xs[4], y: ys[0] },

    "4": { x: xs[0], y: ys[1] }, "8": { x: xs[1], y: ys[1] }, "12": { x: xs[2], y: ys[1] },
    "17": { x: xs[3], y: ys[1] }, "29": { x: xs[4], y: ys[1] }, "22": { x: xs[5], y: ys[1] },

    "3": { x: xs[0], y: ys[2] }, "7": { x: xs[1], y: ys[2] }, "11": { x: xs[2], y: ys[2] }, "16": { x: xs[3], y: ys[2] },
    "30": { x: xs[4], y: ys[2] },

    "2": { x: xs[0], y: ys[3] }, "6": { x: xs[1], y: ys[3] }, "10": { x: xs[2], y: ys[3] },
    "15": { x: xs[3], y: ys[3] }, "19": { x: xs[4], y: ys[3] },
    "ANALOG": { x: xs[5], y: ys[3], analog: true },

    "1": { x: xs[0], y: ys[4] }, "5": { x: xs[1], y: ys[4] }, "9": { x: xs[2], y: ys[4] }, "14": { x: xs[3], y: ys[4] },
    // no MW here
  }
};