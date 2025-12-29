import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
export const geminiModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash"
});
export async function analyzeDocument(prompt, fileData, useThinking = false, maxRetries = 3) {
    const errors = [];
    if (fileData) {
        const sizeInBytes = (fileData.length * 3) / 4;
        const sizeInMB = sizeInBytes / (1024 * 1024);
        if (sizeInMB > 20) {
            throw new Error(`Archivo demasiado grande: ${sizeInMB.toFixed(2)}MB. Límite: 20MB`);
        }
        if (sizeInMB > 5) {
            console.warn(`[Gemini] Archivo grande detectado: ${sizeInMB.toFixed(2)}MB. El análisis puede tardar más.`);
        }
    }
    const parts = [];
    if (fileData) {
        parts.push({
            inlineData: {
                mimeType: detectMimeType(fileData),
                data: fileData
            }
        });
    }
    parts.push({
        text: prompt
    });
    const generationConfig = {
        temperature: 0.2,
        maxOutputTokens: 8192,
    };
    if (useThinking) {
        generationConfig.thinkingBudget = 1024;
    }
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const startTime = Date.now();
            const result = await geminiModel.generateContent({
                contents: [{
                        role: 'user',
                        parts: parts
                    }],
                generationConfig
            });
            const duration = Date.now() - startTime;
            console.log(`[Gemini] Análisis completado en ${duration}ms (intento ${attempt}/${maxRetries})`);
            return result.response.text();
        }
        catch (error) {
            const errorDetails = {
                attempt,
                error: {
                    name: error?.name || 'UnknownError',
                    message: error?.message || String(error),
                    code: error?.code || error?.status || 'UNKNOWN',
                    status: error?.status || error?.statusCode || 'UNKNOWN',
                    details: error?.details || error?.response?.data || null
                }
            };
            errors.push(errorDetails);
            console.error(`[Gemini] Error en intento ${attempt}/${maxRetries}:`, {
                code: errorDetails.error.code,
                message: errorDetails.error.message,
                status: errorDetails.error.status
            });
            if (attempt === maxRetries) {
                const errorMessage = `Error después de ${maxRetries} intentos. Último error: ${errorDetails.error.message} (Código: ${errorDetails.error.code})`;
                const enhancedError = new Error(errorMessage);
                enhancedError.attempts = errors;
                enhancedError.lastError = errorDetails.error;
                enhancedError.isRetryable = isRetryableError(error);
                throw enhancedError;
            }
            const baseBackoff = 1000 * Math.pow(2, attempt - 1);
            const jitter = Math.random() * 1000;
            const backoffMs = Math.min(baseBackoff + jitter, 10000);
            console.log(`[Gemini] Reintentando en ${Math.round(backoffMs)}ms... (backoff exponencial con jitter)`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
    }
    throw new Error('Error inesperado en analyzeDocument');
}
export async function analyzePDFDirect(pdfBase64, prompt, maxRetries = 3) {
    return analyzeDocument(prompt, pdfBase64, false, maxRetries);
}
function isRetryableError(error) {
    const retryableCodes = [
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'ECONNREFUSED',
        429,
        500,
        502,
        503,
        504,
    ];
    const code = error?.code || error?.status || error?.statusCode;
    return retryableCodes.includes(code) || code?.toString().startsWith('5');
}
function detectMimeType(data) {
    if (data.startsWith('JVBERi'))
        return 'application/pdf';
    if (data.startsWith('/9j/'))
        return 'image/jpeg';
    if (data.startsWith('iVBORw'))
        return 'image/png';
    return 'application/pdf';
}
//# sourceMappingURL=gemini-client.js.map