// =================================================================
// 1. GLOBAL VARIABLES & SELECTORS
// =================================================================
const API_BASE_URL = "/api";

const viewHome = document.getElementById("view-home");
const viewGame = document.getElementById("view-game");
const resultsContainer = document.getElementById("results");

const searchInput = document.getElementById("game-search");
const autocompleteList = document.getElementById("autocomplete-list");
const searchForm = document.querySelector(".search-form");

const currentViewTitle = document.getElementById("current-view-title");
const currentViewSubtitle = document.getElementById("current-view-subtitle");
const orderSelect = document.getElementById("order-select");
const loadMoreBtn = document.getElementById("load-more-btn");
const toastContainer = document.getElementById("toast-container");
const sidebarLinks = document.querySelectorAll(".nav-link");

let currentQuery = "ordering=-added";
let currentPage = 1;
let userFavorites = JSON.parse(localStorage.getItem('gamerecs_favorites')) || [];
let userRatings = JSON.parse(localStorage.getItem('gamerecs_ratings')) || {};
let userOwnership = JSON.parse(localStorage.getItem('gamerecs_ownership')) || {};
let debounceTimeout = null;

const gameCache = new Map();

// =================================================================
// 2. UX UTILITIES & SECURITY
// =================================================================
function escapeHTML(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.classList.add('toast');
  toast.innerText = message;
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('hide');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

function setView(viewName) {
  if (viewName === 'home') {
    viewHome.classList.remove('hidden');
    viewGame.classList.add('hidden');
    document.body.style.backgroundImage = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    viewHome.classList.add('hidden');
    viewGame.classList.remove('hidden');
    window.scrollTo({ top: 0 });
  }
}

function renderSkeletons(count = 12, append = false) {
  if (!append) resultsContainer.innerHTML = "";
  loadMoreBtn.classList.add("hidden");
  
  const fragment = document.createDocumentFragment();
  for(let i = 0; i < count; i++) {
    const skel = document.createElement('div');
    skel.className = 'skeleton-card';
    skel.innerHTML = `
      <div class="skel-img"></div>
      <div class="skel-text"></div>
      <div class="skel-text short"></div>
    `;
    fragment.appendChild(skel);
  }
  resultsContainer.appendChild(fragment);
}

// =================================================================
// 3. API & DATA FETCHING
// =================================================================
async function fetchFromBackend(endpoint) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);
  if (!response.ok) throw new Error(`Status HTTP: ${response.status}`);
  return response.json();
}

async function loadFeed(queryStr = "", page = 1, append = false) {
  currentQuery = queryStr;
  currentPage = page;
  
  if (!append) {
      setView('home');
      renderSkeletons(12);
  } else {
      loadMoreBtn.classList.add("hidden");
      renderSkeletons(4, true);
  }
  
  try {
    const data = await fetchFromBackend(`/games?${queryStr}&page=${page}&page_size=20`);
    
    if (append) {
       const skels = resultsContainer.querySelectorAll('.skeleton-card');
       skels.forEach(s => s.remove());
    } else {
       resultsContainer.innerHTML = "";
    }

    if (data.results && data.results.length > 0) {
      const fragment = document.createDocumentFragment();
      data.results.forEach(game => fragment.appendChild(createGameCard(game)));
      resultsContainer.appendChild(fragment);
      
      if (data.next) {
          loadMoreBtn.classList.remove("hidden");
      }
    } else if (!append) {
      const msg = document.createElement("p");
      msg.style.cssText = "color:#888; font-size:1.2rem; padding: 40px;";
      msg.textContent = "Nenhum jogo encontrado para esta busca.";
      resultsContainer.appendChild(msg);
    }
  } catch (error) {
    console.error(error);
    if (!append) resultsContainer.innerHTML = `<p style="color:#f43f5e; padding: 40px;">Falha ao carregar metadados. Verifique o servidor local.</p>`;
  }
}

// =================================================================
// 4. COMPONENTS GENERATION (HOME GRID)
// =================================================================
function createGameCard(game) {
  const card = document.createElement("div");
  card.className = "game-card";
  card.dataset.slug = game.slug;
  card.dataset.bg = game.background_image;
  
  const isFav = userFavorites.some(f => f.slug === game.slug);
  const platforms = game.parent_platforms?.map(p => p.platform.name.substring(0,2)).join(' ') || 'PC';
  const genres = game.genres?.map(g => g.name).join(', ') || 'Ação';
  const releaseDate = game.released ? new Date(game.released).toLocaleDateString('pt-BR', { timeZone: 'UTC'}) : 'TBA';

  const safeName = escapeHTML(game.name);
  const safePlatforms = escapeHTML(platforms);
  const safeGenres = escapeHTML(genres);
  const safeRelease = escapeHTML(releaseDate);

  card.innerHTML = `
    <div class="card-media">
      <img src="${game.background_image || 'https://via.placeholder.com/400x200?text=GAME'}" alt="${safeName}" loading="lazy"/>
    </div>
    <div class="card-info">
      <div class="platforms">${safePlatforms}</div>
      <div class="card-title">${safeName}</div>
      <div class="card-metrics">
        <button class="metric-btn fav-btn ${isFav ? 'favorited' : ''}" data-slug="${game.slug}">
           ${isFav ? '✓ Adicionado' : '+ Adicionar'}
        </button>
      </div>
      <div class="card-details-hover">
         <div class="detail-row"><span class="detail-label">Lançamento:</span> <span class="detail-value">${safeRelease}</span></div>
         <div class="detail-row"><span class="detail-label">Gêneros:</span> <span class="detail-value">${safeGenres}</span></div>
         <div class="detail-row"><span class="detail-label">Nota Média:</span> <span class="detail-value">★ ${game.rating || 'N/A'}</span></div>
      </div>
    </div>
  `;
  return card;
}

// =================================================================
// 5. GAME DETAILS VIEW (PT-BR) + RECOMENDAÇÕES E AVALIAÇÃO PESSOAL
// =================================================================
async function loadGameDetails(slug, backgroundUrl) {
  setView('game');
  
  if(backgroundUrl && backgroundUrl !== 'undefined') {
      document.body.style.backgroundImage = `linear-gradient(to right, #151515 10%, rgba(21,21,21,0.8) 60%, rgba(21,21,21,0.4) 100%), url('${backgroundUrl}')`;
  } else {
      document.body.style.backgroundImage = 'none';
  }

  const leftPanel = document.getElementById("game-info-left");
  const rightPanel = document.getElementById("game-info-right");
  
  leftPanel.innerHTML = `<div style="padding:50px; color:#888;">Carregando dados confidenciais...</div>`;
  rightPanel.innerHTML = "";

  if(gameCache.has(slug)) {
      renderDetailedGame(gameCache.get(slug));
      return;
  }

  try {
    const details = await fetchFromBackend(`/games/${slug}`);
    
    const tagSlugs = details.tags?.filter(t => t.slug && t.slug.length < 20).slice(0, 2).map(t => t.slug).join(",") || "";
    const genreSlugs = details.genres?.slice(0, 2).map(g => g.slug).join(",") || "";
    let qParams = new URLSearchParams();
    if(tagSlugs) qParams.append("tags", tagSlugs);
    if(genreSlugs) qParams.append("genres", genreSlugs);
    qParams.append("ordering", "-rating");
    qParams.append("page_size", "8");

    const [screenshotsData, moviesData, storesData, recommendationsData] = await Promise.all([
      fetchFromBackend(`/games/${slug}/screenshots`),
      fetchFromBackend(`/games/${slug}/movies`),
      fetchFromBackend(`/games/${slug}/stores`),
      fetchFromBackend(`/games?${qParams.toString()}`)
    ]);
    
    // Filtro para não recomendar o próprio jogo
    const recommendations = (recommendationsData.results || []).filter(g => g.slug !== slug).slice(0, 8);

    const gameData = { 
        details, 
        screenshots: screenshotsData.results || [], 
        movies: moviesData.results || [], 
        stores: storesData.results || [],
        recommendations: recommendations
    };
    gameCache.set(slug, gameData); 
    renderDetailedGame(gameData);
  } catch (error) {
    console.error(error);
    leftPanel.innerHTML = `<div style="padding:50px; color:#f43f5e;">Falha crítica ao tentar recuperar dados do jogo.</div>`;
  }
}

function renderDetailedGame(gameData) {
  const { details, screenshots, movies, stores, recommendations } = gameData;
  const leftPanel = document.getElementById("game-info-left");
  const rightPanel = document.getElementById("game-info-right");

  const isFav = userFavorites.some(f => f.slug === details.slug);

  let recommendedHTML = "";
  if(recommendations.length > 0) {
      recommendedHTML = `
      <div class="recommended-games">
          <h3>Jogos Semelhantes Recomendados</h3>
          <div class="recommended-grid">
              ${recommendations.map(r => {
                  const rName = escapeHTML(r.name);
                  return `
                  <div class="mini-card" data-slug="${r.slug}" data-bg="${r.background_image}">
                      <img src="${r.background_image || 'https://via.placeholder.com/300x150?text=IMG'}" loading="lazy"/>
                      <div class="mini-card-info">
                          <div class="mini-card-title" title="${rName}">${rName}</div>
                          <div class="mini-card-btn">+ Detalhes</div>
                      </div>
                  </div>
              `}).join('')}
          </div>
      </div>`;
  }

  leftPanel.innerHTML = `
    <div class="breadcrumbs">
        <a href="#" onclick="setView('home'); return false;">INÍCIO</a> &gt; 
        <a href="#">JOGOS</a> &gt; 
        <span>${escapeHTML(details.name.toUpperCase())}</span>
    </div>
    <div class="game-header">
       ${details.released ? `<div class="game-publish-date">${new Date(details.released).toLocaleDateString('pt-BR', { timeZone: 'UTC'})}</div>` : ''}
       <h1 class="game-title">${escapeHTML(details.name)}</h1>
    </div>
    
    <div class="game-actions-bar">
       <button class="action-btn primary fav-btn ${isFav ? 'favorited' : ''}" data-slug="${details.slug}">
           ${isFav ? '✓ Na Biblioteca' : '+ Salvar na Coleção'}
       </button>
       <button class="action-btn" style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px;">🎁 Lista de Desejos</button>
    </div>

    <div class="personal-rating-widget">
       <div class="rating-title">Sua Avaliação Pessoal</div>
       <div class="stars-container" data-slug="${details.slug}">
          <span class="star" data-value="1">★</span>
          <span class="star" data-value="2">★</span>
          <span class="star" data-value="3">★</span>
          <span class="star" data-value="4">★</span>
          <span class="star" data-value="5">★</span>
       </div>
       <div class="rating-feedback hidden">Nota salva no seu perfil local!</div>
    </div>

    <div class="user-ownership-widget">
       <div class="ownership-title">Onde eu possuo este jogo?</div>
       <div class="ownership-input-group">
          <input type="text" id="ownership-input" placeholder="Ex: Steam, GOG, PS5..." value="${userOwnership[details.slug] || ''}" autocomplete="off" />
          <button id="ownership-save-btn" data-slug="${details.slug}">Salvar</button>
       </div>
       <div class="ownership-feedback hidden">Local armazenado na Coleção!</div>
    </div>

    <div class="about-section">
        <h3 class="about-title">Sobre o Jogo</h3>
        <div class="about-text"></div>
    </div>
    
    ${recommendedHTML}
  `;
  
  // Usar textContent para a descrição (Sanitização via DOM)
  leftPanel.querySelector('.about-text').textContent = details.description_raw || 'Nenhuma descrição técnica disponível para este título.';

  const trailer = movies.find(m => m.data?.max) || movies[0];
  let topMediaHTML = "";
  let thumbsHTML = "";

  if(trailer) {
      topMediaHTML = `<div class="media-main"><video controls autoplay muted src="${trailer.data.max || trailer.data["480"]}"></video></div>`;
      thumbsHTML = screenshots.slice(0, 4).map(s => `<div class="media-thumb"><img src="${s.image}" /></div>`).join('');
  } else if (screenshots.length > 0) {
      topMediaHTML = `<div class="media-main"><img src="${screenshots[0].image}" /></div>`;
      thumbsHTML = screenshots.slice(1, 5).map(s => `<div class="media-thumb"><img src="${s.image}" /></div>`).join('');
  }

  const storesHTML = details.stores?.length > 0 && stores.length > 0 ? `
    <div class="where-to-buy">
       <h3>Onde Comprar</h3>
       <div class="stores-grid">
          ${details.stores.map(ds => {
              const url = stores.find(s=>s.store_id === ds.store.id)?.url || '#';
              return `<a href="${url}" target="_blank" class="store-link">${ds.store.name}</a>`;
          }).join('')}
       </div>
    </div>
  ` : '';

  rightPanel.innerHTML = `
      ${(topMediaHTML || thumbsHTML) ? `<div class="media-grid">${topMediaHTML}${thumbsHTML}</div>` : ''}
      ${storesHTML}
  `;

  attachStarRatingListeners(details.slug);
  attachOwnershipListener(details.slug);

  const injectedFavBtn = leftPanel.querySelector('.fav-btn');
  if(injectedFavBtn) {
      injectedFavBtn.addEventListener('click', () => {
          toggleFavorite({ slug: details.slug, name: details.name, background_image: gameData.background_image || '' }, injectedFavBtn);
      });
  }
}

function attachStarRatingListeners(slug) {
   const container = document.querySelector('.stars-container');
   if(!container) return;
   
   const stars = container.querySelectorAll('.star');
   const feedback = container.nextElementSibling;
   
   const cachedRating = userRatings[slug] || 0;
   stars.forEach(s => { if(parseInt(s.dataset.value) <= cachedRating) s.classList.add('active'); });

   stars.forEach(star => {
       star.addEventListener('mouseover', function() {
           const val = parseInt(this.dataset.value);
           stars.forEach(s => {
               if(parseInt(s.dataset.value) <= val) s.classList.add('hovered');
               else s.classList.remove('hovered');
           });
       });
       
       star.addEventListener('mouseout', function() {
           stars.forEach(s => s.classList.remove('hovered'));
       });
       
       star.addEventListener('click', function() {
           const val = parseInt(this.dataset.value);
           userRatings[slug] = val;
           localStorage.setItem('gamerecs_ratings', JSON.stringify(userRatings));
           
           stars.forEach(s => {
               if(parseInt(s.dataset.value) <= val) s.classList.add('active');
               else s.classList.remove('active');
           });
           
           feedback.classList.remove('hidden');
           setTimeout(() => feedback.classList.add('hidden'), 2000);
       });
   });
}

function attachOwnershipListener(slug) {
   const btn = document.getElementById('ownership-save-btn');
   const input = document.getElementById('ownership-input');
   if(!btn || !input) return;
   
   const feedback = btn.parentElement.nextElementSibling;
   
   btn.addEventListener('click', () => {
       const val = input.value.trim();
       if(val) {
           userOwnership[slug] = val;
       } else {
           delete userOwnership[slug]; // Remove if user clears it
       }
       localStorage.setItem('gamerecs_ownership', JSON.stringify(userOwnership));
       
       feedback.classList.remove('hidden');
       setTimeout(() => feedback.classList.add('hidden'), 2000);
   });
}

// =================================================================
// 6. FAVORITES LOGIC
// =================================================================
function toggleFavorite(game, btnEl) {
    const exists = userFavorites.some(f => f.slug === game.slug);
    if(exists) {
        userFavorites = userFavorites.filter(f => f.slug !== game.slug);
        showToast("Removido da Coleção");
        if(btnEl) {
            btnEl.classList.remove('favorited');
            btnEl.innerText = btnEl.innerText.includes('Biblioteca') ? '+ Salvar na Coleção' : '+ Adicionar';
        }
    } else {
        userFavorites.push(game);
        showToast("Adicionado à Biblioteca!");
        if(btnEl) {
            btnEl.classList.add('favorited');
            btnEl.innerText = btnEl.innerText.includes('Coleção') ? '✓ Na Biblioteca' : '✓ Adicionado';
        }
    }
    localStorage.setItem('gamerecs_favorites', JSON.stringify(userFavorites));
}

// =================================================================
// 7. EVENT LISTENERS
// =================================================================
resultsContainer.addEventListener('click', (e) => {
    const favBtn = e.target.closest('.fav-btn');
    if(favBtn) {
        e.stopPropagation();
        const card = favBtn.closest('.game-card');
        const slug = favBtn.dataset.slug;
        const name = card.querySelector('.card-title').innerText;
        const bg = card.dataset.bg;
        toggleFavorite({ slug, name, background_image: bg }, favBtn);
        return;
    }

    const card = e.target.closest('.game-card');
    if(card) {
        loadGameDetails(card.dataset.slug, card.dataset.bg);
    }
});

document.addEventListener('click', (e) => {
    // Recommendation Mini-Cards listener (dynamically injected into leftPanel)
    const miniCard = e.target.closest('.mini-card');
    if(miniCard) {
        document.body.style.backgroundImage = 'none'; // Clear smoothly
        loadGameDetails(miniCard.dataset.slug, miniCard.dataset.bg);
    }
    
    if(!e.target.closest('.search-bar')) {
        autocompleteList.classList.add('hidden');
    }
});

loadMoreBtn.addEventListener('click', () => {
    loadFeed(currentQuery, currentPage + 1, true);
});

orderSelect.addEventListener('change', (e) => {
    let q = new URLSearchParams(currentQuery);
    q.set('ordering', e.target.value);
    loadFeed(q.toString(), 1, false);
});

// Sidebar Link Routing
function getFormattedDate(daysOffset) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const filterQueries = {
    'home': { title: 'Novidades em Alta', sub: 'Baseado em popularidade e data de lançamento', q: 'ordering=-added' },
    'reviews': { title: 'Análises', sub: 'Pensamentos recentes da comunidade comunitária', q: 'ordering=-rating' },
    'last30': { title: 'Últimos 30 dias', sub: 'Os sucessos mais recentes acabando de sair do forno', q: `dates=${getFormattedDate(-30)},${getFormattedDate(0)}` },
    'thisWeek': { title: 'Essa semana', sub: 'Principais lançamentos mundiais semanais', q: `dates=${getFormattedDate(-7)},${getFormattedDate(0)}` },
    'nextWeek': { title: 'Próxima semana', sub: 'O que o futuro nos aguarda em breve', q: `dates=${getFormattedDate(0)},${getFormattedDate(7)}` },
    'bestYear': { title: 'Melhores do ano', sub: 'Títulos incríveis aclamados fortemente pela crítica do Metacritic', q: `dates=${new Date().getFullYear()}-01-01,${new Date().getFullYear()}-12-31&ordering=-rating` },
    'popularNext': { title: 'Populares em 2025', sub: 'Os jogos que todo mundo tem na ponta da língua', q: `dates=2025-01-01,2025-12-31&ordering=-added` },
    'allTime': { title: 'Top 250 de sempre', sub: 'As verdadeiras obras primas que definiram a história dos games', q: `ordering=-rating&page_size=40` },
    'pc': { title: 'Jogos de PC', sub: 'O Melhor do Ecossistema Steam, Epic e Windows', q: `parent_platforms=1&ordering=-added` },
    'playstation': { title: 'Lançamentos PlayStation', sub: 'Para amantes de PS4, PS5 e consoles Sony', q: `parent_platforms=2&ordering=-added` },
    'xbox': { title: 'Console Xbox', sub: 'Navegando no ecossistema Microsoft', q: `parent_platforms=3&ordering=-added` },
    'nintendo': { title: 'Família Nintendo', sub: 'Grandes lançamentos e aclamados portáteis', q: `parent_platforms=7&ordering=-added` }
};

sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
       e.preventDefault();
       sidebarLinks.forEach(l => l.classList.remove('active'));
       link.classList.add('active');
       
       const filterType = link.dataset.filter;
       const config = filterQueries[filterType];
       
       if(config) {
           currentViewTitle.innerText = config.title;
           currentViewSubtitle.innerText = config.sub || '';
           loadFeed(config.q, 1, false);
       }
    });
});

// Autocomplete Logic
searchInput.addEventListener("input", (e) => {
  clearTimeout(debounceTimeout);
  const query = e.target.value.trim();
  
  if (query.length < 3) {
    autocompleteList.classList.add("hidden");
    return;
  }

  debounceTimeout = setTimeout(async () => {
    try {
      const data = await fetchFromBackend(`/games?search=${encodeURIComponent(query)}&page_size=5`);
      if(data.results.length > 0) {
          autocompleteList.innerHTML = data.results.map(g => `
              <div class="autocomplete-item" data-slug="${g.slug}" data-bg="${g.background_image}">
                  <img src="${g.background_image || 'https://via.placeholder.com/40'}" />
                  <div class="autocomplete-text">
                      <span class="autocomplete-name">${g.name}</span>
                      <span class="autocomplete-info">${g.released?.substring(0,4) || ''}</span>
                  </div>
              </div>
          `).join('');
          autocompleteList.classList.remove("hidden");
          
          autocompleteList.querySelectorAll('.autocomplete-item').forEach(item => {
              item.addEventListener('click', () => {
                  searchInput.value = '';
                  autocompleteList.classList.add('hidden');
                  loadGameDetails(item.dataset.slug, item.dataset.bg);
              });
          });
      } else {
          autocompleteList.classList.add("hidden");
      }
    } catch(err) { console.error(err); }
  }, 250);
});

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if(query) {
        autocompleteList.classList.add('hidden');
        sidebarLinks.forEach(l => l.classList.remove('active'));
        currentViewTitle.innerText = `Buscando: "${query}"`;
        currentViewSubtitle.innerText = 'Resultados da pesquisa detalhada';
        loadFeed(`search=${encodeURIComponent(query)}`, 1, false);
    }
});

// INITIAL LOAD
document.addEventListener('DOMContentLoaded', () => {
    loadFeed('ordering=-added', 1, false);
});