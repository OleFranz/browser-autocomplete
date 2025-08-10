let completionElement = null;
let currentInput = null;
let currentCompletion = '';
let completionPrefix = '';
let originalInputStyle = {};
let extensionEnabled = true;
let currentRequestId = 0;

// check extension enabled state on load and listen for changes
chrome.storage.local.get(['extensionEnabled'], (result) => {
    extensionEnabled = result.extensionEnabled !== false;
});

// listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.extensionEnabled) {
        extensionEnabled = changes.extensionEnabled.newValue !== false;
        if (!extensionEnabled) {
            hideCompletion();
        }
    }
});

function createInlineCompletionElement(input) {
    const elem = document.createElement('div');
    elem.className = 'ollama-inline-completion';
    elem.style.position = 'absolute';
    elem.style.pointerEvents = 'none';
    elem.style.zIndex = '2147483647';
    elem.style.whiteSpace = 'pre';
    elem.style.opacity = '0.5';
    elem.style.color = '#888888';
    elem.style.userSelect = 'none';

    // copy the input font styles
    const computedStyle = window.getComputedStyle(input);
    elem.style.font = computedStyle.font;
    elem.style.fontSize = computedStyle.fontSize;
    elem.style.fontFamily = computedStyle.fontFamily;
    elem.style.fontWeight = computedStyle.fontWeight;
    elem.style.lineHeight = computedStyle.lineHeight;
    elem.style.letterSpacing = computedStyle.letterSpacing;
    elem.style.setProperty('--ollama-inline-color', `${computedStyle.color}`);

    document.body.appendChild(elem);
    return elem;
}

function createBoxCompletionElement(input) {
    const elem = document.createElement('div');
    elem.className = 'ollama-box-completion';
    elem.style.position = 'absolute';
    elem.style.pointerEvents = 'none';
    elem.style.zIndex = '2147483647';
    elem.style.whiteSpace = 'pre';
    elem.style.background = '#2d2d30';
    elem.style.color = '#cccccc';
    elem.style.border = '1px solid #454545';
    elem.style.borderRadius = '4px';
    elem.style.padding = '6px 10px';
    elem.style.fontSize = '13px';
    elem.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
    elem.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    elem.style.maxWidth = '300px';
    elem.style.wordWrap = 'break-word';

    document.body.appendChild(elem);
    return elem;
}

function getCaretCoordinates(input) {
    let x = 0;
    let y = 0;

    if (input.isContentEditable) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            x = rect.left;
            y = rect.top;
        }
    } else {
        const cursorPosition = input.selectionStart;
        const textBeforeCursor = input.value.substring(0, cursorPosition);
        const inputRect = input.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(input);

        const paddingLeft = parseInt(computedStyle.paddingLeft) || 0;
        const paddingTop = parseInt(computedStyle.paddingTop) || 0;
        const borderLeft = parseInt(computedStyle.borderLeftWidth) || 0;
        const borderTop = parseInt(computedStyle.borderTopWidth) || 0;

        if (input.tagName.toLowerCase() === 'textarea') {
            const lines = textBeforeCursor.split('\n');
            const currentLineIndex = lines.length - 1;
            const currentLineText = lines[currentLineIndex];

            // create a measuring element for the current line
            const measurer = document.createElement('span');
            measurer.style.position = 'absolute';
            measurer.style.visibility = 'hidden';
            measurer.style.whiteSpace = 'pre';
            measurer.style.font = computedStyle.font;
            measurer.style.fontSize = computedStyle.fontSize;
            measurer.style.fontFamily = computedStyle.fontFamily;
            measurer.style.fontWeight = computedStyle.fontWeight;
            measurer.style.letterSpacing = computedStyle.letterSpacing;

            measurer.textContent = currentLineText;
            document.body.appendChild(measurer);

            const textWidth = measurer.offsetWidth;

            let lineHeight = parseInt(computedStyle.lineHeight);
            if (!lineHeight || computedStyle.lineHeight === 'normal') {
                const lineHeightMeasurer = document.createElement('div');
                lineHeightMeasurer.style.position = 'absolute';
                lineHeightMeasurer.style.visibility = 'hidden';
                lineHeightMeasurer.style.font = computedStyle.font;
                lineHeightMeasurer.style.fontSize = computedStyle.fontSize;
                lineHeightMeasurer.style.fontFamily = computedStyle.fontFamily;
                lineHeightMeasurer.style.fontWeight = computedStyle.fontWeight;
                lineHeightMeasurer.style.lineHeight = computedStyle.lineHeight;
                lineHeightMeasurer.innerHTML = 'Mg';
                document.body.appendChild(lineHeightMeasurer);
                lineHeight = lineHeightMeasurer.offsetHeight;
                document.body.removeChild(lineHeightMeasurer);
            }

            document.body.removeChild(measurer);

            x = inputRect.left + borderLeft + paddingLeft + textWidth - (input.scrollLeft || 0);
            y = inputRect.top + borderTop + paddingTop + (currentLineIndex * lineHeight) - (input.scrollTop || 0);
        } else {
            const measurer = document.createElement('span');
            measurer.style.position = 'absolute';
            measurer.style.visibility = 'hidden';
            measurer.style.whiteSpace = 'pre';
            measurer.style.font = computedStyle.font;
            measurer.style.fontSize = computedStyle.fontSize;
            measurer.style.fontFamily = computedStyle.fontFamily;
            measurer.style.fontWeight = computedStyle.fontWeight;
            measurer.style.letterSpacing = computedStyle.letterSpacing;

            measurer.textContent = textBeforeCursor;
            document.body.appendChild(measurer);

            const textWidth = measurer.offsetWidth;
            document.body.removeChild(measurer);

            x = inputRect.left + borderLeft + paddingLeft + textWidth - (input.scrollLeft || 0);
            y = inputRect.top + borderTop + paddingTop;
        }
    }

    return {
        x: x + window.scrollX,
        y: y + window.scrollY
    };
}

function showInlineCompletion(input, completion, hasSuffix = false) {
    if (!completion) {
        hideCompletion();
        return;
    }

    // choose completion style based on whether thers is a suffix text
    if (hasSuffix) {
        // show box completion above cursor when there is a suffix
        if (!completionElement || completionElement.className !== 'ollama-box-completion') {
            hideCompletion();
            completionElement = createBoxCompletionElement(input);
        }

        // position the box centered above the cursor
        completionElement.textContent = completion;

        const coords = getCaretCoordinates(input);
        const boxWidth = completionElement.offsetWidth;
        const boxHeight = completionElement.offsetHeight;

        const paddingFromInput = parseFloat(window.getComputedStyle(input).fontSize);
        const viewportWidth = window.innerWidth;

        let top;
        if (coords.y >= boxHeight + paddingFromInput) {
            top = coords.y - boxHeight;
        } else {
            top = coords.y + paddingFromInput + 5;
        }

        let left = coords.x - boxWidth / 2;
        if (left < 0) {
            left = 0;
        } else if (left + boxWidth > viewportWidth) {
            left = viewportWidth - boxWidth;
        }

        completionElement.style.left = `${left}px`;
        completionElement.style.top = `${top}px`;
        completionElement.style.display = 'block';
    } else {
        // show inline completion after cursor when no suffix
        if (!completionElement || completionElement.className !== 'ollama-inline-completion') {
            hideCompletion();
            completionElement = createInlineCompletionElement(input);
        }

        const coords = getCaretCoordinates(input);

        completionElement.style.left = `${coords.x}px`;
        completionElement.style.top = `${coords.y}px`;
        completionElement.textContent = completion;
        completionElement.style.display = 'block';
    }
}

function hideCompletion() {
    if (completionElement) {
        completionElement.remove();
        completionElement = null;
    }
    currentCompletion = '';
    completionPrefix = '';
}

async function requestCompletion(input) {
    // dont request completion if extension is disabled
    if (!extensionEnabled) {
        hideCompletion();
        return;
    }

    const requestId = ++currentRequestId;

    let prefix, suffix;

    if (input.isContentEditable) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const content = input.textContent || '';

            // get text offset position
            const walker = document.createTreeWalker(
                input,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            let textOffset = 0;
            let node;
            while (node = walker.nextNode()) {
                if (node === range.startContainer) {
                    textOffset += range.startOffset;
                    break;
                } else {
                    textOffset += node.textContent.length;
                }
            }

            prefix = content.substring(0, textOffset);
            suffix = content.substring(textOffset);
        } else {
            prefix = input.textContent || '';
            suffix = '';
        }
    } else {
        const cursorPosition = input.selectionStart;
        prefix = input.value.substring(0, cursorPosition);
        suffix = input.value.substring(cursorPosition);
    }

    // check if user is typing the completion
    if (completionPrefix && prefix.startsWith(completionPrefix) &&
        currentCompletion.startsWith(prefix.substring(completionPrefix.length))) {
        const typedPart = prefix.substring(completionPrefix.length);
        const remainingCompletion = currentCompletion.substring(typedPart.length);
        if (remainingCompletion) {
            // recalculate suffix to determine display style
            let newSuffix = '';
            if (input.isContentEditable) {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const content = input.textContent || '';

                    const walker = document.createTreeWalker(
                        input,
                        NodeFilter.SHOW_TEXT,
                        null,
                        false
                    );

                    let textOffset = 0;
                    let node;
                    while (node = walker.nextNode()) {
                        if (node === range.startContainer) {
                            textOffset += range.startOffset;
                            break;
                        } else {
                            textOffset += node.textContent.length;
                        }
                    }
                    newSuffix = content.substring(textOffset);
                }
            } else {
                const cursorPosition = input.selectionStart;
                newSuffix = input.value.substring(cursorPosition);
            }

            const hasSuffix = newSuffix.trim().length > 0;
            showInlineCompletion(input, remainingCompletion, hasSuffix);
            return;
        } else {
            hideCompletion();
            return;
        }
    }

    // dont recommend anything when empty
    if (prefix === '' && suffix === '') {
        hideCompletion();
        return;
    }

    try {
        const response = await chrome.runtime.sendMessage({
            type: 'getCompletion',
            prefix,
            suffix
        });

        if (requestId === currentRequestId && response && response.completion && input === currentInput) {
            currentCompletion = response.completion;
            completionPrefix = prefix;

            // check if there is a suffix text to determine completion style
            const hasSuffix = suffix.trim().length > 0;
            showInlineCompletion(input, response.completion, hasSuffix);
        }
    } catch (error) {
        console.log('Extension context invalidated, reloading page...');
        window.location.reload();
    }
}

function handleInput(event) {
    // dont handle input if extension is disabled
    if (!extensionEnabled) {
        return;
    }

    const input = event.target;
    const isEditable = input.tagName.toLowerCase() === 'textarea' ||
        input.tagName.toLowerCase() === 'input' ||
        input.isContentEditable;
    if (!isEditable) {
        return;
    }

    // if switching to a different input, reset completion state
    if (currentInput !== input) {
        hideCompletion();
        currentInput = input;
        currentCompletion = '';
        completionPrefix = '';
    } else {
        currentInput = input;
    }

    // small delay to allow for better positioning after DOM updates
    setTimeout(() => {
        if (currentInput === input) {
            requestCompletion(input);
        }
    }, 10);
}

function handleKeyDown(event) {
    if (!completionElement || !currentInput || !extensionEnabled) {
        return;
    }

    if (event.key === 'Tab' && !event.shiftKey) {
        event.preventDefault();
        const completion = completionElement.textContent;

        if (currentInput.isContentEditable) {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.insertNode(document.createTextNode(completion));
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        } else {
            const cursorPosition = currentInput.selectionStart;
            currentInput.value = currentInput.value.substring(0, cursorPosition) +
                completion +
                currentInput.value.substring(cursorPosition);
            currentInput.selectionStart = currentInput.selectionEnd = cursorPosition + completion.length;
        }

        hideCompletion();
        // trigger input event to update completion for new position
        currentInput.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (event.key === 'Escape') {
        hideCompletion();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        // hide completion on cursor movement
        hideCompletion();
        if (currentInput && extensionEnabled) {
            requestCompletion(currentInput);
        }
    }
}

function handleScroll() {
    if (completionElement && currentInput && extensionEnabled) {
        // update position on scroll, need to recalculate suffix for proper display
        let suffix = '';
        if (currentInput.isContentEditable) {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const content = currentInput.textContent || '';
                const walker = document.createTreeWalker(
                    currentInput,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );

                let textOffset = 0;
                let node;
                while (node = walker.nextNode()) {
                    if (node === range.startContainer) {
                        textOffset += range.startOffset;
                        break;
                    } else {
                        textOffset += node.textContent.length;
                    }
                }
                suffix = content.substring(textOffset);
            }
        } else {
            const cursorPosition = currentInput.selectionStart;
            suffix = currentInput.value.substring(cursorPosition);
        }

        const hasSuffix = suffix.trim().length > 0;
        showInlineCompletion(currentInput, completionElement.textContent, hasSuffix);
    }
}

function handleResize() {
    if (completionElement && currentInput && extensionEnabled) {
        // update position on window resize, need to recalculate suffix for proper display
        let suffix = '';
        if (currentInput.isContentEditable) {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const content = currentInput.textContent || '';
                const walker = document.createTreeWalker(
                    currentInput,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );

                let textOffset = 0;
                let node;
                while (node = walker.nextNode()) {
                    if (node === range.startContainer) {
                        textOffset += range.startOffset;
                        break;
                    } else {
                        textOffset += node.textContent.length;
                    }
                }
                suffix = content.substring(textOffset);
            }
        } else {
            const cursorPosition = currentInput.selectionStart;
            suffix = currentInput.value.substring(cursorPosition);
        }

        const hasSuffix = suffix.trim().length > 0;
        showInlineCompletion(currentInput, completionElement.textContent, hasSuffix);
    }
}

document.addEventListener('input', handleInput, true);
document.addEventListener('keydown', handleKeyDown, true);
document.addEventListener('blur', (event) => {
    if (event.target === currentInput) {
        hideCompletion();
        currentInput = null; // clear current input on blur
    }
});
document.addEventListener('focus', (event) => {
    if (!extensionEnabled) {
        return;
    }

    const input = event.target;
    const isEditable = input.tagName.toLowerCase() === 'textarea' ||
        input.tagName.toLowerCase() === 'input' ||
        input.isContentEditable;

    if (isEditable) {
        // clear any existing completion when focusing a new input
        if (currentInput !== input) {
            hideCompletion();
            currentCompletion = '';
            completionPrefix = '';
        }
        currentInput = input;

        // request completion for the new input after a short delay
        setTimeout(() => {
            if (currentInput === input) {
                requestCompletion(input);
            }
        }, 50);
    }
});
document.addEventListener('click', (event) => {
    if (!extensionEnabled) {
        return;
    }

    const input = event.target;
    const isEditable = input.tagName.toLowerCase() === 'textarea' ||
        input.tagName.toLowerCase() === 'input' ||
        input.isContentEditable;

    if (isEditable) {
        // handle clicking on editable elements
        if (currentInput !== input) {
            hideCompletion();
            currentCompletion = '';
            completionPrefix = '';
        }
        currentInput = input;

        setTimeout(() => {
            if (currentInput === input) {
                requestCompletion(input);
            }
        }, 10);
    } else if (!input.closest('.ollama-inline-completion')) {
        // hide completion if clicking outside editable elements
        hideCompletion();
        currentInput = null;
    }
});
document.addEventListener('scroll', handleScroll, true);
window.addEventListener('resize', handleResize);

document.addEventListener('selectionchange', () => {
    if (currentInput && currentInput.isContentEditable && extensionEnabled) {
        setTimeout(() => requestCompletion(currentInput), 10);
    }
});