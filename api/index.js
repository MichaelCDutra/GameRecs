const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

// Carrega .env apenas em ambiente local
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const app = express();
const RAWG_API_KEY = process.env.RAWG_API_KEY;

// Verificação da API Key
if (!RAWG_API_KEY) {
  console.error('❌ ERRO: RAWG_API_KEY não encontrada no process.env');
}

const RAWG_BASE_URL = 'https://api.rawg.io/api';

app.use(cors());
app.use(express.json());

// No Vercel, o frontend é servido automaticamente se estiver na raiz.
// Mas para compatibilidade local, servimos a raiz:
app.use(express.static(path.join(__dirname, '../')));

// Helper function to build RAWG URLs
const buildRawgUrl = (endpoint, queryParams = {}) => {
  const params = new URLSearchParams({
    key: RAWG_API_KEY,
    ...queryParams
  });
  return `${RAWG_BASE_URL}${endpoint}?${params.toString()}`;
};

// Route: Search Games or Get Home Feed
app.get('/api/games', async (req, res) => {
  try {
    const url = buildRawgUrl('/games', req.query);
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching games:', error.message);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Route: Get Game Details
app.get('/api/games/:slug', async (req, res) => {
  try {
    const url = buildRawgUrl(`/games/${req.params.slug}`);
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching game details:', error.message);
    res.status(500).json({ error: 'Failed to fetch game details' });
  }
});

// Route: Get Game Suggestions
app.get('/api/games/:slug/suggested', async (req, res) => {
  try {
    const url = buildRawgUrl(`/games/${req.params.slug}/suggested`, req.query);
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      res.status(404).json({ error: 'Suggested not found for this slug' });
    } else {
      console.error('Error fetching suggested games:', error.message);
      res.status(500).json({ error: 'Failed to fetch suggested games' });
    }
  }
});

// Route: Get Game Screenshots
app.get('/api/games/:slug/screenshots', async (req, res) => {
  try {
    const url = buildRawgUrl(`/games/${req.params.slug}/screenshots`);
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    if (error.response && error.response.status === 404) {
        res.json({ results: [] });
    } else {
        console.error('Error fetching screenshots:', error.message);
        res.status(500).json({ error: 'Failed to fetch game screenshots' });
    }
  }
});

// Route: Get Game Movies (Trailers)
app.get('/api/games/:slug/movies', async (req, res) => {
  try {
    const url = buildRawgUrl(`/games/${req.params.slug}/movies`);
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      res.json({ results: [] }); 
    } else {
      console.error('Error fetching movies:', error.message);
      res.status(500).json({ error: 'Failed to fetch movies' });
    }
  }
});

// Route: Get Game Stores
app.get('/api/games/:slug/stores', async (req, res) => {
  try {
    const url = buildRawgUrl(`/games/${req.params.slug}/stores`);
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      res.json({ results: [] });
    } else {
      console.error('Error fetching stores:', error.message);
      res.status(500).json({ error: 'Failed to fetch stores' });
    }
  }
});

// Exporta para o Vercel
module.exports = app;

// Listen apenas localmente
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor local rodando em http://localhost:${PORT}`);
  });
}
