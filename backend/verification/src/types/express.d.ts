// custom express types go here
import 'express';

declare module 'express' {
  export interface Request {
    requestId?: string;
  }
}
