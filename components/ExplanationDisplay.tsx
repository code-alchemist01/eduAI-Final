import React, { useState } from 'react';
import katex from 'katex';
import { getAnswerForQuestionInContext, getStepByStepSolvedExample, generateFlashcards } from '../services/geminiService';
import LoadingIndicator from './LoadingIndicator';
import ErrorMessage from './ErrorMessage';
import FlashcardViewer from './FlashcardViewer'; // Import the new component

interface ExplanationDisplayProps {
  content: string;
  topicName: string;
  gradeName: string;
  subjectName: string;
}

// Helper function to process inline LaTeX and bold markdown within a line of text
const processInlineFormatting = (text: string, baseKey: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    // Regex to find $math$ (non-greedy) or **bold** (non-greedy)
    // Group 1: content inside $...$
    // Group 2: content inside **...**
    const regex = /\$(.+?)\$|\*\*(.+?)\*\*/g;
    let match;
    let keyIndex = 0;

    while ((match = regex.exec(text)) !== null) {
        // Text before the match
        if (match.index > lastIndex) {
            nodes.push(text.substring(lastIndex, match.index));
        }

        if (match[1]) { // Inline LaTeX: $math$
            try {
                const latexInput = match[1];
                const correctedLatex = latexInput.replace(/\\\\/g, '\\'); // Replace \\ with \
                const html = katex.renderToString(correctedLatex, {
                    throwOnError: false,
                    displayMode: false,
                    output: 'html', // Ensure HTML output
                });
                nodes.push(<span key={`${baseKey}-katex-${keyIndex++}`} dangerouslySetInnerHTML={{ __html: html }} />);
            } catch (e) {
                console.warn("KaTeX inline rendering error:", e, "Original LaTeX:", match[1]);
                nodes.push(<span key={`${baseKey}-katex-err-${keyIndex++}`} className="text-red-500 font-mono bg-red-100 px-1 rounded">{`$${match[1]}$ (LaTeX Hatası)`}</span>);
            }
        } else if (match[2]) { // Bold: **bold**
            nodes.push(<strong key={`${baseKey}-bold-${keyIndex++}`} className="font-semibold">{match[2]}</strong>);
        }
        lastIndex = regex.lastIndex;
    }

    // Text after the last match
    if (lastIndex < text.length) {
        nodes.push(text.substring(lastIndex));
    }
    
    // If nothing was processed, return the original text as a single node
    if (nodes.length === 0 && text.length > 0) {
        return [text];
    }
    // Filter out potential empty strings if text starts/ends with a match or has consecutive matches
    return nodes.filter(node => (typeof node === 'string' && node.length > 0) || typeof node !== 'string');
};


const formatMarkdown = (text: string): React.ReactNode[] => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let childIndex = 0;

    let currentParagraphBuffer: string[] = [];
    let currentListItemsContent: React.ReactNode[][] = []; 
    let inLatexBlock = false;
    let latexBuffer: string[] = [];

    const createStyledElement = (element: React.ReactElement<React.HTMLAttributes<HTMLElement>>) => {
        childIndex++;
        return React.cloneElement(element, {
            style: { ...element.props.style, animationDelay: `${childIndex * 0.05}s`, transform: 'translateY(10px)' },
        });
    };
    
    const flushParagraphBuffer = (keySuffix: string) => {
        if (currentParagraphBuffer.length > 0) {
            const paragraphText = currentParagraphBuffer.join(' ').trim();
            if (paragraphText) {
                 elements.push(createStyledElement(<p key={`p-${keySuffix}`}>{processInlineFormatting(paragraphText, `p-${keySuffix}`)}</p> as React.ReactElement<React.HTMLAttributes<HTMLElement>>));
            }
            currentParagraphBuffer = [];
        }
    };

    const flushList = (keySuffix: string) => {
        if (currentListItemsContent.length > 0) {
            const ulKey = `ul-${keySuffix}`;
            const ulBaseAnimationDelay = (childIndex + 1) * 0.05; 
            
            elements.push(
                React.cloneElement(
                    <ul className="list-disc pl-5"> 
                        {currentListItemsContent.map((itemContentArray, idx) => (
                            <li key={`li-${ulKey}-${idx}`}
                                style={{ animationDelay: `${ulBaseAnimationDelay + (idx + 1) * 0.035}s`, transform: 'translateY(10px)' }}
                                className="opacity-0 animate-staggered-item"> 
                                {itemContentArray}
                            </li>
                        ))}
                    </ul>,
                    { key: ulKey, style: { animationDelay: `${ulBaseAnimationDelay}s`, transform: 'translateY(10px)' } }
                )
            );
            childIndex++; 
            currentListItemsContent = [];
        }
    };

    const flushLatexBuffer = (keySuffix: string) => {
        if (latexBuffer.length > 0) {
            try {
                const rawLatexContent = latexBuffer.join('\n');
                const correctedLatexContent = rawLatexContent.replace(/\\\\/g, '\\'); // Replace \\ with \
                const html = katex.renderToString(correctedLatexContent, {
                    throwOnError: false,
                    displayMode: true,
                    output: 'html',
                });
                elements.push(createStyledElement(
                    <div key={`latex-block-${keySuffix}`} className="my-4 text-left overflow-x-auto katex-block-container" dangerouslySetInnerHTML={{ __html: html }} /> as React.ReactElement<React.HTMLAttributes<HTMLElement>>
                ));
            } catch (e) {
                console.warn("KaTeX block rendering error:", e, "Original LaTeX:", latexBuffer.join('\n'));
                elements.push(createStyledElement(
                    <div key={`latex-block-err-${keySuffix}`} className="my-4 text-red-500 font-mono bg-red-100 p-2 rounded text-left overflow-x-auto">{`$$\n${latexBuffer.join('\n').replace(/\\\\/g, '\\')}\n$$ (LaTeX Hatası)`}</div> as React.ReactElement<React.HTMLAttributes<HTMLElement>>
                ));
            }
            latexBuffer = [];
        }
    };


    lines.forEach((line, index) => {
        const lineKey = `line-${index}`;
        const trimmedLine = line.trim();

        if (trimmedLine === '$$') {
            if (inLatexBlock) { // End of LaTeX block
                flushParagraphBuffer(`pre-latex-end-${index}`); 
                flushList(`pre-latex-end-${index}`);
                flushLatexBuffer(`block-${index}`);
                inLatexBlock = false;
            } else { // Start of LaTeX block
                flushParagraphBuffer(`pre-latex-start-${index}`);
                flushList(`pre-latex-start-${index}`);
                inLatexBlock = true;
            }
        } else if (inLatexBlock) {
            latexBuffer.push(line);
        } else if (trimmedLine.startsWith('$$') && trimmedLine.endsWith('$$') && trimmedLine.length > 4) { // Single line block LaTeX: $$ E=mc^2 $$
            flushParagraphBuffer(`pre-sgl-latex-${index}`);
            flushList(`pre-sgl-latex-${index}`);
            const latexContentRaw = trimmedLine.substring(2, trimmedLine.length - 2).trim();
            const correctedLatexContent = latexContentRaw.replace(/\\\\/g, '\\'); // Replace \\ with \
            try {
                const html = katex.renderToString(correctedLatexContent, {
                    throwOnError: false,
                    displayMode: true,
                    output: 'html',
                });
                elements.push(createStyledElement(
                    <div key={`sgl-latex-block-${index}`} className="my-4 text-left overflow-x-auto katex-block-container" dangerouslySetInnerHTML={{ __html: html }} /> as React.ReactElement<React.HTMLAttributes<HTMLElement>>
                ));
            } catch (e) {
                console.warn("KaTeX single-line block rendering error:", e, "Original LaTeX:", correctedLatexContent);
                 elements.push(createStyledElement(
                    <div key={`sgl-latex-err-${index}`} className="my-4 text-red-500 font-mono bg-red-100 p-2 rounded text-left overflow-x-auto">{`$$${correctedLatexContent}$$ (LaTeX Hatası)`}</div> as React.ReactElement<React.HTMLAttributes<HTMLElement>>
                ));
            }
        } else if (line.startsWith('### ')) {
            flushParagraphBuffer(`pre-h3-${index}`);
            flushList(`pre-h3-${index}`);
            elements.push(createStyledElement(<h3 key={lineKey} className="text-xl font-semibold">{processInlineFormatting(line.substring(4), lineKey)}</h3> as React.ReactElement<React.HTMLAttributes<HTMLElement>>));
        } else if (line.startsWith('## ')) {
            flushParagraphBuffer(`pre-h2-${index}`);
            flushList(`pre-h2-${index}`);
            elements.push(createStyledElement(<h2 key={lineKey} className="text-2xl font-semibold">{processInlineFormatting(line.substring(3), lineKey)}</h2> as React.ReactElement<React.HTMLAttributes<HTMLElement>>));
        } else if (line.startsWith('# ')) {
            flushParagraphBuffer(`pre-h1-${index}`);
            flushList(`pre-h1-${index}`);
            elements.push(createStyledElement(<h1 key={lineKey} className="text-3xl font-bold">{processInlineFormatting(line.substring(2), lineKey)}</h1> as React.ReactElement<React.HTMLAttributes<HTMLElement>>));
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            flushParagraphBuffer(`pre-li-${index}`); 
            currentListItemsContent.push(processInlineFormatting(line.substring(2), `${lineKey}-item`));
        } else if (trimmedLine === '') { 
            flushParagraphBuffer(`post-blank-${index}`);
            flushList(`post-blank-${index}`); 
        } else { 
            if(currentListItemsContent.length > 0) {
                 flushList(`pre-text-${index}`);
            }
            currentParagraphBuffer.push(line); 
        }
    });
    
    // After loop, check for unclosed LaTeX block
    if (inLatexBlock) {
        console.warn("Unclosed LaTeX block detected at end of content. Rendering what was buffered.");
        flushLatexBuffer("final-unclosed-latex");
        inLatexBlock = false; // Ensure it's reset
    }

    flushParagraphBuffer(`final-p`); 
    flushList(`final-ul`);       

    return elements;
};


const ExplanationDisplay: React.FC<ExplanationDisplayProps> = ({ content, topicName, gradeName, subjectName }) => {
  const [userQuestion, setUserQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [askAIError, setAskAIError] = useState<string | null>(null);

  const [solvedExample, setSolvedExample] = useState<string | null>(null);
  const [isLoadingSolvedExample, setIsLoadingSolvedExample] = useState(false);
  const [solvedExampleError, setSolvedExampleError] = useState<string | null>(null);

  const [flashcards, setFlashcards] = useState<{ front: string; back: string; }[] | null>(null);
  const [isLoadingFlashcards, setIsLoadingFlashcards] = useState(false);
  const [flashcardsError, setFlashcardsError] = useState<string | null>(null);
  const [showFlashcardViewer, setShowFlashcardViewer] = useState(false);


  const handleAskAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim()) return;

    setIsAskingAI(true);
    setAskAIError(null);
    setAiAnswer(null);

    try {
      const answer = await getAnswerForQuestionInContext(content, userQuestion, gradeName, subjectName, topicName);
      setAiAnswer(answer);
    } catch (err) {
      setAskAIError(err instanceof Error ? err.message : "Soruya cevap alınırken bir hata oluştu.");
    } finally {
      setIsAskingAI(false);
    }
  };

  const handleRetryAskAI = () => {
    if (userQuestion.trim()) {
        const syntheticEvent = {
            preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>; 
        handleAskAISubmit(syntheticEvent);
    }
  };

  const handleFetchSolvedExample = async () => {
    setIsLoadingSolvedExample(true);
    setSolvedExampleError(null);
    setSolvedExample(null);
    try {
        const example = await getStepByStepSolvedExample(gradeName, subjectName, topicName, content);
        setSolvedExample(example);
    } catch (err) {
        setSolvedExampleError(err instanceof Error ? err.message : "Örnek problem alınırken bir hata oluştu.");
    } finally {
        setIsLoadingSolvedExample(false);
    }
  };

  const handleFetchFlashcards = async () => {
    setIsLoadingFlashcards(true);
    setFlashcardsError(null);
    setFlashcards(null);
    setShowFlashcardViewer(false);
    try {
        const cards = await generateFlashcards(gradeName, subjectName, topicName, content);
        setFlashcards(cards);
        if (cards && cards.length > 0) {
            setShowFlashcardViewer(true);
        } else {
            setFlashcardsError("Bu konu için kavram kartı bulunamadı veya oluşturulamadı.");
        }
    } catch (err) {
        setFlashcardsError(err instanceof Error ? err.message : "Kavram kartları alınırken bir hata oluştu.");
    } finally {
        setIsLoadingFlashcards(false);
    }
  };
  
  const primaryButtonBaseClasses = "w-full text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 text-lg transition-all duration-200 ease-in-out transform hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.97] active:brightness-95 active:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-md disabled:transform-none disabled:brightness-100";
  const askAiButtonClasses = `${primaryButtonBaseClasses} bg-teal-600 hover:bg-teal-700 focus:ring-teal-500 text-base py-2.5 px-5 mt-3`;
  const exampleButtonClasses = `${primaryButtonBaseClasses} bg-sky-600 hover:bg-sky-700 focus:ring-sky-500 text-base py-2.5 px-5`;
  const flashcardButtonClasses = `${primaryButtonBaseClasses} bg-purple-600 hover:bg-purple-700 focus:ring-purple-500 text-base py-2.5 px-5`;


  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg border border-slate-200/70">
      <h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-6 border-b-2 border-indigo-100 pb-4">
        Konu Anlatımı: {topicName}
      </h2>
      <div className="prose prose-slate max-w-none 
                      prose-headings:font-semibold prose-headings:text-slate-800 
                      prose-p:text-slate-700 prose-strong:text-slate-800 
                      prose-li:text-slate-700 prose-ul:pl-5 
                      prose-h1:mb-6 prose-h1:opacity-0 
                      prose-h2:mb-3 prose-h2:mt-6 prose-h2:opacity-0 
                      prose-h3:mb-2 prose-h3:mt-5 prose-h3:opacity-0 
                      prose-p:leading-relaxed prose-p:mb-4 
                      prose-ul:my-4 prose-li:my-1.5 prose-li:leading-relaxed 
                      prose-ul:opacity-0 prose-p:opacity-0 stagger-children">
        {formatMarkdown(content)}
      </div>

      {/* EduAI'ye Sor Bölümü */}
      <div className="mt-10 pt-8 border-t-2 border-slate-200">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">🤔 EduAI'ye Sor</h3>
        <form onSubmit={handleAskAISubmit}>
          <textarea
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            placeholder={`'${topicName}' konusuyla ilgili merak ettiklerini sor... Örneğin, "Bu kavramı farklı bir örnekle açıklayabilir misin?" veya "Bu formül neden bu şekilde?"`}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-colors duration-150 ease-in-out h-28 resize-none text-slate-700 placeholder-slate-400 bg-slate-50/50"
            aria-label="Konuyla ilgili soru sor"
          />
          <button type="submit" disabled={isAskingAI || !userQuestion.trim()} className={askAiButtonClasses}>
            {isAskingAI ? 'Soruluyor...' : "Gönder"}
          </button>
        </form>
        {isAskingAI && !aiAnswer && !askAIError && <LoadingIndicator message="EduAI düşünüyor..." />}
        {askAIError && <ErrorMessage message={askAIError} onRetry={handleRetryAskAI} />}
        {aiAnswer && (
          <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg shadow animate-fadeIn">
            <h4 className="text-md font-semibold text-indigo-700 mb-2">EduAI'nin Cevabı:</h4>
            <div className="prose prose-sm max-w-none prose-p:text-indigo-800 prose-strong:text-indigo-800 prose-headings:text-indigo-700">
              {formatMarkdown(aiAnswer)}
            </div>
          </div>
        )}
      </div>

      {/* Adım Adım Çözümlü Örnek */}
      <div className="mt-8 pt-6 border-t border-slate-200/80">
        <h3 className="text-xl font-semibold text-slate-800 mb-3">🔍 Adım Adım Çözümlü Örnek İste</h3>
        <button onClick={handleFetchSolvedExample} disabled={isLoadingSolvedExample} className={exampleButtonClasses}>
          {isLoadingSolvedExample ? 'Örnek Yükleniyor...' : 'Çözümlü Örnek Getir'}
        </button>
        {isLoadingSolvedExample && <LoadingIndicator message="Örnek problem hazırlanıyor..." />}
        {solvedExampleError && <ErrorMessage message={solvedExampleError} onRetry={handleFetchSolvedExample} />}
        {solvedExample && (
          <div className="mt-6 p-4 bg-sky-50 border border-sky-200 rounded-lg shadow animate-fadeIn">
            <h4 className="text-md font-semibold text-sky-700 mb-2">Adım Adım Çözümlü Örnek:</h4>
            <div className="prose prose-sm max-w-none prose-p:text-sky-800 prose-strong:text-sky-800 prose-headings:text-sky-700">
                {formatMarkdown(solvedExample)}
            </div>
          </div>
        )}
      </div>

      {/* Kavram Kartları (Flashcards) */}
      <div className="mt-8 pt-6 border-t border-slate-200/80">
        <h3 className="text-xl font-semibold text-slate-800 mb-3">🃏 Kavram Kartları Oluştur</h3>
        <button onClick={handleFetchFlashcards} disabled={isLoadingFlashcards} className={flashcardButtonClasses}>
          {isLoadingFlashcards ? 'Kartlar Hazırlanıyor...' : 'Kavram Kartlarını Getir'}
        </button>
        {isLoadingFlashcards && <LoadingIndicator message="Kavram kartları oluşturuluyor..." />}
        {flashcardsError && !isLoadingFlashcards && <ErrorMessage message={flashcardsError} onRetry={handleFetchFlashcards} />}
        {showFlashcardViewer && flashcards && flashcards.length > 0 && (
          <FlashcardViewer cards={flashcards} onClose={() => setShowFlashcardViewer(false)} />
        )}
      </div>

    </div>
  );
};

export default ExplanationDisplay;