export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export class NotFoundError extends HttpError {
  constructor(what: string) {
    super(404, `${what} not found`)
  }
}

export class ValidationError extends HttpError {
  constructor(message: string) {
    super(400, message)
  }
}
