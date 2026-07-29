declare module "mammoth/mammoth.browser" {
  export type MammothMessage = {
    type?: string;
    message: string;
  };

  export function extractRawText(input: {
    arrayBuffer: ArrayBuffer;
  }): Promise<{
    value: string;
    messages: MammothMessage[];
  }>;
}
