import React, { useEffect, useRef } from "react";

export default function KeyTile({
  id, x, y, selected, gloss, draggable, showNumbers,
  onPick, onDrag, onCommit, onContextMenu,
  color, label, sub, emoji, imageUrl, zoom=1
}){
  const ref = useRef(null);

  useEffect(()=>{
    if(!draggable) return;
    const el = ref.current; if(!el) return;
    let sx=0, sy=0, ox=0, oy=0, dragging=false;

    const down = e => {
      dragging = true; sx = e.clientX; sy = e.clientY; ox = x; oy = y;
      onPick?.(id, e);
      window.addEventListener("mousemove",move);
      window.addEventListener("mouseup",up);
      e.preventDefault();
    };
    const move = e => {
      if(!dragging) return;
      const dx = (e.clientX - sx)/zoom, dy = (e.clientY - sy)/zoom;
      onDrag?.(id, Math.round(ox + dx), Math.round(oy + dy));
    };
    const up = () => {
      if(!dragging) return;
      dragging = false;
      window.removeEventListener("mousemove",move);
      window.removeEventListener("mouseup",up);
      onCommit?.(id);
    };

    el.addEventListener("mousedown",down);
    return ()=> el.removeEventListener("mousedown",down);
  },[draggable,x,y,zoom,onPick,onDrag,onCommit,id]);

  return (
    <div
      ref={ref}
      className={`key ${gloss?'gloss':''} ${selected?'selected':''}`}
      style={{ left:x, top:y, "--key": color }}
      onMouseDown={(e)=>onPick?.(id, e)}
      onContextMenu={(e)=>{ e.preventDefault(); onContextMenu?.(id, e); }}
      title={`Key ${id}`}
    >
      <div className="numWrap" style={{ display: showNumbers ? "block" : "none" }}>
        <div className="numBadge">#{id}</div>
      </div>
      {imageUrl ? <img alt="" className="keyImg" src={imageUrl} /> : (emoji ? <div className="emoji">{emoji}</div> : null)}
      <div className="label">{label || "Unassigned"}</div>
      <div className="sub">{sub || ""}</div>
    </div>
  );
}
