import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: unknown) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

export interface ExportData {
  title: string;
  period: string;
  summary?: Array<{ label: string; value: string | number }>;
  charts?: Array<{ title: string; data: Record<string, unknown>[]; columns: string[] }>;
  tables?: Array<{ title: string; data: Record<string, unknown>[]; columns: Array<{ key: string; label: string }> }>;
}

export class ReportExporter {
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  private formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  // PDF Export
  exportToPDF(data: ExportData, filename: string): void {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(data.title, margin, yPosition);
    yPosition += 10;

    // Period
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${data.period}`, margin, yPosition);
    yPosition += 20;

    // Summary Cards
    if (data.summary && data.summary.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', margin, yPosition);
      yPosition += 10;

      const summaryData = data.summary.map(item => [
        item.label,
        typeof item.value === 'number' && item.value > 1000 
          ? this.formatCurrency(item.value)
          : typeof item.value === 'number' && item.value <= 1
          ? this.formatPercentage(item.value * 100)
          : item.value.toString()
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: margin, right: margin }
      });

      yPosition = doc.lastAutoTable.finalY + 20;
    }

    // Tables
    if (data.tables && data.tables.length > 0) {
      data.tables.forEach((table) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(table.title, margin, yPosition);
        yPosition += 10;

        const tableData = table.data.map(row => 
          table.columns.map(col => {
            const value = row[col.key];
            if (typeof value === 'number' && value > 1000) {
              return this.formatCurrency(value);
            } else if (typeof value === 'number' && value <= 1) {
              return this.formatPercentage(value * 100);
            }
            return value?.toString() || '';
          })
        );

        autoTable(doc, {
          startY: yPosition,
          head: [table.columns.map(col => col.label)],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: margin, right: margin }
        });

        yPosition = doc.lastAutoTable.finalY + 20;
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - 40,
        doc.internal.pageSize.getHeight() - 10
      );
      doc.text(
        `Generated on ${new Date().toLocaleDateString()}`,
        margin,
        doc.internal.pageSize.getHeight() - 10
      );
    }

    doc.save(`${filename}.pdf`);
  }

  // Excel Export
  exportToExcel(data: ExportData, filename: string): void {
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    if (data.summary && data.summary.length > 0) {
      const summaryData = [
        ['Metric', 'Value'],
        ...data.summary.map(item => [
          item.label,
          typeof item.value === 'number' && item.value > 1000 
            ? this.formatCurrency(item.value)
            : typeof item.value === 'number' && item.value <= 1
            ? this.formatPercentage(item.value * 100)
            : item.value.toString()
        ])
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    }

    // Data Tables
    if (data.tables && data.tables.length > 0) {
      data.tables.forEach((table) => {
        const tableData = [
          table.columns.map(col => col.label),
          ...table.data.map(row => 
            table.columns.map(col => {
              const value = row[col.key];
              if (typeof value === 'number' && value > 1000) {
                return this.formatCurrency(value);
              } else if (typeof value === 'number' && value <= 1) {
                return this.formatPercentage(value * 100);
              }
              return value?.toString() || '';
            })
          )
        ];

        const sheet = XLSX.utils.aoa_to_sheet(tableData);
        const sheetName = table.title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
      });
    }

    // Chart Data
    if (data.charts && data.charts.length > 0) {
      data.charts.forEach((chart) => {
        const chartData = [
          chart.columns,
          ...chart.data.map(row => 
            chart.columns.map(col => {
              const value = row[col];
              if (typeof value === 'number' && value > 1000) {
                return this.formatCurrency(value);
              } else if (typeof value === 'number' && value <= 1) {
                return this.formatPercentage(value * 100);
              }
              return value?.toString() || '';
            })
          )
        ];

        const sheet = XLSX.utils.aoa_to_sheet(chartData);
        const sheetName = chart.title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
      });
    }

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(dataBlob, `${filename}.xlsx`);
  }

  // CSV Export
  exportToCSV(data: ExportData, filename: string): void {
    let csvContent = `${data.title}\n`;
    csvContent += `Period: ${data.period}\n\n`;

    // Summary
    if (data.summary && data.summary.length > 0) {
      csvContent += 'Summary\n';
      csvContent += 'Metric,Value\n';
      data.summary.forEach(item => {
        const value = typeof item.value === 'number' && item.value > 1000 
          ? this.formatCurrency(item.value)
          : typeof item.value === 'number' && item.value <= 1
          ? this.formatPercentage(item.value * 100)
          : item.value.toString();
        csvContent += `"${item.label}","${value}"\n`;
      });
      csvContent += '\n';
    }

    // Tables
    if (data.tables && data.tables.length > 0) {
      data.tables.forEach((table) => {
        csvContent += `${table.title}\n`;
        csvContent += table.columns.map(col => col.label).join(',') + '\n';
        
        table.data.forEach(row => {
          const rowData = table.columns.map(col => {
            const value = row[col.key];
            if (typeof value === 'number' && value > 1000) {
              return this.formatCurrency(value);
            } else if (typeof value === 'number' && value <= 1) {
              return this.formatPercentage(value * 100);
            }
            return `"${value?.toString() || ''}"`;
          });
          csvContent += rowData.join(',') + '\n';
        });
        csvContent += '\n';
      });
    }

    // Chart Data
    if (data.charts && data.charts.length > 0) {
      data.charts.forEach((chart) => {
        csvContent += `${chart.title}\n`;
        csvContent += chart.columns.join(',') + '\n';
        
        chart.data.forEach(row => {
          const rowData = chart.columns.map(col => {
            const value = row[col];
            if (typeof value === 'number' && value > 1000) {
              return this.formatCurrency(value);
            } else if (typeof value === 'number' && value <= 1) {
              return this.formatPercentage(value * 100);
            }
            return `"${value?.toString() || ''}"`;
          });
          csvContent += rowData.join(',') + '\n';
        });
        csvContent += '\n';
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
  }

  // Export All Reports
  exportAllReports(reports: Array<{ data: ExportData; filename: string }>, format: 'pdf' | 'excel' | 'csv'): void {
    if (format === 'pdf') {
      // For PDF, combine all reports into one document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPosition = 20;

      reports.forEach((report, reportIndex) => {
        if (reportIndex > 0) {
          doc.addPage();
          yPosition = 20;
        }

        // Title
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(report.data.title, margin, yPosition);
        yPosition += 10;

        // Period
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Period: ${report.data.period}`, margin, yPosition);
        yPosition += 20;

        // Summary
        if (report.data.summary && report.data.summary.length > 0) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('Summary', margin, yPosition);
          yPosition += 10;

          const summaryData = report.data.summary.map(item => [
            item.label,
            typeof item.value === 'number' && item.value > 1000 
              ? this.formatCurrency(item.value)
              : typeof item.value === 'number' && item.value <= 1
              ? this.formatPercentage(item.value * 100)
              : item.value.toString()
          ]);

          autoTable(doc, {
            startY: yPosition,
            head: [['Metric', 'Value']],
            body: summaryData,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] },
            margin: { left: margin, right: margin }
          });

          yPosition = doc.lastAutoTable.finalY + 20;
        }

        // Tables
        if (report.data.tables && report.data.tables.length > 0) {
          report.data.tables.forEach((table) => {
            if (yPosition > 250) {
              doc.addPage();
              yPosition = 20;
            }

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(table.title, margin, yPosition);
            yPosition += 10;

            const tableData = table.data.map(row => 
              table.columns.map(col => {
                const value = row[col.key];
                if (typeof value === 'number' && value > 1000) {
                  return this.formatCurrency(value);
                } else if (typeof value === 'number' && value <= 1) {
                  return this.formatPercentage(value * 100);
                }
                return value?.toString() || '';
              })
            );

            autoTable(doc, {
              startY: yPosition,
              head: [table.columns.map(col => col.label)],
              body: tableData,
              theme: 'grid',
              headStyles: { fillColor: [59, 130, 246] },
              margin: { left: margin, right: margin }
            });

            yPosition = doc.lastAutoTable.finalY + 20;
          });
        }
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - 40,
          doc.internal.pageSize.getHeight() - 10
        );
        doc.text(
          `Generated on ${new Date().toLocaleDateString()}`,
          margin,
          doc.internal.pageSize.getHeight() - 10
        );
      }

      doc.save('All_Reports.pdf');
    } else {
      // For Excel and CSV, create separate files
      reports.forEach(report => {
        if (format === 'excel') {
          this.exportToExcel(report.data, report.filename);
        } else {
          this.exportToCSV(report.data, report.filename);
        }
      });
    }
  }
}

export const reportExporter = new ReportExporter();

