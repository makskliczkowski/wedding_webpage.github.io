/**
 * Windows 95 Style Wedding Website Script v3.0
 * Features: Draggable/Resizable Windows, Taskbar, Start Menu, Desktop Icons,
 *           Email Client Sim, Recycle Bin (Restorable), IE Sim (Bookmarks), Notepad,
 *           Minesweeper Game, Snake Game, Picture Viewer, Control Panel Sim,
 *           NAS Placeholder + Alternative Info, Mobile Fallback.
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
        explorerWindowContents: { /* ... Same data as before ... */
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
        ieBookmarks: [ /* ... Same data as before ... */
            {name:"Pointer Pointer",url:"https://pointerpointer.com/"},{name:"Space Jam (1996!)",url:"https://www.spacejam.com/1996/"},{name:"Google (Retro)",url:"https://google.com/webhp?nord=1&source=hp&igu=1"},{name:"Wedding Venue",url:"http://www.dworki-weselne.pl/dworek-separowo/"}
        ],
        focusedWindowId: null, // Track which window has actual focus for keyboard events
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
        initGlobalKeyListener(); // For Snake game
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
        if (taskbar) taskbar.style.position = 'fixed';
        if (startButton) startButton.style.display = 'none';
        if (contextMenu) contextMenu.style.display = 'none';

        // Attach listeners only to allowed mobile icons
        if (mobileOverlay) {
            const allowedMobileIcons = ['mobile-invitation-icon', 'mobile-upload-icon'];
            mobileOverlay.querySelectorAll('.icon').forEach(icon => {
                if (allowedMobileIcons.includes(icon.id)) {
                    icon.onclick = () => {
                        const windowId = icon.dataset.windowId;
                        if (windowId) openWindow(windowId);
                    };
                    // Prevent accidental zooming etc.
                    icon.addEventListener('touchstart', (e) => { /*e.preventDefault();*/ }, { passive: true }); // Allow scroll maybe
                    icon.addEventListener('touchend', (e) => { e.preventDefault(); });
                } else {
                    icon.style.display = 'none'; // Hide disallowed icons completely
                }
            });
        }
    }

    function setupDesktopMode() {
        console.log("Setting up Desktop Mode");
        if (mobileOverlay) mobileOverlay.style.display = 'none';
        if (desktop) desktop.style.display = 'block';

        // Initialize all desktop features
        initDesktopIcons();
        initWindowControls();
        initStartMenu();
        initContextMenu();
        initMyComputer();
        initControlPanel();
        initSoundTrayIcon();
        initMenuBarInteraction(); // Add listeners for menu bars

        document.querySelectorAll('.window').forEach(win => {
            const winId = win.id;
            win.querySelectorAll('.window-controls button').forEach(btn => {
                if (!btn.dataset.windowId) btn.dataset.windowId = winId;
            });
            makeWindowDraggable(win);
            makeWindowResizable(win);
            const winData = state.windows[winId];
            toggleResizers(win, !(winData?.isMaximized));
        });

        // Initialize Games (if elements exist)
        try {
            if (minesweeper && document.getElementById('minesweeper-grid')) {
                minesweeper.init('minesweeper-grid', 'mines-left', 'minesweeper-face', 'minesweeper-timer');
            }
            if (snakeGame && document.getElementById('snake-canvas')) {
                snakeGame.init('snake-canvas', 'snake-score');
            }
        } catch (err) { console.error("Game Init Error:", err); }
    }

    // --- Global Key Listener (for Snake) ---
    function initGlobalKeyListener() {
        document.addEventListener('keydown', (e) => {
            if (state.focusedWindowId === 'snake-window' && snakeGame) {
                snakeGame.handleKeyPress(e.key);
                // Prevent arrow keys from scrolling the page when game is active
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                }
            }
            // Close screensaver on any key press
            if(state.windows['screensaver-window']?.isOpen) {
                 closeWindow('screensaver-window');
            }
        });
    }

    // --- Menu Bar Interaction ---
    function initMenuBarInteraction() {
        document.querySelectorAll('.menu-bar').forEach(menuBar => {
            menuBar.addEventListener('click', (e) => {
                const menuItem = e.target.closest('.menu-item');
                if (!menuItem) return;

                // Close other open dropdowns in the same menu bar
                menuBar.querySelectorAll('.dropdown-menu').forEach(d => {
                    if (menuItem.contains(d)) return; // Don't close the one we might be opening
                    d.style.display = 'none';
                });

                // Toggle the clicked dropdown
                const dropdown = menuItem.querySelector('.dropdown-menu');
                if (dropdown) {
                    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                }
            });
            // Close dropdowns when clicking outside the menu bar
            document.addEventListener('click', (e) => {
                if (!menuBar.contains(e.target)) {
                    menuBar.querySelectorAll('.dropdown-menu').forEach(d => d.style.display = 'none');
                }
            });
        });
    }


    // --- Core Window Management ---

    /** Opens or focuses a window */
    function openWindow(windowId, params = {}) {
        if (state.isMobile && !['invitation-window', 'upload-window'].includes(windowId)) {
             alert("This app is available on Desktop only!"); return;
        }
        const win = document.getElementById(windowId);
        if (!win) { console.error(`Window #${windowId} not found.`); return; }

        let winData = state.windows[windowId];

        if (winData?.isOpen && !winData.isMinimized) { bringToFront(windowId); return; }

        if (!winData) {
            winData = { element: win, isOpen: false, isMinimized: false, isMaximized: state.isMobile, originalRect: null, beforeMinimizeRect: null };
            state.windows[windowId] = winData;
            if (!state.isMobile) createTaskbarButton(windowId);
            if (!state.isMobile && !winData.isMaximized) {
                const openCount = Object.values(state.windows).filter(w => w.isOpen && !w.isMinimized).length;
                const offset = (openCount || 0) * 20;
                const defaultWidth = '500px', defaultHeight = '400px';
                win.style.left = win.style.left || `${50 + offset}px`;
                win.style.top = win.style.top || `${50 + offset}px`;
                win.style.width = params.width || win.style.width || defaultWidth;
                win.style.height = params.height || win.style.height || defaultHeight;
            }
        }

        winData.isOpen = true; winData.isMinimized = false; win.style.display = 'flex';

        // Apply Geometry
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
        bringToFront(windowId); // Handles focus and z-index

        // Window-Specific Post-Open Actions
        try {
            if (windowId === 'email-window') switchFolder('inbox', document.getElementById('folder-inbox'));
            if (windowId === 'recycle-window') updateRecycleBinWindowContent();
            if (windowId === 'gallery-window') loadGallery();
            if (windowId === 'ie-widget') initIEWindow();
            if (windowId === 'picture1-window' && params.imgSrc) setupPictureWindow(win, params.imgSrc, params.imgTitle || 'Image');
            if (windowId === 'notepad-window') win.querySelector('.notepad-textarea')?.focus();
            if (windowId === 'minesweeper-window' && minesweeper && !minesweeper.gameStarted) minesweeper.newGame();
            if (windowId === 'snake-window' && snakeGame && !snakeGame.gameLoop) snakeGame.newGame(); // Start if not running
            if (windowId === 'screensaver-window') setupScreensaver(win);
        } catch (err) { console.error(`Error during specific action for ${windowId}:`, err); }

        closeStartMenu();
    }

    /** Sets up the picture viewer window */
    function setupPictureWindow(win, src, title) {
        const imgEl=win.querySelector('#picture1-image'); const titleEl=win.querySelector('#picture1-title'); const titleIcon=win.querySelector('.title-bar-icon');
        if(imgEl){imgEl.src=src;imgEl.alt=title;} if(titleEl)titleEl.textContent=title;
        if(titleIcon){if(title.toLowerCase().match(/\.(png|bmp)$/i))titleIcon.src='icons/All [Without duplicates]/Drawing green picture.ico';else if(title.toLowerCase().match(/\.(jpe?g|gif)$/i))titleIcon.src='icons/All [Without duplicates]/Drawing red picture.ico';else titleIcon.src='icons/All [Without duplicates]/Picture.ico';}
    }

    /** Sets up the screensaver window */
    function setupScreensaver(win) {
        if (!state.isMobile && !state.windows[win.id]?.isMaximized) maximizeWindow(win.id);
        const closeHandler = () => { closeWindow(win.id); win.removeEventListener('click', closeHandler); document.removeEventListener('keydown', closeHandler); };
        win.addEventListener('click', closeHandler); document.addEventListener('keydown', closeHandler);
    }

    /** Closes a window */
    function closeWindow(windowId) {
        const winData = state.windows[windowId];
        if (winData?.element) {
            if (windowId === 'snake-window' && snakeGame) snakeGame.gameOver = true; // Stop game loop
            winData.element.style.display = 'none'; winData.isOpen = false;
            if (!state.isMobile) removeTaskbarButton(windowId);
            delete state.windows[windowId];
            if (state.activeWindowId === windowId) {
                state.activeWindowId = null;
                state.focusedWindowId = null; // Clear specific focus too
                // TODO: Focus next window
            }
        }
        updateRecycleBinIcon();
    }

    /** Minimizes a window */
    function minimizeWindow(windowId) {
        const winData = state.windows[windowId];
        if (winData?.element && winData.isOpen && !winData.isMinimized) {
            if (!winData.isMaximized && !state.isMobile && !winData.originalRect) {
                winData.beforeMinimizeRect = { left: winData.element.style.left, top: winData.element.style.top, width: winData.element.style.width, height: winData.element.style.height };
            }
            winData.element.style.display = 'none'; winData.isMinimized = true;
            if (state.activeWindowId === windowId) {
                state.activeWindowId = null;
                state.focusedWindowId = null;
                winData.element.classList.remove('active');
            }
            if (!state.isMobile) updateTaskbarButton(windowId);
        }
    }

    /** Restores a minimized window or focuses an open one */
    function restoreWindow(windowId) { /* ... (same as before) ... */ }

    /** Toggles maximize/restore state */
    function maximizeWindow(windowId) { /* ... (same as before) ... */ }

    /** Shows/hides resize handles */
    function toggleResizers(windowEl, enableSuggestion) { /* ... (same as before) ... */ }

    /** Brings window to front and sets focus */
    function bringToFront(windowId) {
        const winData = state.windows[windowId];
        if (!winData?.element) { console.warn(`BF: ${windowId} no data.`); return; }
        if (winData.isMinimized || !winData.isOpen) { return; }

        if (state.activeWindowId && state.activeWindowId !== windowId) {
            const oldActive = state.windows[state.activeWindowId];
            if (oldActive?.element) { oldActive.element.classList.remove('active'); if (!state.isMobile) updateTaskbarButton(state.activeWindowId); }
        }

        state.nextZIndex++; winData.element.style.zIndex = state.nextZIndex;
        winData.element.classList.add('active');
        state.activeWindowId = windowId;
        state.focusedWindowId = windowId; // Set specific focus for keyboard events

        if (!state.isMobile) updateTaskbarButton(windowId);
        toggleResizers(winData.element, true);
    }

    /** Updates the visual symbol on the maximize button */
    function updateMaximizeButtonIcon(windowId, isMaximized) {
        const win = document.getElementById(windowId); if (!win || state.isMobile) return;
        const maxBtn = win.querySelector('.maximize-button'); if (maxBtn) maxBtn.textContent = isMaximized ? '🗗' : '□';
    }

    // --- Taskbar & Button Management ---
    function createTaskbarButton(windowId) { /* ... (same as before) ... */ }
    function removeTaskbarButton(windowId) { /* ... (same as before) ... */ }
    function updateTaskbarButton(windowId) { /* ... (same as before) ... */ }

    // --- Desktop Icons & Interaction ---
    function initDesktopIcons() { /* ... (same as before, uses handleIconDoubleClick) ... */ }
    function handleIconDoubleClick(icon) { /* ... (same as before) ... */ }
    function handleDesktopClick(e) { /* ... (same as before) ... */ }
    function selectIcon(selectedIcon) { /* ... (same as before) ... */ }
    function deselectAllIcons() { /* ... (same as before) ... */ }
    function makeIconDraggable(icon) { /* ... (same as before) ... */ }

    // --- Window Dragging & Resizing ---
    function makeWindowDraggable(windowEl) { /* ... (same as before) ... */ }
    function makeWindowResizable(windowEl) { /* ... (same as before) ... */ }

    // --- Window Control Button Listeners ---
    function initWindowControls() { /* ... (same as before using event delegation) ... */ }

    // --- Start Menu Logic ---
    function initStartMenu() { /* ... (same as before, relies on onclick attributes in HTML) ... */ }
    function toggleStartMenu() { /* ... (same as before) ... */ }
    function closeStartMenu() { /* ... (same as before) ... */ }

    // --- Clock Logic ---
    function initClock() { /* ... (same as before) ... */ }

    // --- Context Menu Logic ---
    function initContextMenu() { /* ... (same as before) ... */ }
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
    function updateRecycleBinWindowContent() { /* ... (same as before) ... */ }
    function emptyRecycleBin() { /* ... (same as before) ... */ }
    function deleteDesktopIcon(iconElement) { /* ... (same as before) ... */ }
    function restoreRecycleBinItem(itemId) { /* ... (same as before) ... */ }

    // --- Internet Explorer Logic ---
    function initIEWindow() { /* ... (same as before) ... */ }
    function initIEBookmarks() { /* ... (same as before) ... */ }
    function ieCanGoBack(){/*...(same)...*/} function ieCanGoForward(){/*...(same)...*/}
    function updateIEButtons(){/*...(same)...*/} function updateIEHistorySelect(){/*...(same)...*/}
    window.ieGo=(dU=null)=>{/*...(Updated to handle Enter Key via HTML)...*/
        const uI=document.getElementById('ie-url'),iF=document.getElementById('ie-iframe');if(!uI||!iF)return;let url=dU||uI.value.trim();if(!url){if(state.ieHistory.length>0&&state.ieHistory[state.ieHistoryIndex])url=state.ieHistory[state.ieHistoryIndex];else{iF.src='about:blank';uI.value='';return;}} uI.value=url; if(!url.match(/^(?:f|ht)tps?\:\/\//)&&!url.startsWith('about:')&&!url.startsWith('mailto:')){url='http://'+url;uI.value=url;} if(state.ieHistoryIndex<state.ieHistory.length-1)state.ieHistory=state.ieHistory.slice(0,state.ieHistoryIndex+1); if(state.ieHistory[state.ieHistory.length-1]!==url)state.ieHistory.push(url); state.ieHistoryIndex=state.ieHistory.length-1; try{iF.src='about:blank';setTimeout(()=>{iF.src=url;},50);}catch(e){console.error("IE err:",e);iF.src='about:blank';try{(iF.contentDocument||iF.contentWindow.document).body.innerHTML=`Err loading ${url}`;}catch(iE){}} updateIEButtons();updateIEHistorySelect();
    };
    window.ieGoBack=()=>{/*...(same)...*/}; window.ieGoForward=()=>{/*...(same)...*/}; window.ieHistorySelect=()=>{/*...(same)...*/};

    // --- Picture Viewer Logic ---
    window.openPicture = (src, title) => { openWindow('picture1-window', { imgSrc: src, imgTitle: title }); };

    // --- My Computer / Explorer Logic ---
    function initMyComputer() { /* ... (same as before) ... */ }
    function initControlPanel() { /* ... (same as before) ... */ }
    window.openExplorerWindow = (id, title, titleIconSrc, items) => { /* ... (same as before) ... */ };

    // --- Sound Tray Icon ---
    function initSoundTrayIcon() { /* ... (same as before) ... */ }

    // --- Minesweeper Game Logic ---
    const minesweeper = { /* ... (Full Minesweeper object as defined previously) ... */ };

    // --- Snake Game Logic ---
    const snakeGame = {
        canvas: null, ctx: null, scoreEl: null,
        gridSize: 20, // Size of each grid cell
        canvasWidth: 300, canvasHeight: 300, // Match canvas element size
        tileCountX: 0, tileCountY: 0,
        snake: [], food: {x: 10, y: 10}, // Initial positions
        velocity: {x: 0, y: 0},
        score: 0, tailLength: 3, // Initial length
        gameLoop: null, gameOver: false,

        init: function(canvasId, scoreId) {
            this.canvas = document.getElementById(canvasId);
            this.scoreEl = document.getElementById(scoreId);
            if (!this.canvas || !this.scoreEl) { console.error("Snake UI elements missing!"); return; }
            this.ctx = this.canvas.getContext('2d');
            this.tileCountX = this.canvasWidth / this.gridSize;
            this.tileCountY = this.canvasHeight / this.gridSize;
            this.newGame();
        },

        newGame: function() {
            if (this.gameLoop) clearInterval(this.gameLoop);
            this.gameOver = false;
            this.score = 0;
            this.tailLength = 3;
            this.snake = [{ x: Math.floor(this.tileCountX / 2), y: Math.floor(this.tileCountY / 2) }]; // Start in middle
            this.velocity = { x: 0, y: 0 }; // Don't move initially
            this.placeFood();
            this.updateScore();
            this.gameLoop = setInterval(() => this.tick(), 1000 / 10); // Game speed (10 fps)
        },

        tick: function() {
            if (this.gameOver) { clearInterval(this.gameLoop); this.gameLoop = null; return; }
            this.moveSnake();
            if (this.gameOver) { // Check again after move
                 clearInterval(this.gameLoop); this.gameLoop = null;
                 alert(`Game Over! Final Score: ${this.score}`);
                 return;
            }
            this.drawGame();
        },

        moveSnake: function() {
            const head = { x: this.snake[0].x + this.velocity.x, y: this.snake[0].y + this.velocity.y };

            // Wall collision
            if (head.x < 0 || head.x >= this.tileCountX || head.y < 0 || head.y >= this.tileCountY) {
                this.gameOver = true; return;
            }
            // Self collision
            for (let i = 1; i < this.snake.length; i++) {
                if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
                    this.gameOver = true; return;
                }
            }

            this.snake.unshift(head); // Add new head

            // Food collision
            if (head.x === this.food.x && head.y === this.food.y) {
                this.score++;
                this.tailLength++;
                this.placeFood();
                this.updateScore();
            }

            // Maintain tail length
            while (this.snake.length > this.tailLength) {
                this.snake.pop();
            }
        },

        placeFood: function() {
            let newFoodPos;
            do {
                newFoodPos = {
                    x: Math.floor(Math.random() * this.tileCountX),
                    y: Math.floor(Math.random() * this.tileCountY)
                };
            } while (this.isSnakePart(newFoodPos.x, newFoodPos.y)); // Ensure food not on snake
            this.food = newFoodPos;
        },

        isSnakePart: function(x, y) {
            return this.snake.some(part => part.x === x && part.y === y);
        },

        drawGame: function() {
            // Clear canvas
            this.ctx.fillStyle = 'black';
            this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

            // Draw snake
            this.ctx.fillStyle = 'lime';
            this.snake.forEach(part => {
                this.ctx.fillRect(part.x * this.gridSize, part.y * this.gridSize, this.gridSize - 2, this.gridSize - 2);
            });

            // Draw food
            this.ctx.fillStyle = 'red';
            this.ctx.fillRect(this.food.x * this.gridSize, this.food.y * this.gridSize, this.gridSize - 2, this.gridSize - 2);
        },

        updateScore: function() {
            if (this.scoreEl) this.scoreEl.textContent = `Score: ${this.score}`;
        },

        handleKeyPress: function(key) {
             if (this.gameOver && key === 'Enter') { // Restart on Enter after game over
                 this.newGame();
                 return;
             }
             if (this.gameOver) return; // Ignore keys if game is over and not Enter

            switch (key) {
                case 'ArrowUp':    if (this.velocity.y === 0) this.velocity = { x: 0, y: -1 }; break;
                case 'ArrowDown':  if (this.velocity.y === 0) this.velocity = { x: 0, y: 1 }; break;
                case 'ArrowLeft':  if (this.velocity.x === 0) this.velocity = { x: -1, y: 0 }; break;
                case 'ArrowRight': if (this.velocity.x === 0) this.velocity = { x: 1, y: 0 }; break;
            }
            // Start timer on first valid move
            if (!this.gameLoop && (this.velocity.x !== 0 || this.velocity.y !== 0)) {
                 this.gameLoop = setInterval(() => this.tick(), 1000 / 10);
            }
        }
    };

   // --- File Upload & Gallery Placeholders ---
   const NAS_BASE_URL = 'http://YOUR_NAS_IP:5000/webapi'; // !!! Replace !!!
   let synoAuthToken = null;
   const NAS_USERNAME = 'YOUR_NAS_USERNAME'; // !!! Replace !!!
   const NAS_PASSWORD = 'YOUR_NAS_PASSWORD'; // !!! Replace !!!
   const NAS_UPLOAD_FOLDER = '/Public/WeddingUploads'; // Ensure exists on NAS

   async function isNasConfigured() {
       return !(NAS_BASE_URL.includes('YOUR_NAS_IP') || NAS_USERNAME === 'YOUR_NAS_USERNAME' || NAS_PASSWORD === 'YOUR_NAS_PASSWORD');
   }

   async function loginToSynology() {
       if (!await isNasConfigured()) return false;
       // ... (Actual login fetch logic from previous versions) ...
       console.warn("NAS Login logic needs to be implemented here.");
       return false; // Placeholder
   }

   window.uploadMedia = async function() {
       const input = document.getElementById('file-input'), statusDiv = document.getElementById('upload-status');
       if (!input || !statusDiv) return;
       if (input.files.length === 0) { alert("Please select file(s)."); return; }

       if (!await isNasConfigured()) {
           statusDiv.textContent = 'Direct NAS upload not configured.';
           openWindow('hosting-info-window'); // Show alternative info
           return;
       }

       if (!synoAuthToken) {
           statusDiv.textContent = 'Logging into NAS...';
           const loggedIn = await loginToSynology();
           if (!loggedIn) { statusDiv.textContent = 'NAS Login Failed.'; return; }
       }
       // ... (Actual upload fetch logic using FormData from previous versions) ...
        statusDiv.textContent = 'Simulating upload to NAS... (Feature requires full backend)';
        console.warn("NAS Upload logic needs to be implemented here.");
        setTimeout(() => { statusDiv.textContent = 'Simulated Upload Complete.'; input.value = ''; }, 2000);
   };

   window.loadGallery = async function() {
        const container = document.getElementById('gallery-container');
        if(!container) return;
        if (!await isNasConfigured()) {
            container.innerHTML = '<p>NAS Gallery requires configuration in script.js</p>';
            return;
        }
        container.innerHTML = '<p>Loading gallery from NAS... (Simulated)</p>';
        console.warn("NAS Gallery logic needs to be implemented here.");
         // ... (Actual fetch logic to list files from NAS_UPLOAD_FOLDER) ...
        setTimeout(() => { container.innerHTML = '<p>Simulated Gallery Loaded. (No files found/Feature requires full backend)</p>'; }, 2000);
   };
   const synoErrorCodes = { /* ... (Keep error codes) ... */ };

}); // === END DOMContentLoaded ===