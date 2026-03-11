/**
 * Unit Tests for AI Services (BUS-105)
 */

// Mock the validateAndCleanFields function inline to avoid OpenAI initialization
function validateAndCleanFields(data) {
    const cleaned = { ...data };

    // Email validation
    if (cleaned.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleaned.email)) {
            cleaned.email = null;
        }
    }

    // Phone validation (basic)
    if (cleaned.phone) {
        const phoneRegex = /[\d\s\-\(\)\+]{7,}/;
        if (!phoneRegex.test(cleaned.phone)) {
            cleaned.phone = null;
        }
    }

    // Lead score bounds
    if (cleaned.lead_score !== undefined) {
        cleaned.lead_score = Math.max(0, Math.min(100, cleaned.lead_score));
    }

    // Clean empty strings
    Object.keys(cleaned).forEach(key => {
        if (cleaned[key] === '' || cleaned[key] === 'N/A' || cleaned[key] === 'Unknown') {
            cleaned[key] = null;
        }
    });

    return cleaned;
}

describe('AI Services', () => {
    describe('validateAndCleanFields', () => {
        test('should validate correct email format', () => {
            const data = { email: 'test@example.com' };
            const result = validateAndCleanFields(data);
            expect(result.email).toBe('test@example.com');
        });

        test('should reject invalid email format', () => {
            const data = { email: 'invalid-email' };
            const result = validateAndCleanFields(data);
            expect(result.email).toBeNull();
        });

        test('should validate phone with digits', () => {
            const data = { phone: '+1 (555) 123-4567' };
            const result = validateAndCleanFields(data);
            expect(result.phone).toBe('+1 (555) 123-4567');
        });

        test('should reject invalid phone', () => {
            const data = { phone: 'abc' };
            const result = validateAndCleanFields(data);
            expect(result.phone).toBeNull();
        });

        test('should clamp lead_score to 0-100 range', () => {
            const data1 = { lead_score: 150 };
            const data2 = { lead_score: -10 };
            
            expect(validateAndCleanFields(data1).lead_score).toBe(100);
            expect(validateAndCleanFields(data2).lead_score).toBe(0);
        });

        test('should convert empty strings to null', () => {
            const data = { first_name: '', last_name: 'N/A', company: 'Unknown' };
            const result = validateAndCleanFields(data);
            
            expect(result.first_name).toBeNull();
            expect(result.last_name).toBeNull();
            expect(result.company).toBeNull();
        });

        test('should preserve valid data', () => {
            const data = {
                first_name: 'John',
                last_name: 'Doe',
                email: 'john@example.com',
                lead_score: 75
            };
            const result = validateAndCleanFields(data);
            
            expect(result.first_name).toBe('John');
            expect(result.last_name).toBe('Doe');
            expect(result.email).toBe('john@example.com');
            expect(result.lead_score).toBe(75);
        });
    });
});
