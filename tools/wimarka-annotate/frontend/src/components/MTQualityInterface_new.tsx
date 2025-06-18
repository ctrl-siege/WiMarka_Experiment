import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Brain, 
  Star, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Zap,
  Save,
  RotateCcw
} from 'lucide-react';
import { mtQualityAPI } from '../services/api';
import type { Sentence, MTQualityAssessment, MTQualityCreate } from '../types';

interface ErrorDisplayProps {
  errors: Array<{
    error_type: string;
    severity: 'minor' | 'major' | 'critical';
    start_position: number;
    end_position: number;
    text_span: string;
    description: string;
    suggested_fix?: string;
  }>;
  title: string;
  icon: React.ReactNode;
  colorClass: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ errors, title, icon, colorClass }) => {
  if (errors.length === 0) return null;
  
  return (
    <div className={`border rounded-lg p-4 ${colorClass}`}>
      <div className="flex items-center mb-3">
        {icon}
        <h4 className="font-medium ml-2">{title} ({errors.length})</h4>
      </div>
      <div className="space-y-2">
        {errors.map((error, index) => (
          <div key={index} className="text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">"{error.text_span}"</span>
              <span className={`px-2 py-1 rounded text-xs ${
                error.severity === 'critical' ? 'bg-red-100 text-red-800' :
                error.severity === 'major' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {error.severity}
              </span>
            </div>
            <p className="text-gray-600 mb-1">{error.description}</p>
            {error.suggested_fix && (
              <p className="text-green-600 italic">💡 {error.suggested_fix}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const ScoreDisplay: React.FC<{ 
  label: string; 
  score: number; 
  description: string;
  color: string;
}> = ({ label, score, description, color }) => (
  <div className={`text-center p-4 rounded-lg border-2 ${color}`}>
    <div className="text-2xl font-bold mb-1">{score.toFixed(1)}/5.0</div>
    <div className="text-sm font-medium mb-1">{label}</div>
    <div className="text-xs text-gray-600">{description}</div>
  </div>
);

const MTQualityInterface: React.FC = () => {
  const { sentenceId } = useParams<{ sentenceId: string }>();
  const navigate = useNavigate();
  
  const [sentence, setSentence] = useState<Sentence | null>(null);
  const [assessment, setAssessment] = useState<MTQualityAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssessing, setIsAssessing] = useState(false);
  const [message, setMessage] = useState('');
  const [startTime] = useState(new Date());
  
  // Human feedback state
  const [humanFeedback, setHumanFeedback] = useState('');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [overrideScores, setOverrideScores] = useState({
    fluency: null as number | null,
    adequacy: null as number | null,
    overall: null as number | null
  });

  const loadSentence = useCallback(async () => {
    if (!sentenceId) return;
    
    setIsLoading(true);
    try {
      // Get pending sentences and find the one we need
      const pendingSentences = await mtQualityAPI.getPendingAssessments(0, 100);
      const targetSentence = pendingSentences.find(s => s.id === parseInt(sentenceId));
      
      if (targetSentence) {
        setSentence(targetSentence);
        
        // Check if already assessed
        const existingAssessment = await mtQualityAPI.getAssessmentBySentence(targetSentence.id);
        if (existingAssessment) {
          setAssessment(existingAssessment);
          setHumanFeedback(existingAssessment.human_feedback || '');
          setCorrectionNotes(existingAssessment.correction_notes || '');
        }
      } else {
        setMessage('Sentence not found or already assessed');
        navigate('/evaluator');
      }
    } catch (error) {
      console.error('Error loading sentence:', error);
      setMessage('Error loading sentence');
    } finally {
      setIsLoading(false);
    }
  }, [sentenceId, navigate]);

  const loadNextSentence = useCallback(async () => {
    setIsLoading(true);
    try {
      const pendingSentences = await mtQualityAPI.getPendingAssessments(0, 1);
      if (pendingSentences.length > 0) {
        const nextSentence = pendingSentences[0];
        setSentence(nextSentence);
        setAssessment(null);
        setHumanFeedback('');
        setCorrectionNotes('');
        setOverrideScores({ fluency: null, adequacy: null, overall: null });
      } else {
        setMessage('No pending sentences to assess');
        navigate('/evaluator');
      }
    } catch (error) {
      console.error('Error loading next sentence:', error);
      setMessage('Error loading sentence');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (sentenceId) {
      loadSentence();
    } else {
      loadNextSentence();
    }
  }, [sentenceId, loadSentence, loadNextSentence]);

  const handleAssess = async () => {
    if (!sentence) return;

    setIsAssessing(true);
    try {
      const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
      
      const assessmentData: MTQualityCreate = {
        sentence_id: sentence.id,
        fluency_score: overrideScores.fluency || undefined,
        adequacy_score: overrideScores.adequacy || undefined,
        overall_quality_score: overrideScores.overall || undefined,
        human_feedback: humanFeedback || undefined,
        correction_notes: correctionNotes || undefined,
        time_spent_seconds: timeSpent
      };

      const result = await mtQualityAPI.createAssessment(assessmentData);
      setAssessment(result);
      setMessage('Assessment completed successfully! ✨');
      
      // Auto-navigate to next after delay
      setTimeout(() => {
        navigate('/evaluator');
      }, 2000);
      
    } catch (error) {
      console.error('Error creating assessment:', error);
      setMessage('Error creating assessment. Please try again.');
    } finally {
      setIsAssessing(false);
    }
  };

  const handleUpdateAssessment = async () => {
    if (!assessment) return;

    setIsAssessing(true);
    try {
      const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
      
      const updateData = {
        fluency_score: overrideScores.fluency || undefined,
        adequacy_score: overrideScores.adequacy || undefined,
        overall_quality_score: overrideScores.overall || undefined,
        human_feedback: humanFeedback,
        correction_notes: correctionNotes,
        time_spent_seconds: (assessment.time_spent_seconds || 0) + timeSpent
      };

      const result = await mtQualityAPI.updateAssessment(assessment.id, updateData);
      setAssessment(result);
      setMessage('Assessment updated successfully! ✨');
      
    } catch (error) {
      console.error('Error updating assessment:', error);
      setMessage('Error updating assessment. Please try again.');
    } finally {
      setIsAssessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading MT Quality Assessment...</p>
        </div>
      </div>
    );
  }

  if (!sentence) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No sentence to assess</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/evaluator')}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center space-x-3 mb-2">
            <Brain className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">MT Quality Assessment</h1>
          </div>
          <p className="text-gray-600">
            DistilBERT-powered machine translation quality evaluation
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('Error') 
              ? 'bg-red-50 text-red-800 border border-red-200' 
              : 'bg-green-50 text-green-800 border border-green-200'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Texts and Context */}
          <div className="space-y-6">
            {/* Sentence Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Translation Pair</h2>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {sentence.source_language} → {sentence.target_language}
                  </span>
                  {sentence.domain && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {sentence.domain}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Source Text ({sentence.source_language})</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-900 leading-relaxed">{sentence.source_text}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Machine Translation ({sentence.target_language})</h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-900 leading-relaxed">{sentence.machine_translation}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Human Feedback Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Human Feedback</h2>
              
              <div className="space-y-4">
                {/* Score Overrides */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Override AI Scores (optional)
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Fluency</label>
                      <select
                        value={overrideScores.fluency || ''}
                        onChange={(e) => setOverrideScores(prev => ({ ...prev, fluency: e.target.value ? parseFloat(e.target.value) : null }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">AI Score</option>
                        <option value="1">1.0</option>
                        <option value="2">2.0</option>
                        <option value="3">3.0</option>
                        <option value="4">4.0</option>
                        <option value="5">5.0</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Adequacy</label>
                      <select
                        value={overrideScores.adequacy || ''}
                        onChange={(e) => setOverrideScores(prev => ({ ...prev, adequacy: e.target.value ? parseFloat(e.target.value) : null }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">AI Score</option>
                        <option value="1">1.0</option>
                        <option value="2">2.0</option>
                        <option value="3">3.0</option>
                        <option value="4">4.0</option>
                        <option value="5">5.0</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Overall</label>
                      <select
                        value={overrideScores.overall || ''}
                        onChange={(e) => setOverrideScores(prev => ({ ...prev, overall: e.target.value ? parseFloat(e.target.value) : null }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">AI Score</option>
                        <option value="1">1.0</option>
                        <option value="2">2.0</option>
                        <option value="3">3.0</option>
                        <option value="4">4.0</option>
                        <option value="5">5.0</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Feedback
                  </label>
                  <textarea
                    value={humanFeedback}
                    onChange={(e) => setHumanFeedback(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Share your thoughts on the AI assessment or translation quality..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correction Notes
                  </label>
                  <textarea
                    value={correctionNotes}
                    onChange={(e) => setCorrectionNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Suggest specific corrections or improvements..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: AI Assessment Results */}
          <div className="space-y-6">
            {/* AI Assessment Action */}
            {!assessment && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                <Brain className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Ready for Assessment</h2>
                <p className="text-gray-600 mb-6">
                  Click below to run DistilBERT-powered quality analysis
                </p>
                <button
                  onClick={handleAssess}
                  disabled={isAssessing}
                  className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium mx-auto"
                >
                  {isAssessing ? (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Run AI Assessment
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Assessment Results */}
            {assessment && (
              <>
                {/* Quality Scores */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Quality Scores</h2>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      {assessment.processing_time_ms}ms
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <ScoreDisplay
                      label="Fluency"
                      score={assessment.fluency_score}
                      description="Grammar & readability"
                      color="border-blue-200 bg-blue-50"
                    />
                    <ScoreDisplay
                      label="Adequacy"
                      score={assessment.adequacy_score}
                      description="Meaning preservation"
                      color="border-green-200 bg-green-50"
                    />
                    <ScoreDisplay
                      label="Overall"
                      score={assessment.overall_quality_score}
                      description="Combined quality"
                      color="border-purple-200 bg-purple-50"
                    />
                  </div>

                  <div className="flex items-center justify-center p-3 bg-gray-50 rounded-lg">
                    <Star className="h-5 w-5 text-yellow-500 mr-2" />
                    <span className="text-sm font-medium">
                      Model Confidence: {Math.round(assessment.model_confidence * 100)}%
                    </span>
                  </div>
                </div>

                {/* Error Analysis */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Error Analysis</h2>
                  
                  <div className="space-y-4">
                    <ErrorDisplay
                      errors={assessment.syntax_errors}
                      title="Syntax Errors"
                      icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
                      colorClass="border-orange-200 bg-orange-50"
                    />
                    
                    <ErrorDisplay
                      errors={assessment.semantic_errors}
                      title="Semantic Errors"
                      icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
                      colorClass="border-red-200 bg-red-50"
                    />

                    {assessment.syntax_errors.length === 0 && assessment.semantic_errors.length === 0 && (
                      <div className="text-center p-6 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-green-800 font-medium">No errors detected!</p>
                        <p className="text-green-600 text-sm">The translation appears to be of good quality.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quality Explanation */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Explanation</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    {assessment.quality_explanation}
                  </p>
                  
                  {assessment.correction_suggestions.length > 0 && (
                    <>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Suggestions</h3>
                      <ul className="space-y-1">
                        {assessment.correction_suggestions.map((suggestion, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>

                {/* Update Assessment Button */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <button
                    onClick={handleUpdateAssessment}
                    disabled={isAssessing}
                    className="w-full flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {isAssessing ? (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Update Assessment
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MTQualityInterface;
