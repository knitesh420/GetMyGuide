import { AxiosError } from "axios";

interface RequestErrorOptions {
  message: string;
  title: string;
  error: string;
  status: number;
}

export default class RequestError extends Error {
  public title: string;
  public _message: string;
  public error: string;
  public status: number;

  constructor(opts: RequestErrorOptions) {
    super(opts.message);
    Object.setPrototypeOf(this, RequestError.prototype);
    this.title = opts.title;
    this.message = opts.message;
    this.status = opts.status;
    this._message = `[${this.status}] ${this.title}: ${this.message}`;
    this.error = opts.error;
  }

  getMessage(): string {
    return this.message;
  }

  toString(): string {
    return this.message;
  }

  static async fromResponse(response: Response): Promise<RequestError> {
    try {
      const contentType = response.headers.get("content-type");
      let errorData: any = {};

      // Only try to parse JSON if content-type indicates JSON
      if (contentType?.includes("application/json")) {
        errorData = await response.json();
      } else {
        // Try to parse as text and handle gracefully
        const text = await response.text();
        errorData = text ? { message: text } : {};
      }

      return new RequestError({
        title: errorData?.title || "Error",
        message:
          errorData?.message || response.statusText || "Unknown error occurred",
        error: errorData?.error || response.status.toString(),
        status: response.status || 500,
      });
    } catch (parseError) {
      // Fallback if parsing fails
      return new RequestError({
        title: "Parse Error",
        message: "Failed to parse error response",
        error: "PARSE_ERROR",
        status: response.status || 500,
      });
    }
  }

  static fromAxiosError(error: AxiosError): RequestError {
    const data = (error?.response?.data as any) ?? {};
    return new RequestError({
      title: data?.title || "Error",
      message: data?.message || error.message || "An error occurred",
      error: data?.error || error.code || "UNKNOWN",
      status: error.response?.status || 500,
    });
  }
}
