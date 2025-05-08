/**
 * Windows 95 Style Wedding Website Script v2.0
 * Features: Draggable/Resizable Windows, Taskbar, Start Menu, Desktop Icons,
 *           Email Client Sim, Recycle Bin (Restorable), IE Sim (Bookmarks), Notepad,
 *           Minesweeper Game, Picture Viewer, Control Panel Sim, Mobile Fallback.
 */
"use strict";

document.addEventListener('DOMContentLoaded', () => {

    // --- Global State ---
    const state = {
        windows: {},
        taskbarButtons: {},
        nextZIndex: 100,
        activeWindowId: null,
        isMobile: window.innerWidth <= 768,
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
        explorerWindowContents: { /* ... Same as before ... */
            'C':{title:'Local Disk (C:)',icon:'icons/All [Without duplicates]/Drive.ico',items:[{name:'Program Files',icon:'icons/All [Without duplicates]/Folder.ico',type:'folder'},{name:'Windows',icon:'icons/All [Without duplicates]/Folder (Windows).ico',type:'folder'},{name:'My Documents',icon:'icons/All [Without duplicates]/Folder (Favorite).ico',type:'folder'},{name:'config.sys',icon:'icons/All [Without duplicates]/Text file.ico',type:'file'},{name:'autoexec.bat',icon:'icons/All [Without duplicates]/Text file.ico',type:'file'}]},
            'A':{title:'3½ Floppy (A:)',icon:'icons/All [Without duplicates]/Drive (Floppy 3).ico',items:[{name:'Not ready reading drive A.\nAbort, Retry, Fail?',icon:'icons/All [Without duplicates]/Error.ico',type:'message'}]},
            'D_Wedding':{title:'Wedding Files (D:)',icon:'icons/All [Without duplicates]/Drive.ico',items:[{name:'GuestList.xls',icon:'icons/All [Without duplicates]/Spreadsheet.ico',type:'file'},{name:'SeatingChart_v5_FINAL.doc',icon:'icons/All [Without duplicates]/Document.ico',type:'file'},{name:'Budget_Overspent.xls',icon:'icons/All [Without duplicates]/Spreadsheet (Dollar).ico',type:'file'}]},
            'E_CD':{title:'CD-ROM Drive (E:)',icon:'icons/All [Without duplicates]/CD Drive.ico',items:[{name:'Please insert a Wedding Mix CD.',icon:'icons/All [Without duplicates]/CD Music.ico',type:'message'}]},
            'display-props':{title:'Display Properties',icon:'icons/All [Without duplicates]/Desktop.ico',items:[{name:'Appearance: Windows 95 Classic',icon:'icons/All [Without duplicates]/Paint program.ico',type:'message'},{name:'Resolution: 800x600',icon:'icons/All [Without duplicates]/Settings.ico',type:'message'}]},
            'printers':{title:'Printers',icon:'icons/All [Without duplicates]/Printer (3D).ico',items:[{name:'No printers are installed.',icon:'icons/All [Without duplicates]/Error.ico',type:'message'}]},
            'mouse-settings':{title:'Mouse Properties',icon:'icons/All [Without duplicates]/Mouse.ico',items:[{name:'Pointer speed: Fast',icon:'icons/All [Without duplicates]/Mouse.ico',type:'message'},{name:'Double-click speed: Fast',icon:'icons/All [Without duplicates]/Mouse wizard.ico',type:'message'}]},
            'sound-settings':{title:'Sounds',icon:'icons/All [Without duplicates]/Sound program.ico',items:[{name:'Default Beep: ON',icon:'icons/All [Without duplicates]/Sound (Louder).ico',type:'message'},{name:'Startup Sound: Enabled',icon:'icons/All [Without duplicates]/Sound.ico',type:'message'}]},
            'add-remove-programs':{title:'Add/Remove Programs',icon:'icons/All [Without duplicates]/Program group.ico',items:[{name:'Hover.exe (150MB)',icon:'icons/All [Without duplicates]/Help page.ico',type:'message'},{name:'Clippy Assistant (2KB)',icon:'icons/All [Without duplicates]/Agent.ico',type:'message'}]}
        },
        ieBookmarks: [ /* ... Same as before ... */
            {name:"Pointer Pointer",url:"https://pointerpointer.com/"},{name:"Space Jam (1996!)",url:"https://www.spacejam.com/1996/"},{name:"Google (Retro)",url:"https://google.com/webhp?nord=1&source=hp&igu=1"},{name:"Wedding Venue",url:"http://www.dworki-weselne.pl/dworek-separowo/"}
        ]
    };

    // --- DOM Element References (Ensure they exist) ---
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
    // Force hide windows initially (CSS should do this too)
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
        console.log("WeddingOS Initialized Successfully.");
    } catch (error) {
        console.error("Initialization Error:", error);
        alert("A critical error occurred during initialization. Please check the console.");
    }

    // --- Mobile/Desktop Specific Initialization ---

    function setupMobileMode() {
        console.log("Setting up Mobile Mode");
        if (desktop) desktop.style.display = 'none';
        if (mobileOverlay) mobileOverlay.style.display = 'flex';
        if (taskbar) taskbar.style.position = 'fixed';

        // Add listeners ONLY for allowed mobile icons
        if (mobileOverlay) {
            const allowedMobileIcons = ['mobile-invitation-icon', 'mobile-upload-icon'];
            mobileOverlay.querySelectorAll('.icon').forEach(icon => {
                if (allowedMobileIcons.includes(icon.id)) {
                    icon.onclick = () => { // Use onclick for simplicity on mobile
                        const windowId = icon.dataset.windowId;
                        if (windowId) openWindow(windowId);
                    };
                     // Prevent default touch behaviors like zoom/scroll sometimes
                    icon.addEventListener('touchstart', (e) => { e.preventDefault(); }, { passive: false });
                    icon.addEventListener('touchend', (e) => { e.preventDefault(); }); // Can help prevent ghost clicks
                } else {
                    icon.style.opacity = '0.5'; icon.style.cursor = 'default';
                }
            });
        }
        if (startButton) startButton.style.display = 'none';
        if (contextMenu) contextMenu.style.display = 'none'; // Ensure context menu is hidden
    }

    function setupDesktopMode() {
        console.log("Setting up Desktop Mode");
        if (mobileOverlay) mobileOverlay.style.display = 'none';
        if (desktop) desktop.style.display = 'block';

        // Initialize all desktop features
        initDesktopIcons();
        initWindowControls(); // CRITICAL: For Min/Max/Close buttons
        initStartMenu();
        initContextMenu();
        initMyComputer();
        initControlPanel();
        initSoundTrayIcon();

        // Initialize draggable/resizable windows AFTER controls are initialized
        document.querySelectorAll('.window').forEach(win => {
            // Defensively add windowId to buttons if missing in HTML
             const winId = win.id;
             win.querySelectorAll('.window-controls button').forEach(btn => {
                 if (!btn.dataset.windowId) btn.dataset.windowId = winId;
             });
            // Make draggable/resizable
            makeWindowDraggable(win);
            makeWindowResizable(win);
            const winData = state.windows[win.id];
            toggleResizers(win, !(winData?.isMaximized));
        });

        // Initialize Minesweeper Game
        try {
            if (minesweeper && document.getElementById('minesweeper-grid')) {
                minesweeper.init('minesweeper-grid', 'mines-left', 'minesweeper-face', 'minesweeper-timer');
            }
        } catch (err) {
            console.error("Failed to initialize Minesweeper:", err);
        }
    }


    // --- Core Window Management (Minimize verbosity, ensure safety) ---

    function openWindow(windowId, params = {}) {
        // Mobile check
        if (state.isMobile && !['invitation-window', 'upload-window'].includes(windowId)) {
             alert("This app is only available on the desktop version!"); return;
        }
        // Find window element
        const win = document.getElementById(windowId);
        if (!win) { console.error(`Window element #${windowId} not found.`); return; }

        let winData = state.windows[windowId];

        // If already open and visible, just focus it
        if (winData?.isOpen && !winData.isMinimized) { bringToFront(windowId); return; }

        // Create state if first time opening or fully closed
        if (!winData) {
            winData = { element: win, isOpen: false, isMinimized: false, isMaximized: state.isMobile, originalRect: null, beforeMinimizeRect: null };
            state.windows[windowId] = winData;
            if (!state.isMobile) createTaskbarButton(windowId);

            // Set initial size/position on desktop
            if (!state.isMobile && !winData.isMaximized) {
                const openCount = Object.values(state.windows).filter(w => w.isOpen && !w.isMinimized).length;
                const offset = (openCount || 0) * 20;
                win.style.left = win.style.left || `${50 + offset}px`;
                win.style.top = win.style.top || `${50 + offset}px`;
                win.style.width = params.width || win.style.width || '500px';
                win.style.height = params.height || win.style.height || '400px';
            }
        }

        // Set state and display
        winData.isOpen = true; winData.isMinimized = false; win.style.display = 'flex';

        // Apply geometry (fullscreen mobile, maximized desktop, or normal)
        if (state.isMobile) {
            Object.assign(win.style, { left:'0px', top:'0px', width:'100vw', height:'100vh' });
            winData.isMaximized = true; toggleResizers(win, false);
        } else if (winData.isMaximized) {
            win.classList.add('maximized'); Object.assign(win.style, { left:'0px', top:'0px', width:'100vw', height:`calc(100vh - ${taskbar.offsetHeight}px)` });
            toggleResizers(win, false);
        } else {
            win.classList.remove('maximized');
            if (winData.originalRect) Object.assign(win.style, winData.originalRect);
            toggleResizers(win, true);
        }

        if (!state.isMobile) updateMaximizeButtonIcon(windowId, winData.isMaximized);
        bringToFront(windowId);

        // Window-specific actions
        try {
            if (windowId === 'email-window') switchFolder('inbox', document.getElementById('folder-inbox'));
            if (windowId === 'recycle-window') updateRecycleBinWindowContent();
            if (windowId === 'gallery-window') loadGallery();
            if (windowId === 'ie-widget') initIEWindow();
            if (windowId === 'picture1-window' && params.imgSrc) setupPictureWindow(win, params.imgSrc, params.imgTitle || 'Image');
            if (windowId === 'notepad-window') win.querySelector('.notepad-textarea')?.focus();
            if (windowId === 'minesweeper-window' && minesweeper && !minesweeper.gameStarted) minesweeper.newGame(); // Start new game if not already started
            if (windowId === 'screensaver-window') setupScreensaver(win);
        } catch (err) {
            console.error(`Error during specific action for window ${windowId}:`, err);
        }

        closeStartMenu();
    }

    function setupPictureWindow(win, src, title) { /* ... (same as before) ... */
        const imgEl = win.querySelector('#picture1-image'); const titleEl = win.querySelector('#picture1-title'); if(imgEl){imgEl.src=src;imgEl.alt=title;} if(titleEl)titleEl.textContent=title; const tIco=win.querySelector('.title-bar-icon'); if(tIco){if(title.toLowerCase().match(/\.(png|bmp)$/i))tIco.src='icons/All [Without duplicates]/Drawing green picture.ico';else if(title.toLowerCase().match(/\.(jpe?g|gif)$/i))tIco.src='icons/All [Without duplicates]/Drawing red picture.ico';else tIco.src='icons/All [Without duplicates]/Picture.ico';}
    }
    function setupScreensaver(win) { /* ... (same as before, inc. close handler) ... */
        if (!state.isMobile && !state.windows[win.id]?.isMaximized) maximizeWindow(win.id);
        const closeHandler = () => { closeWindow(win.id); win.removeEventListener('click', closeHandler); document.removeEventListener('keydown', closeHandler); };
        win.addEventListener('click', closeHandler); document.addEventListener('keydown', closeHandler);
    }

    function closeWindow(windowId) { /* ... (same as before) ... */
        const winData=state.windows[windowId];if(winData?.element){winData.element.style.display='none';winData.isOpen=false;if(!state.isMobile)removeTaskbarButton(windowId);delete state.windows[windowId];if(state.activeWindowId===windowId)state.activeWindowId=null;} updateRecycleBinIcon();
    }
    function minimizeWindow(windowId) { /* ... (same as before) ... */
        const winData=state.windows[windowId];if(winData?.element&&winData.isOpen&&!winData.isMinimized){if(!winData.isMaximized&&!state.isMobile&&!winData.originalRect)winData.beforeMinimizeRect={left:winData.element.style.left,top:winData.element.style.top,width:winData.element.style.width,height:winData.element.style.height}; winData.element.style.display='none';winData.isMinimized=true;if(state.activeWindowId===windowId){state.activeWindowId=null;winData.element.classList.remove('active');} if(!state.isMobile)updateTaskbarButton(windowId);}
    }
    function restoreWindow(windowId) { /* ... (same as before) ... */
        let winData=state.windows[windowId];if(!winData){openWindow(windowId);return;}
        if(winData.isMinimized){winData.element.style.display='flex';winData.isMinimized=false; if(state.isMobile){winData.isMaximized=true;Object.assign(winData.element.style,{left:'0px',top:'0px',width:'100vw',height:'100vh'});toggleResizers(winData.element,false);}else if(winData.isMaximized){winData.element.classList.add('maximized');Object.assign(winData.element.style,{left:'0px',top:'0px',width:'100vw',height:`calc(100vh - ${taskbar.offsetHeight}px)`});toggleResizers(winData.element,false);}else{winData.element.classList.remove('maximized');const rRect=winData.beforeMinimizeRect||winData.originalRect;if(rRect)Object.assign(winData.element.style,rRect);toggleResizers(winData.element,true);} if(!state.isMobile)updateMaximizeButtonIcon(windowId,winData.isMaximized);bringToFront(windowId);}else if(winData.isOpen)bringToFront(windowId);
    }
    function maximizeWindow(windowId) { /* ... (same as before) ... */
        if(state.isMobile)return; const winData=state.windows[windowId];if(!winData?.element||!winData.isOpen||winData.isMinimized)return;const win=winData.element; if(!winData.isMaximized){if(!winData.originalRect)winData.originalRect={left:win.style.left,top:win.style.top,width:win.style.width,height:win.style.height};win.classList.add('maximized');Object.assign(win.style,{left:'0px',top:'0px',width:'100vw',height:`calc(100vh - ${taskbar.offsetHeight}px)`});winData.isMaximized=true;}else{win.classList.remove('maximized');if(winData.originalRect){Object.assign(win.style,winData.originalRect);winData.originalRect=null;}else{const c=Object.keys(state.windows).length||1;win.style.left=`${50+c*20}px`;win.style.top=`${50+c*20}px`;win.style.width='500px';win.style.height='400px';} winData.isMaximized=false;} updateMaximizeButtonIcon(windowId,winData.isMaximized);toggleResizers(win,!winData.isMaximized);bringToFront(windowId);
    }
    function toggleResizers(windowEl, enableSuggestion) { /* ... (same as before) ... */
        const winData=state.windows[windowEl.id];const actualEnable=enableSuggestion&&!state.isMobile&&winData&&!winData.isMaximized;windowEl.querySelectorAll('.resizer').forEach(r=>r.style.display=actualEnable?'block':'none');
    }
    function bringToFront(windowId) { /* ... (same as before) ... */
        const winData=state.windows[windowId];if(!winData?.element){console.warn(`BF: ${windowId} no data.`);return;} if(winData.isMinimized||!winData.isOpen)return; if(state.activeWindowId&&state.activeWindowId!==windowId){const oldActive=state.windows[state.activeWindowId];if(oldActive?.element){oldActive.element.classList.remove('active');if(!state.isMobile)updateTaskbarButton(state.activeWindowId);}} state.nextZIndex++;winData.element.style.zIndex=state.nextZIndex;winData.element.classList.add('active');state.activeWindowId=windowId;if(!state.isMobile)updateTaskbarButton(windowId);toggleResizers(winData.element,true);
    }

    // --- Taskbar & Button Management ---
    function createTaskbarButton(windowId) { /* ... (same as before) ... */ }
    function removeTaskbarButton(windowId) { /* ... (same as before) ... */ }
    function updateTaskbarButton(windowId) { /* ... (same as before) ... */ }

    // --- Desktop Icons & Interaction ---
    function initDesktopIcons() { // Called only in setupDesktopMode
        const currentIcons = document.querySelectorAll('.desktop > .icon');
        currentIcons.forEach(icon => {
            // Clear previous listeners if any (safer if re-initializing)
            icon.onclick = null; icon.ondblclick = null;
            // Assign new listeners
            icon.ondblclick = () => handleIconDoubleClick(icon);
            icon.onclick = (e) => { selectIcon(icon); e.stopPropagation(); };
            icon.addEventListener('touchstart', () => { icon.dataset.dragging = 'false'; }, { passive: true });
            makeIconDraggable(icon);
        });
        desktopArea.addEventListener('click', handleDesktopClick);
    }
    function handleIconDoubleClick(icon) {
         const windowId = icon.dataset.windowId;
         if (windowId) {
             const params = {};
             if(icon.dataset.imgSrc) params.imgSrc = icon.dataset.imgSrc;
             if(icon.dataset.imgTitle) params.imgTitle = icon.dataset.imgTitle;
             openWindow(windowId, params);
         } else if (icon.dataset.imgSrc) {
              openPicture(icon.dataset.imgSrc, icon.dataset.imgTitle || icon.querySelector('div')?.textContent || 'Image');
         }
    }
    function handleDesktopClick(e) { if (e.target === desktopArea) { deselectAllIcons(); closeStartMenu(); hideContextMenu(); } }
    function selectIcon(selectedIcon) { /* ... (same as before) ... */ }
    function deselectAllIcons() { /* ... (same as before) ... */ }
    function makeIconDraggable(icon) { /* ... (same as before) ... */ }

    // --- Window Dragging & Resizing ---
    function makeWindowDraggable(windowEl) { /* ... (same as before) ... */ }
    function makeWindowResizable(windowEl) { /* ... (same as before) ... */ }

    // --- Window Control Button Listeners ---
    function initWindowControls() { // Handles clicks on minimize, maximize, close
        // Use event delegation on a parent element (e.g., body or desktop)
        document.body.addEventListener('click', (e) => {
            const button = e.target.closest('.window-controls button');
            if (!button) return; // Exit if click wasn't on a control button

            const windowEl = button.closest('.window');
            if (!windowEl) return; // Should always find a window
            const windowId = windowEl.id;

            // Now call the relevant function
            if (button.classList.contains('close-button')) closeWindow(windowId);
            else if (button.classList.contains('minimize-button')) minimizeWindow(windowId);
            else if (button.classList.contains('maximize-button')) maximizeWindow(windowId);
        });
         // Bring window to front on click inside (not controls/resizers)
        desktop.addEventListener('mousedown', (e) => {
            const windowEl = e.target.closest('.window');
            if (windowEl && !state.isMobile && !e.target.closest('.window-controls button') && !e.target.closest('.resizer')) {
                const winData = state.windows[windowEl.id]; if (winData?.isOpen && state.activeWindowId !== windowEl.id) bringToFront(windowEl.id);
            }
        }, true);
    }

    // --- Start Menu Logic ---
    function initStartMenu() {
        if (state.isMobile || !startButton || !startMenu) return;
        startButton.addEventListener('click', (e) => { toggleStartMenu(); e.stopPropagation(); });
        document.addEventListener('click', (e) => { if (startMenu.classList.contains('active') && !startMenu.contains(e.target) && e.target !== startButton) closeStartMenu(); });
        startMenu.addEventListener('click', (e) => {
            const linkItem = e.target.closest('a');
            if (linkItem && !linkItem.closest('li.has-submenu')) {
                // Let onclick attribute handle the action, just close the menu
                closeStartMenu();
                // Prevent default only if it's a '#' link meant only for JS action
                if (linkItem.getAttribute('href') === '#') e.preventDefault();
            }
             // Stop propagation inside menu to prevent document click from closing it
             e.stopPropagation();
        });
        // Submenu hover logic (CSS should handle display, but ensure JS doesn't interfere)
        startMenu.querySelectorAll('.has-submenu').forEach(item => {
            item.onmouseenter = () => { const ul = item.querySelector('ul'); if(ul) ul.style.display = 'block'; };
            item.onmouseleave = () => { const ul = item.querySelector('ul'); if(ul) ul.style.display = 'none'; };
        });
    }
    function toggleStartMenu() { /* ... (same as before) ... */ }
    function closeStartMenu() { /* ... (same as before, including closing submenus) ... */ }

    // --- Clock Logic ---
    function initClock() { /* ... (same as before) ... */ }

    // --- Context Menu Logic ---
    function initContextMenu() { /* ... (same as before, including background change) ... */ }
    function showContextMenu(x,y,items){/* ... (same as before) ... */ }
    function hideContextMenu() { /* ... (same as before) ... */ }
    function changeDesktopBackground() { /* ... (same as before) ... */ }

    // --- Email Client Logic ---
    const emailData = { /* ... (As defined previously) ... */ };
    let currentEmailFolder = 'inbox', selectedEmailId = null;
    function initEmail() { /* Data loaded in state */ }
    function switchFolder(folderName, clickedElement) { /* ... (same as before) ... */ }
    function displayEmailContent(email) { /* ... (same as before) ... */ }
    window.sendEmail = (confirm) => { /* ... (same as before) ... */ };
    window.sendEmailMessage = () => { /* ... (same as before) ... */ };

    // --- Recycle Bin Logic ---
    function updateRecycleBinIcon() { /* ... (same as before) ... */ }
    function updateRecycleBinWindowContent() { /* ... (same as before, including dblclick restore) ... */ }
    function emptyRecycleBin() { /* ... (same as before) ... */ }
    function deleteDesktopIcon(iconElement) { /* ... (same as before) ... */ }
    function restoreRecycleBinItem(itemId) { /* ... (same as before) ... */ }

    // --- Internet Explorer Logic ---
    function initIEWindow() { /* ... (same as before) ... */ }
    function initIEBookmarks() { /* ... (same as before) ... */ }
    function ieCanGoBack(){/*...(same)...*/} function ieCanGoForward(){/*...(same)...*/}
    function updateIEButtons(){/*...(same)...*/} function updateIEHistorySelect(){/*...(same)...*/}
    window.ieGo=(dU=null)=>{/*...(same)...*/}; window.ieGoBack=()=>{/*...(same)...*/}; window.ieGoForward=()=>{/*...(same)...*/}; window.ieHistorySelect=()=>{/*...(same)...*/};

    // --- Picture Viewer Logic ---
    window.openPicture = (src, title) => { openWindow('picture1-window', { imgSrc: src, imgTitle: title }); };

    // --- My Computer / Explorer Logic ---
    function initMyComputer() { /* ... (same as before) ... */ }
    function initControlPanel() { /* ... (same as before) ... */ }
    window.openExplorerWindow = (id, title, titleIconSrc, items) => { /* ... (same as before) ... */ };

    // --- Sound Tray Icon ---
    function initSoundTrayIcon() { /* ... (same as before) ... */ }

    // --- Minesweeper Game Logic ---
    const minesweeper = { /* ... (Full Minesweeper object as defined previously) ... */
        gridEl: null, minesLeftEl: null, faceEl: null, timerEl: null,
        rows: 9, cols: 9, mines: 10, board: [], revealed: [], flagged: [],
        firstClick: true, gameOver: false, gameWon: false, gameStarted: false,
        timerInterval: null, time: 0, minesLeft: 0,
        isInitialized:function(){return !!this.gridEl;},
        init:function(gridId,minesLeftId,faceId,timerId){if(this.isInitialized())return;this.gridEl=document.getElementById(gridId);this.minesLeftEl=document.getElementById(minesLeftId);this.faceEl=document.getElementById(faceId);this.timerEl=document.getElementById(timerId);if(!this.gridEl||!this.minesLeftEl||!this.faceEl||!this.timerEl){console.error("Minesweeper UI elements not found!");return;} this.faceEl.onclick=()=>this.newGame();this.gridEl.oncontextmenu=(e)=>e.preventDefault();const gW=document.getElementById('minesweeper-window');if(gW){const gWi=this.cols*20+2,gH=this.rows*20+2,iH=36,mH=21,tH=20,p=10,bW=4;gW.style.width=`${gWi+p+bW}px`;gW.style.height=`${gH+iH+mH+tH+p+bW}px`;}},
        newGame:function(rows=9,cols=9,mines=10){this.rows=rows;this.cols=cols;this.mines=mines;this.gameOver=false;this.gameWon=false;this.firstClick=true;this.gameStarted=false;this.time=0;this.minesLeft=this.mines;if(this.timerInterval)clearInterval(this.timerInterval);this.timerInterval=null;this.updateUI();this.createBoard();this.renderBoard();},
        updateUI:function(){if(!this.isInitialized())return;this.minesLeftEl.textContent=this.minesLeft;this.timerEl.textContent=this.time;if(this.gameOver)this.faceEl.textContent=this.gameWon?'😎':'😵';else this.faceEl.textContent='😊';},
        startTimer:function(){if(this.timerInterval||this.gameOver)return;this.gameStarted=true;this.timerInterval=setInterval(()=>{if(!this.gameOver)this.time++;this.updateUI();},1000);},
        createBoard:function(){this.board=Array(this.rows).fill(null).map(()=>Array(this.cols).fill(0));this.revealed=Array(this.rows).fill(null).map(()=>Array(this.cols).fill(false));this.flagged=Array(this.rows).fill(null).map(()=>Array(this.cols).fill(false));},
        plantMines:function(fCR,fCC){let mTP=this.mines;while(mTP>0){const r=Math.floor(Math.random()*this.rows),c=Math.floor(Math.random()*this.cols);if(this.board[r][c]!==-1&&!(r===fCR&&c===fCC)){this.board[r][c]=-1;mTP--;for(let dR=-1;dR<=1;dR++){for(let dC=-1;dC<=1;dC++){if(dR===0&&dC===0)continue;const nR=r+dR,nC=c+dC;if(nR>=0&&nR<this.rows&&nC>=0&&nC<this.cols&&this.board[nR][nC]!==-1)this.board[nR][nC]++;}}}}},
        renderBoard:function(){if(!this.gridEl)return;this.gridEl.innerHTML='';this.gridEl.style.gridTemplateColumns=`repeat(${this.cols},20px)`;this.gridEl.style.gridTemplateRows=`repeat(${this.rows},20px)`;for(let r=0;r<this.rows;r++){for(let c=0;c<this.cols;c++){const cell=document.createElement('div');cell.className='mine-cell';cell.dataset.r=r;cell.dataset.c=c;if(this.revealed[r][c]){cell.classList.add('revealed');if(this.board[r][c]===-1)cell.classList.add('mine-hit');else if(this.board[r][c]>0){cell.textContent=this.board[r][c];cell.dataset.mines=this.board[r][c];}}else if(this.flagged[r][c]){cell.classList.add('flagged');} cell.addEventListener('click',()=>this.handleClick(r,c));cell.addEventListener('contextmenu',(e)=>{e.preventDefault();this.handleRightClick(r,c);});this.gridEl.appendChild(cell);}}},
        handleClick:function(r,c){if(this.gameOver||this.revealed[r][c]||this.flagged[r][c])return;if(this.firstClick){this.plantMines(r,c);this.firstClick=false;this.startTimer();} this.revealCell(r,c);this.checkWinCondition();this.updateUI();},
        handleRightClick:function(r,c){if(this.gameOver||this.revealed[r][c])return;if(this.flagged[r][c]){this.flagged[r][c]=false;this.minesLeft++;}else if(this.minesLeft>0){this.flagged[r][c]=true;this.minesLeft--;} this.updateUI();this.renderBoard();},
        revealCell:function(r,c){if(r<0||r>=this.rows||c<0||c>=this.cols||this.revealed[r][c]||this.flagged[r][c])return;this.revealed[r][c]=true;const cE=this.gridEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);if(cE)cE.classList.add('revealed');if(this.board[r][c]===-1){this.gameOver=true;if(cE)cE.classList.add('mine-hit');if(this.timerInterval)clearInterval(this.timerInterval);this.revealAllMines();setTimeout(()=>alert("BOOM! Game Over!"), 100); /* Delay alert */ }else if(this.board[r][c]===0){for(let dR=-1;dR<=1;dR++){for(let dC=-1;dC<=1;dC++){if(dR!==0||dC!==0)this.revealCell(r+dR,c+dC);}}}else if(cE){cE.textContent=this.board[r][c];cE.dataset.mines=this.board[r][c];}},
        revealAllMines:function(){for(let r=0;r<this.rows;r++){for(let c=0;c<this.cols;c++){if(this.board[r][c]===-1&&!this.revealed[r][c]){this.revealed[r][c]=true;const cE=this.gridEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);if(cE&&!cE.classList.contains('mine-hit')){cE.classList.add('revealed');cE.innerHTML='💣';}} if(this.board[r][c]!==-1&&this.flagged[r][c]){const cE=this.gridEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);if(cE)cE.innerHTML='❌';}}} this.renderBoard();},
        checkWinCondition:function(){if(this.gameOver)return; let revCount=0;for(let r=0;r<this.rows;r++){for(let c=0;c<this.cols;c++){if(this.revealed[r][c])revCount++;}} if(revCount===this.rows*this.cols-this.mines){this.gameOver=true;this.gameWon=true;if(this.timerInterval)clearInterval(this.timerInterval);this.flagAllMines();this.updateUI();setTimeout(()=>alert("Congratulations! You win!"), 100); /* Delay alert */ }},
        flagAllMines:function(){for(let r=0;r<this.rows;r++){for(let c=0;c<this.cols;c++){if(this.board[r][c]===-1&&!this.flagged[r][c]){this.flagged[r][c]=true;}}} this.minesLeft=0;this.renderBoard();}
    };

    // --- File Upload & Gallery Placeholders ---
    const NAS_BASE_URL = 'http://YOUR_NAS_IP:5000/webapi'; let synoAuthToken = null;
    async function loginToSynology(){console.warn("NAS Login not implemented/configured.");return false;}
    window.uploadMedia=async function(){alert('NAS Upload requires configuration in script.js');};
    window.loadGallery=async function(){const c=document.getElementById('gallery-container');if(c)c.innerHTML='<p>NAS Gallery requires configuration in script.js</p>';};
    const synoErrorCodes={};

}); // === END DOMContentLoaded ===