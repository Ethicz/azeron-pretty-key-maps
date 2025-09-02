import React from "react";
import EmojiPicker from "emoji-picker-react";

export default function EmojiChooser({ onPick, onClose }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        marginTop: 6,
        zIndex: 9999,
        maxWidth: 360,      // <- max-width
        maxHeight: 360,     // <- max-height (scrolls when needed)
        overflow: "auto",
        boxShadow: "0 8px 24px rgba(0,0,0,.35)",
        borderRadius: 12,
        background: "var(--popover-bg, #0f142a)",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <EmojiPicker
        theme="dark"
        autoFocusSearch={false}
        onEmojiClick={(data) => {
          onPick?.(data.emoji);
          onClose?.();
        }}
      />
    </div>
  );
}
