import React from 'react';
import { QuizQuestionClient } from '../types';

interface QuizResultsViewProps {
  results: QuizQuestionClient[];
  topicName: string; // Will be exam name or mixed quiz subject name
  onRestart: () => void;
}

const QuizResultsView: React.FC<QuizResultsViewProps> = ({ results, topicName, onRestart }) => {
  const correctAnswersCount = results.filter(r => r.isCorrect).length;
  const totalQuestions = results.length;
  const scorePercentage = totalQuestions > 0 ? Math.round((correctAnswersCount / totalQuestions) * 100) : 0;

  let scoreColor = 'text-red-600';
  if (scorePercentage >= 70) {
    scoreColor = 'text-green-600';
  } else if (scorePercentage >= 40) {
    scoreColor = 'text-yellow-600';
  }
  
  const primaryButtonBaseClasses = "w-full text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 text-lg transition-all duration-200 ease-in-out transform hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.97] active:brightness-95 active:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-md disabled:transform-none disabled:brightness-100";
  const indigoButtonClasses = `${primaryButtonBaseClasses} bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500`;

  // Group results by konuAdi for detailed breakdown
  const resultsByTopic: { [key: string]: { correct: number, total: number, questions: QuizQuestionClient[] } } = {};
  let hasTopicData = false;
  results.forEach(q => {
    const topicKey = q.konuAdi || 'Bilinmeyen Konu/Ders';
    if (q.konuAdi) hasTopicData = true;
    if (!resultsByTopic[topicKey]) {
      resultsByTopic[topicKey] = { correct: 0, total: 0, questions: [] };
    }
    resultsByTopic[topicKey].total++;
    if (q.isCorrect) {
      resultsByTopic[topicKey].correct++;
    }
    resultsByTopic[topicKey].questions.push(q);
  });


  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl border border-slate-200/60 animate-fadeIn">
      <h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-5">
        {topicName} Sonuçları
      </h2>
      <div className="mb-8 p-6 bg-slate-50 rounded-lg text-center shadow-inner border border-slate-200/80">
        <p className="text-xl font-semibold text-slate-700">
          Toplam {totalQuestions} sorudan <span className="font-bold text-indigo-600">{correctAnswersCount}</span> tanesini doğru cevapladınız.
        </p>
        <p className={`text-4xl font-extrabold mt-2 ${scoreColor}`}>
          Genel Başarı Oranı: {scorePercentage}%
        </p>
      </div>

      {hasTopicData && Object.keys(resultsByTopic).length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-slate-700 mb-4 border-b pb-2">Konu/Ders Bazlı Performans</h3>
          <div className="space-y-4">
            {Object.entries(resultsByTopic).map(([topic, data]) => {
              const topicScorePercentage = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
              let topicScoreColor = 'bg-red-500';
              if (topicScorePercentage >= 70) topicScoreColor = 'bg-green-500';
              else if (topicScorePercentage >= 40) topicScoreColor = 'bg-yellow-500';
              
              return (
                <div key={topic} className="p-4 bg-slate-100/70 rounded-lg border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-semibold text-slate-800">{topic}</p>
                    <p className="text-sm font-medium text-slate-600">{data.correct} / {data.total} Doğru (%{topicScorePercentage})</p>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div className={`${topicScoreColor} h-2.5 rounded-full`} style={{ width: `${topicScorePercentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <h3 className="text-xl font-semibold text-slate-700 mb-4 mt-8 border-b pb-2">Detaylı Sonuçlar</h3>
      <div className="space-y-6">
        {results.map((question, index) => (
          <div 
            key={question.id} 
            className={`p-4 rounded-lg border-2 ${question.isCorrect ? 'border-green-400 bg-green-50/60' : 'border-red-400 bg-red-50/60'} shadow-sm`}
          >
            <p className="font-semibold text-slate-800 mb-1 text-md">
              <span className={`mr-2 font-bold ${question.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                {question.isCorrect ? '✓' : '✘'}
              </span>
              Soru {index + 1}: {question.soru}
              {question.konuAdi && <span className="text-xs text-slate-500 ml-2 block sm:inline">({question.konuAdi})</span>}
            </p>
            <div className="space-y-1.5 text-sm pl-6">
              {Object.entries(question.secenekler).map(([key, value]) => (
                <p 
                  key={key} 
                  className={`
                    ${key === question.dogruCevap ? 'text-green-700 font-medium' : 'text-slate-600'}
                    ${key === question.userChoice && !question.isCorrect ? 'text-red-700 line-through' : ''}
                  `}
                >
                  <span className="font-mono mr-1.5">{key}.</span> {value}
                  {key === question.userChoice && key !== question.dogruCevap && <span className="ml-2 text-xs text-red-600 font-normal">(Sizin Cevabınız)</span>}
                  {key === question.dogruCevap && key === question.userChoice && <span className="ml-2 text-xs text-green-600 font-normal">(Doğru Cevap)</span>}
                   {key === question.dogruCevap && key !== question.userChoice && <span className="ml-2 text-xs text-green-700 font-normal">(Doğru Cevap)</span>}
                </p>
              ))}
            </div>
            
            <div className="mt-3 p-3 bg-slate-100/70 rounded text-sm text-slate-700 border border-slate-200 leading-relaxed">
              <p className="font-semibold text-slate-800 mb-1">Açıklama:</p>
              <p>{question.aciklama}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onRestart}
        className={`${indigoButtonClasses} mt-10`}
      >
        Ana Menüye Dön
      </button>
    </div>
  );
};

export default QuizResultsView;