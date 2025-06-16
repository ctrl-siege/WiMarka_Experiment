import React, { useState, useEffect } from 'react';
import { adminAPI, sentencesAPI } from '../services/api';
import type { AdminStats, User, Sentence, Annotation, TextHighlight } from '../types';
import { Users, FileText, BarChart3, CheckCircle, Plus, Filter, Home, MessageCircle } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [sentenceAnnotations, setSentenceAnnotations] = useState<Map<number, Annotation[]>>(new Map());
  const [sentenceCounts, setSentenceCounts] = useState<{[key: string]: number}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'overview' | 'users' | 'sentences'>('home');
  const [showAddSentence, setShowAddSentence] = useState(false);
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [expandedSentences, setExpandedSentences] = useState<Set<number>>(new Set());
  const [newSentence, setNewSentence] = useState({
    source_text: '',
    machine_translation: '',
    source_language: 'en',
    target_language: 'tagalog',
    domain: '',
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsData, usersData, countsData] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getAllUsers(),
        adminAPI.getSentenceCountsByLanguage(),
      ]);
      setStats(statsData);
      setUsers(usersData);
      setSentenceCounts(countsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSentences = React.useCallback(async () => {
    try {
      const targetLanguage = languageFilter === 'all' ? undefined : languageFilter;
      const sentencesData = await adminAPI.getAdminSentences(0, 100, targetLanguage);
      setSentences(sentencesData);
      
      // Load annotations for each sentence
      const annotationsMap = new Map<number, Annotation[]>();
      for (const sentence of sentencesData) {
        try {
          const annotations = await adminAPI.getSentenceAnnotations(sentence.id);
          annotationsMap.set(sentence.id, annotations);
        } catch (error) {
          console.error(`Error loading annotations for sentence ${sentence.id}:`, error);
          annotationsMap.set(sentence.id, []);
        }
      }
      setSentenceAnnotations(annotationsMap);
    } catch (error) {
      console.error('Error loading sentences:', error);
    }
  }, [languageFilter]);

  useEffect(() => {
    if (activeTab === 'sentences') {
      loadSentences();
    }
  }, [activeTab, loadSentences]);

  const handleAddSentence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sentencesAPI.createSentence(newSentence);
      setNewSentence({
        source_text: '',
        machine_translation: '',
        source_language: 'en',
        target_language: 'tagalog',
        domain: '',
      });
      setShowAddSentence(false);
      await loadDashboardData();
      if (activeTab === 'sentences') {
        await loadSentences();
      }
    } catch (error) {
      console.error('Error adding sentence:', error);
    }
  };

  const handleToggleEvaluatorRole = async (userId: number) => {
    try {
      const updatedUser = await adminAPI.toggleEvaluatorRole(userId);
      // Update the user in the local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? updatedUser : user
        )
      );
    } catch (error) {
      console.error('Error toggling evaluator role:', error);
    }
  };

  const renderHighlightedText = (text: string, highlights: TextHighlight[], textType: 'machine' | 'reference') => {
    const relevantHighlights = highlights.filter(h => h.text_type === textType);

    if (relevantHighlights.length === 0) {
      return <span>{text}</span>;
    }

    // Sort highlights by start position and filter out invalid ones
    const validHighlights = relevantHighlights
      .filter(h => h.start_index >= 0 && h.end_index <= text.length && h.start_index < h.end_index)
      .sort((a, b) => a.start_index - b.start_index);
    
    if (validHighlights.length === 0) {
      return <span>{text}</span>;
    }

    const parts = [];
    let lastIndex = 0;

    validHighlights.forEach((highlight, index) => {
      // Ensure we don't have overlapping highlights by adjusting start position
      const startIndex = Math.max(highlight.start_index, lastIndex);
      const endIndex = Math.min(highlight.end_index, text.length);
      
      // Skip if this highlight would be empty after adjustments
      if (startIndex >= endIndex) return;

      // Add text before highlight
      if (startIndex > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {text.slice(lastIndex, startIndex)}
          </span>
        );
      }

      // Add highlighted text with blue highlight style
      const highlightedText = text.slice(startIndex, endIndex);
      parts.push(
        <span
          key={`highlight-${highlight.id}`}
          className="bg-blue-200 border-b-2 border-blue-400 px-1 rounded cursor-pointer relative group"
          title={highlight.comment}
        >
          {highlightedText}
          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10">
            <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap max-w-xs">
              {highlight.comment}
            </div>
          </div>
        </span>
      );

      lastIndex = endIndex;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key="text-end">
          {text.slice(lastIndex)}
        </span>
      );
    }

    return <>{parts}</>;
  };

  const toggleSentenceExpansion = (sentenceId: number) => {
    setExpandedSentences(prev => {
      const updated = new Set(prev);
      if (updated.has(sentenceId)) {
        updated.delete(sentenceId);
      } else {
        updated.add(sentenceId);
      }
      return updated;
    });
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string }> = 
    ({ title, value, icon, color }) => (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

    return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="text-sm text-gray-500">
            {stats && `${stats.total_users} users • ${stats.total_sentences} sentences`}
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'home', label: 'Home', icon: Home },
              { key: 'overview', label: 'Overview', icon: BarChart3 },
              { key: 'users', label: 'Users', icon: Users },
              { key: 'sentences', label: 'Sentences', icon: FileText },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'home' | 'overview' | 'users' | 'sentences')}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Home Tab */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-8 text-white">
              <h2 className="text-3xl font-bold mb-2">Welcome to WiMarka - Admin Panel</h2>
              <p className="text-primary-100 text-lg">
                Manage your translation system, monitor user activity, and oversee content management.
              </p>
            </div>

            {/* Quick Stats Overview */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border shadow-sm p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-xl font-bold text-gray-900">{stats.total_users}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg border shadow-sm p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Total Sentences</p>
                      <p className="text-xl font-bold text-gray-900">{stats.total_sentences}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg border shadow-sm p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Active Users</p>
                      <p className="text-xl font-bold text-gray-900">{stats.active_users}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('users')}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Users className="h-8 w-8 text-blue-500 mr-3" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Manage Users</p>
                    <p className="text-sm text-gray-500">View and manage user accounts</p>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('sentences')}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileText className="h-8 w-8 text-green-500 mr-3" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Manage Content</p>
                    <p className="text-sm text-gray-500">Add and manage sentences</p>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <BarChart3 className="h-8 w-8 text-purple-500 mr-3" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">View Statistics</p>
                    <p className="text-sm text-gray-500">Check system analytics</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Activity Summary */}
            {stats && (
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">User Activity</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Active Users</span>
                        <span className="text-sm font-medium">{stats.active_users}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Users</span>
                        <span className="text-sm font-medium">{stats.total_users}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Content Statistics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Sentences</span>
                        <span className="text-sm font-medium">{stats.total_sentences}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Available Languages</span>
                        <span className="text-sm font-medium">
                          {Object.keys(sentenceCounts).filter(key => key !== 'all' && sentenceCounts[key] > 0).length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard
                title="Total Users"
                value={stats.total_users}
                icon={<Users className="h-6 w-6 text-blue-600" />}
                color="bg-blue-100"
              />
              <StatCard
                title="Total Sentences"
                value={stats.total_sentences}
                icon={<FileText className="h-6 w-6 text-green-600" />}
                color="bg-green-100"
              />
              <StatCard
                title="Active Users"
                value={stats.active_users}
                icon={<CheckCircle className="h-6 w-6 text-emerald-600" />}
                color="bg-emerald-100"
              />
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">System Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Active Users</p>
                  <p className="text-xl font-bold text-gray-900">{stats.active_users}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Available Languages</p>
                  <p className="text-xl font-bold text-gray-900">
                    {Object.keys(sentenceCounts).filter(key => key !== 'all' && sentenceCounts[key] > 0).length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">User Activity Rate</p>
                  <p className="text-xl font-bold text-gray-900">
                    {stats.total_users > 0 
                      ? Math.round((stats.active_users / stats.total_users) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-1">
                          {user.is_admin && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Admin
                            </span>
                          )}
                          {user.is_evaluator && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Evaluator
                            </span>
                          )}
                          {!user.is_admin && !user.is_evaluator && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              User
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_active 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleToggleEvaluatorRole(user.id)}
                          className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                            user.is_evaluator
                              ? 'bg-red-100 text-red-800 hover:bg-red-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {user.is_evaluator ? 'Remove Evaluator' : 'Make Evaluator'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sentences Tab */}
        {activeTab === 'sentences' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Manage Sentences</h3>
              <button
                onClick={() => setShowAddSentence(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Sentence</span>
              </button>
            </div>

            {/* Language Filter Tabs */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-8 shadow-lg">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center space-x-3 mb-2">
                  <Filter className="h-7 w-7 text-blue-600" />
                  <h4 className="text-xl font-bold text-gray-900">Filter by Language</h4>
                </div>
                <p className="text-sm text-gray-600">Select a language to view and manage sentences</p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-4">
                {[
                  { key: 'all', label: 'All Languages' },
                  { key: 'tagalog', label: 'Tagalog' },
                  { key: 'cebuano', label: 'Cebuano' },
                  { key: 'ilocano', label: 'Ilocano' },
                  { key: 'hiligaynon', label: 'Hiligaynon' },
                  { key: 'bicolano', label: 'Bicolano' },
                  { key: 'waray', label: 'Waray' },
                  { key: 'pampangan', label: 'Pampangan' },
                  { key: 'pangasinan', label: 'Pangasinan' },
                  { key: 'en', label: 'English' },
                  { key: 'es', label: 'Spanish' },
                  { key: 'fr', label: 'French' },
                  { key: 'de', label: 'German' },
                ].map((language) => {
                  const count = sentenceCounts[language.key] || 0;
                  // Don't show languages with 0 sentences unless it's "all"
                  if (count === 0 && language.key !== 'all') return null;
                  
                  return (
                    <button
                      key={language.key}
                      onClick={() => setLanguageFilter(language.key)}
                      className={`inline-flex items-center px-6 py-4 rounded-xl text-base font-semibold transition-all duration-300 border-2 shadow-md hover:shadow-lg transform hover:scale-105 ${
                        languageFilter === language.key
                          ? 'bg-primary-600 text-white border-primary-600 shadow-primary-200 ring-4 ring-primary-200'
                          : 'bg-white text-gray-800 border-gray-300 hover:bg-primary-50 hover:border-primary-400 hover:text-primary-700'
                      }`}
                    >
                      <span className="font-bold">{language.label}</span>
                      <span className={`ml-3 px-3 py-1 rounded-full text-sm font-bold ${
                        languageFilter === language.key
                          ? 'bg-white bg-opacity-25 text-white'
                          : 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {showAddSentence && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Add New Sentence</h4>
                <form onSubmit={handleAddSentence} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Source Language
                      </label>
                      <select
                        value={newSentence.source_language}
                        onChange={(e) => setNewSentence({...newSentence, source_language: e.target.value})}
                        className="input-field"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Target Language
                      </label>
                      <select
                        value={newSentence.target_language}
                        onChange={(e) => setNewSentence({...newSentence, target_language: e.target.value})}
                        className="input-field"
                      >
                        <option value="tagalog">Tagalog</option>
                        <option value="cebuano">Cebuano</option>
                        <option value="ilocano">Ilocano</option>
                        <option value="hiligaynon">Hiligaynon</option>
                        <option value="bicolano">Bicolano</option>
                        <option value="waray">Waray</option>
                        <option value="pampangan">Pampangan</option>
                        <option value="pangasinan">Pangasinan</option>
                        <option value="fr">French</option>
                        <option value="es">Spanish</option>
                        <option value="en">English</option>
                        <option value="de">German</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SOURCE TEXT
                    </label>
                    <textarea
                      value={newSentence.source_text}
                      onChange={(e) => setNewSentence({...newSentence, source_text: e.target.value})}
                      className="textarea-field"
                      required
                      placeholder="Enter the source text..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Machine Translation
                    </label>
                    <textarea
                      value={newSentence.machine_translation}
                      onChange={(e) => setNewSentence({...newSentence, machine_translation: e.target.value})}
                      className="textarea-field"
                      required
                      placeholder="Enter the machine translation..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Domain (Optional)
                    </label>
                    <select
                      value={newSentence.domain}
                      onChange={(e) => setNewSentence({...newSentence, domain: e.target.value})}
                      className="input-field"
                    >
                      <option value="">Select domain</option>
                      <option value="general">General</option>
                      <option value="medical">Medical</option>
                      <option value="legal">Legal</option>
                      <option value="technical">Technical</option>
                      <option value="business">Business</option>
                    </select>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAddSentence(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      Add Sentence
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Sentences List */}
            <div className="bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden">
              <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-6 w-6 text-gray-600" />
                    <h4 className="text-lg font-bold text-gray-900">
                      Sentences ({sentences.length})
                    </h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Showing:</span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 border border-primary-200">
                      {languageFilter === 'all' ? 'All Languages' : languageFilter.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="divide-y-2 divide-gray-100">
                {sentences.map((sentence) => (
                  <div key={sentence.id} className="p-8 hover:bg-gray-50 transition-colors duration-200">
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-3 mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-primary-700">#{sentence.id}</span>
                          </div>
                          <span className="text-lg font-semibold text-gray-900">Sentence {sentence.id}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-sm">
                            {sentence.source_language.toUpperCase()} → {sentence.target_language.toUpperCase()}
                          </span>
                          {sentence.domain && (
                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border border-emerald-200">
                              📁 {sentence.domain}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid gap-4">
                        <div className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Source Text</p>
                          </div>
                          <p className="text-gray-900 font-medium leading-relaxed">{sentence.source_text}</p>
                        </div>
                        
                        <div className="bg-white border border-purple-200 rounded-lg p-4 shadow-sm">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Machine Translation</p>
                          </div>
                          <div className="text-gray-900 font-medium leading-relaxed">
                            {(() => {
                              const annotations = sentenceAnnotations.get(sentence.id) || [];
                              const allHighlights = annotations.flatMap(ann => ann.highlights || []);
                              return renderHighlightedText(sentence.machine_translation, allHighlights, 'machine');
                            })()}
                          </div>
                        </div>

                        {/* Annotations Section */}
                        {(() => {
                          const annotations = sentenceAnnotations.get(sentence.id) || [];
                          if (annotations.length === 0) return null;

                          return (
                            <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                  <MessageCircle className="h-4 w-4 text-gray-600" />
                                  <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                    Annotations ({annotations.length})
                                  </p>
                                </div>
                                <button
                                  onClick={() => toggleSentenceExpansion(sentence.id)}
                                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  {expandedSentences.has(sentence.id) ? 'Hide Details' : 'Show Details'}
                                </button>
                              </div>
                              
                              {/* Annotations Summary */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                <div className="text-center p-2 bg-blue-50 rounded">
                                  <div className="text-xs text-gray-600">Completed</div>
                                  <div className="text-sm font-bold text-blue-600">
                                    {annotations.filter(a => a.annotation_status === 'completed').length}
                                  </div>
                                </div>
                                <div className="text-center p-2 bg-yellow-50 rounded">
                                  <div className="text-xs text-gray-600">In Progress</div>
                                  <div className="text-sm font-bold text-yellow-600">
                                    {annotations.filter(a => a.annotation_status === 'in_progress').length}
                                  </div>
                                </div>
                                <div className="text-center p-2 bg-green-50 rounded">
                                  <div className="text-xs text-gray-600">Avg Quality</div>
                                  <div className="text-sm font-bold text-green-600">
                                    {annotations.filter(a => a.overall_quality).length > 0 
                                      ? (annotations.reduce((sum, a) => sum + (a.overall_quality || 0), 0) / annotations.filter(a => a.overall_quality).length).toFixed(1)
                                      : 'N/A'
                                    }
                                  </div>
                                </div>
                                <div className="text-center p-2 bg-purple-50 rounded">
                                  <div className="text-xs text-gray-600">Highlights</div>
                                  <div className="text-sm font-bold text-purple-600">
                                    {annotations.reduce((sum, a) => sum + (a.highlights?.length || 0), 0)}
                                  </div>
                                </div>
                              </div>

                              {/* Expanded Annotation Details */}
                              {expandedSentences.has(sentence.id) && (
                                <div className="space-y-4 border-t pt-4">
                                  {annotations.map((annotation, idx) => (
                                    <div key={annotation.id} className="bg-gray-50 rounded-lg p-4 border">
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-2">
                                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                            {idx + 1}
                                          </div>
                                          <span className="font-medium text-gray-900">
                                            {annotation.annotator.first_name} {annotation.annotator.last_name}
                                          </span>
                                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            annotation.annotation_status === 'completed' 
                                              ? 'bg-green-100 text-green-800'
                                              : annotation.annotation_status === 'in_progress'
                                              ? 'bg-yellow-100 text-yellow-800'
                                              : 'bg-gray-100 text-gray-800'
                                          }`}>
                                            {annotation.annotation_status}
                                          </span>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {new Date(annotation.created_at).toLocaleDateString()}
                                        </div>
                                      </div>

                                      {/* Scores */}
                                      {(annotation.fluency_score || annotation.adequacy_score || annotation.overall_quality) && (
                                        <div className="grid grid-cols-3 gap-3 mb-3">
                                          {annotation.fluency_score && (
                                            <div className="text-center p-2 bg-white rounded border">
                                              <div className="text-xs text-gray-600">Fluency</div>
                                              <div className={`text-sm font-bold ${getScoreColor(annotation.fluency_score)}`}>
                                                {annotation.fluency_score}/5
                                              </div>
                                            </div>
                                          )}
                                          {annotation.adequacy_score && (
                                            <div className="text-center p-2 bg-white rounded border">
                                              <div className="text-xs text-gray-600">Adequacy</div>
                                              <div className={`text-sm font-bold ${getScoreColor(annotation.adequacy_score)}`}>
                                                {annotation.adequacy_score}/5
                                              </div>
                                            </div>
                                          )}
                                          {annotation.overall_quality && (
                                            <div className="text-center p-2 bg-white rounded border">
                                              <div className="text-xs text-gray-600">Overall</div>
                                              <div className={`text-sm font-bold ${getScoreColor(annotation.overall_quality)}`}>
                                                {annotation.overall_quality}/5
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Final Form */}
                                      {annotation.final_form && (
                                        <div className="mb-3">
                                          <div className="text-xs font-medium text-gray-700 mb-1">Final Form:</div>
                                          <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-gray-900">
                                            {annotation.final_form}
                                          </div>
                                        </div>
                                      )}

                                      {/* Comments/Errors */}
                                      {(annotation.comments || annotation.errors_found || annotation.suggested_correction) && (
                                        <div className="space-y-2">
                                          {annotation.comments && (
                                            <div>
                                              <div className="text-xs font-medium text-gray-700 mb-1">Comments:</div>
                                              <div className="text-sm text-gray-900 bg-white border rounded p-2">
                                                {annotation.comments}
                                              </div>
                                            </div>
                                          )}
                                          {annotation.errors_found && (
                                            <div>
                                              <div className="text-xs font-medium text-gray-700 mb-1">Errors Found:</div>
                                              <div className="text-sm text-gray-900 bg-red-50 border border-red-200 rounded p-2">
                                                {annotation.errors_found}
                                              </div>
                                            </div>
                                          )}
                                          {annotation.suggested_correction && (
                                            <div>
                                              <div className="text-xs font-medium text-gray-700 mb-1">Suggested Correction:</div>
                                              <div className="text-sm text-gray-900 bg-blue-50 border border-blue-200 rounded p-2">
                                                {annotation.suggested_correction}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Highlights */}
                                      {annotation.highlights && annotation.highlights.length > 0 && (
                                        <div className="mt-3">
                                          <div className="text-xs font-medium text-gray-700 mb-2">
                                            Text Highlights ({annotation.highlights.length}):
                                          </div>
                                          <div className="space-y-2">
                                            {annotation.highlights.map((highlight, hIdx) => (
                                              <div key={highlight.id || hIdx} className="bg-white border rounded p-2">
                                                <div className="flex items-center justify-between mb-1">
                                                  <span className="text-xs font-medium text-gray-600">
                                                    {highlight.text_type === 'machine' ? 'Machine Translation' : 'Reference Translation'}
                                                  </span>
                                                  <span className="text-xs text-gray-500">
                                                    {highlight.start_index}-{highlight.end_index}
                                                  </span>
                                                </div>
                                                <div className="text-sm">
                                                  <span className="font-medium text-gray-900 bg-blue-100 px-1 rounded">
                                                    "{highlight.highlighted_text}"
                                                  </span>
                                                </div>
                                                {highlight.comment && (
                                                  <div className="text-xs text-gray-700 mt-1 italic">
                                                    {highlight.comment}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {sentences.length === 0 && (
                  <div className="p-12 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <FileText className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No sentences found</h3>
                        <p className="text-gray-500">
                          No sentences available for the selected language filter: <span className="font-semibold">{languageFilter === 'all' ? 'All Languages' : languageFilter.toUpperCase()}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => setShowAddSentence(true)}
                        className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Sentence
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;