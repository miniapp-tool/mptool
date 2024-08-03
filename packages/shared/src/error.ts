export interface MpErrorOptions {
  code?: number;
  message?: string;
}

export class MpError extends Error {
  code: number | null;
  constructor({ code, message }: MpErrorOptions) {
    super(message);
    this.code = code ?? null;
  }
}
