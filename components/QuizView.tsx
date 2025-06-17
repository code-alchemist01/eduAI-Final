import React, { useState, useEffect } from 'react';
import { QuizQuestionClient } from '../types';

interface QuizViewProps {
  questions: QuizQuestionClient[];
  onSubmitQuiz: (answers: QuizQuestionClient[]) => void;
  topicName?: string; // Made optional, will display a generic title if not provided for mixed/exam quizzes
}

const QuizView: React.FC<QuizViewProps> = ({ questions, onSubmitQuiz, topicName = "Test" }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<QuizQuestionClient[]>(questions.map(q => ({...q, userChoice: null, isCorrect: null})));
  const [questionContainerKey, setQuestionContainerKey] = useState(0); // For animation reset

  useEffect(() => {
    setSelectedAnswers(questions.map(q => ({...q, userChoice: null, isCorrect: null})));
    setCurrentQuestionIndex(0);
    setQuestionContainerKey(prev => prev + 1); // Reset animation key
  }, [questions]);

  const handleOptionSelect = (optionKey: string) => {
    const updatedAnswers = [...selectedAnswers];
    updatedAnswers[currentQuestionIndex].userChoice = optionKey;
    setSelectedAnswers(updatedAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setQuestionContainerKey(prev => prev + 1); // Trigger animation for next question
    } else {
      const finalAnswers = selectedAnswers.map(answer => ({
        ...answer,
        isCorrect: answer.userChoice === answer.dogruCevap
      }));
      onSubmitQuiz(finalAnswers);
    }
  };

  const currentQuestion = selectedAnswers[currentQuestionIndex];

  if (!currentQuestion) {
    return <div className="text-center p-6 text-slate-600">Test yüklenemedi veya soru bulunamadı.</div>;
  }

  const optionKeys = Object.keys(currentQuestion.secenekler);

  const primaryButtonBaseClasses = "w-full text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 text-lg transition-all duration-200 ease-in-out transform hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.97] active:brightness-95 active:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-md disabled:transform-none disabled:brightness-100";
  const indigoButtonClasses = `${primaryButtonBaseClasses} bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500`;
  
  const getOptionButtonClasses = (key: string) => {
    let base = "w-full text-left p-3.5 rounded-lg border-2 transition-all duration-150 ease-in-out transform hover:scale-[1.01] shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1";
    if (currentQuestion.userChoice === key) {
      return `${base} bg-indigo-500 border-indigo-600 text-white ring-indigo-400 font-medium shadow-indigo-200/50`;
    }
    return `${base} bg-white border-slate-300 hover:bg-indigo-50 hover:border-indigo-400 text-slate-700 focus:ring-indigo-300`;
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl border border-slate-200/60 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-5 sm:mb-6 space-y-2 sm:space-y-0">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
          {topicName}
        </h2>
        <span className="text-xs sm:text-sm font-semibold text-indigo-700 bg-indigo-100 px-3.5 py-1.5 rounded-full shadow-sm border border-indigo-200">
          Soru {currentQuestionIndex + 1} / {questions.length}
        </span>
      </div>
      
      <div key={questionContainerKey} className="mb-6 mt-2 p-5 border border-indigo-200 rounded-lg bg-indigo-50/40 shadow-inner animate-fadeIn">
        <p className="text-lg font-medium text-slate-800 leading-relaxed">{currentQuestion.soru}</p>
      </div>

      <div className="space-y-3.5">
        {optionKeys.map((key) => (
          <button
            key={key}
            onClick={() => handleOptionSelect(key)}
            className={getOptionButtonClasses(key)}
            aria-pressed={currentQuestion.userChoice === key}
          >
            <span className="font-semibold mr-2.5">{key}.</span> {currentQuestion.secenekler[key]}
            {currentQuestion.userChoice === key && (
                <span className="ml-2 float-right transition-opacity duration-300 opacity-100">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                </span>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={handleNextQuestion}
        disabled={!currentQuestion.userChoice}
        className={`${indigoButtonClasses} mt-8`}
      >
        {currentQuestionIndex < questions.length - 1 ? 'Sonraki Soru →' : 'Testi Bitir ve Sonuçları Gör'}
      </button>
    </div>
  );
};

export default QuizView;