import * as XLSX from 'xlsx';

export interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  formatter?: (value: unknown, row: T) => string | number;
}

export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  const headers = columns.map(col => col.header);
  const rows = data.map(item => 
    columns.map(col => {
      const value = typeof col.key === 'string' && col.key.includes('.')
        ? getNestedValue(item, col.key)
        : (item as Record<string, unknown>)[col.key as string];
      
      if (col.formatter) {
        return col.formatter(value, item);
      }
      
      // Handle values that might contain commas or quotes
      const stringValue = value == null ? '' : String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );
  
  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile(csv, `${filename}.csv`, 'text/csv');
}

export function exportToExcel<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  sheetName: string = 'Sheet1'
): void {
  const headers = columns.map(col => col.header);
  const rows = data.map(item =>
    columns.map(col => {
      const value = typeof col.key === 'string' && col.key.includes('.')
        ? getNestedValue(item, col.key)
        : (item as Record<string, unknown>)[col.key as string];
      
      if (col.formatter) {
        return col.formatter(value, item);
      }
      return value ?? '';
    })
  );
  
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  // Auto-size columns
  const colWidths = columns.map((col, i) => {
    const headerWidth = col.header.length;
    const maxDataWidth = Math.max(...rows.map(row => String(row[i]).length));
    return { wch: Math.max(headerWidth, maxDataWidth) + 2 };
  });
  worksheet['!cols'] = colWidths;
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportViolationsToCSV(violations: ViolationExport[]): void {
  const columns: ExportColumn<ViolationExport>[] = [
    { key: 'id', header: 'ID' },
    { key: 'ruleId', header: 'Rule ID' },
    { key: 'impact', header: 'Severity' },
    { key: 'description', header: 'Description' },
    { key: 'helpUrl', header: 'WCAG Reference' },
    { key: 'pageUrl', header: 'Page URL' },
    { key: 'selector', header: 'Element Selector' },
    { key: 'html', header: 'HTML Snippet' },
    { key: 'status', header: 'Status' },
    { key: 'createdAt', header: 'Detected Date', formatter: (v) => v ? new Date(v as string).toLocaleDateString() : '' },
    { key: 'projectName', header: 'Project' },
  ];
  
  exportToCSV(violations, columns, 'violations-export');
}

export function exportViolationsToExcel(violations: ViolationExport[]): void {
  const columns: ExportColumn<ViolationExport>[] = [
    { key: 'id', header: 'ID' },
    { key: 'ruleId', header: 'Rule ID' },
    { key: 'impact', header: 'Severity' },
    { key: 'description', header: 'Description' },
    { key: 'helpUrl', header: 'WCAG Reference' },
    { key: 'pageUrl', header: 'Page URL' },
    { key: 'selector', header: 'Element Selector' },
    { key: 'status', header: 'Status' },
    { key: 'createdAt', header: 'Detected Date', formatter: (v) => v ? new Date(v as string).toLocaleDateString() : '' },
    { key: 'projectName', header: 'Project' },
  ];
  
  exportToExcel(violations, columns, 'violations-export', 'Violations');
}

export function exportProjectsToCSV(projects: ProjectExport[]): void {
  const columns: ExportColumn<ProjectExport>[] = [
    { key: 'name', header: 'Project Name' },
    { key: 'url', header: 'URL' },
    { key: 'riskScore', header: 'Risk Score' },
    { key: 'criticalCount', header: 'Critical' },
    { key: 'seriousCount', header: 'Serious' },
    { key: 'moderateCount', header: 'Moderate' },
    { key: 'minorCount', header: 'Minor' },
    { key: 'lastScanAt', header: 'Last Scan', formatter: (v) => v ? new Date(v as string).toLocaleDateString() : 'Never' },
    { key: 'status', header: 'Status' },
  ];
  
  exportToCSV(projects, columns, 'projects-export');
}

export function exportProjectsToExcel(projects: ProjectExport[]): void {
  const columns: ExportColumn<ProjectExport>[] = [
    { key: 'name', header: 'Project Name' },
    { key: 'url', header: 'URL' },
    { key: 'riskScore', header: 'Risk Score' },
    { key: 'criticalCount', header: 'Critical' },
    { key: 'seriousCount', header: 'Serious' },
    { key: 'moderateCount', header: 'Moderate' },
    { key: 'minorCount', header: 'Minor' },
    { key: 'lastScanAt', header: 'Last Scan', formatter: (v) => v ? new Date(v as string).toLocaleDateString() : 'Never' },
    { key: 'status', header: 'Status' },
  ];
  
  exportToExcel(projects, columns, 'projects-export', 'Projects');
}

export function exportScansToCSV(scans: ScanExport[]): void {
  const columns: ExportColumn<ScanExport>[] = [
    { key: 'id', header: 'Scan ID' },
    { key: 'projectName', header: 'Project' },
    { key: 'status', header: 'Status' },
    { key: 'pagesScanned', header: 'Pages Scanned' },
    { key: 'violationsFound', header: 'Violations Found' },
    { key: 'criticalCount', header: 'Critical' },
    { key: 'seriousCount', header: 'Serious' },
    { key: 'moderateCount', header: 'Moderate' },
    { key: 'minorCount', header: 'Minor' },
    { key: 'duration', header: 'Duration (s)' },
    { key: 'createdAt', header: 'Date', formatter: (v) => v ? new Date(v as string).toLocaleDateString() : '' },
  ];
  
  exportToCSV(scans, columns, 'scans-export');
}

export function exportScansToExcel(scans: ScanExport[]): void {
  const columns: ExportColumn<ScanExport>[] = [
    { key: 'id', header: 'Scan ID' },
    { key: 'projectName', header: 'Project' },
    { key: 'status', header: 'Status' },
    { key: 'pagesScanned', header: 'Pages Scanned' },
    { key: 'violationsFound', header: 'Violations Found' },
    { key: 'criticalCount', header: 'Critical' },
    { key: 'seriousCount', header: 'Serious' },
    { key: 'moderateCount', header: 'Moderate' },
    { key: 'minorCount', header: 'Minor' },
    { key: 'duration', header: 'Duration (s)' },
    { key: 'createdAt', header: 'Date', formatter: (v) => v ? new Date(v as string).toLocaleDateString() : '' },
  ];
  
  exportToExcel(scans, columns, 'scans-export', 'Scans');
}

// Helper function to get nested values
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((acc: unknown, part) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

// Helper to download file
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Type definitions
export interface ViolationExport {
  id: string;
  ruleId: string;
  impact: string;
  description: string;
  helpUrl: string;
  pageUrl: string;
  selector: string;
  html: string;
  status: string;
  createdAt: string | null;
  projectName: string;
}

export interface ProjectExport {
  name: string;
  url: string;
  riskScore: number;
  criticalCount: number;
  seriousCount: number;
  moderateCount: number;
  minorCount: number;
  lastScanAt: string | null;
  status: string;
}

export interface ScanExport {
  id: string;
  projectName: string;
  status: string;
  pagesScanned: number;
  violationsFound: number;
  criticalCount: number;
  seriousCount: number;
  moderateCount: number;
  minorCount: number;
  duration: number;
  createdAt: string;
}
