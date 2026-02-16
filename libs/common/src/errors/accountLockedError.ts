import { HttpStatus } from '@nestjs/common';
import { GenericError } from './genericError';

export class AccountLockedError extends GenericError {
  constructor(
    message: string,
    public readonly lockedUntil: string,
  ) {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }

  override getError(): { code: number; message: string; lockedUntil: string } {
    const base = super.getError() as { code: number; message: string };
    return {
      ...base,
      lockedUntil: this.lockedUntil,
    };
  }
}
