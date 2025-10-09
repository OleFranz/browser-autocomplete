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
- Open the extension UI at the top right
- Select the downloaded model (`Qwen3-0.6B-Text-FIM-GGUF`)
- The extension is now ready to use!

## How to use?
To use the extension, simply navigate to any input field or textarea on a webpage. As you begin typing, the extension will display a completion directly within the input. You can accept the suggested completion by pressing the `Tab` key, which will then generate the next completion. The extension also supports inserting text between a prefix and suffix relative to your cursor's position, but it performs optimally when primarily appending words to the end of your existing text.

## Options
| Name            | Description |
|-----------------|----------|
| `Extension`     | The general extension enable/disable button to completely disable/enable the extension |
| `Dark Mode`     | Enable or disable the dark theme for the extension UI |
| `Preload Model` | Whether to preload the Ollama model into memory on startup for faster completion availability |
| `API Endpoint`  | The API endpoint of your Ollama server, default is `http://localhost:11434` |
| `Ollama Model`  | The model to use for the completions, only models with infill capability are supported |