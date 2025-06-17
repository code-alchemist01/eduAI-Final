
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GeneratedQuizQuestion } from '../types';

// IMPORTANT: The API key MUST be available as process.env.API_KEY in the execution environment.
// This code assumes that `process.env.API_KEY` is properly populated.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API anahtarı bulunamadı. Lütfen process.env.API_KEY değişkenini ayarlayın.");
  // Potentially throw an error or handle this state in the UI if necessary
  // For this example, we'll let it fail if the API key is missing,
  // as the UI will show an error state.
}

const ai = new GoogleGenAI({ apiKey: API_KEY! }); // Use ! as we've checked (or assumed it's set)

const model = 'gemini-2.5-flash-preview-04-17';

const parseJsonResponse = (text: string): any => {
    let jsonStr = text.trim();
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }

    // Attempt to clean common problematic characters before parsing.
    // This primarily targets unescaped newlines, carriage returns, and tabs within string literals,
    // which often cause "Bad control character" errors.
    let cleanedJsonStr = jsonStr;
    // Replace literal newlines (\n) that are not already escaped (not preceded by a \)
    cleanedJsonStr = cleanedJsonStr.replace(/(?<!\\)\n/g, "\\n");
    // Replace literal carriage returns (\r) that are not already escaped
    cleanedJsonStr = cleanedJsonStr.replace(/(?<!\\)\r/g, "\\r");
    // Replace literal tabs (\t) that are not already escaped
    cleanedJsonStr = cleanedJsonStr.replace(/(?<!\\)\t/g, "\\t");
    // Note: More complex escaping issues (e.g., for arbitrary binary data or very specific Unicode points)
    // would require a more sophisticated sanitizer, but the above covers the most common LLM-related JSON errors.

    try {
        return JSON.parse(cleanedJsonStr);
    } catch (e: any) {
        console.error("JSON ayrıştırma hatası (temizlemeden sonra):", e.message, "Temizlenmiş Metin (ilk 500 karakter):", cleanedJsonStr.substring(0, 500) + "...", "Orijinal Metin (ilk 500 karakter):", text.substring(0, 500) + "...");
        // Fallback to trying to parse the original (fence-stripped) string if cleaning failed or was not the issue
        try {
            console.warn("Temizlenmiş JSON ayrıştırılamadı, orijinal (çitleri çıkarılmış) metin deneniyor...");
            return JSON.parse(jsonStr); 
        } catch (e2: any) {
            console.error("JSON ayrıştırma hatası (orijinal metinle de):", e2.message, "Orijinal (çitleri çıkarılmış) Metin (ilk 500 karakter):", jsonStr.substring(0, 500) + "...");
            // Throw a more specific error message, including the original parser message
            throw new Error(`Yapay zekadan gelen yanıt formatı bozuk (JSON bekleniyordu). Detay: ${e.message}`);
        }
    }
};


export const getTopicExplanation = async (grade: string, subject: string, topic: string): Promise<string> => {
  if (!API_KEY) throw new Error("API anahtarı yapılandırılmamış.");
  try {
    const prompt = `${grade}. sınıf, ${subject} dersi, '${topic}' konusu için ayrıntılı bir konu anlatımı oluştur. Anlatım, bu seviyedeki bir öğrencinin anlayabileceği şekilde açık ve net olmalı. Örnekler ve önemli noktaları vurgula. Başlıkları markdown kullanarak belirgin yapabilirsin (örneğin ## Başlık). Konu anlatımı içindeki metinlerde yeni satır karakterlerini \\n olarak kaçırdığından emin ol.`;
    
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: model,
        contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Konu anlatımı alınırken hata:", error);
    throw new Error("Yapay zekadan konu anlatımı alınamadı. Lütfen tekrar deneyin.");
  }
};

export const getTestQuestions = async (grade: string, subject: string, topic: string): Promise<GeneratedQuizQuestion[]> => {
  if (!API_KEY) throw new Error("API anahtarı yapılandırılmamış.");
  try {
    const prompt = `
      ${grade}. sınıf, ${subject} dersi, '${topic}' konusuyla ilgili 5 adet çoktan seçmeli test sorusu oluştur.
      Her soru için 4 seçenek (A, B, C, D) olmalıdır.
      Her soru için doğru cevabı ve doğru cevabın kısa bir açıklamasını da belirt.
      Sorular, konunun anlaşılıp anlaşılmadığını ölçmelidir.
      Her soru objesinde, bu konunun adı olan "${topic}" değerini içeren bir "konuAdi" alanı ekle.
      Cevapları aşağıdaki JSON formatında bir dizi olarak ver. JSON içindeki tüm string değerlerde yeni satır karakterlerinin \\n olarak, tırnak işaretlerinin \\" olarak ve ters eğik çizgilerin \\\\ olarak doğru bir şekilde kaçırıldığından emin ol:
      [
        {
          "soru": "Soru metni burada...",
          "secenekler": {
            "A": "A seçeneği",
            "B": "B seçeneği",
            "C": "C seçeneği",
            "D": "D seçeneği"
          },
          "dogruCevap": "A",
          "aciklama": "Bu cevabın doğru olmasının nedeni...",
          "konuAdi": "${topic}"
        }
      ]
      JSON yanıtının başına veya sonuna kesinlikle markdown (\`\`\`json ... \`\`\`) veya başka bir metin ekleme. Sadece geçerli JSON dizisi döndür.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
        }
    });
    
    const parsedData = parseJsonResponse(response.text);
    
    if (!Array.isArray(parsedData) || parsedData.some(q => !q.soru || !q.secenekler || !q.dogruCevap || !q.aciklama || !q.konuAdi)) {
        console.error("Alınan JSON formatı beklenildiği gibi değil (getTestQuestions):", parsedData);
        throw new Error("Test soruları beklenen formatta gelmedi.");
    }
    return parsedData as GeneratedQuizQuestion[];

  } catch (error) {
    console.error("Test soruları alınırken hata:", error);
    if (error instanceof SyntaxError || (error instanceof Error && error.message.includes("formatı bozuk"))) { 
         throw new Error("Yapay zekadan gelen test soruları formatı bozuk. Lütfen tekrar deneyin.");
    }
    throw new Error("Yapay zekadan test soruları alınamadı. Lütfen tekrar deneyin.");
  }
};

export const getAnswerForQuestionInContext = async (
    explanation: string, 
    userQuestion: string, 
    gradeName: string, 
    subjectName: string, 
    topicName: string
): Promise<string> => {
    if (!API_KEY) throw new Error("API anahtarı yapılandırılmamış.");
    try {
        const prompt = `
Bir öğrenci, ${gradeName} ${subjectName} dersi, '${topicName}' konusu hakkındaki aşağıdaki konu anlatımıyla ilgili bir soru sordu.
Öğrencinin sorusu: "${userQuestion}"

Lütfen bu soruya, öncelikle aşağıda verilen konu anlatımı bağlamında kalarak, öğrencinin seviyesine uygun, açık, net ve yardımcı bir cevap verin. Eğer soru konu anlatımının dışındaysa, bunu belirtin ve genel bilgi verin.
Cevabınızdaki metinlerde yeni satır karakterlerini \\n olarak kaçırdığınızdan emin olun.

Konu Anlatımı:
---
${explanation}
---
Cevap:`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Konu içi soruya cevap alınırken hata:", error);
        throw new Error("Yapay zekadan cevap alınamadı. Lütfen tekrar deneyin.");
    }
};

export const getStepByStepSolvedExample = async (
    gradeName: string,
    subjectName: string,
    topicName: string,
    explanationContent: string
): Promise<string> => {
    if (!API_KEY) throw new Error("API anahtarı yapılandırılmamış.");
    try {
        const prompt = `
Bir öğrenci ${gradeName} ${subjectName} dersi, '${topicName}' konusunu daha iyi anlamak için adım adım çözümlü bir örnek görmek istiyor. Mevcut konu anlatımı şudur:

---
${explanationContent}
---

Lütfen bu konuyla ilgili, öğrencinin seviyesine uygun, tipik bir problem veya soru oluşturun. Ardından, bu problemin çözümünü, her bir adımı net bir şekilde açıklayarak, adım adım sunun. Çözümü Markdown formatında, örneğin "### Problem:", "#### Çözüm Adımları:", "**Adım 1:**", "**Açıklama:**" gibi başlıklar ve alt başlıklar kullanarak düzenleyin. Çözüm, öğrencinin konuyu pekiştirmesine yardımcı olmalıdır. Örnek, konu anlatımında bahsedilen kavramları içermeli ve öğrencinin bu kavramları nasıl uygulayacağını göstermelidir. Cevabınızdaki metinlerde yeni satır karakterlerini \\n olarak kaçırdığınızdan emin olun.`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Adım adım çözümlü örnek alınırken hata:", error);
        throw new Error("Yapay zekadan adım adım çözümlü örnek alınamadı. Lütfen tekrar deneyin.");
    }
};

export const generateFlashcards = async (
    gradeName: string,
    subjectName: string,
    topicName: string,
    explanationContent: string
): Promise<{ front: string; back: string; }[]> => {
    if (!API_KEY) throw new Error("API anahtarı yapılandırılmamış.");
    try {
        const prompt = `
${gradeName} ${subjectName} dersi, '${topicName}' konusu ve aşağıdaki konu anlatımı bağlamında 5 ila 8 adet anahtar kavram kartı (flashcard) oluşturun.
Her kartın bir "ön yüzü" (anahtar terim, kısa bir soru veya önemli bir başlık) ve bir "arka yüzü" (tanım, cevap veya kısa bir açıklama) olmalıdır.
Kartlar, konunun en önemli noktalarını ve terimlerini içermelidir.
Cevapları aşağıdaki JSON formatında bir dizi olarak verin. JSON içindeki tüm string değerlerde yeni satır karakterlerinin \\n olarak, tırnak işaretlerinin \\" olarak ve ters eğik çizgilerin \\\\ olarak doğru bir şekilde kaçırıldığından emin ol:
[
  {"front": "Ön yüz metni 1", "back": "Arka yüz metni 1"},
  {"front": "Ön yüz metni 2", "back": "Arka yüz metni 2"}
]
JSON yanıtının başına veya sonuna kesinlikle markdown (\`\`\`json ... \`\`\`) veya başka bir metin ekleme. Sadece geçerli JSON dizisi döndür.
Konu Anlatımı:
---
${explanationContent}
---
`;
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        
        const parsedData = parseJsonResponse(response.text);

        if (!Array.isArray(parsedData) || parsedData.some(card => typeof card.front !== 'string' || typeof card.back !== 'string')) {
            console.error("Alınan JSON formatı flashcardlar için beklenildiği gibi değil:", parsedData);
            throw new Error("Kavram kartları beklenen formatta gelmedi.");
        }
        return parsedData as { front: string; back: string; }[];

    } catch (error) {
        console.error("Kavram kartları alınırken hata:", error);
        if (error instanceof SyntaxError || (error instanceof Error && error.message.includes("formatı bozuk"))) {
            throw new Error("Yapay zekadan gelen kavram kartları formatı bozuk. Lütfen tekrar deneyin.");
       }
        throw new Error("Yapay zekadan kavram kartları alınamadı. Lütfen tekrar deneyin.");
    }
};

export const generateMixedTopicQuiz = async (
    gradeName: string,
    subjectName: string,
    topicNames: string[] | "ALL", 
    questionCount: number
): Promise<GeneratedQuizQuestion[]> => {
    if (!API_KEY) throw new Error("API anahtarı yapılandırılmamış.");
    try {
        let topicsPromptPart = "";
        if (topicNames === "ALL") {
            topicsPromptPart = `bu dersteki tüm konulardan rastgele ve dengeli bir dağılımla`;
        } else if (Array.isArray(topicNames) && topicNames.length > 0) {
            topicsPromptPart = `'${topicNames.join("', '")}' konularından`;
        } else {
            throw new Error("Karışık test için en az bir konu seçilmeli veya 'Tüm Konular' seçeneği kullanılmalıdır.");
        }

        const prompt = `
      ${gradeName} ${subjectName} dersi için, ${topicsPromptPart} toplam ${questionCount} adet çoktan seçmeli test sorusu oluştur.
      Her soru için 4 seçenek (A, B, C, D) olmalıdır.
      Her soru için doğru cevabı ve doğru cevabın kısa bir açıklamasını da belirt.
      Sorular, belirtilen konuların anlaşılıp anlaşılmadığını ölçmelidir.
      ÇOK ÖNEMLİ: Her soru objesinde, o sorunun ait olduğu spesifik konunun adını içeren bir "konuAdi" alanı ekle. Örneğin, "konuAdi": "Üslü Sayılar".
      Cevapları aşağıdaki JSON formatında bir dizi olarak ver. JSON içindeki tüm string değerlerde yeni satır karakterlerinin \\n olarak, tırnak işaretlerinin \\" olarak ve ters eğik çizgilerin \\\\ olarak doğru bir şekilde kaçırıldığından emin ol:
      [
        {
          "soru": "Soru metni burada...",
          "secenekler": { "A": "A", "B": "B", "C": "C", "D": "D" },
          "dogruCevap": "A",
          "aciklama": "Açıklama burada...",
          "konuAdi": "Konu Adı Burada"
        }
      ]
      JSON yanıtının başına veya sonuna kesinlikle markdown (\`\`\`json ... \`\`\`) veya başka bir metin ekleme. Sadece geçerli JSON dizisi döndür.
    `;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        
        const parsedData = parseJsonResponse(response.text);
        
        if (!Array.isArray(parsedData) || parsedData.some(q => !q.soru || !q.secenekler || !q.dogruCevap || !q.aciklama || !q.konuAdi)) {
            console.error("Alınan JSON formatı karışık test için beklenildiği gibi değil:", parsedData);
            throw new Error("Karışık test soruları beklenen formatta gelmedi.");
        }
        return parsedData as GeneratedQuizQuestion[];

    } catch (error) {
        console.error("Karışık test soruları alınırken hata:", error);
         if (error instanceof SyntaxError || (error instanceof Error && error.message.includes("formatı bozuk"))) {
             throw new Error("Yapay zekadan gelen karışık test soruları formatı bozuk. Lütfen tekrar deneyin.");
        }
        throw new Error("Yapay zekadan karışık test soruları alınamadı. Lütfen tekrar deneyin.");
    }
};

export const generateExamQuiz = async (
    examType: 'TYT' | 'AYT' | 'LGS',
    questionCount: number
): Promise<GeneratedQuizQuestion[]> => {
    if (!API_KEY) throw new Error("API anahtarı yapılandırılmamış.");

    let subjectsPromptPart = "";
    let examNameToUse = "";

    if (examType === 'TYT') {
        examNameToUse = "TYT (Temel Yeterlilik Testi)";
        subjectsPromptPart = "Türkçe, Sosyal Bilimler (Tarih, Coğrafya, Felsefe, Din Kültürü ve Ahlak Bilgisi), Temel Matematik ve Fen Bilimleri (Fizik, Kimya, Biyoloji) derslerinden TYT formatına uygun ve bu dersler arasında dengeli bir dağılımla";
    } else if (examType === 'AYT') {
        examNameToUse = "AYT (Alan Yeterlilik Testi)";
        // For AYT, it's better to be more general or pick a specific stream if the user could choose one.
        // For now, a general mix is requested.
        subjectsPromptPart = "Matematik, Fen Bilimleri (Fizik, Kimya, Biyoloji), Türk Dili ve Edebiyatı-Sosyal Bilimler-1 (Tarih-1, Coğrafya-1), Sosyal Bilimler-2 (Tarih-2, Coğrafya-2, Felsefe Grubu, Din Kültürü ve Ahlak Bilgisi) derslerinden AYT formatına uygun (genel bir alan karması) ve bu dersler arasında dengeli bir dağılımla";
    } else if (examType === 'LGS') {
        examNameToUse = "LGS (Liselere Geçiş Sistemi)";
        subjectsPromptPart = "Türkçe, Matematik, Fen Bilimleri, T.C. İnkılap Tarihi ve Atatürkçülük, Din Kültürü ve Ahlak Bilgisi ve Yabancı Dil (İngilizce) derslerinden LGS formatına uygun ve bu dersler arasında dengeli bir dağılımla";
    } else {
        throw new Error("Geçersiz sınav türü.");
    }

    try {
        const prompt = `
      Bir ${examNameToUse} deneme sınavı için, ${subjectsPromptPart} toplam ${questionCount} adet çoktan seçmeli test sorusu oluştur.
      Her soru için 4 seçenek (A, B, C, D) olmalıdır (TYT/AYT için 5 seçenek daha yaygındır, ancak bu prompt için 4 seçenek kullanın).
      Her soru için doğru cevabı ve doğru cevabın kısa bir açıklamasını da belirt.
      Sorular, belirtilen sınavın genel kapsamını ve zorluk seviyesini yansıtmalıdır.
      ÇOK ÖNEMLİ: Her soru objesinde, o sorunun ait olduğu dersin veya alanın adını içeren bir "konuAdi" alanı ekle. Örneğin, TYT için "konuAdi": "Temel Matematik" veya "konuAdi": "Türkçe".
      Cevapları aşağıdaki JSON formatında bir dizi olarak ver. JSON içindeki tüm string değerlerde yeni satır karakterlerinin \\n olarak, tırnak işaretlerinin \\" olarak ve ters eğik çizgilerin \\\\ olarak doğru bir şekilde kaçırıldığından emin ol:
      [
        {
          "soru": "Soru metni burada...",
          "secenekler": { "A": "A", "B": "B", "C": "C", "D": "D" },
          "dogruCevap": "A",
          "aciklama": "Açıklama burada...",
          "konuAdi": "Ders Adı Burada (örn: Türkçe)"
        }
      ]
      JSON yanıtının başına veya sonuna kesinlikle markdown (\`\`\`json ... \`\`\`) veya başka bir metin ekleme. Sadece geçerli JSON dizisi döndür.
    `;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        
        const parsedData = parseJsonResponse(response.text);
        
        if (!Array.isArray(parsedData) || parsedData.some(q => !q.soru || !q.secenekler || !q.dogruCevap || !q.aciklama || !q.konuAdi)) {
            console.error(`Alınan JSON formatı ${examType} deneme sınavı için beklenildiği gibi değil:`, parsedData);
            throw new Error(`${examType} deneme sınavı soruları beklenen formatta gelmedi.`);
        }
        return parsedData as GeneratedQuizQuestion[];

    } catch (error) {
        console.error(`${examType} deneme sınavı soruları alınırken hata:`, error);
        if (error instanceof SyntaxError || (error instanceof Error && error.message.includes("formatı bozuk"))) {
             throw new Error(`Yapay zekadan gelen ${examType} deneme sınavı soruları formatı bozuk. Lütfen tekrar deneyin.`);
        }
        throw new Error(`Yapay zekadan ${examType} deneme sınavı soruları alınamadı. Lütfen tekrar deneyin.`);
    }
};
