import { Option } from "./option.mjs";

export class CoveredCall extends Option {
    constructor(option_object, market_price){
        super(option_object);
        this.market_price = market_price;
        try {
            this.break_even = market_price - this.mark;
            this.assignment_gain = 100*(this.strike+this.mark-market_price);
            this.assignment_gain_percent = this.assignment_gain/market_price;
            const tte = this.time_to_expiration();
            this.time = 24*tte.days + tte.hours;
            this.risk = this.time/this.mark;
            this.time_gain = 24*this.assignment_gain/this.time;
            this.time_gain_percent = 24*this.assignment_gain_percent/this.time;
            
            this.itm = this.strike <= this.market_price;
        } catch (error) {
            console.error("Field Doesn't exist\n", error);
        }
    }
    render(){
        const fields = [
            this.strike,
            this.mark,
            this.break_even,
            this.assignment_gain
        ]
        return fields.map(field=>field.toFixed(2)).join(",");
    }

}