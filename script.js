// Variáveis globais para controle da aplicação
let currentOffset = 0;
const pokemonPerPage = 20;
let isLoading = false;

// Elementos do DOM
const pokemonGrid = document.getElementById('pokemonGrid');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const searchInput = document.getElementById('searchInput');

// Cache simples para evitar requisições repetidas
const pokemonCache = new Map();

/**
 * Inicialização da aplicação
 */
document.addEventListener('DOMContentLoaded', () => {
    loadInitialPokemon();
    setupEventListeners();
});

/**
 * Configuração dos event listeners
 */
function setupEventListeners() {
    // Event listener para busca com Enter
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchPokemon();
        }
    });
}

/**
 * Função principal para buscar dados de um Pokémon
 * Demonstra o uso básico da Fetch API
 */
async function fetchPokemon(pokemonId) {
    try {
        showLoading(true);
        
        // Fazendo a requisição para a PokeAPI
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId.toString().toLowerCase()}`);
        
        // Verificando se a resposta foi bem-sucedida
        if (!response.ok) {
            throw new Error(`Pokémon não encontrado: ${response.status}`);
        }
        
        // Convertendo a resposta para JSON
        const pokemon = await response.json();
        return pokemon;
        
    } catch (error) {
        console.error('Erro ao buscar Pokémon:', error);
        throw error;
    } finally {
        showLoading(false);
    }
}

/**
 * Função para buscar Pokémon com cache
 * Demonstra implementação de cache simples
 */
async function fetchPokemonWithCache(pokemonId) {
    const cacheKey = pokemonId.toString().toLowerCase();
    
    if (pokemonCache.has(cacheKey)) {
        console.log('Pokémon encontrado no cache:', cacheKey);
        return pokemonCache.get(cacheKey);
    }
    
    const pokemon = await fetchPokemon(pokemonId);
    pokemonCache.set(cacheKey, pokemon);
    
    return pokemon;
}

/**
 * Função para buscar lista de Pokémon com paginação
 * Demonstra como trabalhar com endpoints que retornam listas
 */
async function fetchPokemonList(offset = 0, limit = pokemonPerPage) {
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon?offset=${offset}&limit=${limit}`);
        
        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('Erro ao buscar lista de Pokémon:', error);
        throw error;
    }
}

/**
 * Função para buscar detalhes de múltiplos Pokémon
 * Demonstra o uso de Promise.all para requisições paralelas
 */
async function fetchMultiplePokemon(pokemonList) {
    try {
        showLoading(true);
        
        // Criando array de promises para buscar todos os Pokémon em paralelo
        const pokemonPromises = pokemonList.map(pokemon => 
            fetch(pokemon.url).then(response => {
                if (!response.ok) {
                    throw new Error(`Erro ao buscar ${pokemon.name}: ${response.status}`);
                }
                return response.json();
            })
        );
        
        // Aguardando todas as requisições terminarem
        const pokemonData = await Promise.all(pokemonPromises);
        return pokemonData;
        
    } catch (error) {
        console.error('Erro ao buscar múltiplos Pokémon:', error);
        throw error;
    } finally {
        showLoading(false);
    }
}

/**
 * Função para criar o HTML de um card de Pokémon
 * Demonstra como processar e exibir dados da API
 */
function createPokemonCard(pokemon) {
    // Extraindo dados importantes do objeto retornado pela API
    const { id, name, sprites, types, height, weight, stats } = pokemon;
    
    // Verificando se existe imagem oficial, senão usa a padrão
    const imageUrl = sprites.other?.['official-artwork']?.front_default || 
                     sprites.front_default || 
                     'https://via.placeholder.com/120x120?text=?';
    
    // Criando badges para os tipos do Pokémon
    const typeBadges = types.map(type => 
        `<span class="type-badge type-${type.type.name}">${type.type.name}</span>`
    ).join('');
    
    // Formatando estatísticas do Pokémon (primeiras 4)
    const pokemonStats = stats.slice(0, 4).map(stat => {
        const statName = stat.stat.name.replace('-', ' ');
        return `<div class="stat-item">
            <span>${statName}:</span>
            <span>${stat.base_stat}</span>
        </div>`;
    }).join('');
    
    // Retornando o HTML completo do card
    return `
        <div class="pokemon-card">
            <div class="pokemon-image">
                <img src="${imageUrl}" 
                     alt="${name}" 
                     onerror="this.src='https://via.placeholder.com/120x120?text=?'">
            </div>
            <h3 class="pokemon-name">#${id} ${name}</h3>
            <div class="pokemon-info">
                <div class="info-item">
                    <strong>Altura:</strong><br>${(height/10).toFixed(1)}m
                </div>
                <div class="info-item">
                    <strong>Peso:</strong><br>${(weight/10).toFixed(1)}kg
                </div>
            </div>
            <div class="pokemon-types">
                ${typeBadges}
            </div>
            <div class="pokemon-stats">
                ${pokemonStats}
            </div>
        </div>
    `;
}

/**
 * Função para buscar um Pokémon específico
 * Demonstra tratamento de erros e validação de entrada
 */
async function searchPokemon() {
    const searchTerm = searchInput.value.trim();
    
    if (!searchTerm) {
        showError('Por favor, digite o nome ou número de um Pokémon!');
        return;
    }
    
    try {
        hideError();
        const pokemon = await fetchPokemonWithCache(searchTerm);
        
        // Limpando grid e exibindo apenas o Pokémon encontrado
        pokemonGrid.innerHTML = createPokemonCard(pokemon);
        loadMoreBtn.style.display = 'none';
        
        // Limpando campo de busca
        searchInput.value = '';
        
    } catch (error) {
        showError(`Pokémon "${searchTerm}" não encontrado. Tente outro nome ou número!`);
    }
}

/**
 * Função para buscar um Pokémon aleatório
 * Demonstra como gerar requisições dinâmicas
 */
async function getRandomPokemon() {
    try {
        hideError();
        // Gerando número aleatório entre 1 e 1010 (total de Pokémon na API)
        const randomId = Math.floor(Math.random() * 1010) + 1;
        const pokemon = await fetchPokemonWithCache(randomId);
        
        pokemonGrid.innerHTML = createPokemonCard(pokemon);
        loadMoreBtn.style.display = 'none';
        
    } catch (error) {
        showError('Erro ao buscar Pokémon aleatório. Tente novamente!');
    }
}

/**
 * Função para carregar mais Pokémon (paginação)
 * Demonstra como implementar scroll infinito/paginação
 */
async function loadMorePokemon() {
    if (isLoading) return;
    
    try {
        isLoading = true;
        hideError();
        
        // Buscando próxima página de Pokémon
        const pokemonList = await fetchPokemonList(currentOffset, pokemonPerPage);
        const pokemonData = await fetchMultiplePokemon(pokemonList.results);
        
        // Adicionando novos cards ao grid
        const newCards = pokemonData.map(pokemon => createPokemonCard(pokemon)).join('');
        pokemonGrid.innerHTML += newCards;
        
        // Atualizando offset para próxima requisição
        currentOffset += pokemonPerPage;
        
        // Verificando se ainda há mais Pokémon para carregar
        if (currentOffset >= pokemonList.count) {
            loadMoreBtn.style.display = 'none';
            showError('Todos os Pokémon foram carregados! 🎉', false);
        }
        
    } catch (error) {
        showError('Erro ao carregar mais Pokémon. Tente novamente!');
    } finally {
        isLoading = false;
    }
}

/**
 * Função para carregar Pokémon iniciais
 * Demonstra inicialização da aplicação
 */
async function loadInitialPokemon() {
    try {
        hideError();
        const pokemonList = await fetchPokemonList(0, pokemonPerPage);
        const pokemonData = await fetchMultiplePokemon(pokemonList.results);
        
        pokemonGrid.innerHTML = pokemonData.map(pokemon => createPokemonCard(pokemon)).join('');
        currentOffset = pokemonPerPage;
        loadMoreBtn.style.display = 'block';
        
    } catch (error) {
        showError('Erro ao carregar Pokémon iniciais. Recarregue a página!');
        console.error('Erro detalhado:', error);
    }
}

/**
 * Funções auxiliares para controle da UI
 */
function showLoading(show) {
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

function showError(message, isError = true) {
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        errorElement.style.background = isError ? '#ff4757' : '#2ecc71';
        
        // Auto-hide para mensagens de sucesso
        if (!isError) {
            setTimeout(hideError, 3000);
        }
    }
}

function hideError() {
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

/**
 * Função utilitária para debounce (opcional)
 * Pode ser usada para otimizar buscas em tempo real
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Exemplo de uso do debounce para busca em tempo real
 * Descomente para ativar busca enquanto digita
 */
/*
const debouncedSearch = debounce(searchPokemon, 500);
searchInput.addEventListener('input', debouncedSearch);
*/