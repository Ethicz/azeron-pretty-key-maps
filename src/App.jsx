// src/App.jsx
import React, { useEffect, useState } from 'react';
import TopBar from './components/TopBar.jsx';
import BoardCanvas from './components/BoardCanvas.jsx';
import Inspector from './components/Inspector.jsx';
import MobileInspector from './components/MobileInspector.jsx';
import { useStore } from './lib/store.jsx';

function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false
  );
  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, [breakpoint]);
  return isMobile;
}

export default function App() {
  const isMobile = useIsMobile();
  const selection = useStore(st => st.selection || []);
  const gridOn = useStore(st => st.grid !== false);
  const isMobileInspectorOpen = useStore(st => !!st.isMobileInspectorOpen);

  // Ensure all mobile sheets/drawers start closed and don't collide
  useEffect(() => {
    useStore.setState({ isControlsOpen: false, isSaveOpen: false, isSettingsOpen: false });
  }, []);

  // Close other sheets when switching to mobile/desktop, and fit board
  useEffect(() => {
    useStore.setState({ isControlsOpen: false, isSaveOpen: false, isSettingsOpen: false });
    // fit-to-view when the viewport layout fundamentally changes
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('board:zoom', { detail: { cmd: 'fit' } }));
    }, 0);
  }, [isMobile]);

  // On mobile: open Mobile Inspector when a key is selected
  useEffect(() => {
    if (!isMobile) return;
    if (selection.length >= 1) {
      useStore.setState({ isMobileInspectorOpen: true, mobileInspectorKeyId: selection[0] });
    }
  }, [isMobile, selection]);

  return (
    <div className="appRoot">
      <TopBar isMobile={isMobile} />

      <main className="appMain">
        <div className={`boardWrap ${gridOn ? '' : 'no-grid'}`}>
          <BoardCanvas />
        </div>

        {!isMobile && (
          <aside className="inspector">
            <Inspector />
          </aside>
        )}
      </main>

      {/* Mobile inspector mounts ONLY when open */}
      {isMobileInspectorOpen && <MobileInspector />}

      {/* Footer with disclaimer and quick links */}
      <footer className="appFooter">
        <div className="footLine">
          This is an unofficial community tool made by JimmyCPW and is not affiliated with Azeron. This is to assist with creating colorful keymaps to assist in learning new keybinds. It can not, and is not intended to, program your devices. This is in active development and is an unpaid project. There are bugs They will be patched but updates will not be exactly frequent.
        </div>
        <div className="footActions">
          <a
            className="btn"
            href="https://discordapp.com/invite/9tw9pju"
            target="_blank"
            rel="noopener noreferrer"
          >
            Join the Azeron Discord
          </a>
          <a
            className="btn"
            href="https://www.azeron.eu"
            target="_blank"
            rel="noopener noreferrer"
          >
            Buy an Azeron Device
          </a>
        </div>
      </footer>
    </div>
  );
}
