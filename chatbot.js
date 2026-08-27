let currentProblem = null
let hintLevel = 0

document.addEventListener("DOMContentLoaded", async () => {
  const result = await chrome.storage.local.get(["currentProblemInfo", "currentProblemUrl"])

  if (result.currentProblemInfo) {
    currentProblem = result.currentProblemInfo
    displayProblemInfo(currentProblem)
  } else {
    document.getElementById("problemDetails").innerHTML =
      '<p style="color: #666;">No problem detected. Please visit a LeetCode problem page first.</p>'
  }
})

function displayProblemInfo(problem) {
  const detailsDiv = document.getElementById("problemDetails")
  detailsDiv.innerHTML = `
        <h4>${problem.title || "Unknown Problem"}</h4>
        <p><strong>Difficulty:</strong> <span style="color: ${getDifficultyColor(problem.difficulty)}">${problem.difficulty || "Unknown"}</span></p>
        <p><strong>Examples:</strong> ${problem.examples.length} found</p>
        <p><strong>Constraints:</strong> ${problem.constraints.length} listed</p>
    `
}

function getDifficultyColor(difficulty) {
  switch (difficulty?.toLowerCase()) {
    case "easy":
      return "#4caf50"
    case "medium":
      return "#ff9800"
    case "hard":
      return "#f44336"
    default:
      return "#666"
  }
}

function sendMessage(message) {
  document.getElementById("messageInput").value = message
  sendUserMessage()
}

function sendUserMessage() {
  const input = document.getElementById("messageInput")
  const message = input.value.trim()

  if (!message) return

  addMessage(message, "user")
  input.value = ""

  // Generate AI response
  setTimeout(() => {
    const response = generateResponse(message)
    addMessage(response, "bot")
  }, 1000)
}

function addMessage(content, type) {
  const chatContainer = document.getElementById("chatContainer")
  const messageDiv = document.createElement("div")
  messageDiv.className = `message ${type}-message`

  const sender = type === "user" ? "You" : "AI Assistant"
  messageDiv.innerHTML = `<strong>${sender}:</strong> ${content}`

  chatContainer.appendChild(messageDiv)
  chatContainer.scrollTop = chatContainer.scrollHeight
}

function generateResponse(message) {
  if (!currentProblem) {
    return "I don't have information about the current problem. Please visit a LeetCode problem page and reopen the assistant."
  }

  const msg = message.toLowerCase()

  if (msg.includes("hint")) {
    return generateHint()
  } else if (msg.includes("step") || msg.includes("approach")) {
    return generateStepByStep()
  } else if (msg.includes("solution") || msg.includes("optimal")) {
    return generateSolution()
  } else if (msg.includes("data structure")) {
    return generateDataStructureAdvice()
  } else if (msg.includes("complexity") || msg.includes("time")) {
    return generateComplexityAnalysis()
  } else {
    return generateGeneralResponse(message)
  }
}

function generateHint() {
  const hints = [
    "Let's think about what data structure would help us access elements efficiently. What if we need to look up values we've seen before?",
    "Consider the time complexity. Can we solve this in a single pass through the data?",
    "Think about the relationship between the elements. Is there a pattern or mathematical property we can exploit?",
    "What if we store information as we process each element? How could that help with future elements?",
    "Consider edge cases: what happens with empty input, single elements, or duplicate values?",
  ]

  const hint = hints[hintLevel % hints.length]
  hintLevel++

  return `💡 **Hint ${hintLevel}:** ${hint}`
}

function generateStepByStep() {
  return `📋 **Step-by-Step Approach for "${currentProblem.title}":**

1. **Understand the Problem**: Read through the description and examples carefully
2. **Identify Patterns**: Look for mathematical relationships or data structure needs
3. **Choose Data Structure**: Based on the operations needed (lookup, insertion, etc.)
4. **Plan Algorithm**: Outline your approach before coding
5. **Handle Edge Cases**: Consider empty inputs, single elements, duplicates
6. **Implement**: Write clean, readable code
7. **Test**: Verify with provided examples
8. **Optimize**: Review time and space complexity

Would you like me to elaborate on any of these steps?`
}

function generateSolution() {
  return `🎯 **Solution Strategy for "${currentProblem.title}":**

I'll guide you toward the solution rather than giving it away completely:

**Key Insights:**
- Look for the most efficient data structure for the required operations
- Consider if you can solve this in O(n) time complexity
- Think about space-time tradeoffs

**Common Patterns:**
- Hash maps for fast lookups and avoiding duplicates
- Array/List for ordered data and index-based access
- Stack/Queue for LIFO/FIFO processing
- Two Pointers for array traversal optimization

Would you like me to provide more specific guidance based on your current approach?`
}

function generateDataStructureAdvice() {
  return `🏗️ **Data Structure Guidance for "${currentProblem.title}":**

Consider these options:
- **Hash Map/Set**: For fast lookups and avoiding duplicates
- **Array/List**: For ordered data and index-based access
- **Stack/Queue**: For LIFO/FIFO processing
- **Two Pointers**: For array traversal optimization

The choice depends on:
- What operations you need (search, insert, delete)
- Time complexity requirements
- Space constraints

What specific operations does your problem require?`
}

function generateComplexityAnalysis() {
  return `⏱️ **Complexity Analysis for "${currentProblem.title}":**

**Time Complexity Considerations:**
- Nested loops: O(n²) - try to avoid if possible
- Single pass: O(n) - often optimal for array problems
- Hash operations: O(1) average case
- Sorting: O(n log n) - sometimes necessary

**Space Complexity:**
- In-place algorithms: O(1) extra space
- Hash maps: O(n) space for O(1) lookups
- Consider the space-time tradeoff

What's your current approach? I can help analyze its complexity.`
}

function generateGeneralResponse(message) {
  return `I understand you're asking about "${message}". 

For the problem "${currentProblem.title}" (${currentProblem.difficulty}), I can help you with:
- Hints to guide your thinking
- Step-by-step problem-solving approach  
- Data structure recommendations
- Complexity analysis
- Solution strategies

What specific aspect would you like to explore?`
}

function handleKeyPress(event) {
  if (event.key === "Enter") {
    sendUserMessage()
  }
}
