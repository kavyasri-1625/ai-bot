document.addEventListener('DOMContentLoaded', function() {
    // Insert your API key here
    const API_KEY = 'AIzaSyBuuwKUndto1-G8Qf96eWjCQpPsLckDy1Y';

    // Updated Gemini API endpoint
    const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

    // DOM Elements
    const messagesContainer = document.getElementById('messages-container');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const clearChatButton = document.getElementById('clear-chat');
    const toggleThemeButton = document.getElementById('toggle-theme');
    const thinkingIndicator = document.getElementById('thinking-indicator');

    // Store conversation history
    let conversationHistory = [];

    // Auto-resize textarea
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value.trim() === '') {
            this.style.height = '';
        }
    });

    // Send message on Enter (Shift+Enter for newline)
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Button event listeners
    sendButton.addEventListener('click', sendMessage);
    clearChatButton.addEventListener('click', function() {
        const welcomeMessage = document.querySelector('.welcome-message');
        messagesContainer.innerHTML = '';
        if (welcomeMessage) {
            messagesContainer.appendChild(welcomeMessage);
            welcomeMessage.style.animation = 'none';
            welcomeMessage.offsetHeight; // Trigger reflow
            welcomeMessage.style.animation = 'fadeIn 0.8s ease-out';
        }
        conversationHistory = [];
    });
    toggleThemeButton.addEventListener('click', function() {
        document.body.setAttribute('data-theme', 
            document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
        const themeIcon = this.querySelector('i');
        themeIcon.className = document.body.getAttribute('data-theme') === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    });

    // Send message function
    function sendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;
        addMessage(message, 'user');
        userInput.value = '';
        userInput.style.height = '';
        showThinking(true);
        getBotResponse(message);
    }

    // Function to get bot response from Gemini API
    async function getBotResponse(message) {
        try {
            // Add user message to conversation history
            conversationHistory.push({
                role: 'user',
                parts: [{ text: message }]
            });

            // Prepare the request body according to Gemini API spec
            const requestBody = {
                contents: conversationHistory,
                generationConfig: {
                    temperature: 0.9,
                    topK: 32,
                    topP: 1
                }
            };

            const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`API error: ${response.status} - ${errorData}`);
            }

            const data = await response.json();
            
            // Extract the bot's response
            const botMessage = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response provided.";
            
            // Add bot message to conversation history
            conversationHistory.push({
                role: 'model',
                parts: [{ text: botMessage }]
            });
            
            showThinking(false);
            addMessage(formatMessage(botMessage), 'bot');
        } catch (error) {
            console.error('Error getting response:', error);
            showThinking(false);
            addMessage("Sorry, an error occurred while processing your request: " + error.message, 'bot');
        }
    }

    // Add message to chat interface
    function addMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}-message`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        const avatarIcon = document.createElement('i');
        avatarIcon.className = sender === 'user' ? 'fas fa-user' : 'fas fa-robot';
        avatar.appendChild(avatarIcon);

        const content = document.createElement('div');
        content.className = 'message-content';

        const text = document.createElement('div');
        text.className = 'message-text';
        text.innerHTML = message;

        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = getCurrentTime();

        content.appendChild(text);
        content.appendChild(time);
        messageElement.appendChild(avatar);
        messageElement.appendChild(content);
        messagesContainer.appendChild(messageElement);
        scrollToBottom();
        addCopyButtons();
    }

    // Format message with markdown-like syntax
    function formatMessage(message) {
        let formattedMessage = message.replace(/```(\w+)?\n([\s\S]*?)\n```/g, function(match, language, code) {
            language = language || 'plaintext';
            return `<div class="code-block">
                      <div class="code-header">
                        <span class="code-lang">${language}</span>
                        <button class="copy-button" onclick="copyCode(this)">
                          <i class="far fa-copy"></i> Copy
                        </button>
                      </div>
                      <pre class="code-content">${escapeHtml(code)}</pre>
                    </div>`;
        });
        formattedMessage = formattedMessage.replace(/`([^`]+)`/g, '<code>$1</code>');
        formattedMessage = formattedMessage.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        formattedMessage = formattedMessage.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        formattedMessage = formattedMessage.replace(/\n/g, '<br>');
        return formattedMessage;
    }

    // Escape HTML for security
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Add copy functionality to code blocks
    function addCopyButtons() {
        const copyButtons = document.querySelectorAll('.copy-button');
        copyButtons.forEach(button => {
            if (!button.hasListener) {
                button.addEventListener('click', function() {
                    const codeBlock = this.closest('.code-block').querySelector('.code-content');
                    const textToCopy = codeBlock.textContent;
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        const originalText = this.innerHTML;
                        this.innerHTML = '<i class="fas fa-check"></i> Copied!';
                        setTimeout(() => {
                            this.innerHTML = originalText;
                        }, 2000);
                    });
                });
                button.hasListener = true;
            }
        });
    }

    // Get current time in desired format
    function getCurrentTime() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${hours}:${minutes} ${ampm}`;
    }

    // Scroll to the bottom of the chat
    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Show or hide the thinking indicator
    function showThinking(show) {
        if (show) {
            thinkingIndicator.classList.add('visible');
        } else {
            thinkingIndicator.classList.remove('visible');
        }
    }

    // Expose copy code function for button clicks
    window.copyCode = function(button) {
        const codeBlock = button.closest('.code-block').querySelector('.code-content');
        const textToCopy = codeBlock.textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                button.innerHTML = originalText;
            }, 2000);
        });
    };
});