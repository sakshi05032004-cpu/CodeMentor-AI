// Enhanced LeetCode page functionality with web app integration and floating chatbot widget
;(() => {
  // Prevent multiple instances
  if (window.leetcodeAIHelperLoaded) {
    return;
  }
  window.leetcodeAIHelperLoaded = true;

  const WEB_APP_URL = "http://localhost:3000" // Update this to your deployed URL in production
  let currentUser = null
  let authToken = null
  let floatingWidget = null
  let isDragging = false
  let conversationHistory = JSON.parse(localStorage.getItem('leetcode_conversation_history') || '[]')
  let isTyping = false
  let currentHintLevel = 0
  let currentStepLevel = 0
  let isMinimized = false
  const dragOffset = { x: 0, y: 0 }

  function addToConversationHistory(role, message) {
    const entry = {
      role, // 'user' or 'assistant'
      message,
      timestamp: Date.now(),
      problemTitle: extractProblemInfo().title
    }
    
    conversationHistory.push(entry)
    
    // Keep only last 10 messages to avoid memory issues
    if (conversationHistory.length > 10) {
      conversationHistory = conversationHistory.slice(-10)
    }
    
    // Save to localStorage for persistence
    localStorage.setItem('leetcode_conversation_history', JSON.stringify(conversationHistory))
  }

  function clearConversationHistory() {
    conversationHistory = []
    localStorage.removeItem('leetcode_conversation_history')
  }

  async function checkAuth() {
    const stored = await chrome.storage.local.get(["user", "authToken"])
    if (stored.user && stored.authToken) {
      currentUser = stored.user
      authToken = stored.authToken
      return true
    }
    return false
  }

  async function createFloatingWidget() {
    try {
      // Prevent duplicate widgets
      if (document.getElementById("leetcode-floating-widget")) {
        console.log("Widget already exists, skipping creation");
        return;
      }

      await checkAuth()

      console.log("Creating floating widget...");

    floatingWidget = document.createElement("div")
    floatingWidget.id = "leetcode-floating-widget"
    floatingWidget.innerHTML = `
      <div class="widget-header" id="widgetHeader">
        <span class="widget-title">🤖 AI Helper</span>
        <div class="widget-controls">
          <button id="clearChatHistory" class="widget-btn" title="Clear conversation history">🗑️</button>
          <button id="minimizeWidget" class="widget-btn">−</button>
          <button id="closeWidget" class="widget-btn">×</button>
        </div>
      </div>
      <div class="widget-content" id="widgetContent">
        <div class="chat-messages" id="chatMessages">
          <div class="bot-message">
            <div class="message-content">
              <div class="message-avatar">🤖</div>
              <div class="message-text">
                <div class="message-header">AI Assistant</div>
                <div class="message-body">👋 Hi! I'm here to help with this LeetCode problem. Ask me for hints, approaches, or step-by-step guidance!</div>
              </div>
            </div>
          </div>
        </div>
        <div class="chat-input-area">
          <input type="text" id="chatInput" placeholder="Ask me anything..." />
          <button id="sendMessage" class="send-btn">→</button>
        </div>
        <div class="quick-actions">
          <button class="quick-action-btn" data-action="hint">💡 Hint</button>
          <button class="quick-action-btn" data-action="approach">🎯 Approach</button>
          <button class="quick-action-btn" data-action="steps">📋 Steps</button>
          <button class="quick-action-btn" data-action="debug">🐛 Debug</button>
        </div>
      </div>`

    // Add CSS styles
    const style = document.createElement("style")
    style.textContent = `
      #leetcode-floating-widget {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 380px;
        max-height: 600px;
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #f8fafc;
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        transition: all 0.3s ease;
        overflow: hidden;
      }

      #leetcode-floating-widget.minimized .widget-content {
        display: none;
      }

      #leetcode-floating-widget.minimized {
        max-height: 50px;
      }

      .widget-header {
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 16px 16px 0 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
        user-select: none;
      }

      .widget-title {
        font-weight: 600;
        font-size: 14px;
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .widget-controls {
        display: flex;
        gap: 4px;
      }

      .widget-btn {
        width: 24px;
        height: 24px;
        border: none;
        background: rgba(255, 255, 255, 0.1);
        color: #f8fafc;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .widget-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .widget-content {
        padding: 16px;
        max-height: 400px;
        display: flex;
        flex-direction: column;
      }

      .widget-content.minimized {
        display: none;
      }

      .chat-messages {
        flex: 1;
        max-height: 250px;
        overflow-y: auto;
        margin-bottom: 12px;
        padding-right: 4px;
      }

      .bot-message, .user-message {
        margin-bottom: 12px;
        border-radius: 12px;
        font-size: 13px;
        line-height: 1.4;
        animation: fadeIn 0.3s ease;
        position: relative;
      }

      .message-content {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 10px 12px;
      }

      .message-avatar {
        font-size: 16px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.1);
        flex-shrink: 0;
      }

      .message-text {
        flex: 1;
      }

      .message-header {
        font-size: 10px;
        opacity: 0.7;
        margin-bottom: 4px;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .timestamp {
        font-size: 9px;
        opacity: 0.5;
      }

      .message-body {
        line-height: 1.4;
      }

      .message-body code {
        background: rgba(0, 0, 0, 0.3);
        padding: 2px 4px;
        border-radius: 3px;
        font-size: 11px;
      }

      .message-body strong {
        color: #60a5fa;
      }

      .bot-message {
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.2);
        border-left: 3px solid #10b981;
      }

      .user-message {
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.2);
      }

      .user-message .message-content {
        flex-direction: row-reverse;
      }

      .user-message .message-text {
        text-align: right;
      }

      .typing {
        opacity: 0.7;
      }

      .typing-animation {
        display: flex;
        gap: 3px;
        align-items: center;
        padding: 4px 0;
      }

      .typing-animation span {
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: #60a5fa;
        animation: bounce 1.4s infinite;
      }

      .typing-animation span:nth-child(2) {
        animation-delay: 0.2s;
      }

      .typing-animation span:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes bounce {
        0%, 80%, 100% {
          transform: scale(0.8);
          opacity: 0.5;
        }
        40% {
          transform: scale(1);
          opacity: 1;
        }
      }

      .suggested-actions {
        margin: 8px 0;
        padding: 8px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .suggestions-header {
        font-size: 10px;
        color: #60a5fa;
        margin-bottom: 6px;
        font-weight: 600;
      }

      .suggestions-list {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }

      .suggestion-btn {
        background: rgba(59, 130, 246, 0.2);
        border: 1px solid rgba(59, 130, 246, 0.3);
        color: #93c5fd;
        padding: 6px 12px;
        border-radius: 16px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        user-select: none;
        font-weight: 500;
      }

      .suggestion-btn:hover {
        background: rgba(59, 130, 246, 0.3);
        border-color: rgba(59, 130, 246, 0.5);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
      }

      .suggestion-btn:active {
        transform: translateY(0);
        background: rgba(59, 130, 246, 0.4);
      }

      .chat-input-area {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }

      #chatInput {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.05);
        color: #f8fafc;
        font-size: 13px;
        outline: none;
      }

      #chatInput:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
      }

      .send-btn {
        padding: 8px 12px;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        border: none;
        border-radius: 8px;
        color: white;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
      }

      .send-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      }

      .quick-actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .quick-action-btn {
        padding: 6px 10px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 16px;
        color: #f8fafc;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .quick-action-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: translateY(-1px);
      }

      .chat-messages::-webkit-scrollbar {
        width: 4px;
      }

      .chat-messages::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 2px;
      }

      .chat-messages::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `
    document.head.appendChild(style)
    document.body.appendChild(floatingWidget)

    setupWidgetEventListeners()
    initializeChatWithProblem()
    
    console.log("Floating widget created successfully")
  } catch (error) {
    console.error("Error creating floating widget:", error)
  }
}

  function setupWidgetEventListeners() {
    try {
      const header = document.getElementById("widgetHeader")
      const minimizeBtn = document.getElementById("minimizeWidget")
      const closeBtn = document.getElementById("closeWidget")
      const clearBtn = document.getElementById("clearChatHistory")
      const chatInput = document.getElementById("chatInput")
      const sendBtn = document.getElementById("sendMessage")
      const quickBtns = document.querySelectorAll(".quick-action-btn")

      if (!header || !minimizeBtn || !closeBtn || !clearBtn || !chatInput || !sendBtn) {
        console.warn('Some widget elements not found, retrying...')
        setTimeout(setupWidgetEventListeners, 500)
        return
      }

      // Make widget draggable
      header.addEventListener("mousedown", startDragging)
      document.addEventListener("mousemove", drag)
      document.addEventListener("mouseup", stopDragging)

      // Minimize/maximize
      minimizeBtn.addEventListener("click", toggleMinimize)

      // Close widget
      closeBtn.addEventListener("click", () => {
        if (floatingWidget) {
          floatingWidget.remove()
          floatingWidget = null
        }
      })

      // Clear conversation history
      clearBtn.addEventListener("click", () => {
        if (confirm('Clear conversation history? This action cannot be undone.')) {
          clearConversationHistory()
          // Clear the chat messages UI
          const messagesContainer = document.getElementById("chatMessages")
          if (messagesContainer) {
            messagesContainer.innerHTML = `
              <div class="bot-message">
                <div class="message-content">
                  <div class="message-header">AI Assistant</div>
                  <div class="message-text">
                    🌟 **Fresh start!** I'm here to help you with LeetCode problems. 
                    
                    **I can help you:**
                    - 💡 Get hints and guidance
                    - 🎯 Understand problem approaches
                    - 📝 Walk through solutions step by step
                    - 🐛 Debug your code
                    
                    What problem are you working on?
                  </div>
                </div>
              </div>
            `
          }
        }
      })

      // Chat functionality
      sendBtn.addEventListener("click", sendChatMessage)
      chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          sendChatMessage()
        }
      })

      // Quick actions
      quickBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const action = btn.dataset.action
          handleQuickAction(action)
        })
      })

      // Suggestion buttons event delegation
      const chatMessages = document.getElementById("chatMessages")
      if (chatMessages) {
        chatMessages.addEventListener("click", (e) => {
          if (e.target.classList.contains("suggestion-btn")) {
            const suggestion = e.target.dataset.suggestion
            if (suggestion) {
              sendSuggestion(suggestion)
            }
          }
        })
      }
      
      console.log('Widget event listeners setup successfully')
    } catch (error) {
      console.error('Error setting up widget event listeners:', error)
    }
  }

  function startDragging(e) {
    isDragging = true
    const rect = floatingWidget.getBoundingClientRect()
    dragOffset.x = e.clientX - rect.left
    dragOffset.y = e.clientY - rect.top
    floatingWidget.style.cursor = "grabbing"
  }

  function drag(e) {
    if (!isDragging) return

    const x = e.clientX - dragOffset.x
    const y = e.clientY - dragOffset.y

    // Keep widget within viewport
    const maxX = window.innerWidth - floatingWidget.offsetWidth
    const maxY = window.innerHeight - floatingWidget.offsetHeight

    floatingWidget.style.left = Math.max(0, Math.min(x, maxX)) + "px"
    floatingWidget.style.top = Math.max(0, Math.min(y, maxY)) + "px"
    floatingWidget.style.right = "auto"
    floatingWidget.style.bottom = "auto"
  }

  function stopDragging() {
    isDragging = false
    floatingWidget.style.cursor = "default"
  }

  function toggleMinimize() {
    const content = document.getElementById("widgetContent")
    const minimizeBtn = document.getElementById("minimizeWidget")
    const widget = document.getElementById("leetcode-floating-widget")

    isMinimized = !isMinimized
    
    if (isMinimized) {
      content.style.display = "none"
      minimizeBtn.textContent = "+"
      widget.style.maxHeight = "50px"
    } else {
      content.style.display = "flex"
      minimizeBtn.textContent = "−"
      widget.style.maxHeight = "600px"
    }
  }

  function initializeChatWithProblem() {
    try {
      const problemInfo = extractProblemInfo()
      console.log('Problem info extracted:', problemInfo)
      
      // Wait a bit more for the page to fully load, then try again
      if (problemInfo.title === "Current Problem") {
        console.log('Initial extraction failed, retrying in 2 seconds...')
        setTimeout(() => {
          const retryInfo = extractProblemInfo()
          console.log('Retry extraction result:', retryInfo)
          if (retryInfo.title !== "Current Problem") {
            // Update the welcome message with correct info
            const chatMessages = document.getElementById("chatMessages")
            if (chatMessages) {
              chatMessages.innerHTML = ''
              const welcomeMessage = generateWelcomeMessage(retryInfo)
              addBotMessage(welcomeMessage)
              addInitialSuggestions()
            }
          }
        }, 2000)
      }
      
      const welcomeMessage = generateWelcomeMessage(problemInfo)
      
      // Clear the default message first
      const chatMessages = document.getElementById("chatMessages")
      if (chatMessages) {
        chatMessages.innerHTML = ''
        console.log('Adding welcome message:', welcomeMessage)
        addBotMessage(welcomeMessage)
        
        // Add quick action suggestions
        setTimeout(() => {
          addInitialSuggestions()
        }, 1000)
      } else {
        console.warn('Chat messages container not found')
      }
    } catch (error) {
      console.error('Error in initializeChatWithProblem:', error)
    }
  }

  function generateWelcomeMessage(problemInfo) {
    if (problemInfo.title === "Current Problem") {
      return `👋 Hi there! I'm your AI assistant ready to help with LeetCode problems!

🤖 **What I can do:**
🎯 **Smart Hints** - Progressive hints that adapt to your progress
🧠 **Multiple Approaches** - Different ways to tackle problems  
📝 **Step-by-step Guidance** - Detailed implementation help
⚡ **Complexity Analysis** - Performance insights
🔍 **Code Review** - Help debug your solution

*Navigate to a specific LeetCode problem and I'll provide targeted assistance!*`
    } else {
      return `👋 Hi there! I can see you're working on **"${problemInfo.title}"** (${problemInfo.difficulty} level).

I'm your AI assistant and I'm excited to help you solve this! Here's what I can do for you:

🎯 **Smart Hints** - Progressive hints that adapt to your progress
🧠 **Multiple Approaches** - Different ways to tackle the problem  
📝 **Step-by-step Guidance** - Detailed implementation help
⚡ **Complexity Analysis** - Performance insights
🔍 **Code Review** - Help debug your solution
💡 **Learning Tips** - Patterns and techniques to remember

*What would you like to start with? Just ask me naturally - I understand context!*`
    }
  }

  function addInitialSuggestions() {
    const problemInfo = extractProblemInfo()
    if (problemInfo.title === "Current Problem") {
      addSuggestedActions([
        "What should I practice today?",
        "Explain common patterns",
        "Help me get started"
      ])
    } else {
      addSuggestedActions([
        "Give me a gentle hint",
        "What's the optimal approach?", 
        "I'm completely stuck, help!",
        "Explain the problem to me"
      ])
    }
  }

  async function sendChatMessage() {
    const input = document.getElementById("chatInput")
    const message = input.value.trim()
    if (!message) return

    // Add user message to conversation history
    addToConversationHistory('user', message)
    
    addUserMessage(message)
    input.value = ""

    // Show typing indicator
    showTypingIndicator()
    
    // Simulate realistic response time
    const responseTime = Math.random() * 1500 + 500
    
    setTimeout(async () => {
      hideTypingIndicator()
      
      try {
        const response = await generateAIResponse(message)
        
        // Double-check the response structure
        if (response && response.message) {
          addBotMessage(response.message)
          
          // Add bot response to conversation history
          addToConversationHistory('assistant', response.message)
          
          // Add suggested follow-up actions
          if (response.suggestions && Array.isArray(response.suggestions)) {
            setTimeout(() => {
              addSuggestedActions(response.suggestions)
            }, 500)
          }
        } else {
          console.error('Invalid response structure:', response)
          const fallbackMessage = "I apologize, but I'm having trouble responding right now. Please try again."
          addBotMessage(fallbackMessage)
          addToConversationHistory('assistant', fallbackMessage)
        }
      } catch (error) {
        console.error('Error in chat response:', error)
        const errorMessage = "Sorry, I encountered an error. Please try asking again."
        addBotMessage(errorMessage)
        addToConversationHistory('assistant', errorMessage)
      }
    }, responseTime)
  }

  function addUserMessage(message) {
    const messagesContainer = document.getElementById("chatMessages")
    const messageDiv = document.createElement("div")
    messageDiv.className = "user-message"
    messageDiv.innerHTML = `
      <div class="message-content">
        <div class="message-avatar">👤</div>
        <div class="message-text">
          <div class="message-header">You <span class="timestamp">${formatTime(new Date())}</span></div>
          <div class="message-body">${message}</div>
        </div>
      </div>
    `
    messagesContainer.appendChild(messageDiv)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }

  function addBotMessage(message) {
    // Ensure message is defined
    if (!message) {
      console.warn('addBotMessage received undefined message')
      message = "Sorry, I encountered an error. Please try again."
    }
    
    const messagesContainer = document.getElementById("chatMessages")
    if (!messagesContainer) {
      console.warn('Chat messages container not found')
      return
    }
    
    const messageDiv = document.createElement("div")
    messageDiv.className = "bot-message"
    messageDiv.innerHTML = `
      <div class="message-content">
        <div class="message-avatar">🤖</div>
        <div class="message-text">
          <div class="message-header">AI Assistant <span class="timestamp">${formatTime(new Date())}</span></div>
          <div class="message-body">${formatMessage(message)}</div>
        </div>
      </div>
    `
    messagesContainer.appendChild(messageDiv)
    
    // Animate message appearance
    messageDiv.style.opacity = '0'
    messageDiv.style.transform = 'translateY(20px)'
    setTimeout(() => {
      messageDiv.style.transition = 'all 0.3s ease'
      messageDiv.style.opacity = '1'
      messageDiv.style.transform = 'translateY(0)'
    }, 50)
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }

  function showTypingIndicator() {
    if (document.getElementById('typing-indicator')) return
    
    const messagesContainer = document.getElementById("chatMessages")
    const typingDiv = document.createElement("div")
    typingDiv.id = "typing-indicator"
    typingDiv.className = "bot-message typing"
    typingDiv.innerHTML = `
      <div class="message-content">
        <div class="message-avatar">🤖</div>
        <div class="message-text">
          <div class="typing-animation">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    `
    messagesContainer.appendChild(typingDiv)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }

  function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator')
    if (typingIndicator) {
      typingIndicator.remove()
    }
  }

  function addSuggestedActions(suggestions) {
    const messagesContainer = document.getElementById("chatMessages")
    const suggestionsDiv = document.createElement("div")
    suggestionsDiv.className = "suggested-actions"
    
    const suggestionButtons = suggestions.map((suggestion, index) => 
      `<button class="suggestion-btn" data-suggestion="${suggestion}" data-index="${index}">${suggestion}</button>`
    ).join('')
    
    suggestionsDiv.innerHTML = `
      <div class="suggestions-header">💡 Try asking:</div>
      <div class="suggestions-list">${suggestionButtons}</div>
    `
    
    messagesContainer.appendChild(suggestionsDiv)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }

  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function formatMessage(message) {
    // Check if message is defined and is a string
    if (!message || typeof message !== 'string') {
      console.warn('formatMessage received invalid input:', message)
      return String(message || '')
    }
    
    // Convert markdown-like formatting
    return message
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>')
  }

  // Make sendSuggestion globally available
  window.sendSuggestion = function(suggestion) {
    try {
      const input = document.getElementById("chatInput")
      if (input) {
        input.value = suggestion
        input.focus()
        
        // Add visual feedback
        const allSuggestionBtns = document.querySelectorAll('.suggestion-btn')
        allSuggestionBtns.forEach(btn => {
          if (btn.textContent === suggestion) {
            btn.style.background = 'rgba(34, 197, 94, 0.3)'
            btn.style.borderColor = 'rgba(34, 197, 94, 0.5)'
            btn.style.color = '#86efac'
            setTimeout(() => {
              btn.style.background = ''
              btn.style.borderColor = ''
              btn.style.color = ''
            }, 1000)
          }
        })
        
        sendChatMessage()
      }
    } catch (error) {
      console.error('Error in sendSuggestion:', error)
    }
  }

  function handleQuickAction(action) {
    const actions = {
      hint: "Give me a progressive hint",
      approach: "What's the best approach to solve this?",
      steps: "Guide me through the solution step by step",
      debug: "Help me debug my solution"
    }

    if (actions[action]) {
      const input = document.getElementById("chatInput")
      input.value = actions[action]
      sendChatMessage()
    }
  }

  async function generateAIResponse(message) {
    try {
      console.log('🔍 generateAIResponse called with:', message)
      const lowerMessage = message.toLowerCase()
      const problemInfo = extractProblemInfo()
      console.log('📋 Problem info:', problemInfo)

      if (!problemInfo.title || problemInfo.title === "Current Problem") {
        console.log('⚠️ No problem detected, returning generic message')
        return {
          message: `🤔 I don't see a specific LeetCode problem loaded yet. 

**Here's what I can help with:**
- Navigate to any LeetCode problem page
- Ask general coding questions
- Get study recommendations

What would you like to explore?`,
          suggestions: ["Recommend practice problems", "Explain common patterns", "Help me get started"]
        }
      }

      // Prepare conversation context
      const recentMessages = conversationHistory.slice(-4).map(h => h.message)
      console.log('💬 Recent conversation:', recentMessages)
      
      // Use the web app API for AI responses with conversation context
      try {
        console.log('🌐 Attempting API call to:', `${WEB_APP_URL}/api/chat/extension`)
        const response = await fetch(`${WEB_APP_URL}/api/chat/extension`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: message,
            problem: {
              title: problemInfo.title,
              difficulty: problemInfo.difficulty,
              slug: extractProblemSlug()
            },
            userId: currentUser?.id || 'anonymous',
            conversationHistory: recentMessages
          })
        })

        if (response.ok) {
          const data = await response.json()
          console.log('✅ API response received:', data)
          return {
            message: data.response,
            suggestions: generateContextualSuggestions(lowerMessage, problemInfo)
          }
        } else {
          console.warn('⚠️ API response not ok:', response.status, response.statusText)
        }
      } catch (apiError) {
        console.warn('❌ API call failed, using enhanced fallback:', apiError)
      }

      // Enhanced fallback responses with more interactivity
      console.log('🔄 Using enhanced fallback response')
      return generateEnhancedFallbackResponse(lowerMessage, problemInfo, recentMessages)
    } catch (error) {
      console.error('Error in generateAIResponse:', error)
      return {
        message: "🤖 Oops! I encountered an issue. But I'm still here to help! Try asking me about hints, approaches, or debugging tips.",
        suggestions: ["Give me a hint", "Explain the approach", "Help me debug"]
      }
    }
  }

  function generateContextualSuggestions(lowerMessage, problemInfo) {
    const baseSuggestions = []
    
    if (lowerMessage.includes("hint")) {
      baseSuggestions.push("I need another hint", "What's the optimal approach?", "Show me the next step")
    } else if (lowerMessage.includes("approach")) {
      baseSuggestions.push("Give me implementation steps", "What about edge cases?", "How do I optimize this?")
    } else if (lowerMessage.includes("step")) {
      baseSuggestions.push("Continue to next step", "Explain this part more", "Show me the complete code")
    } else if (lowerMessage.includes("debug")) {
      baseSuggestions.push("Check my logic", "What about test cases?", "Help with edge cases")
    } else {
      baseSuggestions.push("Give me a hint", "What's the best approach?", "Walk me through it step by step")
    }

    // Add problem-specific suggestions
    if (problemInfo.difficulty === "Easy") {
      baseSuggestions.push("What pattern does this follow?")
    } else if (problemInfo.difficulty === "Medium") {
      baseSuggestions.push("How do I optimize this?")
    } else if (problemInfo.difficulty === "Hard") {
      baseSuggestions.push("Break this down for me")
    }

    return baseSuggestions.slice(0, 3) // Return max 3 suggestions
  }

  function generateEnhancedFallbackResponse(lowerMessage, problemInfo, recentMessages) {
    const problemTitle = problemInfo.title
    const difficulty = problemInfo.difficulty
    
    console.log('Generating fallback for message:', lowerMessage)
    
    // More specific keyword matching with better prioritization
    if (lowerMessage.includes("hint") || lowerMessage.includes("clue") || lowerMessage.includes("nudge")) {
      return {
        message: `💡 **Hint for ${problemTitle}**: 

For this ${difficulty} problem, think about:
- **What data structure gives you O(1) lookup time?**
- **How can you store values you've already seen?**
- **What's the complement of each number you need to find?**

Instead of checking every pair (O(n²)), can you check each number once? 🤔`,
        suggestions: ["I'm thinking hash map", "What's a complement?", "Show me the approach"]
      }
    } 
    
    if (lowerMessage.includes("approach") || lowerMessage.includes("strategy") || lowerMessage.includes("solve") || lowerMessage.includes("method")) {
      return {
        message: `🎯 **Solution Approaches for ${problemTitle}**:

**Approach 1: Brute Force** ⚡
- Check every pair of numbers
- Time: O(n²), Space: O(1)
- Simple but slow for large inputs

**Approach 2: Hash Map (Optimal)** 🏆
- Store complement as you go
- Time: O(n), Space: O(n)
- Much faster for large arrays

**Key insight**: For each number, check if (target - number) exists in your data structure.

Which approach would you like to explore?`,
        suggestions: ["Explain the hash map approach", "Show me the code", "What's the time complexity?"]
      }
    }
    
    if (lowerMessage.includes("step") || lowerMessage.includes("guide") || lowerMessage.includes("walk") || lowerMessage.includes("through")) {
      return {
        message: `📝 **Step-by-Step Solution for ${problemTitle}**:

**Step 1**: Create an empty hash map
**Step 2**: For each number in the array:
   - Calculate: complement = target - current_number
   - Check: Is complement already in hash map?
   - If YES → Return [complement_index, current_index]
   - If NO → Store current_number and its index in hash map
**Step 3**: Continue until you find the pair

**Example**: [2,7,11,15], target=9
- num=2: complement=7, not found → store {2: 0}
- num=7: complement=2, found at index 0 → return [0,1]

Ready to implement this?`,
        suggestions: ["Yes, show me the code", "I need more explanation", "What about edge cases?"]
      }
    }
    
    if (lowerMessage.includes("stuck") || lowerMessage.includes("confused") || lowerMessage.includes("lost") || lowerMessage.includes("don't understand")) {
      return {
        message: `� **Let's solve ${problemTitle} together!**

**What exactly is confusing you?**
1. **Problem understanding**: Not sure what Two Sum means?
2. **Algorithm choice**: Don't know which approach to use?
3. **Implementation**: Know the approach but can't code it?
4. **Debugging**: Code written but not working?

**Quick clarification**: Find two numbers in the array that add up to the target. Return their indices (positions), not the numbers themselves.

Which of these describes your situation best?`,
        suggestions: ["I don't understand the problem", "I need help choosing an approach", "I know what to do but can't code it"]
      }
    }
    
    if (lowerMessage.includes("debug") || lowerMessage.includes("error") || lowerMessage.includes("wrong") || lowerMessage.includes("not working")) {
      return {
        message: `🐛 **Debugging ${problemTitle}**:

**Common mistakes in Two Sum:**
- Returning values instead of indices
- Using the same element twice
- Not handling duplicate numbers correctly
- Off-by-one errors in indexing

**Debug checklist:**
✓ Are you returning indices (positions) not values?
✓ Are you avoiding using the same element twice?
✓ Is your hash map storing {value: index}?
✓ Are you checking existence before accessing?

**Share your code or describe the issue**, and I'll help you fix it!`,
        suggestions: ["My output is wrong", "Getting index errors", "Explain the hash map logic"]
      }
    }
    
    if (lowerMessage.includes("explain") || lowerMessage.includes("understand") || lowerMessage.includes("what") || lowerMessage.includes("how")) {
      return {
        message: `📚 **Understanding ${problemTitle}**:

**The Problem**: 
Given an array of numbers and a target, find TWO numbers that add up to the target. Return their positions (indices).

**Example**: 
- Array: [2, 7, 11, 15]  
- Target: 9
- Answer: [0, 1] (because 2 + 7 = 9, and they're at positions 0 and 1)

**Key insight**: Instead of checking every possible pair, use a hash map to remember what numbers you've seen and where.

What specific part needs more explanation?`,
        suggestions: ["Explain the hash map concept", "Show me with examples", "How does this avoid O(n²)?"]
      }
    }
    
    // For very general messages like "hello", "help me", etc.
    if (lowerMessage.length < 10 || lowerMessage.includes("hello") || lowerMessage.includes("hi") || 
        (lowerMessage.includes("help") && lowerMessage.length < 15)) {
      return {
        message: `👋 **Ready to tackle ${problemTitle}?**

This is a classic ${difficulty} problem that teaches important concepts!

**I can help you with:**
- 💡 **Hints** to guide your thinking
- 🎯 **Solution approaches** (brute force vs optimal)
- 📝 **Step-by-step walkthrough**
- 🐛 **Debugging** your code

**What would you like to start with?**`,
        suggestions: ["Give me a hint", "Show me the approach", "Walk through it step by step"]
      }
    }
    
    // For unrecognized but longer messages
    return {
      message: `🤔 **I want to help you with ${problemTitle}!**

I didn't quite catch what you need. Could you be more specific?

**Try asking:**
- "Give me a hint"
- "What's the best approach?"
- "Walk me through this step by step"
- "I'm stuck on [specific part]"
- "Debug my code"

**What exactly can I help you with?**`,
      suggestions: ["Give me a hint", "Explain the approach", "I need debugging help"]
    }
  }

  function extractProblemSlug() {
    // Extract problem slug from URL
    const urlPath = window.location.pathname
    const match = urlPath.match(/\/problems\/([^\/]+)/)
    return match ? match[1] : 'unknown'
  }

  function generateProgressiveHint() {
    const hints = [
      {
        level: 1,
        message: "💡 **First Hint**: Think about what you need to track as you go through the data. What information would be useful to remember?",
        suggestions: ["I need another hint", "What data structure should I use?", "Show me the approach"]
      },
      {
        level: 2, 
        message: "💡 **Second Hint**: Consider using a hash map (dictionary) to store values you've seen before. This allows O(1) lookup time!",
        suggestions: ["How do I implement this?", "What exactly do I store?", "Walk me through the steps"]
      },
      {
        level: 3,
        message: "💡 **Detailed Hint**: For each number, calculate what its 'complement' would be (target - current number), then check if you've seen that complement before.",
        suggestions: ["Show me code example", "I want to try myself", "Explain with an example"]
      }
    ]
    
    const hintIndex = Math.min(currentHintLevel - 1, hints.length - 1)
    return hints[hintIndex]
  }

  function generateDetailedApproach() {
    return {
      message: `🎯 **Multiple Approaches Available:**

**1. Brute Force Approach** (Beginner-friendly)
- Time: O(n²), Space: O(1)
- Check every pair of numbers
- Easy to understand but slower

**2. Hash Map Approach** (Recommended)
- Time: O(n), Space: O(n)
- One pass through array
- Store complements for instant lookup

Which approach interests you most?`,
      suggestions: ["Explain hash map approach", "Show me brute force", "I want the optimal solution"]
    }
  }

  function generateInteractiveSteps() {
    const steps = [
      {
        step: 1,
        message: `📝 **Step ${currentStepLevel}: Setting Up**

Let's start by creating our hash map:

\`\`\`python
def twoSum(nums, target):
    num_map = {}  # This will store number -> index
    
    for i, num in enumerate(nums):
        # We'll add logic here
\`\`\`

Ready for the next step?`,
        suggestions: ["Next step", "Explain the hash map", "Show complete solution"]
      },
      {
        step: 2,
        message: `📝 **Step ${currentStepLevel}: The Core Logic**

Now let's add the main logic:

\`\`\`python
def twoSum(nums, target):
    num_map = {}
    
    for i, num in enumerate(nums):
        complement = target - num
        
        if complement in num_map:
            return [num_map[complement], i]
        
        num_map[num] = i
\`\`\`

See how we check BEFORE storing?`,
        suggestions: ["Why check before storing?", "Show me an example", "What's next?"]
      }
    ]
    
    const stepIndex = Math.min(currentStepLevel - 1, steps.length - 1)
    return steps[stepIndex]
  }

  function generateEncouragement() {
    return {
      message: `🌟 **Don't worry, you've got this!** 

LeetCode problems can be tricky, but that's exactly how we learn! Let's break this down together.

🔍 **Problem Understanding** - Let's make sure we understand what we're solving
💡 **Gentle Hints** - Progressive clues without giving it away  
🛠️ **Different Approaches** - Multiple ways to tackle this

What would be most helpful right now?`,
      suggestions: ["Explain the problem simply", "Give me a gentle hint", "Start with examples"]
    }
  }

  function generateDebuggingHelp() {
    return {
      message: `🐛 **Debug Mode Activated!**

Common issues with this type of problem:

**🔍 Check These First:**
- Are you handling edge cases?
- Are you avoiding using the same element twice?
- Is your hash map storing the right data?

**🚨 Common Mistakes:**
- Storing in hash map BEFORE checking
- Returning wrong indices
- Not handling duplicates correctly

What specific issue are you facing?`,
      suggestions: ["My code gives wrong answer", "Getting index errors", "Check my logic"]
    }
  }

  function generateProblemExplanation() {
    return {
      message: `📖 **Let's Break Down This Problem**

**🎯 What we're trying to do:**
Given an array of numbers and a target, find TWO numbers that add up to the target.

**📝 Key Requirements:**
- Return the *indices* (positions), not the actual numbers
- Each element can only be used once
- Exactly one solution is guaranteed

**💡 The "Aha!" moment:**
Instead of checking every possible pair, we can be smart about it!

Make sense so far?`,
      suggestions: ["Yes, show me how to code it", "I need more examples", "Give me a hint"]
    }
  }

  function generateContextualHelp() {
    return {
      message: `🤖 **I'm here to help!** 

I can assist you with this LeetCode problem in many ways:

**🎯 Problem Solving:**
- Progressive hints that adapt to your level
- Multiple solution approaches  
- Step-by-step coding guidance

**🛠️ Practical Help:**
- Debug your existing code
- Provide working examples
- Suggest optimizations

Just ask me naturally - I understand context!`,
      suggestions: ["I need hints", "Explain the approach", "Help me get started"]
    }
  }

  function extractProblemInfo() {
    // Try to extract real problem information from the page
    try {
      // Get problem title - try multiple selectors
      const titleSelectors = [
        '[data-cy="question-title"]',
        'h1[data-cy="question-title"]',
        '.css-v3d350',
        'h1',
        '.question-title h1',
        '[class*="question-title"]'
      ];
      
      let titleElement = null;
      for (const selector of titleSelectors) {
        titleElement = document.querySelector(selector);
        if (titleElement && titleElement.textContent.trim()) break;
      }
      
      // Get difficulty - try multiple selectors
      const difficultySelectors = [
        '[data-cy="difficulty"]',
        '[diff]',
        '.css-10o4wqw',
        '[class*="difficulty"]',
        '.text-difficulty-easy',
        '.text-difficulty-medium', 
        '.text-difficulty-hard'
      ];
      
      let difficultyElement = null;
      for (const selector of difficultySelectors) {
        difficultyElement = document.querySelector(selector);
        if (difficultyElement && difficultyElement.textContent.trim()) break;
      }
      
      // Fallback: try to get from URL
      let titleFromUrl = "";
      const urlPath = window.location.pathname;
      const problemMatch = urlPath.match(/\/problems\/([^\/]+)/);
      if (problemMatch) {
        titleFromUrl = problemMatch[1]
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
      
      const title = (titleElement?.textContent?.trim()) || titleFromUrl || "Current Problem";
      const difficulty = (difficultyElement?.textContent?.trim()) || "Unknown";
      
      console.log('Extracted problem info:', { title, difficulty, titleElement, difficultyElement });
      
      return {
        title: title,
        difficulty: difficulty,
      }
    } catch (error) {
      console.log("Could not extract problem info, using defaults:", error);
      return {
        title: "Current Problem",
        difficulty: "Unknown",
      }
    }
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getProblemInfo") {
      const problemInfo = extractProblemInfo()
      sendResponse({ difficulty: problemInfo.difficulty })
    } else if (request.action === "getFullProblemInfo") {
      const fullInfo = extractProblemInfo()
      sendResponse(fullInfo)
    } else if (request.action === "injectFloatingWidget") {
      createFloatingWidget()
      sendResponse({ success: true })
    }
  })

  // Initialize when page loads
  function initializeWidget() {
    // Wait for the page to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(createFloatingWidget, 2000) // Wait a bit longer for LeetCode to load
      })
    } else {
      setTimeout(createFloatingWidget, 2000)
    }
  }

  // Call initialization
  initializeWidget()
})()
