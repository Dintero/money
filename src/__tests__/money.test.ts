import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Money } from "..";

describe("money", () => {
    test("should handle 0.1 + 0.2 = 0.3", () => {
        const result = Money.of(0.1, "NOK")
            .add(Money.of(0.2, "NOK"))
            .toString();
        assert.equal(result, "0.30"); // Gives 0.30000000000000004 in double precision base 2
    });

    test("should handle multiplication where base 2 would round incorrectly", () => {
        const result = Money.of(2090.5, "EUR")
            .toCurrency("NOK", 8.61)
            .toString();

        assert.equal(result, "17999.21"); // Gives 17999.20 in double precision base 2
    });

    test("should convert float to correct decimal where base 2 rounds incorrectly", () => {
        const result = Money.of(8.165, "NOK").toString();

        assert.equal(result, "8.17"); // Gives 8.16 in double precision base 2
    });

    test("should round away from zero for negative numbers", () => {
        const result = Money.of(-1.5, "UNKNOWN", { decimals: 0 }).toString();

        assert.equal(result, "-2"); // Math.round would give -1 here
    });

    test("should round when converting to currency with less decimals", () => {
        const result = Money.of(1.56, "NOK").toCurrency("JPY").toString();

        assert.equal(result, "2");
    });

    test("should keep precision when calculating total price", () => {
        const result = Money.fromPriceAndQuantity(0.0005, 30, "NOK").toString();
        assert.equal(result, "0.02");
    });

    test("should keep higher precision when explicitly set", () => {
        const result = Money.fromPrice(0, "NOK")
            .add(Money.fromPrice(0.001, "NOK"))
            .multiply(60)
            .toString();

        assert.equal(result, "0.0600000000");
    });

    test("should be able to convert large numbers within double precision", () => {
        Money.of("1234567891234.25", "NOK").toNumber();
    });

    test("should throw when converting large numbers outside double precision", () => {
        try {
            Money.of("1234567891234567.25", "NOK").toNumber();
            assert.fail("Expected Money.of to throw, but it did not");
        } catch (err) {
            assert(err instanceof Error);
        }
    });

    test("should distribute when parts does not add to initial amount", () => {
        const parts = Money.of(1, "NOK").distribute(3);

        assert.equal(parts[0].toNumber(), 0.34);
        assert.equal(parts[1].toNumber(), 0.33);
        assert.equal(parts[2].toNumber(), 0.33);
    });

    test("should distribute when parts does not add to initial amount and theres more than one unit to distribute", () => {
        const parts = Money.of(67, "JPY").distribute(4); // parts are 16.75, but rounded to 17 due to JPY

        assert.equal(parts[0].toNumber(), 16);
        assert.equal(parts[1].toNumber(), 17);
        assert.equal(parts[2].toNumber(), 17);
        assert.equal(parts[3].toNumber(), 17);
    });

    test("should distribute negative amounts", () => {
        const parts = Money.of(-1, "NOK").distribute(3);

        assert.equal(parts[0].toNumber(), -0.34);
        assert.equal(parts[1].toNumber(), -0.33);
        assert.equal(parts[2].toNumber(), -0.33);
    });

    test("should distribute when only one part can be above 0", () => {
        const parts = Money.of(1, "JPY").distribute(3);

        assert.equal(parts[0].toNumber(), 1);
        assert.equal(parts[1].toNumber(), 0);
        assert.equal(parts[2].toNumber(), 0);
    });

    test("should distribute by weights", () => {
        const parts = Money.of(1, "NOK").distributeBy([1, 1, 1]);

        assert.equal(parts[0].toNumber(), 0.34);
        assert.equal(parts[1].toNumber(), 0.33);
        assert.equal(parts[2].toNumber(), 0.33);
    });

    test("should distribute negative amount by weights", () => {
        const parts = Money.of(-1, "NOK").distributeBy([1, 1, 1]);

        assert.equal(parts[0].toNumber(), -0.34);
        assert.equal(parts[1].toNumber(), -0.33);
        assert.equal(parts[2].toNumber(), -0.33);
    });

    test("should distribute when one weight is 0", () => {
        const parts = Money.of(-1, "NOK").distributeBy([1, 1, 0]);

        assert.equal(parts[0].toNumber(), -0.5);
        assert.equal(parts[1].toNumber(), -0.5);
        assert.equal(parts[2].toNumber(), 0);
    });

    test("should distribute rest to non-zero weights", () => {
        const parts = Money.of(-227.58, "NOK").distributeBy([
            2500, 1480, 1800, 0, 200, 425, 1935, 200, 200, 200, 200, 1200, 200,
            1540, 4500, 200, 200, 200, 200, 200, 1240, 330, 2300, 1573, 2200,
            1300, 840,
        ]);

        assert.equal(parts[0].toNumber(), -20.8);
        assert.equal(parts[1].toNumber(), -12.32);
        assert.equal(parts[2].toNumber(), -14.98);
        assert.equal(parts[3].toNumber(), 0.0);
        assert.equal(parts[4].toNumber(), -1.67);
        assert.equal(parts[5].toNumber(), -3.54);
        assert.equal(
            parts.reduce((p, c) => c.add(p), Money.of(0, "NOK")).toNumber(),
            -227.58,
        );
    });

    test("should distribute without rounding", () => {
        const parts = Money.of(3, "NOK").distributeBy([1, 2, 3]);
        assert.equal(parts[0].toNumber(), 0.5);
        assert.equal(parts[1].toNumber(), 1.0);
        assert.equal(parts[2].toNumber(), 1.5);
    });

    test("should distribute by unequal weights", () => {
        const parts = Money.of(11, "NOK").distributeBy([5, 7]);

        assert.equal(parts[0].toNumber(), 4.58);
        assert.equal(parts[1].toNumber(), 6.42);
    });

    test("should instantiate from fractionless amount", () => {
        const result = Money.fromFractionlessAmount(1000, "NOK").toString();
        assert.equal(result, "10.00");
    });

    test("should instantiate from fractionless amount and honor decimals in options", () => {
        const result = Money.fromFractionlessAmount(1000, "NOK", {
            decimals: 3,
        }).toString();
        assert.equal(result, "1.000");
    });

    test("should convert to fractionless amount", () => {
        const result = Money.of(10, "NOK").toFractionlessAmount();
        assert.equal(result, 1000);
    });

    test("should convert from fractionless amount to fractionless amount and honor decimals in options", () => {
        const result = Money.fromFractionlessAmount(1000, "NOK", {
            decimals: 3,
        }).toFractionlessAmount();
        assert.equal(result, 1000);
    });

    test("should convert from normal to fractionless amount and honor decimals in options", () => {
        const result = Money.of(10, "NOK", {
            decimals: 4,
        }).toFractionlessAmount();
        assert.equal(result, 100000);
    });

    test("should print in locale", () => {
        const result = Money.of(5.5, "NOK").toLocaleString("no-NB");
        assert.equal(result, "5,50");
    });

    describe("fromLocaleString", () => {
        for (const { locale, currency, fromStr, toStr } of [
            {
                locale: "no-NB",
                currency: "NOK",
                fromStr: "11 111,11",
                toStr: "11111.11",
            },
            {
                locale: "no-NB",
                currency: "NOK",
                fromStr: "11 111,11kr",
                toStr: "11111.11",
            },
            {
                locale: "no-NB",
                currency: "NOK",
                fromStr: "11 111,11NOK",
                toStr: "11111.11",
            },
            {
                locale: "no-NB",
                currency: "NOK",
                fromStr: "11 111,11 NOK",
                toStr: "11111.11",
            },
            {
                locale: "no-NB",
                currency: "NOK",
                fromStr: "NOK 11 111,11",
                toStr: "11111.11",
            },
            {
                locale: "no-NB",
                currency: "NOK",
                fromStr: "11 111",
                toStr: "11111.00",
            },
            {
                locale: "no-NB",
                currency: "NOK",
                fromStr: "-11 111,11",
                toStr: "-11111.11",
            },
            {
                locale: "en-GB",
                currency: "GBP",
                fromStr: "11,111.11",
                toStr: "11111.11",
            },
            {
                locale: "en-GB",
                currency: "GBP",
                fromStr: "-11,111.11",
                toStr: "-11111.11",
            },
            {
                locale: "en-GB",
                currency: "GBP",
                fromStr: "-£11,111.11",
                toStr: "-11111.11",
            },
            {
                locale: "en-GB",
                currency: "GBP",
                fromStr: "£-11,111.11",
                toStr: "-11111.11",
            },
            {
                locale: "de-DE",
                currency: "EUR",
                fromStr: "11.111,11",
                toStr: "11111.11",
            },
            {
                locale: "de-DE",
                currency: "EUR",
                fromStr: "-11.111,11",
                toStr: "-11111.11",
            },
            {
                locale: "en-US",
                currency: "USD",
                fromStr: "11,111.11",
                toStr: "11111.11",
            },
            {
                locale: "en-US",
                currency: "USD",
                fromStr: "-11,111.11",
                toStr: "-11111.11",
            },
            {
                locale: "en-US",
                currency: "USD",
                fromStr: "-$11,111.11",
                toStr: "-11111.11",
            },
            {
                locale: "en-US",
                currency: "USD",
                fromStr: "$-11,111.11",
                toStr: "-11111.11",
            },
            {
                locale: "en-US",
                currency: "USD",
                fromStr: "$11,111.11",
                toStr: "11111.11",
            },
            {
                locale: "en-US",
                currency: "USD",
                fromStr: "$11,111",
                toStr: "11111.00",
            },
            {
                locale: "en-US",
                currency: "USD",
                fromStr: "$-11,111",
                toStr: "-11111.00",
            },
            {
                locale: "en-US",
                currency: "USD",
                fromStr: "-$11,111",
                toStr: "-11111.00",
            },
            {
                locale: "en-US",
                currency: "USD",
                fromStr: "-$11,111 US dollars",
                toStr: "-11111.00",
            },
        ]) {
            test(`should parse (${locale} ${currency}) ${fromStr}`, () => {
                const result = Money.fromLocaleString(
                    fromStr,
                    currency,
                    locale,
                ).toString();
                assert.equal(result, toStr);
            });
        }
    });

    test("should add vat", () => {
        const result = Money.of(10, "NOK").addVat(25).toString();
        assert.equal(result, "12.50");
    });

    test("should remove vat", () => {
        const result = Money.of(12.5, "NOK").removeVat(25).toString();
        assert.equal(result, "10.00");
    });

    test("should calculate vat when amount includes vat", () => {
        const result = Money.of(12.5, "NOK").getVat(25, true).toString();
        assert.equal(result, "2.50");
    });

    test("should calculate vat when amount does not include vat", () => {
        const result = Money.of(10, "NOK").getVat(25, false).toString();
        assert.equal(result, "2.50");
    });

    test("should test complex performance", () => {
        const N = 1000;
        const start = Date.now();
        for (let i = 0; i < N; i++) {
            Money.of(Math.random(), "NOK")
                .add(Money.of(Math.random(), "NOK"))
                .toNumber();
        }
        const end = Date.now();

        assert((end - start) / N <= 0.1);
    });

    test("should test addition performance", () => {
        const N = 1000;
        const a = Money.of(Math.random(), "NOK");
        const b = Money.of(Math.random(), "NOK");

        const start = Date.now();

        for (let i = 0; i < N; i++) {
            a.add(b);
        }

        const end = Date.now();

        assert((end - start) / N <= 0.01);
    });
});
