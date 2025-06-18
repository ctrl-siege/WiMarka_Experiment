import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Settings, Save, AlertCircle, CheckCircle } from 'lucide-react';

// This component will allow users to update their profile settings
const Profile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    preferred_language: '',
    languages: [] as string[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // Populate form with user data on component mount
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        preferred_language: user.preferred_language || '',
        languages: user.languages || [],
      });
    }
  }, [user]);

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  // Handle language selection
  const handleLanguageToggle = (languageId: string) => {
    setIsDirty(true);
    
    const isSelected = formData.languages.includes(languageId);
    let newLanguages: string[];
    
    if (isSelected) {
      newLanguages = formData.languages.filter(l => l !== languageId);
    } else {
      newLanguages = [...formData.languages, languageId];
    }
    
    // Update preferred_language logic
    let updatedPreferredLanguage = formData.preferred_language;
    
    if (newLanguages.length === 1) {
      // When only one language is selected, it automatically becomes the primary
      updatedPreferredLanguage = newLanguages[0];
    } else if (isSelected && languageId === formData.preferred_language && newLanguages.length > 0) {
      // If removing the current preferred language, set the first remaining one as preferred
      updatedPreferredLanguage = newLanguages[0];
    } else if (formData.preferred_language === '' && newLanguages.length > 0) {
      // Set a preferred language if none is selected but languages are available
      updatedPreferredLanguage = newLanguages[0];
    }
    
    setFormData(prev => ({
      ...prev,
      languages: newLanguages,
      preferred_language: updatedPreferredLanguage,
    }));
  };

  // Update preferred language
  const handlePreferredLanguageChange = (languageId: string) => {
    setFormData(prev => ({
      ...prev,
      preferred_language: languageId,
    }));
    setIsDirty(true);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // This would be implemented in a real app with a profile update API call
      // await userAPI.updateProfile(formData);
      
      // Simulated success for now
      setTimeout(() => {
        setSuccessMessage('Profile updated successfully!');
        setIsLoading(false);
        setIsDirty(false);
      }, 1000);
    } catch (error) {
      setError('Failed to update profile. Please try again.');
      setIsLoading(false);
    }
  };

  // Available languages for selection
  const availableLanguages = [
    { id: 'tagalog', name: 'Tagalog' },
    { id: 'cebuano', name: 'Cebuano' },
    { id: 'ilocano', name: 'Ilocano' },
    { id: 'hiligaynon', name: 'Hiligaynon' },
    { id: 'waray', name: 'Waray' },
    { id: 'bicolano', name: 'Bicolano' },
    { id: 'kapampangan', name: 'Kapampangan' },
    { id: 'pangasinense', name: 'Pangasinense' },
    { id: 'english', name: 'English' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <User className="h-6 w-6 text-primary-500 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Manage your personal information and preferences
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4 animate-pulse">
                <div className="flex">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div className="ml-3">
                    <p className="text-sm text-green-800">{successMessage}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                  First name
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="First name"
                />
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Last name
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Last name"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language Proficiency
              </label>
              
              <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium">Select languages you are proficient in:</h3>
                  <span className="text-xs bg-gray-200 text-gray-700 rounded-full px-2 py-1">
                    {formData.languages.length} selected
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {availableLanguages.map((language) => (
                    <div key={language.id}>
                      <button
                        type="button"
                        onClick={() => handleLanguageToggle(language.id)}
                        className={`
                          w-full px-3 py-2 rounded-lg text-sm font-medium border transition-colors duration-200
                          ${
                            formData.languages.includes(language.id)
                              ? 'bg-primary-50 border-primary-300 text-primary-700'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }
                        `}
                      >
                        {language.name}
                        {formData.preferred_language === language.id && (
                          <span className="ml-1 text-xs bg-primary-100 text-primary-800 px-1.5 rounded-full">
                            Primary
                          </span>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
                
                {formData.languages.length > 1 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Set primary language:</h3>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {formData.languages.map((langId) => {
                        const language = availableLanguages.find(l => l.id === langId);
                        return (
                          <button
                            key={langId}
                            type="button"
                            onClick={() => handlePreferredLanguageChange(langId)}
                            className={`
                              px-3 py-2 rounded-lg text-xs font-medium border transition-colors duration-200
                              ${
                                formData.preferred_language === langId
                                  ? 'bg-primary-500 border-primary-500 text-white'
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                              }
                            `}
                          >
                            {language?.name}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      This will be your primary language for translation work
                    </p>
                  </div>
                )}
                
                <p className="mt-2 text-sm text-gray-500">
                  Click to select languages you're proficient in. You must select at least one.
                  {formData.languages.length === 1 && " Your selection will be set as your primary language."}
                </p>
              </div>
            </div>
            
            <div className="pt-4 flex justify-end border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 mr-3"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !isDirty}
                className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
