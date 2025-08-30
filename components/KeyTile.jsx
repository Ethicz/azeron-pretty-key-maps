/* =========================
   Key component
   ========================= */
function KeyTile({
  id, data, x, y, selected, selection, gloss, showNumbers,
  draggable, zoom, onPick, onDrag, onContext
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!draggable) return;
    const el = ref.current;
    if (!el) return;
    let sx = 0, sy = 0, ox = 0, oy = 0, drag = false;
    const down = (e) => {
      if (e.button !== 0) return;
      drag = true; sx = e.clientX; sy = e.clientY; ox = x; oy = y;
      onPick(id, e);
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      e.preventDefault();
    };
    const move = (e) => {
      if (!drag) return;
      const dx = (e.clientX - sx) / zoom, dy = (e.clientY - sy) / zoom;
      onDrag(selection, Math.round(ox + dx), Math.round(oy + dy));
    };
    const up = () => {
      if (!drag) return;
      drag = false;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    el.addEventListener("mousedown", down);
    return () => el.removeEventListener("mousedown", down);
  }, [draggable, x, y, zoom, onPick, onDrag, selection, id]);

  // NEW: use long-press vs tap
  const bind = useLongPress(
    (e) => onContext?.(e, id), // long-press = context menu
    (e) => onPick(id, e)       // tap/click = select
  );

  const flatBg = normalizeHex(data?.color || BASE.blue);
  const pair = textPair(flatBg);

  const mergedStyle = gloss
    ? { left: x, top: y, "--key": flatBg }
    : {
        left: x, top: y,
        background: flatBg,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,.06), 0 12px 26px rgba(0,0,0,.45)"
      };

  const labelSize = data?.label ? (data.label.length > 30 ? 14 : data.label.length > 22 ? 16 : 18) : 18;
  const subSize   = data?.sub   ? (data.sub.length   > 28 ? 13 : data.sub.length   > 20 ? 14 : 16) : 16;

  return (
    <div
      ref={ref}
      {...bind}
      className={`key ${gloss ? "gloss" : ""} ${selected ? "selected" : ""}`}
      style={mergedStyle}
      title={`Key ${id}`}
    >
      {data?.image && data?.imageMode === "cover" && (
        <img alt="" src={data.image} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", borderRadius:12, zIndex:0 }} />
      )}

      {showNumbers && (
        <div style={{
          position:"absolute", top:6, left:8,
          background:"rgba(0,0,0,.85)", color:"#fff",
          borderRadius:"10px", padding:"2px 7px", fontSize:14, fontWeight:800,
          boxShadow:"0 1px 4px rgba(0,0,0,.45)", zIndex:2
        }}>#{id}</div>
      )}

      {data?.image && data?.imageMode !== "cover" && (
        <img alt="" src={data.image} style={{ position:"absolute", right:8, top:8, width:26, height:26, borderRadius:6, objectFit:"cover", boxShadow:"0 1px 4px rgba(0,0,0,.5)", zIndex:2 }} />
      )}

      {data?.emoji ? <div className="emoji" style={{ zIndex:2, color: pair.label }}>{data.emoji}</div> : null}

      <div className="label" style={{
        zIndex:2,
        color: pair.label,
        fontSize: labelSize,
        lineHeight: 1.1,
        overflowWrap: "anywhere",
        wordBreak: "break-word",
        hyphens: "auto"
      }}>
        {data?.label || "Action"}
      </div>

      <div className="sub" style={{
        zIndex:2,
        color: pair.sub,
        fontSize: subSize,
        overflowWrap: "anywhere",
        wordBreak: "break-word",
        hyphens: "auto"
      }}>
        {data?.sub || ""}
      </div>
    </div>
  );
}
