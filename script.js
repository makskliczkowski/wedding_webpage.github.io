/**
 * Windows 95 Style Wedding Website Script
 * Features: Draggable/Resizable Windows, Taskbar, Start Menu, Desktop Icons,
 *           Email Client Sim, Recycle Bin, IE Sim, Notepad, Minesweeper,
 *           Picture Viewer, Control Panel Sim, Mobile Fallback.
 */

// Strict mode helps catch common coding errors
"use strict";

document.addEventListener('DOMContentLoaded', () => {

    // --- Global State ---
    const state = {
        windows: {},          // Tracks open window elements and their state { element, isOpen, isMinimized, isMaximized, originalRect, beforeMinimizeRect }
        taskbarButtons: {},   // Tracks taskbar buttons by windowId
        nextZIndex: 100,      // Ensures active window is on top
        activeWindowId: null, // ID of the currently focused window
        isMobile: window.innerWidth <= 768,
        iconGridSize: 80,     // For desktop icon snapping (must match CSS)
        defaultIcon: 'icons/All [Without duplicates]/Document.ico', // Fallback icon
        // Initial Recycle Bin items (add originalId if they correspond to a deletable desktop icon)
        recycleBinItems: [
            { id: 'rb_doc_1', originalId: null, name: 'Wedding Vows Draft 1.doc', icon: 'icons/All [Without duplicates]/Document.ico', type: 'file' },
            { id: 'rb_jpg_2', originalId: null, name: 'Bad Selfie.jpg', icon: 'icons/All [Without duplicates]/Drawing red picture.ico', type: 'file' },
            { id: 'rb_folder_3', originalId: null, name: 'Old Projects', icon: 'icons/All [Without duplicates]/Folder.ico', type: 'folder' },
            { id: 'rb_pdf_4', originalId: null, name: 'IKEA Manual (Failed).pdf', icon: 'icons/All [Without duplicates]/Help page.ico', type: 'file' },
        ],
        ieHistory: [],        // Browser history URLs
        ieHistoryIndex: -1,   // Current position in history
        // Predefined desktop backgrounds for cycling
        desktopBackgrounds: [
            '#008080', // Default Teal
            '#000000', // Black
            '#55AAAA', // Lighter Teal
            // Add image paths if you have background images
            // 'url(Photos/your_wedding_bg_1.jpg)',
            // 'url(Photos/your_wedding_bg_2.jpg)',
        ],
        currentBackgroundIndex: 0, // Starting background
        // Content definitions for the generic explorer window
        explorerWindowContents: {
            'C': { title: 'Local Disk (C:)', icon: 'icons/All [Without duplicates]/Drive.ico', items: [ {name: 'Program Files', icon:'icons/All [Without duplicates]/Folder.ico', type:'folder'}, {name: 'Windows', icon:'icons/All [Without duplicates]/Folder (Windows).ico', type:'folder'}, {name: 'My Documents', icon:'icons/All [Without duplicates]/Folder (Favorite).ico', type:'folder'}, {name: 'config.sys', icon:'icons/All [Without duplicates]/Text file.ico', type:'file'}, {name: 'autoexec.bat', icon:'icons/All [Without duplicates]/Text file.ico', type:'file'} ] },
            'A': { title: '3½ Floppy (A:)', icon: 'icons/All [Without duplicates]/Drive (Floppy 3).ico', items: [ {name: 'Nothing here but dust bunnies.', icon:'icons/All [Without duplicates]/Help page.ico', type:'message'} ] },
            'D_Wedding': { title: 'Wedding Files (D:)', icon: 'icons/All [Without duplicates]/Drive.ico', items: [ {name: 'GuestList.xls', icon:'icons/All [Without duplicates]/Spreadsheet.ico', type:'file'}, {name: 'SeatingChart_v5_FINAL.doc', icon:'icons/All [Without duplicates]/Document.ico', type:'file'}, {name: 'Budget_Overspent.xls', icon:'icons/All [Without duplicates]/Spreadsheet (Dollar).ico', type:'file'} ] },
            'E_CD': { title: 'CD-ROM Drive (E:)', icon: 'icons/All [Without duplicates]/CD Drive.ico', items: [ {name: 'Please insert a Wedding Mix CD.', icon:'icons/All [Without duplicates]/CD Music.ico', type:'message'} ] },
            'display-props': { title: 'Display Properties', icon: 'icons/All [Without duplicates]/Desktop.ico', items: [ {name: 'Appearance: Windows 95 Classic (cannot be changed, lol)', icon:'icons/All [Without duplicates]/Paint program.ico', type:'message'}, {name: 'Screen resolution: 800x600 (recommended for nostalgia)', icon:'icons/All [Without duplicates]/Settings.ico', type:'message'} ]},
            'printers': { title: 'Printers', icon: 'icons/All [Without duplicates]/Printer (3D).ico', items: [ {name: 'No printers are installed. The cake is a lie.', icon:'icons/All [Without duplicates]/Error.ico', type:'message'} ]},
            'mouse-settings': { title: 'Mouse Properties', icon: 'icons/All [Without duplicates]/Mouse.ico', items: [ {name: 'Pointer speed: Ludicrous Speed', icon:'icons/All [Without duplicates]/Mouse.ico', type:'message'}, {name: 'Double-click speed: Set to "Are you kidding me?"', icon:'icons/All [Without duplicates]/Mouse wizard.ico', type:'message'} ]},
            'sound-settings': { title: 'Sounds', icon: 'icons/All [Without duplicates]/Sound program.ico', items: [ {name: 'Default Beep: ON (Sorry!)', icon:'icons/All [Without duplicates]/Sound (Louder).ico', type:'message'}, {name: 'Startup Sound: Win95 classic (of course)', icon:'icons/All [Without duplicates]/Sound.ico', type:'message'} ]},
            'add-remove-programs': { title: 'Add/Remove Programs', icon: 'icons/All [Without duplicates]/Program group.ico', items: [ {name: 'Hover (150MB) - Cannot remove, essential for UI.', icon:'icons/All [Without duplicates]/Help page.ico', type:'message'}, {name: 'Clippy Assistant (2KB) - Uninstall blocked by administrator.', icon:'icons/All [Without duplicates]/Agent.ico', type:'message'} ]},
        },
        // Bookmarks for IE Favorites menu
        ieBookmarks: [
            { name: "Pointer Pointer", url: "https://pointerpointer.com/" },
            { name: "Space Jam (1996 Website!)", url: "https://www.spacejam.com/1996/" },
            { name: "Google (Retro)", url: "https://google.com/webhp?nord=1&source=hp&igu=1" },
            { name: "Wedding Venue", url: "http://www.dworki-weselne.pl/dworek-separowo/" } // Example real link
        ]
    };

    // --- DOM Element References ---
    const desktop = document.querySelector('.desktop');
    const desktopArea = document.getElementById('desktop-area');
    const taskbar = document.querySelector('.taskbar');
    const startButton = document.getElementById('start-button');
    const startMenu = document.getElementById('start-menu');
    const windowButtonsContainer = document.getElementById('window-buttons-container');
    const clockElement = document.getElementById('clock');
    const contextMenu = document.getElementById('context-menu');
    const mobileOverlay = document.getElementById('mobile-overlay');

    // --- Initial Setup ---
    if (state.isMobile) {
        setupMobileMode();
    } else {
        setupDesktopMode();
    }
    initClock();
    initEmail(); // Setup email data structures
    updateRecycleBinIcon();
    updateRecycleBinWindowContent(); // Populate recycle bin content (window is hidden)
    initIEBookmarks();

    // --- Mobile/Desktop Specific Initialization ---

    function setupMobileMode() {
        console.log("Setting up Mobile Mode");
        desktop.style.display = 'none'; // Hide desktop icons container
        mobileOverlay.style.display = 'flex'; // Show mobile container
        taskbar.style.position = 'fixed'; // Keep taskbar fixed

        // Add listeners only for allowed mobile icons
        const allowedMobileIcons = ['mobile-invitation-icon', 'mobile-upload-icon'];
        mobileOverlay.querySelectorAll('.icon').forEach(icon => {
            if (allowedMobileIcons.includes(icon.id)) {
                icon.addEventListener('click', () => {
                    const windowId = icon.dataset.windowId;
                    if (windowId) {
                        openWindow(windowId);
                    }
                });
                 icon.addEventListener('touchstart', (e) => { e.preventDefault(); }, {passive: false}); // Prevent zoom on double tap
            } else {
                icon.style.opacity = '0.5'; // Visually disable others if needed
                icon.style.cursor = 'default';
            }
        });
        // Hide start button on mobile
        if (startButton) startButton.style.display = 'none';
    }

    function setupDesktopMode() {
        console.log("Setting up Desktop Mode");
        if (mobileOverlay) mobileOverlay.style.display = 'none'; // Hide mobile container
        if (desktop) desktop.style.display = 'block'; // Ensure desktop container is visible

        initDesktopIcons();
        initWindowControls(); // Attach listeners for window buttons
        initStartMenu();
        initContextMenu();
        initMyComputer(); // Add listeners for My Computer items
        initControlPanel(); // Add listeners for Control Panel items
        initSoundTrayIcon(); // Listener for tray icon

        // Initialize draggable/resizable windows
        document.querySelectorAll('.window').forEach(win => {
            makeWindowDraggable(win);
            makeWindowResizable(win);
            const winData = state.windows[win.id];
            toggleResizers(win, !(winData?.isMaximized));
            // Add data-window-id to control buttons defensively
            const winId = win.id;
            win.querySelectorAll('.window-controls button').forEach(btn => {
                if (!btn.dataset.windowId) btn.dataset.windowId = winId;
            });
        });

        // Initialize Minesweeper
        if (minesweeper) minesweeper.init('minesweeper-grid', 'mines-left', 'minesweeper-face', 'minesweeper-timer');
    }


    // --- Core Window Management ---

    function openWindow(windowId, params = {}) {
        if (state.isMobile && !['invitation-window', 'upload-window'].includes(windowId)) {
             console.log(`Window ${windowId} blocked on mobile.`);
             alert("This feature is only available on the desktop version!");
             return; // Block disallowed windows on mobile
        }

        const win = document.getElementById(windowId);
        if (!win) { console.error(`Window ${windowId} not found.`); return; }

        let windowData = state.windows[windowId];
        if (windowData?.isOpen && !windowData.isMinimized) { bringToFront(windowId); return; }

        if (!windowData) { // First open or fully closed
            windowData = { element: win, isOpen: false, isMinimized: false, isMaximized: state.isMobile, originalRect: null, beforeMinimizeRect: null };
            state.windows[windowId] = windowData;
            if (!state.isMobile) createTaskbarButton(windowId); // No taskbar buttons on mobile

            // Set initial size/position only on desktop and if not maximized by default
            if (!state.isMobile && !windowData.isMaximized) {
                const openNonMinimized = Object.values(state.windows).filter(w=>w.isOpen && !w.isMinimized && w.element.style.display !=='none');
                const offset = (openNonMinimized.length) * 20;
                const defaultWidth = '500px', defaultHeight = '400px';
                win.style.left = win.style.left || `${50 + offset}px`; // Keep existing or default
                win.style.top = win.style.top || `${50 + offset}px`;
                win.style.width = params.width || win.style.width || defaultWidth;
                win.style.height = params.height || win.style.height || defaultHeight;
            }
        }

        windowData.isOpen = true; windowData.isMinimized = false; win.style.display = 'flex';

        if (state.isMobile) {
            Object.assign(win.style, { left:'0px', top:'0px', width:'100vw', height:'100vh' });
            windowData.isMaximized = true; toggleResizers(win, false);
        } else if (windowData.isMaximized) {
            win.classList.add('maximized'); Object.assign(win.style, { left:'0px', top:'0px', width:'100vw', height:`calc(100vh - ${taskbar.offsetHeight}px)` });
            toggleResizers(win, false);
        } else {
            win.classList.remove('maximized');
            if (windowData.originalRect) { Object.assign(win.style, windowData.originalRect); } // Restore if coming from maximized
            toggleResizers(win, true);
        }

        if (!state.isMobile) updateMaximizeButtonIcon(windowId, windowData.isMaximized);
        bringToFront(windowId);

        // --- Window-Specific Actions ---
        if (windowId === 'email-window') switchFolder('inbox', document.getElementById('folder-inbox'));
        if (windowId === 'recycle-window') updateRecycleBinWindowContent();
        if (windowId === 'gallery-window') loadGallery();
        if (windowId === 'ie-widget') initIEWindow();
        if (windowId === 'picture1-window' && params.imgSrc && params.imgTitle) setupPictureWindow(win, params.imgSrc, params.imgTitle);
        if (windowId === 'notepad-window') win.querySelector('.notepad-textarea')?.focus();
        if (windowId === 'minesweeper-window' && minesweeper && !minesweeper.isInitialized()) minesweeper.newGame();
        if (windowId === 'screensaver-window') setupScreensaver(win);

        closeStartMenu(); // Close start menu whenever a window opens
    }

    function setupPictureWindow(win, src, title) {
        const imgEl = win.querySelector('#picture1-image');
        const titleEl = win.querySelector('#picture1-title');
        if(imgEl) { imgEl.src = src; imgEl.alt = title; }
        if(titleEl) titleEl.textContent = title;
        // Update title bar icon based on extension
        const titleIcon = win.querySelector('.title-bar-icon');
        if(titleIcon) {
            if (title.toLowerCase().match(/\.(png|bmp)$/i)) titleIcon.src = 'icons/All [Without duplicates]/Drawing green picture.ico';
            else if (title.toLowerCase().match(/\.(jpe?g|gif)$/i)) titleIcon.src = 'icons/All [Without duplicates]/Drawing red picture.ico';
            else titleIcon.src = 'icons/All [Without duplicates]/Picture.ico';
        }
    }

    function setupScreensaver(win) {
         if (!state.isMobile && !state.windows[win.id]?.isMaximized) {
             maximizeWindow(win.id); // Force maximize on desktop
         }
         // Close on click or keypress
         const closeHandler = () => {
             closeWindow(win.id);
             win.removeEventListener('click', closeHandler);
             document.removeEventListener('keydown', closeHandler);
         };
         win.addEventListener('click', closeHandler);
         document.addEventListener('keydown', closeHandler);
    }


    function closeWindow(windowId) {
        const winData = state.windows[windowId];
        if (winData?.element) {
            winData.element.style.display = 'none'; winData.isOpen = false;
            if (!state.isMobile) removeTaskbarButton(windowId);
            delete state.windows[windowId]; // Fully remove state on close
            if (state.activeWindowId === windowId) state.activeWindowId = null; // TODO: Activate next window?
        }
        updateRecycleBinIcon(); // Update bin icon in case files were virtually deleted/restored
    }

    function minimizeWindow(windowId) {
        const winData = state.windows[windowId];
        if (winData?.element && winData.isOpen && !winData.isMinimized) {
            // Store current position/size if not maximized and not already storing maximize rect
            if (!winData.isMaximized && !state.isMobile && !winData.originalRect) {
                winData.beforeMinimizeRect = { left:winData.element.style.left, top:winData.element.style.top, width:winData.element.style.width, height:winData.element.style.height };
            }
            winData.element.style.display = 'none'; winData.isMinimized = true;
            if (state.activeWindowId === windowId) { state.activeWindowId = null; winData.element.classList.remove('active'); }
            if (!state.isMobile) updateTaskbarButton(windowId);
        }
    }

    function restoreWindow(windowId) { // Primarily from taskbar click
        let winData = state.windows[windowId];
        if (!winData) { openWindow(windowId); return; } // Reopen if fully closed

        if (winData.isMinimized) {
            winData.element.style.display = 'flex'; winData.isMinimized = false;
            if (state.isMobile) { // Mobile always restores full screen
                winData.isMaximized = true; Object.assign(winData.element.style, {left:'0px',top:'0px',width:'100vw',height:'100vh'}); toggleResizers(winData.element, false);
            } else if (winData.isMaximized) { // Desktop restoring a maximized window
                winData.element.classList.add('maximized'); Object.assign(winData.element.style, {left:'0px',top:'0px',width:'100vw',height:`calc(100vh - ${taskbar.offsetHeight}px)`}); toggleResizers(winData.element, false);
            } else { // Desktop restoring a non-maximized window
                winData.element.classList.remove('maximized');
                // Restore from stored pre-minimize state or original (from maximize) state if available
                const restoreRect = winData.beforeMinimizeRect || winData.originalRect;
                if (restoreRect) Object.assign(winData.element.style, restoreRect);
                toggleResizers(winData.element, true);
            }
            if (!state.isMobile) updateMaximizeButtonIcon(windowId, winData.isMaximized);
            bringToFront(windowId);
        } else if (winData.isOpen) { // Window is open but not minimized (likely inactive)
            bringToFront(windowId);
        }
    }

    function maximizeWindow(windowId) {
        if (state.isMobile) return;
        const winData = state.windows[windowId];
        if (!winData?.element || !winData.isOpen || winData.isMinimized) return;
        const win = winData.element;

        if (!winData.isMaximized) {
            if (!winData.originalRect) winData.originalRect = { left:win.style.left, top:win.style.top, width:win.style.width, height:win.style.height };
            win.classList.add('maximized'); Object.assign(win.style, {left:'0px',top:'0px',width:'100vw',height:`calc(100vh - ${taskbar.offsetHeight}px)`});
            winData.isMaximized = true;
        } else {
            win.classList.remove('maximized');
            if (winData.originalRect) { Object.assign(win.style, winData.originalRect); winData.originalRect = null; }
            else { /* Fallback size/pos */ const c = Object.keys(state.windows).length||1; win.style.left=`${50+c*20}px`; win.style.top=`${50+c*20}px`; win.style.width='500px'; win.style.height='400px'; }
            winData.isMaximized = false;
        }
        updateMaximizeButtonIcon(windowId, winData.isMaximized);
        toggleResizers(win, !winData.isMaximized);
        bringToFront(windowId);
    }

    function toggleResizers(windowEl, enableSuggestion) {
        const winData = state.windows[windowEl.id];
        const actualEnable = enableSuggestion && !state.isMobile && winData && !winData.isMaximized;
        windowEl.querySelectorAll('.resizer').forEach(r => r.style.display = actualEnable ? 'block' : 'none');
    }

    function bringToFront(windowId) {
        const winData = state.windows[windowId];
        if (!winData?.element) { console.warn(`BF: ${windowId} no data.`); return; }
        if (winData.isMinimized || !winData.isOpen) { return; } // Don't activate hidden/closed windows visually

        if (state.activeWindowId && state.activeWindowId !== windowId) {
            const oldActive = state.windows[state.activeWindowId];
            if (oldActive?.element) { oldActive.element.classList.remove('active'); if(!state.isMobile) updateTaskbarButton(state.activeWindowId); }
        }
        state.nextZIndex++; winData.element.style.zIndex = state.nextZIndex;
        winData.element.classList.add('active'); state.activeWindowId = windowId;
        if(!state.isMobile) updateTaskbarButton(windowId);
        toggleResizers(winData.element, true); // Let toggleResizers check conditions
    }

    // --- Taskbar & Button Management ---
    function createTaskbarButton(windowId) {
        if (state.taskbarButtons[windowId] || state.isMobile) return;
        const win = document.getElementById(windowId); if (!win) return;
        const title = win.querySelector('.title-bar span')?.textContent || 'Window';
        const iconSrc = win.querySelector('.title-bar-icon')?.src || state.defaultIcon;
        const btn = document.createElement('button'); btn.className = 'window-button button-border-raised'; btn.dataset.windowId = windowId;
        const img = document.createElement('img'); img.src = iconSrc; img.alt = ''; btn.appendChild(img);
        const span = document.createElement('span'); span.textContent = title; btn.appendChild(span);
        btn.onclick = () => {
            const cWD = state.windows[windowId]; if (!cWD) { openWindow(windowId); return; }
            if (cWD.isMinimized) restoreWindow(windowId); else if (state.activeWindowId === windowId) minimizeWindow(windowId); else bringToFront(windowId);
        };
        windowButtonsContainer.appendChild(btn); state.taskbarButtons[windowId] = btn; updateTaskbarButton(windowId);
    }
    function removeTaskbarButton(windowId) { if (state.isMobile) return; const btn = state.taskbarButtons[windowId]; if (btn) { btn.remove(); delete state.taskbarButtons[windowId]; } }
    function updateTaskbarButton(windowId) {
        if (state.isMobile) return; const btn = state.taskbarButtons[windowId]; const winData = state.windows[windowId]; if (!btn) return;
        btn.classList.remove('active', 'minimized', 'button-border-lowered'); btn.classList.add('button-border-raised');
        if (winData?.isOpen) {
             if (winData.isMinimized) btn.classList.add('minimized');
             else if (state.activeWindowId === windowId) { btn.classList.add('active'); btn.classList.remove('button-border-raised'); btn.classList.add('button-border-lowered'); }
        }
    }

    // --- Desktop Icons & Interaction ---
    function initDesktopIcons() { // Called only in setupDesktopMode
        const currentIcons = document.querySelectorAll('.desktop > .icon'); // Select only icons directly under desktop
        currentIcons.forEach(icon => {
            icon.ondblclick = () => { // Use ondblclick for simplicity here
                const windowId = icon.dataset.windowId;
                if (windowId) { // Open associated window
                    const params = {};
                    if(icon.dataset.imgSrc) params.imgSrc = icon.dataset.imgSrc;
                    if(icon.dataset.imgTitle) params.imgTitle = icon.dataset.imgTitle;
                    openWindow(windowId, params);
                } else if (icon.dataset.imgSrc) { // Or open image in viewer if specified
                     openPicture(icon.dataset.imgSrc, icon.dataset.imgTitle || icon.querySelector('div')?.textContent || 'Image');
                }
            };
            icon.onclick = (e) => { selectIcon(icon); e.stopPropagation(); };
            icon.addEventListener('touchstart', () => { icon.dataset.dragging = 'false'; }, { passive: true });
            makeIconDraggable(icon); // Dragging only needed for desktop
        });
        desktopArea.addEventListener('click', (e) => { if (e.target === desktopArea) { deselectAllIcons(); closeStartMenu(); hideContextMenu(); } });
    }
    function selectIcon(selectedIcon) { deselectAllIcons(); selectedIcon.classList.add('selected'); }
    function deselectAllIcons() { document.querySelectorAll('.icon.selected').forEach(icon => icon.classList.remove('selected')); }
    function makeIconDraggable(icon) { /* ... (same as before) ... */
        let oX, oY, sX, sY, iD=false, hM=false;
        const oMD=(e)=>{if(e.button!==0&&e.type==='mousedown')return; iD=true;hM=false;selectIcon(icon);const t=e.touches?e.touches[0]:e;const r=icon.getBoundingClientRect();oX=t.clientX-r.left;oY=t.clientY-r.top;sX=t.clientX;sY=t.clientY;icon.style.zIndex=state.nextZIndex++;icon.style.cursor='grabbing';desktop.style.cursor='grabbing';icon.dataset.dragging='false';if(e.type==='mousedown')e.preventDefault();};
        const oMM=(e)=>{if(!iD)return; const t=e.touches?e.touches[0]:e;const cX=t.clientX,cY=t.clientY;if(!hM&&(Math.abs(cX-sX)>5||Math.abs(cY-sY)>5)){hM=true;icon.dataset.dragging='true';} if(hM){if(e.type==='touchmove')e.preventDefault();const dR=desktop.getBoundingClientRect();icon.style.left=`${cX-oX-dR.left}px`;icon.style.top=`${cY-oY-dR.top}px`;}};
        const oMU=()=>{if(!iD)return; iD=false;icon.style.zIndex=10;icon.style.cursor='pointer';desktop.style.cursor='default';if(hM){let l=parseFloat(icon.style.left),t=parseFloat(icon.style.top);const dR=desktop.getBoundingClientRect(),tH=taskbar.offsetHeight;const mL=dR.width-icon.offsetWidth,mT=dR.height-icon.offsetHeight-tH;l=Math.max(0,Math.min(l,mL));t=Math.max(0,Math.min(t,mT));icon.style.left=`${Math.round(l/state.iconGridSize)*state.iconGridSize}px`;icon.style.top=`${Math.round(t/state.iconGridSize)*state.iconGridSize}px`;}};
        icon.addEventListener('mousedown',oMD);document.addEventListener('mousemove',oMM);document.addEventListener('mouseup',oMU);
    }

    // --- Window Dragging & Resizing ---
    function makeWindowDraggable(windowEl) { /* ... (same as before) ... */
        if(state.isMobile)return; const tB=windowEl.querySelector('.title-bar');if(!tB)return; let oX,oY,iD=false;
        const sD=(e)=>{if(e.target.closest('.window-controls button'))return; const cWD=state.windows[windowEl.id];if(cWD?.isMaximized)return; iD=true;bringToFront(windowEl.id); const eP=e.touches?e.touches[0]:e;const r=windowEl.getBoundingClientRect();oX=eP.clientX-r.left;oY=eP.clientY-r.top;tB.style.cursor='grabbing';desktop.style.cursor='grabbing';if(e.type==='mousedown')e.preventDefault();};
        const dD=(e)=>{if(!iD)return; if(e.type==='touchmove')e.preventDefault();const eP=e.touches?e.touches[0]:e;const dR=desktop.getBoundingClientRect();let nL=eP.clientX-oX,nT=eP.clientY-oY; const tH=taskbar.offsetHeight;nL=Math.max(-windowEl.offsetWidth+50,Math.min(nL,dR.width-50));nT=Math.max(0,Math.min(nT,dR.height-tH-tB.offsetHeight));windowEl.style.left=`${nL}px`;windowEl.style.top=`${nT}px`;};
        const eD=()=>{if(iD){iD=false;tB.style.cursor='grab';desktop.style.cursor='default';}};
        tB.addEventListener('mousedown',sD);document.addEventListener('mousemove',dD);document.addEventListener('mouseup',eD); tB.addEventListener('touchstart',sD,{passive:false});document.addEventListener('touchmove',dD,{passive:false});document.addEventListener('touchend',eD);
    }
    function makeWindowResizable(windowEl) { /* ... (same as before) ... */
        if(state.isMobile)return; const R=windowEl.querySelectorAll('.resizer'); let iR=false,cR=null,sX,sY,sW,sH,sL,sT;
        const sRS=(e)=>{const cWD=state.windows[windowEl.id];if(cWD?.isMaximized)return; iR=true;cR=e.target;bringToFront(windowEl.id); const eP=e.touches?e.touches[0]:e;const r=windowEl.getBoundingClientRect();sX=eP.clientX;sY=eP.clientY;sW=r.width;sH=r.height;sL=parseFloat(getComputedStyle(windowEl).left);sT=parseFloat(getComputedStyle(windowEl).top); windowEl.style.userSelect='none';document.body.style.cursor=getComputedStyle(cR).cursor;e.preventDefault();e.stopPropagation();};
        const dRS=(e)=>{if(!iR)return; e.preventDefault();const eP=e.touches?e.touches[0]:e;const dX=eP.clientX-sX,dY=eP.clientY-sY;let nW=sW,nH=sH,nL=sL,nT=sT; const mW=parseInt(getComputedStyle(windowEl).minWidth)||150,mH=parseInt(getComputedStyle(windowEl).minHeight)||100; if(cR.classList.contains('resizer-e')||cR.classList.contains('resizer-ne')||cR.classList.contains('resizer-se')){nW=Math.max(mW,sW+dX);} if(cR.classList.contains('resizer-w')||cR.classList.contains('resizer-nw')||cR.classList.contains('resizer-sw')){const pW=sW-dX;if(pW>=mW){nW=pW;nL=sL+dX;}else{nW=mW;nL=sL+(sW-mW);}} if(cR.classList.contains('resizer-s')||cR.classList.contains('resizer-se')||cR.classList.contains('resizer-sw')){nH=Math.max(mH,sH+dY);} if(cR.classList.contains('resizer-n')||cR.classList.contains('resizer-ne')||cR.classList.contains('resizer-nw')){const pH=sH-dY;if(pH>=mH){nH=pH;nT=sT+dY;}else{nH=mH;nT=sT+(sH-mH);}} windowEl.style.width=`${nW}px`;windowEl.style.height=`${nH}px`;windowEl.style.left=`${nL}px`;windowEl.style.top=`${nT}px`;};
        const eRS=()=>{if(iR){iR=false;windowEl.style.userSelect='';document.body.style.cursor='default';}};
        R.forEach(r=>{r.addEventListener('mousedown',sRS);r.addEventListener('touchstart',sRS,{passive:false});}); document.addEventListener('mousemove',dRS);document.addEventListener('mouseup',eRS);document.addEventListener('touchmove',dRS,{passive:false});document.addEventListener('touchend',eRS);
    }

    // --- Window Control Button Listeners ---
    function initWindowControls() { // Handles clicks on minimize, maximize, close
        desktop.addEventListener('click', (e) => {
            const button = e.target.closest('.window-controls button'); if (!button) return;
            const windowEl = button.closest('.window'); if (!windowEl) return;
            const windowId = windowEl.id; let winData = state.windows[windowId];

            // Defensively check/sync state if button is clickable but state seems off
            if ((!winData || !winData.isOpen) && getComputedStyle(windowEl).display !== 'none') {
                console.warn(`Ctrl btn ${windowId} state issue. Syncing.`);
                if (!winData) { state.windows[windowId] = {element:windowEl, isMinimized:false, isMaximized:windowEl.classList.contains('maximized'), isOpen:true, originalRect:null}; winData = state.windows[windowId]; if (!state.isMobile && !state.taskbarButtons[windowId]) createTaskbarButton(windowId); }
                else { winData.isOpen = true; winData.isMinimized = false; }
                bringToFront(windowId); if (!state.isMobile) updateMaximizeButtonIcon(windowId, winData.isMaximized);
            }
            if (!winData?.isOpen) { console.error(`Cannot ctrl ${windowId}, state bad.`); return; }

            // Perform action
            if(button.classList.contains('close-button')) closeWindow(windowId);
            else if(button.classList.contains('minimize-button')) minimizeWindow(windowId);
            else if(button.classList.contains('maximize-button')) maximizeWindow(windowId);
        });
        // Bring window to front on click inside (not controls/resizers)
        desktop.addEventListener('mousedown', (e) => {
            const windowEl = e.target.closest('.window');
            if (windowEl && !state.isMobile && !e.target.closest('.window-controls button') && !e.target.closest('.resizer')) {
                const winData = state.windows[windowEl.id]; if (winData?.isOpen && state.activeWindowId !== windowEl.id) bringToFront(windowEl.id);
            }
        }, true); // Use capture phase
    }

    // --- Start Menu Logic ---
    function initStartMenu() {
        if (state.isMobile || !startButton || !startMenu) return; // No start menu on mobile
        startButton.addEventListener('click', (e) => { toggleStartMenu(); e.stopPropagation(); });
        document.addEventListener('click', (e) => { if (startMenu.classList.contains('active') && !startMenu.contains(e.target) && e.target !== startButton) closeStartMenu(); });
        startMenu.addEventListener('click', (e) => { e.stopPropagation(); const linkItem = e.target.closest('a'); if (linkItem && !linkItem.closest('li.has-submenu')) { closeStartMenu(); /* Let onclick handle window opening */ }});
        // Ensure submenus stay open on hover
        startMenu.querySelectorAll('.has-submenu').forEach(item => {
            item.addEventListener('mouseenter', () => {
                const submenu = item.querySelector('ul');
                if (submenu) submenu.style.display = 'block';
            });
            item.addEventListener('mouseleave', () => {
                 const submenu = item.querySelector('ul');
                 if (submenu) submenu.style.display = 'none';
            });
        });
    }
    function toggleStartMenu() { const isActive = startMenu.classList.toggle('active'); startButton.classList.toggle('active',isActive); startButton.classList.toggle('button-border-lowered',isActive); startButton.classList.toggle('button-border-raised',!isActive); if(isActive){ deselectAllIcons(); hideContextMenu(); }}
    function closeStartMenu() { if(startMenu){ startMenu.classList.remove('active'); startButton.classList.remove('active'); startButton.classList.remove('button-border-lowered'); startButton.classList.add('button-border-raised'); startMenu.querySelectorAll('ul').forEach(ul => ul.style.display = 'none'); /* Close submenus */}}

    // --- Clock Logic ---
    function initClock() { const uC=()=>{const n=new Date(),h=n.getHours().toString().padStart(2,'0'),m=n.getMinutes().toString().padStart(2,'0');if(clockElement)clockElement.textContent=`${h}:${m}`;}; uC();setInterval(uC,30000); }

    // --- Context Menu Logic ---
    function initContextMenu() {
        if (state.isMobile) return;
        desktopArea.addEventListener('contextmenu', (e) => {
            e.preventDefault(); hideContextMenu(); closeStartMenu();
            const target = e.target; let menuItems = []; const iconTarget = target.closest('.icon'), windowTitleBarTarget = target.closest('.title-bar');
            if (iconTarget) { // Icon context
                selectIcon(iconTarget); const windowId = iconTarget.dataset.windowId;
                const canDelete = !['recycle-icon', 'mycomputer-icon', 'controlpanel-icon'].includes(iconTarget.id);
                menuItems.push({ label: 'Open', action: () => { if (windowId) { openWindow(windowId, { imgSrc: iconTarget.dataset.imgSrc, imgTitle: iconTarget.dataset.imgTitle }); } else if (iconTarget.dataset.imgSrc) { openPicture(iconTarget.dataset.imgSrc, iconTarget.dataset.imgTitle || iconTarget.querySelector('div')?.textContent || 'Image'); } } });
                menuItems.push({ type: 'separator' });
                if (iconTarget.id === 'recycle-icon') menuItems.push({ label: 'Empty Recycle Bin', action: emptyRecycleBin, disabled: state.recycleBinItems.length === 0 });
                else { menuItems.push({ label: 'Cut', disabled: true }); menuItems.push({ label: 'Copy', disabled: true }); }
                menuItems.push({ type: 'separator' });
                menuItems.push({ label: 'Delete', action: () => deleteDesktopIcon(iconTarget), disabled: !canDelete });
                menuItems.push({ label: 'Properties', action: () => alert(`Properties for ${iconTarget.querySelector('div')?.textContent || 'Item'}`), disabled: true });
            } else if (windowTitleBarTarget) { // Window title bar context
                const windowEl = windowTitleBarTarget.closest('.window'); if (windowEl && state.windows[windowEl.id]) {
                    const winData = state.windows[windowEl.id]; menuItems.push({ label:'Restore', action:()=>maximizeWindow(windowEl.id), disabled:!winData.isMaximized }); menuItems.push({ label:'Move', disabled:winData.isMaximized }); menuItems.push({ label:'Size', disabled:winData.isMaximized }); menuItems.push({ label:'Minimize', action:()=>minimizeWindow(windowEl.id) }); menuItems.push({ label:'Maximize', action:()=>maximizeWindow(windowEl.id), disabled:winData.isMaximized }); menuItems.push({ type:'separator' }); menuItems.push({ label:'Close', action:()=>closeWindow(windowEl.id) });
                }
            } else if (e.target === desktopArea) { // Desktop background context
                menuItems.push({ label: 'Arrange Icons', disabled: true }); menuItems.push({ label: 'Line up Icons', disabled: true }); menuItems.push({ type: 'separator' });
                menuItems.push({ label: 'Change Background', action: changeDesktopBackground });
                menuItems.push({ type: 'separator' });
                menuItems.push({ label: 'New', disabled: true }); menuItems.push({ type: 'separator' });
                menuItems.push({ label: 'Properties', action: () => openExplorerWindow('display-props', 'Display Properties', 'icons/All [Without duplicates]/Desktop.ico', state.explorerWindowContents['display-props'].items) });
            }
            if (menuItems.length > 0) showContextMenu(e.clientX, e.clientY, menuItems);
        });
        document.addEventListener('click', hideContextMenu); contextMenu.addEventListener('click', (e) => e.stopPropagation());
    }
    function showContextMenu(x,y,items){/*...(same)...*/} function hideContextMenu() { if(contextMenu) contextMenu.style.display = 'none'; }
    function changeDesktopBackground() { state.currentBackgroundIndex = (state.currentBackgroundIndex + 1) % state.desktopBackgrounds.length; const newBg = state.desktopBackgrounds[state.currentBackgroundIndex]; if (newBg.startsWith('url(')) { desktopArea.style.backgroundImage = newBg; desktopArea.style.backgroundColor = ''; } else { desktopArea.style.backgroundColor = newBg; desktopArea.style.backgroundImage = ''; } }

    // --- Email Client Logic ---
    const emailData = { /* ... (As defined in previous response) ... */
        inbox: [{ id: "inv001", subject: "Your Wedding Invitation!", from: "Oliwia & Maks", read: false, content: "Dearest Friends & Family,\n\nWe are thrilled to invite you to celebrate our wedding!\nDate: August 3, 2025\nTime: 17:00\nVenue: Dworek Separowo (Separowo 8, 62-066 Separowo)\n\nPlease RSVP by May 1, 2025, by replying to this email or clicking the buttons in the Invitation.txt program on the desktop.\n\nWe can't wait to share our special day with you!\n\nWarmly,\nOliwia & Maks" },{ id: "welc001", subject: "Welcome to Outlook Express - Wedding Edition!", from: "Microsoft", read: true, content: "Congratulations on your upcoming nuptials!\n\nThis special edition of Outlook Express is designed to handle all your wedding-related e-correspondence. Please note: Clippy has been specially trained to offer unsolicited (but enthusiastic) wedding advice.\n\nHappy emailing!\n\nThe Microsoft Team (and Clippy)" },{ id: "photo001", subject: "Photo Booth Test Shots", from: "Photographer@example.com", read: true, content: "Hi Oliwia & Maks,\n\nAttached are some test shots from the photo booth setup. Looks great!\n\n[Attachment: test_shot1.jpg (simulation)]\n[Attachment: test_shot2.jpg (simulation)]\n\nBest,\nYour Friendly Photographer" }],
        outbox: [{ id: "out001", subject: "RE: Catering Final Numbers", to: "caterer@example.com", read: false, content: "Hi Chef,\n\nJust confirming the final guest count is 120. Can't wait for the delicious food!\n\nBest,\nO&M\n\n(This email is waiting to be 'sent'. Click Send/Receive!)" },{ id: "out002", subject: "DJ Song Requests", to: "djcool@example.com", read: false, content: "Hey DJ Cool,\n\nPlease add these to the playlist:\n- Never Gonna Give You Up - Rick Astley\n- Macarena (just kidding... or are we?)\n- Bohemian Rhapsody - Queen\n\nThanks!\n\n(This email is also stuck in the outbox!)" }],
        sent: [{ id: "sent001", subject: "RE: Your Generous Gift!", to: "Aunt Carol", read: true, content: "Dear Aunt Carol,\n\nThank you so much for the beautiful crystal vase! It's absolutely stunning and we will cherish it.\n\nWe're so glad you could make it to our special day.\n\nLots of love,\nOliwia & Maks" },{ id: "sent002", subject: "Honeymoon Update from Paradise", to: "Mom & Dad", read: true, content: "Hi Mom and Dad,\n\nJust wanted to let you know we arrived safely in [Fictional Paradise Location]! The weather is amazing and we're having a fantastic time. Wish you were here (but also glad for the peace and quiet! 😉)\n\nLove you both!\n\nO&M" },{ id: "sent003", subject: "To Elon - That Inflatable Swan...", to: "elon.musk@totallyrealemail.com", read: true, content: "Mr. Musk,\n\nRegarding the giant inflatable swan for the pool party mentioned in a previous simulated email... it was a huge hit! Thanks for the inspiration.\n\nPerhaps a SpaceX branded one next time?\n\nBest,\nA Fan (O&M)"}],
        spam: [{ id: "spam001", subject: "YOU'VE WON A FREE HONEYMOON!!!", from: "Lucky Winner Dept.", read: false, content: "CONGRATULATIONS!!! You have been selected to win a FREE 7-day luxury honeymoon to a MYSTERY destination! Click HERE to claim your prize NOW! This is NOT a scam! (It totally is)." },{ id: "spam002", subject: "Enlarge Your Wedding Cake (And Other Things!)", from: "Dr. Spammy", read: false, content: "Is your wedding cake looking a bit... small? We have natural, organic solutions to make EVERYTHING bigger and better for your special day! Satisfaction 1000% guaranteed or your money back (not really)." },{ id: "spam003", subject: "Urgent: Nigerian Prince Needs Wedding Gift Help", from: "Prince Abimbola Adewale", read: false, content: "Salutations Esteemed Couple,\n\nI am Prince Abimbola Adewale of Nigeria. Due to unforeseen circumstances involving a misplaced royal dowry, I require a small loan of $5,000 to purchase an appropriate wedding gift for a distant cousin (who is also a princess). I will repay you $50,000 once my funds are released. Please send bank details.\n\nYours in Royal Desperation,\nPrince Abimbola" }]
    };
    let currentEmailFolder = 'inbox', selectedEmailId = null;
    function initEmail() { /* Data loaded above */ }
    function switchFolder(folderName, clickedElement) { /* ... (same as before, ensure onclick is set) ... */
        currentEmailFolder=folderName;const l=document.getElementById('email-list'),c=document.getElementById('email-content');if(!l||!c)return; l.innerHTML='';c.innerHTML='<p style="padding:20px;text-align:center;">Select an email to view.</p>';selectedEmailId=null;
        document.querySelectorAll('#email-window .email-nav .folder').forEach(f=>f.classList.remove('active')); if(clickedElement)clickedElement.classList.add('active'); else{const fE=document.getElementById(`folder-${folderName}`);if(fE)fE.classList.add('active');}
        const emails=emailData[folderName]||[]; if(emails.length===0){l.innerHTML='<p style="padding:10px;color:grey;font-style:italic;">This folder is empty.</p>';}
        else{emails.forEach(email=>{const i=document.createElement('div');i.className='email-item';i.dataset.emailId=email.id;i.style.fontWeight=email.read?'normal':'bold';i.textContent=`${email.subject} (From: ${email.from||email.to||'Unknown'})`;
            i.onclick=()=>{displayEmailContent(email);if(!email.read){email.read=true;i.style.fontWeight='normal';} document.querySelectorAll('#email-list .email-item.selected').forEach(it=>it.classList.remove('selected'));i.classList.add('selected');}; // This assigns the click handler
        l.appendChild(i);});}
    }
    function displayEmailContent(email) { /* ... (same as before) ... */
        selectedEmailId=email.id;const c=document.getElementById('email-content');if(!c)return;
        c.innerHTML=`<div style="padding:5px 10px;border-bottom:1px solid #ccc;"><p><strong>Subject:</strong> ${email.subject}</p><p><strong>From:</strong> ${email.from||'N/A'}</p><p><strong>To:</strong> ${email.to||'N/A'}</p></div><div style="padding:10px;white-space:pre-wrap;">${email.content.replace(/\n/g, '<br>')}</div>`;
        if(email.id==="inv001"){const bD=document.createElement('div');bD.style.marginTop='20px';bD.style.textAlign='center';bD.innerHTML=`<button class="button-border-raised" onclick="sendEmail(true)">Confirm Attendance</button><button class="button-border-raised" style="margin-left:10px;" onclick="sendEmail(false)">Decline Attendance</button>`;c.appendChild(bD);}
    }
    window.sendEmail = (confirm) => { /* ... (same as before) ... */ };
    window.sendEmailMessage = () => { /* ... (updated as before) ... */
        if(emailData.outbox.length>0){alert(`Simulating sending ${emailData.outbox.length} email(s) from Outbox...`);emailData.outbox.forEach(em=>emailData.sent.unshift({...em,to:em.to||'Unknown'}));emailData.outbox=[];if(currentEmailFolder==='outbox'||currentEmailFolder==='sent')switchFolder(currentEmailFolder,document.getElementById(`folder-${currentEmailFolder}`));}else{alert("Outbox is empty.");}};

    // --- Recycle Bin Logic ---
    function updateRecycleBinIcon() { /* ... (same as before) ... */ const iI=document.getElementById('recycle-bin-image');if(!iI)return; const isEmpty=state.recycleBinItems.length===0; iI.src=isEmpty?'icons/All [Without duplicates]/Recycle Bin (empty).ico':'icons/All [Without duplicates]/Recycle Bin with torned document and program.ico'; const tI=document.getElementById('recycle-window-title-icon');if(tI)tI.src=iI.src; }
    function updateRecycleBinWindowContent() { /* ... (updated as before for dblclick) ... */
        const list=document.getElementById('recycle-bin-list');if(!list)return;list.innerHTML='';if(state.recycleBinItems.length===0){list.innerHTML='<p style="color:grey;font-style:italic;padding:10px;">The Recycle Bin is empty.</p>';} else{state.recycleBinItems.forEach(item=>{const li=document.createElement('li');li.innerHTML=`<img src="${item.icon||state.defaultIcon}" alt="icon"> ${item.name}`;li.dataset.itemId=item.id;li.onclick=()=>{list.querySelectorAll('li.selected').forEach(s=>s.classList.remove('selected'));li.classList.add('selected');};li.ondblclick=()=>restoreRecycleBinItem(item.id);list.appendChild(li);});} updateRecycleBinIcon();
    }
    function emptyRecycleBin() { /* ... (same as before) ... */ if(state.recycleBinItems.length>0){if(confirm(`Are you sure you want to permanently delete these ${state.recycleBinItems.length} items?`)){state.recycleBinItems=[];updateRecycleBinIcon();updateRecycleBinWindowContent();alert('Recycle Bin emptied.');}}else{alert('Recycle Bin is already empty.');} hideContextMenu();}
    function deleteDesktopIcon(iconElement) { /* ... (updated as before) ... */ if(!iconElement||!iconElement.id||['recycle-icon','mycomputer-icon','controlpanel-icon'].includes(iconElement.id))return; const iN=iconElement.querySelector('div')?.textContent||'Item';const iI=iconElement.querySelector('img')?.src||state.defaultIcon;const oId=iconElement.id; if(confirm(`Send "${iN}" to Recycle Bin?`)){state.recycleBinItems.push({id:'rb_'+oId+'_'+Date.now(),originalId:oId,name:iN,icon:iI,type:'icon'});iconElement.style.display='none';updateRecycleBinIcon();if(state.windows['recycle-window']?.isOpen)updateRecycleBinWindowContent();} hideContextMenu();}
    function restoreRecycleBinItem(itemId) { /* ... (updated as before) ... */ const itemIndex=state.recycleBinItems.findIndex(i=>i.id===itemId);if(itemIndex===-1)return; const item=state.recycleBinItems[itemIndex]; if(item.type==='icon'&&item.originalId){const dI=document.getElementById(item.originalId);if(dI)dI.style.display='flex';else console.warn(`Icon ${item.originalId} not found for restore.`);} state.recycleBinItems.splice(itemIndex,1);updateRecycleBinWindowContent();updateRecycleBinIcon();alert(`"${item.name}" restored.`); }

    // --- Internet Explorer Logic ---
    function initIEWindow() { const iframe = document.getElementById('ie-iframe'), urlInput = document.getElementById('ie-url'); if (iframe && urlInput && (iframe.getAttribute('src')||'').match(/^(about:blank)?$/) && state.ieHistory.length === 0) { ieGo('https://pointerpointer.com/'); } else if (state.ieHistory.length > 0 && state.ieHistory[state.ieHistoryIndex]) { urlInput.value = state.ieHistory[state.ieHistoryIndex]; if (iframe.getAttribute('src') !== state.ieHistory[state.ieHistoryIndex]) iframe.src = state.ieHistory[state.ieHistoryIndex]; } updateIEButtons(); updateIEHistorySelect(); }
    function initIEBookmarks() { const dropdown = document.getElementById('ie-favorites-dropdown'); if (!dropdown) return; dropdown.innerHTML = ''; state.ieBookmarks.forEach(bm => { const item = document.createElement('div'); item.className = 'dropdown-item'; item.textContent = bm.name; item.onclick = () => { ieGo(bm.url); closeStartMenu(); /* Also close IE menus */ document.querySelectorAll('.menu-item .dropdown-menu').forEach(d => d.style.display='none'); }; dropdown.appendChild(item); }); }
    function ieCanGoBack(){/*...(same)...*/} function ieCanGoForward(){/*...(same)...*/}
    function updateIEButtons(){/*...(same)...*/} function updateIEHistorySelect(){/*...(same)...*/}
    window.ieGo=(dU=null)=>{/*...(same)...*/}; window.ieGoBack=()=>{/*...(same)...*/}; window.ieGoForward=()=>{/*...(same)...*/}; window.ieHistorySelect=()=>{/*...(same)...*/};

    // --- Picture Viewer Logic ---
    window.openPicture = (src, title) => { openWindow('picture1-window', { imgSrc: src, imgTitle: title }); };

    // --- My Computer / Explorer Logic ---
    function initMyComputer() { if(state.isMobile) return; const mcWin = document.getElementById('mycomputer-window'); if (!mcWin) return; mcWin.querySelectorAll('.drive').forEach(drive => { drive.ondblclick = () => { const driveId = drive.dataset.driveId; const driveName = drive.dataset.driveName; const opensWin = drive.dataset.opensWindow; if(opensWin) { openWindow(opensWin); return; } const driveData = state.explorerWindowContents[driveId]; if (driveData) openExplorerWindow(driveId, driveName, driveData.icon, driveData.items); else openExplorerWindow(driveId, driveName, state.defaultIcon, [{name:'Access denied.', icon: 'icons/All [Without duplicates]/Error.ico', type:'message'}]); }; }); }
    function initControlPanel() { if(state.isMobile) return; const cpWin = document.getElementById('controlpanel-window'); if(!cpWin) return; cpWin.querySelectorAll('.folder-item').forEach(item => { item.ondblclick = () => { const opens = item.dataset.opensExplorer; const title = item.dataset.explorerTitle; const icon = item.dataset.explorerIcon || state.defaultIcon; const contentData = state.explorerWindowContents[opens]; if (contentData?.items) openExplorerWindow(opens, title, icon, contentData.items); else openExplorerWindow(opens, title, icon, [{name:`Settings unavailable.`, icon:'icons/All [Without duplicates]/Help page.ico', type:'message'}]); }; }); }
    window.openExplorerWindow = (id, title, titleIconSrc, items) => { const expWin = document.getElementById('explorer-window'), tTxt=document.getElementById('explorer-title-text'), tIco=document.getElementById('explorer-title-icon'), cEl=document.getElementById('explorer-content'); if (!expWin || !tTxt || !tIco || !cEl) return; tTxt.textContent = title; tIco.src = titleIconSrc || state.defaultIcon; cEl.innerHTML = ''; const grid = document.createElement('div'); grid.className = 'folder-grid'; if (items?.length > 0) { items.forEach(item => { const iEl = document.createElement('div'); iEl.className = 'folder-item'; iEl.style.width = '80px'; const img = document.createElement('img'); img.src = item.icon || state.defaultIcon; img.alt = item.name; img.style.cssText = 'width:32px; height:32px; border:none;'; const nDiv = document.createElement('div'); nDiv.textContent = item.name; iEl.appendChild(img); iEl.appendChild(nDiv); if (item.type === 'folder') iEl.ondblclick = () => alert(`Opening folder: ${item.name} (simulation)`); else if (item.type === 'file') iEl.ondblclick = () => alert(`Opening file: ${item.name} (simulation)`); else if (item.type === 'message') { iEl.style.width='auto';iEl.style.textAlign='left';iEl.style.cursor='default';nDiv.style.whiteSpace='normal';} grid.appendChild(iEl); }); } else { grid.innerHTML = '<p>Folder is empty.</p>'; } cEl.appendChild(grid); openWindow('explorer-window'); };

    // --- Sound Tray Icon ---
    function initSoundTrayIcon() { const icon = document.getElementById('sound-tray-icon-clickable'); if (icon) icon.onclick = () => openWindow('sound-control-window'); }

    // --- Minesweeper Game Logic ---
    const minesweeper = {
        gridEl: null, minesLeftEl: null, faceEl: null, timerEl: null,
        rows: 9, cols: 9, mines: 10, // Beginner settings
        board: [], revealed: [], flagged: [],
        firstClick: true, gameOver: false, gameWon: false,
        timerInterval: null, time: 0, minesLeft: 0,

        isInitialized: function() { return !!this.gridEl; },

        init: function(gridId, minesLeftId, faceId, timerId) {
            if (this.isInitialized()) return; // Prevent re-init
            this.gridEl = document.getElementById(gridId);
            this.minesLeftEl = document.getElementById(minesLeftId);
            this.faceEl = document.getElementById(faceId);
            this.timerEl = document.getElementById(timerId);
            if (!this.gridEl || !this.minesLeftEl || !this.faceEl || !this.timerEl) {
                console.error("Minesweeper UI elements not found!"); return;
            }
            this.faceEl.onclick = () => this.newGame();
            // Prevent context menu on grid for flagging
            this.gridEl.oncontextmenu = (e) => e.preventDefault();
            this.newGame(); // Start first game
             // Adjust window size based on grid
            const gameWindow = document.getElementById('minesweeper-window');
            if (gameWindow) {
                const gridWidth = this.cols * 20 + 2; // Cell width + border
                const gridHeight = this.rows * 20 + 2;
                const infoHeight = 36; // Approx height of info bar
                const menuHeight = 21;
                const titleHeight = 20;
                const padding = 10; // Content padding * 2
                const borderWidth = 4; // Window border * 2
                gameWindow.style.width = `${gridWidth + padding + borderWidth}px`;
                gameWindow.style.height = `${gridHeight + infoHeight + menuHeight + titleHeight + padding + borderWidth}px`;
            }
        },

        newGame: function(rows = 9, cols = 9, mines = 10) {
            this.rows = rows; this.cols = cols; this.mines = mines;
            this.gameOver = false; this.gameWon = false; this.firstClick = true; this.time = 0;
            this.minesLeft = this.mines;
            if (this.timerInterval) clearInterval(this.timerInterval);
            this.timerInterval = null;
            this.updateUI();
            this.createBoard();
            this.renderBoard();
        },

        updateUI: function() {
            if (!this.isInitialized()) return;
            this.minesLeftEl.textContent = this.minesLeft;
            this.timerEl.textContent = this.time;
            if (this.gameOver) this.faceEl.textContent = this.gameWon ? '😎' : '😵';
            else this.faceEl.textContent = '😊';
        },

        startTimer: function() {
            if (this.timerInterval) return;
            this.timerInterval = setInterval(() => {
                this.time++;
                this.updateUI();
            }, 1000);
        },

        createBoard: function() {
            this.board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));
            this.revealed = Array(this.rows).fill(null).map(() => Array(this.cols).fill(false));
            this.flagged = Array(this.rows).fill(null).map(() => Array(this.cols).fill(false));
        },

        plantMines: function(firstClickR, firstClickC) {
            let minesToPlant = this.mines;
            while (minesToPlant > 0) {
                const r = Math.floor(Math.random() * this.rows);
                const c = Math.floor(Math.random() * this.cols);
                // Don't plant on first click or where mine already exists
                if (this.board[r][c] !== -1 && !(r === firstClickR && c === firstClickC)) {
                    this.board[r][c] = -1; // -1 represents a mine
                    minesToPlant--;
                    // Increment neighbors
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            const nr = r + dr, nc = c + dc;
                            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.board[nr][nc] !== -1) {
                                this.board[nr][nc]++;
                            }
                        }
                    }
                }
            }
        },

        renderBoard: function() {
            if (!this.gridEl) return;
            this.gridEl.innerHTML = '';
            this.gridEl.style.gridTemplateColumns = `repeat(${this.cols}, 20px)`;
            this.gridEl.style.gridTemplateRows = `repeat(${this.rows}, 20px)`;

            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    const cell = document.createElement('div');
                    cell.classList.add('mine-cell');
                    cell.dataset.r = r; cell.dataset.c = c;

                    if (this.revealed[r][c]) {
                        cell.classList.add('revealed');
                        if (this.board[r][c] === -1) {
                            cell.classList.add('mine-hit'); // Should only happen on game over reveal
                        } else if (this.board[r][c] > 0) {
                            cell.textContent = this.board[r][c];
                            cell.dataset.mines = this.board[r][c];
                        }
                    } else if (this.flagged[r][c]) {
                        cell.classList.add('flagged');
                    }

                    cell.addEventListener('click', () => this.handleClick(r, c));
                    cell.addEventListener('contextmenu', (e) => { e.preventDefault(); this.handleRightClick(r, c); });
                    this.gridEl.appendChild(cell);
                }
            }
        },

        handleClick: function(r, c) {
            if (this.gameOver || this.revealed[r][c] || this.flagged[r][c]) return;

            if (this.firstClick) {
                this.plantMines(r, c);
                this.firstClick = false;
                this.startTimer();
            }

            this.revealCell(r, c);
            this.checkWinCondition();
            this.updateUI();
        },

        handleRightClick: function(r, c) {
            if (this.gameOver || this.revealed[r][c]) return;

            if (this.flagged[r][c]) {
                this.flagged[r][c] = false;
                this.minesLeft++;
            } else {
                if (this.minesLeft > 0) {
                    this.flagged[r][c] = true;
                    this.minesLeft--;
                }
            }
            this.updateUI();
            this.renderBoard(); // Re-render to show/hide flag
        },

        revealCell: function(r, c) {
            if (r < 0 || r >= this.rows || c < 0 || c >= this.cols || this.revealed[r][c] || this.flagged[r][c]) return;

            this.revealed[r][c] = true;
            const cellEl = this.gridEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
            if (cellEl) cellEl.classList.add('revealed');

            if (this.board[r][c] === -1) {
                this.gameOver = true;
                if(cellEl) cellEl.classList.add('mine-hit');
                clearInterval(this.timerInterval);
                this.revealAllMines();
                alert("BOOM! Game Over!");
            } else if (this.board[r][c] === 0) {
                // Reveal neighbors recursively
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr !== 0 || dc !== 0) this.revealCell(r + dr, c + dc);
                    }
                }
            } else {
                 if (cellEl) {
                     cellEl.textContent = this.board[r][c];
                     cellEl.dataset.mines = this.board[r][c];
                 }
            }
        },

        revealAllMines: function() {
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    if (this.board[r][c] === -1 && !this.revealed[r][c]) {
                        this.revealed[r][c] = true; // Mark as revealed for rendering
                        const cellEl = this.gridEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
                        if(cellEl && !cellEl.classList.contains('mine-hit')) { // Avoid re-adding class to the one clicked
                           cellEl.classList.add('revealed'); // Ensure styling applies
                           cellEl.innerHTML = '💣'; // Show bomb symbol
                        }
                    }
                     // Show incorrectly flagged cells
                    if (this.board[r][c] !== -1 && this.flagged[r][c]) {
                         const cellEl = this.gridEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
                         if(cellEl) cellEl.innerHTML = '❌';
                    }
                }
            }
            this.renderBoard(); // Update the board visually
        },

        checkWinCondition: function() {
            let revealedCount = 0;
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    if (this.revealed[r][c]) revealedCount++;
                }
            }
            if (revealedCount === this.rows * this.cols - this.mines) {
                this.gameOver = true;
                this.gameWon = true;
                clearInterval(this.timerInterval);
                this.flagAllMines(); // Auto-flag remaining mines
                this.updateUI();
                alert("Congratulations! You cleared the field!");
            }
        },
         flagAllMines: function() {
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    if (this.board[r][c] === -1 && !this.flagged[r][c]) {
                        this.flagged[r][c] = true;
                        this.minesLeft = 0; // Set mines left to 0 on win
                    }
                }
            }
            this.renderBoard();
        }
    };

   // --- File Upload & Gallery Placeholders ---
   // Keep NAS functions as placeholders or implement if needed
   const NAS_BASE_URL = 'http://YOUR_NAS_IP:5000/webapi'; let synoAuthToken = null;
   async function loginToSynology(){console.warn("NAS Login not implemented/configured.");return false;}
   window.uploadMedia=async function(){alert('NAS Upload requires configuration in script.js');};
   window.loadGallery=async function(){const c=document.getElementById('gallery-container');if(c)c.innerHTML='<p>NAS Gallery requires configuration in script.js</p>';};
   const synoErrorCodes={};

}); // === END DOMContentLoaded ===
