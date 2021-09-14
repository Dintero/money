import Big, { RoundingMode } from 'big.js';
declare type NumberInput = number | string | Big;
declare type Factor = number | Big;
declare type Tags = {
    includesVat: boolean;
    isVat: boolean;
    [key: string]: any;
};
export declare type AdditionalOptions = {
    decimals?: number;
    roundingMode?: RoundingMode;
    tags?: Partial<Tags>;
};
export declare type MoneyInputData = {
    amount: NumberInput;
    currency: string;
    decimals?: number;
    roundingMode?: RoundingMode;
    tags?: Partial<Tags>;
};
export declare class Money {
    private readonly _data;
    constructor(data: MoneyInputData);
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
    static of(amount: NumberInput, currency: string, options?: AdditionalOptions): Money;
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
    static fromLocaleString(str: string, currency: string, locale?: string, options?: AdditionalOptions): Money;
    /**
     * Instantiate from a whole number of minor units of the currency (e.g. whole number of cents)
     *
     * Example:
     * Money.fromFractionlessAmount(1000, 'NOK') => 10.00 NOK
     */
    static fromFractionlessAmount(amount: number, currency: string, options?: AdditionalOptions): Money;
    /**
     * A price has arbitrary precision.
     * This method creates a Money instance with 10 decimals of precision by default.
     * Remember to call .resetDecimals() when you want to go back to a proper Money value.
     */
    static fromPrice(price: NumberInput, currency: string, options?: AdditionalOptions): Money;
    /**
     * Calculate total money according to a price and quantity.
     * Default precision is 10 decimals.
     */
    static fromPriceAndQuantity(price: NumberInput, quantity: Factor, currency: string, options?: AdditionalOptions): Money;
    /**
     * Sum an array of moneys.
     *
     * If the array is empty, a currency must be specified so that 0 can be returned in that currency.
     *
     * The precision, rounding mode, etc, is based on the first item in the array.
     * If the array is empty, the options object will be used instead.
     */
    static sum(moneys: Money[], currency?: string, options?: AdditionalOptions): Money;
    static max(moneys: Money[]): Money;
    static min(moneys: Money[]): Money;
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
    static compare(money1: Money, money2: Money): number;
    merge: (data: Partial<MoneyInputData>) => Money;
    /**
     * Tags allow you to communicate more about what the money represents.
     * You can later assert on a tag to make sure you're using the right amount for the right purpose.
     */
    getTags: () => Tags;
    getTag: <Name extends keyof Tags, Value>(tagName: Name, defaultValue?: Value | undefined) => Value | undefined;
    setTag: <Name extends keyof Tags>(tagName: Name, value: any) => Money;
    assertTag: <Name extends keyof Tags>(tagName: Name, value: any, cmp?: (actual: any, value: any) => boolean) => Money;
    assertSameCurrency: (money: Money) => Money;
    amount: () => Big;
    currency: () => string;
    /**
     * Converts the money amount into a whole number given in the minor unit of the currency
     */
    toFractionlessAmount: () => number;
    /**
     * Converts to a regular javascript number.
     * Throws an error if it's not possible to do keep full precision.
     */
    toNumber: () => number;
    toString: () => string;
    toLocaleString: (locale?: string | undefined) => string;
    toJSON: () => number;
    /**
     * Gets the current precision in use.
     */
    getDecimals: () => number;
    /**
     * Override the default precision of the currency.
     * Useful if you're working with a price.
     */
    setDecimals: (decimals: number) => Money;
    /**
     * Reset precision back to that of the currency.
     * Useful for converting from a price to the final monetary amount.
     */
    resetDecimals: () => Money;
    /**
     * Converts to a different currency using a currency rate.
     * Sometimes (rarely) the rate is given multiplied by a certain unit amount which has to be divided away.
     */
    toCurrency: (currency: string, currencyRate?: Factor, currencyUnit?: Factor) => Money;
    round: (decimals: number, roundingMode?: RoundingMode | undefined) => Money;
    multiply: (factor: Factor) => Money;
    /**
     * Note that dividing a monetary amount cannot be exact in all cases.
     * E.g. 10 NOK / 3 = 3.33 NOK
     * Use `distribute` or `distributeBy` if you need an exact distribution.
     *
     * The division is performed with a precision of 20 decimals before
     * rounding back to the monetary amount. (See https://mikemcl.github.io/big.js/#dp)
     */
    divide: (divisor: Factor) => Money;
    add: (money: Money) => Money;
    subtract: (money: Money) => Money;
    abs: () => Money;
    equals: (money: Money) => boolean;
    greaterThan: (money: Money) => boolean;
    greaterThanOrEqual: (money: Money) => boolean;
    lessThan: (money: Money) => boolean;
    lessThanOrEqual: (money: Money) => boolean;
    isZero: () => boolean;
    /**
     * Positive and not 0
     */
    isPositive: () => boolean;
    /**
     * Negative and not 0
     */
    isNegative: () => boolean;
    /**
     * Divides money into n parts.
     *
     * Example:
     * Money.of(10, 'NOK').distribute(3) => [3.34, 3.33, 3.33]
     *
     * Distributes any rest amount equally across the parts
     */
    distribute: (nParts: number) => Money[];
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
    distributeBy: (inputWeights: Factor[]) => Money[];
    addVat: (vatPercentage: Factor) => Money;
    removeVat: (vatPercentage: Factor) => Money;
    getVat: (vatPercentage: Factor, includesVat?: boolean | undefined) => Money;
}
export {};
