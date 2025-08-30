function SplitWheel({ x, y, up, down, gloss, onPick }){
  const upBg = normalizeHex(up?.color || BASE.teal);
  const dnBg = normalizeHex(down?.color || BASE.indigo);
  const upTxt = textPair(upBg).label;
  const dnTxt = textPair(dnBg).label;

  return (
    <div className={`splitTile ${gloss ? "gloss" : ""}`} style={{ left:x, top:y }} onMouseDown={(e)=>onPick("MW", e)}>
      <div className="half top"    style={{ background: upBg, color: upTxt }}>{up?.label || "Mouse Up"}</div>
      <div className="half bottom" style={{ background: dnBg, color: dnTxt }}>{down?.label || "Mouse Down"}</div>
    </div>
  );
}
