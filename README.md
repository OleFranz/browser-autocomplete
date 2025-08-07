# browser-autocomplete

Text autocomplete for every input or textarea on any website!\
Currently only Chrome is tested and supported!

## How to install?
- Install [Ollama](https://github.com/ollama/ollama) on your system
- Run `ollama pull hf.co/OleFranz/Qwen3-0.6B-Text-FIM-GGUF`
- Create system variable `OLLAMA_ORIGINS` with value `chrome-extension://*`
- Restart Ollama
- Go in Chrome to `chrome://extensions/`
- Enable "Developer mode" (top right toggle)
- Click "Load unpacked" (top left button)
- Select the folder where you downloaded/cloned this extension
- The extension should now be installed and ready to use!