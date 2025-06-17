
import React, { useState, useEffect, useCallback } from 'react';
import { CURRICULUM_DATA } from './constants';
import { Grade, Subject, Topic, QuizQuestionClient, GeneratedQuizQuestion, AppState } from './types';
// Selector component is removed
import SkeletonLoader from './components/SkeletonLoader';
import ErrorMessage from './components/ErrorMessage';
import ExplanationDisplay from './components/ExplanationDisplay';
import QuizView from './components/QuizView';
import QuizResultsView from './components/QuizResultsView';
import { getTopicExplanation, getTestQuestions, generateMixedTopicQuiz, generateExamQuiz } from './services/geminiService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.SELECTING);
  const [error, setError] = useState<string | null>(null);

  // Regular topic selection states
  const [currentSelectionView, setCurrentSelectionView] = useState<'grades' | 'subjects' | 'topics'>('grades');
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);

  // Mixed quiz configuration states
  const [mixedQuizConfigStep, setMixedQuizConfigStep] = useState<'grade' | 'subject' | 'topics_count'>('grade');
  const [mixedQuizSelectedGradeId, setMixedQuizSelectedGradeId] = useState<string | null>(null);
  const [mixedQuizSelectedSubjectId, setMixedQuizSelectedSubjectId] = useState<string | null>(null);
  const [mixedQuizAvailableSubjects, setMixedQuizAvailableSubjects] = useState<Subject[]>([]);
  const [mixedQuizAvailableTopics, setMixedQuizAvailableTopics] = useState<Topic[]>([]);
  const [mixedQuizSelectedTopicIds, setMixedQuizSelectedTopicIds] = useState<string[]>([]); // Can be "ALL" conceptually, but string[] for multi-select
  const [mixedQuizIsAllTopics, setMixedQuizIsAllTopics] = useState<boolean>(true);
  const [mixedQuizQuestionCount, setMixedQuizQuestionCount] = useState<number>(10);

  // Exam quiz configuration states
  const [selectedExamType, setSelectedExamType] = useState<'TYT' | 'AYT' | 'LGS' | null>(null);
  const [examQuizQuestionCount, setExamQuizQuestionCount] = useState<number>(20);


  // Content states
  const [explanationContent, setExplanationContent] = useState<string>('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionClient[]>([]);
  const [quizResults, setQuizResults] = useState<QuizQuestionClient[]>([]);
  
  const [isContentVisible, setIsContentVisible] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  const gradeOptions = CURRICULUM_DATA.map(g => ({ id: g.id, name: g.name }));
  const questionCountOptions = [5, 10, 15, 20, 25, 30, 40]; // For mixed and exam quizzes
  const mixedQuizQuestionCountOptions = questionCountOptions.filter(count => count <= 20);


  const switchContentWithTransition = (newAppState: AppState, action?: () => void) => {
    setIsContentVisible(false);
    setIsBusy(true); 
    setTimeout(() => {
      if (action) action();
      setAppState(newAppState);
      setIsContentVisible(true);
      setIsBusy(newAppState === AppState.LOADING_CONTENT); 
    }, 250); 
  };

  const resetToSelection = useCallback(() => {
    switchContentWithTransition(AppState.SELECTING, () => {
      setSelectedGradeId(null);
      setSelectedSubjectId(null);
      setSelectedTopicId(null);
      setAvailableSubjects([]);
      setAvailableTopics([]);
      setCurrentSelectionView('grades');

      setMixedQuizSelectedGradeId(null);
      setMixedQuizSelectedSubjectId(null);
      setMixedQuizAvailableSubjects([]);
      setMixedQuizAvailableTopics([]);
      setMixedQuizSelectedTopicIds([]);
      setMixedQuizIsAllTopics(true);
      setMixedQuizQuestionCount(10);
      setMixedQuizConfigStep('grade');

      setSelectedExamType(null);
      setExamQuizQuestionCount(20);

      setExplanationContent('');
      setQuizQuestions([]);
      setQuizResults([]);
      setError(null);
    });
  }, []);

  const handleStartLearning = useCallback(async () => {
    if (!selectedGradeId || !selectedSubjectId || !selectedTopicId) {
      setError("Lütfen tüm seçimleri yapınız.");
      switchContentWithTransition(AppState.ERROR);
      return;
    }
    setError(null);
    switchContentWithTransition(AppState.LOADING_CONTENT);
    try {
      const gradeName = CURRICULUM_DATA.find(g => g.id === selectedGradeId)?.name || '';
      const subjectName = availableSubjects.find(s => s.id === selectedSubjectId)?.name || '';
      const topicName = availableTopics.find(t => t.id === selectedTopicId)?.name || '';
      if (!process.env.API_KEY) throw new Error("API Anahtarı (API_KEY) ortam değişkeni ayarlanmamış.");
      const [explanation, questionsData] = await Promise.all([
        getTopicExplanation(gradeName, subjectName, topicName),
        getTestQuestions(gradeName, subjectName, topicName)
      ]);
      setExplanationContent(explanation);
      const clientQuestions = questionsData.map((q, index) => ({
        ...q, id: `${selectedTopicId}-q-${index}`, userChoice: null, isCorrect: null,
      }));
      setQuizQuestions(clientQuestions);
      switchContentWithTransition(AppState.SHOWING_EXPLANATION);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.");
      switchContentWithTransition(AppState.ERROR);
    }
  }, [selectedGradeId, selectedSubjectId, selectedTopicId, availableSubjects, availableTopics]);
  
  useEffect(() => {
    if (selectedTopicId && currentSelectionView === 'topics' && appState === AppState.SELECTING && !isBusy) {
        handleStartLearning();
    }
  }, [selectedTopicId, currentSelectionView, appState, handleStartLearning, isBusy]);

  // Regular topic selection handlers
  const handleGradeSelect = (gradeId: string) => {
    setIsContentVisible(false);
    setTimeout(() => {
      setSelectedGradeId(gradeId);
      const grade = CURRICULUM_DATA.find(g => g.id === gradeId);
      setAvailableSubjects(grade ? grade.subjects : []);
      setSelectedSubjectId(null); setAvailableTopics([]); setSelectedTopicId(null);
      setCurrentSelectionView('subjects');
      setIsContentVisible(true);
    }, 150);
  };
  const handleSubjectSelect = (subjectId: string) => {
    setIsContentVisible(false);
    setTimeout(() => {
      setSelectedSubjectId(subjectId);
      const subject = availableSubjects.find(s => s.id === subjectId);
      setAvailableTopics(subject ? subject.topics : []);
      setSelectedTopicId(null);
      setCurrentSelectionView('topics');
      setIsContentVisible(true);
    }, 150);
  };
  const handleTopicSelect = (topicId: string) => setSelectedTopicId(topicId);
  const handleBackToGradeSelection = () => {
    setIsContentVisible(false);
    setTimeout(() => {
      setSelectedGradeId(null); setAvailableSubjects([]); setSelectedSubjectId(null); setAvailableTopics([]); setSelectedTopicId(null);
      setCurrentSelectionView('grades');
      setIsContentVisible(true);
    }, 150);
  };
  const handleBackToSubjectSelection = () => {
    setIsContentVisible(false);
    setTimeout(() => {
      setSelectedSubjectId(null); setAvailableTopics([]); setSelectedTopicId(null);
      setCurrentSelectionView('subjects');
      setIsContentVisible(true);
    }, 150);
  };

  // Mixed Quiz handlers
  const handleMixedQuizGradeSelect = (gradeId: string) => {
    setMixedQuizSelectedGradeId(gradeId);
    const grade = CURRICULUM_DATA.find(g => g.id === gradeId);
    setMixedQuizAvailableSubjects(grade ? grade.subjects : []);
    setMixedQuizSelectedSubjectId(null); setMixedQuizAvailableTopics([]); setMixedQuizSelectedTopicIds([]); setMixedQuizIsAllTopics(true);
    setMixedQuizConfigStep('subject');
  };
  const handleMixedQuizSubjectSelect = (subjectId: string) => {
    setMixedQuizSelectedSubjectId(subjectId);
    const subject = mixedQuizAvailableSubjects.find(s => s.id === subjectId);
    setMixedQuizAvailableTopics(subject ? subject.topics : []);
    setMixedQuizSelectedTopicIds([]); setMixedQuizIsAllTopics(true);
    setMixedQuizConfigStep('topics_count');
  };
  const handleMixedQuizTopicToggle = (topicId: string) => {
    setMixedQuizSelectedTopicIds(prev =>
      prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]
    );
    setMixedQuizIsAllTopics(false);
  };
  const handleMixedQuizAllTopicsToggle = () => {
    setMixedQuizIsAllTopics(prev => {
      if (!prev) setMixedQuizSelectedTopicIds([]); // Clear specific selections if "All" is chosen
      return !prev;
    });
  };
  const handleStartMixedQuiz = async () => {
    if (!mixedQuizSelectedGradeId || !mixedQuizSelectedSubjectId || (!mixedQuizIsAllTopics && mixedQuizSelectedTopicIds.length === 0)) {
      setError("Karışık test için lütfen sınıf, ders ve en az bir konu seçin veya 'Tüm Konular'ı işaretleyin.");
      return;
    }
    setError(null);
    switchContentWithTransition(AppState.LOADING_CONTENT);
    try {
      const gradeName = CURRICULUM_DATA.find(g => g.id === mixedQuizSelectedGradeId)?.name || '';
      const subjectName = mixedQuizAvailableSubjects.find(s => s.id === mixedQuizSelectedSubjectId)?.name || '';
      const topicsToSend = mixedQuizIsAllTopics ? "ALL" : mixedQuizAvailableTopics.filter(t => mixedQuizSelectedTopicIds.includes(t.id)).map(t => t.name);
      
      if (!process.env.API_KEY) throw new Error("API Anahtarı (API_KEY) ortam değişkeni ayarlanmamış.");
      const questionsData = await generateMixedTopicQuiz(gradeName, subjectName, topicsToSend, mixedQuizQuestionCount);
      const clientQuestions = questionsData.map((q, index) => ({
        ...q, id: `mixed-${mixedQuizSelectedSubjectId}-q-${index}`, userChoice: null, isCorrect: null,
      }));
      setQuizQuestions(clientQuestions);
      setAppState(AppState.SHOWING_QUIZ); // Direct state set as transition is handled
      setIsContentVisible(true); // Ensure content is visible
      setIsBusy(false); // Not loading anymore
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Karışık test oluşturulurken bir hata oluştu.");
      switchContentWithTransition(AppState.ERROR);
    }
  };

  // Exam Quiz handlers
  const handleExamTypeSelect = (examType: 'TYT' | 'AYT' | 'LGS') => {
    setSelectedExamType(examType);
    switchContentWithTransition(AppState.CONFIGURING_EXAM_QUIZ);
  };
  const handleStartExamQuiz = async () => {
    if (!selectedExamType) {
      setError("Lütfen bir sınav türü seçin.");
      return;
    }
    setError(null);
    switchContentWithTransition(AppState.LOADING_CONTENT);
    try {
      if (!process.env.API_KEY) throw new Error("API Anahtarı (API_KEY) ortam değişkeni ayarlanmamış.");
      const questionsData = await generateExamQuiz(selectedExamType, examQuizQuestionCount);
      const clientQuestions = questionsData.map((q, index) => ({
        ...q, id: `${selectedExamType}-q-${index}`, userChoice: null, isCorrect: null,
      }));
      setQuizQuestions(clientQuestions);
      setAppState(AppState.SHOWING_QUIZ);
      setIsContentVisible(true);
      setIsBusy(false);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : `${selectedExamType} deneme sınavı oluşturulurken bir hata oluştu.`);
      switchContentWithTransition(AppState.ERROR);
    }
  };

  const handleSubmitQuiz = (answers: QuizQuestionClient[]) => {
    switchContentWithTransition(AppState.SHOWING_RESULTS, () => setQuizResults(answers));
  };
  
  const handleRetryLogic = () => {
    setError(null);
    if (appState === AppState.ERROR) { // Check current appState for retry context
      if (selectedTopicId && !selectedExamType && !mixedQuizSelectedSubjectId) { // Regular topic quiz error
        handleStartLearning();
      } else if (mixedQuizSelectedSubjectId) { // Mixed topic quiz error
        handleStartMixedQuiz();
      } else if (selectedExamType) { // Exam quiz error
        handleStartExamQuiz();
      } else {
        resetToSelection();
      }
    } else {
      resetToSelection();
    }
  };
  
  const selectedGradeName = CURRICULUM_DATA.find(g => g.id === selectedGradeId)?.name || "";
  const selectedSubjectName = availableSubjects.find(s => s.id === selectedSubjectId)?.name || "";
  const selectedTopicName = availableTopics.find(t => t.id === selectedTopicId)?.name || "";
  
  const mixedQuizGradeName = CURRICULUM_DATA.find(g => g.id === mixedQuizSelectedGradeId)?.name || "";
  const mixedQuizSubjectName = mixedQuizAvailableSubjects.find(s => s.id === mixedQuizSelectedSubjectId)?.name || "";


  const primaryButtonBaseClasses = "w-full text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 text-lg transition-all duration-200 ease-in-out transform hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.97] active:brightness-95 active:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-md disabled:transform-none disabled:brightness-100";
  const indigoButtonClasses = `${primaryButtonBaseClasses} bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500`;
  const greenButtonClasses = `${primaryButtonBaseClasses} bg-green-600 hover:bg-green-700 focus:ring-green-500`;
  const tealButtonClasses = `${primaryButtonBaseClasses} bg-teal-600 hover:bg-teal-700 focus:ring-teal-500`;
  const skyButtonClasses = `${primaryButtonBaseClasses} bg-sky-600 hover:bg-sky-700 focus:ring-sky-500`;
  const secondaryButtonClasses = `${primaryButtonBaseClasses} bg-slate-600 hover:bg-slate-700 focus:ring-slate-500`;
  const backButtonClasses = "text-indigo-600 hover:text-indigo-800 font-medium transition-colors duration-150 py-2 px-4 rounded-md hover:bg-indigo-50 text-sm inline-flex items-center";
  const selectionButtonClasses = "w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-medium py-3.5 px-5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-lg";
  const specialTestButtonClasses = "w-full text-white font-semibold py-3.5 px-5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-offset-2 text-base";


  const renderSelectionContent = () => {
    if (currentSelectionView === 'grades') {
      return (
        <>
          <div className="mb-6 grid grid-cols-1 gap-3">
            <button onClick={() => switchContentWithTransition(AppState.CONFIGURING_MIXED_QUIZ)} className={`${specialTestButtonClasses} bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 focus:ring-teal-400`}>Karışık Tekrar Testi</button>
          </div>
          <hr className="my-6 border-slate-300/70" />
          <h2 className="text-2xl font-semibold text-slate-700 mb-5 text-center">Konu Seçerek İlerleyin: Sınıfınızı Seçin</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {gradeOptions.map(grade => (
              <button key={grade.id} onClick={() => handleGradeSelect(grade.id)} className={selectionButtonClasses} disabled={isBusy} aria-label={`${grade.name} seç`}>
                {grade.name}
              </button>
            ))}
          </div>
        </>
      );
    }
    if (currentSelectionView === 'subjects') { /* ... same as before ... */ 
        return (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-700">Ders Seçin <span className="text-base font-normal text-indigo-600">({selectedGradeName})</span></h2>
            <button onClick={handleBackToGradeSelection} className={backButtonClasses} aria-label="Sınıf seçimine geri dön">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Geri
            </button>
          </div>
          {availableSubjects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {availableSubjects.map(subject => (
                <button key={subject.id} onClick={() => handleSubjectSelect(subject.id)} className={selectionButtonClasses} disabled={isBusy} aria-label={`${subject.name} dersini seç`}>
                  {subject.name}
                </button>
              ))}
            </div>
          ) : <p className="text-slate-500 text-center py-4">Bu sınıf için ders bulunamadı.</p>}
        </>
      );
    }
    if (currentSelectionView === 'topics') { /* ... same as before ... */ 
        return (
        <>
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl sm:text-2xl font-semibold text-slate-700">Konu Seçin <span className="text-base font-normal text-indigo-600">({selectedSubjectName})</span></h2>
            <button onClick={handleBackToSubjectSelection} className={backButtonClasses} aria-label="Ders seçimine geri dön">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Geri
            </button>
          </div>
          {availableTopics.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 -mr-2">
              {availableTopics.map(topic => (
                <button key={topic.id} onClick={() => handleTopicSelect(topic.id)} className={`${selectionButtonClasses} py-3`} disabled={isBusy} aria-label={`${topic.name} konusunu seç`}>
                  {topic.name}
                </button>
              ))}
            </div>
          ) : <p className="text-slate-500 text-center py-4">Bu ders için konu bulunamadı.</p>}
        </>
      );
    }
    return null;
  };

  const renderMixedQuizConfig = () => {
    return (
        <div className="animate-fadeIn space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-slate-700">Karışık Tekrar Testi Ayarları</h2>
                <button onClick={resetToSelection} className={backButtonClasses} aria-label="Ana menüye geri dön">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    Geri
                </button>
            </div>

            {/* Step 1: Grade Selection */}
            {mixedQuizConfigStep === 'grade' && (
                <div className="space-y-3">
                    <h3 className="text-lg font-medium text-slate-600">1. Adım: Sınıf Seçin</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {gradeOptions.map(grade => (
                            <button key={grade.id} onClick={() => handleMixedQuizGradeSelect(grade.id)} className={selectionButtonClasses}>
                                {grade.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 2: Subject Selection */}
            {mixedQuizConfigStep === 'subject' && mixedQuizSelectedGradeId && (
                <div className="space-y-3">
                     <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-medium text-slate-600">2. Adım: Ders Seçin ({mixedQuizGradeName})</h3>
                        <button onClick={() => setMixedQuizConfigStep('grade')} className={backButtonClasses}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                            Sınıf Seçimine Geri Dön
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {mixedQuizAvailableSubjects.map(subject => (
                            <button key={subject.id} onClick={() => handleMixedQuizSubjectSelect(subject.id)} className={selectionButtonClasses}>
                                {subject.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 3: Topic and Question Count Selection */}
            {mixedQuizConfigStep === 'topics_count' && mixedQuizSelectedSubjectId && (
                <div className="space-y-5">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-medium text-slate-600">3. Adım: Konu ve Soru Sayısı ({mixedQuizSubjectName})</h3>
                        <button onClick={() => setMixedQuizConfigStep('subject')} className={backButtonClasses}>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                            Ders Seçimine Geri Dön
                        </button>
                    </div>
                    <div>
                        <label htmlFor="mixedQuizQuestionCount" className="block text-sm font-medium text-slate-700 mb-1">Soru Sayısı:</label>
                        <select id="mixedQuizQuestionCount" value={mixedQuizQuestionCount} onChange={e => setMixedQuizQuestionCount(Number(e.target.value))}
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm bg-white text-slate-800">
                            {mixedQuizQuestionCountOptions.map(count => <option key={count} value={count} className="bg-white text-slate-800">{count} Soru</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Konular:</label>
                        <div className="mb-2">
                            <label className="flex items-center space-x-2 p-2 hover:bg-indigo-50 rounded-md cursor-pointer border border-transparent hover:border-indigo-200">
                                <input type="checkbox" checked={mixedQuizIsAllTopics} onChange={handleMixedQuizAllTopicsToggle}
                                       className="h-5 w-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"/>
                                <span className="text-slate-700 font-medium">Tüm Konular</span>
                            </label>
                        </div>
                        {!mixedQuizIsAllTopics && mixedQuizAvailableTopics.length > 0 && (
                            <div className="space-y-1 max-h-60 overflow-y-auto border border-slate-200 rounded-md p-3 bg-slate-50/50">
                                {mixedQuizAvailableTopics.map(topic => (
                                    <label key={topic.id} className="flex items-center space-x-2 p-1.5 hover:bg-indigo-100 rounded-md cursor-pointer">
                                        <input type="checkbox" checked={mixedQuizSelectedTopicIds.includes(topic.id)} onChange={() => handleMixedQuizTopicToggle(topic.id)}
                                               className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"/>
                                        <span className="text-slate-700 text-sm">{topic.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                         {!mixedQuizIsAllTopics && mixedQuizSelectedTopicIds.length === 0 && <p className="text-xs text-amber-600 mt-1">Lütfen en az bir konu seçin veya "Tüm Konular"ı işaretleyin.</p>}
                    </div>
                    <button onClick={handleStartMixedQuiz} className={tealButtonClasses} disabled={isBusy || (!mixedQuizIsAllTopics && mixedQuizSelectedTopicIds.length === 0)}>
                        Testi Oluştur ve Başla
                    </button>
                </div>
            )}
        </div>
    );
  };

 const renderExamQuizConfig = () => {
    if (!selectedExamType) return null;
    return (
        <div className="animate-fadeIn space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-slate-700">{selectedExamType} Deneme Sınavı Ayarları</h2>
                <button onClick={resetToSelection} className={backButtonClasses} aria-label="Ana menüye geri dön">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    Geri
                </button>
            </div>
            <div>
                <label htmlFor="examQuizQuestionCount" className="block text-sm font-medium text-slate-700 mb-1">Soru Sayısı:</label>
                <select id="examQuizQuestionCount" value={examQuizQuestionCount} onChange={e => setExamQuizQuestionCount(Number(e.target.value))}
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm bg-white text-slate-800">
                    {questionCountOptions.map(count => <option key={count} value={count} className="bg-white text-slate-800">{count} Soru</option>)}
                </select>
            </div>
            <button onClick={handleStartExamQuiz} 
                    className={selectedExamType === 'TYT' ? `${skyButtonClasses} bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 focus:ring-rose-400` :
                                selectedExamType === 'AYT' ? `${skyButtonClasses} bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 focus:ring-amber-400` :
                                `${skyButtonClasses} bg-gradient-to-r from-lime-500 to-green-600 hover:from-lime-600 hover:to-green-700 focus:ring-lime-400`}
                    disabled={isBusy}>
                Testi Oluştur ve Başla
            </button>
        </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
      <header className="mb-10 sm:mb-12 text-center w-full max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animated-gradient-text">
          🎓 EduAI
        </h1>
        <p className="mt-4 text-md sm:text-lg text-slate-600 max-w-2xl mx-auto">
          Yapay zeka destekli, kişiselleştirilmiş konu anlatımları, testler ve deneme sınavları ile öğrenmeyi yeniden keşfedin!
        </p>
      </header>

      <main 
        className={`w-full max-w-3xl bg-white/80 backdrop-blur-md p-8 sm:p-10 rounded-xl shadow-xl border border-gray-200/60 transition-opacity duration-200 ease-in-out ${isContentVisible ? 'opacity-100' : 'opacity-0'}`}
        aria-live="polite"
        aria-busy={isBusy}
      >
        {appState === AppState.SELECTING && <div className="animate-fadeIn">{renderSelectionContent()}</div>}
        {appState === AppState.CONFIGURING_MIXED_QUIZ && renderMixedQuizConfig()}
        {appState === AppState.CONFIGURING_EXAM_QUIZ && renderExamQuizConfig()}
        {appState === AppState.LOADING_CONTENT && <SkeletonLoader />}
        {appState === AppState.ERROR && error && <ErrorMessage message={error} onRetry={handleRetryLogic} />}

        {appState === AppState.SHOWING_EXPLANATION && (
          <div className="animate-fadeIn">
            <ExplanationDisplay 
              content={explanationContent} 
              topicName={selectedTopicName}
              gradeName={selectedGradeName}
              subjectName={selectedSubjectName}
            />
            <div className="mt-8 space-y-3 sm:space-y-0 sm:flex sm:space-x-4">
              <button onClick={() => switchContentWithTransition(AppState.SHOWING_QUIZ)} className={`${greenButtonClasses} sm:flex-1`}>
                Teste Geç
              </button>
              <button onClick={resetToSelection} className={`${secondaryButtonClasses} sm:flex-1`}>
                Başka Bir Konu Seç
              </button>
            </div>
          </div>
        )}

        {appState === AppState.SHOWING_QUIZ && (
          <QuizView 
            questions={quizQuestions} 
            onSubmitQuiz={handleSubmitQuiz}
            topicName={selectedExamType ? `${selectedExamType} Deneme Sınavı` : mixedQuizSelectedSubjectId ? `${mixedQuizSubjectName} Karışık Test` : selectedTopicName}
            key={selectedExamType ? `${selectedExamType}-${examQuizQuestionCount}` : mixedQuizSelectedSubjectId ? `${mixedQuizSelectedSubjectId}-mixedquiz` : `${selectedTopicId}-quiz`}
          />
        )}

        {appState === AppState.SHOWING_RESULTS && (
          <QuizResultsView 
            results={quizResults} 
            topicName={selectedExamType ? `${selectedExamType} Deneme Sınavı Sonuçları` : mixedQuizSelectedSubjectId ? `${mixedQuizSubjectName} Karışık Test Sonuçları` : selectedTopicName} 
            onRestart={resetToSelection} 
          />
        )}
      </main>
      <div className="w-full max-w-4xl mx-auto mt-10">
        <hr className="border-t border-slate-300/60" />
      </div>
      <footer className="w-full max-w-4xl mx-auto text-center text-sm text-slate-600 py-8">
        <p>&copy; {new Date().getFullYear()} EduAI. Tüm hakları saklıdır.</p>
        <p className="mt-1">Bu uygulama Google Gemini API ile güçlendirilmiştir.</p>
      </footer>
    </div>
  );
};

export default App;

if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.styleSheets && document.styleSheets.length > 0) {
  const styleSheet = document.styleSheets[0];
  if (styleSheet) {
    let fadeInExists = false;
    try {
      for (let i = 0; i < styleSheet.cssRules.length; i++) {
        const rule = styleSheet.cssRules[i];
        if (rule instanceof CSSStyleRule && rule.cssText && rule.cssText.includes('@keyframes fadeIn')) {
          fadeInExists = true;
          break;
        }
      }
    } catch (e) {
      console.warn("EduAI: Could not check existing CSS rules for fadeIn animation:", e);
    }

    if (!fadeInExists) {
      try {
        styleSheet.insertRule(
          `@keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }`,
          styleSheet.cssRules.length
        );
        styleSheet.insertRule(
          `.animate-fadeIn {
            animation: fadeIn 0.35s ease-out;
          }`,
          styleSheet.cssRules.length
        );
      } catch (e) {
        console.warn("EduAI: Could not insert CSS rules for fadeIn animation:", e);
      }
    }
  }
} else if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  console.warn("EduAI: Stylesheet not available or not loaded yet, cannot inject fadeIn animation rules dynamically.");
}
