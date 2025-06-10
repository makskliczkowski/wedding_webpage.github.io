/**
 * Windows 95 Style Wedding Website Script v3.1 (Mobile Enhanced)
 * Features: Draggable/Resizable Windows (Desktop), Taskbar, Start Menu, Desktop Icons,
 *           Email Client Sim, Recycle Bin, IE Sim, Notepad, Games, Picture Viewer,
 *           Control Panel Sim, NAS Placeholder, Enhanced Mobile Fallback & Clickability.
 */
"use strict";

document.addEventListener('DOMContentLoaded', () => {

    // --- Global State ---
    const state = {
        windows: {},
        taskbarButtons: {},
        nextZIndex: 100,
        activeWindowId: null,
        isMobile: false, // Will be determined dynamically
        iconGridSize: 80,
        defaultIcon: 'icons/All [Without duplicates]/Document.ico',
        recycleBinItems: [
            { id: 'rb_doc_1', originalId: null, name: 'Wedding Vows Draft 1.doc', icon: 'icons/All [Without duplicates]/Document.ico', type: 'file' },
            { id: 'rb_jpg_2', originalId: null, name: 'Bad Selfie.jpg', icon: 'icons/All [Without duplicates]/Drawing red picture.ico', type: 'file' },
            { id: 'rb_folder_3', originalId: null, name: 'Old Projects', icon: 'icons/All [Without duplicates]/Folder.ico', type: 'folder' },
            { id: 'rb_pdf_4', originalId: null, name: 'IKEA Manual (Failed).pdf', icon: 'icons/All [Without duplicates]/Help page.ico', type: 'file' },
        ],
        ieHistory: [], ieHistoryIndex: -1,
        desktopBackgrounds: ['#008080', '#000000', '#55AAAA'],
        currentBackgroundIndex: 0,
        explorerWindowContents: {
            'C':{title:'Local Disk (C:)',icon:'icons/All [Without duplicates]/Drive.ico',items:[{name:'Program Files',icon:'icons/All [Without duplicates]/Folder.ico',type:'folder'},{name:'Windows',icon:'icons/All [Without duplicates]/Folder (Windows).ico',type:'folder'},{name:'My Documents',icon:'icons/All [Without duplicates]/Folder (Favorite).ico',type:'folder'},{name:'config.sys',icon:'icons/All [Without duplicates]/Text file.ico',type:'file'},{name:'autoexec.bat',icon:'icons/All [Without duplicates]/Text file.ico',type:'file'}]},
            'A':{title:'3½ Floppy (A:)',icon:'icons/All [Without duplicates]/Drive (Floppy 3).ico',items:[{name:'Not ready reading drive A.\nAbort, Retry, Fail?',icon:'icons/All [Without duplicates]/Error.ico',type:'message'}]},
            'D_Wedding':{title:'Wedding Files (D:)',icon:'icons/All [Without duplicates]/Drive.ico',items:[{name:'GuestList.xls',icon:'icons/All [Without duplicates]/Spreadsheet.ico',type:'file'},{name:'SeatingChart_v5_FINAL.doc',icon:'icons/All [Without duplicates]/Document.ico',type:'file'},{name:'Budget_Overspent.xls',icon:'icons/All [Without duplicates]/Spreadsheet (Dollar).ico',type:'file'}]},
            'E_CD':{title:'CD-ROM Drive (E:)',icon:'icons/All [Without duplicates]/CD Drive.ico',items:[{name:'Please insert a Wedding Mix CD.',icon:'icons/All [Without duplicates]/CD Music.ico',type:'message'}]},
            'display-props':{title:'Display Properties',icon:'icons/All [Without duplicates]/Desktop.ico',items:[{name:'Appearance: Windows 95 Classic',icon:'icons/All [Without duplicates]/Paint program.ico',type:'message'},{name:'Resolution: 800x600 (Desktop)',icon:'icons/All [Without duplicates]/Settings.ico',type:'message'}]},
            'printers':{title:'Printers',icon:'icons/All [Without duplicates]/Printer (3D).ico',items:[{name:'No printers are installed.',icon:'icons/All [Without duplicates]/Error.ico',type:'message'}]},
            'mouse-settings':{title:'Mouse Properties',icon:'icons/All [Without duplicates]/Mouse.ico',items:[{name:'Pointer speed: Fast',icon:'icons/All [Without duplicates]/Mouse.ico',type:'message'},{name:'Double-click speed: Fast',icon:'icons/All [Without duplicates]/Mouse wizard.ico',type:'message'}]},
            'sound-settings':{title:'Sounds',icon:'icons/All [Without duplicates]/Sound program.ico',items:[{name:'Default Beep: ON',icon:'icons/All [Without duplicates]/Sound (Louder).ico',type:'message'},{name:'Startup Sound: Enabled',icon:'icons/All [Without duplicates]/Sound.ico',type:'message'}]},
            'add-remove-programs':{title:'Add/Remove Programs',icon:'icons/All [Without duplicates]/Program group.ico',items:[{name:'Hover.exe (150MB)',icon:'icons/All [Without duplicates]/Help page.ico',type:'message'},{name:'Clippy Assistant (2KB)',icon:'icons/All [Without duplicates]/Agent.ico',type:'message'}]}
        },
        ieBookmarks: [
            {name:"Pointer Pointer",url:"https://pointerpointer.com/"},{name:"Space Jam (1996!)",url:"https://www.spacejam.com/1996/"},{name:"Google (Retro)",url:"https://google.com/webhp?nord=1&source=hp&igu=1"},{name:"Wedding Venue",url:"http://www.dworki-weselne.pl/dworek-separowo/"}
        ],
        focusedWindowId: null, // Track which window has actual focus for keyboard events
        isDraggingOrResizing: false, // Flag to prevent clicks during drag/resize
    };

    // --- DOM Element References ---
    const desktop = document.querySelector('.desktop');
    const desktopArea = document.getElementById('desktop-area'); // May not be used if desktop is hidden
    const taskbar = document.querySelector('.taskbar');
    const startButton = document.getElementById('start-button');
    const startMenu = document.getElementById('start-menu');
    const windowButtonsContainer = document.getElementById('window-buttons-container');
    const clockElement = document.getElementById('clock');
    const contextMenu = document.getElementById('context-menu');
    const mobileOverlay = document.getElementById('mobile-overlay');

    // --- Initial Setup ---
    function detectMobile() {
        state.isMobile = window.innerWidth <= 768;
    }

    detectMobile(); // Initial detection
    window.addEventListener('resize', () => {
        const oldIsMobile = state.isMobile;
        detectMobile();
        if (oldIsMobile !== state.isMobile) {
            console.log(`Switched to ${state.isMobile ? 'Mobile' : 'Desktop'} mode.`);
            // Re-initialize or adjust UI based on new mode
            // This might involve hiding/showing elements or re-attaching listeners
            // For simplicity, a page reload might be easier if complex state changes are needed
            // location.reload(); // Uncomment if a full reload is preferred for mode switch
            if (state.isMobile) {
                setupMobileMode();
            } else {
                setupDesktopMode();
            }
        }
    });

    document.querySelectorAll('.window').forEach(w => { w.style.display = 'none'; });

    try {
        if (state.isMobile) {
            setupMobileMode();
        } else {
            setupDesktopMode();
        }
        initClock();
        initEmail();
        updateRecycleBinIcon();
        updateRecycleBinWindowContent();
        initIEBookmarks();
        initGlobalKeyListener();
        console.log("WeddingOS Initialized.");
    } catch (error) {
        console.error("Initialization Error:", error);
        alert("A critical error occurred during initialization. Please check the console.");
    }

    // --- Mobile/Desktop Specific Initialization ---

    function setupMobileMode() {
        console.log("Setting up Mobile Mode");
        if (desktop) desktop.style.display = 'none';
        if (mobileOverlay) mobileOverlay.style.display = 'flex';
        if (taskbar) taskbar.style.position = 'fixed'; // Ensure taskbar is fixed
        if (startButton) startButton.style.display = 'none';
        if (contextMenu) contextMenu.style.display = 'none';
        if (startMenu) startMenu.style.display = 'none';
        if (windowButtonsContainer) windowButtonsContainer.style.display = 'none';

        // Close any open desktop windows before switching
        Object.keys(state.windows).forEach(winId => closeWindow(winId, true));
        state.windows = {}; // Clear desktop window states

        // Attach listeners only to mobile icons
        if (mobileOverlay) {
            mobileOverlay.querySelectorAll('.icon').forEach(icon => {
                const windowId = icon.dataset.windowId;
                if (windowId) {
                    // Remove any previous listeners to avoid duplication if setupMobileMode is called multiple times
                    const newIcon = icon.cloneNode(true);
                    icon.parentNode.replaceChild(newIcon, icon);

                    newIcon.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent event bubbling
                        openWindow(windowId);
                    });
                    // Basic touchstart for visual feedback, touchend for action
                    newIcon.addEventListener('touchstart', (e) => {
                        e.stopPropagation();
                        newIcon.classList.add('active-touch'); // For visual feedback
                    }, { passive: true });
                    newIcon.addEventListener('touchend', (e) => {
                        e.preventDefault(); // Prevent click from firing immediately after if not handled well
                        e.stopPropagation();
                        newIcon.classList.remove('active-touch');
                        // openWindow(windowId); // Click handler will take care of this
                    });
                } else {
                    // icon.style.display = 'none'; // Or handle icons without windowId differently
                }
            });
        }
        // Ensure all desktop icons are non-interactive if they somehow become visible
        document.querySelectorAll('.desktop .icon').forEach(dIcon => dIcon.style.pointerEvents = 'none');
    }

    function setupDesktopMode() {
        console.log("Setting up Desktop Mode");
        if (mobileOverlay) mobileOverlay.style.display = 'none';
        if (desktop) desktop.style.display = 'block';
        if (taskbar) taskbar.style.position = 'absolute'; // Reset taskbar position
        if (startButton) startButton.style.display = 'flex';
        if (windowButtonsContainer) windowButtonsContainer.style.display = 'flex';

        // Close any open mobile windows before switching
        Object.keys(state.windows).forEach(winId => closeWindow(winId, true));
        state.windows = {}; // Clear mobile window states

        // Initialize all desktop features
        initDesktopIcons();
        initWindowControls();
        initStartMenu();
        initContextMenu();
        initMyComputer();
        initControlPanel();
        initSoundTrayIcon();
        initMenuBarInteraction();

        document.querySelectorAll('.window').forEach(win => {
            const winId = win.id;
            // Ensure controls are wired up for desktop mode
            win.querySelectorAll('.window-controls button').forEach(btn => {
                if (!btn.dataset.windowId) btn.dataset.windowId = winId;
            });
            makeWindowDraggable(win);
            makeWindowResizable(win);
            // Restore resizers if window is not maximized
            const winData = state.windows[winId]; // May not exist yet if opening for first time
            toggleResizers(win, !(winData?.isMaximized));
        });

        // Ensure mobile icons are non-interactive
        if (mobileOverlay) {
            mobileOverlay.querySelectorAll('.icon').forEach(mIcon => mIcon.style.pointerEvents = 'none');
        }
        document.querySelectorAll('.desktop .icon').forEach(dIcon => dIcon.style.pointerEvents = 'auto');

        // Initialize Games (if elements exist)
        try {
            if (typeof minesweeper !== 'undefined' && document.getElementById('minesweeper-grid')) {
                minesweeper.init('minesweeper-grid', 'mines-left', 'minesweeper-face', 'minesweeper-timer');
            }
            if (typeof snakeGame !== 'undefined' && document.getElementById('snake-canvas')) {
                snakeGame.init('snake-canvas', 'snake-score');
            }
        } catch (err) { console.error("Game Init Error (Desktop Mode):", err); }
    }

    // --- Global Key Listener (for Snake, Screensaver etc.) ---
    function initGlobalKeyListener() {
        document.addEventListener('keydown', (e) => {
            if (state.focusedWindowId === 'snake-window' && typeof snakeGame !== 'undefined' && snakeGame.handleKeyPress) {
                snakeGame.handleKeyPress(e.key);
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                }
            }
            if(state.windows['screensaver-window']?.isOpen) {
                 closeWindow('screensaver-window');
            }
        });
    }

    // --- Menu Bar Interaction (Desktop Windows) ---
    function initMenuBarInteraction() {
        document.querySelectorAll('.menu-bar').forEach(menuBar => {
            menuBar.addEventListener('click', e => {
                if (state.isMobile) return;
                const mi = e.target.closest('.menu-item');
                if (!mi) return;
                menuBar.querySelectorAll('.dropdown-menu').forEach(d => {
                    if (!mi.contains(d)) d.style.display = 'none';
                });
                const dd = mi.querySelector('.dropdown-menu');
                if (dd) dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
            });
        });
        document.addEventListener('click', e => {
            if (state.isMobile) return;
            document.querySelectorAll('.menu-bar').forEach(mb => {
                if (!mb.contains(e.target))
                    mb.querySelectorAll('.dropdown-menu').forEach(d=>d.style.display='none');
            });
        });
    }


    // --- Core Window Management ---

    function openWindow(windowId, params = {}) {
        const win = document.getElementById(windowId);
        if (!win) { console.error(`Window #${windowId} not found.`); return; }

        // Mobile specific checks
        if (state.isMobile) {
            const allowedMobileWindows = ['invitation-window', 'upload-window', 'hosting-info-window']; // Add more if needed
            if (!allowedMobileWindows.includes(windowId)) {
                 alert("This application is best viewed on a desktop for the full experience!");
                 return;
            }
            // Close any other open mobile window
            Object.keys(state.windows).forEach(openWinId => {
                if (openWinId !== windowId && state.windows[openWinId]?.isOpen) {
                    closeWindow(openWinId, true); // Force close, no taskbar update
                }
            });
        }

        let winData = state.windows[windowId];

        if (winData?.isOpen && !winData.isMinimized && !state.isMobile) { // On desktop, just bring to front
            bringToFront(windowId);
            return;
        }

        if (!winData) {
            winData = {
                element: win,
                isOpen: false,
                isMinimized: false,
                isMaximized: state.isMobile, // Maximize by default on mobile
                originalRect: null,
                beforeMinimizeRect: null
            };
            state.windows[windowId] = winData;
            if (!state.isMobile) createTaskbarButton(windowId);

            if (!state.isMobile && !winData.isMaximized) {
                const openCount = Object.values(state.windows).filter(w => w.isOpen && !w.isMinimized).length;
                const offset = (openCount || 0) * 25;
                const defaultWidth = params.width || win.style.width || '500px';
                const defaultHeight = params.height || win.style.height || '400px';

                win.style.left = params.left || win.style.left || `${50 + offset}px`;
                win.style.top = params.top || win.style.top || `${50 + offset}px`;
                win.style.width = defaultWidth;
                win.style.height = defaultHeight;
            }
        }

        winData.isOpen = true;
        winData.isMinimized = false;
        win.style.display = 'flex'; // Use flex for internal layout

        if (state.isMobile) {
            win.classList.add('mobile-active-window');
            Object.assign(win.style, { left: '0px', top: '0px', width: '100vw', height: '100vh', zIndex: 5000 });
            winData.isMaximized = true;
            toggleResizers(win, false); // No resizers on mobile
            win.querySelectorAll('.maximize-button, .menu-bar').forEach(el => el.style.display = 'none');
        } else {
            win.classList.remove('mobile-active-window');
            if (winData.isMaximized) {
                win.classList.add('maximized');
                Object.assign(win.style, { left: '0px', top: '0px', width: '100vw', height: `calc(100vh - ${taskbar.offsetHeight}px)` });
                toggleResizers(win, false);
            } else {
                win.classList.remove('maximized');
                if (winData.originalRect) Object.assign(win.style, winData.originalRect);
                toggleResizers(win, true);
            }
            updateMaximizeButtonIcon(windowId, winData.isMaximized);
            bringToFront(windowId);
        }

        // Window-Specific Post-Open Actions
        try {
            if (windowId === 'email-window' && !state.isMobile) switchFolder('inbox', document.getElementById('folder-inbox'));
            if (windowId === 'recycle-window' && !state.isMobile) updateRecycleBinWindowContent();
            if (windowId === 'gallery-window' && !state.isMobile) loadGallery(); // NAS gallery might not work on mobile anyway
            if (windowId === 'ie-widget' && !state.isMobile) initIEWindow();
            if (windowId === 'picture1-window' && params.imgSrc && !state.isMobile) setupPictureWindow(win, params.imgSrc, params.imgTitle || 'Image');
            if (windowId === 'notepad-window' && !state.isMobile) win.querySelector('.notepad-textarea')?.focus();
            if (windowId === 'minesweeper-window' && typeof minesweeper !== 'undefined' && !minesweeper.gameStarted && !state.isMobile) minesweeper.newGame();
            if (windowId === 'snake-window' && typeof snakeGame !== 'undefined' && !snakeGame.gameLoop && !state.isMobile) snakeGame.newGame();
            if (windowId === 'screensaver-window' && !state.isMobile) setupScreensaver(win);
        } catch (err) { console.error(`Error during specific action for ${windowId}:`, err); }

        if (!state.isMobile) closeStartMenu();
    }

    function setupPictureWindow(win, src, title) {
        if (state.isMobile) return; // Picture viewer likely desktop only for now
        const imgEl = win.querySelector('#picture1-image');
        const titleEl = win.querySelector('#picture1-title');
        const titleIcon = win.querySelector('.title-bar-icon');
        if (imgEl) { imgEl.src = src; imgEl.alt = title; }
        if (titleEl) titleEl.textContent = title;
        if (titleIcon) {
            if (title.toLowerCase().match(/\.(png|bmp)$/i)) titleIcon.src = 'icons/All [Without duplicates]/Drawing green picture.ico';
            else if (title.toLowerCase().match(/\.(jpe?g|gif)$/i)) titleIcon.src = 'icons/All [Without duplicates]/Drawing red picture.ico';
            else titleIcon.src = 'icons/All [Without duplicates]/Picture.ico';
        }
    }

    function setupScreensaver(win) {
        if (state.isMobile) return; // Screensaver is desktop only
        if (!state.windows[win.id]?.isMaximized) maximizeWindow(win.id);
        const closeHandler = () => {
            closeWindow(win.id);
            win.removeEventListener('click', closeHandler);
            document.removeEventListener('keydown', closeHandler);
        };
        win.addEventListener('click', closeHandler);
        document.addEventListener('keydown', closeHandler);
    }

    function closeWindow(windowId, forceClose = false) {
        const winData = state.windows[windowId];
        if (winData?.element) {
            if (windowId === 'snake-window' && typeof snakeGame !== 'undefined' && snakeGame.gameOver !== undefined) snakeGame.gameOver = true;
            winData.element.style.display = 'none';
            winData.isOpen = false;
            winData.element.classList.remove('active', 'mobile-active-window');

            if (!state.isMobile && !forceClose) removeTaskbarButton(windowId);

            // Don't delete from state.windows if we might reopen (e.g. mobile switching)
            // Only fully delete if it's a permanent close on desktop or forced
            if ((!state.isMobile && !forceClose) || (state.isMobile && forceClose)) {
                 // delete state.windows[windowId]; // Let's keep it to preserve state like size/pos if reopened
            }

            if (state.activeWindowId === windowId) {
                state.activeWindowId = null;
                state.focusedWindowId = null;
                if (!state.isMobile && !forceClose) {
                    // TODO: Focus next available window on desktop
                }
            }
        }
        if (!state.isMobile) updateRecycleBinIcon();
    }

    function minimizeWindow(windowId) {
        if (state.isMobile) { // Minimize on mobile could mean 'close' or hide to an overview
            closeWindow(windowId);
            return;
        }
        const winData = state.windows[windowId];
        if (winData?.element && winData.isOpen && !winData.isMinimized) {
            if (!winData.isMaximized && !winData.originalRect) { // Store current rect if not maximized
                winData.beforeMinimizeRect = { left: winData.element.style.left, top: winData.element.style.top, width: winData.element.style.width, height: winData.element.style.height };
            }
            winData.element.style.display = 'none';
            winData.isMinimized = true;
            if (state.activeWindowId === windowId) {
                state.activeWindowId = null;
                state.focusedWindowId = null;
                winData.element.classList.remove('active');
            }
            updateTaskbarButton(windowId);
        }
    }

    function restoreWindow(windowId) {
        if (state.isMobile) {
            openWindow(windowId); // On mobile, restore is same as open
            return;
        }
        const winData = state.windows[windowId];
        if (winData?.element) {
            if (!winData.isOpen || winData.isMinimized) {
                winData.isOpen = true;
                winData.isMinimized = false;
                winData.element.style.display = 'flex';
                if (winData.isMaximized) {
                    Object.assign(winData.element.style, { left: '0px', top: '0px', width: '100vw', height: `calc(100vh - ${taskbar.offsetHeight}px)` });
                    winData.element.classList.add('maximized');
                    toggleResizers(winData.element, false);
                } else {
                    // Restore to beforeMinimizeRect if available, else originalRect or current style
                    const targetRect = winData.beforeMinimizeRect || winData.originalRect || { left: winData.element.style.left, top: winData.element.style.top, width: winData.element.style.width, height: winData.element.style.height };
                    Object.assign(winData.element.style, targetRect);
                    winData.element.classList.remove('maximized');
                    toggleResizers(winData.element, true);
                }
                updateMaximizeButtonIcon(windowId, winData.isMaximized);
            }
            bringToFront(windowId);
        }
    }

    function maximizeWindow(windowId) {
        if (state.isMobile) return; // Maximize is default on mobile, no toggle needed
        const winData = state.windows[windowId];
        if (!winData?.element || !winData.isOpen || winData.isMinimized) return;

        if (winData.isMaximized) { // Restore down
            winData.isMaximized = false;
            winData.element.classList.remove('maximized');
            if (winData.originalRect) {
                Object.assign(winData.element.style, winData.originalRect);
            } else { // Fallback if originalRect somehow not set
                winData.element.style.left = '100px'; winData.element.style.top = '100px';
                winData.element.style.width = '600px'; winData.element.style.height = '400px';
            }
            toggleResizers(winData.element, true);
        } else { // Maximize
            winData.originalRect = { left: winData.element.style.left, top: winData.element.style.top, width: winData.element.style.width, height: winData.element.style.height };
            winData.isMaximized = true;
            winData.element.classList.add('maximized');
            Object.assign(winData.element.style, { left: '0px', top: '0px', width: '100vw', height: `calc(100vh - ${taskbar.offsetHeight}px)` });
            toggleResizers(winData.element, false);
        }
        updateMaximizeButtonIcon(windowId, winData.isMaximized);
        bringToFront(windowId); // Ensure it's on top after state change
    }

    function toggleResizers(windowEl, enable) {
        if (state.isMobile || !windowEl) return;
        const winData = state.windows[windowEl.id];
        const show = enable && winData && !winData.isMaximized && winData.isOpen && !winData.isMinimized;
        windowEl.querySelectorAll('.resizer').forEach(r => r.style.display = show ? 'block' : 'none');
    }

    function bringToFront(windowId) {
        const winData = state.windows[windowId];
        if (!winData?.element) { console.warn(`BF: ${windowId} no data.`); return; }
        if (winData.isMinimized || !winData.isOpen) { return; }

        if (state.activeWindowId && state.activeWindowId !== windowId) {
            const oldActive = state.windows[state.activeWindowId];
            if (oldActive?.element) {
                oldActive.element.classList.remove('active');
                if (!state.isMobile) updateTaskbarButton(state.activeWindowId);
            }
        }

        state.nextZIndex++;
        winData.element.style.zIndex = state.nextZIndex;
        winData.element.classList.add('active');
        state.activeWindowId = windowId;
        state.focusedWindowId = windowId; // For keyboard events

        if (!state.isMobile) {
            updateTaskbarButton(windowId);
            toggleResizers(winData.element, !winData.isMaximized);
        }
    }

    function updateMaximizeButtonIcon(windowId, isMaximized) {
        if (state.isMobile) return;
        const win = document.getElementById(windowId);
        if (!win) return;
        const maxBtn = win.querySelector('.maximize-button');
        if (maxBtn) maxBtn.textContent = isMaximized ? '🗗' : '□'; // Restore down / Maximize icons
    }

    // --- Taskbar & Button Management (Desktop only) ---
    function createTaskbarButton(windowId) {
        if (state.isMobile || state.taskbarButtons[windowId] || !windowButtonsContainer) return;
        const win = document.getElementById(windowId);
        if (!win) return;

        const button = document.createElement('button');
        button.className = 'window-button button-border-raised';
        button.dataset.windowId = windowId;

        const iconImg = win.querySelector('.title-bar-icon');
        if (iconImg) {
            const img = document.createElement('img');
            img.src = iconImg.src;
            img.alt = ''; // Decorative
            button.appendChild(img);
        }

        const titleSpan = document.createElement('span');
        titleSpan.textContent = win.querySelector('.title-bar span')?.textContent || windowId;
        button.appendChild(titleSpan);

        button.addEventListener('click', () => {
            const winData = state.windows[windowId];
            if (winData) {
                if (winData.isMinimized || !winData.isOpen) {
                    restoreWindow(windowId);
                } else if (state.activeWindowId === windowId) {
                    minimizeWindow(windowId);
                } else {
                    bringToFront(windowId);
                }
            }
        });
        windowButtonsContainer.appendChild(button);
        state.taskbarButtons[windowId] = button;
        updateTaskbarButton(windowId);
    }

    function removeTaskbarButton(windowId) {
        if (state.isMobile || !state.taskbarButtons[windowId]) return;
        state.taskbarButtons[windowId].remove();
        delete state.taskbarButtons[windowId];
    }

    function updateTaskbarButton(windowId) {
        if (state.isMobile || !state.taskbarButtons[windowId]) return;
        const button = state.taskbarButtons[windowId];
        const winData = state.windows[windowId];
        if (winData && winData.isOpen && !winData.isMinimized && state.activeWindowId === windowId) {
            button.classList.add('active', 'button-border-lowered');
            button.classList.remove('button-border-raised');
        } else {
            button.classList.remove('active', 'button-border-lowered');
            button.classList.add('button-border-raised');
        }
    }

    // --- Desktop Icons & Interaction (Desktop only) ---
    function initDesktopIcons() {
        if (state.isMobile || !desktopArea) return;
        desktopArea.querySelectorAll('.icon').forEach(icon => {
            // remove old listeners
            const newIcon = icon.cloneNode(true);
            icon.parentNode.replaceChild(newIcon, icon);

            // single‐click opens (instead of dblclick)
            newIcon.addEventListener('click', e => {
                e.stopPropagation();
                handleIconDoubleClick(newIcon);
            });
        });
        desktopArea.addEventListener('click', handleDesktopClick);
    }

    function handleIconDoubleClick(icon) {
        if (state.isMobile || state.isDraggingOrResizing) return;
        const windowId = icon.dataset.windowId;
        const imgSrc = icon.dataset.imgSrc;
        const imgTitle = icon.dataset.imgTitle;

        if (windowId) {
            openWindow(windowId);
        } else if (imgSrc) {
            openWindow('picture1-window', { imgSrc: imgSrc, imgTitle: imgTitle || 'Image' });
        }
        deselectAllIcons();
    }

    function handleDesktopClick(e) {
        if (state.isMobile) return;
        if (e.target === desktopArea || e.target === desktop) {
            deselectAllIcons();
            closeStartMenu();
            hideContextMenu();
        }
    }

    function selectIcon(selectedIcon) {
        if (state.isMobile) return;
        deselectAllIcons();
        selectedIcon.classList.add('selected');
    }

    function deselectAllIcons() {
        if (state.isMobile || !desktopArea) return;
        desktopArea.querySelectorAll('.icon.selected').forEach(icon => icon.classList.remove('selected'));
    }

    function makeIconDraggable(icon) {
        if (state.isMobile) return;
        let offsetX, offsetY, isDown = false;

        icon.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Only left click
            isDown = true;
            state.isDraggingOrResizing = true;
            offsetX = e.clientX - icon.offsetLeft;
            offsetY = e.clientY - icon.offsetTop;
            icon.style.zIndex = state.nextZIndex++; // Bring icon to front while dragging
            e.preventDefault(); // Prevent text selection
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;
            // Snap to grid (optional)
            // newX = Math.round(newX / state.iconGridSize) * state.iconGridSize;
            // newY = Math.round(newY / state.iconGridSize) * state.iconGridSize;
            icon.style.left = `${newX}px`;
            icon.style.top = `${newY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDown) {
                isDown = false;
                setTimeout(() => state.isDraggingOrResizing = false, 50); // Delay to allow click event after drag
            }
        });
    }

    // --- Window Dragging & Resizing (Desktop only) ---
    function makeWindowDraggable(windowEl) {
        if (state.isMobile) return;
        const titleBar = windowEl.querySelector('.title-bar');
        if (!titleBar) return;

        let offsetX, offsetY, isDown = false;

        titleBar.addEventListener('mousedown', (e) => {
            if (e.button !== 0 || state.windows[windowEl.id]?.isMaximized) return;
            isDown = true;
            state.isDraggingOrResizing = true;
            offsetX = e.clientX - windowEl.offsetLeft;
            offsetY = e.clientY - windowEl.offsetTop;
            bringToFront(windowEl.id);
            windowEl.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDown || state.windows[windowEl.id]?.isMaximized) return;
            windowEl.style.left = `${e.clientX - offsetX}px`;
            windowEl.style.top = `${e.clientY - offsetY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDown) {
                isDown = false;
                windowEl.style.cursor = 'grab';
                setTimeout(() => state.isDraggingOrResizing = false, 50);
            }
        });
    }

    function makeWindowResizable(windowEl) {
        if (state.isMobile) return;
        const resizers = windowEl.querySelectorAll('.resizer');
        let currentResizer = null;
        let startX, startY, startWidth, startHeight;

        resizers.forEach(resizer => {
            resizer.addEventListener('mousedown', (e) => {
                if (e.button !== 0 || state.windows[windowEl.id]?.isMaximized) return;
                currentResizer = resizer;
                state.isDraggingOrResizing = true;
                startX = e.clientX;
                startY = e.clientY;
                startWidth = parseInt(document.defaultView.getComputedStyle(windowEl).width, 10);
                startHeight = parseInt(document.defaultView.getComputedStyle(windowEl).height, 10);
                bringToFront(windowEl.id);
                e.preventDefault();
                e.stopPropagation();
            });
        });

        document.addEventListener('mousemove', (e) => {
            if (!currentResizer || state.windows[windowEl.id]?.isMaximized) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const minWidth = parseInt(windowEl.style.minWidth) || 150;
            const minHeight = parseInt(windowEl.style.minHeight) || 100;
            let newWidth = startWidth, newHeight = startHeight, newLeft = windowEl.offsetLeft, newTop = windowEl.offsetTop;

            if (currentResizer.classList.contains('resizer-e')) newWidth = Math.max(minWidth, startWidth + dx);
            else if (currentResizer.classList.contains('resizer-w')) {
                newWidth = Math.max(minWidth, startWidth - dx);
                if (newWidth > minWidth) newLeft = windowEl.offsetLeft + dx;
            }
            if (currentResizer.classList.contains('resizer-s')) newHeight = Math.max(minHeight, startHeight + dy);
            else if (currentResizer.classList.contains('resizer-n')) {
                newHeight = Math.max(minHeight, startHeight - dy);
                if (newHeight > minHeight) newTop = windowEl.offsetTop + dy;
            }

            if (currentResizer.classList.contains('resizer-se')) { newWidth = Math.max(minWidth, startWidth + dx); newHeight = Math.max(minHeight, startHeight + dy); }
            else if (currentResizer.classList.contains('resizer-sw')) {
                newWidth = Math.max(minWidth, startWidth - dx); newHeight = Math.max(minHeight, startHeight + dy);
                if (newWidth > minWidth) newLeft = windowEl.offsetLeft + dx;
            }
            else if (currentResizer.classList.contains('resizer-ne')) {
                newWidth = Math.max(minWidth, startWidth + dx); newHeight = Math.max(minHeight, startHeight - dy);
                if (newHeight > minHeight) newTop = windowEl.offsetTop + dy;
            }
            else if (currentResizer.classList.contains('resizer-nw')) {
                newWidth = Math.max(minWidth, startWidth - dx); newHeight = Math.max(minHeight, startHeight - dy);
                if (newWidth > minWidth) newLeft = windowEl.offsetLeft + dx;
                if (newHeight > minHeight) newTop = windowEl.offsetTop + dy;
            }

            windowEl.style.width = `${newWidth}px`;
            windowEl.style.height = `${newHeight}px`;
            windowEl.style.left = `${newLeft}px`;
            windowEl.style.top = `${newTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (currentResizer) {
                currentResizer = null;
                // Store new size/pos as originalRect if not maximized
                const winData = state.windows[windowEl.id];
                if (winData && !winData.isMaximized) {
                    winData.originalRect = { left: windowEl.style.left, top: windowEl.style.top, width: windowEl.style.width, height: windowEl.style.height };
                }
                setTimeout(() => state.isDraggingOrResizing = false, 50);
            }
        });
    }

    // --- Window Control Button Listeners (Event Delegation) ---
    function initWindowControls() {
        document.querySelectorAll('.window-controls button').forEach(btn => {
            const winEl = btn.closest('.window');
            if (!winEl) return;
            const id = winEl.id;
            btn.addEventListener('click', e => {
                e.stopPropagation();
                if (btn.classList.contains('close-button'))      closeWindow(id);
                else if (btn.classList.contains('minimize-button')) minimizeWindow(id);
                else if (btn.classList.contains('maximize-button')) maximizeWindow(id);
            });
        });
    }

    // --- Start Menu Logic (Desktop only) ---
    function initStartMenu() {
        if (state.isMobile || !startButton || !startMenu) return;

        // attach directly to the existing startButton
        startButton.addEventListener('click', e => {
            e.stopPropagation();
            toggleStartMenu();
        });

        // delegate clicks inside the menu
        startMenu.addEventListener('click', e => {
            const winId = e.target.closest('[data-window-id]')?.dataset.windowId;
            if (winId) openWindow(winId);
            closeStartMenu();
        });
    }

    function toggleStartMenu() {
        if (state.isMobile) return;
        const active = startMenu.classList.toggle('active');
        startButton.classList.toggle('active', active);
        startButton.classList.toggle('button-border-lowered', active);
        startButton.classList.toggle('button-border-raised', !active);
        if (active) startMenu.style.zIndex = ++state.nextZIndex;
    }

    function closeStartMenu() {
        if (state.isMobile) return;
        startMenu.classList.remove('active');
        startButton.classList.remove('active','button-border-lowered');
        startButton.classList.add('button-border-raised');
    }

    // --- Clock Logic ---
    function initClock() {
        if (!clockElement) return;
        function updateClock() {
            const now = new Date();
            let hours = now.getHours();
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            clockElement.textContent = `${hours}:${minutes} ${ampm}`;
        }
        updateClock();
        setInterval(updateClock, 10000); // Update every 10 seconds is enough
    }

    // --- Context Menu Logic (Desktop only) ---
    function initContextMenu() {
        if (state.isMobile || !contextMenu || !desktopArea) return;
        desktopArea.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const items = [
                { label: 'Refresh', action: () => console.log('Refresh desktop...') },
                { separator: true },
                { label: 'Change Background', action: changeDesktopBackground },
                { label: 'New Folder', action: () => alert('New Folder created (not really)') },
                { separator: true },
                { label: 'Properties', action: () => alert('Desktop Properties (not implemented)') }
            ];
            showContextMenu(e.clientX, e.clientY, items);
        });
        document.addEventListener('click', () => hideContextMenu());
    }

    function showContextMenu(x, y, items) {
        if (state.isMobile || !contextMenu) return;
        contextMenu.innerHTML = '';
        items.forEach(item => {
            if (item.separator) {
                const sep = document.createElement('div');
                sep.className = 'context-menu-separator';
                contextMenu.appendChild(sep);
            } else {
                const menuItem = document.createElement('div');
                menuItem.className = 'context-menu-item';
                menuItem.textContent = item.label;
                if (item.disabled) menuItem.classList.add('disabled');
                else menuItem.onclick = () => { item.action(); hideContextMenu(); };
                contextMenu.appendChild(menuItem);
            }
        });
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.style.display = 'block';
        contextMenu.style.zIndex = state.nextZIndex + 2; // Above start menu
    }

    function hideContextMenu() {
        if (contextMenu) contextMenu.style.display = 'none';
    }

    function changeDesktopBackground() {
        if (state.isMobile || !desktop) return;
        state.currentBackgroundIndex = (state.currentBackgroundIndex + 1) % state.desktopBackgrounds.length;
        desktop.style.backgroundColor = state.desktopBackgrounds[state.currentBackgroundIndex];
        // If using images: desktop.style.backgroundImage = `url(${state.desktopBackgrounds[state.currentBackgroundIndex]})`;
        console.log(`Background changed to: ${state.desktopBackgrounds[state.currentBackgroundIndex]}`);
    }

    // --- Email Client Logic (Largely Desktop Focus) ---
    const emailData = {
        inbox: [
            { id: 'email1', sender: 'Wedding Planner Pro', subject: 'Final Checklist for the Big Day!', body: 'Dear O&M,\nPlease find attached the final checklist. Make sure everything is green!\nBest,\nClippy 2.0', date: 'Aug 1, 2025', read: false },
            { id: 'email2', sender: 'Aunt Mildred', subject: 'Re: RSVP - Can I bring my cat?', body: 'Hello darlings,\nSo excited! Just wondering if Whiskers can come too? He is very well behaved.\nLove,\nAunt Mildred', date: 'Jul 28, 2025', read: true },
            { id: 'email3', sender: 'DJ BeatMaster Flex', subject: 'Song Request Confirmation', body: 'Got your request for \'Macarena\'. Are you SURE about this one? It might clear the dance floor... or start a riot.\nFlex', date: 'Jul 30, 2025', read: false }
        ],
        outbox: [],
        sent: [
            { id: 'sent1', recipient: 'catering@example.com', subject: 'Final Guest Count', body: 'Hi Team,\nConfirming 120 guests for August 3rd.\nThanks!', date: 'Jul 15, 2025' }
        ],
        spam: [
            { id: 'spam1', sender: 'Nigerian Prince', subject: 'URGENT Business Proposal!!!', body: 'I have $10,000,000 USD for you...', date: 'Jul 20, 2025', read: false }
        ]
    };
    let currentEmailFolder = 'inbox', selectedEmailId = null;

    function initEmail() { /* Data is now part of emailData const */ }

    function switchFolder(folderName, clickedElement) {
        if (state.isMobile) return; // Email client is complex, better for desktop
        currentEmailFolder = folderName;
        selectedEmailId = null;
        document.querySelectorAll('.email-nav .folder').forEach(f => f.classList.remove('active'));
        if (clickedElement) clickedElement.classList.add('active');

        const emailListEl = document.getElementById('email-list');
        const emailContentEl = document.getElementById('email-content');
        if (!emailListEl || !emailContentEl) return;

        emailListEl.innerHTML = '';
        emailContentEl.innerHTML = '<p style="padding: 20px; text-align: center;">Select an email to read.</p>';

        const emails = emailData[folderName] || [];
        if (emails.length === 0) {
            emailListEl.innerHTML = '<p style="padding:10px; text-align:center; color:grey;">This folder is empty.</p>';
            return;
        }
        emails.forEach(email => {
            const item = document.createElement('div');
            item.className = 'email-item';
            if (!email.read && folderName === 'inbox') item.style.fontWeight = 'bold';
            item.textContent = `${email.sender || email.recipient}: ${email.subject}`;
            item.onclick = () => {
                displayEmailContent(email);
                email.read = true;
                item.style.fontWeight = 'normal';
                document.querySelectorAll('.email-item.selected').forEach(s => s.classList.remove('selected'));
                item.classList.add('selected');
                selectedEmailId = email.id;
            };
            emailListEl.appendChild(item);
        });
    }

    function displayEmailContent(email) {
        if (state.isMobile) return;
        const contentEl = document.getElementById('email-content');
        if (!contentEl) return;
        contentEl.innerHTML = `
            <div style="padding:5px 10px; border-bottom:1px solid #ccc;"><strong>From:</strong> ${email.sender || 'Me'}</div>
            <div style="padding:5px 10px; border-bottom:1px solid #ccc;"><strong>To:</strong> ${email.recipient || 'Me'}</div>
            <div style="padding:5px 10px; border-bottom:1px solid #ccc;"><strong>Subject:</strong> ${email.subject}</div>
            <div style="padding:5px 10px; border-bottom:1px solid #ccc;"><strong>Date:</strong> ${email.date}</div>
            <div style="padding:15px; white-space:pre-wrap; word-wrap:break-word;">${email.body}</div>
        `;
    }

    window.sendEmail = (confirm) => {
        const subject = confirm ? "Wedding RSVP: YES!" : "Wedding RSVP: Regretfully No";
        const body = confirm ?
            "Dear Oliwia & Maks,\n\nWe'd be delighted to attend your wedding on August 3rd!\n\nLooking forward to celebrating with you!\n\nBest regards,\n[Your Name(s)]"
            :
            "Dear Oliwia & Maks,\n\nThank you so much for the invitation. Unfortunately, we won't be able to make it to your wedding on August 3rd.\n\nWe'll be thinking of you and wish you all the best on your special day!\n\nSincerely,\n[Your Name(s)]";
        const mailtoLink = `mailto:oliwia.maks.wedding@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoLink, '_blank');
        alert(confirm ? 'Great! Your email client should open. Please personalize and send.' : 'Understood. Your email client should open to send your regrets.');
    };

    window.sendEmailMessage = () => {
        if (state.isMobile) { alert("Email composition is best on desktop."); return; }
        alert("Opening your default email client to compose a new message... (Simulation)");
        // In a real scenario, you might open a new window or a mailto link for a new message.
        // For this sim, we'll just add a dummy to outbox and then "send" it.
        const newEmail = { id: `out${Date.now()}`, recipient: 'recipient@example.com', subject: 'New Message', body: 'Type your message here...', date: new Date().toLocaleDateString() };
        emailData.outbox.unshift(newEmail);
        switchFolder('outbox', document.getElementById('folder-outbox'));
        setTimeout(() => {
            if (emailData.outbox.length > 0) {
                const sentEmail = emailData.outbox.pop();
                sentEmail.id = `sent${Date.now()}`;
                emailData.sent.unshift(sentEmail);
                alert(`Message "${sentEmail.subject}" has been "sent"!`);
                if (currentEmailFolder === 'outbox') switchFolder('outbox', document.getElementById('folder-outbox'));
                if (currentEmailFolder === 'sent') switchFolder('sent', document.getElementById('folder-sent'));
            }
        }, 2000);
    };

    // --- Recycle Bin Logic (Desktop only) ---
    function updateRecycleBinIcon() {
        if (state.isMobile) return;
        const rbIcon = document.getElementById('recycle-bin-image');
        if (rbIcon) {
            rbIcon.src = state.recycleBinItems.length > 0 ?
                'icons/All [Without duplicates]/Recycle Bin with torned document and program.ico' :
                'icons/All [Without duplicates]/Recycle Bin (empty).ico';
        }
    }

    function updateRecycleBinWindowContent() {
        if (state.isMobile) return;
        const listEl = document.getElementById('recycle-bin-list');
        if (!listEl) return;
        listEl.innerHTML = '';
        if (state.recycleBinItems.length === 0) {
            listEl.innerHTML = '<li>Recycle Bin is empty.</li>';
            return;
        }
        state.recycleBinItems.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `<img src="${item.icon || state.defaultIcon}" alt=""> ${item.name}`;
            li.onclick = () => {
                listEl.querySelectorAll('li.selected').forEach(s => s.classList.remove('selected'));
                li.classList.add('selected');
            };
            li.ondblclick = () => {
                if (confirm(`Restore "${item.name}"?`)) {
                    restoreRecycleBinItem(item.id);
                }
            };
            listEl.appendChild(li);
        });
    }

    window.emptyRecycleBin = () => {
        if (state.isMobile) return;
        if (state.recycleBinItems.length === 0) {
            alert("Recycle Bin is already empty."); return;
        }
        if (confirm(`Are you sure you want to permanently delete these ${state.recycleBinItems.length} items?`)) {
            state.recycleBinItems = [];
            updateRecycleBinIcon();
            updateRecycleBinWindowContent();
            alert("Recycle Bin emptied.");
        }
    };

    function deleteDesktopIcon(iconElement) {
        if (state.isMobile || !iconElement || !iconElement.id) return;
        const iconName = iconElement.querySelector('div').textContent;
        const iconSrc = iconElement.querySelector('img').src;
        // Find the base icon name from src (e.g. Document.ico from a full path)
        const baseIcon = iconSrc.substring(iconSrc.lastIndexOf('/') + 1);
        let actualIconPath = state.defaultIcon;
        // Try to find a matching icon in the known icons list for better representation
        for (const key in state.explorerWindowContents) {
            if (state.explorerWindowContents[key].items) {
                const found = state.explorerWindowContents[key].items.find(i => i.icon.endsWith(baseIcon));
                if (found) { actualIconPath = found.icon; break; }
            }
        }

        state.recycleBinItems.push({
            id: `rb_${Date.now()}`,
            originalId: iconElement.id,
            name: iconName,
            icon: actualIconPath,
            type: iconElement.dataset.windowId ? 'application_shortcut' : (iconElement.dataset.imgSrc ? 'image_shortcut' : 'file_shortcut'),
            originalPosition: { top: iconElement.style.top, left: iconElement.style.left },
            originalDataset: { ...iconElement.dataset } // Store data attributes
        });
        iconElement.remove();
        updateRecycleBinIcon();
        updateRecycleBinWindowContent(); // If recycle bin window is open
        alert(`"${iconName}" sent to Recycle Bin.`);
    }

    function restoreRecycleBinItem(itemId) {
        if (state.isMobile) return;
        const itemIndex = state.recycleBinItems.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return;

        const itemToRestore = state.recycleBinItems.splice(itemIndex, 1)[0];

        const newIcon = document.createElement('div');
        newIcon.className = 'icon';
        newIcon.id = itemToRestore.originalId || `icon_${Date.now()}`;
        newIcon.innerHTML = `<img src="${itemToRestore.icon}" alt="Icon" class="icon-img"><div>${itemToRestore.name}</div>`;
        newIcon.style.top = itemToRestore.originalPosition?.top || '50px';
        newIcon.style.left = itemToRestore.originalPosition?.left || '50px';

        // Restore data attributes
        if (itemToRestore.originalDataset) {
            for (const key in itemToRestore.originalDataset) {
                newIcon.dataset[key] = itemToRestore.originalDataset[key];
            }
        }

        if (desktopArea) desktopArea.appendChild(newIcon);
        // Re-attach listeners for the new icon
        newIcon.addEventListener('dblclick', () => handleIconDoubleClick(newIcon));
        newIcon.addEventListener('click', (e) => { e.stopPropagation(); selectIcon(newIcon); });
        makeIconDraggable(newIcon);

        updateRecycleBinIcon();
        updateRecycleBinWindowContent();
        alert(`"${itemToRestore.name}" restored.`);
    }

    // --- Internet Explorer Logic (Desktop only) ---
    function initIEWindow() {
        if (state.isMobile) return;
        const urlInput = document.getElementById('ie-url');
        if (urlInput && state.ieHistory.length > 0) {
            urlInput.value = state.ieHistory[state.ieHistoryIndex];
        } else if (urlInput) {
            urlInput.value = 'about:blank'; // Default page
        }
        updateIEButtons();
        updateIEHistorySelect();
    }

    function initIEBookmarks() {
        if (state.isMobile) return;
        const dropdown = document.getElementById('ie-favorites-dropdown');
        if (!dropdown) return;
        dropdown.innerHTML = ''; // Clear existing
        state.ieBookmarks.forEach(bm => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.textContent = bm.name;
            item.onclick = () => { document.getElementById('ie-url').value = bm.url; window.ieGo(); };
            dropdown.appendChild(item);
        });
    }

    function ieCanGoBack() { return state.ieHistoryIndex > 0; }
    function ieCanGoForward() { return state.ieHistoryIndex < state.ieHistory.length - 1; }

    function updateIEButtons() {
        if (state.isMobile) return;
        const backBtn = document.querySelector('.ie-toolbar button[onclick="ieGoBack()"]');
        const fwdBtn = document.querySelector('.ie-toolbar button[onclick="ieGoForward()"]');
        if (backBtn) backBtn.disabled = !ieCanGoBack();
        if (fwdBtn) fwdBtn.disabled = !ieCanGoForward();
    }

    function updateIEHistorySelect() {
        if (state.isMobile) return;
        const selectEl = document.getElementById('ie-history-select');
        if (!selectEl) return;
        selectEl.innerHTML = '<option value="">-- Visited Sites --</option>';
        state.ieHistory.forEach((url, index) => {
            const option = document.createElement('option');
            option.value = url;
            option.textContent = url.length > 50 ? url.substring(0, 47) + '...' : url;
            if (index === state.ieHistoryIndex) option.selected = true;
            selectEl.appendChild(option);
        });
    }

    window.ieGo = (directUrl = null) => {
        if (state.isMobile) { alert("Internet Fun is a desktop feature!"); return; }
        const urlInput = document.getElementById('ie-url');
        const iframe = document.getElementById('ie-iframe');
        if (!urlInput || !iframe) return;

        let url = directUrl || urlInput.value.trim();
        if (!url) {
            if (state.ieHistory.length > 0 && state.ieHistory[state.ieHistoryIndex]) {
                url = state.ieHistory[state.ieHistoryIndex];
            } else {
                iframe.src = 'about:blank';
                urlInput.value = '';
                return;
            }
        }
        urlInput.value = url;
        if (!url.match(/^(?:f|ht)tps?:\/\//) && !url.startsWith('about:') && !url.startsWith('mailto:')) {
            url = 'http://' + url;
            urlInput.value = url; // Update input if we prefixed http
        }

        // Manage history
        if (state.ieHistoryIndex < state.ieHistory.length - 1) {
            state.ieHistory = state.ieHistory.slice(0, state.ieHistoryIndex + 1);
        }
        if (state.ieHistory[state.ieHistory.length - 1] !== url) {
            state.ieHistory.push(url);
        }
        state.ieHistoryIndex = state.ieHistory.length - 1;

        try {
            iframe.src = 'about:blank'; // Clear previous content to avoid issues
            setTimeout(() => { iframe.src = url; }, 50); // Small delay for src to register
        } catch (e) {
            console.error("IE navigation error:", e);
            iframe.src = 'about:blank';
            try {
                (iframe.contentDocument || iframe.contentWindow.document).body.innerHTML = 
                `<p style="padding:20px; font-family:Arial,sans-serif;">Could not load page: ${url}<br>Error: ${e.message}</p>`;
            } catch (innerErr) { /* ignore */ }
        }
        updateIEButtons();
        updateIEHistorySelect();
    };

    window.ieGoBack = () => { if (ieCanGoBack()) { state.ieHistoryIndex--; window.ieGo(state.ieHistory[state.ieHistoryIndex]); } };
    window.ieGoForward = () => { if (ieCanGoForward()) { state.ieHistoryIndex++; window.ieGo(state.ieHistory[state.ieHistoryIndex]); } };
    window.ieHistorySelect = () => {
        const selectEl = document.getElementById('ie-history-select');
        if (selectEl && selectEl.value) {
            const selectedIndex = state.ieHistory.indexOf(selectEl.value);
            if (selectedIndex !== -1) {
                state.ieHistoryIndex = selectedIndex;
                window.ieGo(state.ieHistory[state.ieHistoryIndex]);
            }
        }
    };

    // --- Picture Viewer Logic (Desktop only) ---
    window.openPicture = (src, title) => {
        if (state.isMobile) { alert("Image viewer is best on desktop."); return; }
        openWindow('picture1-window', { imgSrc: src, imgTitle: title });
    };

    // --- My Computer / Explorer Logic (Desktop only) ---
    function initMyComputer() {
        if (state.isMobile) return;
        document.querySelectorAll('#mycomputer-window .drive[data-drive-id]').forEach(drive => {
            drive.ondblclick = () => {
                const driveId = drive.dataset.driveId;
                const opensWindow = drive.dataset.opensWindow;
                if (opensWindow) {
                    openWindow(opensWindow);
                } else if (state.explorerWindowContents[driveId]) {
                    const data = state.explorerWindowContents[driveId];
                    openExplorerWindow(driveId, data.title, data.icon, data.items);
                } else {
                    alert(`Drive ${driveId} not found or action not configured.`);
                }
            };
        });
    }

    function initControlPanel() {
        if (state.isMobile) return;
        document.querySelectorAll('#controlpanel-window .folder-item[data-opens-explorer]').forEach(item => {
            item.ondblclick = () => {
                const explorerId = item.dataset.opensExplorer;
                const title = item.dataset.explorerTitle || 'Explorer';
                const icon = item.dataset.explorerIcon || state.defaultIcon;
                const contentData = state.explorerWindowContents[explorerId];
                if (contentData && contentData.items) {
                    openExplorerWindow(explorerId, title, icon, contentData.items);
                } else {
                    openExplorerWindow(explorerId, title, icon, [{ name: 'Contents not available.', icon: 'icons/All [Without duplicates]/Error.ico', type: 'message' }]);
                }
            };
        });
    }

    window.openExplorerWindow = (id, title, titleIconSrc, items) => {
        if (state.isMobile) return;
        const explorerWin = document.getElementById('explorer-window');
        if (!explorerWin) return;

        const titleIconEl = explorerWin.querySelector('#explorer-title-icon');
        const titleTextEl = explorerWin.querySelector('#explorer-title-text');
        const contentEl = explorerWin.querySelector('#explorer-content');

        if (titleIconEl) titleIconEl.src = titleIconSrc || state.defaultIcon;
        if (titleTextEl) titleTextEl.textContent = title;
        if (contentEl) {
            contentEl.innerHTML = ''; // Clear previous
            if (items && items.length > 0) {
                const grid = document.createElement('div');
                grid.className = 'folder-grid'; // Re-use folder grid style
                items.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'folder-item'; // Standard folder item class
                    div.innerHTML = `<img src="${item.icon || state.defaultIcon}" alt=""><div>${item.name}</div>`;
                    if (item.type === 'message') {
                        div.onclick = () => alert(item.name);
                    } else if (item.type === 'folder') {
                        // Potentially make folders clickable to navigate further if explorer is enhanced
                        div.ondblclick = () => alert(`Opening folder: ${item.name} (not implemented further)`);
                    } else {
                        div.ondblclick = () => alert(`Opening file: ${item.name} (not implemented)`);
                    }
                    grid.appendChild(div);
                });
                contentEl.appendChild(grid);
            } else {
                contentEl.innerHTML = '<p>This folder is empty.</p>';
            }
        }
        openWindow('explorer-window', { width: '450px', height: '350px' });
    };

    // --- Sound Tray Icon (Desktop only) ---
    function initSoundTrayIcon() {
        if (state.isMobile) return;
        const soundIcon = document.querySelector('.sound-tray-icon');
        if (soundIcon) {
            soundIcon.onclick = () => openWindow('sound-control-window', { width: '250px', height: '200px' });
        }
    }

    // --- NAS Upload/Gallery Placeholders ---
    window.uploadMedia = () => {
        const fileInput = document.getElementById('file-input');
        const statusDiv = document.getElementById('upload-status');
        if (!fileInput || !statusDiv) return;

        if (fileInput.files.length === 0) {
            statusDiv.textContent = 'Please select files first.';
            return;
        }
        // This is where actual upload logic would go.
        // For now, show a placeholder message and the alternative info window.
        statusDiv.textContent = `Simulating upload of ${fileInput.files.length} file(s)... (NAS not configured).`;
        console.log("Simulated files for upload:", fileInput.files);
        setTimeout(() => {
            openWindow('hosting-info-window');
            if (state.isMobile) closeWindow('upload-window'); // Close upload window on mobile after showing info
        }, 1500);
    };

    window.loadGallery = () => {
        if (state.isMobile) { alert("Gallery view is best on desktop."); return; }
        const galleryContainer = document.getElementById('gallery-container');
        if (!galleryContainer) return;
        galleryContainer.innerHTML = '<p>Attempting to load media from NAS... (NAS not configured).</p>' +
                                   '<p style="font-size:10px; margin-top:10px;">This is a placeholder. In a real setup, images/videos from a shared location would appear here.</p>';
        // Placeholder: Add a few dummy items to show structure
        const dummyItems = [
            { name: 'Wedding_Photo_001.jpg', thumb: 'Photos/my1.jpg' },
            { name: 'Fun_Times.mp4', thumb: 'icons/All [Without duplicates]/Video.ico' }, // Placeholder video icon
            { name: 'Group_Shot.png', thumb: 'Photos/my3.jpg' }
        ];
        setTimeout(() => {
            galleryContainer.innerHTML = ''; // Clear placeholder text
            const grid = document.createElement('div');
            grid.className = 'folder-grid'; // Reuse style
            dummyItems.forEach(item => {
                const div = document.createElement('div');
                div.className = 'folder-item gallery-item'; // Add gallery-item for specific styling if needed
                div.innerHTML = `<img src="${item.thumb}" alt="${item.name}" style="width:80px; height:60px; object-fit:cover;"><div>${item.name}</div>`;
                div.onclick = () => alert(`Viewing ${item.name} (Full viewer not implemented for gallery items yet)`);
                grid.appendChild(div);
            });
            galleryContainer.appendChild(grid);
            if (grid.innerHTML === '') galleryContainer.innerHTML = '<p>No media found or NAS not responding.</p>';
        }, 2000);
    };

    // --- Minesweeper Game Logic (Desktop only) ---
    // Ensure minesweeper object is defined globally or passed correctly if it's in a separate file.
    // Assuming 'minesweeper' is a global object with init, newGame methods.
    // Initialization is now in setupDesktopMode()

    // --- Snake Game Logic (Desktop only) ---
    // Assuming 'snakeGame' is a global object.
    // Initialization is now in setupDesktopMode()

    // Expose functions to global scope if called from HTML attributes directly
    // (Better to use event listeners as done for most parts now)
    window.closeWindow = closeWindow;
    window.minimizeWindow = minimizeWindow;
    window.maximizeWindow = maximizeWindow;
    window.openWindow = openWindow;
    window.toggleStartMenu = toggleStartMenu; // For start menu items in HTML
    window.switchFolder = switchFolder; // For email client

    console.log("Event listeners and core functions set up.");
    console.log(state.isMobile ? "Running in MOBILE mode." : "Running in DESKTOP mode.");

}); // === END DOMContentLoaded ===
