declare module 'amadeus' {
  interface AmadeusOptions {
    clientId: string;
    clientSecret: string;
    hostname?: 'test' | 'production';
  }

  interface AmadeusResponse {
    data: Record<string, unknown>[];
    result: Record<string, unknown>;
    body: string;
    statusCode: number;
  }

  interface FlightOffersSearch {
    get(params: Record<string, unknown>): Promise<AmadeusResponse>;
  }

  interface Shopping {
    flightOffersSearch: FlightOffersSearch;
  }

  class Amadeus {
    constructor(options: AmadeusOptions);
    shopping: Shopping;
  }

  export = Amadeus;
}
