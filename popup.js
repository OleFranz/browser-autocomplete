const extensionToggle = document.getElementById('extensionToggle');

// load saved extension state
chrome.storage.local.get(['extensionEnabled'], (result) => {
    const savedExtensionState = result.extensionEnabled !== false;
    if (!savedExtensionState) {
        extensionToggle.classList.remove('active');
    } else {
        extensionToggle.classList.add('active');
    }
});

extensionToggle.addEventListener('click', () => {
    const isActive = extensionToggle.classList.contains('active');

    if (isActive) {
        extensionToggle.classList.remove('active');
        chrome.storage.local.set({ extensionEnabled: false });
    } else {
        extensionToggle.classList.add('active');
        chrome.storage.local.set({ extensionEnabled: true });
    }
});


const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// load saved theme
chrome.storage.local.get(['theme'], (result) => {
    const savedTheme = result.theme || 'dark';
    if (savedTheme === 'dark') {
        body.setAttribute('data-theme', 'dark');
        themeToggle.classList.add('active');
    } else {
        body.removeAttribute('data-theme');
        themeToggle.classList.remove('active');
    }
});

themeToggle.addEventListener('click', () => {
    const isDark = body.getAttribute('data-theme') === 'dark';

    if (isDark) {
        body.removeAttribute('data-theme');
        themeToggle.classList.remove('active');
        chrome.storage.local.set({ theme: 'light' });
    } else {
        body.setAttribute('data-theme', 'dark');
        themeToggle.classList.add('active');
        chrome.storage.local.set({ theme: 'dark' });
    }
});


const preloadToggle = document.getElementById('preloadModelToggle');

// load saved preload model state
chrome.storage.local.get(['preloadModel'], (result) => {
    const savedPreloadState = result.preloadModel !== false;
    if (!savedPreloadState) {
        preloadToggle.classList.remove('active');
    } else {
        preloadToggle.classList.add('active');
    }
});

preloadToggle.addEventListener('click', () => {
    const isActive = preloadToggle.classList.contains('active');

    if (isActive) {
        preloadToggle.classList.remove('active');
        chrome.storage.local.set({ preloadModel: false });
    } else {
        preloadToggle.classList.add('active');
        chrome.storage.local.set({ preloadModel: true });
    }
});


const modelSelect = document.getElementById('modelSelect');
const refreshButton = document.getElementById('refreshButton');
const refreshSpinner = document.getElementById('refreshSpinner');
const ollamaStatus = document.getElementById('ollamaStatus');
const apiEndpointInput = document.getElementById('apiEndpoint');


// load saved API endpoint
chrome.storage.local.get(['apiEndpoint'], (result) => {
    const savedApiEndpoint = result.apiEndpoint || 'http://localhost:11434';
    apiEndpointInput.value = savedApiEndpoint;
});

apiEndpointInput.addEventListener('input', () => {
    let endpoint = apiEndpointInput.value.trim();

    if (endpoint.endsWith('/')) {
        endpoint = endpoint.slice(0, -1);
        apiEndpointInput.value = endpoint;
    }

    chrome.storage.local.set({ apiEndpoint: endpoint });
});

apiEndpointInput.addEventListener('blur', () => {
    fetchOllamaModels();
});

function getApiEndpoint() {
    return apiEndpointInput.value.trim() || 'http://localhost:11434';
}


function showLoadingState() {
    modelSelect.innerHTML = '<option value="">Searching...</option>';
    modelSelect.disabled = true;
    refreshButton.querySelector('.refresh-icon').classList.add('hidden');
    refreshSpinner.classList.remove('hidden');
    refreshButton.disabled = true;
}

function hideLoadingState() {
    modelSelect.disabled = false;
    refreshButton.querySelector('.refresh-icon').classList.remove('hidden');
    refreshSpinner.classList.add('hidden');
    refreshButton.disabled = false;
}


// removes "hf.co/{author}/" from model name to save space
function formatModelName(name) {
    if (name.includes('hf.co/')) {
        const parts = name.split('/');
        if (parts.length > 2) {
            return parts.slice(2).join('/');
        }
    }
    return name;
}


async function fetchOllamaModels() {
    showLoadingState();

    try {
        const baseUrl = getApiEndpoint();
        const response = await fetch(`${baseUrl}/api/tags`);
        const data = await response.json();
        const allModels = await Promise.all(data.models.map(async (model) => {
            const showResponse = await fetch(`${baseUrl}/api/show`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: model.name })
            });
            const showData = await showResponse.json();
            return showData.capabilities && showData.capabilities.includes('insert') ? model.name : null;
        }));
        const models = allModels.filter(model => model !== null);

        modelSelect.innerHTML = '<option value="">Select a model...</option>';

        models.forEach(model => {
            const formattedName = formatModelName(model);
            const option = document.createElement('option');
            option.value = model;
            option.textContent = formattedName;
            modelSelect.appendChild(option);
        });

        // Load saved model selection
        chrome.storage.local.get(['selectedModel'], (result) => {
            const savedModel = result.selectedModel;
            if (savedModel && models.includes(savedModel)) {
                modelSelect.value = savedModel;
            }
        });

        ollamaStatus.classList.remove('error');
        ollamaStatus.innerHTML = '<div class="status-indicator"></div><span>Ollama is running</span>';
    } catch (error) {
        modelSelect.innerHTML = '<option value="">No models found...</option>';
        ollamaStatus.classList.add('error');
        ollamaStatus.innerHTML = '<div class="status-indicator"></div><span>Ollama connection failed</span>';
    } finally {
        hideLoadingState();
    }
}


refreshButton.addEventListener('click', () => {
    fetchOllamaModels();
});

modelSelect.addEventListener('change', (e) => {
    const selectedModel = e.target.value;
    chrome.storage.local.set({ selectedModel: selectedModel });
});

document.addEventListener('DOMContentLoaded', () => {
    // enable animations after initial setup is complete
    setTimeout(() => {
        body.classList.add('animations-enabled');
    }, 100);

    fetchOllamaModels();
});