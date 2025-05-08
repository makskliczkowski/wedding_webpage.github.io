document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.window').forEach(w => { w.style.display = 'none'; });

  const state = {
      windows: {}, taskbarButtons: {}, nextZIndex: 100, activeWindowId: null,
      isMobile: window.innerWidth <= 768, iconGridSize: 80,
      recycleBinItems: [
          { id: 'rb_doc_1', originalId: 'some_doc_icon_id', name: 'Wedding Vows Draft 1.doc', icon: 'icons/All [Without duplicates]/Document.ico', type: 'icon' },
          { id: 'rb_jpg_2', originalId: 'some_photo_icon_id', name: 'Bad Selfie.jpg', icon: 'icons/All [Without duplicates]/Drawing red picture.ico', type: 'icon' },
          { id: 'rb_folder_3', originalId: 'old_projects_folder_id', name: 'Old Projects', icon: 'icons/All [Without duplicates]/Folder.ico', type: 'icon' },
          { id: 'rb_pdf_4', originalId: 'manual_icon_id', name: 'IKEA Manual (Failed).pdf', icon: 'icons/All [Without duplicates]/Help page.ico', type: 'icon' },
      ],
      ieHistory: [], ieHistoryIndex: -1,
      desktopBackgrounds: [
          '#008080', // Default Teal
          '#000000', // Black
          '#55AAAA', // Lighter Teal
          // 'url(Photos/your_wedding_bg_1.jpg)', // Add image paths
          // 'url(Photos/your_wedding_bg_2.jpg)',
      ],
      currentBackgroundIndex: 0,
      explorerWindowContents: { // Content for generic explorer window
        'C': { title: 'Local Disk (C:)', icon: 'icons/All [Without duplicates]/Drive.ico', items: [ {name: 'Program Files', icon:'icons/All [Without duplicates]/Folder.ico', type:'folder'}, {name: 'Windows', icon:'icons/All [Without duplicates]/Folder (Windows).ico', type:'folder'}, {name: 'My Documents', icon:'icons/All [Without duplicates]/Folder (Favorite).ico', type:'folder'}, {name: 'config.sys', icon:'icons/All [Without duplicates]/Text file.ico', type:'file'}, {name: 'autoexec.bat', icon:'icons/All [Without duplicates]/Text file.ico', type:'file'} ] },
        'A': { title: '3½ Floppy (A:)', icon: 'icons/All [Without duplicates]/Drive (Floppy 3).ico', items: [ {name: 'Nothing here but dust bunnies.', icon:'icons/All [Without duplicates]/Help page.ico', type:'message'} ] },
        'D_Wedding': { title: 'Wedding Files (D:)', icon: 'icons/All [Without duplicates]/Drive.ico', items: [ {name: 'GuestList.xls', icon:'icons/All [Without duplicates]/Spreadsheet.ico', type:'file'}, {name: 'SeatingChart_v5_FINAL.doc', icon:'icons/All [Without duplicates]/Document.ico', type:'file'}, {name: 'Budget_Overspent.xls', icon:'icons/All [Without duplicates]/Spreadsheet (Dollar).ico', type:'file'} ] },
        'E_CD': { title: 'CD-ROM Drive (E:)', icon: 'icons/All [Without duplicates]/CD Drive.ico', items: [ {name: 'Please insert a Wedding Mix CD.', icon:'icons/All [Without duplicates]/CD Music.ico', type:'message'} ] },
        'display-props': { title: 'Display Properties', icon: 'icons/All [Without duplicates]/Desktop.ico', items: [ {name: 'Appearance: Windows 95 Classic (cannot be changed, lol)', icon:'icons/All [Without duplicates]/Paint program.ico', type:'message'}, {name: 'Screen resolution: 800x600 (recommended for nostalgia)', icon:'icons/All [Without duplicates]/Settings.ico', type:'message'} ]},
        'printers': { title: 'Printers', icon: 'icons/All [Without duplicates]/Printer (3D).ico', items: [ {name: 'No printers are installed. The cake is a lie.', icon:'icons/All [Without duplicates]/Error.ico', type:'message'} ]},
        'mouse-settings': { title: 'Mouse Properties', icon: 'icons/All [Without duplicates]/Mouse.ico', items: [ {name: 'Pointer speed: Ludicrous Speed', icon:'icons/All [Without duplicates]/Mouse.ico', type:'message'}, {name: 'Double-click speed: Set to "Are you kidding me?"', icon:'icons/All [Without duplicates]/Mouse wizard.ico', type:'message'} ]},
        'sound-settings': { title: 'Sounds', icon: 'icons/All [Without duplicates]/Sound program.ico', items: [ {name: 'Default Beep: ON (Sorry!)', icon:'icons/All [Without duplicates]/Sound (Louder).ico', type:'message'}, {name: 'Startup Sound: Win95 classic (of course)', icon:'icons/All [Without duplicates]/Sound.ico', type:'message'} ]},
        'add-remove-programs': { title: 'Add/Remove Programs', icon: 'icons/All [Without duplicates]/Program group.ico', items: [ {name: 'Hover (150MB) - Cannot remove, essential for UI.', icon:'icons/All [Without duplicates]/Help page.ico', type:'message'}, {name: 'Clippy Assistant (2KB) - Uninstall blocked by administrator.', icon:'icons/All [Without duplicates]/Agent.ico', type:'message'} ]},
      }
  };

  const desktop = document.querySelector('.desktop');
  const taskbar = document.querySelector('.taskbar');
  const startButton = document.getElementById('start-button');
  const startMenu = document.getElementById('start-menu');
  const windowButtonsContainer = document.getElementById('window-buttons-container');
  const clockElement = document.getElementById('clock');
  const contextMenu = document.getElementById('context-menu');
  const desktopArea = document.getElementById('desktop-area');


  initClock(); initDesktopIcons(); initWindowControls(); initStartMenu();
  initContextMenu(); initEmail(); updateRecycleBinIcon(); updateRecycleBinWindowContent();
  initMyComputer(); initControlPanel(); initSoundTrayIcon();

  document.querySelectorAll('.window').forEach(win => {
      if (!state.isMobile) {
          makeWindowDraggable(win); makeWindowResizable(win);
          const winData = state.windows[win.id];
          toggleResizers(win, !(winData?.isMaximized));
      } else { toggleResizers(win, false); }
      // Add data-window-id to control buttons if not already present
      const winId = win.id;
      win.querySelectorAll('.window-controls button').forEach(btn => {
          if (!btn.dataset.windowId) btn.dataset.windowId = winId;
      });
  });

  function updateMaximizeButtonIcon(windowId, isMaximized) {
      const win = document.getElementById(windowId);
      if (!win || state.isMobile) return;
      const maximizeButton = win.querySelector('.maximize-button');
      if (maximizeButton) maximizeButton.textContent = isMaximized ? '🗗' : '□';
  }

  function openWindow(windowId, params = {}) {
      const win = document.getElementById(windowId);
      if (!win) { console.error(`Window ${windowId} not found.`); return; }

      let windowData = state.windows[windowId];
      if (windowData && windowData.isOpen && !windowData.isMinimized) { bringToFront(windowId); return; }

      if (!windowData) {
          windowData = { element: win, isMinimized: false, isMaximized: state.isMobile, isOpen: false, originalRect: null };
          state.windows[windowId] = windowData;
          if (!state.isMobile) createTaskbarButton(windowId);
          if (!state.isMobile && !windowData.isMaximized) {
              const openNonMinimized = Object.values(state.windows).filter(w=>w.isOpen && !w.isMinimized && w.element.style.display !=='none');
              const offset = (openNonMinimized.length) * 20;
              win.style.left = win.style.left && win.style.left !== '0px' ? win.style.left : `${50 + offset}px`;
              win.style.top = win.style.top && win.style.top !== '0px' ? win.style.top : `${50 + offset}px`;
              win.style.width = params.width || (win.style.width && win.style.width !== '0px' ? win.style.width : '500px');
              win.style.height = params.height || (win.style.height && win.style.height !== '0px' ? win.style.height : '400px');
          }
      }
      windowData.isOpen = true; windowData.isMinimized = false; win.style.display = 'flex';

      if (state.isMobile) {
          win.style.left='0px'; win.style.top='0px'; win.style.width='100vw'; win.style.height='100vh';
          windowData.isMaximized = true; toggleResizers(win, false);
      } else if (windowData.isMaximized) {
          win.classList.add('maximized'); win.style.left='0px'; win.style.top='0px';
          win.style.width='100vw'; win.style.height=`calc(100vh - ${taskbar.offsetHeight}px)`;
          toggleResizers(win, false);
      } else {
          win.classList.remove('maximized');
          if (windowData.originalRect) {
            win.style.left = windowData.originalRect.left; win.style.top = windowData.originalRect.top;
            win.style.width = windowData.originalRect.width; win.style.height = windowData.originalRect.height;
          }
          toggleResizers(win, true);
      }
      if (!state.isMobile) updateMaximizeButtonIcon(windowId, windowData.isMaximized);
      bringToFront(windowId);

      if (windowId === 'email-window') switchFolder('inbox', document.getElementById('folder-inbox'));
      if (windowId === 'recycle-window') updateRecycleBinWindowContent();
      if (windowId === 'gallery-window') loadGallery();
      if (windowId === 'ie-widget') {
          const iframe = document.getElementById('ie-iframe'), urlInput = document.getElementById('ie-url');
          if (iframe && urlInput && (iframe.getAttribute('src')||'').match(/^(about:blank)?$/) && state.ieHistory.length === 0) {
              ieGo('https://pointerpointer.com/');
          } else if (state.ieHistory.length > 0 && state.ieHistory[state.ieHistoryIndex]) {
              urlInput.value = state.ieHistory[state.ieHistoryIndex];
              if (iframe.getAttribute('src') !== state.ieHistory[state.ieHistoryIndex]) iframe.src = state.ieHistory[state.ieHistoryIndex];
          }
          updateIEButtons(); updateIEHistorySelect();
      }
      if (windowId === 'picture1-window' && params.imgSrc && params.imgTitle) {
          const imgEl = win.querySelector('.content img');
          const titleEl = win.querySelector('.title-bar span');
          if(imgEl) { imgEl.src = params.imgSrc; imgEl.alt = params.imgTitle; }
          if(titleEl) titleEl.textContent = params.imgTitle;
      }
      if (windowId === 'picture2-window' && params.imgSrc && params.imgTitle) { // If making picture2 generic too
          const imgEl = document.getElementById('picture2-image');
          const titleEl = document.getElementById('picture2-title');
          if(imgEl) { imgEl.src = params.imgSrc; imgEl.alt = params.imgTitle; }
          if(titleEl) titleEl.textContent = params.imgTitle;
      }
      if (windowId === 'screensaver-window') {
          if(state.isMobile) { // On mobile, just make it full screen
            winData.isMaximized = true; toggleResizers(win, false);
          } else { // On desktop, force maximize
            if (!winData.isMaximized) maximizeWindow(windowId);
          }
          win.onclick = () => closeWindow(windowId); // Close on click
      }
      closeStartMenu();
  }

  function closeWindow(windowId) {
      const winData = state.windows[windowId];
      if (winData?.element) {
          winData.element.style.display = 'none'; winData.isOpen = false;
          if (!state.isMobile) removeTaskbarButton(windowId);
          delete state.windows[windowId];
          if (state.activeWindowId === windowId) state.activeWindowId = null;
      }
      updateRecycleBinIcon();
  }

  function minimizeWindow(windowId) {
      const winData = state.windows[windowId];
      if (winData?.element && winData.isOpen && !winData.isMinimized) {
          if (!winData.isMaximized && !state.isMobile && !winData.originalRect) {
            winData.beforeMinimizeRect = { left:winData.element.style.left, top:winData.element.style.top, width:winData.element.style.width, height:winData.element.style.height };
          }
          winData.element.style.display = 'none'; winData.isMinimized = true;
          if (state.activeWindowId === windowId) { state.activeWindowId = null; winData.element.classList.remove('active'); }
          if (!state.isMobile) updateTaskbarButton(windowId);
      }
  }

  function restoreWindow(windowId) {
    let winData = state.windows[windowId];
    if (!winData || !winData.element) { openWindow(windowId); return; }
    if (winData.isMinimized) {
        winData.element.style.display = 'flex'; winData.isMinimized = false;
        if (state.isMobile) {
            winData.isMaximized = true; winData.element.style.left='0px'; winData.element.style.top='0px';
            winData.element.style.width='100vw'; winData.element.style.height='100vh'; toggleResizers(winData.element, false);
        } else if (winData.isMaximized) {
            winData.element.classList.add('maximized'); winData.element.style.left='0px'; winData.element.style.top='0px';
            winData.element.style.width='100vw'; winData.element.style.height=`calc(100vh - ${taskbar.offsetHeight}px)`;
            toggleResizers(winData.element, false);
        } else {
            winData.element.classList.remove('maximized');
            if (winData.beforeMinimizeRect) {
                Object.assign(winData.element.style, winData.beforeMinimizeRect);
                // delete winData.beforeMinimizeRect;
            } else if (winData.originalRect) Object.assign(winData.element.style, winData.originalRect);
            toggleResizers(winData.element, true);
        }
        if (!state.isMobile) updateMaximizeButtonIcon(windowId, winData.isMaximized);
        bringToFront(windowId);
    } else if (winData.isOpen) bringToFront(windowId);
}

   function maximizeWindow(windowId) {
      if (state.isMobile) return;
      const winData = state.windows[windowId];
      if (!winData?.element || !winData.isOpen || winData.isMinimized) return;
      const win = winData.element;
      if (!winData.isMaximized) {
          if (!winData.originalRect) winData.originalRect = { left:win.style.left, top:win.style.top, width:win.style.width, height:win.style.height };
          win.classList.add('maximized'); win.style.left='0px'; win.style.top='0px';
          win.style.width='100vw'; win.style.height=`calc(100vh - ${taskbar.offsetHeight}px)`;
          winData.isMaximized = true;
      } else {
          win.classList.remove('maximized');
           if (winData.originalRect) { Object.assign(win.style, winData.originalRect); winData.originalRect = null; }
           else {
               const openCount = Object.values(state.windows).filter(w=>w.isOpen && !w.isMinimized).length || 1;
               win.style.left=`${50+openCount*20}px`; win.style.top=`${50+openCount*20}px`;
               win.style.width='500px'; win.style.height='400px';
           }
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
    if (winData.isMinimized) { if (!state.isMobile) updateTaskbarButton(windowId); return; }
    if (!winData.isOpen) { openWindow(windowId); return; }

    if (state.activeWindowId && state.activeWindowId !== windowId) {
        const oldActive = state.windows[state.activeWindowId];
        if (oldActive?.element) { oldActive.element.classList.remove('active'); if(!state.isMobile) updateTaskbarButton(state.activeWindowId); }
    }
    state.nextZIndex++; winData.element.style.zIndex = state.nextZIndex;
    winData.element.classList.add('active'); state.activeWindowId = windowId;
    if(!state.isMobile) updateTaskbarButton(windowId);
    toggleResizers(winData.element, true);
}

  function createTaskbarButton(windowId) { /* ... (same as before, ensure correct calls) ... */
      if (state.taskbarButtons[windowId] || state.isMobile) return;
      const win = document.getElementById(windowId); if (!win) return;
      const title = win.querySelector('.title-bar span')?.textContent || 'Window';
      const iconSrc = win.querySelector('.title-bar-icon')?.src || 'icons/default.ico';
      const btn = document.createElement('button'); btn.className = 'window-button button-border-raised'; btn.dataset.windowId = windowId;
      const img = document.createElement('img'); img.src = iconSrc; img.alt = ''; btn.appendChild(img);
      const span = document.createElement('span'); span.textContent = title; btn.appendChild(span);
      btn.onclick = () => {
          const cWD = state.windows[windowId]; if (!cWD) { openWindow(windowId); return; }
          if (cWD.isMinimized) restoreWindow(windowId); else if (state.activeWindowId === windowId) minimizeWindow(windowId); else bringToFront(windowId);
      };
      windowButtonsContainer.appendChild(btn); state.taskbarButtons[windowId] = btn; updateTaskbarButton(windowId);
  }
  function removeTaskbarButton(windowId) { /* ... (same as before) ... */
    if (state.isMobile) return; const btn = state.taskbarButtons[windowId]; if (btn) { btn.remove(); delete state.taskbarButtons[windowId]; }
  }
  function updateTaskbarButton(windowId) { /* ... (same as before) ... */
    if (state.isMobile) return; const btn = state.taskbarButtons[windowId]; const winData = state.windows[windowId]; if (!btn) return;
    btn.classList.remove('active', 'minimized', 'button-border-lowered'); btn.classList.add('button-border-raised');
    if (winData && winData.isOpen) {
         if (winData.isMinimized) btn.classList.add('minimized');
         else if (state.activeWindowId === windowId) { btn.classList.add('active'); btn.classList.remove('button-border-raised'); btn.classList.add('button-border-lowered'); }
    }
  }

  function initDesktopIcons() { /* ... (same as before, ensure querySelectorAll is correct for icons) ... */
    if (state.isMobile) {
        const iconContainer = document.createElement('div'); iconContainer.className = 'icon-container';
        document.querySelectorAll('.desktop > .icon').forEach(icon => iconContainer.appendChild(icon.parentNode.removeChild(icon)));
        desktop.appendChild(iconContainer);
    }
    const currentIcons = document.querySelectorAll('.icon'); // Use this list
    currentIcons.forEach(icon => {
        icon.addEventListener('dblclick', () => {
            if (state.isMobile) return; const windowId = icon.dataset.windowId;
            if (windowId) {
                const params = {};
                if(icon.dataset.imgSrc) params.imgSrc = icon.dataset.imgSrc;
                if(icon.dataset.imgTitle) params.imgTitle = icon.dataset.imgTitle;
                openWindow(windowId, params);
            }
        });
        icon.addEventListener('touchend', (e) => {
            if (icon.dataset.dragging !== 'true') {
                const windowId = icon.dataset.windowId;
                if (windowId && state.isMobile) { e.preventDefault();
                    const params = {};
                    if(icon.dataset.imgSrc) params.imgSrc = icon.dataset.imgSrc;
                    if(icon.dataset.imgTitle) params.imgTitle = icon.dataset.imgTitle;
                    openWindow(windowId, params);
                }
            } icon.dataset.dragging = 'false';
        });
        icon.addEventListener('click', (e) => { if (!state.isMobile) { selectIcon(icon); e.stopPropagation(); } });
        icon.addEventListener('touchstart', () => { icon.dataset.dragging = 'false'; }, { passive: true });
        if (!state.isMobile) makeIconDraggable(icon); else icon.addEventListener('dragstart', (e) => e.preventDefault());
    });
    desktop.addEventListener('click', (e) => { if (e.target === desktop || e.target.classList.contains('icon-container')) { deselectAllIcons(); closeStartMenu(); hideContextMenu(); } });
  }
  function selectIcon(selectedIcon) { deselectAllIcons(); selectedIcon.classList.add('selected'); }
  function deselectAllIcons() { document.querySelectorAll('.icon.selected').forEach(icon => icon.classList.remove('selected')); }
  function makeIconDraggable(icon) { /* ... (same as before) ... */
    let oX, oY, sX, sY, iD = false, hM = false;
    const oMD = (e) => { if (e.button !== 0 && e.type==='mousedown') return; iD=true; hM=false; selectIcon(icon);
        const t=e.touches?e.touches[0]:e; const r=icon.getBoundingClientRect(); oX=t.clientX-r.left; oY=t.clientY-r.top; sX=t.clientX; sY=t.clientY;
        icon.style.zIndex=state.nextZIndex++; icon.style.cursor='grabbing'; desktop.style.cursor='grabbing'; icon.dataset.dragging='false'; if(e.type==='mousedown')e.preventDefault();
    };
    const oMM = (e) => { if(!iD)return; const t=e.touches?e.touches[0]:e; const cX=t.clientX,cY=t.clientY; if(!hM&&(Math.abs(cX-sX)>5||Math.abs(cY-sY)>5)){hM=true;icon.dataset.dragging='true';}
        if(hM){if(e.type==='touchmove'&&!state.isMobile)e.preventDefault(); const dR=desktop.getBoundingClientRect(); icon.style.left=`${cX-oX-dR.left}px`; icon.style.top=`${cY-oY-dR.top}px`;}
    };
    const oMU = () => { if(!iD)return; iD=false; icon.style.zIndex=10; icon.style.cursor='pointer'; desktop.style.cursor='default';
        if(hM){ let l=parseFloat(icon.style.left),t=parseFloat(icon.style.top); const dR=desktop.getBoundingClientRect(),tH=taskbar.offsetHeight; const mL=dR.width-icon.offsetWidth,mT=dR.height-icon.offsetHeight-tH;
            l=Math.max(0,Math.min(l,mL));t=Math.max(0,Math.min(t,mT)); icon.style.left=`${Math.round(l/state.iconGridSize)*state.iconGridSize}px`; icon.style.top=`${Math.round(t/state.iconGridSize)*state.iconGridSize}px`;}
    };
    icon.addEventListener('mousedown',oMD); document.addEventListener('mousemove',oMM); document.addEventListener('mouseup',oMU);
  }

  function makeWindowDraggable(windowEl) { /* ... (same as before) ... */
    if(state.isMobile)return; const tB=windowEl.querySelector('.title-bar');if(!tB)return; let oX,oY,iD=false;
    const sD=(e)=>{if(e.target.closest('.window-controls button'))return; const cWD=state.windows[windowEl.id];if(cWD?.isMaximized)return; iD=true;bringToFront(windowEl.id);
        const eP=e.touches?e.touches[0]:e;const r=windowEl.getBoundingClientRect();oX=eP.clientX-r.left;oY=eP.clientY-r.top;tB.style.cursor='grabbing';desktop.style.cursor='grabbing';if(e.type==='mousedown')e.preventDefault();
    };
    const dD=(e)=>{if(!iD)return;if(e.type==='touchmove')e.preventDefault(); const eP=e.touches?e.touches[0]:e;const dR=desktop.getBoundingClientRect();let nL=eP.clientX-oX,nT=eP.clientY-oY;
        const tH=taskbar.offsetHeight; nL=Math.max(-windowEl.offsetWidth+50,Math.min(nL,dR.width-50));nT=Math.max(0,Math.min(nT,dR.height-tH-tB.offsetHeight)); windowEl.style.left=`${nL}px`;windowEl.style.top=`${nT}px`;
    };
    const eD=()=>{if(iD){iD=false;tB.style.cursor='grab';desktop.style.cursor='default';}};
    tB.addEventListener('mousedown',sD);document.addEventListener('mousemove',dD);document.addEventListener('mouseup',eD); tB.addEventListener('touchstart',sD,{passive:false});document.addEventListener('touchmove',dD,{passive:false});document.addEventListener('touchend',eD);
  }
  function makeWindowResizable(windowEl) { /* ... (same as before) ... */
    if(state.isMobile)return; const R=windowEl.querySelectorAll('.resizer'); let iR=false,cR=null,sX,sY,sW,sH,sL,sT;
    const sRS=(e)=>{const cWD=state.windows[windowEl.id];if(cWD?.isMaximized)return; iR=true;cR=e.target;bringToFront(windowEl.id);
        const eP=e.touches?e.touches[0]:e;const r=windowEl.getBoundingClientRect();sX=eP.clientX;sY=eP.clientY;sW=r.width;sH=r.height;sL=parseFloat(getComputedStyle(windowEl).left);sT=parseFloat(getComputedStyle(windowEl).top);
        windowEl.style.userSelect='none';document.body.style.cursor=getComputedStyle(cR).cursor;e.preventDefault();e.stopPropagation();
    };
    const dRS=(e)=>{if(!iR)return;e.preventDefault();const eP=e.touches?e.touches[0]:e;const dX=eP.clientX-sX,dY=eP.clientY-sY;let nW=sW,nH=sH,nL=sL,nT=sT;
        const mW=parseInt(getComputedStyle(windowEl).minWidth)||150,mH=parseInt(getComputedStyle(windowEl).minHeight)||100;
        if(cR.classList.contains('resizer-e')||cR.classList.contains('resizer-ne')||cR.classList.contains('resizer-se')){nW=Math.max(mW,sW+dX);}
        if(cR.classList.contains('resizer-w')||cR.classList.contains('resizer-nw')||cR.classList.contains('resizer-sw')){const pW=sW-dX;if(pW>=mW){nW=pW;nL=sL+dX;}else{nW=mW;nL=sL+(sW-mW);}}
        if(cR.classList.contains('resizer-s')||cR.classList.contains('resizer-se')||cR.classList.contains('resizer-sw')){nH=Math.max(mH,sH+dY);}
        if(cR.classList.contains('resizer-n')||cR.classList.contains('resizer-ne')||cR.classList.contains('resizer-nw')){const pH=sH-dY;if(pH>=mH){nH=pH;nT=sT+dY;}else{nH=mH;nT=sT+(sH-mH);}}
        windowEl.style.width=`${nW}px`;windowEl.style.height=`${nH}px`;windowEl.style.left=`${nL}px`;windowEl.style.top=`${nT}px`;
    };
    const eRS=()=>{if(iR){iR=false;windowEl.style.userSelect='';document.body.style.cursor='default';}};
    R.forEach(r=>{r.addEventListener('mousedown',sRS);r.addEventListener('touchstart',sRS,{passive:false});}); document.addEventListener('mousemove',dRS);document.addEventListener('mouseup',eRS);document.addEventListener('touchmove',dRS,{passive:false});document.addEventListener('touchend',eRS);
  }

  function initWindowControls() { /* ... (same as before with adoption logic) ... */
    desktop.addEventListener('click',(e)=>{const b=e.target.closest('.window-controls button');if(!b)return; const wE=b.closest('.window');if(!wE)return; const wId=wE.id; let wD=state.windows[wId];
        if((!wD||!wD.isOpen)&&getComputedStyle(wE).display!=='none'){ console.warn(`Ctrl btn ${wId} state issue. Syncing.`); if(!wD){state.windows[wId]={element:wE,isMinimized:false,isMaximized:wE.classList.contains('maximized'),isOpen:true,originalRect:null};wD=state.windows[wId];if(!state.isMobile&&!state.taskbarButtons[wId])createTaskbarButton(wId);}else{wD.isOpen=true;wD.isMinimized=false;} bringToFront(wId);if(!state.isMobile)updateMaximizeButtonIcon(wId,wD.isMaximized);}
        if(!wD||!wD.isOpen){console.error(`Cannot ctrl ${wId}, state bad.`);return;}
        if(b.classList.contains('close-button'))closeWindow(wId); else if(b.classList.contains('minimize-button'))minimizeWindow(wId); else if(b.classList.contains('maximize-button'))maximizeWindow(wId);
    });
    desktop.addEventListener('mousedown',(e)=>{const wE=e.target.closest('.window'); if(wE&&!e.target.closest('.window-controls button')&&!e.target.closest('.resizer')){const wD=state.windows[wE.id]; if(wD?.isOpen&&state.activeWindowId!==wE.id)bringToFront(wE.id);}},true);
  }

  function initStartMenu() { /* ... (same as before) ... */
    startButton.addEventListener('click',(e)=>{toggleStartMenu();e.stopPropagation();}); document.addEventListener('click',(e)=>{if(startMenu.classList.contains('active')&&!startMenu.contains(e.target)&&e.target!==startButton)closeStartMenu();});
    startMenu.addEventListener('click',(e)=>{e.stopPropagation(); const lI=e.target.closest('a'); if(lI&&!lI.closest('li.has-submenu')){if(lI.getAttribute('onclick')?.includes('openWindow') || lI.getAttribute('onclick')?.includes('openExplorerWindow') )closeStartMenu();}});
  }
  function toggleStartMenu() { /* ... (same as before) ... */
    const iA=startMenu.classList.toggle('active'); startButton.classList.toggle('active',iA);startButton.classList.toggle('button-border-lowered',iA);startButton.classList.toggle('button-border-raised',!iA); if(iA){deselectAllIcons();hideContextMenu();}
  }
  function closeStartMenu() { /* ... (same as before) ... */
    startMenu.classList.remove('active');startButton.classList.remove('active');startButton.classList.remove('button-border-lowered');startButton.classList.add('button-border-raised');
  }
  function initClock() { /* ... (same as before) ... */
    const uC=()=>{const n=new Date(),h=n.getHours().toString().padStart(2,'0'),m=n.getMinutes().toString().padStart(2,'0');clockElement.textContent=`${h}:${m}`;}; uC();setInterval(uC,30000); // Update less frequently
  }

  function initContextMenu() { /* ... (updated for background change) ... */
    desktopArea.addEventListener('contextmenu', (e) => { // Listen on desktopArea
        if (state.isMobile) return; e.preventDefault(); hideContextMenu(); closeStartMenu();
        const target = e.target; let menuItems = []; const iconTarget = target.closest('.icon'), windowTitleBarTarget = target.closest('.title-bar');
        if (iconTarget) {
            selectIcon(iconTarget); const windowId = iconTarget.dataset.windowId;
            menuItems.push({ label: 'Open', action: () => { if (windowId) openWindow(windowId, { imgSrc: iconTarget.dataset.imgSrc, imgTitle: iconTarget.dataset.imgTitle }); } });
            menuItems.push({ type: 'separator' });
            if (iconTarget.id === 'recycle-icon') { menuItems.push({ label: 'Empty Recycle Bin', action: emptyRecycleBin, disabled: state.recycleBinItems.length === 0 }); }
            else { menuItems.push({ label: 'Cut', disabled: true }); menuItems.push({ label: 'Copy', disabled: true }); }
            menuItems.push({ type: 'separator' });
            menuItems.push({ label: 'Delete', action: () => deleteDesktopIcon(iconTarget), disabled: iconTarget.id === 'recycle-icon' || iconTarget.id === 'mycomputer-icon' || iconTarget.id === 'controlpanel-icon' });
            menuItems.push({ label: 'Properties', action: () => alert(`Properties for ${iconTarget.querySelector('div').textContent}`), disabled: true });
        } else if (windowTitleBarTarget) {
            const windowEl = windowTitleBarTarget.closest('.window'); if (windowEl && state.windows[windowEl.id]) {
                const winData = state.windows[windowEl.id];
                menuItems.push({ label: 'Restore', action: () => maximizeWindow(windowEl.id), disabled: !winData.isMaximized });
                menuItems.push({ label: 'Move', disabled: winData.isMaximized }); menuItems.push({ label: 'Size', disabled: winData.isMaximized });
                menuItems.push({ label: 'Minimize', action: () => minimizeWindow(windowEl.id) });
                menuItems.push({ label: 'Maximize', action: () => maximizeWindow(windowEl.id), disabled: winData.isMaximized });
                menuItems.push({ type: 'separator' }); menuItems.push({ label: 'Close', action: () => closeWindow(windowEl.id) });
            }
        } else if (e.target === desktopArea) { // Right-clicked on desktop background
            menuItems.push({ label: 'Arrange Icons', disabled: true }); menuItems.push({ label: 'Line up Icons', disabled: true }); menuItems.push({ type: 'separator' });
            menuItems.push({ label: 'Change Background', action: changeDesktopBackground });
            menuItems.push({ type: 'separator' });
            menuItems.push({ label: 'New', disabled: true }); menuItems.push({ type: 'separator' });
            menuItems.push({ label: 'Properties', action: () => openExplorerWindow('display-props', 'Display Properties', 'icons/All [Without duplicates]/Desktop.ico', state.explorerWindowContents['display-props'].items), disabled: false });
        }
        if (menuItems.length > 0) showContextMenu(e.clientX, e.clientY, menuItems);
    });
    document.addEventListener('click', hideContextMenu); contextMenu.addEventListener('click', (e) => e.stopPropagation());
  }
  function showContextMenu(x,y,items){/*...(same as before)...*/
    contextMenu.innerHTML='';contextMenu.style.display='block';items.forEach(item=>{const d=document.createElement('div');if(item.type==='separator'){d.className='context-menu-separator';}else{d.className='context-menu-item';d.textContent=item.label;if(item.disabled){d.classList.add('disabled');}else{d.onclick=()=>{if(item.action)item.action();hideContextMenu();};}}contextMenu.appendChild(d);});
    const mW=contextMenu.offsetWidth,mH=contextMenu.offsetHeight,vW=window.innerWidth,vH=window.innerHeight;if(x+mW>vW)x=vW-mW-5;if(y+mH>vH)y=vH-mH-5;if(x<0)x=5;if(y<0)y=5;contextMenu.style.left=`${x}px`;contextMenu.style.top=`${y}px`;
  }
  function hideContextMenu() { contextMenu.style.display = 'none'; }

  function changeDesktopBackground() {
      state.currentBackgroundIndex = (state.currentBackgroundIndex + 1) % state.desktopBackgrounds.length;
      const newBg = state.desktopBackgrounds[state.currentBackgroundIndex];
      if (newBg.startsWith('url(')) {
          desktopArea.style.backgroundImage = newBg;
          desktopArea.style.backgroundColor = ''; // Clear color if image is set
      } else {
          desktopArea.style.backgroundColor = newBg;
          desktopArea.style.backgroundImage = ''; // Clear image if color is set
      }
  }

  const emailData = { /* ... (Updated email data below) ... */
    inbox: [
        { id: "inv001", subject: "Your Wedding Invitation!", from: "Oliwia & Maks", read: false, content: "Dearest Friends & Family,\n\nWe are thrilled to invite you to celebrate our wedding!\nDate: August 3, 2025\nTime: 17:00\nVenue: Dworek Separowo (Separowo 8, 62-066 Separowo)\n\nPlease RSVP by May 1, 2025, by replying to this email or clicking the buttons in the Invitation.txt program on the desktop.\n\nWe can't wait to share our special day with you!\n\nWarmly,\nOliwia & Maks" },
        { id: "welc001", subject: "Welcome to Outlook Express - Wedding Edition!", from: "Microsoft", read: true, content: "Congratulations on your upcoming nuptials!\n\nThis special edition of Outlook Express is designed to handle all your wedding-related e-correspondence. Please note: Clippy has been specially trained to offer unsolicited (but enthusiastic) wedding advice.\n\nHappy emailing!\n\nThe Microsoft Team (and Clippy)" },
        { id: "photo001", subject: "Photo Booth Test Shots", from: "Photographer@example.com", read: true, content: "Hi Oliwia & Maks,\n\nAttached are some test shots from the photo booth setup. Looks great!\n\n[Attachment: test_shot1.jpg (simulation)]\n[Attachment: test_shot2.jpg (simulation)]\n\nBest,\nYour Friendly Photographer" }
    ],
    outbox: [
        { id: "out001", subject: "RE: Catering Final Numbers", to: "caterer@example.com", read: false, content: "Hi Chef,\n\nJust confirming the final guest count is 120. Can't wait for the delicious food!\n\nBest,\nO&M\n\n(This email is waiting to be 'sent'. Click Send/Receive!)" },
        { id: "out002", subject: "DJ Song Requests", to: "djcool@example.com", read: false, content: "Hey DJ Cool,\n\nPlease add these to the playlist:\n- Never Gonna Give You Up - Rick Astley\n- Macarena (just kidding... or are we?)\n- Bohemian Rhapsody - Queen\n\nThanks!\n\n(This email is also stuck in the outbox!)" }
    ],
    sent: [
        { id: "sent001", subject: "RE: Your Generous Gift!", to: "Aunt Carol", read: true, content: "Dear Aunt Carol,\n\nThank you so much for the beautiful crystal vase! It's absolutely stunning and we will cherish it.\n\nWe're so glad you could make it to our special day.\n\nLots of love,\nOliwia & Maks" },
        { id: "sent002", subject: "Honeymoon Update from Paradise", to: "Mom & Dad", read: true, content: "Hi Mom and Dad,\n\nJust wanted to let you know we arrived safely in [Fictional Paradise Location]! The weather is amazing and we're having a fantastic time. Wish you were here (but also glad for the peace and quiet! 😉)\n\nLove you both!\n\nO&M" },
        { id: "sent003", subject: "To Elon - That Inflatable Swan...", to: "elon.musk@totallyrealemail.com", read: true, content: "Mr. Musk,\n\nRegarding the giant inflatable swan for the pool party mentioned in a previous simulated email... it was a huge hit! Thanks for the inspiration.\n\nPerhaps a SpaceX branded one next time?\n\nBest,\nA Fan (O&M)"}
    ],
    spam: [
        { id: "spam001", subject: "YOU'VE WON A FREE HONEYMOON!!!", from: "Lucky Winner Dept.", read: false, content: "CONGRATULATIONS!!! You have been selected to win a FREE 7-day luxury honeymoon to a MYSTERY destination! Click HERE to claim your prize NOW! This is NOT a scam! (It totally is)." },
        { id: "spam002", subject: "Enlarge Your Wedding Cake (And Other Things!)", from: "Dr. Spammy", read: false, content: "Is your wedding cake looking a bit... small? We have natural, organic solutions to make EVERYTHING bigger and better for your special day! Satisfaction 1000% guaranteed or your money back (not really)." },
        { id: "spam003", subject: "Urgent: Nigerian Prince Needs Wedding Gift Help", from: "Prince Abimbola Adewale", read: false, content: "Salutations Esteemed Couple,\n\nI am Prince Abimbola Adewale of Nigeria. Due to unforeseen circumstances involving a misplaced royal dowry, I require a small loan of $5,000 to purchase an appropriate wedding gift for a distant cousin (who is also a princess). I will repay you $50,000 once my funds are released. Please send bank details.\n\nYours in Royal Desperation,\nPrince Abimbola" }
    ]
  };
  let currentEmailFolder = 'inbox', selectedEmailId = null;
  function initEmail() { /* Called by openWindow if needed */ }
  function switchFolder(folderName, clickedElement) { /* ... (same as before, ensures click handlers) ... */
    currentEmailFolder=folderName;const l=document.getElementById('email-list'),c=document.getElementById('email-content');if(!l||!c)return; l.innerHTML='';c.innerHTML='<p style="padding:20px;text-align:center;">Select an email to view.</p>';selectedEmailId=null;
    document.querySelectorAll('#email-window .email-nav .folder').forEach(f=>f.classList.remove('active')); if(clickedElement)clickedElement.classList.add('active'); else{const fE=document.getElementById(`folder-${folderName}`);if(fE)fE.classList.add('active');}
    const emails=emailData[folderName]||[]; if(emails.length===0){l.innerHTML='<p style="padding:10px;color:grey;font-style:italic;">This folder is empty.</p>';}
    else{emails.forEach(email=>{const i=document.createElement('div');i.className='email-item';i.dataset.emailId=email.id;i.style.fontWeight=email.read?'normal':'bold';i.textContent=`${email.subject} (From: ${email.from||email.to||'Unknown'})`;
        i.onclick=()=>{displayEmailContent(email);if(!email.read){email.read=true;i.style.fontWeight='normal';} document.querySelectorAll('#email-list .email-item.selected').forEach(it=>it.classList.remove('selected'));i.classList.add('selected');};
    l.appendChild(i);});}
  }
  function displayEmailContent(email) { /* ... (same as before) ... */
    selectedEmailId=email.id;const c=document.getElementById('email-content');if(!c)return;
    c.innerHTML=`<div style="padding:5px 10px;border-bottom:1px solid #ccc;"><p><strong>Subject:</strong> ${email.subject}</p><p><strong>From:</strong> ${email.from||'N/A'}</p><p><strong>To:</strong> ${email.to||'N/A'}</p></div><div style="padding:10px;white-space:pre-wrap;">${email.content.replace(/\n/g, '<br>')}</div>`; // Ensure newlines become <br>
    if(email.id==="inv001"){const bD=document.createElement('div');bD.style.marginTop='20px';bD.style.textAlign='center';bD.innerHTML=`<button class="button-border-raised" onclick="sendEmail(true)">Confirm Attendance</button><button class="button-border-raised" style="margin-left:10px;" onclick="sendEmail(false)">Decline Attendance</button>`;c.appendChild(bD);}
  }
  window.sendEmail = (confirm) => { /* ... (same as before) ... */
    const r="maxgrom97@gmail.com",s=encodeURIComponent("[Slub separowo] Potwierdzenie obecnosci");const b=confirm?encodeURIComponent("Potwierdzam moją obecność na ślubie i weselu 3 sierpnia 2025.\n\nDziękuję i pozdrawiam,\n\n[Twoje Imię i Nazwisko]"):encodeURIComponent("Z przykrością informuję, że nie będę mógł/mogła uczestniczyć w uroczystości 3 sierpnia 2025.\n\nDziękuję za zaproszenie i życzę wspaniałego dnia!\n\nPozdrawiam,\n\n[Twoje Imię i Nazwisko]");
    window.location.href=`mailto:${r}?subject=${s}&body=${b}`;alert('Attempting to open your default email client...');
  };
  window.sendEmailMessage = () => {
    if (emailData.outbox.length > 0) {
        alert(`Simulating sending ${emailData.outbox.length} email(s) from Outbox... \n(They will now appear in 'Sent Items' and Outbox will be empty)`);
        emailData.outbox.forEach(email => emailData.sent.unshift({...email, to: email.to || 'Unknown Recipient'})); // Move to sent, ensure 'to'
        emailData.outbox = [];
        if (currentEmailFolder === 'outbox' || currentEmailFolder === 'sent') {
            switchFolder(currentEmailFolder, document.getElementById(`folder-${currentEmailFolder}`));
        }
    } else {
        alert("Outbox is empty. Nothing to send!");
    }
  };

  function updateRecycleBinIcon() { /* ... (same as before) ... */
    const iI=document.getElementById('recycle-bin-image');if(!iI)return; iI.src=state.recycleBinItems.length>0?'icons/All [Without duplicates]/Recycle Bin with torned document and program.ico':'icons/All [Without duplicates]/Recycle Bin (empty).ico';
    const titleIcon = document.getElementById('recycle-window-title-icon'); if(titleIcon) titleIcon.src = iI.src; // Update window title icon too
  }
  function updateRecycleBinWindowContent() { /* ... (Updated for dblclick restore) ... */
    const list = document.getElementById('recycle-bin-list'); if (!list) return; list.innerHTML = '';
    if (state.recycleBinItems.length === 0) { list.innerHTML = '<p style="color:grey;font-style:italic;padding:10px;">The Recycle Bin is empty.</p>'; }
    else { state.recycleBinItems.forEach(item => {
        const li = document.createElement('li'); li.innerHTML = `<img src="${item.icon}" alt="icon"> ${item.name}`;
        li.dataset.itemId = item.id;
        li.onclick = (e) => { // Select on single click
            list.querySelectorAll('li.selected').forEach(s => s.classList.remove('selected'));
            li.classList.add('selected');
        };
        li.ondblclick = () => restoreRecycleBinItem(item.id);
        list.appendChild(li); });
    }
    updateRecycleBinIcon(); // Also update main icon
  }
  function emptyRecycleBin() { /* ... (same as before) ... */
    if(state.recycleBinItems.length>0){if(confirm(`Are you sure you want to permanently delete these ${state.recycleBinItems.length} items?`)){state.recycleBinItems=[];updateRecycleBinIcon();updateRecycleBinWindowContent();alert('Recycle Bin emptied.');}}else{alert('Recycle Bin is already empty.');} hideContextMenu();
  }
  function deleteDesktopIcon(iconElement) { // Renamed from deleteIcon for clarity
       if (!iconElement || iconElement.id === 'recycle-icon' || iconElement.id === 'mycomputer-icon' || iconElement.id === 'controlpanel-icon') return;
       const itemName = iconElement.querySelector('div')?.textContent || 'Unknown Item';
       const itemIcon = iconElement.querySelector('img')?.src || 'icons/default.ico';
       const originalId = iconElement.id; // Store original ID for restoration

       if (confirm(`Are you sure you want to send "${itemName}" to the Recycle Bin?`)) {
           state.recycleBinItems.push({ id: 'rb_' + originalId + '_' + Date.now(), originalId: originalId, name: itemName, icon: itemIcon, type: 'icon' });
           iconElement.style.display = 'none';
           updateRecycleBinIcon(); if (state.windows['recycle-window']?.isOpen) updateRecycleBinWindowContent();
       }
       hideContextMenu();
   }
  function restoreRecycleBinItem(itemId) {
    const itemIndex = state.recycleBinItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;
    const itemToRestore = state.recycleBinItems[itemIndex];

    if (itemToRestore.type === 'icon' && itemToRestore.originalId) {
        const desktopIcon = document.getElementById(itemToRestore.originalId);
        if (desktopIcon) {
            desktopIcon.style.display = 'flex'; // Or original display value
        } else {
            // Could try to recreate icon if it was dynamically removed from DOM, but for now, just log
            console.warn(`Original desktop icon with ID ${itemToRestore.originalId} not found for restoration.`);
        }
    }
    state.recycleBinItems.splice(itemIndex, 1); // Remove from recycle bin
    updateRecycleBinWindowContent(); // Update bin window
    updateRecycleBinIcon(); // Update desktop icon for bin
    alert(`"${itemToRestore.name}" has been restored.`);
  }


  function ieCanGoBack(){/*...(same)...*/} function ieCanGoForward(){/*...(same)...*/}
  function updateIEButtons(){/*...(same)...*/} function updateIEHistorySelect(){/*...(same)...*/}
  window.ieGo=(dU=null)=>{/*...(same)...*/const uI=document.getElementById('ie-url'),iF=document.getElementById('ie-iframe');if(!uI||!iF)return;let url=dU||uI.value.trim();if(!url){if(state.ieHistory.length>0&&state.ieHistory[state.ieHistoryIndex])url=state.ieHistory[state.ieHistoryIndex];else{iF.src='about:blank';uI.value='';return;}} uI.value=url; if(!url.match(/^(?:f|ht)tps?\:\/\//)&&!url.startsWith('about:')&&!url.startsWith('mailto:')){url='http://'+url;uI.value=url;} if(state.ieHistoryIndex<state.ieHistory.length-1)state.ieHistory=state.ieHistory.slice(0,state.ieHistoryIndex+1); if(state.ieHistory[state.ieHistory.length-1]!==url)state.ieHistory.push(url); state.ieHistoryIndex=state.ieHistory.length-1; try{iF.src='about:blank';setTimeout(()=>{iF.src=url;},50);}catch(e){console.error("IE err:",e);iF.src='about:blank';try{(iF.contentDocument||iF.contentWindow.document).body.innerHTML=`Err loading ${url}`;}catch(iE){}} updateIEButtons();updateIEHistorySelect();};
  window.ieGoBack=()=>{/*...(same)...*/}; window.ieGoForward=()=>{/*...(same)...*/}; window.ieHistorySelect=()=>{/*...(same)...*/};

  // Generic Picture Viewer (uses picture1-window)
  window.openPicture = (src, title) => {
      openWindow('picture1-window', { imgSrc: src, imgTitle: title });
  };

  // My Computer & Explorer Window Logic
  function initMyComputer() {
    const myComputerWindow = document.getElementById('mycomputer-window');
    if (!myComputerWindow) return;
    myComputerWindow.querySelectorAll('.drive').forEach(driveIcon => {
        driveIcon.ondblclick = () => {
            const driveId = driveIcon.dataset.driveId;
            const driveName = driveIcon.dataset.driveName;
            const driveData = state.explorerWindowContents[driveId];
            if (driveData) {
                openExplorerWindow(driveId, driveName, driveData.icon, driveData.items);
            } else {
                openExplorerWindow(driveId, driveName, 'icons/All [Without duplicates]/Folder (Forbidden).ico', [{name: 'Cannot access this drive. It might be corrupted or just shy.', icon: 'icons/All [Without duplicates]/Error.ico', type:'message'}]);
            }
        };
    });
  }

  function initControlPanel() {
    const cpWindow = document.getElementById('controlpanel-window');
    if(!cpWindow) return;
    cpWindow.querySelectorAll('.folder-item').forEach(item => {
        item.ondblclick = () => {
            const opensExplorer = item.dataset.opensExplorer;
            const title = item.dataset.explorerTitle;
            const icon = item.dataset.explorerIcon;
            const contentData = state.explorerWindowContents[opensExplorer];
            if (contentData && contentData.items) {
                openExplorerWindow(opensExplorer, title, icon, contentData.items);
            } else {
                 openExplorerWindow(opensExplorer, title, icon, [{name: `Settings for '${title}' are currently unavailable. Please try yelling at the screen.`, icon: 'icons/All [Without duplicates]/Help page.ico', type:'message'}]);
            }
        };
    });
  }

  window.openExplorerWindow = (id, title, titleIconSrc, items) => {
    const explorerWindow = document.getElementById('explorer-window');
    const titleTextEl = document.getElementById('explorer-title-text');
    const titleIconEl = document.getElementById('explorer-title-icon');
    const contentEl = document.getElementById('explorer-content');

    if (!explorerWindow || !titleTextEl || !titleIconEl || !contentEl) return;

    titleTextEl.textContent = title;
    titleIconEl.src = titleIconSrc;
    contentEl.innerHTML = ''; // Clear previous content

    const grid = document.createElement('div');
    grid.className = 'folder-grid'; // Reuse folder-grid styling

    if (items && items.length > 0) {
        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'folder-item'; // Use folder-item for consistency
            itemEl.style.width = '80px'; // More compact for explorer items

            const img = document.createElement('img');
            img.src = item.icon;
            img.alt = item.name;
            img.style.width = '32px'; img.style.height = '32px'; // Smaller icons in explorer lists
            img.style.border = 'none'; // No border for these list icons

            const nameDiv = document.createElement('div');
            nameDiv.textContent = item.name;

            itemEl.appendChild(img);
            itemEl.appendChild(nameDiv);

            if (item.type === 'folder') {
                itemEl.ondblclick = () => alert(`You tried to open folder: ${item.name}. \nFurther exploration is beyond this simulation!`);
            } else if (item.type === 'file') {
                itemEl.ondblclick = () => alert(`You tried to open file: ${item.name}. \nFile content viewer not implemented here.`);
            } else if (item.type === 'message') {
                itemEl.style.width = 'auto'; // Let message take more width
                itemEl.style.textAlign = 'left';
                itemEl.style.cursor = 'default';
                nameDiv.style.whiteSpace = 'normal';
            }
            grid.appendChild(itemEl);
        });
    } else {
        grid.innerHTML = '<p style="padding:10px; font-style:italic;">This folder is empty or content is not defined.</p>';
    }
    contentEl.appendChild(grid);
    openWindow('explorer-window');
  };

  function initSoundTrayIcon() {
    const soundIcon = document.getElementById('sound-tray-icon-clickable');
    if (soundIcon) {
        soundIcon.onclick = () => openWindow('sound-control-window');
    }
  }


   // NAS File Upload & Gallery Placeholders (Keep as is, or implement fully)
   const NAS_BASE_URL = 'http://YOUR_NAS_IP:5000/webapi'; let synoAuthToken = null;
   async function loginToSynology() { /* ... (same as before) ... */ return false; }
   window.uploadMedia = async function() { /* ... (same as before) ... */ };
   window.loadGallery = async function() { /* ... (same as before) ... */ };
   const synoErrorCodes = { /* ... (same as before) ... */ };

}); // End DOMContentLoaded