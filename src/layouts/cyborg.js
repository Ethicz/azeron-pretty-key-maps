const KEY_W = 120, KEY_H = 140, GAP_X = 22, GAP_Y = 16, START_X = 60, START_Y = 60;
// The Cyborg layout uses 8 columns. Define x-coordinates for each column.
const xs = [...Array(8)].map((_,i)=> START_X + i*(KEY_W+GAP_X));
const ys = [...Array(6)].map((_,i)=> START_Y + i*(KEY_H+GAP_Y));

export default {
  id: "cyborg",
  name: "Cyborg",
  positions: {
    // Row 0: only key 28 appears near the right; other slots are intentionally left blank.
    "28": { x: xs[6], y: ys[0] },

    // Row 1: a leading blank, followed by keys 4, 8, 12, 17, 29, 22, 31
    "BL1a": { x: xs[0], y: ys[1], blank: true },
    "4":  { x: xs[1], y: ys[1] },
    "8":  { x: xs[2], y: ys[1] },
    "12": { x: xs[3], y: ys[1] },
    "17": { x: xs[4], y: ys[1] },
    "29": { x: xs[5], y: ys[1] },
    "22": { x: xs[6], y: ys[1] },
    "31": { x: xs[7], y: ys[1] },

    // Row 2: blank, keys 3, 7, 11, 16, blank, key 30, blank
    "BL2a": { x: xs[0], y: ys[2], blank: true },
    "3":  { x: xs[1], y: ys[2] },
    "7":  { x: xs[2], y: ys[2] },
    "11": { x: xs[3], y: ys[2] },
    "16": { x: xs[4], y: ys[2] },
    "BL2b": { x: xs[5], y: ys[2], blank: true },
    "30": { x: xs[6], y: ys[2] },
    "BL2c": { x: xs[7], y: ys[2], blank: true },

    // Row 3: sequential keys leading up to the analog stick
    "36": { x: xs[0], y: ys[3] },
    "2":  { x: xs[1], y: ys[3] },
    "6":  { x: xs[2], y: ys[3] },
    "10": { x: xs[3], y: ys[3] },
    "15": { x: xs[4], y: ys[3] },
    "19": { x: xs[5], y: ys[3] },
    "ANALOG": { x: xs[6], y: ys[3], analog: true },

    // Row 4: blank, then keys 1, 5, 9, 14, another blank; analog continues in columns 6-7
    "BL4a": { x: xs[0], y: ys[4], blank: true },
    "1":  { x: xs[1], y: ys[4] },
    "5":  { x: xs[2], y: ys[4] },
    "9":  { x: xs[3], y: ys[4] },
    "14": { x: xs[4], y: ys[4] },
    "BL4b": { x: xs[5], y: ys[4], blank: true },

    // Row 5: blank, keys 37, 38, 13, 18, blank, and keys 23 and 20 underneath the analog
    "BL5a": { x: xs[0], y: ys[5], blank: true },
    "37": { x: xs[1], y: ys[5] },
    "38": { x: xs[2], y: ys[5] },
    "13": { x: xs[3], y: ys[5] },
    "18": { x: xs[4], y: ys[5] },
    "BL5b": { x: xs[5], y: ys[5], blank: true },
    "23": { x: xs[6], y: ys[5] },
    "20": { x: xs[7], y: ys[5] },
  }
};