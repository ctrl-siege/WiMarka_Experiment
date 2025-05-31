import React, { useState, useEffect } from 'react';
import { adminAPI, sentencesAPI } from '../services/api';
import type { AdminStats, User } from '../types';
import { Users, FileText, BarChart3, CheckCircle, Plus, Home } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'overview' | 'users' | 'sentences'>('home');
  const [showAddSentence, setShowAddSentence] = useState(false);
  const [newSentence, setNewSentence] = useState({
    source_text: '',
    machine_translation: '',
    reference_translation: '',
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
      const [statsData, usersData] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getAllUsers(),
      ]);
      setStats(statsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSentence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sentencesAPI.createSentence(newSentence);
      setNewSentence({
        source_text: '',
        machine_translation: '',
        reference_translation: '',
        source_language: 'en',
        target_language: 'tagalog',
        domain: '',
      });
      setShowAddSentence(false);
      await loadDashboardData();
    } catch (error) {
      console.error('Error adding sentence:', error);
    }
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
        
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
                onClick={() => setActiveTab(tab.key as any)}
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
              <h2 className="text-3xl font-bold mb-2">Welcome to WiMarka - Annotation Tool</h2>
              <p className="text-primary-100 text-lg">
                Manage your annotation system, monitor user activity, and oversee translation quality assessments.
              </p>
            </div>

            {/* Quick Stats Overview */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Total Annotations</p>
                      <p className="text-xl font-bold text-gray-900">{stats.total_annotations}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg border shadow-sm p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Completed</p>
                      <p className="text-xl font-bold text-gray-900">{stats.completed_annotations}</p>
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
                    <p className="font-medium text-gray-900">View Analytics</p>
                    <p className="text-sm text-gray-500">Check detailed statistics</p>
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
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Annotation Progress</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Completion Rate</span>
                        <span className="text-sm font-medium">
                          {stats.total_annotations > 0 
                            ? Math.round((stats.completed_annotations / stats.total_annotations) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary-500 h-2 rounded-full" 
                          style={{ 
                            width: `${stats.total_annotations > 0 
                              ? Math.round((stats.completed_annotations / stats.total_annotations) * 100)
                              : 0}%` 
                          }}
                        ></div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                title="Total Annotations"
                value={stats.total_annotations}
                icon={<BarChart3 className="h-6 w-6 text-purple-600" />}
                color="bg-purple-100"
              />
              <StatCard
                title="Completed Annotations"
                value={stats.completed_annotations}
                icon={<CheckCircle className="h-6 w-6 text-emerald-600" />}
                color="bg-emerald-100"
              />
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Active Users</p>
                  <p className="text-xl font-bold text-gray-900">{stats.active_users}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completion Rate</p>
                  <p className="text-xl font-bold text-gray-900">
                    {stats.total_annotations > 0 
                      ? Math.round((stats.completed_annotations / stats.total_annotations) * 100)
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_admin 
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.is_admin ? 'Admin' : 'User'}
                        </span>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sentences Tab */}
        {activeTab === 'sentences' && (
          <div className="space-y-4">
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
                      Source Text
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
                      Reference Translation (Optional)
                    </label>
                    <textarea
                      value={newSentence.reference_translation}
                      onChange={(e) => setNewSentence({...newSentence, reference_translation: e.target.value})}
                      className="textarea-field"
                      placeholder="Enter a reference translation..."
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

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <p className="text-gray-600">
                Total sentences in the system: <span className="font-medium">{stats?.total_sentences || 0}</span>
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Use the form above to add individual sentences, or contact the system administrator 
                for bulk import functionality.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard; 