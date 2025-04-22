document.addEventListener('DOMContentLoaded', () => {
  // --- Global State ---
  const state = {
      windows: {}, // Track open window elements and their state
      taskbarButtons: {}, // Track taskbar buttons
      nextZIndex: 100, // Initial z-index for windows
      activeWindowId: null, // ID of the currently focused window
      isMobile: window.innerWidth <= 768, // Check for mobile view
      iconGridSize: 80, // Must match CSS --icon-grid-size
      recycleBinItems: [ // Initial items in the bin
          { id: 'rb1', name: 'homework.doc', icon: 'icons/All [Without duplicates]/Document.ico' },
          { id: 'rb2', name: 'embarrassing_photo.jpg', icon: 'icons/All [Without duplicates]/Drawing red picture.ico' },
          { id: 'rb3', name: 'Old Projects', icon: 'icons/All [Without duplicates]/Folder.ico' },
          { id: 'rb4', name: 'manual_that_i_read.pdf', icon: 'icons/All [Without duplicates]/Help page.ico' },
      ],
      ieHistory: [], // Array to store IE history URLs
      ieHistoryIndex: -1, // Current position in IE history
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
  initWindowControls();
  initStartMenu();
  initContextMenu();
  initEmail();
  updateRecycleBinIcon();
  updateRecycleBinWindow(); // Populate window initially

  // Re-check mobile state on resize (optional, can be performance intensive)
  // window.addEventListener('resize', () => {
  //     const wasMobile = state.isMobile;
  //     state.isMobile = window.innerWidth <= 768;
  //     if (wasMobile !== state.isMobile) {
  //         // Could potentially re-initialize or adjust layouts if needed
  //         console.log("Mobile state changed:", state.isMobile);
  //         // Reset icon positions if switching back to desktop?
  //     }
  // });

  // --- Core Functions ---

  function openWindow(windowId) {
      const win = document.getElementById(windowId);
      if (!win) {
          console.error(`Window with ID ${windowId} not found.`);
          return;
      }

      const wasOpen = state.windows[windowId]?.isOpen;

      win.style.display = 'flex'; // Use flex for window layout
      bringToFront(windowId);

      if (!wasOpen) {
          state.windows[windowId] = {
              element: win,
              isMinimized: false,
              isMaximized: false,
              isOpen: true,
              originalRect: null, // Store original position/size for maximize toggle
          };
          createTaskbarButton(windowId);
          if (state.isMobile) {
               // On mobile, ensure it takes full screen without relying on maximize state
               win.style.left = '0px';
               win.style.top = '0px';
               win.style.width = '100vw';
               win.style.height = '100vh';
          } else {
              // Set initial position slightly offset if not mobile
              if (!win.style.left || !win.style.top) {
                  const offset = Object.keys(state.windows).length * 10;
                  win.style.left = `${50 + offset}px`;
                  win.style.top = `${50 + offset}px`;
              }
          }
      } else {
          state.windows[windowId].isMinimized = false;
          state.windows[windowId].isOpen = true;
          updateTaskbarButton(windowId);
      }

      // Special actions for specific windows
      if (windowId === 'email-window') {
          switchFolder('inbox', document.getElementById('folder-inbox')); // Switch to inbox and highlight
      }
      if (windowId === 'recycle-window') {
          updateRecycleBinWindow();
      }
      if (windowId === 'gallery-window') {
          loadGallery(); // Attempt to load gallery on open
      }

      closeStartMenu(); // Close start menu when opening a window
  }

  function closeWindow(windowId) {
      const winData = state.windows[windowId];
      if (winData?.element) {
          winData.element.style.display = 'none';
          winData.isOpen = false;
          winData.isMinimized = false; // Reset flags
          winData.isMaximized = false;
          removeTaskbarButton(windowId);
          delete state.windows[windowId]; // Remove from tracking
          if (state.activeWindowId === windowId) {
              state.activeWindowId = null;
              // Optionally, activate the next highest window
          }
      }
      updateRecycleBinIcon(); // Update bin icon if files were 'deleted'
  }

  function minimizeWindow(windowId) {
      const winData = state.windows[windowId];
      if (winData?.element && winData.isOpen && !winData.isMinimized) {
          winData.element.style.display = 'none';
          winData.isMinimized = true;
          updateTaskbarButton(windowId);
          if (state.activeWindowId === windowId) {
              state.activeWindowId = null;
              // Deactivate visual state
              winData.element.classList.remove('active');
              // Optionally activate next window
          }
      }
  }

  function restoreWindow(windowId) { // Called from taskbar button
      const winData = state.windows[windowId];
      if (winData?.element && winData.isOpen && winData.isMinimized) {
          winData.element.style.display = 'flex';
          winData.isMinimized = false;
          bringToFront(windowId);
          updateTaskbarButton(windowId);
      } else if (winData?.element && winData.isOpen) {
           // If window is open but not minimized, bring to front
           bringToFront(windowId);
      } else if (winData?.element && !winData.isOpen) {
          // If window was closed, reopen it
          openWindow(windowId);
      }
  }

   function maximizeWindow(windowId) {
      if (state.isMobile) return; // No maximize on mobile

      const winData = state.windows[windowId];
      if (!winData || !winData.element || !winData.isOpen || winData.isMinimized) return;

      const win = winData.element;

      if (!winData.isMaximized) {
          // Store original position and size before maximizing
          winData.originalRect = {
              left: win.style.left,
              top: win.style.top,
              width: win.style.width,
              height: win.style.height,
          };
          // Apply maximized styles (use class for better control)
          win.classList.add('maximized');
          // JS overrides for safety
          win.style.left = '0px';
          win.style.top = '0px';
          win.style.width = '100vw';
          win.style.height = `calc(100vh - ${taskbar.offsetHeight}px)`;
          winData.isMaximized = true;
      } else {
          // Restore original position and size
          win.classList.remove('maximized');
           if (winData.originalRect) {
              win.style.left = winData.originalRect.left;
              win.style.top = winData.originalRect.top;
              win.style.width = winData.originalRect.width;
              win.style.height = winData.originalRect.height;
          } else {
               // Fallback if originalRect wasn't stored
               win.style.width = '500px';
               win.style.height = '400px';
               win.style.left = '100px';
               win.style.top = '100px';
          }
          winData.isMaximized = false;
      }
      // Disable/enable resizing when maximized/restored
      toggleResizers(win, !winData.isMaximized);
  }

   function toggleResizers(windowEl, enable) {
      if (state.isMobile) { // Never enable resizers on mobile
           enable = false;
      }
       const resizers = windowEl.querySelectorAll('.resizer');
       resizers.forEach(r => r.style.display = enable ? 'block' : 'none');
   }


  function bringToFront(windowId) {
      const winData = state.windows[windowId];
      if (!winData || !winData.element) return;

      // Deactivate previously active window
      if (state.activeWindowId && state.activeWindowId !== windowId) {
          const oldActiveWinData = state.windows[state.activeWindowId];
          if (oldActiveWinData?.element) {
              oldActiveWinData.element.classList.remove('active');
              updateTaskbarButton(state.activeWindowId); // Update taskbar style
          }
      }

      // Activate the new window
      state.nextZIndex += 1;
      winData.element.style.zIndex = state.nextZIndex;
      winData.element.classList.add('active');
      state.activeWindowId = windowId;
      updateTaskbarButton(windowId); // Update its taskbar button style

       // Ensure resizers are correctly enabled/disabled based on maximized state
       toggleResizers(winData.element, !winData.isMaximized);
  }

  // --- Taskbar Management ---

  function createTaskbarButton(windowId) {
      if (state.taskbarButtons[windowId] || state.isMobile) return; // Don't create if exists or on mobile

      const win = document.getElementById(windowId);
      const title = win.querySelector('.title-bar span')?.textContent || 'Window';
      const iconSrc = win.querySelector('.title-bar-icon')?.src || 'icons/default.ico'; // Get icon from title bar

      const btn = document.createElement('button');
      btn.className = 'window-button button-border-raised';
      btn.dataset.windowId = windowId;

      const img = document.createElement('img');
      img.src = iconSrc;
      img.alt = ''; // Decorative
      btn.appendChild(img);

      const span = document.createElement('span');
      span.textContent = title;
      btn.appendChild(span);


      btn.onclick = () => {
          const winData = state.windows[windowId];
          if (!winData) return;

          if (winData.isMinimized) {
              restoreWindow(windowId);
          } else if (state.activeWindowId === windowId) {
              minimizeWindow(windowId); // Minimize if already active
          } else {
              bringToFront(windowId); // Bring to front if inactive
          }
      };

      windowButtonsContainer.appendChild(btn);
      state.taskbarButtons[windowId] = btn;
      updateTaskbarButton(windowId); // Set initial style
  }

  function removeTaskbarButton(windowId) {
       if (state.isMobile) return; // No taskbar buttons on mobile to remove

      const btn = state.taskbarButtons[windowId];
      if (btn) {
          btn.remove();
          delete state.taskbarButtons[windowId];
      }
  }

  function updateTaskbarButton(windowId) {
      if (state.isMobile) return; // No taskbar buttons on mobile

      const btn = state.taskbarButtons[windowId];
      const winData = state.windows[windowId];
      if (!btn || !winData) return;

      btn.classList.remove('active', 'minimized');
      btn.classList.remove('button-border-lowered');
      btn.classList.add('button-border-raised');


      if (winData.isOpen) {
           if (winData.isMinimized) {
               btn.classList.add('minimized'); // Maybe add visual distinction later
           } else if (state.activeWindowId === windowId) {
               btn.classList.add('active');
               // Apply "pressed" style
               btn.classList.remove('button-border-raised');
               btn.classList.add('button-border-lowered');
           }
      }
  }

  // --- Desktop Icons ---

  function initDesktopIcons() {
       // Wrap icons in a container for mobile layout
       if (state.isMobile) {
           const iconContainer = document.createElement('div');
           iconContainer.className = 'icon-container';
           icons.forEach(icon => iconContainer.appendChild(icon.parentNode.removeChild(icon)));
           desktop.appendChild(iconContainer); // Add container to desktop
       }

      icons.forEach(icon => {
          // 1. Double Click/Tap to Open Window
          icon.addEventListener('dblclick', () => {
              const windowId = icon.dataset.windowId;
              if (windowId) openWindow(windowId);
          });
           // Add touch equivalent for mobile (single tap opens)
           icon.addEventListener('touchend', (e) => {
              // Basic check to prevent firing after scrolling
              if (icon.dataset.dragging !== 'true') {
                  const windowId = icon.dataset.windowId;
                  if (windowId && state.isMobile) {
                      e.preventDefault(); // Prevent potential double actions
                      openWindow(windowId);
                  }
               }
               icon.dataset.dragging = 'false'; // Reset flag
           });


          // 2. Single Click/Tap Selection
           icon.addEventListener('click', (e) => {
               if (!state.isMobile) { // Only allow selection on desktop
                   selectIcon(icon);
                   e.stopPropagation(); // Prevent desktop click from deselecting immediately
               }
           });
            icon.addEventListener('touchstart', (e) => {
               if (!state.isMobile) {
                    // Potentially start drag logic here for touch desktop
               } else {
                   // Could add a 'pressed' visual style on touchstart for mobile
               }
           });

          // 3. Drag and Drop (Desktop Only)
          if (!state.isMobile) {
              makeIconDraggable(icon);
          } else {
               // Prevent default drag behavior on mobile which can interfere with scrolling
               icon.addEventListener('dragstart', (e) => e.preventDefault());
          }

          // 4. Set initial position based on grid (redundant if CSS handles it, but good fallback)
          // const gridX = parseInt(icon.style.left || '0') / state.iconGridSize;
          // const gridY = parseInt(icon.style.top || '0') / state.iconGridSize;
          // icon.style.left = `${gridX * state.iconGridSize}px`;
          // icon.style.top = `${gridY * state.iconGridSize}px`;
      });

       // Click on desktop to deselect icons
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
      let hasMoved = false; // Flag to distinguish click from drag

      icon.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return; // Only left click

          isDragging = true;
          hasMoved = false;
          // Select the icon on mousedown
          selectIcon(icon);

          const rect = icon.getBoundingClientRect();
          const desktopRect = desktop.getBoundingClientRect();
          offsetX = e.clientX - rect.left;
          offsetY = e.clientY - rect.top;
          startX = e.clientX;
          startY = e.clientY;

          icon.style.zIndex = state.nextZIndex++; // Bring icon visually to front while dragging
          icon.style.cursor = 'grabbing';
          desktop.style.cursor = 'grabbing'; // Change desktop cursor too

          // Prevent text selection during drag
          e.preventDefault();
      });

      const dragMove = (e) => {
          if (!isDragging) return;

          const currentX = e.clientX;
          const currentY = e.clientY;

          // Check if the mouse has moved significantly to consider it a drag
          if (!hasMoved && (Math.abs(currentX - startX) > 5 || Math.abs(currentY - startY) > 5)) {
              hasMoved = true;
               icon.dataset.dragging = 'true'; // Set flag for touchend check
          }

          if (hasMoved) {
               const desktopRect = desktop.getBoundingClientRect();
               let newLeft = currentX - offsetX - desktopRect.left;
               let newTop = currentY - offsetY - desktopRect.top;

               // Keep icon within desktop bounds (optional)
               // newLeft = Math.max(0, Math.min(newLeft, desktopRect.width - icon.offsetWidth));
               // newTop = Math.max(0, Math.min(newTop, desktopRect.height - icon.offsetHeight - taskbar.offsetHeight));

               icon.style.left = `${newLeft}px`;
               icon.style.top = `${newTop}px`;
          }
      };

      const dragEnd = (e) => {
          if (!isDragging) return;

          isDragging = false;
          icon.style.zIndex = 10; // Reset z-index
          icon.style.cursor = 'pointer';
          desktop.style.cursor = 'default';
          icon.dataset.dragging = 'false';

          if (hasMoved) {
              // Snap to grid
              let left = parseFloat(icon.style.left);
              let top = parseFloat(icon.style.top);

              // Ensure snapping happens within bounds
              const desktopRect = desktop.getBoundingClientRect();
              const maxLeft = desktopRect.width - icon.offsetWidth;
              const maxTop = desktopRect.height - icon.offsetHeight - taskbar.offsetHeight;

              left = Math.max(0, Math.min(left, maxLeft));
              top = Math.max(0, Math.min(top, maxTop));


              // Calculate grid position (adjusting for potential icon container offset if any)
              const snappedLeft = Math.round(left / state.iconGridSize) * state.iconGridSize;
              const snappedTop = Math.round(top / state.iconGridSize) * state.iconGridSize;

              icon.style.left = `${snappedLeft}px`;
              icon.style.top = `${snappedTop}px`;
          }
          // If it wasn't a drag (no significant movement), the click event will handle selection.
      };

      document.addEventListener('mousemove', dragMove);
      document.addEventListener('mouseup', dragEnd);

       // Basic Touch Dragging (can be complex to get right with scrolling)
       icon.addEventListener('touchstart', (e) => {
           if (state.isMobile) return; // Don't drag on mobile
           isDragging = true;
           hasMoved = false;
           selectIcon(icon);

           const touch = e.touches[0];
           const rect = icon.getBoundingClientRect();
           offsetX = touch.clientX - rect.left;
           offsetY = touch.clientY - rect.top;
           startX = touch.clientX;
           startY = touch.clientY;

           icon.style.zIndex = state.nextZIndex++;
           // e.preventDefault(); // Careful with preventDefault on touchstart, can block scroll
       }, { passive: true }); // Use passive listener if not preventing default

       icon.addEventListener('touchmove', (e) => {
           if (!isDragging || state.isMobile) return;
           // e.preventDefault(); // Prevent scroll while dragging icon

           const touch = e.touches[0];
           const currentX = touch.clientX;
           const currentY = touch.clientY;

           if (!hasMoved && (Math.abs(currentX - startX) > 10 || Math.abs(currentY - startY) > 10)) {
              hasMoved = true;
              icon.dataset.dragging = 'true'; // Set flag for touchend check
           }

           if (hasMoved) {
               const desktopRect = desktop.getBoundingClientRect();
               let newLeft = currentX - offsetX - desktopRect.left;
               let newTop = currentY - offsetY - desktopRect.top;
               icon.style.left = `${newLeft}px`;
               icon.style.top = `${newTop}px`;
           }
       }, { passive: false }); // Need passive: false if preventing default

       icon.addEventListener('touchend', (e) => {
           if (!isDragging || state.isMobile) return;
           isDragging = false;
           icon.style.zIndex = 10;
           icon.dataset.dragging = 'false'; // Reset flag IMPORTANTLY here

           if (hasMoved) {
               // Snap to grid logic (same as mouseup)
               let left = parseFloat(icon.style.left);
               let top = parseFloat(icon.style.top);
               const desktopRect = desktop.getBoundingClientRect();
               const maxLeft = desktopRect.width - icon.offsetWidth;
               const maxTop = desktopRect.height - icon.offsetHeight - taskbar.offsetHeight;
               left = Math.max(0, Math.min(left, maxLeft));
               top = Math.max(0, Math.min(top, maxTop));
               const snappedLeft = Math.round(left / state.iconGridSize) * state.iconGridSize;
               const snappedTop = Math.round(top / state.iconGridSize) * state.iconGridSize;
               icon.style.left = `${snappedLeft}px`;
               icon.style.top = `${snappedTop}px`;
               // Prevent the tap-to-open action after a drag
               // e.preventDefault(); // Already handled by dataset.dragging check in touchend listener
           }
       });
  }


  // --- Window Dragging and Resizing (Desktop Only) ---

  function makeWindowDraggable(windowEl) {
      if (state.isMobile) return; // No dragging on mobile

      const titleBar = windowEl.querySelector('.title-bar');
      if (!titleBar) return;

      let offsetX, offsetY, isDragging = false;

      const startDrag = (e) => {
          // Check if the click is on a control button
          if (e.target.closest('.window-controls button')) {
              return;
          }
           // Don't drag maximized windows
           if (state.windows[windowEl.id]?.isMaximized) {
               return;
           }

          isDragging = true;
          const touch = e.touches ? e.touches[0] : e;
          const rect = windowEl.getBoundingClientRect();
          offsetX = touch.clientX - rect.left;
          offsetY = touch.clientY - rect.top;

          // Bring window to front on drag start
          bringToFront(windowEl.id);

          titleBar.style.cursor = 'grabbing';
          desktop.style.cursor = 'grabbing';
          e.preventDefault(); // Prevent text selection
      };

      const doDrag = (e) => {
          if (!isDragging) return;
          const touch = e.touches ? e.touches[0] : e;
          const desktopRect = desktop.getBoundingClientRect();

          let newLeft = touch.clientX - offsetX;
          let newTop = touch.clientY - offsetY;

          // Basic boundary checks (keep title bar visible)
           const taskbarHeight = taskbar.offsetHeight;
           newLeft = Math.max(-windowEl.offsetWidth + 50, Math.min(newLeft, desktopRect.width - 50)); // Allow slight offscreen left/right
           newTop = Math.max(0, Math.min(newTop, desktopRect.height - taskbarHeight - titleBar.offsetHeight)); // Keep top visible


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

      // Touch Events
      titleBar.addEventListener('touchstart', startDrag, { passive: false });
      document.addEventListener('touchmove', doDrag, { passive: false });
      document.addEventListener('touchend', stopDrag);
  }

  function makeWindowResizable(windowEl) {
      if (state.isMobile) return; // No resizing on mobile

      const resizers = windowEl.querySelectorAll('.resizer');
      let isResizing = false;
      let currentResizer = null;
      let startX, startY, startWidth, startHeight, startLeft, startTop;

      resizers.forEach(resizer => {
          resizer.addEventListener('mousedown', (e) => {
              // Don't resize maximized windows
               if (state.windows[windowEl.id]?.isMaximized) {
                   return;
               }

              isResizing = true;
              currentResizer = resizer;
              const rect = windowEl.getBoundingClientRect();
              startX = e.clientX;
              startY = e.clientY;
              startWidth = rect.width;
              startHeight = rect.height;
              startLeft = rect.left;
              startTop = rect.top;

              windowEl.style.userSelect = 'none'; // Prevent text selection during resize
              document.body.style.cursor = getComputedStyle(resizer).cursor; // Set body cursor

              e.preventDefault();
              e.stopPropagation(); // Prevent title bar drag
          });
           // Add touchstart for resizing
           resizer.addEventListener('touchstart', (e) => {
               if (state.windows[windowEl.id]?.isMaximized) return;
               isResizing = true;
               currentResizer = resizer;
               const touch = e.touches[0];
               const rect = windowEl.getBoundingClientRect();
               startX = touch.clientX;
               startY = touch.clientY;
               startWidth = rect.width;
               startHeight = rect.height;
               startLeft = rect.left;
               startTop = rect.top;
               document.body.style.cursor = getComputedStyle(resizer).cursor;
               e.preventDefault();
               e.stopPropagation();
           }, { passive: false });
      });

      const doResize = (e) => {
          if (!isResizing) return;

          const touch = e.touches ? e.touches[0] : e;
          const dx = touch.clientX - startX;
          const dy = touch.clientY - startY;

          let newWidth = startWidth;
          let newHeight = startHeight;
          let newLeft = startLeft;
          let newTop = startTop;

          const minWidth = parseInt(windowEl.style.minWidth) || 150;
          const minHeight = parseInt(windowEl.style.minHeight) || 100;

          if (currentResizer.classList.contains('resizer-e') || currentResizer.classList.contains('resizer-ne') || currentResizer.classList.contains('resizer-se')) {
              newWidth = Math.max(minWidth, startWidth + dx);
          }
          if (currentResizer.classList.contains('resizer-s') || currentResizer.classList.contains('resizer-se') || currentResizer.classList.contains('resizer-sw')) {
              newHeight = Math.max(minHeight, startHeight + dy);
          }
          if (currentResizer.classList.contains('resizer-w') || currentResizer.classList.contains('resizer-nw') || currentResizer.classList.contains('resizer-sw')) {
              newWidth = Math.max(minWidth, startWidth - dx);
              newLeft = startLeft + dx;
               // Adjust left only if width changed significantly to prevent jumping
               if (newWidth > minWidth) {
                   newLeft = startLeft + (startWidth - newWidth);
               } else {
                   newLeft = startLeft + (startWidth - minWidth); // Clamp left adjustment
               }

          }
          if (currentResizer.classList.contains('resizer-n') || currentResizer.classList.contains('resizer-ne') || currentResizer.classList.contains('resizer-nw')) {
              newHeight = Math.max(minHeight, startHeight - dy);
               if (newHeight > minHeight) {
                   newTop = startTop + (startHeight - newHeight);
               } else {
                   newTop = startTop + (startHeight - minHeight); // Clamp top adjustment
               }
          }

           // Apply changes
          if (newWidth !== startWidth || currentResizer.classList.contains('resizer-w') || currentResizer.classList.contains('resizer-nw') || currentResizer.classList.contains('resizer-sw')) {
              windowEl.style.width = `${newWidth}px`;
              windowEl.style.left = `${newLeft}px`;
          }
          if (newHeight !== startHeight || currentResizer.classList.contains('resizer-n') || currentResizer.classList.contains('resizer-ne') || currentResizer.classList.contains('resizer-nw')) {
              windowEl.style.height = `${newHeight}px`;
              windowEl.style.top = `${newTop}px`;
          }

      };

      const stopResize = () => {
          if (isResizing) {
              isResizing = false;
              windowEl.style.userSelect = ''; // Re-enable text selection
              document.body.style.cursor = 'default'; // Reset body cursor
          }
      };

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

           const windowId = button.dataset.windowId;
           if (!windowId) return;


          if (button.classList.contains('close-button')) {
              closeWindow(windowId);
          } else if (button.classList.contains('minimize-button')) {
              minimizeWindow(windowId);
          } else if (button.classList.contains('maximize-button')) {
              maximizeWindow(windowId);
          }
      });

       // Add event listener to bring window to front on any mousedown inside it
       desktop.addEventListener('mousedown', (e) => {
          const windowEl = e.target.closest('.window');
          if (windowEl && state.activeWindowId !== windowEl.id && state.windows[windowEl.id]?.isOpen) {
              bringToFront(windowEl.id);
          }
       }, true); // Use capture phase to ensure it runs before drag starts
  }

  // --- Start Menu ---
  function initStartMenu() {
      startButton.addEventListener('click', (e) => {
          toggleStartMenu();
          e.stopPropagation(); // Prevent desktop click listener from closing immediately
      });

      // Close menu if clicking outside
      document.addEventListener('click', (e) => {
          if (!startMenu.contains(e.target) && e.target !== startButton && startMenu.classList.contains('active')) {
              closeStartMenu();
          }
      });
      // Prevent clicks inside the menu from closing it via the document listener
       startMenu.addEventListener('click', (e) => {
           e.stopPropagation();
           // If a direct link (not submenu trigger) is clicked, close the menu
           if (e.target.closest('a') && !e.target.closest('li.has-submenu')) {
              closeStartMenu();
           }
       });
  }

  function toggleStartMenu() {
      const isActive = startMenu.classList.toggle('active');
      startButton.classList.toggle('active', isActive); // Toggle button pressed state
      startButton.classList.toggle('button-border-lowered', isActive);
      startButton.classList.toggle('button-border-raised', !isActive);
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
          const hours = now.getHours();
          const minutes = now.getMinutes().toString().padStart(2, '0');
          // const ampm = hours >= 12 ? 'PM' : 'AM';
          // const displayHours = ((hours + 11) % 12 + 1); // Convert 24h to 12h
          // clockElement.textContent = `${displayHours}:${minutes} ${ampm}`;
          clockElement.textContent = `${hours}:${minutes}`; // 24h format
      };
      updateClock();
      setInterval(updateClock, 1000); // Update every second
  }

  // --- Context Menu (Right Click) ---
  function initContextMenu() {
      desktop.addEventListener('contextmenu', (e) => {
          if (state.isMobile) return; // No context menu on mobile

          e.preventDefault();
          hideContextMenu(); // Hide any previous menu
          closeStartMenu(); // Close start menu as well

          const target = e.target;
          let menuItems = [];

          // Determine menu items based on the target
          const iconTarget = target.closest('.icon');
          const windowTarget = target.closest('.window'); // Less common to right-click window itself

          if (iconTarget) {
              // Right-clicked on an icon
               selectIcon(iconTarget); // Select the icon
              const windowId = iconTarget.dataset.windowId;
              menuItems.push({ label: 'Open', action: () => { if (windowId) openWindow(windowId); } });
              menuItems.push({ type: 'separator' });
              if (iconTarget.id === 'recycle-icon') {
                  menuItems.push({ label: 'Empty Recycle Bin', action: emptyRecycleBin, disabled: state.recycleBinItems.length === 0 });
              } else {
                   menuItems.push({ label: 'Cut', disabled: true });
                   menuItems.push({ label: 'Copy', disabled: true });
              }
               menuItems.push({ type: 'separator' });
               menuItems.push({ label: 'Delete', action: () => deleteIcon(iconTarget), disabled: iconTarget.id === 'recycle-icon' || iconTarget.id === 'mycomputer-icon' }); // Example delete action
               menuItems.push({ label: 'Properties', action: () => alert(`Properties for ${iconTarget.querySelector('div').textContent}`), disabled: true });
          } else if (windowTarget) {
               // Right-clicked inside a window (maybe on title bar or content?)
               // Could add window-specific options here, but less common for Win95
               menuItems.push({ label: 'Restore', action: () => maximizeWindow(windowTarget.id), disabled: !state.windows[windowTarget.id]?.isMaximized });
               menuItems.push({ label: 'Move', disabled: true });
               menuItems.push({ label: 'Size', disabled: true });
               menuItems.push({ label: 'Minimize', action: () => minimizeWindow(windowTarget.id), disabled: state.windows[windowTarget.id]?.isMinimized });
               menuItems.push({ label: 'Maximize', action: () => maximizeWindow(windowTarget.id), disabled: state.windows[windowTarget.id]?.isMaximized });
               menuItems.push({ type: 'separator' });
               menuItems.push({ label: 'Close', action: () => closeWindow(windowTarget.id) });
          }
          else {
              // Right-clicked on the desktop background
               menuItems.push({ label: 'Arrange Icons', disabled: true });
               menuItems.push({ label: 'Line up Icons', disabled: true });
               menuItems.push({ type: 'separator' });
               menuItems.push({ label: 'Paste', disabled: true });
               menuItems.push({ label: 'Paste Shortcut', disabled: true });
               menuItems.push({ type: 'separator' });
               menuItems.push({ label: 'New', disabled: true }); // Could add sub-menu later
               menuItems.push({ type: 'separator' });
               menuItems.push({ label: 'Properties', action: () => alert('Display Properties not available.'), disabled: true });
          }


          showContextMenu(e.clientX, e.clientY, menuItems);
      });

      // Hide context menu on regular click
      document.addEventListener('click', hideContextMenu);
       contextMenu.addEventListener('click', (e) => e.stopPropagation()); // Prevent clicks inside from closing it
  }

  function showContextMenu(x, y, items) {
      contextMenu.innerHTML = ''; // Clear previous items
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
                      item.action();
                      hideContextMenu();
                  };
              }
          }
          contextMenu.appendChild(div);
      });

      // Position the menu, ensuring it stays within viewport
      const menuWidth = contextMenu.offsetWidth;
      const menuHeight = contextMenu.offsetHeight;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (x + menuWidth > viewportWidth) {
          x = viewportWidth - menuWidth - 5; // Adjust left
      }
      if (y + menuHeight > viewportHeight) {
          y = viewportHeight - menuHeight - 5; // Adjust top
      }

      contextMenu.style.left = `${x}px`;
      contextMenu.style.top = `${y}px`;
  }

  function hideContextMenu() {
      contextMenu.style.display = 'none';
  }

   // --- Specific App Logic ---

   // Email Client
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
   let currentEmailFolder = 'inbox'; // Track the current folder
   let selectedEmailId = null;

   function initEmail() {
       // Initial population
       switchFolder('inbox', document.getElementById('folder-inbox')); // Select inbox by default
   }

   function switchFolder(folderName, clickedElement) {
       currentEmailFolder = folderName;
       const list = document.getElementById('email-list');
       const content = document.getElementById('email-content');
       list.innerHTML = ''; // Clear list
       content.innerHTML = '<p style="padding: 20px; text-align: center;">Select an email to view.</p>'; // Reset content view
       selectedEmailId = null; // Reset selection

       // Update folder highlighting
       document.querySelectorAll('.email-nav .folder').forEach(f => f.classList.remove('active'));
       if (clickedElement) {
           clickedElement.classList.add('active');
       } else { // Fallback if called without element
           document.getElementById(`folder-${folderName}`)?.classList.add('active');
       }

       const emails = emailData[folderName] || [];
       if (emails.length === 0) {
          list.innerHTML = '<p style="padding: 10px; color: grey; font-style: italic;">This folder is empty.</p>';
       } else {
          emails.forEach(email => {
              const item = document.createElement('div');
              item.className = 'email-item';
              item.dataset.emailId = email.id;
               item.style.fontWeight = email.read ? 'normal' : 'bold'; // Mark unread as bold
              item.textContent = `${email.subject} (From: ${email.from || email.to || 'Unknown'})`; // Show sender/recipient
              item.onclick = () => {
                  displayEmailContent(email);
                   // Mark as read
                   if (!email.read) {
                       email.read = true;
                       item.style.fontWeight = 'normal';
                   }
                   // Highlight selected item
                   document.querySelectorAll('.email-list .email-item').forEach(i => i.classList.remove('selected'));
                   item.classList.add('selected');
              };
              list.appendChild(item);
          });
       }
   }

   function displayEmailContent(email) {
       selectedEmailId = email.id;
       const content = document.getElementById('email-content');
       content.innerHTML = `
          <p><strong>Subject:</strong> ${email.subject}</p>
          <p><strong>From:</strong> ${email.from || 'N/A'}</p>
          <p><strong>To:</strong> ${email.to || 'N/A'}</p>
          <hr>
          <p>${email.content.replace(/\n/g, '<br>')}</p> <!-- Replace newlines with <br> -->
       `;

       // Add confirmation buttons specifically for the invitation email
       if (email.id === 1) {
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

  // Mailto function (kept global for button access)
  window.sendEmail = function(confirm) {
      const recipient = "maxgrom97@gmail.com"; // Replace with actual recipient
      const subject = encodeURIComponent("[Slub separowo] Potwierdzenie obecnosci");
      const body = confirm
          ? encodeURIComponent("Potwierdzam moją obecność na ślubie i weselu 3 sierpnia 2025.\n\nDziękuję i pozdrawiam,\n\n[Twoje Imię i Nazwisko]")
          : encodeURIComponent("Z przykrością informuję, że nie będę mógł/mogła uczestniczyć w uroczystości 3 sierpnia 2025.\n\nDziękuję za zaproszenie i życzę wspaniałego dnia!\n\nPozdrawiam,\n\n[Twoje Imię i Nazwisko]");
      window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
      alert('Opening your email client to send the confirmation...');
  }
   // Function for the "Send" button in the email client menu
   window.sendEmailMessage = function() {
       alert("Simulated Send: There are no emails in the Outbox to send.");
   }


  // Recycle Bin
  function updateRecycleBinIcon() {
      const iconImg = document.getElementById('recycle-bin-image');
      if (!iconImg) return;
      if (state.recycleBinItems.length > 0) {
          iconImg.src = 'icons/All [Without duplicates]/Recycle Bin with torned document and program.ico'; // Full icon
      } else {
          iconImg.src = 'icons/All [Without duplicates]/Recycle Bin (empty).ico'; // Empty icon
      }
  }

   function updateRecycleBinWindow() {
       const list = document.getElementById('recycle-bin-list');
       if (!list) return;
       list.innerHTML = ''; // Clear existing items

       if (state.recycleBinItems.length === 0) {
           list.innerHTML = '<p style="color: grey; font-style: italic;">The Recycle Bin is empty.</p>';
       } else {
           state.recycleBinItems.forEach(item => {
               const li = document.createElement('li');
               li.innerHTML = `<img src="${item.icon}" alt="icon"> ${item.name}`;
               list.appendChild(li);
           });
       }
       // Update context menu disable state
       // (Could be done here or when context menu is generated)
   }


  window.emptyRecycleBin = function() {
      if (state.recycleBinItems.length > 0) {
          if (confirm(`Are you sure you want to permanently delete these ${state.recycleBinItems.length} items?`)) {
              state.recycleBinItems = [];
              updateRecycleBinIcon();
              updateRecycleBinWindow(); // Update window content if open
              alert('Recycle Bin emptied.');
          }
      } else {
          alert('Recycle Bin is already empty.');
      }
       hideContextMenu(); // Hide context menu after action
  }

   window.deleteIcon = function(iconElement) {
       // Basic simulation: Move item to recycle bin
       // In a real OS, this would involve file system operations
       const itemName = iconElement.querySelector('div').textContent;
       const itemIcon = iconElement.querySelector('img').src;
       const itemId = iconElement.id + '_deleted'; // Create a unique ID

       if (confirm(`Are you sure you want to send "${itemName}" to the Recycle Bin?`)) {
           state.recycleBinItems.push({ id: itemId, name: itemName, icon: itemIcon });
           iconElement.style.display = 'none'; // Hide the icon
           updateRecycleBinIcon();
           updateRecycleBinWindow(); // Update bin contents if open
       }
   }


  // Internet Explorer Simulation
   function ieCanGoBack() { return state.ieHistoryIndex > 0; }
   function ieCanGoForward() { return state.ieHistoryIndex < state.ieHistory.length - 1; }

   function updateIEButtons() {
      const ieWindow = document.getElementById('ie-widget');
      if (!ieWindow) return;
      ieWindow.querySelector('button[onclick="ieGoBack()"]').disabled = !ieCanGoBack();
      ieWindow.querySelector('button[onclick="ieGoForward()"]').disabled = !ieCanGoForward();
   }

   function updateIEHistorySelect() {
      const select = document.getElementById('ie-history-select');
      if (!select) return;
      // Clear existing options except the placeholder
      while (select.options.length > 1) {
          select.remove(1);
      }
      // Add history items in reverse order (most recent first)
      for (let i = state.ieHistory.length - 1; i >= 0; i--) {
          const option = document.createElement('option');
          option.value = state.ieHistory[i];
          option.textContent = state.ieHistory[i];
          select.appendChild(option);
      }
       select.value = state.ieHistory[state.ieHistoryIndex] || ""; // Select current URL
   }


   window.ieGo = function() {
       const urlInput = document.getElementById('ie-url');
       const iframe = document.getElementById('ie-iframe');
       if (!urlInput || !iframe) return;

       let url = urlInput.value.trim();
       if (!url) return;

       // Basic URL check and prefixing
       if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('about:') && !url.startsWith('mailto:')) {
           url = 'http://' + url;
           urlInput.value = url; // Update input field
       }

       // Add to history - slicing removes forward history
       if (state.ieHistoryIndex < state.ieHistory.length - 1) {
           state.ieHistory = state.ieHistory.slice(0, state.ieHistoryIndex + 1);
       }
       state.ieHistory.push(url);
       state.ieHistoryIndex = state.ieHistory.length - 1;


       console.log("Navigating iframe to:", url);
       try {
           // Use about:blank first to clear potentially problematic content
           iframe.src = 'about:blank';
           // Set the actual URL after a short delay
           setTimeout(() => {
               iframe.src = url;
           }, 50);
       } catch (error) {
           console.error("Error loading URL in iframe:", error);
           iframe.src = 'about:blank'; // Reset on error
           // Display error message inside the iframe (more complex)
           try {
               iframe.contentWindow.document.body.innerHTML = `<p>Error loading page: ${url}</p><p><small>${error.message}</small></p>`;
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
           updateIEHistorySelect(); // Update select to show current URL
       }
   }

   window.ieGoForward = function() {
       if (ieCanGoForward()) {
           state.ieHistoryIndex++;
           const url = state.ieHistory[state.ieHistoryIndex];
           document.getElementById('ie-url').value = url;
           document.getElementById('ie-iframe').src = url;
           updateIEButtons();
           updateIEHistorySelect(); // Update select to show current URL
       }
   }

   window.ieHistorySelect = function() {
       const select = document.getElementById('ie-history-select');
       const url = select.value;
       if (url) {
           document.getElementById('ie-url').value = url;
           ieGo(); // Use ieGo to handle history correctly
       }
   }


  // Picture Folder - Open Picture Function
  window.openPicture = function(src, title) {
      // Reuse picture1-window or picture2-window if available and closed?
      // For simplicity, we'll just use picture1-window as a generic viewer

      const picWindow = document.getElementById('picture1-window'); // Use a designated picture window
      if (!picWindow) {
          console.error("Picture window not found");
          return;
      }

      const imgElement = picWindow.querySelector('.content img');
      const titleElement = picWindow.querySelector('.title-bar span');
      const titleIcon = picWindow.querySelector('.title-bar-icon');

      if (!imgElement || !titleElement || !titleIcon) {
          console.error("Required elements missing in picture window");
          return;
      }

      imgElement.src = src;
      imgElement.alt = title;
      titleElement.textContent = title;
      // Optionally try to find a matching icon (simplified)
      if (title.endsWith('.jpg') || title.endsWith('.jpeg')) {
          titleIcon.src = 'icons/All [Without duplicates]/Drawing red picture.ico';
      } else if (title.endsWith('.png')) {
           titleIcon.src = 'icons/All [Without duplicates]/Drawing green picture.ico';
      } else {
          titleIcon.src = 'icons/All [Without duplicates]/Document.ico'; // Default
      }


      openWindow('picture1-window'); // Open or bring to front
  }


   // --- File Upload & Gallery (Synology NAS Placeholder) ---

   const NAS_BASE_URL = 'http://YOUR_NAS_IP:5000/webapi'; // !!! REPLACE WITH YOUR NAS IP/DNS and Port !!!
   let synoAuthToken = null; // Store the Session ID (_sid) after login

   // --- IMPORTANT SECURITY NOTE ---
   // Logging in directly from the client-side (browser JS) to Synology is GENERALLY INSECURE
   // because it exposes your NAS credentials or requires insecure CORS settings.
   // A proper implementation usually involves:
   // 1. A Backend Proxy: Your website talks to your own server (e.g., Node.js, PHP),
   //    which then securely communicates with the Synology NAS API.
   // 2. Secure NAS Configuration: If connecting directly, Synology's CORS settings
   //    in Control Panel > Security > Security must allow requests from your website's domain.
   //    Still risky without proper authentication handling.
   //
   // The functions below are simplified placeholders demonstrating the API calls.
   // DO NOT use them in production with hardcoded credentials without understanding the risks.

   // Placeholder Login (Should ideally happen via a secure backend proxy)
   async function loginToSynology() {
       // --- !!! THIS IS INSECURE - FOR DEMONSTRATION ONLY !!! ---
       const username = 'YOUR_NAS_USERNAME'; // Replace or get securely
       const password = 'YOUR_NAS_PASSWORD'; // Replace or get securely
       const sessionName = 'WeddingApp'; // Can be anything

       const loginUrl = `${NAS_BASE_URL}/auth.cgi?api=SYNO.API.Auth&version=7&method=login&account=${encodeURIComponent(username)}&passwd=${encodeURIComponent(password)}&session=${encodeURIComponent(sessionName)}&format=sid`;

       try {
           console.log("Attempting Synology login (Placeholder - Insecure)...");
           const response = await fetch(loginUrl);
           const data = await response.json();

           if (data.success && data.data.sid) {
               synoAuthToken = data.data.sid;
               console.log("Synology Login Successful (Placeholder). SID:", synoAuthToken);
               return true;
           } else {
               console.error("Synology Login Failed:", data.error?.code, data.error?.errors);
               alert(`Synology Login Failed (Placeholder): ${data.error?.code}`);
               synoAuthToken = null;
               return false;
           }
       } catch (error) {
           console.error("Error during Synology Login fetch:", error);
           alert("Error connecting to Synology (Placeholder). Check NAS_BASE_URL and network.");
           synoAuthToken = null;
           return false;
       }
   }

   // Call login when needed (e.g., before first upload/gallery load)
   // await loginToSynology(); // You might call this when the upload/gallery icons are clicked

  window.uploadMedia = async function() {
      const input = document.getElementById('file-input');
      const statusDiv = document.getElementById('upload-status');
      statusDiv.textContent = 'Starting upload...';

      if (input.files.length === 0) {
          statusDiv.textContent = "Please select file(s) to upload.";
          alert("Wybierz plik do przesłania.");
          return;
      }

      // --- Placeholder Check ---
      if (!NAS_BASE_URL.includes('YOUR_NAS_IP')) { // Check if URL was replaced
           statusDiv.textContent = 'Upload Error: NAS IP address not configured in script.js.';
           alert('Upload functionality requires configuration. NAS IP address is missing.');
           console.warn("NAS_BASE_URL not configured in script.js");
           return;
      }
       // --- End Placeholder Check ---

      // Attempt login if no token (INSECURE - see note above)
       if (!synoAuthToken) {
           statusDiv.textContent = 'Attempting login...';
           const loggedIn = await loginToSynology();
           if (!loggedIn) {
               statusDiv.textContent = 'Upload Error: Could not log in to Synology.';
               return;
           }
       }

      statusDiv.textContent = 'Preparing files...';
      const formData = new FormData();
      const uploadFolderPath = '/Public/WeddingUploads'; // IMPORTANT: Ensure this folder exists on your NAS!

      formData.append('api', 'SYNO.FileStation.Upload');
      formData.append('version', '2');
      formData.append('method', 'upload');
      formData.append('path', uploadFolderPath);
      formData.append('create_parents', 'true'); // Create folder if it doesn't exist
      formData.append('overwrite', 'true'); // Or 'false', or handle conflicts
      formData.append('_sid', synoAuthToken);

      for (let i = 0; i < input.files.length; i++) {
          formData.append('file', input.files[i], input.files[i].name); // Add filename
           statusDiv.textContent = `Uploading ${input.files[i].name}...`;
      }

      // Note: File Station API uses entry.cgi
      const uploadUrl = `${NAS_BASE_URL}/entry.cgi`;

      try {
          const response = await fetch(uploadUrl, {
              method: 'POST',
              body: formData
              // Note: 'Content-Type' header is set automatically by fetch for FormData
          });

          const data = await response.json();

          if (data.success) {
              statusDiv.textContent = `Successfully uploaded ${input.files.length} file(s) to ${uploadFolderPath}.`;
              console.log('Upload successful:', data);
              alert('Upload successful!');
              input.value = ''; // Clear file input
              // Optionally refresh gallery if open
              if (state.windows['gallery-window']?.isOpen) {
                  loadGallery();
              }
          } else {
               // Provide more specific error details if available
               const errorCode = data.error?.code;
               const errorMsg = synoErrorCodes[errorCode] || `Unknown error (${errorCode})`;
               statusDiv.textContent = `Upload Error: ${errorMsg}`;
               console.error('Upload failed:', data);
               alert(`Upload Error: ${errorMsg}`);
               // Handle potential session timeout (error code 119)
               if (errorCode === 119) {
                  synoAuthToken = null; // Force re-login next time
                  statusDiv.textContent += ' Session might have expired. Please try again.';
               }
          }
      } catch (error) {
          statusDiv.textContent = 'Upload Error: Network or connection issue.';
          console.error('Error during upload fetch:', error);
          alert('Upload Error: Could not connect to NAS. Check network and CORS settings.');
      }
  }

  window.loadGallery = async function() {
      const container = document.getElementById('gallery-container');
      container.innerHTML = '<p>Loading gallery...</p>';

      // --- Placeholder Check ---
       if (!NAS_BASE_URL.includes('YOUR_NAS_IP')) {
           container.innerHTML = '<p>Gallery Error: NAS IP address not configured in script.js.</p>';
           console.warn("NAS_BASE_URL not configured in script.js");
           return;
       }
        // --- End Placeholder Check ---

       // Attempt login if no token (INSECURE)
       if (!synoAuthToken) {
           container.innerHTML = '<p>Attempting login...</p>';
           const loggedIn = await loginToSynology();
           if (!loggedIn) {
               container.innerHTML = '<p>Gallery Error: Could not log in to Synology.</p>';
               return;
           }
       }

      const galleryFolderPath = '/Public/WeddingUploads'; // Must match upload folder
      const listUrl = `${NAS_BASE_URL}/entry.cgi?api=SYNO.FileStation.List&version=2&method=list&folder_path=${encodeURIComponent(galleryFolderPath)}&additional=["real_path","size","time","perm","type"]&_sid=${synoAuthToken}`;

      try {
          const response = await fetch(listUrl);
          const data = await response.json();

          if (data.success) {
              container.innerHTML = ''; // Clear loading message
              const files = data.data.files;
              if (files.length === 0) {
                  container.innerHTML = '<p>No media found in the gallery folder.</p>';
                  return;
              }

              files.forEach(file => {
                   // Skip Synology's metadata folders/files
                   if (file.name.startsWith('@')) return;

                  // Basic check for image/video based on extension
                  const lowerName = file.name.toLowerCase();
                  let mediaElement = null;

                  // --- Generating Direct File URLs (Requires Proper NAS Setup) ---
                  // Accessing files directly usually requires either:
                  // a) Synology Photos public sharing (complex to automate)
                  // b) File Station sharing links (also complex)
                  // c) A backend that serves files securely using the NAS API download method
                  // d) ENABLING the `/file` endpoint (Less secure, needs specific DSM config)
                  // This example uses the `/file` endpoint structure - IT MIGHT NOT WORK
                  // without specific NAS configuration (e.g., enabling access for non-admin users
                  // via Application Portal or Reverse Proxy).
                  const fileAccessBaseUrl = `http://${NAS_BASE_URL.split(':')[1].substring(2)}:5000/file`; // Assumes standard port 5000 for file access
                  const filePathEncoded = encodeURIComponent(file.path); // Use 'path' from list result
                   // Need auth token for direct access too typically! Appending _sid might work in some configs.
                   const fileUrl = `${fileAccessBaseUrl}${filePathEncoded}?_sid=${synoAuthToken}`;

                  if (/\.(jpe?g|png|gif|bmp|webp)$/i.test(lowerName)) {
                      mediaElement = document.createElement('img');
                      mediaElement.src = fileUrl; // Use direct URL (Requires NAS config)
                      mediaElement.alt = file.name;
                      mediaElement.style.width = '100px';
                      mediaElement.style.height = '100px';
                      mediaElement.style.objectFit = 'cover';
                      mediaElement.style.cursor = 'pointer';
                      mediaElement.title = `Click to view ${file.name}`;
                      // Add click to open in a picture viewer window
                       mediaElement.onclick = () => openPicture(fileUrl, file.name);
                  } else if (/\.(mp4|webm|ogv|mov)$/i.test(lowerName)) {
                      mediaElement = document.createElement('video');
                      mediaElement.src = fileUrl; // Use direct URL (Requires NAS config)
                      mediaElement.controls = true;
                      mediaElement.style.width = '150px';
                      mediaElement.style.height = '100px';
                       mediaElement.title = `Video: ${file.name}`;
                  }

                  if (mediaElement) {
                       const itemWrapper = document.createElement('div');
                       itemWrapper.style.border = "1px solid #ccc";
                       itemWrapper.style.padding = "3px";
                       itemWrapper.appendChild(mediaElement);
                      container.appendChild(itemWrapper);
                  }
              });
          } else {
               const errorCode = data.error?.code;
               const errorMsg = synoErrorCodes[errorCode] || `Unknown error (${errorCode})`;
               container.innerHTML = `<p>Gallery Error: ${errorMsg}</p>`;
               console.error('Error loading gallery list:', data);
               if (errorCode === 119) { // Session timeout
                   synoAuthToken = null;
                   container.innerHTML += '<p>Session may have expired. Please try refreshing again.</p>';
               } else if (errorCode === 408) { // Folder not found
                    container.innerHTML += `<p>Ensure the folder '${galleryFolderPath}' exists on the NAS.</p>`;
               }
          }
      } catch (error) {
          container.innerHTML = '<p>Gallery Error: Network or connection issue.</p>';
          console.error('Error during gallery fetch:', error);
      }
  }

  // Synology Error Code Mapping (Add more as needed)
   const synoErrorCodes = {
       100: "Unknown error",
       101: "Invalid parameter",
       102: "API not found",
       103: "Method not found",
       104: "Version not supported",
       105: "Permission denied",
       106: "Session timeout",
       107: "Session interrupted",
       119: "Session ID not found (Login required/expired)",
       400: "Invalid parameter",
       401: "Unknown error",
       402: "System is busy",
       403: "Invalid user/password",
       404: "Invalid group",
       406: "Cannot list user/group",
       407: "Cannot list group",
       408: "File/Folder does not exist",
       // Add File Station specific codes (e.g., 599 for no such task)
   };


  // --- Initialize Draggable/Resizable Windows (After DOM is ready) ---
  document.querySelectorAll('.window').forEach(win => {
      if (!state.isMobile) {
          makeWindowDraggable(win);
          makeWindowResizable(win);
           toggleResizers(win, !win.classList.contains('maximized')); // Initial state
      } else {
           toggleResizers(win, false); // Ensure hidden on mobile
      }
  });

}); // End DOMContentLoaded