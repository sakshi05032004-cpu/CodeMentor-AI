// Background script for the LeetCode extension

chrome.runtime.onInstalled.addListener(() => {
  console.log("LeetCode AI Helper installed!")

  // Initialize storage with default values
  chrome.storage.local.get(["totalSolved", "streak", "easyCount", "mediumCount", "hardCount"], (result) => {
    if (!result.totalSolved) {
      chrome.storage.local.set({
        totalSolved: 0,
        streak: 0,
        easyCount: 0,
        mediumCount: 0,
        hardCount: 0,
        sessionSolved: 0,
        problemNotes: {},
        favorites: [],
      })
    }
  })
})

// Reset session count daily
chrome.alarms.create("resetSession", { periodInMinutes: 1440 }) // 24 hours

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "resetSession") {
    chrome.storage.local.set({ sessionSolved: 0 })
  }
})

// Note: Floating widget is automatically injected via manifest.json content_scripts
// The widget appears automatically on LeetCode problem pages
