let ollama_offline_last_check = 0;

async function getCompletion(prefix, suffix) {
    try {
        console.log(`prefix: '${prefix}'`);
        console.log(`suffix: '${suffix}'`);

        let response;
        try {
            response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'hf.co/OleFranz/Qwen3-0.6B-Text-FIM-GGUF',
                    prompt: `<|fim_prefix|>${prefix}<|fim_suffix|>${suffix}<|fim_middle|>`,
                    stream: false,
                    raw: true,
                    options: {
                        num_predict: 64,
                        temperature: 0.1,
                        top_p: 0.95,
                        top_k: 10
                    }
                })
            });
        } catch {
            if (Date.now() - ollama_offline_last_check > 10000) {
                ollama_offline_last_check = Date.now();
                try {
                    await fetch('http://localhost:11434');
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