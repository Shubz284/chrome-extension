# Chrome Productivity Tracker Extension

This is a Chrome Extension built with React + Vite + Tailwind CSS that helps users monitor their web activity, set daily productivity goals, and visualize their time usage.

## 🚀 Features

- ⏱️ Tracks time spent on each website
- 🎯 Allows users to set a daily usage goal
- 📊 Visualizes time spent using pie charts
- ⏸️ Supports pause/resume tracking toggle
- 🧠 Syncs data using Chrome Storage API

## 🔧 Tech Stack

- React
- Vite
- Tailwind CSS
- Chrome Extensions API
- Recharts (for visualization)

## 📦 Getting Started

```bash
npm install
npm run dev         # Development mode
npm run build:extension   # Builds extension for Chrome
```

Then go to `chrome://extensions`, enable Developer Mode, and load the `/dist` folder.

## 📁 Project Structure

```
chrome-extension/
├── public/
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── App.jsx
│   ├── background.js
│   ├── index.css
│   └── main.jsx
└── dist/ (build output)
```

## 📌 Notes

- Time tracking respects active tab + idle detection
- Works only on `http`/`https` URLs (not `chrome://`, `file://`)
- Pie chart displays domain usage breakdown

---


