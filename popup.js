let currentProblemInfo = null
let currentView = "stats"
let currentUser = null
let authToken = null
let conversationHistory = []
let isTyping = false
let currentHintLevel = 0
let currentStepLevel = 0

document.addEventListener("DOMContentLoaded", async () => {
  const viewToggle = document.getElementById("viewToggle")
  const statsView = document.getElementById("statsView")
  const chatbotView = document.getElementById("chatbotView")
  const authView = document.getElementById("authView")
  const headerTitle = document.getElementById("headerTitle")

  const isAuthenticated = await checkAuthStatus()

  if (!isAuthenticated) {
    // Show auth view first for new users
    const hasSkipped = await chrome.storage.local.get(["authSkipped"])
    if (!hasSkipped.authSkipped) {
      showAuthView()
      return
    }
  }

  await initializeMainView()
})

async function checkAuthStatus() {
  const stored = await chrome.storage.local.get(["user", "authToken"])
  if (stored.user && stored.authToken) {
    currentUser = stored.user
    authToken = stored.authToken
    return true
  }
  return false
}

function showAuthView() {
  document.getElementById("statsView").style.display = "none"
  document.getElementById("chatbotView").style.display = "none"
  document.getElementById("authView").style.display = "block"
  document.getElementById("viewToggle").style.display = "none"

  setupAuthHandlers()
}

function setupAuthHandlers() {
  const authForm = document.getElementById("authForm")
  const loginBtn = document.getElementById("loginBtn")
  const registerBtn = document.getElementById("registerBtn")
  const skipBtn = document.getElementById("skipAuthBtn")

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    await handleAuth(false) // login
  })

  registerBtn.addEventListener("click", async () => {
    await handleAuth(true) // register
  })

  skipBtn.addEventListener("click", async () => {
    await chrome.storage.local.set({ authSkipped: true })
    hideAuthView()
    await initializeMainView()
  })
}

async function handleAuth(isRegister) {
  const email = document.getElementById("emailInput").value
  const password = document.getElementById("passwordInput").value
  const loginBtn = document.getElementById("loginBtn")

  if (!email || !password) return

  loginBtn.textContent = isRegister ? "Creating..." : "Signing in..."
  loginBtn.disabled = true

  try {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Create mock user data
    const userData = {
      id: Date.now().toString(),
      email: email,
      name: email.split("@")[0],
      createdAt: new Date().toISOString(),
    }

    const token = btoa(JSON.stringify({ userId: userData.id, exp: Date.now() + 86400000 }))

    // Store auth data
    await chrome.storage.local.set({
      user: userData,
      authToken: token,
      authSkipped: false,
    })

    currentUser = userData
    authToken = token

    hideAuthView()
    await initializeMainView()
  } catch (error) {
    console.error("Auth error:", error)
    loginBtn.textContent = "❌ Error - Try Again"
    setTimeout(() => {
      loginBtn.textContent = isRegister ? "📝 Create Account" : "🔐 Sign In"
      loginBtn.disabled = false
    }, 2000)
  }
}

function hideAuthView() {
  document.getElementById("authView").style.display = "none"
  document.getElementById("viewToggle").style.display = "block"
}

async function initializeMainView() {
  const viewToggle = document.getElementById("viewToggle")
  const statsView = document.getElementById("statsView")
  const chatbotView = document.getElementById("chatbotView")
  const headerTitle = document.getElementById("headerTitle")

  viewToggle.addEventListener("click", () => {
    if (currentView === "stats") {
      currentView = "chatbot"
      statsView.style.display = "none"
      chatbotView.style.display = "flex"
      viewToggle.textContent = "📊 Stats"
      headerTitle.textContent = "🤖 AI Assistant"
    } else {
      currentView = "stats"
      statsView.style.display = "block"
      chatbotView.style.display = "none"
      viewToggle.textContent = "🤖 AI Help"
      headerTitle.textContent = "🚀 LeetCode Tracker"
    }
  })

  if (currentUser) {
    await loadUserStats()
  } else {
    await loadLocalStats()
  }

  // Get current tab info and inject floating widget
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  if (tab.url && tab.url.includes("leetcode.com/problems/")) {
    chrome.tabs.sendMessage(tab.id, {
      action: "injectFloatingWidget",
      user: currentUser,
    })

    const problemSlug = tab.url.split("/problems/")[1].split("/")[0]
    const problemTitle = problemSlug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())

    document.getElementById("currentProblem").style.display = "block"
    document.getElementById("problemTitle").textContent = problemTitle

    chrome.tabs.sendMessage(tab.id, { action: "getFullProblemInfo" }, (response) => {
      if (response) {
        currentProblemInfo = response
        document.getElementById("problemDifficulty").textContent = `Difficulty: ${response.difficulty || "Unknown"}`
        initializeChatbotWithProblem(response)
      }
    })
  }

  setupChatHandlers()
  setupMarkSolvedHandler()
  addUserInfo()
}

function setupChatHandlers() {
  const chatInput = document.getElementById("chatInput")
  const quickBtns = document.querySelectorAll(".quick-btn")

  // Handle quick action buttons
  quickBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action
      handleQuickAction(action)
    })
  })

  // Handle chat input
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const message = chatInput.value.trim()
      if (message) {
        sendMessage(message)
        chatInput.value = ""
      }
    }
  })
}

function setupMarkSolvedHandler() {
  document.getElementById("markSolved").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (tab.url && tab.url.includes("leetcode.com/problems/")) {
      chrome.tabs.sendMessage(tab.id, { action: "getProblemInfo" }, async (response) => {
        const difficulty = response?.difficulty?.toLowerCase() || "easy"
        const problemSlug = tab.url.split("/problems/")[1].split("/")[0]

        if (currentUser) {
          // Update local storage since we don't have web app integration
          await updateLocalStats(difficulty)
        } else {
          await updateLocalStats(difficulty)
        }

        // Show success message
        const btn = document.getElementById("markSolved")
        btn.textContent = "🎉 Solved!"
        btn.style.background = "linear-gradient(135deg, #10b981, #059669)"
        setTimeout(() => {
          btn.textContent = "✅ Mark as Solved"
          btn.style.background = "linear-gradient(135deg, #10b981, #059669)"
        }, 2000)
      })
    }
  })
}

async function loadUserStats() {
  await loadLocalStats()
}

function addUserInfo() {
  const userButton = document.createElement("button")
  userButton.className = "btn"
  userButton.style.marginTop = "10px"
  userButton.style.fontSize = "12px"
  userButton.style.padding = "8px 12px"

  if (currentUser) {
    userButton.textContent = `👋 ${currentUser.name}`
    userButton.onclick = () => showUserMenu()
  } else {
    userButton.textContent = "🔐 Sign In"
    userButton.onclick = () => showAuthView()
  }

  document.querySelector(".actions").appendChild(userButton)
}

function showUserMenu() {
  if (confirm("Sign out?")) {
    chrome.storage.local.remove(["user", "authToken"])
    location.reload()
  }
}

async function loadLocalStats() {
  const stats = await chrome.storage.local.get([
    "totalSolved",
    "streak",
    "easyCount",
    "mediumCount",
    "hardCount",
    "lastSolvedDate",
  ])

  updateStatsUI({
    total_solved: stats.totalSolved || 0,
    current_streak: stats.streak || 0,
    easy_solved: stats.easyCount || 0,
    medium_solved: stats.mediumCount || 0,
    hard_solved: stats.hardCount || 0,
  })
}

function updateStatsUI(stats) {
  document.getElementById("totalSolved").textContent = stats.total_solved || 0
  document.getElementById("streak").textContent = stats.current_streak || 0
  document.getElementById("easyCount").textContent = stats.easy_solved || 0
  document.getElementById("mediumCount").textContent = stats.medium_solved || 0
  document.getElementById("hardCount").textContent = stats.hard_solved || 0

  // Calculate progress (assuming 3000+ problems total)
  const totalProblems = 3000
  const progress = ((stats.total_solved || 0) / totalProblems) * 100
  document.getElementById("progressFill").style.width = `${Math.min(progress, 100)}%`
  document.getElementById("progressPercentage").textContent = `${Math.round(progress)}%`
}

async function updateLocalStats(difficulty) {
  const currentStats = await chrome.storage.local.get([
    "totalSolved",
    "streak",
    "easyCount",
    "mediumCount",
    "hardCount",
    "lastSolvedDate",
  ])

  const today = new Date().toDateString()
  const lastSolved = currentStats.lastSolvedDate

  let newStreak = currentStats.streak || 0
  if (lastSolved !== today) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    if (lastSolved === yesterday.toDateString()) {
      newStreak += 1
    } else if (lastSolved !== today) {
      newStreak = 1
    }
  }

  const newStats = {
    totalSolved: (currentStats.totalSolved || 0) + 1,
    streak: newStreak,
    easyCount: currentStats.easyCount || 0,
    mediumCount: currentStats.mediumCount || 0,
    hardCount: currentStats.hardCount || 0,
    lastSolvedDate: today,
  }

  // Increment difficulty count
  if (difficulty === "easy") newStats.easyCount++
  else if (difficulty === "medium") newStats.mediumCount++
  else if (difficulty === "hard") newStats.hardCount++

  await chrome.storage.local.set(newStats)

  updateStatsUI({
    total_solved: newStats.totalSolved,
    current_streak: newStats.streak,
    easy_solved: newStats.easyCount,
    medium_solved: newStats.mediumCount,
    hard_solved: newStats.hardCount,
  })
}

function initializeChatbotWithProblem(problemInfo) {
  if (problemInfo && problemInfo.title) {
    const welcomeMessage = `👋 Hi there! I can see you're working on **"${problemInfo.title}"** (${problemInfo.difficulty} level).

I'm your AI assistant and I'm excited to help you solve this! Here's what I can do for you:

🎯 **Smart Hints** - Progressive hints that adapt to your progress
🧠 **Multiple Approaches** - Different ways to tackle the problem  
📝 **Step-by-step Guidance** - Detailed implementation help
⚡ **Complexity Analysis** - Performance insights
🔍 **Code Review** - Help debug your solution
💡 **Learning Tips** - Patterns and techniques to remember

*What would you like to start with? Just ask me naturally - I understand context!*`
    addBotMessage(welcomeMessage)
    
    // Add quick action suggestions
    setTimeout(() => {
      addSuggestedActions([
        "Give me a gentle hint",
        "What's the optimal approach?", 
        "I'm completely stuck, help!",
        "Explain the problem to me"
      ])
    }, 1000)
  }
}

async function sendMessage(message) {
  // Add to conversation history
  conversationHistory.push({ type: 'user', message: message, timestamp: Date.now() })
  
  addUserMessage(message)
  
  // Show typing indicator
  showTypingIndicator()
  
  // Simulate realistic response time
  const responseTime = Math.random() * 1500 + 500
  
  setTimeout(() => {
    hideTypingIndicator()
    const response = generateAIResponse(message)
    addBotMessage(response.message)
    
    // Add suggested follow-up actions
    if (response.suggestions) {
      setTimeout(() => {
        addSuggestedActions(response.suggestions)
      }, 500)
    }
    
    conversationHistory.push({ type: 'bot', message: response.message, timestamp: Date.now() })
  }, responseTime)
}

function addUserMessage(message) {
  const chatContainer = document.getElementById("chatContainer")
  const messageDiv = document.createElement("div")
  messageDiv.className = "message user-message"
  messageDiv.innerHTML = `
    <div class="message-content">
      <div class="message-avatar">👤</div>
      <div class="message-text">
        <div class="message-header">You <span class="timestamp">${formatTime(new Date())}</span></div>
        <div class="message-body">${message}</div>
      </div>
    </div>
  `
  chatContainer.appendChild(messageDiv)
  chatContainer.scrollTop = chatContainer.scrollHeight
}

function addBotMessage(message) {
  const chatContainer = document.getElementById("chatContainer")
  const messageDiv = document.createElement("div")
  messageDiv.className = "message bot-message"
  messageDiv.innerHTML = `
    <div class="message-content">
      <div class="message-avatar">🤖</div>
      <div class="message-text">
        <div class="message-header">AI Assistant <span class="timestamp">${formatTime(new Date())}</span></div>
        <div class="message-body">${formatMessage(message)}</div>
      </div>
    </div>
  `
  chatContainer.appendChild(messageDiv)
  
  // Animate message appearance
  messageDiv.style.opacity = '0'
  messageDiv.style.transform = 'translateY(20px)'
  setTimeout(() => {
    messageDiv.style.transition = 'all 0.3s ease'
    messageDiv.style.opacity = '1'
    messageDiv.style.transform = 'translateY(0)'
  }, 50)
  
  chatContainer.scrollTop = chatContainer.scrollHeight
}

function showTypingIndicator() {
  if (document.getElementById('typing-indicator')) return
  
  const chatContainer = document.getElementById("chatContainer")
  const typingDiv = document.createElement("div")
  typingDiv.id = "typing-indicator"
  typingDiv.className = "message bot-message typing"
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
  chatContainer.appendChild(typingDiv)
  chatContainer.scrollTop = chatContainer.scrollHeight
}

function hideTypingIndicator() {
  const typingIndicator = document.getElementById('typing-indicator')
  if (typingIndicator) {
    typingIndicator.remove()
  }
}

function addSuggestedActions(suggestions) {
  const chatContainer = document.getElementById("chatContainer")
  const suggestionsDiv = document.createElement("div")
  suggestionsDiv.className = "suggested-actions"
  
  const suggestionButtons = suggestions.map(suggestion => 
    `<button class="suggestion-btn" onclick="sendMessage('${suggestion}')">${suggestion}</button>`
  ).join('')
  
  suggestionsDiv.innerHTML = `
    <div class="suggestions-header">💡 Try asking:</div>
    <div class="suggestions-list">${suggestionButtons}</div>
  `
  
  chatContainer.appendChild(suggestionsDiv)
  chatContainer.scrollTop = chatContainer.scrollHeight
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatMessage(message) {
  // Convert markdown-like formatting
  return message
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}

function handleQuickAction(action) {
  const actions = {
    hint: "Give me a progressive hint",
    approach: "What's the best approach to solve this?",
    steps: "Guide me through the solution step by step",
    complexity: "Analyze the time and space complexity",
    debug: "Help me debug my solution",
    pattern: "What coding pattern does this use?"
  }

  if (actions[action]) {
    sendMessage(actions[action])
  }
}

function generateAIResponse(message) {
  const lowerMessage = message.toLowerCase()

  if (!currentProblemInfo) {
    return {
      message: "I don't have information about the current problem. Please make sure you're on a LeetCode problem page!",
      suggestions: ["Go to a LeetCode problem", "Tell me about any problem"]
    }
  }

  // Context-aware responses based on conversation history
  const recentMessages = conversationHistory.slice(-3).map(h => h.message.toLowerCase())
  const hasAskedHint = recentMessages.some(m => m.includes('hint'))
  const hasAskedApproach = recentMessages.some(m => m.includes('approach'))

  if (lowerMessage.includes("hint") || lowerMessage.includes("clue")) {
    currentHintLevel++
    return generateProgressiveHint()
  } else if (lowerMessage.includes("approach") || lowerMessage.includes("strategy") || lowerMessage.includes("method")) {
    return generateDetailedApproach()
  } else if (lowerMessage.includes("step") || lowerMessage.includes("guide") || lowerMessage.includes("walk")) {
    currentStepLevel++
    return generateInteractiveSteps()
  } else if (lowerMessage.includes("complexity") || lowerMessage.includes("performance")) {
    return generateComplexityAnalysis()
  } else if (lowerMessage.includes("example") || lowerMessage.includes("demo")) {
    return generateInteractiveExample()
  } else if (lowerMessage.includes("stuck") || lowerMessage.includes("confused") || lowerMessage.includes("help")) {
    return generateEncouragement()
  } else if (lowerMessage.includes("debug") || lowerMessage.includes("error") || lowerMessage.includes("wrong")) {
    return generateDebuggingHelp()
  } else if (lowerMessage.includes("pattern") || lowerMessage.includes("technique")) {
    return generatePatternExplanation()
  } else if (lowerMessage.includes("explain") || lowerMessage.includes("understand")) {
    return generateProblemExplanation()
  } else {
    return generateContextualHelp(lowerMessage)
  }
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

**3. Two Pointer Approach** (For sorted arrays)
- Time: O(n log n), Space: O(1)
- Sort first, then use two pointers
- Good space efficiency

Which approach interests you most?`,
    suggestions: ["Explain hash map approach", "Show me brute force", "I want the optimal solution", "Compare all approaches"]
  }
}

function generateInteractiveSteps() {
  const steps = [
    {
      step: 1,
      message: `📝 **Step ${currentStepLevel}: Setting Up**

Let's start by creating our hash map and setting up the iteration:

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
        complement = target - num  # What we're looking for
        
        if complement in num_map:
            return [num_map[complement], i]
        
        num_map[num] = i  # Store current number and index
\`\`\`

See how we check BEFORE storing? This prevents using the same element twice!`,
      suggestions: ["Why check before storing?", "Show me an example", "I think I understand", "What's next?"]
    },
    {
      step: 3,
      message: `📝 **Step ${currentStepLevel}: Complete Solution**

Here's the full solution with comments:

\`\`\`python
def twoSum(nums, target):
    num_map = {}  # Hash map: number -> index
    
    for i, num in enumerate(nums):
        complement = target - num
        
        # Check if complement exists
        if complement in num_map:
            return [num_map[complement], i]
        
        # Store current number and its index
        num_map[num] = i
    
    return []  # No solution found
\`\`\`

Want to trace through an example?`,
      suggestions: ["Trace with example", "Test my understanding", "Explain complexity", "I'm ready to code!"]
    }
  ]
  
  const stepIndex = Math.min(currentStepLevel - 1, steps.length - 1)
  return steps[stepIndex]
}

function generateEncouragement() {
  const encouragements = [
    {
      message: `🌟 **Don't worry, you've got this!** 

LeetCode problems can be tricky, but that's exactly how we learn and grow. Even experienced programmers get stuck sometimes!

Let's break this down together. Here's what I can help you with:

🔍 **Problem Understanding** - Let's make sure we understand what we're solving
💡 **Gentle Hints** - Progressive clues without giving it away  
🛠️ **Different Approaches** - Multiple ways to tackle this
📚 **Learning Patterns** - Techniques you can reuse

What would be most helpful right now?`,
      suggestions: ["Explain the problem simply", "Give me a gentle hint", "I need motivation", "Start with examples"]
    }
  ]
  
  return encouragements[0]
}

function generateDebuggingHelp() {
  return {
    message: `🐛 **Debug Mode Activated!**

I'm here to help you debug! Common issues with this type of problem:

**🔍 Check These First:**
- Are you handling edge cases (empty array, no solution)?
- Are you avoiding using the same element twice?
- Is your hash map storing the right data?

**🚨 Common Mistakes:**
- Storing in hash map BEFORE checking for complement
- Returning wrong indices or in wrong order
- Not handling duplicate numbers correctly

**💡 Debugging Strategy:**
1. Add print statements to see what's in your hash map
2. Trace through with a simple example step by step
3. Check your return statement format

What specific issue are you facing?`,
    suggestions: ["My code gives wrong answer", "Getting index errors", "Explain edge cases", "Check my logic"]
  }
}

function generatePatternExplanation() {
  return {
    message: `🎨 **Coding Pattern: Hash Map Lookup**

This problem uses the **"Complement Pattern"** - a very common technique!

**🧩 The Pattern:**
- For each element, calculate what you need to find
- Use a hash map to check if you've seen it before
- Store elements as you go for future lookups

**🔄 Where else you'll see this:**
- Two Sum variations (3Sum, 4Sum)
- Finding pairs with specific differences
- Checking for duplicates
- Anagram detection

**🧠 Key Insight:** 
Instead of checking all possibilities (O(n²)), we "remember" what we've seen for instant lookup (O(1))!

This pattern will serve you well in many other problems!`,
    suggestions: ["Show similar problems", "Practice this pattern", "Explain with code", "What's next to learn?"]
  }
}

function generateProblemExplanation() {
  return {
    message: `� **Let's Break Down This Problem**

**🎯 What we're trying to do:**
Given an array of numbers and a target, find TWO numbers that add up to the target.

**📝 Key Requirements:**
- Return the *indices* (positions), not the actual numbers
- Each element can only be used once
- Exactly one solution is guaranteed

**🤔 Think of it like this:**
Imagine you have a list of prices: [2, 7, 11, 15]
You have $9 to spend on exactly 2 items
Which two items can you buy? → Items at positions 0 and 1 (prices 2 and 7)

**💡 The "Aha!" moment:**
Instead of checking every possible pair, we can be smart about it!
For each price, ask: "Have I seen the price I need to complete my budget?"

Make sense so far?`,
    suggestions: ["Yes, show me how to code it", "I need more examples", "What's the optimal approach?", "Give me a hint"]
  }
}

function generateContextualHelp(message) {
  return {
    message: `🤖 **I'm here to help!** 

I can assist you with this LeetCode problem in many ways:

**🎯 Problem Solving:**
- Progressive hints that adapt to your level
- Multiple solution approaches  
- Step-by-step coding guidance

**🧠 Learning:**
- Explain coding patterns and techniques
- Help you understand time/space complexity
- Connect this to other similar problems

**🛠️ Practical Help:**
- Debug your existing code
- Provide working examples
- Suggest optimizations

Just ask me naturally - I understand context and can adapt to your learning style!

*What specific aspect would you like to explore?*`,
    suggestions: ["I need hints", "Explain the approach", "Help me get started", "I'm stuck debugging"]
  }
}
