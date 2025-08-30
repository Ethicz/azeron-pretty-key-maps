import React from "react";

export default function SplitWheel({ x, y, upLabel, downLabel, colorUp, colorDown, gloss, onPick, showNumbers }){
  return (
    <div className={`splitTile ${gloss ? "gloss" : ""}`} style={{ left:x, top:y }} onMouseDown={onPick} title="Mouse Wheel">
      <div className="half top" style={{ background: colorUp || "#00897b" }}>
        {showNumbers ? <span className="numBadge" style={{ marginRight:8 }}>MW↑</span> : null}
        {upLabel || "Mouse Up"}
      </div>
      <div className="half bottom" style={{ background: colorDown || "#283593" }}>
        {showNumbers ? <span className="numBadge" style={{ marginRight:8 }}>MW↓</span> : null}
        {downLabel || "Mouse Down"}
      </div>
    </div>
  );
}
