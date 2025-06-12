document.addEventListener('DOMContentLoaded', () => {
  let gameIdToDelete = null;
  const PLACEHOLDER_IMG = '/static/img/no-image.png';

  function showToast(message, type = 'success', duration = 3000) {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toast-icon');
    const msg = document.getElementById('toast-message');

    icon.textContent = type === 'error' ? '❌' : '✅';
    msg.textContent = message;

    toast.className = `toast show ${type}`;
    clearTimeout(toast.hideTimeout);
    toast.hideTimeout = setTimeout(hideToast, duration);
  }

  function hideToast() {
    const toast = document.getElementById('toast');
    toast.className = 'toast';
  }

  function showConfirmDelete(id) {
    gameIdToDelete = id;
    const confirmToast = document.getElementById('confirm-toast');
    confirmToast.style.display = 'flex';
    confirmToast.classList.add('show');
  }

  function hideConfirmToast() {
    const confirmToast = document.getElementById('confirm-toast');
    confirmToast.classList.remove('show');
    confirmToast.style.display = 'none';
    gameIdToDelete = null;
  }

  document.getElementById('confirm-yes').addEventListener('click', async () => {
    if (!gameIdToDelete) return;
    const res = await fetch(`/delete/${gameIdToDelete}`, { method: 'DELETE' });

    if (res.ok) {
      showToast("Game deleted.", 'success');
      fetchGames();
    } else {
      const error = await res.json();
      showToast(error.message || "Failed to delete game.", 'error');
    }

    hideConfirmToast();
  });

  document.getElementById('confirm-no').addEventListener('click', () => {
    hideConfirmToast();
  });

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
    list.innerHTML = '';
    if (games.length === 0) {
      list.innerHTML = '<p class="no-games centered-message">No games found.</p>';
      return;
    }

    for (const game of games) {
      const item = document.createElement('div');
      item.className = 'gameItem';

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

      btn.onclick = () => {
        showConfirmDelete(game._id["$oid"]);
      };

      item.appendChild(img);
      item.appendChild(name);
      item.appendChild(btn);
      list.appendChild(item);
    }
  }

  async function searchGames() {
    const query = document.getElementById('searchBar').value.trim();
    const platform = document.getElementById('platformSearch').value; // ← fixed here

    let url = '/search?';
    if (query) url += `query=${encodeURIComponent(query)}&`;
    if (platform) url += `platform=${encodeURIComponent(platform)}`;

    const res = await fetch(url);
    const games = await res.json();
    displayGames(games);
}

  async function addGame() {
    const name = document.getElementById('gameName').value.trim();
    const platform = document.getElementById('platform').value.trim();
    const imageUrl = document.getElementById('imageUrl').value.trim();

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
      document.getElementById('gameName').value = '';
      document.getElementById('platform').value = '';
      document.getElementById('imageUrl').value = '';
      fetchGames();
    } else {
      showToast(result.message || "Error adding game.", 'error');
    }
  }

  document.getElementById('searchBar').addEventListener('keyup', searchGames);
  document.getElementById('platformSearch').addEventListener('change', searchGames);  // changed here
  document.getElementById('addGameBtn').addEventListener('click', addGame);

  fetchGames();

  window.addGame = addGame;
  window.hideToast = hideToast;
});
