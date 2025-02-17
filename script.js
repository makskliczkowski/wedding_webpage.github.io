// Global object to track window buttons on the taskbar
const windowButtons = {};

// Open a window and add a corresponding taskbar button if needed.
function openWindow(windowId) {
  const win = document.getElementById(windowId);
  win.style.display = 'block';
  win.style.zIndex = Date.now();
  if (!windowButtons[windowId]) {
    const titleText = win.querySelector('.title-bar span').textContent;
    createWindowButton(windowId, titleText);
  } else {
    windowButtons[windowId].classList.add('active');
  }
  if(windowId === 'email-window'){
    switchFolder('inbox');
  }
}

// Create a taskbar button for the window.
function createWindowButton(windowId, windowTitle) {
  const btn = document.createElement('button');
  btn.className = 'window-button active';
  btn.textContent = windowTitle;
  btn.onclick = function() {
    const win = document.getElementById(windowId);
    if(win.style.display === 'none' || win.style.display === ''){
      win.style.display = 'block';
      win.style.zIndex = Date.now();
      btn.classList.add('active');
    } else {
      win.style.display = 'none';
      btn.classList.remove('active');
    }
  };
  document.getElementById('window-buttons').appendChild(btn);
  windowButtons[windowId] = btn;
}

// Close, minimize, and maximize functions
function closeWindow(windowId) {
  const win = document.getElementById(windowId);
  win.style.display = 'none';
  if(windowButtons[windowId]) {
    // Remove the button entirely on exit
    windowButtons[windowId].remove();
    delete windowButtons[windowId];
  }
}

function minimizeWindow(windowId) {
  document.getElementById(windowId).style.display = 'none';
  if(windowButtons[windowId]) windowButtons[windowId].classList.remove('active');
}

function maximizeWindow(windowId) {
  const win = document.getElementById(windowId);
  if(!win.dataset.maximized || win.dataset.maximized === 'false'){
    win.dataset.originalLeft = win.style.left;
    win.dataset.originalTop = win.style.top;
    win.dataset.originalWidth = win.style.width;
    win.dataset.originalHeight = win.style.height;
    win.style.left = '0px';
    win.style.top = '0px';
    win.style.width = window.innerWidth + 'px';
    win.style.height = (window.innerHeight - 40) + 'px';
    win.dataset.maximized = 'true';
  } else {
    win.style.left = win.dataset.originalLeft;
    win.style.top = win.dataset.originalTop;
    win.style.width = win.dataset.originalWidth;
    win.style.height = win.dataset.originalHeight;
    win.dataset.maximized = 'false';
  }
}

// Mailto function for Invitation window (kept for compatibility)
function sendEmail(confirm) {
  const recipient = "maxgrom97@gmail.com";
  const subject = encodeURIComponent("[Slub separowo] Potwierdzenie obecnosci.");
  const body = confirm 
    ? encodeURIComponent("Potwierdzam moją obecność na wydarzeniu. Dziękuję!\nPozdrawiam,") 
    : encodeURIComponent("Niestety nie będę mógł/mogła uczestniczyć w wydarzeniu.\nPozdrawiam,");
  window.location.href = "mailto:" + recipient + "?subject=" + subject + "&body=" + body;
}

// Email Send Function from File menu in email window
function sendEmailMessage() {
  alert("Email has been sent. Congratulations.");
}

// Make a window draggable via its title bar.
function makeDraggable(windowEl, handleEl) {
  let offsetX = 0, offsetY = 0, isDragging = false;
  handleEl.addEventListener('mousedown', function(e) {
    isDragging = true;
    const rect = windowEl.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    windowEl.style.zIndex = Date.now();
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if(isDragging) {
      const desktopRect = document.querySelector('.desktop').getBoundingClientRect();
      let newLeft = e.clientX - offsetX - desktopRect.left;
      let newTop = e.clientY - offsetY - desktopRect.top;
      if(newLeft < 0) newLeft = 0;
      if(newTop < 0) newTop = 0;
      windowEl.style.left = newLeft + 'px';
      windowEl.style.top = newTop + 'px';
    }
  });
  document.addEventListener('mouseup', function() {
    isDragging = false;
  });
}

// Make desktop icons draggable and snap to grid
function makeIconDraggable(icon) {
  let offsetX, offsetY, startX, startY;
  let dragging = false;
  icon.addEventListener('mousedown', function(e) {
    if(e.button !== 0) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = icon.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    icon.style.zIndex = 9999;
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if(dragging) {
      let newLeft = e.clientX - offsetX;
      let newTop = e.clientY - offsetY;
      icon.style.left = newLeft + 'px';
      icon.style.top = newTop + 'px';
    }
  });
  document.addEventListener('mouseup', function(e) {
    if(dragging) {
      dragging = false;
      let gridSize = 80;
      let left = parseInt(icon.style.left);
      let top = parseInt(icon.style.top);
      let snappedLeft = Math.round(left / gridSize) * gridSize;
      let snappedTop = Math.round(top / gridSize) * gridSize;
      icon.style.left = snappedLeft + 'px';
      icon.style.top = snappedTop + 'px';
    }
  });
}

// Initialize draggable icons
document.querySelectorAll('.icon').forEach(function(icon){
  makeIconDraggable(icon);
});

// Desktop Icon double-click events to open windows
document.getElementById('invitation-icon').addEventListener('dblclick', function() {
  openWindow('invitation-window');
});
document.getElementById('outlook-icon').addEventListener('dblclick', function() {
  openWindow('email-window');
});
document.getElementById('mycomputer-icon').addEventListener('dblclick', function() {
  openWindow('mycomputer-window');
});
document.getElementById('picture1-icon').addEventListener('dblclick', function() {
  openWindow('picture1-window');
});
document.getElementById('picture2-icon').addEventListener('dblclick', function() {
  openWindow('picture2-window');
});
document.getElementById('recycle-icon').addEventListener('dblclick', function() {
  alert('Recycle Bin is empty.');
});
document.getElementById('folder-icon').addEventListener('dblclick', function() {
  openWindow('folder-window');
});
document.getElementById('gallery-icon').addEventListener('dblclick', function() {
  openWindow('gallery-window');
});
document.getElementById('upload-icon').addEventListener('dblclick', function() {
  openWindow('upload-window');
});

// Make windows draggable
makeDraggable(document.getElementById('invitation-window'), document.getElementById('invitation-title'));
makeDraggable(document.getElementById('email-window'), document.getElementById('email-title'));
makeDraggable(document.getElementById('help-window'), document.getElementById('help-title'));
makeDraggable(document.getElementById('mycomputer-window'), document.getElementById('mycomputer-title'));
makeDraggable(document.getElementById('picture1-window'), document.getElementById('picture1-title'));
makeDraggable(document.getElementById('picture2-window'), document.getElementById('picture2-title'));

// Make windows resizable using the resizer elements
function makeResizable(windowEl) {
  let isResizing = false;
  let startX, startY, startWidth, startHeight, startLeft, startTop, currentResizer;
  const resizers = windowEl.querySelectorAll('.resizer');
  resizers.forEach(resizer => {
    resizer.addEventListener('mousedown', function(e) {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = windowEl.getBoundingClientRect();
      startWidth = rect.width;
      startHeight = rect.height;
      startLeft = rect.left;
      startTop = rect.top;
      currentResizer = resizer;
      e.preventDefault();
      e.stopPropagation();
    });
  });
  document.addEventListener('mousemove', function(e) {
    if (!isResizing) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (currentResizer.classList.contains('resizer-lower-right')) {
      windowEl.style.width = (startWidth + dx) + 'px';
      windowEl.style.height = (startHeight + dy) + 'px';
    } else if (currentResizer.classList.contains('resizer-lower-left')) {
      windowEl.style.width = (startWidth - dx) + 'px';
      windowEl.style.height = (startHeight + dy) + 'px';
      windowEl.style.left = (startLeft + dx) + 'px';
    } else if (currentResizer.classList.contains('resizer-upper-left')) {
      windowEl.style.width = (startWidth - dx) + 'px';
      windowEl.style.height = (startHeight - dy) + 'px';
      windowEl.style.left = (startLeft + dx) + 'px';
      windowEl.style.top = (startTop + dy) + 'px';
    } else if (currentResizer.classList.contains('resizer-left')) {
      windowEl.style.width = (startWidth - dx) + 'px';
      windowEl.style.left = (startLeft + dx) + 'px';
    }
  });
  document.addEventListener('mouseup', function(e) {
    isResizing = false;
  });
}

// Initialize resizable windows
[ 'invitation-window', 'email-window', 'help-window', 
  'mycomputer-window', 'picture1-window', 'picture2-window', 'folder-window',
  'galery-window', 'upload-window'

].forEach(function(id) {
  if (id) {
    makeResizable(document.getElementById(id));
  }
});

// Email data for folders
const emailData = {
  inbox: [
    {
      id: 1,
      subject: "Zaproszenie na ślub",
      content: "Oliwia i Maks,  \
                serdecznie zapraszają na uroczystość zawarcia związku małżeńskiego oraz\n                   \
                przyjęcie weselne, które odbędą się 3 sierpnia 2025 o godzinie 17:00 w Dworku Separowo.\n   \
                Separowo 8, 62-066 Separowo.\n\n                                                            \
                Prosimy o potwierdznie swojej obecności do 01.05.25\n"
    }
  ],
  outbox: [
    {
      id: 3,
      subject: "Outbox Email",
      content: "There are no emails in the Outbox."
    }
  ],
  sent: [
    {
      id: 2,
      subject: "Email to Elon Musk and Donald Trump",
      content: "Dear Elon Musk and Donald Trump,\n\nI am pleased to inform you that we successfully transformed the Gulf of Mexico into a giant swimming pool.\nPlease join us for a pool party this weekend.\n\nBest regards,\n\nErnest Głowacki"
    }
  ]
};

function switchFolder(folder) {
  const list = document.getElementById('email-list');
  const content = document.getElementById('email-content');
  list.innerHTML = '';
  content.innerHTML = '<p>Select an email to view its content.</p>';
  const emails = emailData[folder] || [];
  emails.forEach(function(email) {
    const item = document.createElement('div');
    item.className = 'email-item';
    item.textContent = email.subject;
    item.onclick = function() {
      content.innerHTML = email.content;
      // If this is the invitation email (id 1), add confirm/decline buttons.
      if(email.id === 1) {
        const btnDiv = document.createElement('div');
        btnDiv.innerHTML = '<button onclick="sendEmail(true)">Confirm</button> <button onclick="sendEmail(false)">Decline</button>';
        content.appendChild(btnDiv);
      }
    };
    list.appendChild(item);
  });
}

// Update the clock every second
function updateClock() {
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  minutes = minutes < 10 ? "0" + minutes : minutes;
  document.getElementById('clock').textContent = hours + ":" + minutes;
}
setInterval(updateClock, 1000);
updateClock();

// Toggle Start Menu display (only when clicking the start button)
const startButton = document.getElementById('start-button');
const startMenu = document.getElementById('start-menu');
startButton.addEventListener('click', function(e) {
  // Toggle between 'flex' and 'none'
  if(startMenu.style.display === 'flex') {
    startMenu.style.display = 'none';
  } else {
    startMenu.style.display = 'flex';
  }
  e.stopPropagation();
});
// Hide Start Menu when clicking outside of it.
document.addEventListener('click', function(e) {
  if (!startMenu.contains(e.target) && e.target !== startButton) {
    startMenu.style.display = 'none';
  }
});

function makeDraggable(windowEl, handleEl) {
  let offsetX = 0, offsetY = 0, isDragging = false;

  function startDrag(e) {
    isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = windowEl.getBoundingClientRect();
    offsetX = clientX - rect.left;
    offsetY = clientY - rect.top;
    windowEl.style.zIndex = Date.now();
    e.preventDefault();
  }

  function doDrag(e) {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const desktopRect = document.querySelector('.desktop').getBoundingClientRect();
    let newLeft = clientX - offsetX - desktopRect.left;
    let newTop = clientY - offsetY - desktopRect.top;
    if(newLeft < 0) newLeft = 0;
    if(newTop < 0) newTop = 0;
    windowEl.style.left = newLeft + 'px';
    windowEl.style.top = newTop + 'px';
  }

  function stopDrag() {
    isDragging = false;
  }

  handleEl.addEventListener('mousedown', startDrag);
  handleEl.addEventListener('touchstart', startDrag);
  
  document.addEventListener('mousemove', doDrag);
  document.addEventListener('touchmove', doDrag);
  
  document.addEventListener('mouseup', stopDrag);
  document.addEventListener('touchend', stopDrag);
}


function addIconListener(iconId, windowId) {
  const icon = document.getElementById(iconId);
  icon.addEventListener('dblclick', () => openWindow(windowId));
  icon.addEventListener('touchend', () => openWindow(windowId));
}


addIconListener('folder-icon', 'folder-window');
addIconListener('invitation-icon', 'invitation-window');
addIconListener('outlook-icon', 'email-window');
addIconListener('mycomputer-icon', 'mycomputer-window');
addIconListener('picture1-icon', 'picture1-window');
addIconListener('picture2-icon', 'picture2-window');
addIconListener('gallery-icon', 'gallery-window');
addIconListener('upload-icon', 'upload-window');

// ################################################################################################################
// Pictures show in folder
// ################################################################################################################

function openPicture(src, title) {
  // For simplicity, open a new window widget that fills with the chosen image.
  // You could modify this function to use an existing picture window or modal.
  const picWindow = document.createElement('div');
  picWindow.className = 'window';
  picWindow.style.cssText = 'left: 100px; top: 100px; width: 500px; height: 400px; display: block; z-index: ' + Date.now();

  // Title bar
  const titleBar = document.createElement('div');
  titleBar.className = 'title-bar';
  titleBar.innerHTML = `<span>${title}</span>
    <div class="window-controls">
      <button class="minimize" onclick="this.parentNode.parentNode.parentNode.style.display='none'">_</button>
      <button class="maximize" onclick="alert('Maximize not implemented')">[ ]</button>
      <button class="close-button" onclick="this.parentNode.parentNode.parentNode.remove()">X</button>
    </div>`;
  picWindow.appendChild(titleBar);

  // Content area with full-size image
  const content = document.createElement('div');
  content.className = 'content';
  content.style.cssText = 'padding: 0; overflow: hidden;';
  const img = document.createElement('img');
  img.src = src;
  img.alt = title;
  img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
  content.appendChild(img);
  picWindow.appendChild(content);

  // Append resizers (you can add these similarly as before)
  ['resizer-lower-right','resizer-lower-left','resizer-upper-left','resizer-left'].forEach(className => {
      const resizer = document.createElement('div');
      resizer.className = 'resizer ' + className;
      picWindow.appendChild(resizer);
  });

  // Append to desktop
  document.querySelector('.desktop').appendChild(picWindow);

  // Optionally, make the new window draggable and resizable
  makeDraggable(picWindow, titleBar);
  makeResizable(picWindow);
}

// ################################################################################################################

// Ustawienia – podmień na swoje dane
const NAS_BASE_URL = 'http://your-nas-ip:5000/webapi/';
let authToken = 'YOUR_AUTH_TOKEN'; // Token uzyskany przez logowanie do DSM

// Funkcja przesyłania plików do NAS za pomocą API File Station
function uploadMedia() {
  const input = document.getElementById('file-input');
  if (input.files.length === 0) {
    alert("Wybierz plik do przesłania.");
    return;
  }
  const formData = new FormData();
  // Przesyłamy do folderu /Public/Uploads – dostosuj ścieżkę, jeśli potrzebujesz
  formData.append('folder_path', '/Public/Uploads');
  formData.append('overwrite', 'true');
  for (let i = 0; i < input.files.length; i++) {
    formData.append('file', input.files[i]);
  }
  
  const url = `${NAS_BASE_URL}entry.cgi?api=SYNO.FileStation.Upload&version=2&method=upload&folder_path=/Public/Uploads&overwrite=true&_sid=${authToken}`;
  
  fetch(url, {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    if(data.success) {
      document.getElementById('upload-status').textContent = 'File uploaded successfully.';
    } else {
      document.getElementById('upload-status').textContent = 'Error uploading file.';
      console.error(data);
    }
  })
  .catch(err => {
    document.getElementById('upload-status').textContent = 'Error uploading file.';
    console.error(err);
  });
}

// Funkcja ładowania galerii – pobiera listę plików z NAS przy użyciu API File Station
function loadGallery() {
  const folderPath = '/Public/Uploads'; // Folder, z którego pobieramy pliki
  const url = `${NAS_BASE_URL}entry.cgi?api=SYNO.FileStation.List&version=2&method=list&folder_path=${encodeURIComponent(folderPath)}&_sid=${authToken}`;
  
  fetch(url)
    .then(response => response.json())
    .then(data => {
      if(data.success) {
        const container = document.getElementById('gallery-container');
        container.innerHTML = '';
        data.data.files.forEach(file => {
          // Sprawdzamy, czy plik to obraz lub film
          if (/\.(jpe?g|png|gif)$/i.test(file.name)) {
            const img = document.createElement('img');
            // Upewnij się, że Twoje NAS umożliwia publiczny dostęp do tych plików lub odpowiednio skonfiguruj przekierowanie
            img.src = `http://your-nas-ip:5000/files/Public/Uploads/${encodeURIComponent(file.name)}`;
            img.alt = file.name;
            img.style.width = '100px';
            img.style.margin = '5px';
            container.appendChild(img);
          } else if (/\.(mp4|webm|ogg)$/i.test(file.name)) {
            const video = document.createElement('video');
            video.src = `http://your-nas-ip:5000/files/Public/Uploads/${encodeURIComponent(file.name)}`;
            video.controls = true;
            video.style.width = '150px';
            video.style.margin = '5px';
            container.appendChild(video);
          }
        });
      } else {
        console.error('Błąd pobierania plików', data);
      }
    })
    .catch(err => console.error(err));
}