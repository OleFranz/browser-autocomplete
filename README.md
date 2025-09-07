# browser-autocomplete

Text autocomplete for every input or textarea on any website!\
Currently only Chrome is tested and supported!

## How to install?
- Install [Ollama](https://github.com/ollama/ollama) on your system
- Run `ollama pull hf.co/OleFranz/Qwen3-0.6B-Text-FIM-GGUF`
- Go in Chrome to `chrome://extensions/`
- Enable "Developer mode" (top right toggle)
- Click "Load unpacked" (top left button)
- Select the folder where you downloaded/cloned this extension
- The extension should now be installed and ready to use!

## How to use?
To use the extension, simply navigate to any input field or textarea on a webpage. As you begin typing, the extension will display a completion directly within the input. You can accept the suggested completion by pressing the `Tab` key, which will then generate the next completion. The extension also supports inserting text between a prefix and suffix relative to your cursor's position, but it performs optimally when primarily appending words to the end of your existing text.