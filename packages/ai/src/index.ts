export class AiDisabledError extends Error {
  constructor() {
    super("IA está desligada (AI_ENABLED=false). FASE 1 não classifica mensagens.");
    this.name = "AiDisabledError";
  }
}

export function classifyInbound(): never {
  throw new AiDisabledError();
}
