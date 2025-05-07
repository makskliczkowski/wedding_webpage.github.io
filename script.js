      
document.addEventListener('DOMContentLoaded', () => {
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
  const icons = document.querySelectorAll('.icon'); // This should be up here

  // --- Initialization ---
  // CSS should ensure .window { display: none; } initially. No JS needed to hide them further.
  initClock();
  initDesktopIcons();
  initWindowControls(); // Call before makeWindowDraggable/Resizable if it affects their setup
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
          // Resizers initially hidden by CSS or controlled by maximize state later
          toggleResizers(win, !win.classList.contains('maximized'));
      } else {
          toggleResizers(win, false); // Ensure hidden on mobile
      }
  });


  // --- Core Functions ---

  function openWindow(windowId) {
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
            isMaximized: state.isMobile, // On mobile, treat as maximized
            isOpen: false,      // Will be set to true below
            originalRect: null, // Store original position/size for maximize toggle
        };
        state.windows[windowId] = windowData;
        if (!state.isMobile) { // Only create taskbar buttons on desktop
            createTaskbarButton(windowId);
        }

        // Set initial position for non-mobile, non-maximized windows
        if (!state.isMobile && !windowData.isMaximized) {
            // Count currently open, non-minimized windows to calculate offset
            const openWindowElements = Object.values(state.windows).filter(w => w.isOpen && !w.isMinimized && w.element.style.display !== 'none');
            const offset = (openWindowElements.length) * 20; // Stagger new windows

            if (!win.style.left || win.style.left === '0px' || win.style.left === '') {
                 win.style.left = `${50 + offset}px`;
            }
            if (!win.style.top || win.style.top === '0px' || win.style.top === '') {
                 win.style.top = `${50 + offset}px`;
            }
            // Set default size if not set by CSS or previous interaction.
            // Min-width/height in CSS will also apply.
            if (!win.style.width || win.style.width === '0px' || win.style.width === '') win.style.width = '500px';
            if (!win.style.height || win.style.height === '0px' || win.style.height === '') win.style.height = '400px';
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
        toggleResizers(win, true);
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
        if (iframe && urlInput && (iframe.getAttribute('src') === 'about:blank' || iframe.getAttribute('src') === null) && state.ieHistory.length === 0) {
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
          // For a full close, reset these. If we wanted to "remember" maximized state
          // even after close and re-open, we wouldn't reset isMaximized here.
          // But typical Win95 behavior is new windows open non-maximized.
          winData.isMinimized = false;
          // winData.isMaximized = false; // Let's keep isMaximized state if user reopens it via taskbar soon
                                       // But if state.windows[windowId] is deleted, this doesn't matter.
          
          if (!state.isMobile) {
            removeTaskbarButton(windowId);
          }
          delete state.windows[windowId]; // Remove from tracking for a "true" close.
                                        // This means next open is like a fresh window.

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
          winData.element.style.display = 'none';
          winData.isMinimized = true;
          // winData.isOpen remains true, it's just not visible
          if (state.activeWindowId === windowId) {
              state.activeWindowId = null;
              winData.element.classList.remove('active');
          }
          updateTaskbarButton(windowId);
      }
  }

  function restoreWindow(windowId) { // Called from taskbar button or potentially other restore actions
    const winData = state.windows[windowId];

    if (!winData || !winData.element) { // Window was fully closed (state deleted)
        openWindow(windowId); // Re-open it fresh
        return;
    }

    if (winData.isMinimized) { // If it was minimized
        winData.element.style.display = 'flex';
        winData.isMinimized = false;
        // isOpen should already be true
        bringToFront(windowId); // This handles active state, z-index, and taskbar button update

        // If it was maximized before minimizing, restore to maximized state (for desktop)
        if (winData.isMaximized && !state.isMobile) {
            winData.element.classList.add('maximized');
            winData.element.style.left = '0px';
            winData.element.style.top = '0px';
            winData.element.style.width = '100vw';
            winData.element.style.height = `calc(100vh - ${taskbar.offsetHeight}px)`;
            toggleResizers(winData.element, false);
        } else if (!state.isMobile) { // Standard desktop non-maximized restore
            winData.element.classList.remove('maximized');
             // Position should be preserved from before minimize. If not, openWindow would have set it.
            toggleResizers(winData.element, true);
        } else { // Mobile - always "maximized"
            toggleResizers(winData.element, false);
        }

    } else if (winData.isOpen) { // Window is open but not minimized (e.g., behind another window)
        bringToFront(windowId); // Just bring to front
    }
    // No need for `else if (!winData.isOpen)` because if `isOpen` was false and `winData` existed,
    // it means it was minimized (isOpen = true, isMinimized = true) or closed (winData deleted).
    // The `openWindow` call at the start handles the fully closed case.
    
    // bringToFront calls updateTaskbarButton, so not strictly needed here unless for edge cases
    // updateTaskbarButton(windowId); 
}


   function maximizeWindow(windowId) {
      if (state.isMobile) return; // No maximize on mobile (it's always "maximized")

      const winData = state.windows[windowId];
      if (!winData || !winData.element || !winData.isOpen || winData.isMinimized) return;

      const win = winData.element;

      if (!winData.isMaximized) {
          // Store original position and size *only if not already maximized*
          if (!win.classList.contains('maximized')) { // Check class as well
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
          win.classList.remove('maximized');
           if (winData.originalRect) {
              win.style.left = winData.originalRect.left;
              win.style.top = winData.originalRect.top;
              win.style.width = winData.originalRect.width;
              win.style.height = winData.originalRect.height;
          } else {
               // Fallback if originalRect wasn't stored (should not happen often with refined logic)
               win.style.width = '500px';
               win.style.height = '400px';
               // Position it reasonably, e.g. near where openWindow would put it
               const openWindowCount = Object.values(state.windows).filter(w => w.isOpen && !w.isMinimized).length;
               const offset = (openWindowCount || 1) * 10;
               win.style.left = `${50 + offset}px`;
               win.style.top = `${50 + offset}px`;
          }
          winData.isMaximized = false;
      }
      bringToFront(windowId); // Ensure it's active and z-indexed correctly after state change
      toggleResizers(win, !winData.isMaximized);
  }

   function toggleResizers(windowEl, enable) {
       const resizers = windowEl.querySelectorAll('.resizer');
       // Resizers should only be enabled if not on mobile AND window is not maximized (passed by 'enable' flag)
       const actualEnable = enable && !state.isMobile; // 'enable' already considers maximized state from callers
       resizers.forEach(r => r.style.display = actualEnable ? 'block' : 'none');
   }


  function bringToFront(windowId) {
    const winData = state.windows[windowId];
    if (!winData || !winData.element) {
        // This can happen if bringToFront is called prematurely or for a closed window.
        // openWindow should ensure winData is populated before calling this.
        console.warn(`bringToFront called for windowId ${windowId}, but no winData or element found. Window might be closed or not yet initialized.`);
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

    // Ensure resizers are correctly shown/hidden based on current state
    // (not mobile, and window is not maximized)
    toggleResizers(winData.element, !state.isMobile && !winData.isMaximized);
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
      img.src = iconSrc;
      img.alt = '';
      btn.appendChild(img);

      const span = document.createElement('span');
      span.textContent = title;
      btn.appendChild(span);

      btn.onclick = () => {
          const currentWinData = state.windows[windowId]; // Get current state
          if (!currentWinData) { // Window was closed, state deleted
              openWindow(windowId); // Reopen it
              return;
          }

          if (currentWinData.isMinimized) {
              restoreWindow(windowId);
          } else if (state.activeWindowId === windowId) { // Is open and active
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
      if (btn) {
          btn.remove();
          delete state.taskbarButtons[windowId];
      }
  }

  function updateTaskbarButton(windowId) {
      if (state.isMobile) return; // No taskbar buttons on mobile

      const btn = state.taskbarButtons[windowId];
      const winData = state.windows[windowId]; // winData might not exist if window was just closed
      
      if (!btn) return; // No button to update

      btn.classList.remove('active', 'minimized', 'button-border-lowered');
      btn.classList.add('button-border-raised'); // Default state

      if (winData && winData.isOpen) { // Check if window state exists and is open
           if (winData.isMinimized) {
               btn.classList.add('minimized'); // Visual distinction for minimized
           } else if (state.activeWindowId === windowId) { // Open, not minimized, and active
               btn.classList.add('active');
               btn.classList.remove('button-border-raised');
               btn.classList.add('button-border-lowered'); // "Pressed" style
           }
           // If open, not minimized, but not active, it just uses default 'button-border-raised'
      }
      // If winData doesn't exist (window closed), button should have been removed by removeTaskbarButton.
      // If somehow it's still here, it will appear as a normal raised button.
  }

  // --- Desktop Icons ---

  function initDesktopIcons() {
       if (state.isMobile) {
           const iconContainer = document.createElement('div');
           iconContainer.className = 'icon-container';
           document.querySelectorAll('.desktop > .icon').forEach(icon => iconContainer.appendChild(icon.parentNode.removeChild(icon)));
           desktop.appendChild(iconContainer);
       }

      icons.forEach(icon => {
          icon.addEventListener('dblclick', () => {
              if (state.isMobile) return; // dblclick for desktop only
              const windowId = icon.dataset.windowId;
              if (windowId) openWindow(windowId);
          });
           icon.addEventListener('touchend', (e) => {
              if (icon.dataset.dragging !== 'true') { // Prevent open after drag
                  const windowId = icon.dataset.windowId;
                  if (windowId && state.isMobile) { // Single tap opens on mobile
                      e.preventDefault();
                      openWindow(windowId);
                  }
               }
               icon.dataset.dragging = 'false';
           });
           icon.addEventListener('click', (e) => { // Single click for desktop selection
               if (!state.isMobile) {
                   selectIcon(icon);
                   e.stopPropagation();
               }
           });
            // touchstart for selection on desktop if needed, or for drag init
           icon.addEventListener('touchstart', (e) => {
               if (!state.isMobile) {
                    // Could select icon here if not planning touch-drag
               }
               icon.dataset.dragging = 'false'; // Initialize for touchend check
           }, { passive: true });


          if (!state.isMobile) {
              makeIconDraggable(icon);
          } else {
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
      icons.forEach(icon => icon.classList.remove('selected'));
  }

  function makeIconDraggable(icon) {
      let offsetX, offsetY, startX, startY;
      let isDragging = false;
      let hasMoved = false;

      const onMouseDown = (e) => {
          if (e.button !== 0 && e.type === 'mousedown') return; // Only left click for mouse

          isDragging = true;
          hasMoved = false;
          selectIcon(icon); // Select on press

          const touchOrMouse = e.touches ? e.touches[0] : e;
          const rect = icon.getBoundingClientRect();
          // const desktopRect = desktop.getBoundingClientRect(); // Not needed for offset calc here
          offsetX = touchOrMouse.clientX - rect.left;
          offsetY = touchOrMouse.clientY - rect.top;
          startX = touchOrMouse.clientX;
          startY = touchOrMouse.clientY;

          icon.style.zIndex = state.nextZIndex++;
          icon.style.cursor = 'grabbing';
          desktop.style.cursor = 'grabbing';
          icon.dataset.dragging = 'false'; // Reset for touchend logic

          if (e.type === 'mousedown') e.preventDefault(); // Prevent text selection
          // For touchstart, passive:false on listener if preventDefault is needed for scroll blocking
      };

      const onMouseMove = (e) => {
          if (!isDragging) return;
          
          const touchOrMouse = e.touches ? e.touches[0] : e;
          const currentX = touchOrMouse.clientX;
          const currentY = touchOrMouse.clientY;

          if (!hasMoved && (Math.abs(currentX - startX) > 5 || Math.abs(currentY - startY) > 5)) {
              hasMoved = true;
              icon.dataset.dragging = 'true'; // Mark as dragging for touchend/click logic
          }

          if (hasMoved) {
               if (e.type === 'touchmove') e.preventDefault(); // Prevent scroll while dragging icon on touch

               const desktopRect = desktop.getBoundingClientRect();
               let newLeft = currentX - offsetX - desktopRect.left;
               let newTop = currentY - offsetY - desktopRect.top;

               icon.style.left = `${newLeft}px`;
               icon.style.top = `${newTop}px`;
          }
      };

      const onMouseUp = (e) => {
          if (!isDragging) return;

          isDragging = false;
          icon.style.zIndex = 10; // Reset z-index (or a suitable base for icons)
          icon.style.cursor = 'pointer';
          desktop.style.cursor = 'default';
          
          if (hasMoved) {
              let left = parseFloat(icon.style.left);
              let top = parseFloat(icon.style.top);

              const desktopRect = desktop.getBoundingClientRect();
              const taskbarHeight = taskbar.offsetHeight;
              const maxLeft = desktopRect.width - icon.offsetWidth;
              // Ensure icons don't go under the taskbar
              const maxTop = desktopRect.height - icon.offsetHeight - taskbarHeight;

              left = Math.max(0, Math.min(left, maxLeft));
              top = Math.max(0, Math.min(top, maxTop));

              const snappedLeft = Math.round(left / state.iconGridSize) * state.iconGridSize;
              const snappedTop = Math.round(top / state.iconGridSize) * state.iconGridSize;

              icon.style.left = `${snappedLeft}px`;
              icon.style.top = `${snappedTop}px`;
          }
          // If !hasMoved, it's a click, handled by the 'click' listener for selection
          // touchend for opening on mobile is handled by its own listener and icon.dataset.dragging flag
          // icon.dataset.dragging = 'false'; // Set by touchend on the icon itself
      };

      icon.addEventListener('mousedown', onMouseDown);
      // Add touch events for dragging icons on DESKTOP (if desired, though unusual for Win95 paradigm)
      // For now, focusing on mouse drag for desktop icons as per Win95
      // The touchend on icon is for *opening* on mobile, not dragging.

      // Global listeners for dragging
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      // If adding touch drag for icons on desktop:
      // icon.addEventListener('touchstart', onMouseDown, { passive: false }); // if preventDefault in onMouseMove
      // document.addEventListener('touchmove', onMouseMove, { passive: false }); // if preventDefault
      // document.addEventListener('touchend', onMouseUp);
  }


  // --- Window Dragging and Resizing (Desktop Only) ---

  function makeWindowDraggable(windowEl) {
      if (state.isMobile) return;

      const titleBar = windowEl.querySelector('.title-bar');
      if (!titleBar) return;

      let offsetX, offsetY, isDragging = false;

      const startDrag = (e) => {
          if (e.target.closest('.window-controls button')) return;
          const currentWindowData = state.windows[windowEl.id];
          if (currentWindowData?.isMaximized) return; // Don't drag maximized windows

          isDragging = true;
          bringToFront(windowEl.id); // Bring to front on drag start

          const eventPos = e.touches ? e.touches[0] : e;
          const rect = windowEl.getBoundingClientRect();
          offsetX = eventPos.clientX - rect.left;
          offsetY = eventPos.clientY - rect.top;
          
          titleBar.style.cursor = 'grabbing';
          desktop.style.cursor = 'grabbing';
          // Prevent text selection during drag
          if (e.type === 'mousedown') e.preventDefault();
          // For touch, listener should be {passive: false} if preventDefault is used
      };

      const doDrag = (e) => {
          if (!isDragging) return;
          if (e.type === 'touchmove') e.preventDefault(); // Prevent scrolling page while dragging window

          const eventPos = e.touches ? e.touches[0] : e;
          const desktopRect = desktop.getBoundingClientRect();

          let newLeft = eventPos.clientX - offsetX;
          let newTop = eventPos.clientY - offsetY;

          const taskbarHeight = taskbar.offsetHeight;
          // Keep title bar visible and somewhat on screen
          newLeft = Math.max(-windowEl.offsetWidth + 50, Math.min(newLeft, desktopRect.width - 50));
          newTop = Math.max(0, Math.min(newTop, desktopRect.height - taskbarHeight - titleBar.offsetHeight));

          windowEl.style.left = `${newLeft}px`;
          windowEl.style.top = `${newTop}px`;
      };

      const stopDrag = () => {
          if (isDragging) {
              isDragging = false;
              titleBar.style.cursor = 'grab';
              desktop.style.cursor = 'default';
          }
      };

      titleBar.addEventListener('mousedown', startDrag);
      document.addEventListener('mousemove', doDrag);
      document.addEventListener('mouseup', stopDrag);

      titleBar.addEventListener('touchstart', startDrag, { passive: false });
      document.addEventListener('touchmove', doDrag, { passive: false });
      document.addEventListener('touchend', stopDrag);
  }

  function makeWindowResizable(windowEl) {
      if (state.isMobile) return;

      const resizers = windowEl.querySelectorAll('.resizer');
      let isResizing = false;
      let currentResizer = null;
      let startX, startY, startWidth, startHeight, startLeft, startTop;

      const startResize = (e) => {
          const currentWindowData = state.windows[windowEl.id];
          if (currentWindowData?.isMaximized) return; // Don't resize maximized

          isResizing = true;
          currentResizer = e.target; // The resizer element itself
          bringToFront(windowEl.id); // Bring to front on resize start

          const eventPos = e.touches ? e.touches[0] : e;
          const rect = windowEl.getBoundingClientRect(); // Get fresh rect
          startX = eventPos.clientX;
          startY = eventPos.clientY;
          startWidth = rect.width;
          startHeight = rect.height;
          // Use getComputedStyle for left/top as style.left might be empty initially
          startLeft = parseFloat(getComputedStyle(windowEl).left);
          startTop = parseFloat(getComputedStyle(windowEl).top);


          windowEl.style.userSelect = 'none';
          document.body.style.cursor = getComputedStyle(currentResizer).cursor;
          
          e.preventDefault(); // Prevent default actions
          e.stopPropagation(); // Stop drag from title bar if resizer overlaps
      };

      const doResize = (e) => {
          if (!isResizing) return;
          e.preventDefault(); // Prevent scroll/other actions during resize

          const eventPos = e.touches ? e.touches[0] : e;
          const dx = eventPos.clientX - startX;
          const dy = eventPos.clientY - startY;

          let newWidth = startWidth;
          let newHeight = startHeight;
          let newLeft = startLeft; // Use the numeric startLeft/Top
          let newTop = startTop;

          const minWidth = parseInt(getComputedStyle(windowEl).minWidth) || 150;
          const minHeight = parseInt(getComputedStyle(windowEl).minHeight) || 100;

          // Horizontal resizing
          if (currentResizer.classList.contains('resizer-e') || currentResizer.classList.contains('resizer-ne') || currentResizer.classList.contains('resizer-se')) {
              newWidth = Math.max(minWidth, startWidth + dx);
          }
          if (currentResizer.classList.contains('resizer-w') || currentResizer.classList.contains('resizer-nw') || currentResizer.classList.contains('resizer-sw')) {
              const provisionalWidth = startWidth - dx;
              if (provisionalWidth >= minWidth) {
                  newWidth = provisionalWidth;
                  newLeft = startLeft + dx;
              } else { // Hit min width
                  newWidth = minWidth;
                  newLeft = startLeft + (startWidth - minWidth);
              }
          }

          // Vertical resizing
          if (currentResizer.classList.contains('resizer-s') || currentResizer.classList.contains('resizer-se') || currentResizer.classList.contains('resizer-sw')) {
              newHeight = Math.max(minHeight, startHeight + dy);
          }
          if (currentResizer.classList.contains('resizer-n') || currentResizer.classList.contains('resizer-ne') || currentResizer.classList.contains('resizer-nw')) {
              const provisionalHeight = startHeight - dy;
              if (provisionalHeight >= minHeight) {
                  newHeight = provisionalHeight;
                  newTop = startTop + dy;
              } else { // Hit min height
                  newHeight = minHeight;
                  newTop = startTop + (startHeight - minHeight);
              }
          }
          
          windowEl.style.width = `${newWidth}px`;
          windowEl.style.height = `${newHeight}px`;
          windowEl.style.left = `${newLeft}px`;
          windowEl.style.top = `${newTop}px`;
      };

      const stopResize = () => {
          if (isResizing) {
              isResizing = false;
              windowEl.style.userSelect = '';
              document.body.style.cursor = 'default';
          }
      };
      
      resizers.forEach(resizer => {
          resizer.addEventListener('mousedown', startResize);
          resizer.addEventListener('touchstart', startResize, { passive: false });
      });

      document.addEventListener('mousemove', doResize);
      document.addEventListener('mouseup', stopResize);
      document.addEventListener('touchmove', doResize, { passive: false });
      document.addEventListener('touchend', stopResize);
  }

  // --- Window Control Buttons ---
  function initWindowControls() {
      desktop.addEventListener('click', (e) => {
           const button = e.target.closest('.window-controls button');
           if (!button) return;

           const windowId = button.dataset.windowId || button.closest('.window')?.id;
           if (!windowId || !state.windows[windowId]) return; // Ensure windowId is valid and window exists in state

          if (button.classList.contains('close-button')) {
              closeWindow(windowId);
          } else if (button.classList.contains('minimize-button')) {
              minimizeWindow(windowId);
          } else if (button.classList.contains('maximize-button')) {
              maximizeWindow(windowId);
          }
      });

       // Bring window to front on any mousedown inside it (not on control buttons themselves)
       desktop.addEventListener('mousedown', (e) => {
          const windowEl = e.target.closest('.window');
          if (windowEl && !e.target.closest('.window-controls button') && !e.target.closest('.resizer')) {
            const winData = state.windows[windowEl.id];
            if (winData?.isOpen && state.activeWindowId !== windowEl.id) {
                bringToFront(windowEl.id);
            }
          }
       }, true); // Use capture phase
  }

  // --- Start Menu ---
  function initStartMenu() {
      startButton.addEventListener('click', (e) => {
          toggleStartMenu();
          e.stopPropagation();
      });
      document.addEventListener('click', (e) => {
          if (startMenu.classList.contains('active') && !startMenu.contains(e.target) && e.target !== startButton) {
              closeStartMenu();
          }
      });
       startMenu.addEventListener('click', (e) => {
           e.stopPropagation(); // Prevent clicks inside menu from closing it via document listener
           // If a direct link (not submenu trigger) is clicked, close the menu
           const linkItem = e.target.closest('a');
           if (linkItem && !linkItem.closest('li.has-submenu')) { // Ensure it's not just a submenu trigger
              // Check if the link has an onclick that opens a window
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
      startButton.classList.toggle('active', isActive);
      startButton.classList.toggle('button-border-lowered', isActive);
      startButton.classList.toggle('button-border-raised', !isActive);
      if (isActive) {
        deselectAllIcons(); // Deselect desktop icons when opening start menu
        hideContextMenu();
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
      const updateClock = () => {
          const now = new Date();
          const hours = now.getHours().toString().padStart(2, '0'); // Ensure 24h format for consistency
          const minutes = now.getMinutes().toString().padStart(2, '0');
          clockElement.textContent = `${hours}:${minutes}`;
      };
      updateClock();
      setInterval(updateClock, 1000);
  }

  // --- Context Menu (Right Click) ---
  function initContextMenu() {
      desktop.addEventListener('contextmenu', (e) => {
          if (state.isMobile) return;

          e.preventDefault();
          hideContextMenu();
          closeStartMenu();

          const target = e.target;
          let menuItems = [];
          const iconTarget = target.closest('.icon');
          const windowTitleBarTarget = target.closest('.title-bar'); // More specific for window context
          const windowContentTarget = target.closest('.content'); // For content area context

          if (iconTarget) {
              selectIcon(iconTarget);
              const windowId = iconTarget.dataset.windowId;
              menuItems.push({ label: 'Open', action: () => { if (windowId) openWindow(windowId); } });
              menuItems.push({ type: 'separator' });
              if (iconTarget.id === 'recycle-icon') {
                  menuItems.push({ label: 'Empty Recycle Bin', action: emptyRecycleBin, disabled: state.recycleBinItems.length === 0 });
              } else {
                   menuItems.push({ label: 'Cut', disabled: true, action: () => {} });
                   menuItems.push({ label: 'Copy', disabled: true, action: () => {} });
              }
               menuItems.push({ type: 'separator' });
               menuItems.push({ label: 'Delete', action: () => deleteIcon(iconTarget), disabled: iconTarget.id === 'recycle-icon' || iconTarget.id === 'mycomputer-icon' });
               menuItems.push({ label: 'Properties', action: () => alert(`Properties for ${iconTarget.querySelector('div').textContent}`), disabled: true });
          } else if (windowTitleBarTarget) {
               const windowEl = windowTitleBarTarget.closest('.window');
               if (windowEl && state.windows[windowEl.id]) {
                   const winData = state.windows[windowEl.id];
                   menuItems.push({ label: 'Restore', action: () => maximizeWindow(windowEl.id), disabled: !winData.isMaximized });
                   menuItems.push({ label: 'Move', disabled: winData.isMaximized, action: () => { /* Implement visual move mode or ignore */ } });
                   menuItems.push({ label: 'Size', disabled: winData.isMaximized, action: () => { /* Implement visual size mode or ignore */ } });
                   menuItems.push({ label: 'Minimize', action: () => minimizeWindow(windowEl.id), disabled: winData.isMinimized });
                   menuItems.push({ label: 'Maximize', action: () => maximizeWindow(windowEl.id), disabled: winData.isMaximized });
                   menuItems.push({ type: 'separator' });
                   menuItems.push({ label: 'Close', action: () => closeWindow(windowEl.id) });
               }
          }
          // Add specific context for windowContentTarget if needed
          else { // Desktop background
               menuItems.push({ label: 'Arrange Icons', disabled: true, action: () => {} });
               menuItems.push({ label: 'Line up Icons', disabled: true, action: () => {} });
               menuItems.push({ type: 'separator' });
               menuItems.push({ label: 'Paste', disabled: true, action: () => {} });
               menuItems.push({ label: 'Paste Shortcut', disabled: true, action: () => {} });
               menuItems.push({ type: 'separator' });
               menuItems.push({ label: 'New', disabled: true, action: () => {} });
               menuItems.push({ type: 'separator' });
               menuItems.push({ label: 'Properties', action: () => alert('Display Properties not available.'), disabled: true });
          }

          if (menuItems.length > 0) {
            showContextMenu(e.clientX, e.clientY, menuItems);
          }
      });

      document.addEventListener('click', hideContextMenu);
      contextMenu.addEventListener('click', (e) => e.stopPropagation());
  }

  function showContextMenu(x, y, items) {
      contextMenu.innerHTML = '';
      contextMenu.style.display = 'block';

      items.forEach(item => {
          const div = document.createElement('div');
          if (item.type === 'separator') {
              div.className = 'context-menu-separator';
          } else {
              div.className = 'context-menu-item';
              div.textContent = item.label;
              if (item.disabled) {
                  div.classList.add('disabled');
              } else {
                  div.onclick = () => {
                      if(item.action) item.action();
                      hideContextMenu();
                  };
              }
          }
          contextMenu.appendChild(div);
      });

      const menuWidth = contextMenu.offsetWidth;
      const menuHeight = contextMenu.offsetHeight;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (x + menuWidth > viewportWidth) x = viewportWidth - menuWidth - 5;
      if (y + menuHeight > viewportHeight) y = viewportHeight - menuHeight - 5;
      if (x < 0) x = 5;
      if (y < 0) y = 5;

      contextMenu.style.left = `${x}px`;
      contextMenu.style.top = `${y}px`;
  }

  function hideContextMenu() {
      contextMenu.style.display = 'none';
  }

   // --- Specific App Logic ---

   const emailData = {
      inbox: [
          { id: 1, subject: "Zaproszenie na ślub", from: "Oliwia & Maks", content: "Oliwia i Maks,\nserdecznie zapraszają na uroczystość zawarcia związku małżeńskiego oraz przyjęcie weselne, które odbędą się 3 sierpnia 2025 o godzinie 17:00 w Dworku Separowo.\n\nSeparowo 8, 62-066 Separowo.\n\nProsimy o potwierdzenie swojej obecności do 01.05.2025.\n\nPozdrawiamy!", read: false },
          { id: 4, subject: "Welcome to Outlook Express!", from: "Microsoft", content: "Welcome! We hope you enjoy this totally real email client experience.", read: true },
      ],
      outbox: [],
      sent: [
          { id: 2, subject: "RE: Your Pool Party", to: "Elon Musk, Donald Trump", content: "Dear Mr. Musk and Mr. Trump,\n\nSounds like a blast! We'll bring the giant inflatable swan.\n\nBest,\nErnest G.", read: true }
      ]
   };
   let currentEmailFolder = 'inbox';
   let selectedEmailId = null;

   function initEmail() {
       // No need to call switchFolder here as openWindow for email-window will do it.
       // If email-window was to be open by default, then yes.
   }

   function switchFolder(folderName, clickedElement) {
       currentEmailFolder = folderName;
       const list = document.getElementById('email-list');
       const content = document.getElementById('email-content');
       if (!list || !content) return; // Ensure elements exist, e.g. if window not open

       list.innerHTML = '';
       content.innerHTML = '<p style="padding: 20px; text-align: center;">Select an email to view.</p>';
       selectedEmailId = null;

       document.querySelectorAll('#email-window .email-nav .folder').forEach(f => f.classList.remove('active'));
       if (clickedElement) {
           clickedElement.classList.add('active');
       } else {
           const folderEl = document.getElementById(`folder-${folderName}`);
           if (folderEl) folderEl.classList.add('active');
       }

       const emails = emailData[folderName] || [];
       if (emails.length === 0) {
          list.innerHTML = '<p style="padding: 10px; color: grey; font-style: italic;">This folder is empty.</p>';
       } else {
          emails.forEach(email => {
              const item = document.createElement('div');
              item.className = 'email-item';
              item.dataset.emailId = email.id;
              item.style.fontWeight = email.read ? 'normal' : 'bold';
              item.textContent = `${email.subject} (From: ${email.from || email.to || 'Unknown'})`;
              item.onclick = () => {
                  displayEmailContent(email);
                   if (!email.read) {
                       email.read = true;
                       item.style.fontWeight = 'normal';
                   }
                   document.querySelectorAll('#email-list .email-item').forEach(i => i.classList.remove('selected'));
                   item.classList.add('selected');
              };
              list.appendChild(item);
          });
       }
   }

   function displayEmailContent(email) {
       selectedEmailId = email.id;
       const content = document.getElementById('email-content');
       if (!content) return;
       content.innerHTML = `
          <div style="padding:5px; border-bottom: 1px solid #ccc;">
            <p><strong>Subject:</strong> ${email.subject}</p>
            <p><strong>From:</strong> ${email.from || 'N/A'}</p>
            <p><strong>To:</strong> ${email.to || 'N/A'}</p>
          </div>
          <div style="padding:10px; white-space: pre-wrap;">${email.content}</div>
       `; // Removed replace \n with br as pre-wrap handles it. Added structure.

       if (email.id === 1) { // Invitation email
          const btnDiv = document.createElement('div');
          btnDiv.style.marginTop = '20px';
          btnDiv.style.textAlign = 'center';
          btnDiv.innerHTML = `
              <button class="button-border-raised" onclick="sendEmail(true)">Confirm Attendance</button>
              <button class="button-border-raised" style="margin-left: 10px;" onclick="sendEmail(false)">Decline Attendance</button>
          `;
          content.appendChild(btnDiv);
       }
   }

  window.sendEmail = function(confirm) { // Global for HTML buttons
      const recipient = "maxgrom97@gmail.com"; // Replace with actual recipient
      const subject = encodeURIComponent("[Slub separowo] Potwierdzenie obecnosci");
      const body = confirm
          ? encodeURIComponent("Potwierdzam moją obecność na ślubie i weselu 3 sierpnia 2025.\n\nDziękuję i pozdrawiam,\n\n[Twoje Imię i Nazwisko]")
          : encodeURIComponent("Z przykrością informuję, że nie będę mógł/mogła uczestniczyć w uroczystości 3 sierpnia 2025.\n\nDziękuję za zaproszenie i życzę wspaniałego dnia!\n\nPozdrawiam,\n\n[Twoje Imię i Nazwisko]");
      window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
      alert('Attempting to open your default email client...'); // More generic message
  }
   window.sendEmailMessage = function() { // For Outlook Express menu
       alert("Simulated Send: There are no emails in the Outbox to send in this demo.");
   }


  // Recycle Bin
  function updateRecycleBinIcon() {
      const iconImg = document.getElementById('recycle-bin-image');
      if (!iconImg) return;
      if (state.recycleBinItems.length > 0) {
          iconImg.src = 'icons/All [Without duplicates]/Recycle Bin with torned document and program.ico';
      } else {
          iconImg.src = 'icons/All [Without duplicates]/Recycle Bin (empty).ico';
      }
  }

   function updateRecycleBinWindow() {
       const list = document.getElementById('recycle-bin-list');
       if (!list) return; // Only update if window is open and list exists
       list.innerHTML = '';

       if (state.recycleBinItems.length === 0) {
           list.innerHTML = '<p style="color: grey; font-style: italic; padding:10px;">The Recycle Bin is empty.</p>';
       } else {
           state.recycleBinItems.forEach(item => {
               const li = document.createElement('li');
               li.innerHTML = `<img src="${item.icon}" alt="icon"> ${item.name}`;
               list.appendChild(li);
           });
       }
   }

  window.emptyRecycleBin = function() {
      if (state.recycleBinItems.length > 0) {
          if (confirm(`Are you sure you want to permanently delete these ${state.recycleBinItems.length} items? This action cannot be undone.`)) {
              state.recycleBinItems = [];
              updateRecycleBinIcon();
              updateRecycleBinWindow();
              alert('Recycle Bin has been emptied.');
          }
      } else {
          alert('The Recycle Bin is already empty.');
      }
       hideContextMenu();
  }

   window.deleteIcon = function(iconElement) {
       if (!iconElement) return;
       const itemName = iconElement.querySelector('div')?.textContent || 'Unknown Item';
       const itemIcon = iconElement.querySelector('img')?.src || 'icons/default.ico';
       const itemId = iconElement.id + '_deleted_' + Date.now(); // More unique ID

       if (confirm(`Are you sure you want to send "${itemName}" to the Recycle Bin?`)) {
           state.recycleBinItems.push({ id: itemId, name: itemName, icon: itemIcon });
           iconElement.style.display = 'none'; // "Delete" by hiding
           updateRecycleBinIcon();
           if (state.windows['recycle-window']?.isOpen) { // Update bin window if open
                updateRecycleBinWindow();
           }
       }
       hideContextMenu();
   }


  // Internet Explorer Simulation
   function ieCanGoBack() { return state.ieHistoryIndex > 0; }
   function ieCanGoForward() { return state.ieHistoryIndex < state.ieHistory.length - 1; }

   function updateIEButtons() {
      const ieWindow = document.getElementById('ie-widget'); // Use 'ie-widget' if that's the ID
      if (!ieWindow) return;
      const backButton = ieWindow.querySelector('button[onclick="ieGoBack()"]');
      const forwardButton = ieWindow.querySelector('button[onclick="ieGoForward()"]');
      if (backButton) backButton.disabled = !ieCanGoBack();
      if (forwardButton) forwardButton.disabled = !ieCanGoForward();
   }

   function updateIEHistorySelect() {
      const select = document.getElementById('ie-history-select');
      if (!select) return;
      while (select.options.length > 1) select.remove(1); // Keep placeholder
      
      for (let i = state.ieHistory.length - 1; i >= 0; i--) { // Most recent first
          const option = document.createElement('option');
          option.value = state.ieHistory[i];
          option.textContent = state.ieHistory[i].length > 50 ? state.ieHistory[i].substring(0,47) + "..." : state.ieHistory[i];
          select.appendChild(option);
      }
      select.value = (state.ieHistoryIndex >=0 && state.ieHistory[state.ieHistoryIndex]) ? state.ieHistory[state.ieHistoryIndex] : "";
   }


   window.ieGo = function(defaultUrl = null) {
       const urlInput = document.getElementById('ie-url');
       const iframe = document.getElementById('ie-iframe');
       if (!urlInput || !iframe) return;

       let url = defaultUrl || urlInput.value.trim();
       if (!url) { // If no URL provided and input is empty
           if (state.ieHistory.length > 0 && state.ieHistory[state.ieHistoryIndex]) {
               url = state.ieHistory[state.ieHistoryIndex]; // Default to current history URL if any
           } else {
               iframe.src = 'about:blank'; // Or show a "home" page / blank
               urlInput.value = '';
               return;
           }
       }
       
       urlInput.value = url;

       if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('about:') && !url.startsWith('mailto:')) {
           url = 'http://' + url;
           urlInput.value = url;
       }

       // Manage history: if navigating from a point in history, new navigation clears "forward" history
       if (state.ieHistoryIndex < state.ieHistory.length - 1) {
           state.ieHistory = state.ieHistory.slice(0, state.ieHistoryIndex + 1);
       }
       // Avoid adding duplicate consecutive entries
       if (state.ieHistory[state.ieHistory.length - 1] !== url) {
           state.ieHistory.push(url);
       }
       state.ieHistoryIndex = state.ieHistory.length - 1;

       console.log("IE Navigating iframe to:", url);
       try {
           iframe.src = 'about:blank'; // Clear previous content first
           setTimeout(() => { // Delay to allow clear to take effect
               iframe.src = url;
           }, 50);
       } catch (error) {
           console.error("Error loading URL in iframe:", error);
           iframe.src = 'about:blank';
           try { // Try to display error in iframe
               const errorDoc = iframe.contentDocument || iframe.contentWindow.document;
               errorDoc.body.innerHTML = `<div style="padding:20px; text-align:center; font-family:Arial,sans-serif;"><h2>Navigation Error</h2><p>Could not load the page: ${url}</p><p><small>Details: ${error.message}</small></p></div>`;
           } catch (iframeError) {
               console.error("Could not write error to iframe:", iframeError);
           }
       }
       updateIEButtons();
       updateIEHistorySelect();
   }

   window.ieGoBack = function() {
       if (ieCanGoBack()) {
           state.ieHistoryIndex--;
           const url = state.ieHistory[state.ieHistoryIndex];
           document.getElementById('ie-url').value = url;
           document.getElementById('ie-iframe').src = url;
           updateIEButtons();
           updateIEHistorySelect();
       }
   }

   window.ieGoForward = function() {
       if (ieCanGoForward()) {
           state.ieHistoryIndex++;
           const url = state.ieHistory[state.ieHistoryIndex];
           document.getElementById('ie-url').value = url;
           document.getElementById('ie-iframe').src = url;
           updateIEButtons();
           updateIEHistorySelect();
       }
   }

   window.ieHistorySelect = function() {
       const select = document.getElementById('ie-history-select');
       const url = select.value;
       if (url) {
           // Find index of this URL in history to correctly set state.ieHistoryIndex
           const selectedIndex = state.ieHistory.findIndex(histUrl => histUrl === url);
           if (selectedIndex !== -1) {
               state.ieHistoryIndex = selectedIndex;
               document.getElementById('ie-url').value = url;
               document.getElementById('ie-iframe').src = url; // Directly navigate
               updateIEButtons();
               // updateIEHistorySelect(); // No need, select value is already correct
           }
       }
   }


  // Picture Folder - Open Picture Function
  window.openPicture = function(src, title) {
      const picWindowId = 'picture1-window'; // Use 'picture1-window' as the generic viewer
      const picWindow = document.getElementById(picWindowId);
      if (!picWindow) {
          console.error(`Picture viewer window ('${picWindowId}') not found.`);
          return;
      }

      const imgElement = picWindow.querySelector('.content img');
      const titleElement = picWindow.querySelector('.title-bar span');
      const titleIcon = picWindow.querySelector('.title-bar-icon');

      if (!imgElement || !titleElement || !titleIcon) {
          console.error(`Required elements missing in picture window ('${picWindowId}'). Check .content img, .title-bar span, .title-bar-icon`);
          return;
      }

      imgElement.src = src;
      imgElement.alt = title;
      titleElement.textContent = title; // Update window title with image name

      // Update icon based on a simple check, or use a generic one
      if (title.toLowerCase().match(/\.(jpe?g|gif)$/i)) {
          titleIcon.src = 'icons/All [Without duplicates]/Drawing red picture.ico';
      } else if (title.toLowerCase().match(/\.(png|bmp)$/i)) {
           titleIcon.src = 'icons/All [Without duplicates]/Drawing green picture.ico';
      } else {
          titleIcon.src = 'icons/All [Without duplicates]/Picture.ico'; // A generic picture icon
      }

      openWindow(picWindowId); // Open or bring to front the picture viewer
  }


   // --- File Upload & Gallery (Synology NAS Placeholder) ---
   const NAS_BASE_URL = 'http://YOUR_NAS_IP:5000/webapi'; // !!! REPLACE WITH YOUR NAS IP/DNS and Port !!!
   let synoAuthToken = null;

   async function loginToSynology() {
       const username = 'YOUR_NAS_USERNAME'; // Replace or get securely
       const password = 'YOUR_NAS_PASSWORD'; // Replace or get securely
       const sessionName = 'WeddingApp';

       if (username === 'YOUR_NAS_USERNAME' || password === 'YOUR_NAS_PASSWORD' || NAS_BASE_URL.includes('YOUR_NAS_IP')) {
           console.warn("Synology NAS credentials or IP not configured. Login skipped.");
           alert("Synology NAS feature requires configuration (username, password, IP). See script.js.");
           return false;
       }

       const loginUrl = `${NAS_BASE_URL}/auth.cgi?api=SYNO.API.Auth&version=7&method=login&account=${encodeURIComponent(username)}&passwd=${encodeURIComponent(password)}&session=${encodeURIComponent(sessionName)}&format=sid`;
       try {
           console.log("Attempting Synology login...");
           const response = await fetch(loginUrl);
           const data = await response.json();
           if (data.success && data.data.sid) {
               synoAuthToken = data.data.sid;
               console.log("Synology Login Successful. SID:", synoAuthToken);
               return true;
           } else {
               console.error("Synology Login Failed:", data.error?.code, data.error?.errors);
               alert(`Synology Login Failed: ${synoErrorCodes[data.error?.code] || 'Unknown error'}`);
               synoAuthToken = null;
               return false;
           }
       } catch (error) {
           console.error("Error during Synology Login fetch:", error);
           alert("Error connecting to Synology. Check NAS_BASE_URL, network, and CORS settings.");
           synoAuthToken = null;
           return false;
       }
   }

  window.uploadMedia = async function() {
      const input = document.getElementById('file-input');
      const statusDiv = document.getElementById('upload-status');
      if (!input || !statusDiv) return;
      statusDiv.textContent = 'Starting upload...';

      if (input.files.length === 0) {
          statusDiv.textContent = "Please select file(s) to upload.";
          alert("Wybierz plik(i) do przesłania.");
          return;
      }
      if (NAS_BASE_URL.includes('YOUR_NAS_IP')) {
           statusDiv.textContent = 'Upload Error: NAS IP address not configured in script.js.';
           alert('Upload functionality requires configuration. NAS IP address is missing in script.js.');
           return;
      }
       if (!synoAuthToken) {
           statusDiv.textContent = 'Attempting login to NAS...';
           const loggedIn = await loginToSynology();
           if (!loggedIn) {
               statusDiv.textContent = 'Upload Error: Could not log in to Synology NAS.';
               return;
           }
       }

      statusDiv.textContent = 'Preparing files...';
      const formData = new FormData();
      const uploadFolderPath = '/Public/WeddingUploads'; // Ensure this folder exists on NAS!
      formData.append('api', 'SYNO.FileStation.Upload');
      formData.append('version', '2');
      formData.append('method', 'upload');
      formData.append('path', uploadFolderPath);
      formData.append('create_parents', 'true');
      formData.append('overwrite', 'true'); // Or handle conflicts as needed
      formData.append('_sid', synoAuthToken);

      for (let i = 0; i < input.files.length; i++) {
          formData.append('file', input.files[i], input.files[i].name);
      }
      statusDiv.textContent = `Uploading ${input.files.length} file(s)...`;

      const uploadUrl = `${NAS_BASE_URL}/entry.cgi`;
      try {
          const response = await fetch(uploadUrl, { method: 'POST', body: formData });
          const data = await response.json();
          if (data.success) {
              statusDiv.textContent = `Successfully uploaded ${input.files.length} file(s) to ${uploadFolderPath}.`;
              alert('Upload successful!');
              input.value = ''; // Clear file input
              if (state.windows['gallery-window']?.isOpen) loadGallery(); // Refresh gallery
          } else {
               const errorCode = data.error?.code;
               const errorMsg = synoErrorCodes[errorCode] || `Unknown error (${errorCode})`;
               statusDiv.textContent = `Upload Error: ${errorMsg}`;
               if (errorCode === 119) { // Session timeout
                  synoAuthToken = null;
                  statusDiv.textContent += ' Session expired. Please try again.';
               }
          }
      } catch (error) {
          statusDiv.textContent = 'Upload Error: Network or connection issue. Check NAS and CORS.';
          console.error('Error during upload fetch:', error);
      }
  }

  window.loadGallery = async function() {
      const container = document.getElementById('gallery-container');
      if(!container) return;
      container.innerHTML = '<p>Loading gallery...</p>';

      if (NAS_BASE_URL.includes('YOUR_NAS_IP')) {
           container.innerHTML = '<p>Gallery Error: NAS IP address not configured in script.js.</p>';
           return;
      }
       if (!synoAuthToken) {
           container.innerHTML = '<p>Attempting login to NAS...</p>';
           const loggedIn = await loginToSynology();
           if (!loggedIn) {
               container.innerHTML = '<p>Gallery Error: Could not log in to Synology NAS.</p>';
               return;
           }
       }

      const galleryFolderPath = '/Public/WeddingUploads';
      const listUrl = `${NAS_BASE_URL}/entry.cgi?api=SYNO.FileStation.List&version=2&method=list&folder_path=${encodeURIComponent(galleryFolderPath)}&additional=["real_path","size","time","perm","type","thumb_size"]&filetype="image"&_sid=${synoAuthToken}`; // Added filetype="image" and thumb_size

      try {
          const response = await fetch(listUrl);
          const data = await response.json();

          if (data.success) {
              container.innerHTML = '';
              const files = data.data.files;
              if (files.length === 0) {
                  container.innerHTML = '<p>No media found in the gallery folder on NAS.</p>';
                  return;
              }
              files.forEach(file => {
                   if (file.name.startsWith('@')) return; // Skip Synology metadata

                   // This direct file URL might require specific NAS HTTP File Service setup or different auth.
                   // For a robust solution, a backend proxy is often better.
                   // This is a simplified example that *might* work with some NAS configurations.
                   const nasHttpPort = NAS_BASE_URL.split(':')[2] || '5000'; // Get port from NAS_BASE_URL or default
                   const nasIpOnly = NAS_BASE_URL.split('//')[1].split(':')[0];
                   const fileAccessBaseUrl = `http://${nasIpOnly}:${nasHttpPort}/file`;
                   const fileUrl = `${fileAccessBaseUrl}${encodeURIComponent(file.path)}?_sid=${synoAuthToken}`;
                   // Thumbnails are more complex with API, often need separate call or specific params.
                   // For simplicity, using full image scaled down.

                  const itemWrapper = document.createElement('div');
                  itemWrapper.className = 'gallery-item button-border-raised'; // Add some styling
                  itemWrapper.style.width = '100px';
                  itemWrapper.style.height = '120px';
                  itemWrapper.style.margin = '5px';
                  itemWrapper.style.padding = '5px';
                  itemWrapper.style.textAlign = 'center';
                  itemWrapper.style.overflow = 'hidden';
                  itemWrapper.style.cursor = 'pointer';

                  const mediaElement = document.createElement('img');
                  mediaElement.src = fileUrl; // Using direct URL
                  mediaElement.alt = file.name;
                  mediaElement.style.width = '90px';
                  mediaElement.style.height = '70px';
                  mediaElement.style.objectFit = 'cover';
                  mediaElement.title = `View ${file.name}`;
                  mediaElement.onclick = () => openPicture(fileUrl, file.name); // Use existing picture viewer

                  const nameDiv = document.createElement('div');
                  nameDiv.textContent = file.name.length > 15 ? file.name.substring(0,12) + "..." : file.name;
                  nameDiv.style.fontSize = '10px';
                  nameDiv.style.marginTop = '5px';

                  itemWrapper.appendChild(mediaElement);
                  itemWrapper.appendChild(nameDiv);
                  container.appendChild(itemWrapper);
              });
          } else {
               const errorCode = data.error?.code;
               const errorMsg = synoErrorCodes[errorCode] || `Unknown error (${errorCode})`;
               container.innerHTML = `<p>Gallery Error: ${errorMsg}</p>`;
               if (errorCode === 119) { // Session timeout
                   synoAuthToken = null;
                   container.innerHTML += '<p>Session may have expired. Please try refreshing.</p>';
               } else if (errorCode === 408) {
                    container.innerHTML += `<p>Ensure folder '${galleryFolderPath}' exists on NAS.</p>`;
               }
          }
      } catch (error) {
          container.innerHTML = '<p>Gallery Error: Network or connection issue. Check NAS and CORS.</p>';
          console.error('Error during gallery fetch:', error);
      }
  }

   const synoErrorCodes = {
       100: "Unknown error", 101: "Invalid parameter", 102: "API not found",
       103: "Method not found", 104: "Version not supported", 105: "Permission denied",
       106: "Session timeout", 107: "Session interrupted by duplicated login", 119: "Session ID not found or login expired",
       400: "Invalid parameter of file operation", 401: "Unknown error of file operation",
       402: "System is too busy", 403: "Invalid user or group for file operation",
       404: "Invalid group", 406: "Cannot list user/group", 407: "Cannot list group",
       408: "File or folder does not exist", 409: "Cannot create folder", 410: "Folder already exists",
       // Add more File Station specific codes as needed
   };

}); // End DOMContentLoaded

