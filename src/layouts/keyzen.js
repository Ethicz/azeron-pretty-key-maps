const KEY_W = 120, KEY_H = 140, GAP_X = 22, GAP_Y = 16, START_X = 60, START_Y = 60;
const xs = [...Array(9)].map((_,i)=> START_X + i*(KEY_W+GAP_X));
const ys = [...Array(6)].map((_,i)=> START_Y + i*(KEY_H+GAP_Y));

export default {
  id: "keyzen",
  name: "Keyzen",
  positions: {
    "28": { x: xs[7], y: ys[0] },
    "BL2a": { x: xs[0], y: ys[1], blank: true }, "BL2b": { x: xs[1], y: ys[1], blank: true },
    "8": { x: xs[2], y: ys[1] }, "12": { x: xs[3], y: ys[1] }, "17": { x: xs[4], y: ys[1] },
    "BL2c": { x: xs[5], y: ys[1], blank: true }, "29": { x: xs[6], y: ys[1] }, "22": { x: xs[7], y: ys[1] }, "31": { x: xs[8], y: ys[1] },

    "BL3a": { x: xs[0], y: ys[2], blank: true },
    "3": { x: xs[1], y: ys[2] }, "7": { x: xs[2], y: ys[2] }, "11": { x: xs[3], y: ys[2] },
    "16": { x: xs[4], y: ys[2] }, "19": { x: xs[5], y: ys[2] },
    "BL3b": { x: xs[6], y: ys[2], blank: true }, "30": { x: xs[7], y: ys[2] }, "BL3c": { x: xs[8], y: ys[2], blank: true },

    "4": { x: xs[0], y: ys[3] }, "2": { x: xs[1], y: ys[3] }, "6": { x: xs[2], y: ys[3] },
    "10": { x: xs[3], y: ys[3] }, "15": { x: xs[4], y: ys[3] }, "42": { x: xs[5], y: ys[3] },
    "ANALOG": { x: xs[6], y: ys[3], analog: true }, "20": { x: xs[8], y: ys[3] },

    "36": { x: xs[0], y: ys[4] }, "1": { x: xs[1], y: ys[4] }, "5": { x: xs[2], y: ys[4] },
    "9": { x: xs[3], y: ys[4] }, "14": { x: xs[4], y: ys[4] }, "43": { x: xs[5], y: ys[4] }, "41": { x: xs[8], y: ys[4] },

    "BL6a": { x: xs[0], y: ys[5], blank: true }, "37": { x: xs[1], y: ys[5] },
    "38": { x: xs[2], y: ys[5] }, "13": { x: xs[3], y: ys[5] }, "18": { x: xs[4], y: ys[5] },
    "BL6b": { x: xs[5], y: ys[5], blank: true }, "23": { x: xs[6], y: ys[5] },
    "BL6c": { x: xs[7], y: ys[5], blank: true }, "BL6d": { x: xs[8], y: ys[5], blank: true },
  }
};