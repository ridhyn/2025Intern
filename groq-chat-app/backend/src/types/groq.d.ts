declare module 'groq' {
  export default class Groq {
    constructor(config: { apiKey: string });
    chat: {
      completions: {
        create(params: {
          messages: Array<{
            role: string;
            content: string;
          }>;
          model: string;
        }): Promise<{
          choices: Array<{
            message: {
              role: string;
              content: string;
            };
          }>;
        }>;
      };
    };
  }
}
