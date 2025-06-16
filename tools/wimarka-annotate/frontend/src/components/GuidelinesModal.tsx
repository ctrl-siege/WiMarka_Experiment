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
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Overview</h4>
              <p className="text-gray-600 mb-4">
                You will be evaluating machine-translated sentences by analyzing the quality of the translation compared to the source text. 
                Your task is to assess the quality of the translation and provide detailed feedback.
              </p>
            </section>

            {/* Text Highlighting */}
            <section>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Text Highlighting & Comments</h4>
              <div className="space-y-3">
                <p className="text-gray-600">
                  Select specific text portions to highlight and add comments about issues or observations:
                </p>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-4 h-4 bg-blue-200 border border-blue-400 rounded"></div>
                    <span className="text-sm font-medium text-blue-900">Highlight & Comment</span>
                  </div>
                  <p className="text-sm text-blue-800">
                    Select any problematic text and add a comment explaining the issue, your observation, or suggestion for improvement.
                  </p>
                </div>
              </div>
            </section>

            {/* Final Form */}
            <section>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Final Form Requirement</h4>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-800">
                  <strong>Required when you add annotations:</strong> After highlighting issues and adding comments, provide a corrected final form of the sentence. 
                  This should be your version of what the translation should be.
                </p>
              </div>
            </section>

            {/* Best Practices */}
            <section>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Best Practices</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">✅ Do:</h5>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>Read both sentences completely before rating</li>
                    <li>Consider context and domain-specific terminology</li>
                    <li>Highlight specific problematic words/phrases</li>
                    <li>Provide clear, constructive comments</li>
                    <li>Be consistent in your evaluation criteria</li>
                  </ul>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">❌ Don't:</h5>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>Rush through annotations</li>
                    <li>Let personal preferences affect scores</li>
                    <li>Ignore minor but important details</li>
                    <li>Give inconsistent ratings for similar issues</li>
                    <li>Leave vague or unhelpful comments</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Examples */}
            <section>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Example Evaluation</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Source:</span>
                    <p className="text-sm italic">"The student submitted his assignment before the deadline."</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Machine Translation:</span>
                    <p className="text-sm">"Ang estudyante <span className="bg-blue-200 px-1 rounded">nagsumite ng kanyang takdang-aralin</span> bago ang <span className="bg-blue-200 px-1 rounded">deadline</span>."</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Reference Text:</span>
                    <p className="text-sm">"Ipinasa ng mag-aaral ang kanyang gawain bago ang takdang oras."</p>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p><strong>Highlights & Comments:</strong></p>
                    <p>• "nagsumite ng kanyang takdang-aralin" → More natural: "ipinasa ang kanyang gawain"</p>
                    <p>• "deadline" → Better Tagalog term: "takdang oras"</p>
                    <p><strong>Final Form:</strong> "Ipinasa ng mag-aaral ang kanyang gawain bago ang takdang oras."</p>
                    <p><strong>Scores:</strong> Fluency: 3, Adequacy: 4, Overall: 3</p>
                  </div>
                </div>
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