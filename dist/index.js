"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Money = void 0;
const big_js_1 = require("big.js");
const currency_codes_1 = __importDefault(require("currency-codes"));
const DEFAULT_DECIMALS_PRICE = 10;
const currencyToDecimals = (currency) => {
    const decimals = currency_codes_1.default.code(currency)?.digits;
    if (decimals === undefined) {
        if (currency === "UNKNOWN") {
            return 2;
        }
        throw new Error(`Currency ${currency} is not supported`);
    }
    return decimals;
};
const percentToMultiplier = (percent) => (0, big_js_1.Big)(percent).add(100).div(100);
const percentToRate = (percent) => (0, big_js_1.Big)(percent).div(100);
const escapeRegex = (str) => str.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
class Money {
    _data;
    constructor(data) {
        if (data.amount === undefined) {
            throw new Error("Amount is undefined. Needs to be number, string, or Big");
        }
        const currency = data.currency;
        const decimals = data.decimals ?? currencyToDecimals(currency);
        const amount = new big_js_1.Big(data.amount);
        this._data = {
            amount: amount.round(decimals, data.roundingMode),
            currency,
            decimals: data.decimals,
            roundingMode: data.roundingMode,
            tags: {
                includesVat: false,
                isPrice: false,
                isVat: false,
                ...data.tags,
            },
        };
        Object.freeze(this);
        Object.freeze(this._data);
    }
    /**
     * Create a money object.
     *
     * Amount can be any of number, string, or Big
     * currency is the 3-character currency code (ISO 4217)
     * currency can also be set to UNKNOWN, which gives a precision of 2 decimals.
     *
     * With options you can specify
     * - decimals
     * - roundingMode
     * - tags
     */
    static of(amount, currency, options) {
        return new Money({ amount, currency, ...options });
    }
    /**
     * Instantiate from a string formatted in a certain locale.
     *
     * Examples:
     * no-NB: 11 111,11
     * en-GB: 11,111.11
     * de-DE: 11.111,11
     *
     * Before parsing, non-numeric characters are removed, and the decimal sign is normalized.
     *
     * Locales with unicode numbers are NOT SUPPORTED
     * Example of formats NOT SUPPORTED:
     * ar: ١١٬١١١٫١١
     */
    static fromLocaleString(str, currency, locale, options) {
        const parts = Intl.NumberFormat(locale).formatToParts(11111.11);
        const decimalSign = parts.find((p) => p.type === "decimal")?.value ?? ".";
        str = str
            .replace(new RegExp(`[^-\\d${escapeRegex(decimalSign)}]`, "g"), "")
            .replace(decimalSign, ".");
        return Money.of(str, currency, options);
    }
    /**
     * Instantiate from a whole number of minor units of the currency (e.g. whole number of cents)
     *
     * Example:
     * Money.fromFractionlessAmount(1000, 'NOK') => 10.00 NOK
     */
    static fromFractionlessAmount(amount, currency, options) {
        return Money.of(amount, currency, options).divide(10 ** currencyToDecimals(currency));
    }
    /**
     * A price has arbitrary precision.
     * This method creates a Money instance with 10 decimals of precision by default.
     * Remember to call .resetDecimals() when you want to go back to a proper Money value.
     */
    static fromPrice(price, currency, options) {
        return Money.of(price, currency, {
            decimals: DEFAULT_DECIMALS_PRICE,
            ...options,
        });
    }
    /**
     * Calculate total money according to a price and quantity.
     * Default precision is 10 decimals.
     */
    static fromPriceAndQuantity(price, quantity, currency, options) {
        return Money.fromPrice(price, currency, options)
            .multiply(quantity)
            .resetDecimals();
    }
    /**
     * Sum an array of moneys.
     *
     * If the array is empty, a currency must be specified so that 0 can be returned in that currency.
     *
     * The precision, rounding mode, etc, is based on the first item in the array.
     * If the array is empty, the options object will be used instead.
     */
    static sum(moneys, currency, options) {
        if (moneys.length === 0 && currency === undefined) {
            throw new Error("Currency must be set when summing an empty list of money's");
        }
        currency = currency ?? moneys[0].currency();
        if (moneys.length === 0) {
            return Money.of(0, currency, options);
        }
        return moneys
            .slice(1)
            .reduce((sum, money) => sum.add(money), moneys[0]);
    }
    static max(moneys) {
        if (moneys.length === 0) {
            throw new Error("Need at least one money for comparison");
        }
        return moneys.reduce((max, money) => (money.greaterThan(max) ? money : max), moneys[0]);
    }
    static min(moneys) {
        if (moneys.length === 0) {
            throw new Error("Need at least one money for comparison");
        }
        return moneys.reduce((min, money) => (money.lessThan(min) ? money : min), moneys[0]);
    }
    /**
     * Compare two money objects.
     *
     * 1 if money1 is greater than money2
     * 0 if equal
     * -1 if money1 is less than money2
     *
     * This can be plugged directly into array.sort(),
     * and it will cause the array to be sorted in ascending order.
     */
    static compare(money1, money2) {
        money1.assertSameCurrency(money2);
        return money1.amount().cmp(money2.amount());
    }
    merge = (data) => {
        return new Money({ ...this._data, ...data });
    };
    /**
     * Tags allow you to communicate more about what the money represents.
     * You can later assert on a tag to make sure you're using the right amount for the right purpose.
     */
    getTags = () => {
        return this._data.tags;
    };
    getTag = (tagName, defaultValue) => {
        return this._data.tags?.[tagName] ?? defaultValue;
    };
    setTag = (tagName, value) => {
        return new Money({
            ...this._data,
            tags: { ...this._data.tags, [tagName]: value },
        });
    };
    assertTag = (tagName, value, cmp = (actual, value) => actual === value) => {
        const actualValue = this.getTag(tagName, undefined);
        if (!cmp(actualValue, value)) {
            throw new Error(`Tag assertion failed. ${tagName} should be ${value} but was ${actualValue}`);
        }
        return this;
    };
    assertSameCurrency = (money) => {
        if (money.currency() !== this.currency()) {
            throw new Error("Currencies must be the same");
        }
        return this;
    };
    amount = () => {
        return this._data.amount;
    };
    currency = () => {
        return this._data.currency;
    };
    /**
     * Converts the money amount into a whole number given in the minor unit of the currency
     */
    toFractionlessAmount = () => {
        return this.multiply(10 ** currencyToDecimals(this.currency()))
            .round(0)
            .toNumber();
    };
    /**
     * Converts to a regular javascript number.
     * Throws an error if it's not possible to do keep full precision.
     */
    toNumber = () => {
        // Don't use big.js toNumber because it sometimes returns -0.
        const str = this.toString();
        const num = Number(str);
        if (str !== this.merge({ amount: num }).toString()) {
            throw new Error("Converting to number was imprecise");
        }
        return num;
    };
    toString = () => {
        return this._data.amount.toFixed(this.getDecimals());
    };
    toLocaleString = (locale) => {
        const decimals = this.getDecimals();
        return Intl.NumberFormat(locale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(this.toNumber());
    };
    toJSON = () => {
        return this.toNumber();
    };
    /**
     * Gets the current precision in use.
     */
    getDecimals = () => {
        return this._data.decimals ?? currencyToDecimals(this.currency());
    };
    /**
     * Override the default precision of the currency.
     * Useful if you're working with a price.
     */
    setDecimals = (decimals) => {
        return this.merge({ decimals });
    };
    /**
     * Reset precision back to that of the currency.
     * Useful for converting from a price to the final monetary amount.
     */
    resetDecimals = () => {
        return this.merge({ decimals: undefined });
    };
    /**
     * Converts to a different currency using a currency rate.
     * Sometimes (rarely) the rate is given multiplied by a certain unit amount which has to be divided away.
     */
    toCurrency = (currency, currencyRate = 1, currencyUnit = 1) => {
        // Convert currency outside of Money to avoid wrong precision for the new currency.
        const amount = this.amount().mul(currencyRate).div(currencyUnit);
        return new Money({ ...this._data, amount, currency });
    };
    round = (decimals, roundingMode) => {
        const amount = this.amount().round(decimals, roundingMode ?? this._data.roundingMode);
        return this.merge({ amount });
    };
    multiply = (factor) => {
        const amount = this.amount().mul(factor);
        return this.merge({ amount });
    };
    /**
     * Note that dividing a monetary amount cannot be exact in all cases.
     * E.g. 10 NOK / 3 = 3.33 NOK
     * Use `distribute` or `distributeBy` if you need an exact distribution.
     *
     * The division is performed with a precision of 20 decimals before
     * rounding back to the monetary amount. (See https://mikemcl.github.io/big.js/#dp)
     */
    divide = (divisor) => {
        return this.merge({ amount: this.amount().div(divisor) });
    };
    add = (money) => {
        this.assertSameCurrency(money);
        return this.merge({ amount: this.amount().plus(money.amount()) });
    };
    subtract = (money) => {
        this.assertSameCurrency(money);
        return this.merge({ amount: this.amount().minus(money.amount()) });
    };
    abs = () => {
        return this.merge({ amount: this.amount().abs() });
    };
    equals = (money) => {
        return (this._data.currency === money._data.currency &&
            this.amount().eq(money.amount()));
    };
    greaterThan = (money) => {
        this.assertSameCurrency(money);
        return this.amount().gt(money.amount());
    };
    greaterThanOrEqual = (money) => {
        this.assertSameCurrency(money);
        return this.amount().gte(money.amount());
    };
    lessThan = (money) => {
        this.assertSameCurrency(money);
        return this.amount().lt(money.amount());
    };
    lessThanOrEqual = (money) => {
        this.assertSameCurrency(money);
        return this.amount().lte(money.amount());
    };
    isZero = () => {
        return this.amount().eq(0);
    };
    /**
     * Positive and not 0
     */
    isPositive = () => {
        return this.amount().gt(0);
    };
    /**
     * Negative and not 0
     */
    isNegative = () => {
        return this.amount().lt(0);
    };
    /**
     * Divides money into n parts.
     *
     * Example:
     * Money.of(10, 'NOK').distribute(3) => [3.34, 3.33, 3.33]
     * Money.of(11, 'NOK').distribute(3) => [3.36, 3.67, 3.67]
     *
     * Distributes any rest amount equally across the parts
     */
    distribute = (nParts) => {
        if (nParts !== Math.round(nParts)) {
            throw new Error("Number of parts must be a whole number");
        }
        return this.distributeBy(Array(nParts).fill(1));
    };
    /**
     * Divides money into parts, each defined by a weight.
     *
     * Each weight must be >= 0
     * Total of weights must be > 0
     *
     * Example:
     * Money.of(10, 'NOK').distributeBy([1, 1, 1]) => [3.34, 3.33, 3.33]
     *
     * Distributes any rest amount equally across the parts
     */
    distributeBy = (inputWeights) => {
        const weights = inputWeights.map((w) => (0, big_js_1.Big)(w));
        if (weights.some((w) => w.lt(0))) {
            throw new Error("Cannot distribute by negative weights");
        }
        const totalWeight = weights.reduce((a, b) => a.add(b), new big_js_1.Big(0));
        if (totalWeight.lte(0)) {
            throw new Error("Total weight must be greater than 0");
        }
        const parts = weights.map((weight) => this.multiply(weight.div(totalWeight)));
        let rest = this.subtract(Money.sum(parts, this.currency()));
        const smallestUnit = this.merge({ amount: 1 })
            .divide(10 ** this.getDecimals())
            .multiply(rest.isPositive() ? 1 : -1);
        let i = 0;
        while (!rest.isZero()) {
            if (!weights[i].eq(0)) {
                parts[i] = parts[i].add(smallestUnit);
                rest = rest.subtract(smallestUnit);
            }
            i = (i + 1) % weights.length;
        }
        /*
         * Given that we add the smallest possible unit to parts each time,
         * is it enough to go through the parts array just once?
         * Some napkin math:
         *
         * Part = round(Amount / N, Decimals)
         * Rest = Amount - Part * N
         * SmallestUnit = +/- 1/(10^Decimals)
         *
         * The question can then be phrased:
         * Rest <= N * SmallestUnit
         *
         * Let's expand:
         *
         * Amount - round(Amount / N, Decimals) * N <= +/- N / (10^Decimals)
         *
         * Express worst case error from rounding (even assuming ceil or floor):
         * round(Amount / N, Decimals) => (Amount / N) +/- 1/(10^Decimals)
         *
         * Plug back in:
         *
         * Amount - ((Amount / N) +/- 1/(10^Decimals)) * N <= +/- N / (10^Decimals)
         *
         * Reduce:
         * +/- N/(10^Decimals) <= +/- N/(10^Decimals)
         *
         * So we see that it will be enough we just one iteration through parts.
         */
        return parts;
    };
    addVat = (vatPercentage) => {
        return this.multiply(percentToMultiplier(vatPercentage)).setTag("includesVat", true);
    };
    removeVat = (vatPercentage) => {
        return this.divide(percentToMultiplier(vatPercentage)).setTag("includesVat", false);
    };
    getVat = (vatPercentage, includesVat) => {
        const withoutVat = (includesVat ?? this.getTag("includesVat", false))
            ? this.removeVat(vatPercentage)
            : this;
        return withoutVat
            .multiply(percentToRate(vatPercentage))
            .setTag("isVat", true);
    };
}
exports.Money = Money;
//# sourceMappingURL=index.js.map