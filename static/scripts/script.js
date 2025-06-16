document.addEventListener('DOMContentLoaded', () => {
  let gameIdToDelete = null;
  const PLACEHOLDER_IMG = '/static/img/no-image.png';

  // Toast show/hide helpers
  function showToast(message, type = 'success', duration = 3000) {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toast-icon');
    const msg = document.getElementById('toast-message');

    if (!toast || !icon || !msg) return;

    icon.textContent = type === 'error' ? '❌' : '✅';
    msg.textContent = message;

    toast.className = `toast show ${type}`;
    clearTimeout(toast.hideTimeout);
    toast.hideTimeout = setTimeout(hideToast, duration);
  }

  function hideToast() {
    const toast = document.getElementById('toast');
    if (toast) toast.className = 'toast';
  }

  // Confirm delete dialog
  function showConfirmDelete(id) {
    gameIdToDelete = id;
    const confirmToast = document.getElementById('confirm-toast');
    if (confirmToast) {
      confirmToast.style.display = 'flex';
      confirmToast.classList.add('show');
    }
  }

  function hideConfirmToast() {
    const confirmToast = document.getElementById('confirm-toast');
    if (confirmToast) {
      confirmToast.classList.remove('show');
      confirmToast.style.display = 'none';
    }
    gameIdToDelete = null;
  }

  // Confirm delete buttons
  const confirmYesBtn = document.getElementById('confirm-yes');
  const confirmNoBtn = document.getElementById('confirm-no');

  if (confirmYesBtn && confirmNoBtn) {
    confirmYesBtn.addEventListener('click', async () => {
      if (!gameIdToDelete) return;

      // Prompt user for deletion code
      const userCode = prompt("Enter deletion code to confirm:");

      if (!userCode) {
        showToast("Deletion code is required.", "error");
        return;
      }

      // Send the code along with the delete request
      const res = await fetch(`/delete/${gameIdToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deletion_code: userCode })
      });

      if (res.ok) {
        showToast("Game deleted.", 'success');
        fetchGames();
      } else {
        const error = await res.json();
        showToast(error.message || "Failed to delete game.", 'error');
      }

      hideConfirmToast();
    });

    confirmNoBtn.addEventListener('click', () => {
      hideConfirmToast();
    });
  }

  async function fetchGameImage(game) {
    if (game.image_url) return game.image_url;
    return PLACEHOLDER_IMG;
  }

  async function fetchGames() {
    const res = await fetch('/games');
    const games = await res.json();
    displayGames(games);
  }

  async function displayGames(games) {
    const list = document.getElementById('gameList');
    if (!list) return;

    list.innerHTML = '';
    if (games.length === 0) {
      list.classList.add('no-games');
      list.innerHTML = '<p>No games found.</p>';
      return;
    } else {
      list.classList.remove('no-games');
    }

    for (const game of games) {
      const item = document.createElement('div');
      item.className = 'gameItem';
      item.style.cursor = 'pointer';

      const img = document.createElement('img');
      img.alt = `${game.name} cover`;
      img.style.width = '100%';
      img.style.borderRadius = '10px';
      img.style.marginBottom = '10px';

      const imageUrl = await fetchGameImage(game);
      img.src = imageUrl || PLACEHOLDER_IMG;

      img.onerror = () => {
        img.src = PLACEHOLDER_IMG;
      };

      const name = document.createElement('div');
      name.textContent = `${game.name} [${game.platform}]`;
      name.className = 'gameItem-text';

      const btn = document.createElement('button');
      btn.textContent = 'Delete';
      btn.style.marginTop = '10px';
      btn.style.backgroundColor = '#ff4d4d';
      btn.style.color = '#fff';
      btn.style.border = 'none';
      btn.style.padding = '6px 12px';
      btn.style.borderRadius = '5px';
      btn.style.cursor = 'pointer';

      // Prevent redirect when clicking delete
      btn.onclick = (e) => {
        e.stopPropagation();
        showConfirmDelete(game._id["$oid"]);
      };

      // Redirect when clicking the whole item
      item.addEventListener('click', () => {
        window.location.href = `/game/${game._id["$oid"]}`;
      });

      item.appendChild(img);
      item.appendChild(name);
      item.appendChild(btn);
      list.appendChild(item);
    }
  }

  async function searchGames() {
    const query = document.getElementById('searchBar')?.value.trim() || '';
    const platform = document.getElementById('platformSearch')?.value || '';

    let url = '/search?';
    if (query) url += `query=${encodeURIComponent(query)}&`;
    if (platform) url += `platform=${encodeURIComponent(platform)}`;

    const res = await fetch(url);
    const games = await res.json();
    displayGames(games);
  }

  async function addGame() {
    const name = document.getElementById('gameName')?.value.trim();
    const platform = document.getElementById('platform')?.value.trim();
    const imageUrl = document.getElementById('imageUrl')?.value.trim();

    if (!name || !platform) {
      showToast("Please enter both a game name and platform.", 'error');
      return;
    }

    const res = await fetch('/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, platform, image_url: imageUrl || null })
    });

    const result = await res.json();

    if (res.ok) {
      showToast("Game added successfully!", 'success');
      if (document.getElementById('gameName')) document.getElementById('gameName').value = '';
      if (document.getElementById('platform')) document.getElementById('platform').value = '';
      if (document.getElementById('imageUrl')) document.getElementById('imageUrl').value = '';
      fetchGames();
    } else {
      showToast(result.message || "Error adding game.", 'error');
    }
  }

  const searchBar = document.getElementById('searchBar');
  if (searchBar) searchBar.addEventListener('keyup', searchGames);

  const platformSearch = document.getElementById('platformSearch');
  if (platformSearch) platformSearch.addEventListener('change', searchGames);

  const addGameBtn = document.getElementById('addGameBtn');
  if (addGameBtn) addGameBtn.addEventListener('click', addGame);

  fetchGames();

  // --- Confirm Save Changes logic with AJAX ---
  const saveBtn = document.getElementById('save-btn');
  const confirmSaveToast = document.getElementById('confirm-save-toast');
  const confirmSaveYes = document.getElementById('confirm-save-yes');
  const confirmSaveNo = document.getElementById('confirm-save-no');
  const editForm = document.getElementById('edit-form');

  if (saveBtn && confirmSaveToast && confirmSaveYes && confirmSaveNo && editForm) {
    saveBtn.addEventListener('click', () => {
      confirmSaveToast.style.display = 'flex';
      confirmSaveToast.classList.add('show');
      confirmSaveToast.querySelector('p').textContent = 'Are you sure you want to save changes?';
      confirmSaveYes.style.display = 'inline-block';
      confirmSaveNo.style.display = 'inline-block';
      confirmSaveToast.style.background = '#222';
    });

    confirmSaveYes.addEventListener('click', async () => {
      confirmSaveYes.style.display = 'none';
      confirmSaveNo.style.display = 'none';

      confirmSaveToast.querySelector('p').textContent = 'Saving changes...';

      const formData = new FormData(editForm);
      const data = Object.fromEntries(formData.entries());

      try {
        const response = await fetch(editForm.action, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(data)
        });

        if (response.ok) {
          confirmSaveToast.querySelector('p').textContent = 'Changes saved successfully!';
          confirmSaveToast.style.background = '#222';

          setTimeout(() => {
            confirmSaveToast.classList.remove('show');
            confirmSaveToast.style.display = 'none';
            confirmSaveYes.style.display = 'inline-block';
            confirmSaveNo.style.display = 'inline-block';
          }, 3000);
        } else {
          const errorData = await response.json();
          confirmSaveToast.querySelector('p').textContent = errorData.message || 'Failed to save changes.';
          confirmSaveToast.style.background = '#800';
          confirmSaveNo.style.display = 'inline-block';
        }
      } catch (error) {
        confirmSaveToast.querySelector('p').textContent = 'Error saving changes.';
        confirmSaveToast.style.background = '#800';
        confirmSaveNo.style.display = 'inline-block';
      }
    });

    confirmSaveNo.addEventListener('click', () => {
      confirmSaveToast.classList.remove('show');
      confirmSaveToast.style.display = 'none';
      confirmSaveYes.style.display = 'inline-block';
      confirmSaveNo.style.display = 'inline-block';
    });
  }
});
