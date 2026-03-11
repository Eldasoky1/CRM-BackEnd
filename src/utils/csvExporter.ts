/**
 * CSV Export utilities for leads
 * Converted to TypeScript with proper type definitions
 */

import { Lead, ExportMetadata } from '../types';

/**
 * Convert leads array to CSV string
 */
export function leadsToCSV(leads: Lead[]): string {
    if (!leads || leads.length === 0) {
        return '';
    }

    // Define column headers
    const headers = [
        'id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'job_title',
        'company',
        'location',
        'linkedin_url',
        'lead_score',
        'status',
        'source_platform',
        'is_enriched',
        'ai_summary',
        'created_at'
    ];

    // Escape CSV values
    const escapeCSV = (value: unknown): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    // Generate rows
    const rows = leads.map(lead => {
        return headers.map(header => {
            const value = lead[header as keyof Lead];
            return escapeCSV(value);
        }).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
}

/**
 * Export leads with metadata header
 */
export function exportLeadsWithMetadata(
    leads: Lead[],
    metadata: ExportMetadata
): string {
    const metadataLines = [
        `# Export Date: ${metadata.exportDate || new Date().toISOString()}`,
        `# Total Records: ${leads.length}`,
        `# User ID: ${metadata.userId || 'N/A'}`,
        `# Filters Applied: ${metadata.filters || 'None'}`,
        ''
    ];

    const csv = leadsToCSV(leads);

    return metadataLines.join('\n') + csv;
}

/**
 * Parse CSV string to leads array
 */
export function csvToLeads(csvString: string): Partial<Lead>[] {
    const lines = csvString.trim().split('\n');

    // Skip comment lines
    const dataLines = lines.filter(line => !line.startsWith('#') && line.trim());

    if (dataLines.length < 2) {
        return [];
    }

    const headers = dataLines[0].split(',').map(h => h.trim());
    const leads: Partial<Lead>[] = [];

    for (let i = 1; i < dataLines.length; i++) {
        const values = parseCSVLine(dataLines[i]);
        const lead: Partial<Lead> = {};

        headers.forEach((header, index) => {
            const value = values[index]?.trim();
            if (value && value !== '') {
                (lead as Record<string, unknown>)[header] = value;
            }
        });

        leads.push(lead);
    }

    return leads;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (inQuotes) {
            if (char === '"' && nextChar === '"') {
                current += '"';
                i++; // Skip next quote
            } else if (char === '"') {
                inQuotes = false;
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
    }

    values.push(current);
    return values;
}
