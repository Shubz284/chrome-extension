
import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Clock, Target, TrendingUp, Award, Settings, Eye, EyeOff, RotateCcw, Calendar, Play, Pause } from 'lucide-react';

export default function App() {
  const [data, setData] = useState([]);
  const [goal, setGoal] = useState('');
  const [goalSaved, setGoalSaved] = useState(null);
  const [viewMode, setViewMode] = useState('pie');
  const [showSettings, setShowSettings] = useState(false);
  const [hideUnproductive, setHideUnproductive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentDomain, setCurrentDomain] = useState('');
  const [sessionStart, setSessionStart] = useState(null);
  const [todayData, setTodayData] = useState([]);
  const [isTracking, setIsTracking] = useState(true);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
  
  const unproductiveSites = [
    'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com', 
    'tiktok.com', 'reddit.com', 'netflix.com', 'twitch.tv',
    'pinterest.com', 'snapchat.com', 'whatsapp.com', 'telegram.org',
    'discord.com', 'gaming', 'game', 'entertainment'
  ];

  const productiveSites = [
    'github.com', 'stackoverflow.com', 'docs.google.com', 'notion.so',
    'figma.com', 'claude.ai', 'chatgpt.com', 'linkedin.com',
    'medium.com', 'developer.mozilla.org', 'w3schools.com', 'codepen.io'
  ];

  useEffect(() => {
    loadData();
    getCurrentTab();

    // Sync background state with UI when popup opens
    chrome.runtime.sendMessage({ action: 'syncTrackingState' }, (res) => {
      if (res?.trackingEnabled !== undefined) {
        setIsTracking(res.trackingEnabled);
      }
    });

    // Refresh data every 5 seconds to show real-time updates
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const getCurrentTab = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && typeof tab.url === 'string' && tab.url.startsWith('http')) {
        const domain = new URL(tab.url).hostname.replace('www.', '');
        setCurrentDomain(domain);
      }
    } catch (error) {
      console.error('Error getting current tab:', error);
    }
  };

  const loadData = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(null);
        
        // Filter out settings and get only domain data
        const domainEntries = Object.entries(result)
          .filter(([key]) => 
            !['daily_goal', 'hide_unproductive', 'tracking_enabled', 'session_start'].includes(key) &&
            !key.startsWith('date_') // Filter out date-specific entries if any
          );

        // Get today's date for filtering today's data
        const today = new Date().toDateString();
        const todayKey = `date_${today}`;
        const todayResult = result[todayKey] || {};

        // Process all-time data
        const processed = domainEntries
          .map(([domain, ms]) => ({
            domain: domain.replace('www.', ''),
            min: Math.round(ms / 60000),
            ms: ms,
            isUnproductive: isUnproductiveSite(domain),
            isProductive: isProductiveSite(domain)
          }))
          .filter(item => item.min > 0)
          .sort((a, b) => b.min - a.min);

        // Process today's data
        const todayProcessed = Object.entries(todayResult)
          .map(([domain, ms]) => ({
            domain: domain.replace('www.', ''),
            min: Math.round(ms / 60000),
            ms: ms,
            isUnproductive: isUnproductiveSite(domain),
            isProductive: isProductiveSite(domain)
          }))
          .filter(item => item.min > 0)
          .sort((a, b) => b.min - a.min);

        setData(processed);
        setTodayData(todayProcessed);
        
        // Load settings
        if (result.daily_goal) setGoalSaved(result.daily_goal);
        if (result.hide_unproductive !== undefined) setHideUnproductive(result.hide_unproductive);
        if (result.tracking_enabled !== undefined) setIsTracking(result.tracking_enabled);
        if (result.session_start) setSessionStart(result.session_start);
        
      } else {
        // Development mock data
        const mockData = [
          { domain: 'github.com', min: 145, ms: 8700000, isUnproductive: false, isProductive: true },
          { domain: 'stackoverflow.com', min: 89, ms: 5340000, isUnproductive: false, isProductive: true },
          { domain: 'youtube.com', min: 234, ms: 14040000, isUnproductive: true, isProductive: false },
          { domain: 'facebook.com', min: 67, ms: 4020000, isUnproductive: true, isProductive: false },
          { domain: 'notion.so', min: 178, ms: 10680000, isUnproductive: false, isProductive: true },
          { domain: 'figma.com', min: 123, ms: 7380000, isUnproductive: false, isProductive: true },
          { domain: 'claude.ai', min: 156, ms: 9360000, isUnproductive: false, isProductive: true },
          { domain: 'twitter.com', min: 45, ms: 2700000, isUnproductive: true, isProductive: false }
        ];
        setData(mockData);
        setTodayData(mockData);
        setGoalSaved(480);
        setCurrentDomain('github.com');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const isUnproductiveSite = (domain) => {
    return unproductiveSites.some(site => domain.toLowerCase().includes(site.toLowerCase()));
  };

  const isProductiveSite = (domain) => {
    return productiveSites.some(site => domain.toLowerCase().includes(site.toLowerCase()));
  };

  const saveToStorage = async (key, value) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ [key]: value });
      }
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  };

  const handleGoalSubmit = () => {
    const num = parseInt(goal);
    if (!isNaN(num) && num > 0) {
      setGoalSaved(num);
      setGoal('');
      saveToStorage('daily_goal', num);
    }
  };

  const handleHideToggle = () => {
    const newValue = !hideUnproductive;
    setHideUnproductive(newValue);
    saveToStorage('hide_unproductive', newValue);
  };

  const toggleTracking = async () => {
    const newValue = !isTracking;
    setIsTracking(newValue);
    await saveToStorage('tracking_enabled', newValue);

    try {
      await chrome.runtime.sendMessage({ action: 'toggleTracking', enabled: newValue });
    } catch (error) {
      console.error('Error sending message to background script:', error);
    }
  };

  const clearTodayData = async () => {
    if (window.confirm('Clear today\'s tracking data? This cannot be undone.')) {
      const today = new Date().toDateString();
      const todayKey = `date_${today}`;
      await saveToStorage(todayKey, {});
      setTodayData([]);
    }
  };

  const clearAllData = async () => {
    if (window.confirm('Clear ALL tracking data? This cannot be undone.')) {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          const result = await chrome.storage.local.get(null);
          const keysToRemove = Object.keys(result).filter(key => 
            !['daily_goal', 'hide_unproductive', 'tracking_enabled'].includes(key)
          );
          await chrome.storage.local.remove(keysToRemove);
          setData([]);
          setTodayData([]);
        }
      } catch (error) {
        console.error('Error clearing data:', error);
      }
    }
  };

  // Use today's data for calculations
  const activeData = todayData.length > 0 ? todayData : data;
  const filteredData = hideUnproductive ? activeData.filter(item => !item.isUnproductive) : activeData;
  const totalTime = activeData.reduce((sum, item) => sum + item.min, 0);
  const productiveTime = activeData.filter(item => !item.isUnproductive).reduce((sum, item) => sum + item.min, 0);
  const unproductiveTime = totalTime - productiveTime;
  const goalProgress = goalSaved ? Math.min((productiveTime / goalSaved) * 100, 100) : 0;

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getProgressColor = (progress) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getDomainIcon = (domain) => {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  };

  const getSiteCategory = (item) => {
    if (item.isProductive) return { label: 'Productive', color: 'bg-green-400', textColor: 'text-green-700' };
    if (item.isUnproductive) return { label: 'Distracting', color: 'bg-red-400', textColor: 'text-red-700' };
    return { label: 'Neutral', color: 'bg-yellow-400', textColor: 'text-yellow-700' };
  };

  if (loading) {
    return (
      <div className="w-96 h-96 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
          <p className="text-slate-600">Loading productivity data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 bg-white text-sm max-h-[600px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <div>
              <h1 className="font-bold text-lg">Productivity Tracker</h1>
              <p className="text-indigo-100 text-xs">
                {currentDomain ? `Currently: ${currentDomain}` : 'Chrome Extension'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTracking}
              className={`p-1 rounded transition-colors ${isTracking ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}`}
              title={isTracking ? 'Tracking Active' : 'Tracking Paused'}
            >
              {isTracking ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-b border-slate-200 p-4 bg-slate-50 flex-shrink-0">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Daily Goal (minutes)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="480"
                  className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={handleGoalSubmit}
                  className="px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">Hide Distracting Sites</label>
              <button
                onClick={handleHideToggle}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  hideUnproductive 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {hideUnproductive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {hideUnproductive ? 'Hidden' : 'Visible'}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={clearTodayData}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-50 text-yellow-600 rounded text-xs hover:bg-yellow-100 transition-colors"
              >
                <Calendar className="w-3 h-3" />
                Clear Today
              </button>
              <button
                onClick={clearAllData}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="p-4 border-b border-slate-200 flex-shrink-0">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-xs text-blue-600 font-medium">Total Today</p>
                <p className="font-bold text-blue-800">{formatTime(totalTime)}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-xs text-green-600 font-medium">Productive</p>
                <p className="font-bold text-green-800">{formatTime(productiveTime)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Goal Progress */}
        {goalSaved && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-700">Daily Goal Progress</span>
              <span className="text-xs text-slate-600">{Math.round(goalProgress)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(goalProgress)}`}
                style={{ width: `${Math.min(goalProgress, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Chart Toggle */}
      <div className="p-4 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-slate-800">Today's Usage</h3>
          <div className="flex bg-slate-100 rounded p-1">
            <button
              onClick={() => setViewMode('pie')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                viewMode === 'pie' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-600'
              }`}
            >
              Pie
            </button>
            <button
              onClick={() => setViewMode('bar')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                viewMode === 'bar' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-600'
              }`}
            >
              Bar
            </button>
          </div>
        </div>

        {filteredData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            {viewMode === 'pie' ? (
              <PieChart>
                <Pie
                  data={filteredData.slice(0, 6)}
                  dataKey="min"
                  nameKey="domain"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  innerRadius={20}
                  paddingAngle={2}
                >
                  {filteredData.slice(0, 6).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [formatTime(value), 'Time']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            ) : (
              <BarChart data={filteredData.slice(0, 5)}>
                <XAxis 
                  dataKey="domain" 
                  fontSize={10}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis hide />
                <Tooltip 
                  formatter={(value) => [formatTime(value), 'Time']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="min" fill="#6366f1" radius={[2, 2, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs">
              {isTracking ? 'No usage data today yet' : 'Tracking is paused'}
            </p>
            <p className="text-xs">
              {isTracking ? 'Browse some websites to see your stats!' : 'Click the play button to resume'}
            </p>
          </div>
        )}
      </div>

      {/* Site List */}
      <div className="flex-1 overflow-y-auto">
        {filteredData.slice(0, 12).map((item, index) => {
          const category = getSiteCategory(item);
          return (
            <div key={item.domain} className="flex items-center justify-between p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <img
                  src={getDomainIcon(item.domain)}
                  alt=""
                  className="w-4 h-4 flex-shrink-0"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 truncate text-xs">
                    {item.domain}
                    {item.domain === currentDomain && <span className="ml-1 text-green-600">●</span>}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`w-2 h-2 rounded-full ${category.color}`} />
                    <span className={`text-xs ${category.textColor}`}>
                      {category.label}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-slate-800 text-sm">{formatTime(item.min)}</p>
                <p className="text-xs text-slate-500">
                  {totalTime > 0 ? `${Math.round((item.min / totalTime) * 100)}%` : '0%'}
                </p>
              </div>
            </div>
          );
        })}

        {filteredData.length === 0 && !loading && (
          <div className="text-center py-8 text-slate-500">
            <Target className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs">
              {isTracking ? 'Start browsing to track your productivity!' : 'Tracking is currently paused'}
            </p>
          </div>
        )}

        {filteredData.length > 12 && (
          <div className="p-3 text-center text-xs text-slate-500 bg-slate-50">
            +{filteredData.length - 12} more sites tracked today
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-center flex-shrink-0">
        <p className="text-xs text-slate-500">
          {!isTracking ? '⏸️ Tracking paused' :
           goalSaved && goalProgress >= 100 ? '🎉 Daily goal achieved!' : 
           goalSaved ? `${formatTime(Math.max(0, goalSaved - productiveTime))} left to reach goal` :
           'Set a daily goal to track progress'}
        </p>
      </div>
    </div>
  );
}