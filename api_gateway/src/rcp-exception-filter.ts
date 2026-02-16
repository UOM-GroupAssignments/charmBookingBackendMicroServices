import {
  Catch,
  HttpStatus,
  ArgumentsHost,
  ExceptionFilter,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class RpcToHttpFilter implements ExceptionFilter {
  catch(exception: RpcException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{
      status: (status: number) => {
        json: (body: any) => any;
      };
    }>();
    const err = exception.getError();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    // Handle error based on its type and structure
    if (typeof err === 'object') {
      if ('code' in err && typeof err.code === 'number') {
        status = err.code;
      } else if ('code' in err && typeof err.code === 'string') {
        status = parseInt(err.code, 10) || HttpStatus.INTERNAL_SERVER_ERROR;
      }

      if ('message' in err && typeof err.message === 'string') {
        message = err.message;
      }
    } else if (typeof err === 'string') {
      message = err;
    }

    const lockedUntil =
      typeof err === 'object' && 'lockedUntil' in err
        ? err.lockedUntil
        : undefined;

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      ...(lockedUntil == null ? {} : { lockedUntil }),
    });
  }
}
