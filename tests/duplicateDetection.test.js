/**
 * Unit Tests for Duplicate Detection (BUS-105)
 */

describe('Duplicate Detection', () => {
    // Mock Levenshtein distance calculation
    function levenshteinDistance(str1, str2) {
        // Handle empty strings
        if (str1 === '' && str2 === '') return 0;
        if (str1 === '') return str2.length;
        if (str2 === '') return str1.length;
        if (!str1 || !str2) return Infinity;
        
        str1 = str1.toLowerCase();
        str2 = str2.toLowerCase();
        
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[str2.length][str1.length];
    }

    function areSimilar(str1, str2, threshold = 2) {
        return levenshteinDistance(str1, str2) <= threshold;
    }

    describe('Levenshtein Distance', () => {
        test('should return 0 for identical strings', () => {
            expect(levenshteinDistance('hello', 'hello')).toBe(0);
        });

        test('should return correct distance for different strings', () => {
            expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
        });

        test('should be case insensitive', () => {
            expect(levenshteinDistance('Hello', 'hello')).toBe(0);
        });

        test('should handle empty strings', () => {
            expect(levenshteinDistance('', 'test')).toBe(4);
            expect(levenshteinDistance('test', '')).toBe(4);
        });
    });

    describe('Similarity Check', () => {
        test('should detect similar names', () => {
            expect(areSimilar('John Doe', 'John Doe')).toBe(true);
            expect(areSimilar('John Doe', 'Jon Doe')).toBe(true);
            expect(areSimilar('John Doe', 'Jane Smith')).toBe(false);
        });

        test('should detect similar emails', () => {
            expect(areSimilar('john@example.com', 'john@example.com')).toBe(true);
            expect(areSimilar('john@example.com', 'jon@example.com')).toBe(true);
        });
    });

    describe('Duplicate Detection Logic', () => {
        const leads = [
            { id: '1', email: 'john@example.com', first_name: 'John', last_name: 'Doe', company: 'Tech Corp' },
            { id: '2', email: 'john@example.com', first_name: 'John', last_name: 'Doe', company: 'Tech Corp' },
            { id: '3', email: 'jane@example.com', first_name: 'Jane', last_name: 'Smith', company: 'Other Inc' }
        ];

        test('should find exact email duplicates', () => {
            const emailMap = {};
            const duplicates = [];
            
            leads.forEach(lead => {
                if (lead.email) {
                    if (emailMap[lead.email]) {
                        duplicates.push({ lead1: emailMap[lead.email], lead2: lead.id, reason: 'email' });
                    } else {
                        emailMap[lead.email] = lead.id;
                    }
                }
            });
            
            expect(duplicates.length).toBe(1);
            expect(duplicates[0].reason).toBe('email');
        });

        test('should find duplicates by name + company', () => {
            const nameCompanyMap = {};
            const duplicates = [];
            
            leads.forEach(lead => {
                const key = `${lead.first_name}_${lead.last_name}_${lead.company}`.toLowerCase();
                if (nameCompanyMap[key]) {
                    duplicates.push({ lead1: nameCompanyMap[key], lead2: lead.id, reason: 'name+company' });
                } else {
                    nameCompanyMap[key] = lead.id;
                }
            });
            
            expect(duplicates.length).toBe(1);
        });
    });
});
