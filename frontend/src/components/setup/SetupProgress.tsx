import React from 'react';

interface SetupProgressProps {
  currentStep: number;
  totalSteps: number;
}

export default function SetupProgress({ currentStep, totalSteps }: SetupProgressProps) {
  const progress = (currentStep / totalSteps) * 100;
  
  return (
    <div className="mb-12">
      <h1 className="text-3xl font-bold mb-4">Set up your project</h1>
      <div className="relative">
        <div className="w-full bg-gray-700 h-2 rounded-full">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-gray-400 mt-2">Step {currentStep} of {totalSteps}</p>
      </div>
    </div>
  );
}