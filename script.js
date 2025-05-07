document.addEventListener('DOMContentLoaded', () => {
  // Force hide all windows initially via JS, as a safeguard.
  // CSS should already do this with .window { display: none; }
  document.querySelectorAll('.window').forEach(w => {
      w.style.display = 'none';
  });

  // --- Global State ---
  const state = {
      windows: {}, // Track open window elements and their state
      taskbarButtons: {}, // Track taskbar buttons
      nextZIndex: 100, // Initial z-index for windows
      activeWindowId: null, // ID of the currently focused window
      isMobile: window.innerWidth <= 768,
      iconGridSize: 80, // Must match CSS --icon-grid-size
      recycleBinItems: [
          { id: 'rb1', name: 'homework.doc', icon: 'icons/All [Without duplicates]/Document.ico' },
          { id: 'rb2', name: 'embarrassing_photo.jpg', icon: 'icons/All [Without duplicates]/Drawing red picture.ico' },
          { id: 'rb3', name: 'Old Projects', icon: 'icons/All [Without duplicates]/Folder.ico' },
          { id: 'rb4', name: 'manual_that_i_read.pdf', icon: 'icons/All [Without duplicates]/Help page.ico' },
      ],
      ieHistory: [],
      ieHistoryIndex: -1,
  };

  // --- DOM Elements ---
  const desktop = document.querySelector('.desktop');
  const taskbar = document.querySelector('.taskbar');
  const startButton = document.getElementById('start-button');
  const startMenu = document.getElementById('start-menu');
  const windowButtonsContainer = document.getElementById('window-buttons-container');
  const clockElement = document.getElementById('clock');
  const contextMenu = document.getElementById('context-menu');
  const icons = document.querySelectorAll('.icon');

  // --- Initialization ---
  initClock();
  initDesktopIcons();
  initWindowControls(); // Must be called so buttons work on any window
  initStartMenu();
  initContextMenu();
  initEmail(); // Doesn't open window, just sets up internal data
  updateRecycleBinIcon();
  updateRecycleBinWindow(); // Populates recycle bin window content, doesn't open it

  // Initialize draggable/resizable for all windows defined in HTML
  // This does NOT open them. It just prepares them.
  document.querySelectorAll('.window').forEach(win => {
      if (!state.isMobile) {
          makeWindowDraggable(win);
          makeWindowResizable(win);
          // Initial resizer state determined by maximizeWindow/openWindow or bringToFront
          const winData = state.windows[win.id]; // Might not exist yet
          toggleResizers(win, !(winData?.isMaximized));
      } else {
          toggleResizers(win, false); // Ensure hidden on mobile
      }
  });

  // --- Helper: Update Maximize Button Icon ---
  function updateMaximizeButtonIcon(windowId, isMaximized) {
      const win = document.getElementById(windowId);
      if (!win || state.isMobile) return; // No change needed on mobile
      const maximizeButton = win.querySelector('.maximize-button');
      if (maximizeButton) {
          // Unicode: Restore Down (U+1F5D7), Maximize (U+25A1 a good simple square)
          maximizeButton.textContent = isMaximized ? '🗗' : '□';
          // You might need to adjust font-size/line-height for these specific symbols in CSS if they look off
      }
  }

  // --- Core Functions ---
  function openWindow(windowId) {
      // console.trace(`openWindow called for: ${windowId}`); // For debugging
      const win = document.getElementById(windowId);
      if (!win) {
          console.error(`Window with ID ${windowId} not found.`);
          return;
      }

      let windowData = state.windows[windowId];

      // If window is already open, visible, and not minimized, just bring it to front.
      if (windowData && windowData.isOpen && !windowData.isMinimized) {
          bringToFront(windowId);
          return;
      }

      // If windowData doesn't exist (first open or was fully closed and state deleted)
      if (!windowData) {
          windowData = {
              element: win,
              isMinimized: false,
              isMaximized: state.isMobile, // On mobile, always treat as maximized visually
              isOpen: false,      // Will be set to true below
              originalRect: null, // Store original position/size for maximize toggle
          };
          state.windows[windowId] = windowData;
          if (!state.isMobile) { // Only create taskbar buttons on desktop
              createTaskbarButton(windowId);
          }

          // Set initial position for non-mobile, non-maximized windows
          if (!state.isMobile && !windowData.isMaximized) {
              const openNonMinimizedWindows = Object.values(state.windows).filter(w => w.isOpen && !w.isMinimized && w.element.style.display !== 'none');
              const offset = (openNonMinimizedWindows.length) * 20; // Stagger new windows

              // Use existing style if set (e.g. from a previous session if we were to save state)
              // or default if not.
              win.style.left = win.style.left && win.style.left !== '0px' ? win.style.left : `${50 + offset}px`;
              win.style.top = win.style.top && win.style.top !== '0px' ? win.style.top : `${50 + offset}px`;
              win.style.width = win.style.width && win.style.width !== '0px' ? win.style.width : '500px';
              win.style.height = win.style.height && win.style.height !== '0px' ? win.style.height : '400px';
          }
      }

      // Mark as open and not minimized
      windowData.isOpen = true;
      windowData.isMinimized = false;
      win.style.display = 'flex'; // Use flex for window layout

      // Handle mobile full screen or desktop maximized state
      if (state.isMobile) {
          win.style.left = '0px';
          win.style.top = '0px';
          win.style.width = '100vw';
          win.style.height = '100vh';
          windowData.isMaximized = true; // Ensure state reflects this
          toggleResizers(win, false);
      } else if (windowData.isMaximized) { // Restore to maximized if it was
          win.classList.add('maximized');
          win.style.left = '0px';
          win.style.top = '0px';
          win.style.width = '100vw';
          win.style.height = `calc(100vh - ${taskbar.offsetHeight}px)`;
          toggleResizers(win, false);
      } else { // Standard desktop window
          win.classList.remove('maximized');
           // If originalRect exists and it's not currently maximized, restore to that.
          if (windowData.originalRect) {
            win.style.left = windowData.originalRect.left;
            win.style.top = windowData.originalRect.top;
            win.style.width = windowData.originalRect.width;
            win.style.height = windowData.originalRect.height;
          }
          // Else, its initial position/size (set above if new, or current if just unminimized) is used.
          toggleResizers(win, true);
      }
      
      if (!state.isMobile) {
        updateMaximizeButtonIcon(windowId, windowData.isMaximized);
      }
      bringToFront(windowId); // This will also update taskbar buttons

      // Special actions for specific windows
      if (windowId === 'email-window') {
          switchFolder('inbox', document.getElementById('folder-inbox'));
      }
      if (windowId === 'recycle-window') {
          updateRecycleBinWindow();
      }
      if (windowId === 'gallery-window') {
          loadGallery();
      }
      if (windowId === 'ie-widget') {
          const iframe = document.getElementById('ie-iframe');
          const urlInput = document.getElementById('ie-url');
          // If IE is opened for the first time in this session (no history or iframe is blank)
          if (iframe && urlInput && (iframe.getAttribute('src') === 'about:blank' || iframe.getAttribute('src') === null || iframe.getAttribute('src') === '') && state.ieHistory.length === 0) {
              ieGo('https://pointerpointer.com/'); // Load the funny website
          } else if (state.ieHistory.length > 0 && state.ieHistory[state.ieHistoryIndex]) {
              // If history exists, ensure URL bar and iframe match current history point
              urlInput.value = state.ieHistory[state.ieHistoryIndex];
              if (iframe.getAttribute('src') !== state.ieHistory[state.ieHistoryIndex]) {
                   iframe.src = state.ieHistory[state.ieHistoryIndex];
              }
          }
          updateIEButtons();
          updateIEHistorySelect();
      }

      closeStartMenu(); // Close start menu when opening a window
  }

  function closeWindow(windowId) {
      const winData = state.windows[windowId];
      if (winData?.element) {
          winData.element.style.display = 'none';
          winData.isOpen = false;
          // winData.isMinimized = false; // Implicitly not minimized if closed
          // winData.isMaximized = false; // Resetting this means it opens non-maximized next time

          if (!state.isMobile) {
            removeTaskbarButton(windowId);
          }
          // For a "full close" that forgets position/size/maximized state for next open:
          delete state.windows[windowId];

          if (state.activeWindowId === windowId) {
              state.activeWindowId = null;
              // Optionally, activate the next highest z-index window
          }
      }
      updateRecycleBinIcon();
  }

  function minimizeWindow(windowId) {
      const winData = state.windows[windowId];
      if (winData?.element && winData.isOpen && !winData.isMinimized) {
          // Store current geometry if not maximized, so restore returns to it.
          if (!winData.isMaximized && !state.isMobile) {
            // Don't overwrite originalRect if it was set by a maximize operation
            // This originalRect is for restoring from MINIMIZE to a non-maximized state
            if (!winData.originalRect) { // Only store if not already storing for maximize
                winData.beforeMinimizeRect = {
                    left: winData.element.style.left,
                    top: winData.element.style.top,
                    width: winData.element.style.width,
                    height: winData.element.style.height,
                };
            }
          }

          winData.element.style.display = 'none';
          winData.isMinimized = true;
          // isOpen remains true
          if (state.activeWindowId === windowId) {
              state.activeWindowId = null;
              winData.element.classList.remove('active');
          }
          if (!state.isMobile) updateTaskbarButton(windowId);
      }
  }

  function restoreWindow(windowId) { // Called from taskbar button or potentially other restore actions
    let winData = state.windows[windowId];

    if (!winData || !winData.element) { // Window was fully closed (state deleted)
        openWindow(windowId); // Re-open it fresh
        return;
    }

    // This function is primarily for restoring a MINIMIZED window
    if (winData.isMinimized) {
        winData.element.style.display = 'flex';
        winData.isMinimized = false;
        // isOpen should already be true

        if (state.isMobile) {
            // Mobile always restores to "maximized"
            winData.isMaximized = true;
            winData.element.style.left = '0px';
            winData.element.style.top = '0px';
            winData.element.style.width = '100vw';
            winData.element.style.height = '100vh';
            toggleResizers(winData.element, false);
        } else if (winData.isMaximized) { // Was maximized before minimizing (desktop)
            winData.element.classList.add('maximized');
            winData.element.style.left = '0px';
            winData.element.style.top = '0px';
            winData.element.style.width = '100vw';
            winData.element.style.height = `calc(100vh - ${taskbar.offsetHeight}px)`;
            toggleResizers(winData.element, false);
        } else { // Standard desktop non-maximized restore
            winData.element.classList.remove('maximized');
            // Restore to position/size before minimization if it was stored
            if (winData.beforeMinimizeRect) {
                winData.element.style.left = winData.beforeMinimizeRect.left;
                winData.element.style.top = winData.beforeMinimizeRect.top;
                winData.element.style.width = winData.beforeMinimizeRect.width;
                winData.element.style.height = winData.beforeMinimizeRect.height;
                // delete winData.beforeMinimizeRect; // Clear after use
            } else if (winData.originalRect) { // Or to originalRect if that's all we have
                winData.element.style.left = winData.originalRect.left;
                winData.element.style.top = winData.originalRect.top;
                winData.element.style.width = winData.originalRect.width;
                winData.element.style.height = winData.originalRect.height;
            }
            // Else, it keeps its current non-maximized dimensions/position (which openWindow would have set)
            toggleResizers(winData.element, true);
        }
        if (!state.isMobile) updateMaximizeButtonIcon(windowId, winData.isMaximized);
        bringToFront(windowId); // This handles active state, z-index, and taskbar button update

    } else if (winData.isOpen) { // Window is open but not minimized (e.g., behind another window)
        bringToFront(windowId); // Just bring to front
    }
}


   function maximizeWindow(windowId) {
      if (state.isMobile) return; // No maximize on mobile (it's always "maximized")

      const winData = state.windows[windowId];
      if (!winData || !winData.element || !winData.isOpen || winData.isMinimized) return;

      const win = winData.element;

      if (!winData.isMaximized) {
          // Store original position and size *only if not already maximized*
          // and only if originalRect isn't already storing something (e.g. from a previous maximize)
          if (!winData.originalRect) {
            winData.originalRect = {
                left: win.style.left,
                top: win.style.top,
                width: win.style.width,
                height: win.style.height,
            };
          }
          win.classList.add('maximized');
          win.style.left = '0px';
          win.style.top = '0px';
          win.style.width = '100vw';
          win.style.height = `calc(100vh - ${taskbar.offsetHeight}px)`;
          winData.isMaximized = true;
      } else {
          // Restore from maximized state
          win.classList.remove('maximized');
           if (winData.originalRect) {
              win.style.left = winData.originalRect.left;
              win.style.top = winData.originalRect.top;
              win.style.width = winData.originalRect.width;
              win.style.height = winData.originalRect.height;
              winData.originalRect = null; // Clear originalRect after restoring
          } else {
               // Fallback if originalRect wasn't stored (should not happen often with refined logic)
               const openWindowCount = Object.values(state.windows).filter(w => w.isOpen && !w.isMinimized).length;
               const offset = (openWindowCount || 1) * 20; // Use count of open non-minimized windows
               win.style.width = '500px';
               win.style.height = '400px';
               win.style.left = `${50 + offset}px`;
               win.style.top = `${50 + offset}px`;
          }
          winData.isMaximized = false;
      }
      updateMaximizeButtonIcon(windowId, winData.isMaximized);
      toggleResizers(win, !winData.isMaximized);
      bringToFront(windowId); // Ensure it's active and z-indexed correctly after state change
  }

   function toggleResizers(windowEl, enable) {
      // enable is a suggestion; final decision also depends on mobile and maximized state
      const winData = state.windows[windowEl.id];
      const actualEnable = enable && !state.isMobile && winData && !winData.isMaximized;
      const resizers = windowEl.querySelectorAll('.resizer');
      resizers.forEach(r => r.style.display = actualEnable ? 'block' : 'none');
   }


  function bringToFront(windowId) {
    const winData = state.windows[windowId];
    if (!winData || !winData.element) {
        console.warn(`bringToFront called for windowId ${windowId}, but no winData or element found.`);
        return;
    }
    // Do not bring to front if it's minimized. restoreWindow handles making it visible first.
    if (winData.isMinimized) {
        if (!state.isMobile) updateTaskbarButton(windowId); // Ensure taskbar button reflects it's not active
        return;
    }
    // If it's not marked as isOpen (e.g., after a full close), openWindow should be used.
    if (!winData.isOpen) {
        openWindow(windowId); // This will call bringToFront internally after setting up state.
        return;
    }

    const previouslyActiveWindowId = state.activeWindowId;

    // Deactivate previously active window styling (element and taskbar button)
    if (previouslyActiveWindowId && previouslyActiveWindowId !== windowId) {
        const oldActiveWinData = state.windows[previouslyActiveWindowId];
        if (oldActiveWinData?.element) {
            oldActiveWinData.element.classList.remove('active');
            if(!state.isMobile) updateTaskbarButton(previouslyActiveWindowId);
        }
    }

    // Activate the new window
    state.nextZIndex += 1;
    winData.element.style.zIndex = state.nextZIndex;
    winData.element.classList.add('active');
    state.activeWindowId = windowId;
    if(!state.isMobile) updateTaskbarButton(windowId); // Update its taskbar button style

    // Ensure resizers are correctly shown/hidden
    toggleResizers(winData.element, true); // toggleResizers itself checks !isMobile and !isMaximized
}


  // --- Taskbar Management ---
  function createTaskbarButton(windowId) {
      if (state.taskbarButtons[windowId] || state.isMobile) return;
      const win = document.getElementById(windowId);
      if (!win) return; // Should not happen if called from openWindow correctly
      const title = win.querySelector('.title-bar span')?.textContent || 'Window';
      const iconSrc = win.querySelector('.title-bar-icon')?.src || 'icons/default.ico';

      const btn = document.createElement('button');
      btn.className = 'window-button button-border-raised';
      btn.dataset.windowId = windowId;
      const img = document.createElement('img');
      img.src = iconSrc; img.alt = ''; btn.appendChild(img);
      const span = document.createElement('span');
      span.textContent = title; btn.appendChild(span);

      btn.onclick = () => {
          const currentWinData = state.windows[windowId]; // Get current state
          if (!currentWinData) { // Window was closed, state deleted
              openWindow(windowId); // Reopen it
              return;
          }
          if (currentWinData.isMinimized) { restoreWindow(windowId); }
          else if (state.activeWindowId === windowId) { // Is open and active
              minimizeWindow(windowId);
          } else { // Is open but not active
              bringToFront(windowId);
          }
      };
      windowButtonsContainer.appendChild(btn);
      state.taskbarButtons[windowId] = btn;
      updateTaskbarButton(windowId); // Set initial style based on current window state
  }

  function removeTaskbarButton(windowId) {
       if (state.isMobile) return;
      const btn = state.taskbarButtons[windowId];
      if (btn) { btn.remove(); delete state.taskbarButtons[windowId]; }
  }

  function updateTaskbarButton(windowId) {
      if (state.isMobile) return;
      const btn = state.taskbarButtons[windowId];
      const winData = state.windows[windowId];
      if (!btn) return;
      btn.classList.remove('active', 'minimized', 'button-border-lowered');
      btn.classList.add('button-border-raised'); // Default state
      if (winData && winData.isOpen) {
           if (winData.isMinimized) { btn.classList.add('minimized'); }
           else if (state.activeWindowId === windowId) {
               btn.classList.add('active');
               btn.classList.remove('button-border-raised');
               btn.classList.add('button-border-lowered'); // "Pressed" style
           }
      }
  }

  // --- Desktop Icons ---
  function initDesktopIcons() {
       if (state.isMobile) {
           const iconContainer = document.createElement('div');
           iconContainer.className = 'icon-container';
           // Query for icons directly under desktop before moving
           document.querySelectorAll('.desktop > .icon').forEach(icon => iconContainer.appendChild(icon.parentNode.removeChild(icon)));
           desktop.appendChild(iconContainer);
       }
      // Re-query icons in case they were moved (for mobile) or just to be safe
      const currentIcons = document.querySelectorAll('.icon');
      currentIcons.forEach(icon => {
          icon.addEventListener('dblclick', () => {
              if (state.isMobile) return; // dblclick for desktop only
              const windowId = icon.dataset.windowId;
              if (windowId) openWindow(windowId);
          });
           icon.addEventListener('touchend', (e) => {
              // Basic check to prevent firing after scrolling/dragging
              if (icon.dataset.dragging !== 'true') {
                  const windowId = icon.dataset.windowId;
                  if (windowId && state.isMobile) { // Single tap opens on mobile
                      e.preventDefault(); // Prevent potential double actions
                      openWindow(windowId);
                  }
               }
               icon.dataset.dragging = 'false'; // Reset flag
           });
           icon.addEventListener('click', (e) => { // Single click for desktop selection
               if (!state.isMobile) {
                   selectIcon(icon);
                   e.stopPropagation(); // Prevent desktop click from deselecting immediately
               }
           });
           icon.addEventListener('touchstart', (e) => {
               // if (!state.isMobile) { /* Potentially start drag logic here for touch desktop */ }
               icon.dataset.dragging = 'false'; // Initialize for touchend check
           }, { passive: true }); // Use passive listener if not preventing default

          if (!state.isMobile) {
              makeIconDraggable(icon);
          } else {
               // Prevent default drag behavior on mobile which can interfere with scrolling
               icon.addEventListener('dragstart', (e) => e.preventDefault());
          }
      });

       desktop.addEventListener('click', (e) => {
            if (e.target === desktop || e.target.classList.contains('icon-container')) {
               deselectAllIcons();
               closeStartMenu();
               hideContextMenu();
            }
       });
  }

  function selectIcon(selectedIcon) {
      deselectAllIcons();
      selectedIcon.classList.add('selected');
  }

  function deselectAllIcons() {
      document.querySelectorAll('.icon.selected').forEach(icon => icon.classList.remove('selected'));
  }

  function makeIconDraggable(icon) {
      let offsetX, offsetY, startX, startY;
      let isDragging = false;
      let hasMoved = false;

      const onMouseDown = (e) => {
          if (e.button !== 0 && e.type === 'mousedown') return; // Only left click for mouse
          isDragging = true; hasMoved = false; selectIcon(icon);
          const touchOrMouse = e.touches ? e.touches[0] : e;
          const rect = icon.getBoundingClientRect();
          offsetX = touchOrMouse.clientX - rect.left;
          offsetY = touchOrMouse.clientY - rect.top;
          startX = touchOrMouse.clientX; startY = touchOrMouse.clientY;
          icon.style.zIndex = state.nextZIndex++; icon.style.cursor = 'grabbing'; desktop.style.cursor = 'grabbing';
          icon.dataset.dragging = 'false'; // Reset for touchend logic
          if (e.type === 'mousedown') e.preventDefault();
      };

      const onMouseMove = (e) => {
          if (!isDragging) return;
          const touchOrMouse = e.touches ? e.touches[0] : e;
          const currentX = touchOrMouse.clientX; const currentY = touchOrMouse.clientY;
          if (!hasMoved && (Math.abs(currentX - startX) > 5 || Math.abs(currentY - startY) > 5)) {
              hasMoved = true; icon.dataset.dragging = 'true';
          }
          if (hasMoved) {
               if (e.type === 'touchmove' && !state.isMobile) e.preventDefault(); // Prevent scroll if touch-dragging icon on desktop
               const desktopRect = desktop.getBoundingClientRect();
               let newLeft = currentX - offsetX - desktopRect.left;
               let newTop = currentY - offsetY - desktopRect.top;
               icon.style.left = `${newLeft}px`; icon.style.top = `${newTop}px`;
          }
      };

      const onMouseUp = (e) => {
          if (!isDragging) return;
          isDragging = false; icon.style.zIndex = 10; icon.style.cursor = 'pointer'; desktop.style.cursor = 'default';
          if (hasMoved) {
              let left = parseFloat(icon.style.left); let top = parseFloat(icon.style.top);
              const desktopRect = desktop.getBoundingClientRect(); const taskbarHeight = taskbar.offsetHeight;
              const maxLeft = desktopRect.width - icon.offsetWidth;
              const maxTop = desktopRect.height - icon.offsetHeight - taskbarHeight;
              left = Math.max(0, Math.min(left, maxLeft));
              top = Math.max(0, Math.min(top, maxTop));
              const snappedLeft = Math.round(left / state.iconGridSize) * state.iconGridSize;
              const snappedTop = Math.round(top / state.iconGridSize) * state.iconGridSize;
              icon.style.left = `${snappedLeft}px`; icon.style.top = `${snappedTop}px`;
          }
          // touchend on the icon itself will set icon.dataset.dragging = 'false'
      };

      icon.addEventListener('mousedown', onMouseDown);
      // For desktop touch-dragging of icons (if desired and !state.isMobile checks are in place)
      // icon.addEventListener('touchstart', onMouseDown, { passive: false });
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      // document.addEventListener('touchmove', onMouseMove, { passive: false });
      // document.addEventListener('touchend', onMouseUp);
  }

  // --- Window Dragging and Resizing (Desktop Only) ---
  function makeWindowDraggable(windowEl) {
      if (state.isMobile) return;
      const titleBar = windowEl.querySelector('.title-bar'); if (!titleBar) return;
      let offsetX, offsetY, isDragging = false;

      const startDrag = (e) => {
          if (e.target.closest('.window-controls button')) return;
          const currentWindowData = state.windows[windowEl.id];
          if (currentWindowData?.isMaximized) return;
          isDragging = true; bringToFront(windowEl.id);
          const eventPos = e.touches ? e.touches[0] : e; const rect = windowEl.getBoundingClientRect();
          offsetX = eventPos.clientX - rect.left; offsetY = eventPos.clientY - rect.top;
          titleBar.style.cursor = 'grabbing'; desktop.style.cursor = 'grabbing';
          if (e.type === 'mousedown') e.preventDefault();
      };
      const doDrag = (e) => {
          if (!isDragging) return;
          if (e.type === 'touchmove') e.preventDefault();
          const eventPos = e.touches ? e.touches[0] : e; const desktopRect = desktop.getBoundingClientRect();
          let newLeft = eventPos.clientX - offsetX; let newTop = eventPos.clientY - offsetY;
          const taskbarHeight = taskbar.offsetHeight;
          newLeft = Math.max(-windowEl.offsetWidth + 50, Math.min(newLeft, desktopRect.width - 50));
          newTop = Math.max(0, Math.min(newTop, desktopRect.height - taskbarHeight - titleBar.offsetHeight));
          windowEl.style.left = `${newLeft}px`; windowEl.style.top = `${newTop}px`;
      };
      const stopDrag = () => {
          if (isDragging) { isDragging = false; titleBar.style.cursor = 'grab'; desktop.style.cursor = 'default'; }
      };
      titleBar.addEventListener('mousedown', startDrag); document.addEventListener('mousemove', doDrag); document.addEventListener('mouseup', stopDrag);
      titleBar.addEventListener('touchstart', startDrag, { passive: false }); document.addEventListener('touchmove', doDrag, { passive: false }); document.addEventListener('touchend', stopDrag);
  }

  function makeWindowResizable(windowEl) {
      if (state.isMobile) return;
      const resizers = windowEl.querySelectorAll('.resizer');
      let isResizing = false, currentResizer = null, startX, startY, startWidth, startHeight, startLeft, startTop;

      const startResize = (e) => {
          const currentWindowData = state.windows[windowEl.id]; if (currentWindowData?.isMaximized) return;
          isResizing = true; currentResizer = e.target; bringToFront(windowEl.id);
          const eventPos = e.touches ? e.touches[0] : e; const rect = windowEl.getBoundingClientRect();
          startX = eventPos.clientX; startY = eventPos.clientY; startWidth = rect.width; startHeight = rect.height;
          startLeft = parseFloat(getComputedStyle(windowEl).left); startTop = parseFloat(getComputedStyle(windowEl).top);
          windowEl.style.userSelect = 'none'; document.body.style.cursor = getComputedStyle(currentResizer).cursor;
          e.preventDefault(); e.stopPropagation();
      };
      const doResize = (e) => {
          if (!isResizing) return; e.preventDefault();
          const eventPos = e.touches ? e.touches[0] : e; const dx = eventPos.clientX - startX; const dy = eventPos.clientY - startY;
          let newWidth = startWidth, newHeight = startHeight, newLeft = startLeft, newTop = startTop;
          const minWidth = parseInt(getComputedStyle(windowEl).minWidth) || 150;
          const minHeight = parseInt(getComputedStyle(windowEl).minHeight) || 100;

          if (currentResizer.classList.contains('resizer-e') || currentResizer.classList.contains('resizer-ne') || currentResizer.classList.contains('resizer-se')) { newWidth = Math.max(minWidth, startWidth + dx); }
          if (currentResizer.classList.contains('resizer-w') || currentResizer.classList.contains('resizer-nw') || currentResizer.classList.contains('resizer-sw')) {
              const provisionalWidth = startWidth - dx;
              if (provisionalWidth >= minWidth) { newWidth = provisionalWidth; newLeft = startLeft + dx; }
              else { newWidth = minWidth; newLeft = startLeft + (startWidth - minWidth); }
          }
          if (currentResizer.classList.contains('resizer-s') || currentResizer.classList.contains('resizer-se') || currentResizer.classList.contains('resizer-sw')) { newHeight = Math.max(minHeight, startHeight + dy); }
          if (currentResizer.classList.contains('resizer-n') || currentResizer.classList.contains('resizer-ne') || currentResizer.classList.contains('resizer-nw')) {
              const provisionalHeight = startHeight - dy;
              if (provisionalHeight >= minHeight) { newHeight = provisionalHeight; newTop = startTop + dy; }
              else { newHeight = minHeight; newTop = startTop + (startHeight - minHeight); }
          }
          windowEl.style.width = `${newWidth}px`; windowEl.style.height = `${newHeight}px`;
          windowEl.style.left = `${newLeft}px`; windowEl.style.top = `${newTop}px`;
      };
      const stopResize = () => {
          if (isResizing) { isResizing = false; windowEl.style.userSelect = ''; document.body.style.cursor = 'default'; }
      };
      resizers.forEach(resizer => { resizer.addEventListener('mousedown', startResize); resizer.addEventListener('touchstart', startResize, { passive: false }); });
      document.addEventListener('mousemove', doResize); document.addEventListener('mouseup', stopResize);
      document.addEventListener('touchmove', doResize, { passive: false }); document.addEventListener('touchend', stopResize);
  }

  // --- Window Control Buttons ---
  function initWindowControls() {
      desktop.addEventListener('click', (e) => {
           const button = e.target.closest('.window-controls button');
           if (!button) return;
           const windowEl = button.closest('.window');
           if (!windowEl) return;
           const windowId = windowEl.id;

           let winData = state.windows[windowId];
           // If window is visible but not in state, or state says it's not open, try to "adopt" or sync.
           if ((!winData || !winData.isOpen) && getComputedStyle(windowEl).display !== 'none') {
               console.warn(`Control button for '${windowId}' clicked, but state inconsistent. Attempting to sync.`);
               if (!winData) { // Not in state at all
                   state.windows[windowId] = {
                       element: windowEl,
                       isMinimized: false,
                       isMaximized: windowEl.classList.contains('maximized'),
                       isOpen: true,
                       originalRect: null, // Cannot know original rect here
                   };
                   winData = state.windows[windowId]; // update local ref
                   if (!state.isMobile && !state.taskbarButtons[windowId]) createTaskbarButton(windowId);
               } else { // In state, but isOpen is false
                   winData.isOpen = true;
                   winData.isMinimized = false; // Assume not minimized if clickable
               }
               bringToFront(windowId); // Establish proper z-index and active status
               if (!state.isMobile) updateMaximizeButtonIcon(windowId, winData.isMaximized);
           }
           // Now winData should be valid if the window was adoptable
           if (!winData || !winData.isOpen) {
               console.error(`Cannot control '${windowId}', state still invalid after attempting sync.`);
               return;
           }

          if (button.classList.contains('close-button')) { closeWindow(windowId); }
          else if (button.classList.contains('minimize-button')) { minimizeWindow(windowId); }
          else if (button.classList.contains('maximize-button')) { maximizeWindow(windowId); }
      });

       desktop.addEventListener('mousedown', (e) => {
          const windowEl = e.target.closest('.window');
          if (windowEl && !e.target.closest('.window-controls button') && !e.target.closest('.resizer')) {
            const winData = state.windows[windowEl.id];
            if (winData?.isOpen && state.activeWindowId !== windowEl.id) {
                bringToFront(windowEl.id);
            }
          }
       }, true);
  }

  // --- Start Menu ---
  function initStartMenu() {
    startButton.addEventListener('click', (e) => {
        toggleStartMenu();
        e.stopPropagation(); // Prevent desktop click listener from closing immediately
    });

    // Close menu if clicking outside
    document.addEventListener('click', (e) => {
        // Check if startMenu is active AND the click was outside BOTH the menu and the start button
        if (startMenu.classList.contains('active') && !startMenu.contains(e.target) && e.target !== startButton && !startButton.contains(e.target) /* check if click was on image inside button */) {
            closeStartMenu();
        }
    });
    // Prevent clicks inside the menu from closing it via the document listener
     startMenu.addEventListener('click', (e) => {
         e.stopPropagation();
         // If a direct link (not submenu trigger) is clicked, close the menu
         const linkItem = e.target.closest('a');
         if (linkItem && !linkItem.closest('li.has-submenu')) {
            // If the link has an onclick that opens a window, close the start menu
            if (linkItem.getAttribute('onclick')?.includes('openWindow')) {
                closeStartMenu();
            }
            // For actual hrefs that navigate away, the menu will close naturally.
            // If it's an href="#" and an onclick that does something else, it will also close.
         }
     });
}

function toggleStartMenu() {
    const isActive = startMenu.classList.toggle('active');
    startButton.classList.toggle('active', isActive); // Toggle button pressed state
    startButton.classList.toggle('button-border-lowered', isActive);
    startButton.classList.toggle('button-border-raised', !isActive);
    if (isActive) {
      deselectAllIcons(); // Deselect desktop icons when opening start menu
      hideContextMenu();  // Hide context menu if it's open
    }
}

function closeStartMenu() {
    startMenu.classList.remove('active');
    startButton.classList.remove('active');
    startButton.classList.remove('button-border-lowered');
    startButton.classList.add('button-border-raised');
}

  // --- Clock ---
  function initClock() {
      const updateClock = () => { const now = new Date(), hours = now.getHours().toString().padStart(2,'0'), minutes = now.getMinutes().toString().padStart(2,'0'); clockElement.textContent = `${hours}:${minutes}`; };
      updateClock(); setInterval(updateClock, 1000);
  }

  // --- Context Menu (Right Click) ---
  function initContextMenu() {
      desktop.addEventListener('contextmenu', (e) => {
          if (state.isMobile) return; e.preventDefault(); hideContextMenu(); closeStartMenu();
          const target = e.target; let menuItems = []; const iconTarget = target.closest('.icon'), windowTitleBarTarget = target.closest('.title-bar');
          if (iconTarget) {
              selectIcon(iconTarget); const windowId = iconTarget.dataset.windowId;
              menuItems.push({ label: 'Open', action: () => { if (windowId) openWindow(windowId); } }); menuItems.push({ type: 'separator' });
              if (iconTarget.id === 'recycle-icon') { menuItems.push({ label: 'Empty Recycle Bin', action: emptyRecycleBin, disabled: state.recycleBinItems.length === 0 }); }
              else { menuItems.push({ label: 'Cut', disabled: true, action:()=>{} }); menuItems.push({ label: 'Copy', disabled: true, action:()=>{} }); }
              menuItems.push({ type: 'separator' });
              menuItems.push({ label: 'Delete', action: () => deleteIcon(iconTarget), disabled: iconTarget.id === 'recycle-icon' || iconTarget.id === 'mycomputer-icon' });
              menuItems.push({ label: 'Properties', action: () => alert(`Properties for ${iconTarget.querySelector('div').textContent}`), disabled: true });
          } else if (windowTitleBarTarget) {
               const windowEl = windowTitleBarTarget.closest('.window'); if (windowEl && state.windows[windowEl.id]) {
                   const winData = state.windows[windowEl.id];
                   menuItems.push({ label: 'Restore', action: () => maximizeWindow(windowEl.id), disabled: !winData.isMaximized });
                   menuItems.push({ label: 'Move', disabled: winData.isMaximized, action:()=>{} }); menuItems.push({ label: 'Size', disabled: winData.isMaximized, action:()=>{} });
                   menuItems.push({ label: 'Minimize', action: () => minimizeWindow(windowEl.id), disabled: winData.isMinimized }); // Should not be disabled if !minimized
                   menuItems.push({ label: 'Maximize', action: () => maximizeWindow(windowEl.id), disabled: winData.isMaximized });
                   menuItems.push({ type: 'separator' }); menuItems.push({ label: 'Close', action: () => closeWindow(windowEl.id) });
               }
          } else { // Desktop background
               menuItems.push({ label: 'Arrange Icons', disabled: true, action:()=>{} }); menuItems.push({ label: 'Line up Icons', disabled: true, action:()=>{} }); menuItems.push({ type: 'separator' });
               menuItems.push({ label: 'Paste', disabled: true, action:()=>{} }); menuItems.push({ label: 'Paste Shortcut', disabled: true, action:()=>{} }); menuItems.push({ type: 'separator' });
               menuItems.push({ label: 'New', disabled: true, action:()=>{} }); menuItems.push({ type: 'separator' });
               menuItems.push({ label: 'Properties', action: () => alert('Display Properties not available.'), disabled: true });
          }
          if (menuItems.length > 0) showContextMenu(e.clientX, e.clientY, menuItems);
      });
      document.addEventListener('click', hideContextMenu); contextMenu.addEventListener('click', (e) => e.stopPropagation());
  }

  function showContextMenu(x, y, items) {
      contextMenu.innerHTML = ''; contextMenu.style.display = 'block';
      items.forEach(item => {
          const div = document.createElement('div');
          if (item.type === 'separator') { div.className = 'context-menu-separator'; }
          else {
              div.className = 'context-menu-item'; div.textContent = item.label;
              if (item.disabled) { div.classList.add('disabled'); }
              else { div.onclick = () => { if(item.action) item.action(); hideContextMenu(); }; }
          } contextMenu.appendChild(div);
      });
      const menuWidth = contextMenu.offsetWidth, menuHeight = contextMenu.offsetHeight, viewportWidth = window.innerWidth, viewportHeight = window.innerHeight;
      if (x + menuWidth > viewportWidth) x = viewportWidth - menuWidth - 5; if (y + menuHeight > viewportHeight) y = viewportHeight - menuHeight - 5;
      if (x < 0) x = 5; if (y < 0) y = 5;
      contextMenu.style.left = `${x}px`; contextMenu.style.top = `${y}px`;
  }
  function hideContextMenu() { contextMenu.style.display = 'none'; }

   // --- Specific App Logic ---
   const emailData = { inbox: [{ id: 1, subject: "Zaproszenie na ślub", from: "Oliwia & Maks", content: "Oliwia i Maks,\nserdecznie zapraszają na uroczystość zawarcia związku małżeńskiego oraz przyjęcie weselne, które odbędą się 3 sierpnia 2025 o godzinie 17:00 w Dworku Separowo.\n\nSeparowo 8, 62-066 Separowo.\n\nProsimy o potwierdzenie swojej obecności do 01.05.2025.\n\nPozdrawiamy!", read: false },{ id: 4, subject: "Welcome to Outlook Express!", from: "Microsoft", content: "Welcome! We hope you enjoy this totally real email client experience.", read: true },], outbox: [], sent: [{ id: 2, subject: "RE: Your Pool Party", to: "Elon Musk, Donald Trump", content: "Dear Mr. Musk and Mr. Trump,\n\nSounds like a blast! We'll bring the giant inflatable swan.\n\nBest,\nErnest G.", read: true }]};
   let currentEmailFolder = 'inbox', selectedEmailId = null;
   function initEmail() { /* Called by openWindow if needed */ }
   function switchFolder(folderName, clickedElement) {
       currentEmailFolder = folderName; const list = document.getElementById('email-list'), content = document.getElementById('email-content'); if (!list || !content) return;
       list.innerHTML = ''; content.innerHTML = '<p style="padding: 20px; text-align: center;">Select an email to view.</p>'; selectedEmailId = null;
       document.querySelectorAll('#email-window .email-nav .folder').forEach(f => f.classList.remove('active'));
       if (clickedElement) { clickedElement.classList.add('active'); } else { const folderEl = document.getElementById(`folder-${folderName}`); if (folderEl) folderEl.classList.add('active'); }
       const emails = emailData[folderName] || [];
       if (emails.length === 0) { list.innerHTML = '<p style="padding: 10px; color: grey; font-style: italic;">This folder is empty.</p>'; }
       else { emails.forEach(email => {
           const item = document.createElement('div'); item.className = 'email-item'; item.dataset.emailId = email.id;
           item.style.fontWeight = email.read ? 'normal' : 'bold'; item.textContent = `${email.subject} (From: ${email.from || email.to || 'Unknown'})`;
           item.onclick = () => { displayEmailContent(email); if (!email.read) { email.read = true; item.style.fontWeight = 'normal'; }
               document.querySelectorAll('#email-list .email-item').forEach(i => i.classList.remove('selected')); item.classList.add('selected'); };
           list.appendChild(item); });
       }
   }
   function displayEmailContent(email) {
       selectedEmailId = email.id; const content = document.getElementById('email-content'); if (!content) return;
       content.innerHTML = `<div style="padding:5px; border-bottom: 1px solid #ccc;"><p><strong>Subject:</strong> ${email.subject}</p><p><strong>From:</strong> ${email.from||'N/A'}</p><p><strong>To:</strong> ${email.to||'N/A'}</p></div><div style="padding:10px; white-space: pre-wrap;">${email.content}</div>`;
       if (email.id === 1) {
          const btnDiv = document.createElement('div'); btnDiv.style.marginTop = '20px'; btnDiv.style.textAlign = 'center';
          btnDiv.innerHTML = `<button class="button-border-raised" onclick="sendEmail(true)">Confirm Attendance</button><button class="button-border-raised" style="margin-left: 10px;" onclick="sendEmail(false)">Decline Attendance</button>`;
          content.appendChild(btnDiv);
       }
   }
  window.sendEmail = (confirm) => {
      const recipient = "maxgrom97@gmail.com", subject = encodeURIComponent("[Slub separowo] Potwierdzenie obecnosci");
      const body = confirm ? encodeURIComponent("Potwierdzam moją obecność na ślubie i weselu 3 sierpnia 2025.\n\nDziękuję i pozdrawiam,\n\n[Twoje Imię i Nazwisko]") : encodeURIComponent("Z przykrością informuję, że nie będę mógł/mogła uczestniczyć w uroczystości 3 sierpnia 2025.\n\nDziękuję za zaproszenie i życzę wspaniałego dnia!\n\nPozdrawiam,\n\n[Twoje Imię i Nazwisko]");
      window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`; alert('Attempting to open your default email client...');
  };
  window.sendEmailMessage = () => { alert("Simulated Send: There are no emails in the Outbox to send in this demo."); };

  // Recycle Bin
  function updateRecycleBinIcon() {
      const iconImg = document.getElementById('recycle-bin-image'); if (!iconImg) return;
      iconImg.src = state.recycleBinItems.length > 0 ? 'icons/All [Without duplicates]/Recycle Bin with torned document and program.ico' : 'icons/All [Without duplicates]/Recycle Bin (empty).ico';
  }
   function updateRecycleBinWindow() {
       const list = document.getElementById('recycle-bin-list'); if (!list) return; list.innerHTML = '';
       if (state.recycleBinItems.length === 0) { list.innerHTML = '<p style="color: grey; font-style: italic; padding:10px;">The Recycle Bin is empty.</p>'; }
       else { state.recycleBinItems.forEach(item => { const li = document.createElement('li'); li.innerHTML = `<img src="${item.icon}" alt="icon"> ${item.name}`; list.appendChild(li); }); }
   }
  window.emptyRecycleBin = () => {
      if (state.recycleBinItems.length > 0) {
          if (confirm(`Are you sure you want to permanently delete these ${state.recycleBinItems.length} items? This action cannot be undone.`)) {
              state.recycleBinItems = []; updateRecycleBinIcon(); updateRecycleBinWindow(); alert('Recycle Bin has been emptied.');
          }
      } else { alert('The Recycle Bin is already empty.'); } hideContextMenu();
  };
   window.deleteIcon = (iconElement) => {
       if (!iconElement) return; const itemName = iconElement.querySelector('div')?.textContent || 'Unknown Item';
       const itemIcon = iconElement.querySelector('img')?.src || 'icons/default.ico'; const itemId = iconElement.id + '_deleted_' + Date.now();
       if (confirm(`Are you sure you want to send "${itemName}" to the Recycle Bin?`)) {
           state.recycleBinItems.push({ id: itemId, name: itemName, icon: itemIcon }); iconElement.style.display = 'none';
           updateRecycleBinIcon(); if (state.windows['recycle-window']?.isOpen) updateRecycleBinWindow();
       } hideContextMenu();
   };

  // Internet Explorer Simulation
   function ieCanGoBack() { return state.ieHistoryIndex > 0; }
   function ieCanGoForward() { return state.ieHistoryIndex < state.ieHistory.length - 1; }
   function updateIEButtons() {
      const ieWindow = document.getElementById('ie-widget'); if (!ieWindow) return;
      const backButton = ieWindow.querySelector('button[onclick="ieGoBack()"]'), forwardButton = ieWindow.querySelector('button[onclick="ieGoForward()"]');
      if (backButton) backButton.disabled = !ieCanGoBack(); if (forwardButton) forwardButton.disabled = !ieCanGoForward();
   }
   function updateIEHistorySelect() {
      const select = document.getElementById('ie-history-select'); if (!select) return;
      while (select.options.length > 1) select.remove(1);
      for (let i = state.ieHistory.length - 1; i >= 0; i--) {
          const option = document.createElement('option'); option.value = state.ieHistory[i];
          option.textContent = state.ieHistory[i].length > 50 ? state.ieHistory[i].substring(0,47) + "..." : state.ieHistory[i]; select.appendChild(option);
      } select.value = (state.ieHistoryIndex >=0 && state.ieHistory[state.ieHistoryIndex]) ? state.ieHistory[state.ieHistoryIndex] : "";
   }
   window.ieGo = (defaultUrl = null) => {
       const urlInput = document.getElementById('ie-url'), iframe = document.getElementById('ie-iframe'); if (!urlInput || !iframe) return;
       let url = defaultUrl || urlInput.value.trim();
       if (!url) { if (state.ieHistory.length > 0 && state.ieHistory[state.ieHistoryIndex]) url = state.ieHistory[state.ieHistoryIndex]; else { iframe.src = 'about:blank'; urlInput.value = ''; return; }}
       urlInput.value = url;
       if (!url.startsWith('http://') && !url.startsWith('https') && !url.startsWith('about:') && !url.startsWith('mailto:')) { url = 'http://' + url; urlInput.value = url; }
       if (state.ieHistoryIndex < state.ieHistory.length - 1) state.ieHistory = state.ieHistory.slice(0, state.ieHistoryIndex + 1);
       if (state.ieHistory[state.ieHistory.length - 1] !== url) state.ieHistory.push(url);
       state.ieHistoryIndex = state.ieHistory.length - 1;
       console.log("IE Navigating iframe to:", url);
       try { iframe.src = 'about:blank'; setTimeout(() => { iframe.src = url; }, 50); }
       catch (error) { console.error("Error loading URL in iframe:", error); iframe.src = 'about:blank'; try { (iframe.contentDocument || iframe.contentWindow.document).body.innerHTML = `<div style="padding:20px; text-align:center; font-family:Arial,sans-serif;"><h2>Navigation Error</h2><p>Could not load page: ${url}</p><p><small>${error.message}</small></p></div>`; } catch (iframeError) { console.error("Could not write error to iframe:", iframeError); }}
       updateIEButtons(); updateIEHistorySelect();
   };
   window.ieGoBack = () => { if (ieCanGoBack()) { state.ieHistoryIndex--; const url = state.ieHistory[state.ieHistoryIndex]; document.getElementById('ie-url').value = url; document.getElementById('ie-iframe').src = url; updateIEButtons(); updateIEHistorySelect(); }};
   window.ieGoForward = () => { if (ieCanGoForward()) { state.ieHistoryIndex++; const url = state.ieHistory[state.ieHistoryIndex]; document.getElementById('ie-url').value = url; document.getElementById('ie-iframe').src = url; updateIEButtons(); updateIEHistorySelect(); }};
   window.ieHistorySelect = () => {
       const select = document.getElementById('ie-history-select'), url = select.value; if (url) {
           const selectedIndex = state.ieHistory.findIndex(histUrl => histUrl === url);
           if (selectedIndex !== -1) { state.ieHistoryIndex = selectedIndex; document.getElementById('ie-url').value = url; document.getElementById('ie-iframe').src = url; updateIEButtons(); }
       }
   };

  // Picture Folder - Open Picture Function
  window.openPicture = (src, title) => {
      const picWindowId = 'picture1-window', picWindow = document.getElementById(picWindowId); if (!picWindow) { console.error(`Picture viewer ('${picWindowId}') not found.`); return; }
      const imgElement = picWindow.querySelector('.content img'), titleElement = picWindow.querySelector('.title-bar span'), titleIcon = picWindow.querySelector('.title-bar-icon');
      if (!imgElement || !titleElement || !titleIcon) { console.error(`Required elements missing in picture window ('${picWindowId}'). Check .content img, .title-bar span, .title-bar-icon`); return; }
      imgElement.src = src; imgElement.alt = title; titleElement.textContent = title;
      if (title.toLowerCase().match(/\.(jpe?g|gif)$/i)) titleIcon.src = 'icons/All [Without duplicates]/Drawing red picture.ico';
      else if (title.toLowerCase().match(/\.(png|bmp)$/i)) titleIcon.src = 'icons/All [Without duplicates]/Drawing green picture.ico';
      else titleIcon.src = 'icons/All [Without duplicates]/Picture.ico';
      openWindow(picWindowId);
  };

   // --- File Upload & Gallery (Synology NAS Placeholder) ---
   const NAS_BASE_URL = 'http://YOUR_NAS_IP:5000/webapi'; let synoAuthToken = null;
   async function loginToSynology() {
       const username = 'YOUR_NAS_USERNAME', password = 'YOUR_NAS_PASSWORD', sessionName = 'WeddingApp';
       if (username === 'YOUR_NAS_USERNAME' || password === 'YOUR_NAS_PASSWORD' || NAS_BASE_URL.includes('YOUR_NAS_IP')) {
           console.warn("Synology NAS credentials or IP not configured. Login skipped.");
           alert("Synology NAS feature requires configuration (username, password, IP). See script.js."); return false;
       }
       const loginUrl = `${NAS_BASE_URL}/auth.cgi?api=SYNO.API.Auth&version=7&method=login&account=${encodeURIComponent(username)}&passwd=${encodeURIComponent(password)}&session=${encodeURIComponent(sessionName)}&format=sid`;
       try {
           const response = await fetch(loginUrl); const data = await response.json();
           if (data.success && data.data.sid) { synoAuthToken = data.data.sid; console.log("Synology Login Successful. SID:", synoAuthToken); return true; }
           else { console.error("Synology Login Failed:", data.error?.code, data.error?.errors); alert(`Synology Login Failed: ${synoErrorCodes[data.error?.code] || 'Unknown error'}`); synoAuthToken = null; return false; }
       } catch (error) { console.error("Error during Synology Login fetch:", error); alert("Error connecting to Synology. Check NAS_BASE_URL, network, and CORS settings."); synoAuthToken = null; return false; }
   }
  window.uploadMedia = async function() {
      const input = document.getElementById('file-input'), statusDiv = document.getElementById('upload-status'); if (!input || !statusDiv) return; statusDiv.textContent = 'Starting upload...';
      if (input.files.length === 0) { statusDiv.textContent = "Please select file(s) to upload."; alert("Wybierz plik(i) do przesłania."); return; }
      if (NAS_BASE_URL.includes('YOUR_NAS_IP')) { statusDiv.textContent = 'Upload Error: NAS IP address not configured in script.js.'; alert('Upload functionality requires configuration. NAS IP address is missing in script.js.'); return; }
      if (!synoAuthToken) { statusDiv.textContent = 'Attempting login to NAS...'; const loggedIn = await loginToSynology(); if (!loggedIn) { statusDiv.textContent = 'Upload Error: Could not log in to Synology NAS.'; return; } }
      statusDiv.textContent = 'Preparing files...'; const formData = new FormData(), uploadFolderPath = '/Public/WeddingUploads';
      formData.append('api', 'SYNO.FileStation.Upload'); formData.append('version', '2'); formData.append('method', 'upload');
      formData.append('path', uploadFolderPath); formData.append('create_parents', 'true'); formData.append('overwrite', 'true'); formData.append('_sid', synoAuthToken);
      for (let i = 0; i < input.files.length; i++) { formData.append('file', input.files[i], input.files[i].name); } statusDiv.textContent = `Uploading ${input.files.length} file(s)...`;
      const uploadUrl = `${NAS_BASE_URL}/entry.cgi`;
      try {
          const response = await fetch(uploadUrl, { method: 'POST', body: formData }); const data = await response.json();
          if (data.success) { statusDiv.textContent = `Successfully uploaded ${input.files.length} file(s) to ${uploadFolderPath}.`; alert('Upload successful!'); input.value = ''; if (state.windows['gallery-window']?.isOpen) loadGallery(); }
          else { const errorCode = data.error?.code; const errorMsg = synoErrorCodes[errorCode] || `Unknown error (${errorCode})`; statusDiv.textContent = `Upload Error: ${errorMsg}`; if (errorCode === 119) { synoAuthToken = null; statusDiv.textContent += ' Session expired. Please try again.'; } }
      } catch (error) { statusDiv.textContent = 'Upload Error: Network or connection issue. Check NAS and CORS.'; console.error('Error during upload fetch:', error); }
  }
  window.loadGallery = async function() {
      const container = document.getElementById('gallery-container'); if(!container) return; container.innerHTML = '<p>Loading gallery...</p>';
      if (NAS_BASE_URL.includes('YOUR_NAS_IP')) { container.innerHTML = '<p>Gallery Error: NAS IP address not configured in script.js.</p>'; return; }
      if (!synoAuthToken) { container.innerHTML = '<p>Attempting login to NAS...</p>'; const loggedIn = await loginToSynology(); if (!loggedIn) { container.innerHTML = '<p>Gallery Error: Could not log in to Synology NAS.'; return; } }
      const galleryFolderPath = '/Public/WeddingUploads'; const listUrl = `${NAS_BASE_URL}/entry.cgi?api=SYNO.FileStation.List&version=2&method=list&folder_path=${encodeURIComponent(galleryFolderPath)}&additional=["real_path","size","time","perm","type","thumb_size"]&filetype="image"&_sid=${synoAuthToken}`;
      try {
          const response = await fetch(listUrl); const data = await response.json();
          if (data.success) {
              container.innerHTML = ''; const files = data.data.files; if (files.length === 0) { container.innerHTML = '<p>No media found in the gallery folder on NAS.</p>'; return; }
              files.forEach(file => {
                   if (file.name.startsWith('@')) return;
                   const nasHttpPort = NAS_BASE_URL.split(':')[2]?.split('/')[0] || '5000'; const nasIpOnly = NAS_BASE_URL.split('//')[1].split(':')[0]; const fileAccessBaseUrl = `http://${nasIpOnly}:${nasHttpPort}/file`;
                   const fileUrl = `${fileAccessBaseUrl}${encodeURIComponent(file.path)}?_sid=${synoAuthToken}`;
                   const itemWrapper = document.createElement('div'); itemWrapper.className = 'gallery-item button-border-raised'; itemWrapper.style.cssText = 'width:100px; height:120px; margin:5px; padding:5px; text-align:center; overflow:hidden; cursor:pointer;';
                   const mediaElement = document.createElement('img'); mediaElement.src = fileUrl; mediaElement.alt = file.name; mediaElement.style.cssText = 'width:90px; height:70px; object-fit:cover;'; mediaElement.title = `View ${file.name}`; mediaElement.onclick = () => openPicture(fileUrl, file.name);
                   const nameDiv = document.createElement('div'); nameDiv.textContent = file.name.length > 15 ? file.name.substring(0,12) + "..." : file.name; nameDiv.style.cssText = 'font-size:10px; margin-top:5px;';
                   itemWrapper.appendChild(mediaElement); itemWrapper.appendChild(nameDiv); container.appendChild(itemWrapper);
              });
          } else { const errorCode = data.error?.code; const errorMsg = synoErrorCodes[errorCode] || `Unknown error (${errorCode})`; container.innerHTML = `<p>Gallery Error: ${errorMsg}</p>`; if (errorCode === 119) { synoAuthToken = null; container.innerHTML += '<p>Session may have expired. Try refreshing.</p>'; } else if (errorCode === 408) { container.innerHTML += `<p>Ensure folder '${galleryFolderPath}' exists on NAS.</p>`; } }
      } catch (error) { container.innerHTML = '<p>Gallery Error: Network or connection issue. Check NAS and CORS.</p>'; console.error('Error during gallery fetch:', error); }
  }
   const synoErrorCodes = { 100: "Unknown error", 101: "Invalid parameter", 102: "API not found", 103: "Method not found", 104: "Version not supported", 105: "Permission denied", 106: "Session timeout", 107: "Session interrupted by duplicated login", 119: "Session ID not found or login expired", 400: "Invalid parameter of file operation", 401: "Unknown error of file operation", 402: "System is too busy", 403: "Invalid user or group for file operation", 404: "Invalid group", 406: "Cannot list user/group", 407: "Cannot list group", 408: "File or folder does not exist", 409: "Cannot create folder", 410: "Folder already exists", /* Add more as needed */ };

}); // End DOMContentLoaded