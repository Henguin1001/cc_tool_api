# CCToolAPI

This module was created to separate the funcionality of the CCTool webapp into an npm module so that it can be used in more applications.

## Installing
```npm install @hentech/cc_tool_api```

## Using it
### get_cc(ticker [, expiration_date])
when expiration date is provided the function will look up the options chain for that date,
otherwise it will lookup the first expiration date available.


```js
import { CCToolAPI } from "../src/cc_tool_api.mjs";

async function main(){
    const cc_api = new CCToolAPI("<API TOKEN>");
    const output = await cc_api.get_cc("QQQ");
}
main();
```


Response:
```js
    {
        "quote":{
            //Tradier get Quote response
            "last":380.88
        },
        // expiration dates grouped by week
        "expiration_dates":[
            [{Luxon DateTime Object},{Luxon DateTime Object},{Luxon DateTime Object}],
            [{Luxon DateTime Object},{Luxon DateTime Object},{Luxon DateTime Object}],
            ...
        ],
        // expiration dates not grouped by week
        "expiration_dates_flat":[
            {Luxon DateTime Object},{Luxon DateTime Object},{Luxon DateTime Object}
        ],
        "options_chain": [
            {CoveredCall Object},{CoveredCall Object},{CoveredCall Object},...
        ]
    }
```
