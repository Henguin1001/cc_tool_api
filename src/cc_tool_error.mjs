class CCToolError extends Error {
  constructor(name, message) {
    super(message);
    this.name = name;
  }
}

export class UNDEFINED_TICKER_ERROR extends CCToolError {
  static name = "UNDEFINED_TICKER";
  constructor(){ 
    super(UNDEFINED_TICKER_ERROR.name, `Ticker is not defined`);
  }
}
export class INVALID_TICKER_ERROR extends CCToolError {
  static name = "INVALID_TICKER";
  constructor(ticker){ 
    super(INVALID_TICKER_ERROR.name,`Ticker ${ticker} is not valid`);
  }
}
export class MALFORMED_DATE_ERROR extends CCToolError {
  static name = "MALFORMED_DATE";
  constructor(date){ 
    super(MALFORMED_DATE_ERROR.name, `Date ${date} is not parsable in ISO date format (ISO 8601)`);
  }
}
export class PASSED_DATE_ERROR extends CCToolError {
  static name = "PASSED_DATE";
  constructor(date){ 
    super(PASSED_DATE_ERROR.name, `Date ${date} has already passed`);
  }
}
export class INVALID_DATE_ERROR extends CCToolError {
  static name = "INVALID_DATE";
  constructor(date){ 
    super(INVALID_DATE_ERROR.name, `Date ${date} is not a valid expiration date`);
  }
}