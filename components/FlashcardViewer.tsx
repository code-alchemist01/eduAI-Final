import React, { useState, useEffect } from 'react';

interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardViewerProps {
  cards: Flashcard[];
  onClose: () => void;
}

const FlashcardViewer: React.FC<FlashcardViewerProps> = ({ cards, onClose }) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFrontVisible, setIsFrontVisible] = useState(true);
  const [cardKey, setCardKey] = useState(0); // For re-triggering animation on card change

  useEffect(() => {
    setCurrentCardIndex(0);
    setIsFrontVisible(true);
    setCardKey(prev => prev + 1); // Reset animation for the first card
  }, [cards]);

  const handleNextCard = () => {
    if (currentCardIndex < cards.length - 1) {
      setIsFrontVisible(true); // Show front of next card
      setCurrentCardIndex(prev => prev + 1);
      setCardKey(prev => prev + 1);
    }
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setIsFrontVisible(true); // Show front of prev card
      setCurrentCardIndex(prev => prev - 1);
      setCardKey(prev => prev + 1);
    }
  };

  const handleFlipCard = () => {
    setIsFrontVisible(prev => !prev);
  };

  if (!cards || cards.length === 0) {
    return (
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-700 text-center">
        Gösterilecek kavram kartı bulunamadı.
      </div>
    );
  }

  const currentCard = cards[currentCardIndex];
  
  const controlButtonClasses = "text-white font-semibold py-2 px-4 rounded-md shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all duration-150 ease-in-out text-sm disabled:opacity-50 disabled:cursor-not-allowed";
  const purpleButtonClasses = `${controlButtonClasses} bg-purple-600 hover:bg-purple-700 focus:ring-purple-500`;
  const slateButtonClasses = `${controlButtonClasses} bg-slate-500 hover:bg-slate-600 focus:ring-slate-400`;


  return (
    <div className="mt-6 p-4 md:p-6 bg-slate-50 border border-slate-200 rounded-lg shadow-md animate-fadeIn">
      <div className="flashcard-container mb-4">
        <div 
          key={cardKey} 
          className={`flashcard ${!isFrontVisible ? 'flipped' : ''}`}
          onClick={handleFlipCard}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') handleFlipCard();}}
          aria-label={`Kavram Kartı: ${isFrontVisible ? currentCard.front : currentCard.back}. Çevirmek için tıklayın.`}
          aria-live="polite"
        >
          <div className="flashcard-face flashcard-front">
            <p className="text-lg md:text-xl font-medium">{currentCard.front}</p>
          </div>
          <div className="flashcard-face flashcard-back">
            <p className="text-md md:text-lg">{currentCard.back}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between mt-4 space-y-3 sm:space-y-0">
        <button 
          onClick={handlePrevCard} 
          disabled={currentCardIndex === 0}
          className={purpleButtonClasses}
        >
          ← Önceki Kart
        </button>
        <p className="text-sm font-medium text-slate-700">
          Kart {currentCardIndex + 1} / {cards.length}
        </p>
        <button 
          onClick={handleNextCard} 
          disabled={currentCardIndex === cards.length - 1}
          className={purpleButtonClasses}
        >
          Sonraki Kart →
        </button>
      </div>
      <div className="mt-5 flex flex-col sm:flex-row sm:space-x-3 space-y-2 sm:space-y-0">
        <button 
            onClick={handleFlipCard}
            className={`${purpleButtonClasses} flex-1`}
        >
            Kartı Çevir
        </button>
        <button 
            onClick={onClose}
            className={`${slateButtonClasses} flex-1`}
        >
            Kapat
        </button>
      </div>
    </div>
  );
};

export default FlashcardViewer;
