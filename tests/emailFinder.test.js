/**
 * Unit Tests for Email Finder (BUS-105)
 */

describe('Email Finder', () => {
    // Email pattern generation logic
    function generateEmailPatterns(firstName, lastName, domain) {
        if (!firstName || !lastName || !domain) return [];

        const fn = firstName.toLowerCase().replace(/\s+/g, '');
        const ln = lastName.toLowerCase().replace(/\s+/g, '');
        const d = domain.toLowerCase().replace(/^www\./, '');

        return [
            `${fn}.${ln}@${d}`,
            `${fn}${ln}@${d}`,
            `${fn}@${d}`,
            `${fn[0]}${ln}@${d}`,
            `${fn}_${ln}@${d}`,
            `${fn}${ln[0]}@${d}`,
            `${ln}.${fn}@${d}`,
            `${ln}@${d}`,
        ];
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    describe('generateEmailPatterns', () => {
        test('should generate common email patterns', () => {
            const patterns = generateEmailPatterns('John', 'Doe', 'example.com');
            
            expect(patterns).toContain('john.doe@example.com');
            expect(patterns).toContain('johndoe@example.com');
            expect(patterns).toContain('john@example.com');
            expect(patterns).toContain('jdoe@example.com');
        });

        test('should handle www prefix in domain', () => {
            const patterns = generateEmailPatterns('John', 'Doe', 'www.example.com');
            expect(patterns[0]).toBe('john.doe@example.com');
        });

        test('should return empty array for missing params', () => {
            expect(generateEmailPatterns(null, 'Doe', 'example.com')).toEqual([]);
            expect(generateEmailPatterns('John', null, 'example.com')).toEqual([]);
            expect(generateEmailPatterns('John', 'Doe', null)).toEqual([]);
        });

        test('should handle names with spaces', () => {
            const patterns = generateEmailPatterns('John Paul', 'Doe', 'example.com');
            expect(patterns[0]).toBe('johnpaul.doe@example.com');
        });

        test('should generate 8 patterns', () => {
            const patterns = generateEmailPatterns('John', 'Doe', 'example.com');
            expect(patterns.length).toBe(8);
        });
    });

    describe('isValidEmail', () => {
        test('should validate correct email formats', () => {
            expect(isValidEmail('test@example.com')).toBe(true);
            expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
            expect(isValidEmail('user+tag@gmail.com')).toBe(true);
        });

        test('should reject invalid email formats', () => {
            expect(isValidEmail('invalid')).toBe(false);
            expect(isValidEmail('invalid@')).toBe(false);
            expect(isValidEmail('@domain.com')).toBe(false);
            expect(isValidEmail('user@domain')).toBe(false);
            expect(isValidEmail('')).toBe(false);
        });
    });
});
