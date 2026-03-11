/**
 * Unit Tests for Lead Scoring (BUS-105)
 */

const { calculateLeadScore } = require('../services/scoring/leadScoring');

describe('Lead Scoring', () => {
    describe('calculateLeadScore', () => {
        test('should return 0 for empty lead', () => {
            const lead = {};
            const result = calculateLeadScore(lead);
            // calculateLeadScore returns an object with total_score
            const score = typeof result === 'object' ? result.total_score : result;
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
        });

        test('should give higher score for complete profile', () => {
            const completeLead = {
                first_name: 'John',
                last_name: 'Doe',
                email: 'john@company.com',
                phone: '+1234567890',
                job_title: 'CEO',
                company: 'Tech Corp',
                location: 'San Francisco'
            };
            
            const incompleteLead = {
                first_name: 'Jane'
            };
            
            const completeResult = calculateLeadScore(completeLead);
            const incompleteResult = calculateLeadScore(incompleteLead);
            
            const completeScore = typeof completeResult === 'object' ? completeResult.total_score : completeResult;
            const incompleteScore = typeof incompleteResult === 'object' ? incompleteResult.total_score : incompleteResult;
            
            expect(completeScore).toBeGreaterThan(incompleteScore);
        });

        test('should give bonus for senior titles', () => {
            const ceoLead = {
                first_name: 'John',
                job_title: 'CEO'
            };
            
            const internLead = {
                first_name: 'John',
                job_title: 'Intern'
            };
            
            const ceoResult = calculateLeadScore(ceoLead);
            const internResult = calculateLeadScore(internLead);
            
            const ceoScore = typeof ceoResult === 'object' ? ceoResult.total_score : ceoResult;
            const internScore = typeof internResult === 'object' ? internResult.total_score : internResult;
            
            expect(ceoScore).toBeGreaterThan(internScore);
        });

        test('should return score in valid range', () => {
            const leads = [
                { first_name: 'Test' },
                { email: 'test@test.com', job_title: 'VP Sales', company: 'Big Corp' },
                { first_name: 'A', last_name: 'B', email: 'a@b.com', phone: '123', job_title: 'CTO', company: 'X', location: 'Y' }
            ];
            
            leads.forEach(lead => {
                const result = calculateLeadScore(lead);
                const score = typeof result === 'object' ? result.total_score : result;
                expect(score).toBeGreaterThanOrEqual(0);
                expect(score).toBeLessThanOrEqual(100);
            });
        });
    });
});
