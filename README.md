# money

Quick example

````ts
Money
  .of(2090.5, 'NOK')
  .toCurrency('NOK', 8.61)
  .toString() // 17999.21
````

See full api at the bottom of this page.

## Features

- Based on big.js, arbitrary base 10 decimal numbers. No weird results due to base 2 doubles.
- Basic math and comparisons
- Ensures correct precision for given currency
- Prevents mixed currencies in calculations
- Handle prices with arbitrary precision
- Print and parse from locale
- Print and parse from fractionless / minor unit / whole number of cents
- Rounding modes (from big.js). For example rounding half even (bankers rounding)
- Throws when encountering precision loss when converting to javascript numbers
- Money objects have tags and tag assertions. E.g. tag with includesVat=true to know that the amount has vat included.
- Everything is immutable
- Various utils
  - Calculate VAT
  - Distribute money by parts or weights (straight division doesn't work with money)

## About money in javascript / why this library exists

### Numbers in javascript are not suitable for calculations with money

Javascript uses double floating point numbers.

There are several problems with these when it comes to handling money:

- Base 2 cannot accurately represent all base 10 numbers (e.g. 0.1 + 0.2).
  This makes some calculations inaccurate, no matter the precision we choose.
  It should be mentioned that this does not mean that we cannot convert between the bases in a precise way,
  though it then should be mentioned that toFixed() is not a precise conversion
- double precision isn't infinite precision. 
  This matters when we need large numbers, or numbers with many fractional digits (like prices)
- Default rounding in javascript is wrong for negative money amounts

It's easiest to show by example:

````
// Without proper rounding, you'll accumulate small errors:
0.1 + 0.2 => 0.30000000000000004

// With proper rounding, you'll simply get wrong results:
2090.5 * 8.61 => 17999.204999999998
(2090.5 * 8.61).toFixed(2) => 17999.20 // should have been 17999.21

// Even if the console.log manages to convert to base 10 for you,
// the number might not be what you think it is inside the double,
// and toFixed doesn't actually convert to base 10 properly.
// (see also https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toFixed)
8.165.toFixed(2) => 8.16 // should have been 8.17

// Math.round rounds towards 0, which doesn't make sense with money:
Math.round(-1.5) => -1 // Should have been -2 for money

// toFixed does it the correct way though:
-1.5.toFixed(0) => -2 // Say what now

// 16 decimal digits are too much for javascript doubles
// Note how it doesn't really matter whether we're using whole numbers or not
Number(9999999999999999).toString()  => 10000000000000000 // Too big for most money amounts, so probably fine
Number(999999999999999.9).toString() => 999999999999999.9
Number(99999999999999.99).toString() => 99999999999999.98
Number(9999999999999.999).toString() => 9999999999999.998
Number(999999999999.9999).toString() => 999999999999.9999
Number(99999999999.99999).toString() => 99999999999.99998
Number(9999999999.999999).toString() => 9999999999.999998
Number(999999999.9999999).toString() => 999999999.9999999
Number(99999999.99999999).toString() => 99999999.99999999 
Number(9999999.999999999).toString() => 9999999.999999998 // If this was a price we would be in trouble
````

This library uses the excellent big.js library which does arbitrary decimal (base 10) arithmetic.
This automatically takes care of all the issues above.

### Whole numbers of cents is not enough for everything

It is often said that one should use a whole number of the minor unit of the currency, e.g. a whole number of cents.
This is (probably, see below) completely fine for transport and storage, but it is not fine for precision calculations.

Here's why:

- You still have to divide, and division introduces decimals
- You still have to convert currencies, and the rates have decimals.
- You still have to deal with prices, and those can have an arbitrary number of decimals.
  You would need bigints to deal with those since javascript only has 53 bits (15 decimal digits) available for integers.
- You probably still need to convert to and from decimal digits at some point, and .toFixed() is not accurate
- You MUST keep track of the currency and precision/scale. Any errors here and you'll be orders of magnitude off.
  This can be larger headache than you might think if you need to cover prices with arbitrary precision.
  The problem is also there for storage and transport in this case.

In this library we've chosen to use big.js to avoid all potential pitfalls with whole number calculations.

### Transporting / storing money amounts as javascript numbers

Consider that a double has 53 bits for the significand. This is the part that has exact precision.
53 binary digits amounts to 15.95 decimal digits, or 15 to be safe.

So we have 15 digits to work with. How much can we fit in those?

The worlds GDP is about 8*10^13 USD, which requires 14 digits. In cents it would be 16 digits.
So in USD we're just about able to store the entire world's GDP in cents without loss of precision.

Note that the exponent in the double doesn't change number of precise digits we get,
so it doesn't matter if we store it as a whole number or a fractional number.

In any case, it's quite likely that javascript numbers are good enough for transport and storage for most use cases,
even as fractional numbers. However, there are some potential pitfalls:

- The JSON standard doesn't define a precision for numbers, and it's up to the parser to deal with. 
  It seems quite reasonable to assume at least a double precision though.
- Most currencies have between 0 and 4 decimals after the decimal point, but crypto currencies can have a lot more.
  This might cause the precision requirement to go up.
- If you deal with prices, all bets are off. A price can have an arbitrary precision.

You'll have to know how large and precise your numbers will be before you choose how to store and transport them.

This library gives you a couple of options:

- as fractionless / whole number
- as a normal number
- as a string

As we've seen, the first two have potential problems (however unlikely),
but to mitigate the risk we make sure to throw an exception if you ever encounter these problems.

If you want to be completely safe, use strings.

### Legal operations on money

Money is in a currency, and it usually has a major (e.g. Dollars) and minor unit (e.g. Cents).

- An amount of money cannot be smaller than the minor unit (e.g. half a cent).
- Prices can have arbitrary precision, but a price is not Money until it is rounded.
- A consequence of the precision rule is that money cannot be evenly divided into chunks (e.g. 10 USD into 3 chunks will be [3.34, 3.33, 3.33])
- Money math and comparisons cannot be performed across currencies. A currency conversion to a common currency must take place first.

This library ensures that one operates on correct currencies and the correct precision for the given currency.
For intermediary calculations and price it is possible to adjust the precision.

### Performance

big.js is quite fast and lightweight, but nowhere near the performance of native numbers.

The following code takes around 0.06ms, and just the addition itself is around 0.02ms:

````ts
Money.of(Math.random(), 'NOK')
  .add(Money.of(Math.random(), 'NOK'))
  .toNumber()
````

So you can do about 260 of those within a 60 fps frame, or around 800 pure additions.
If we're talking larger jobs, you can do 300 million of the above in 5 minutes.

## API

````ts
export type AdditionalOptions = {
  decimals?: number // Override precision
  roundingMode?: RoundingMode // See big.js rounding modes
  tags?: Partial<Tags> // Tag your money to keep track of what it represents
}

export declare class Money {
  constructor(data: MoneyInputData);
  
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
   * This method creates a Money instance with 6 decimals of precision by default.
   * Remember to call .resetDecimals() when you want to go back to a proper Money value.
   */
  static fromPrice(price: NumberInput, currency: string, options?: AdditionalOptions): Money;
  /**
   * Calculate total money according to a price and quantity.
   * Default precision is 6 decimals.
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

  // Tags
  /**
   * Tags allow you to communicate more about what the money represents.
   * You can later assert on a tag to make sure you're using the right amount for the right purpose.
   */
  getTags: () => Tags;
  getTag: <Name extends keyof Tags, Value>(tagName: Name, defaultValue?: Value | undefined) => Value | undefined;
  setTag: <Name extends keyof Tags>(tagName: Name, value: any) => Money;
  
  // Assertions
  assertTag: <Name extends keyof Tags>(tagName: Name, value: any, cmp?: (actual: any, value: any) => boolean) => Money;
  assertSameCurrency: (money: Money) => Money;
  
  // Utils
  amount: () => Big;
  currency: () => string;
  
  // Converters
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
  
  //Math
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
  
  // Comparisons
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
  
  // Distribute
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
  
  // VAT
  addVat: (vatPercentage: Factor) => Money;
  removeVat: (vatPercentage: Factor) => Money;
  getVat: (vatPercentage: Factor, includesVat?: boolean | undefined) => Money;
}
````
