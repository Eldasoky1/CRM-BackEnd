/**
 * CSV Exporter (BUS-94)
 * Export leads to CSV format
 */

/**
 * Convert leads to CSV format
 */
function leadsToCSV(leads, columns = null) {
    if (!leads || leads.length === 0) {
        return 'No data to export';
    }

    // Default columns if not specified
    const defaultColumns = [
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
        'created_at'
    ];

    const selectedColumns = columns || defaultColumns;

    // Create CSV header
    const header = selectedColumns.join(',');

    // Create CSV rows
    const rows = leads.map(lead => {
        return selectedColumns.map(col => {
            const value = lead[col];

            // Handle null/undefined
            if (value === null || value === undefined) return '';

            // Escape quotes and wrap in quotes if contains comma/quote/newline
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }

            return stringValue;
        }).join(',');
    });

    return [header, ...rows].join('\n');
}

/**
 * Export leads with metadata
 */
function exportLeadsWithMetadata(leads, metadata = {}) {
    const csv = leadsToCSV(leads);

    const metadataLines = [
        `Export Date: ${new Date().toISOString()}`,
        `Total Leads: ${leads.length}`,
        `Exported By: ${metadata.exportedBy || 'System'}`,
        '',
        ''
    ];

    return metadataLines.join('\n') + csv;
}

module.exports = {
    leadsToCSV,
    exportLeadsWithMetadata
};
