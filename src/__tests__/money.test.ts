import { Money } from '..'

describe('money', () => {
    it('should handle 0.1 + 0.2 = 0.3', () => {
        const result = Money.of(0.1, 'NOK').add(Money.of(0.2, 'NOK')).toString()
        expect(result).toBe('0.30') // Gives 0.30000000000000004 in double precision base 2
    })

    it('should handle multiplication where base 2 would round incorrectly', () => {
        const result = Money
            .of(2090.5, 'EUR')
            .toCurrency('NOK', 8.61)
            .toString()

        expect(result).toBe('17999.21') // Gives 17999.20 in double precision base 2
    })

    it('should convert float to correct decimal where base 2 rounds incorrectly', () => {
        const result = Money.of(8.165, 'NOK').toString()

        expect(result).toBe('8.17') // Gives 8.16 in double precision base 2
    })

    it('should round away from zero for negative numbers', () => {
        const result = Money.of(-1.5, 'UNKNOWN', { decimals: 0 }).toString()

        expect(result).toBe('-2') // Math.round would give -1 here
    })

    it('should round when converting to currency with less decimals', () => {
        const result = Money
            .of(1.56, 'NOK')
            .toCurrency('JPY')
            .toString()

        expect(result).toBe('2')
    })

    it('should keep precision when calculating total price', () => {
        const result = Money.fromPriceAndQuantity(0.0005, 30, 'NOK').toString()
        expect(result).toBe('0.02')
    })

    it('should keep higher precision when explicitly set', () => {
        const result = Money.fromPrice(0, 'NOK')
            .add(Money.fromPrice(0.001, 'NOK'))
            .multiply(60)
            .toString()

        expect(result).toBe('0.0600000000')
    })

    it('should be able to convert large numbers within double precision', () => {
        Money.of('1234567891234.25', 'NOK')
            .toNumber()
    })

    it('should throw when converting large numbers outside double precision', () => {
        expect(() => {
            Money.of('1234567891234567.25', 'NOK')
                .toNumber()
        }).toThrow()
    })

    it('should distribute when parts does not add to initial amount', () => {
        const parts = Money.of(1, 'NOK').distribute(3)

        expect(parts[0].toNumber()).toEqual(0.34)
        expect(parts[1].toNumber()).toEqual(0.33)
        expect(parts[2].toNumber()).toEqual(0.33)
    })

    it('should distribute when parts does not add to initial amount and theres more than one unit to distribute', () => {
        const parts = Money.of(67, 'JPY').distribute(4) // parts are 16.75, but rounded to 17 due to JPY

        expect(parts[0].toNumber()).toEqual(16)
        expect(parts[1].toNumber()).toEqual(17)
        expect(parts[2].toNumber()).toEqual(17)
        expect(parts[3].toNumber()).toEqual(17)
    })

    it('should distribute negative amounts', () => {
        const parts = Money.of(-1, 'NOK').distribute(3)

        expect(parts[0].toNumber()).toEqual(-0.34)
        expect(parts[1].toNumber()).toEqual(-0.33)
        expect(parts[2].toNumber()).toEqual(-0.33)
    })

    it('should distribute when only one part can be above 0', () => {
        const parts = Money.of(1, 'JPY').distribute(3)

        expect(parts[0].toNumber()).toEqual(1)
        expect(parts[1].toNumber()).toEqual(0)
        expect(parts[2].toNumber()).toEqual(0)
    })

    it('should distribute by weights', () => {
        const parts = Money.of(1, 'NOK').distributeBy([1, 1, 1])

        expect(parts[0].toNumber()).toEqual(0.34)
        expect(parts[1].toNumber()).toEqual(0.33)
        expect(parts[2].toNumber()).toEqual(0.33)
    })

    it('should distribute negative amount by weights', () => {
        const parts = Money.of(-1, 'NOK').distributeBy([1, 1, 1])

        expect(parts[0].toNumber()).toEqual(-0.34)
        expect(parts[1].toNumber()).toEqual(-0.33)
        expect(parts[2].toNumber()).toEqual(-0.33)
    })

    it('should distribute when one weight is 0', () => {
        const parts = Money.of(-1, 'NOK').distributeBy([1, 1, 0])

        expect(parts[0].toNumber()).toEqual(-0.5)
        expect(parts[1].toNumber()).toEqual(-0.5)
        expect(parts[2].toNumber()).toEqual(0)
    })

    it('should distribute by unequal weights', () => {
        const parts = Money.of(11, 'NOK').distributeBy([5, 7])

        expect(parts[0].toNumber()).toEqual(4.58)
        expect(parts[1].toNumber()).toEqual(6.42)
    })

    it('should instantiate from fractionless amount', () => {
        const result = Money.fromFractionlessAmount(1000, 'NOK').toString()
        expect(result).toBe('10.00')
    })

    it('should print in locale', () => {
        const result = Money.of(5.5, 'NOK').toLocaleString('no-NB')
        expect(result).toBe('5,50')
    })

    describe('fromLocaleString', () => {
        [
            { locale: 'no-NB', currency: 'NOK', fromStr: '11 111,11', toStr: '11111.11' },
            { locale: 'no-NB', currency: 'NOK', fromStr: '11 111,11kr', toStr: '11111.11' },
            { locale: 'no-NB', currency: 'NOK', fromStr: '11 111,11NOK', toStr: '11111.11' },
            { locale: 'no-NB', currency: 'NOK', fromStr: '11 111,11 NOK', toStr: '11111.11' },
            { locale: 'no-NB', currency: 'NOK', fromStr: 'NOK 11 111,11', toStr: '11111.11' },
            { locale: 'no-NB', currency: 'NOK', fromStr: '11 111', toStr: '11111.00' },
            { locale: 'no-NB', currency: 'NOK', fromStr: '-11 111,11', toStr: '-11111.11' },
            { locale: 'en-GB', currency: 'GBP', fromStr: '11,111.11', toStr: '11111.11' },
            { locale: 'en-GB', currency: 'GBP', fromStr: '-11,111.11', toStr: '-11111.11' },
            { locale: 'en-GB', currency: 'GBP', fromStr: '-£11,111.11', toStr: '-11111.11' },
            { locale: 'en-GB', currency: 'GBP', fromStr: '£-11,111.11', toStr: '-11111.11' },
            { locale: 'de-DE', currency: 'EUR', fromStr: '11.111,11', toStr: '11111.11' },
            { locale: 'de-DE', currency: 'EUR', fromStr: '-11.111,11', toStr: '-11111.11' },
            { locale: 'en-US', currency: 'USD', fromStr: '11,111.11', toStr: '11111.11' },
            { locale: 'en-US', currency: 'USD', fromStr: '-11,111.11', toStr: '-11111.11' },
            { locale: 'en-US', currency: 'USD', fromStr: '-$11,111.11', toStr: '-11111.11' },
            { locale: 'en-US', currency: 'USD', fromStr: '$-11,111.11', toStr: '-11111.11' },
            { locale: 'en-US', currency: 'USD', fromStr: '$11,111.11', toStr: '11111.11' },
            { locale: 'en-US', currency: 'USD', fromStr: '$11,111', toStr: '11111.00' },
            { locale: 'en-US', currency: 'USD', fromStr: '$-11,111', toStr: '-11111.00' },
            { locale: 'en-US', currency: 'USD', fromStr: '-$11,111', toStr: '-11111.00' },
            { locale: 'en-US', currency: 'USD', fromStr: '-$11,111 US dollars', toStr: '-11111.00' },
        ].forEach(({ locale, currency, fromStr, toStr }) => {
            it(`should parse (${locale} ${currency}) ${fromStr}`, () => {
                const result = Money.fromLocaleString(fromStr, currency, locale).toString()
                expect(result).toBe(toStr)
            })
        })
    })

    it('should add vat', () => {
        const result = Money.of(10, 'NOK').addVat(25).toString()
        expect(result).toBe('12.50')
    })

    it('should remove vat', () => {
        const result = Money.of(12.5, 'NOK').removeVat(25).toString()
        expect(result).toBe('10.00')
    })

    it('should calculate vat when amount includes vat', () => {
        const result = Money.of(12.5, 'NOK').getVat(25, true).toString()
        expect(result).toBe('2.50')
    })

    it('should calculate vat when amount does not include vat', () => {
        const result = Money.of(10, 'NOK').getVat(25, false).toString()
        expect(result).toBe('2.50')
    })

    it('should test complex performance', () => {
        const N = 1000
        const start = new Date().getTime()
        for (let i = 0; i < N; i++) {
            Money.of(Math.random(), 'NOK').add(Money.of(Math.random(), 'NOK')).toNumber()
        }
        const end = new Date().getTime()

        console.log('Complex performance', (end - start)/N, 'ms')
    })

    it('should test addition performance', () => {
        const N = 1000
        const a = Money.of(Math.random(), 'NOK')
        const b = Money.of(Math.random(), 'NOK')

        const start = new Date().getTime()

        for (let i = 0; i < N; i++) {
            a.add(b)
        }

        const end = new Date().getTime()

        console.log('Addition performance', (end - start)/N, 'ms')
    })
})
