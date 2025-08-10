let ollamaOfflineLastCheck = 0;

async function preloadModel() {
    try {
        const settings = await chrome.storage.local.get(['apiEndpoint', 'selectedModel', 'preloadModel']);

        if (settings.preloadModel === false) {
            return;
        }

        const apiEndpoint = settings.apiEndpoint || 'http://localhost:11434';
        const selectedModel = settings.selectedModel;

        if (!selectedModel) {
            return;
        }

        console.log(`Preloading model: ${selectedModel}`);

        const response = await fetch(`${apiEndpoint}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: selectedModel,
                prompt: '',
                suffix: '',
                stream: false,
                options: {
                    num_predict: 1
                }
            })
        });

        try {
            const responseText = await response.text();
            const data = JSON.parse(responseText);
            console.log(`Model ${selectedModel} preloaded successfully`);
        } catch (parseError) {
            console.error('Failed to preload model');
        }
    } catch (error) {
        console.error('Error preloading model:', error);
    }
}

chrome.runtime.onStartup.addListener(() => {
    console.log('Chrome started, checking for preload...');
    preloadModel();
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed/updated, checking for preload...');
    preloadModel();
});

async function getCompletion(prefix, suffix) {
    try {
        console.log(`prefix: '${prefix}'`);
        console.log(`suffix: '${suffix}'`);

        // Get settings from storage
        const settings = await chrome.storage.local.get(['apiEndpoint', 'selectedModel', 'extensionEnabled']);

        // Check if extension is enabled
        if (settings.extensionEnabled === false) {
            console.log('Extension is disabled');
            return '';
        }

        const apiEndpoint = settings.apiEndpoint || 'http://localhost:11434';
        const selectedModel = settings.selectedModel;

        if (!selectedModel) {
            console.log('No model selected');
            return '';
        }

        let response;
        try {
            response = await fetch(`${apiEndpoint}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: selectedModel,
                    prompt: prefix,
                    suffix: suffix,
                    stream: false,
                    options: {
                        num_predict: 64,
                        temperature: 0.1,
                        top_p: 0.95,
                        top_k: 10
                    }
                })
            });
        } catch (error) {
            if (Date.now() - ollamaOfflineLastCheck > 10000) {
                ollamaOfflineLastCheck = Date.now();
                try {
                    await fetch(apiEndpoint);
                    throw error;
                } catch (networkError) {
                    console.log("Ollama not running");
                    return '';
                }
            } else {
                console.log("Ollama not running (cached info)");
                return '';
            }
        }

        if (!response.ok) {
            console.error('Server returned error:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Error details:', errorText);
            return '';
        }

        const responseText = await response.text();
        if (!responseText) {
            console.error('Empty response from server');
            return '';
        }

        try {
            const data = JSON.parse(responseText);
            console.log(`middle: '${data.response || ''}'`)
            return data.response || '';
        } catch (parseError) {
            console.error('Failed to parse JSON:', parseError);
            console.error('Raw response:', responseText);
            return '';
        }
    } catch (error) {
        console.error('Error fetching completion:', error);
        return '';
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'getCompletion') {
        getCompletion(request.prefix, request.suffix).then(completion => sendResponse({ completion }));
        return true;
    }
});