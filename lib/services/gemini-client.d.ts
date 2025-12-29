export declare const geminiModel: import("@google/generative-ai").GenerativeModel;
export declare function analyzeDocument(prompt: string, fileData?: string, useThinking?: boolean, maxRetries?: number): Promise<string>;
export declare function analyzePDFDirect(pdfBase64: string, prompt: string, maxRetries?: number): Promise<string>;
//# sourceMappingURL=gemini-client.d.ts.map