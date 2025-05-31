import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface GuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

const GuidelinesModal: React.FC<GuidelinesModalProps> = ({ isOpen, onClose, onAccept }) => {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  // Reset animation state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsAnimatingOut(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      onClose();
      setIsAnimatingOut(false);
    }, 200); // Match animation duration
  };

  const handleAccept = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      onAccept();
      setIsAnimatingOut(false);
    }, 200); // Match animation duration
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${
      isAnimatingOut ? 'animate-fade-out' : 'animate-fade-in'
    }`}>
      <div className={`bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto ${
        isAnimatingOut ? 'animate-scale-out' : 'animate-scale-in'
      }`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Annotation Guidelines</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110 hover:rotate-90 p-1 rounded-full hover:bg-gray-100"
            >
              <X size={24} />
            </button>
          </div>

          {/* Welcome Message */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center mb-2">
              <Info className="text-blue-600 mr-2" size={20} />
              <h3 className="text-lg font-semibold text-blue-900">Welcome to WiMarka Annotation Tool!</h3>
            </div>
            <p className="text-blue-800">
              Thank you for participating in our machine translation evaluation project. Please read these guidelines carefully before starting your annotation work.
            </p>
          </div>

          {/* Main Guidelines */}
          <div className="space-y-6">
            {/* Overview */}
            <section>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Overview</h3>
              <p className="text-gray-700 mb-3">
                You will be evaluating machine translations by comparing them to source texts and reference translations. 
                Your task is to identify errors, assess quality, and provide constructive feedback.
              </p>
            </section>

            {/* Quality Assessment */}
            <section>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Quality Assessment Criteria</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Fluency (1-5)</h4>
                  <p className="text-sm text-gray-600 mb-2">How natural and grammatically correct is the translation?</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>5 - Perfect fluency</li>
                    <li>4 - Minor fluency issues</li>
                    <li>3 - Some fluency problems</li>
                    <li>2 - Major fluency issues</li>
                    <li>1 - Very poor fluency</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Adequacy (1-5)</h4>
                  <p className="text-sm text-gray-600 mb-2">How well does the translation convey the source meaning?</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>5 - Perfect meaning preservation</li>
                    <li>4 - Minor meaning loss</li>
                    <li>3 - Some meaning preserved</li>
                    <li>2 - Little meaning preserved</li>
                    <li>1 - No meaning preserved</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Highlighting System */}
            <section>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Text Highlighting System</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-red-200 border border-red-400 rounded"></div>
                  <span className="font-medium">Error:</span>
                  <span className="text-gray-600">Mark grammatical errors, mistranslations, or incorrect terminology</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-yellow-200 border border-yellow-400 rounded"></div>
                  <span className="font-medium">Suggestion:</span>
                  <span className="text-gray-600">Highlight areas that could be improved or alternative translations</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-blue-200 border border-blue-400 rounded"></div>
                  <span className="font-medium">Note:</span>
                  <span className="text-gray-600">Mark interesting linguistic phenomena or provide additional context</span>
                </div>
              </div>
            </section>

            {/* Best Practices */}
            <section>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Best Practices</h3>
              <div className="grid gap-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={16} />
                  <span className="text-gray-700">Be objective and consistent in your evaluations</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={16} />
                  <span className="text-gray-700">Provide specific, constructive comments when highlighting text</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={16} />
                  <span className="text-gray-700">Consider cultural context and target audience when evaluating</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={16} />
                  <span className="text-gray-700">Focus on both accuracy and naturalness of the translation</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={16} />
                  <span className="text-gray-700">Take your time to carefully review each sentence pair</span>
                </div>
              </div>
            </section>

            {/* Important Notes */}
            <section>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="text-amber-600 mr-2" size={20} />
                  <h4 className="font-semibold text-amber-900">Important Notes</h4>
                </div>
                <ul className="text-amber-800 space-y-1 text-sm">
                  <li>• Each sentence can only be annotated once per user</li>
                  <li>• Your annotations contribute to important research on machine translation quality</li>
                  <li>• If you encounter technical issues, please contact the administrators</li>
                  <li>• You can access these guidelines anytime from the help menu</li>
                </ul>
              </div>
            </section>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-all duration-200 hover:scale-105 active:scale-95 rounded-md hover:bg-gray-50"
            >
              I'll read this later
            </button>
            <button
              onClick={handleAccept}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium hover:scale-105 active:scale-95 hover:shadow-md"
            >
              I understand, let's start annotating!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuidelinesModal; 