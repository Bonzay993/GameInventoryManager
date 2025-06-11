document.addEventListener('DOMContentLoaded', () => {
  let gameIdToDelete = null;

  const RAWG_API_KEY = 'YOUR_RAWG_API_KEY_HERE'; // <-- replace with your RAWG API key
  const PLACEHOLDER_IMG = 'https://via.placeholder.com/250x140?text=No+Image'; // fallback image

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
    console.log('showConfirmDelete called with ID:', id);
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
    console.log('Yes button clicked. ID to delete:', gameIdToDelete);
    if (!gameIdToDelete) return;

    const res = await fetch(`/delete/${gameIdToDelete}`, { method: 'DELETE' });
    console.log('Delete response status:', res.status);

    if (res.ok) {
      showToast("Game deleted.", 'success');
      fetchGames();
    } else {
      const error = await res.json();
      console.error('Delete failed:', error);
      showToast(error.message || "Failed to delete game.", 'error');
    }

    hideConfirmToast();
  });

  document.getElementById('confirm-no').addEventListener('click', () => {
    hideConfirmToast();
  });

  async function fetchGameImage(name, platform) {
    try {
      const query = encodeURIComponent(name);
      const url = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${query}&page_size=1`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results[0].background_image || null;
      }
    } catch (error) {
      console.error('Error fetching game image:', error);
    }
    return null;
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
      list.innerHTML = '<p>No games found.</p>';
      return;
    }

    for (const game of games) {
      const item = document.createElement('div');
      item.className = 'gameItem';

      // Create and set up image element
      const img = document.createElement('img');
      img.alt = `${game.name} cover`;
      img.style.width = '100%';
      img.style.borderRadius = '10px';
      img.style.marginBottom = '10px';

      // Fetch image from RAWG API
      const imageUrl = await fetchGameImage(game.name, game.platform);
      img.src = imageUrl || PLACEHOLDER_IMG;

      const name = document.createElement('div');
      name.textContent = `${game.name} [${game.platform}]`;

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
        console.log('Delete button clicked for ID:', game._id);
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
    if (query === '') {
      fetchGames();
      return;
    }

    const res = await fetch(`/search?query=${encodeURIComponent(query)}`);
    const games = await res.json();
    displayGames(games);
  }

  async function addGame() {
    const name = document.getElementById('gameName').value.trim();
    const platform = document.getElementById('platform').value.trim();

    if (!name || !platform) {
      showToast("Please enter both a game name and platform.", 'error');
      return;
    }

    const res = await fetch('/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, platform })
    });

    const result = await res.json();

    if (res.ok) {
      showToast("Game added successfully!", 'success');
      document.getElementById('gameName').value = '';
      document.getElementById('platform').value = '';
      fetchGames();
    } else {
      showToast(result.message || "Error adding game.", 'error');
    }
  }

  document.getElementById('searchBar').addEventListener('keyup', searchGames);
  document.querySelector('button[onclick="addGame()"]').addEventListener('click', addGame);

  fetchGames();
});
