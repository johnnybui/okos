import { Persona, UtilityModel } from '@config/aiModel';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { SystemMessage } from '@langchain/core/messages';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { prisma } from '@libs/prisma';
import { FileInput, MainGraphStateAnnotation } from '../graphs/main.graph';

function sanitizeForPostgres(text: string): string {
  return text
    .replace(/\x00/g, '') // Remove NULL bytes
    .replace(/[^\S\r\n]+/g, ' ') // Normalize multiple spaces (but keep line breaks)
    .replace(/(\r\n|\r)/g, '\n'); // Normalize line breaks
}

export const inputProcessorNode = async (
  state: typeof MainGraphStateAnnotation.State,
  config: LangGraphRunnableConfig
): Promise<Partial<typeof MainGraphStateAnnotation.State>> => {
  const { fileInputs, sessionId } = state;

  if (!fileInputs || !fileInputs.length) {
    // Text-only input, pass through
    return {};
  }

  const processFile = async (fileInput: FileInput) => {
    if (fileInput.type === 'pdf') {
      const blob = await fetch(fileInput.url).then((res) => res.blob());
      const singleDocPerFileLoader = new PDFLoader(blob, {
        pdfjs: async () => {
          const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
          pdfjs.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs';
          return pdfjs;
        },
        splitPages: false,
      });
      const singleDoc = await singleDocPerFileLoader.load();
      const extractedText = singleDoc[0].pageContent;
      const safeText = sanitizeForPostgres(extractedText);

      return `<file name="${fileInput.fileName}" type="pdf">\n${safeText}\n</file>`;
    }

    if (fileInput.type === 'image') {
      const systemMessage = new SystemMessage(
        `${Persona.workerModelPrompt}

        Your task is to parse the image to text. If the image is a financial document such as a receipt, expense bill or invoice..., do not lose any information and format the content to be easy to understand as a bookkeeper.
        Output only the parsed content.`
      );

      const model = UtilityModel('gpt-4o-mini');
      const visionMessage = await model.invoke([
        systemMessage,
        { role: 'user', content: [{ type: 'image_url', image_url: { url: fileInput.url } }] },
      ]);

      return `<file name="${fileInput.fileName}" type="image">\n${visionMessage.content.toString()}\n</file>`;
    }

    return '';
  };

  // Write the state to the stream
  config.writer?.(JSON.stringify({ type: 'state', state: 'working', message: 'Processing files' }));

  const extractedTexts = await Promise.all(fileInputs.map(processFile));
  const accumulatedText = 'Extracted text from files:\n---\n\n' + extractedTexts.join('\n');

  // Save parsed text as a system message in chat session
  await prisma.chatMessage.create({
    data: {
      role: 'system',
      content: accumulatedText,
      sessionId,
    },
  });

  return { messages: [new SystemMessage(accumulatedText)] };
};
