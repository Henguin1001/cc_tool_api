import { DateTime } from "luxon";
import Tradier from "tradier-api";
import { 
    MALFORMED_DATE_ERROR, 
    PASSED_DATE_ERROR,
    INVALID_DATE_ERROR,
    INVALID_TICKER_ERROR,
    UNDEFINED_TICKER_ERROR
} from "./cc_tool_error.mjs";
export * from "./cc_tool_error.mjs";

import { CoveredCall } from "./covered_call.mjs";

const VALID_TICKER_REGEX = /^[A-z]{0,5}$/;
const NYSE_ZONE = 'America/New_York';
const NYSE_OPEN = {
    hour: 9, // 6:30 am EST
    minute: 30
}
const NYSE_CLOSE = {
    hour: 16, // 4 pm EST
    minute: 0
}


export class CCToolAPI {
    
    constructor(api_key){
        this.tradier = new Tradier(api_key, "sandbox");
    }
    // This function is the main utility of the API, 
    // which breaks off into several sub cases 
    async get_cc(ticker, expiration_date_requested){
        const quote = await this.get_ticker(ticker);
        const expiration_dates = await this.get_expirations(ticker);
        // if the api call doesn't supply an expiration date, use the first one available
        let expiration_date;
        if(!expiration_date_requested){
            // expiration dates is formatted by week, 
            // so the first week, and first expiration available
            expiration_date = expiration_dates[0][0].toFormat('yyyy-MM-dd');
        } else {
            expiration_date = expiration_date_requested;
        }
        const options_chain = await this.get_options(ticker,quote.last, expiration_dates,expiration_date);
        // render the response in a human readable format
        const response_str =
            "\nExpiration Dates: "
            + expiration_dates.flat(1).map(ex=>ex.toFormat('yyyy-MM-dd')).join(",")
            + "\n"
            + `Share Price: $${quote.last}, Ex Date: ${expiration_date}\n`
            + options_chain.map(cc=>"\t"+cc.render()).join("\n");

        return {
            quote:quote,
            expiration_dates:expiration_dates,
            // return a flattened verson (not separated by weeks)
            expiration_dates_flat:expiration_dates.flat(1),
            options_chain: options_chain,
            response_str: response_str
        };
    }
    async get_ticker(ticker){
        if(ticker && VALID_TICKER_REGEX.test(ticker)){
            // Ticker is defined and valid
            try {
                return await this.tradier.getQuote(ticker);
            } catch (error) {
                // Ticker is not valid
                throw error;            
            }
        } else if(!ticker) {
            // Ticker is not defined
            throw new UNDEFINED_TICKER_ERROR();
        } else {
            // Ticker string is not valid (malformed)
            throw new INVALID_TICKER_ERROR(ticker);
        }
    }
    async get_expirations(ticker, limit=5){
        // Assuming API calls get_ticker first to validate ticker
        const dates_raw = await this.tradier.getOptionExpirations(ticker);
        var dates = {};
        // Cast each ISO date to a Luxon date
        // then organize dates into weekly bins
        // ["2019-12-1","2019-12-3",...] => {"1":[{w1 ex1},{w1 ex2},{w1 ex3}], "2":[{w2 ex1},...]}
        
        dates_raw.date.forEach(date_raw => {
            const date = DateTime.fromISO(date_raw);
            if(dates[date.weekNumber]){
                dates[date.weekNumber].push(date);
            } else {
                dates[date.weekNumber] = [date];
            } 
        });
        // get and array of all the values: [ [{w1 ex1},{w1 ex2},{w1 ex3}], [{w2 ex1},...]...]  
        const weeks = Object.values(dates)
            // Sort the dates by chronilogical order
            .sort((a,b)=>{
                if(a>b){
                    return 1;
                } else if(a < b){
                    return -1;
                } else {
                    return 0;
                }
            })
            // remove unwanted dates based on limit
            .slice(0,limit);
        return weeks;
    }
    async get_options(ticker, market_price, expiration_dates, expiration_date_iso, price_threshold = 10){
        const expiration_date = DateTime
            .fromISO(expiration_date_iso)
            .setZone(NYSE_ZONE)
            .set(NYSE_CLOSE);
        const now = DateTime.local().setZone('America/New_York');

        if(expiration_date.invalidExplanation){
            throw new MALFORMED_DATE_ERROR(expiration_date_iso);    
        } else if(expiration_date < now) {
            // Date is in the past (API doesn't support historical data)
            throw new PASSED_DATE_ERROR(expiration_date_iso);
        } else {
            // Date is properly formatted
            // convert back to ISO, (ISO=>LUXON=>ISO should sanitize the date)
            const expiration_date_sanitized = expiration_date.toFormat('yyyy-MM-dd');
            // Check if the date exists in the list of dates
            const date_exists = expiration_dates.flat(1).some(ex=>ex.toFormat('yyyy-MM-dd') === expiration_date_sanitized);
            if(date_exists || expiration_dates.length == 0){
                // get the options chain
                const chain_raw = await this.tradier.getOptionChains(ticker,expiration_date_sanitized);
                const covered_calls = chain_raw.option
                    // Remove put options
                    .filter(option=>option.option_type == "call")
                    // filter options that are too far out of the money based on a price threshold
                    .filter(option=>option.strike<(market_price+price_threshold))
                    // Cast each option into a CoveredCall object
                    .map(option=>new CoveredCall(option, market_price))
                    // reverse the order of the array (api returns ascending price we want descending)
                    .reverse();
                return covered_calls;
                
            } else {
                throw new INVALID_DATE_ERROR(expiration_date_sanitized);
            }
        }
    }
    // Gets several pages (expiration dates) of cc_results 
    async get_cc_bulk(ticker, n=2){
        const quote = await this.get_ticker(ticker);
        const expiration_dates = await this.get_expirations(ticker);
        const pages = await Promise.all(
            expiration_dates
            .flat(1) // flatten weekly groups 
            .slice(0,n) // limit pages by n
            .map(async (expiration_date)=>{
                const expiration_date_iso = expiration_date.toFormat('yyyy-MM-dd');
                return await this.get_options(ticker,quote.last, expiration_dates,expiration_date_iso);
            })
        );
        return {quote:quote, expiration_dates: expiration_dates, pages:pages};
    }
    static isMarketOpen(iso_date){
        let now;
        if(iso_date){
            now = DateTime
                .fromISO(iso_date)
                .setZone(NYSE_ZONE);
        } else {
            now = DateTime.local().setZone('America/New_York');

        }
        const now_minutes = now.hour*60+now.minute;
        return now.weekday <= 5
        && now_minutes > (NYSE_OPEN.hour*60 + NYSE_OPEN.minute)
        && now_minutes < (NYSE_CLOSE.hour*60 + NYSE_CLOSE.minute);
    }
}