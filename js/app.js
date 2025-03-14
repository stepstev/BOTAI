async function sendMessage() {
    const userInput = document.getElementById('user-input').value;
    if (userInput.trim() === '') return;

    const chatHistory = document.getElementById('chat-history');
    if (!chatHistory) {
        console.error("Element 'chat-history' not found");
        return;
    }
    chatHistory.innerHTML += `<div class="user-message">${userInput}</div>`;
    document.getElementById('user-input').value = '';

    // Removed appending botResponse which caused [object Promise]
    await generateResponse(userInput);
}

function formatMessage(content) {
    // Détection des blocs de code
    content = content.replace(/```(\w+)?\n([\s\S]+?)\n```/g, (match, lang, code) => {
        const language = lang || 'text';
        return `
            <pre class="code-block">
                <span class="language-badge">${language}</span>
                <code>${highlightCode(code, language)}</code>
            </pre>
        `;
    });

    // Format pour les commentaires inline
    content = content.replace(/\/\/(.*)/g, '<span class="comment">//$1</span>');
    
    // Format lists
    content = content.replace(/^\s*[-*]\s+(.+)/gm, '<li>$1</li>');
    content = content.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Format bold text
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Format new lines
    content = content.replace(/\n/g, '<br>');
    
    return content;
}

function highlightCode(code, language) {
    // Protection XSS
    code = code.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');
               
    // Coloration des mots-clés
    const keywords = ['function', 'return', 'const', 'let', 'var', 'if', 'else', 'async', 'await'];
    keywords.forEach(keyword => {
        code = code.replace(new RegExp(`\\b${keyword}\\b`, 'g'), 
            `<span class="keyword">${keyword}</span>`);
    });

    // Coloration des chaînes
    code = code.replace(/(["'`])(.*?)\1/g, 
        '<span class="string">$1$2$1</span>');

    // Coloration des commentaires
    code = code.replace(/(\/\/.*)/g, 
        '<span class="comment">$1</span>');

    return code;
}

function showError(message) {
    const chatHistory = document.getElementById('chat-history');
    chatHistory.innerHTML += `<div class="error-message">⚠️ ${message}</div>`;
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function generateResponse(input) {
    try {
        // LMStudio 'http://127.0.0.1:1234/v1/chat/completions'
        // Groq https://api.groq.com/openai/v1/chat/completions
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', 
                //'Authorization': 'Bearer gsk_xxxxxxxxxxxxxxxxx'



            },
            body: JSON.stringify(
                { 
                    messages: 
                    [
                        { role: 'system', content: 'Tu es un assistant, tu dois aider l utilisateur. Si la demande de l utilisateur concerne la météo ou le temps qu il fait, répond uniquement le json suivant: {"tool":"getWeather"}' },
                        { role: 'user', content: input }
                    ],
                    model: "deepseek-r1-distill-llama-70b", 
                    temperature: 0.1,
                    reasoning_format: "hidden"
                }
            )
        });
        if (!response.ok) {
            throw new Error(`Erreur de communication avec l'API (${response.status})`);
        }
        const data = await response.json();
        if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Réponse invalide de l\'API');
        }
        // Adjust this parsing based on your API response structure
        if (data && data.choices && data.choices.length > 0 && data.choices[0].message) {
            const messageContent = data.choices[0].message.content;
            if(messageContent === '{"tool":"getWeather"}') {
                console.log(getWeather());
                const finalResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json', 
                        'Authorization': 'Bearer gsk_xxxxxxxxxxxxx'
                    },
                    body: JSON.stringify(
                        { 
                            messages: 
                            [
                                { role: 'system', content: 'Utilise les informations json suivantes pour répondre à la demande de l utilisateur : ' + getWeather() },
                                { role: 'user', content: input + ' base toi sur les infos suivantes pour répondre : ' + getWeather() }
                            ],

                            
                            model: "deepseek-r1-distill-llama-70b", 
                            temperature: 0.3,
                            reasoning_format: "hidden"
                        }
                    )
                });
                const newData = await finalResponse.json();
                const finalMessageContent = newData.choices[0].message.content;
                const chatHistory = document.getElementById('chat-history');
                chatHistory.innerHTML += `<div class="bot-message">${formatMessage(finalMessageContent)}</div>`;
                chatHistory.scrollTop = chatHistory.scrollHeight;
            } else {
                const chatHistory = document.getElementById('chat-history');
                chatHistory.innerHTML += `<div class="bot-message">${formatMessage(messageContent)}</div>`;
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }
            return;
        }
        return 'No response received.';
    } catch (error) {
        console.error('Erreur:', error);
        showError(error.message || 'Une erreur est survenue lors de la génération de la réponse');
        return null;
    }
}

function getWeather() {
    return JSON.stringify({
        "city": "Paris",
        "weather": "sunny",
        "temperature": 20
    });
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('send-button').addEventListener('click', sendMessage);
    document.getElementById('user-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});