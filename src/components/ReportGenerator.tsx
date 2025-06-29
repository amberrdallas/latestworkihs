import React, { useState, useMemo } from 'react';
import { Download, FileText, X, Calendar, Filter, CheckCircle, AlertCircle, Users, Building, MapPin, Plane, Hash, Search, User, Plus, Trash2, Phone, CreditCard, Car as IdCard, FileSpreadsheet, FileType } from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun } from 'docx';
import saveAs from 'file-saver';
import { Housemaid } from '../types/housemaid';

interface ReportGeneratorProps {
  housemaids: Housemaid[];
  onClose: () => void;
}

interface ReportFilters {
  includePhotos: boolean;
  includeCV: boolean;
  statusFilter: 'all' | 'pending' | 'complete';
  locationFilter: 'all' | 'inside' | 'outside';
  employmentFilter: 'all' | 'probationary' | 'permanent';
  dateRange: {
    from: string;
    to: string;
  };
  reportType: 'all' | 'selected';
  selectedHousemaids: string[]; // Array of housemaid IDs
  exportFormat: 'pdf' | 'excel' | 'word';
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ housemaids, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ReportFilters>({
    includePhotos: true,
    includeCV: false,
    statusFilter: 'all',
    locationFilter: 'all',
    employmentFilter: 'all',
    dateRange: {
      from: '',
      to: ''
    },
    reportType: 'all',
    selectedHousemaids: [],
    exportFormat: 'pdf'
  });

  // Enhanced search functionality for housemaid selection
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    return housemaids.filter(housemaid => {
      const searchLower = searchTerm.toLowerCase();
      
      // Handle migration from old passport structure to new identity structure
      const passportNumber = housemaid.identity?.passportNumber || (housemaid as any).passport?.number || '';
      const passportCountry = housemaid.identity?.passportCountry || (housemaid as any).passport?.country || '';
      const residentId = housemaid.identity?.residentId || '';
      
      return (
        // Name search
        housemaid.personalInfo.name.toLowerCase().includes(searchLower) ||
        // Housemaid number search
        (housemaid.housemaidNumber && housemaid.housemaidNumber.toLowerCase().includes(searchLower)) ||
        // Mobile number search
        housemaid.personalInfo.phone.toLowerCase().includes(searchLower) ||
        // Employer mobile search
        housemaid.employer.mobileNumber.toLowerCase().includes(searchLower) ||
        // Passport number search
        passportNumber.toLowerCase().includes(searchLower) ||
        // Passport country search
        passportCountry.toLowerCase().includes(searchLower) ||
        // Resident ID search
        residentId.toLowerCase().includes(searchLower) ||
        // Email search
        (housemaid.personalInfo.email && housemaid.personalInfo.email.toLowerCase().includes(searchLower))
      );
    }).slice(0, 15); // Increased limit to 15 results for better coverage
  }, [housemaids, searchTerm]);

  const filteredHousemaids = useMemo(() => {
    let baseHousemaids = housemaids;

    // If specific housemaids are selected, filter to only those
    if (filters.reportType === 'selected' && filters.selectedHousemaids.length > 0) {
      baseHousemaids = housemaids.filter(h => filters.selectedHousemaids.includes(h.id));
    }

    return baseHousemaids.filter(housemaid => {
      // Status filter
      if (filters.statusFilter !== 'all' && housemaid.complaint.status !== filters.statusFilter) {
        return false;
      }

      // Location filter
      if (filters.locationFilter !== 'all') {
        const isInside = housemaid.locationStatus.isInsideCountry;
        if (filters.locationFilter === 'inside' && !isInside) return false;
        if (filters.locationFilter === 'outside' && isInside) return false;
      }

      // Employment filter
      if (filters.employmentFilter !== 'all' && housemaid.employment?.status !== filters.employmentFilter) {
        return false;
      }

      // Date range filter
      if (filters.dateRange.from || filters.dateRange.to) {
        const createdDate = new Date(housemaid.createdAt);
        if (filters.dateRange.from && createdDate < new Date(filters.dateRange.from)) return false;
        if (filters.dateRange.to && createdDate > new Date(filters.dateRange.to)) return false;
      }

      return true;
    });
  }, [housemaids, filters]);

  const selectedHousemaidsData = useMemo(() => {
    return housemaids.filter(h => filters.selectedHousemaids.includes(h.id));
  }, [housemaids, filters.selectedHousemaids]);

  // Helper function to get search match type and highlight relevant info
  const getSearchMatchInfo = (housemaid: Housemaid, searchTerm: string) => {
    const searchLower = searchTerm.toLowerCase();
    const passportNumber = housemaid.identity?.passportNumber || (housemaid as any).passport?.number || '';
    const residentId = housemaid.identity?.residentId || '';
    
    if (housemaid.personalInfo.name.toLowerCase().includes(searchLower)) {
      return { type: 'name', icon: User, text: 'Name match' };
    }
    if (housemaid.housemaidNumber && housemaid.housemaidNumber.toLowerCase().includes(searchLower)) {
      return { type: 'number', icon: Hash, text: 'Housemaid number match' };
    }
    if (housemaid.personalInfo.phone.toLowerCase().includes(searchLower)) {
      return { type: 'phone', icon: Phone, text: 'Mobile number match' };
    }
    if (housemaid.employer.mobileNumber.toLowerCase().includes(searchLower)) {
      return { type: 'employer-phone', icon: Phone, text: 'Employer mobile match' };
    }
    if (passportNumber.toLowerCase().includes(searchLower)) {
      return { type: 'passport', icon: CreditCard, text: 'Passport number match' };
    }
    if (residentId.toLowerCase().includes(searchLower)) {
      return { type: 'resident', icon: IdCard, text: 'Resident ID match' };
    }
    if (housemaid.personalInfo.email && housemaid.personalInfo.email.toLowerCase().includes(searchLower)) {
      return { type: 'email', icon: User, text: 'Email match' };
    }
    
    return { type: 'other', icon: Search, text: 'Match found' };
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Generate Excel Report
  const generateExcelReport = async () => {
    setIsGenerating(true);
    
    try {
      const workbook = XLSX.utils.book_new();
      
      // Summary Sheet
      const summaryData = [
        ['Housemaid Database Report'],
        ['Generated on:', formatDate(new Date().toISOString())],
        ['Total Records:', filteredHousemaids.length],
        ['Report Type:', filters.reportType === 'selected' ? 'Selected Housemaids' : 'All Housemaids'],
        [],
        ['Summary Statistics'],
        ['Total Records', filteredHousemaids.length],
        ['With Housemaid Numbers', filteredHousemaids.filter(h => h.housemaidNumber).length],
        ['Pending Complaints', filteredHousemaids.filter(h => h.complaint.status === 'pending').length],
        ['Resolved Complaints', filteredHousemaids.filter(h => h.complaint.status === 'complete').length],
        ['Outside Country', filteredHousemaids.filter(h => !h.locationStatus.isInsideCountry).length],
        ['Probationary Status', filteredHousemaids.filter(h => h.employment?.status === 'probationary').length],
        ['With Profile Photos', filteredHousemaids.filter(h => h.profilePhoto?.fileData).length],
        ['With CV/Resume', filteredHousemaids.filter(h => h.cv?.fileData).length]
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Main Data Sheet
      const headers = [
        'Housemaid Number',
        'Full Name',
        'Email',
        'Phone',
        'Citizenship',
        'Country',
        'City',
        'Address',
        'Passport Number',
        'Passport Country',
        'Resident ID',
        'Location Status',
        'Exit Date',
        'Outside Country Date',
        'Flight Date',
        'Flight Number',
        'Destination',
        'Employer Name',
        'Employer Phone',
        'Employment Status',
        'Contract Period (Years)',
        'Start Date',
        'End Date',
        'Position',
        'Salary',
        'Complaint Status',
        'Complaint Description',
        'Date Reported',
        'Date Resolved',
        'Resolution Description',
        'Has Profile Photo',
        'Has CV',
        'Created Date',
        'Updated Date'
      ];

      const data = filteredHousemaids.map(housemaid => {
        const passportNumber = housemaid.identity?.passportNumber || (housemaid as any).passport?.number || '';
        const passportCountry = housemaid.identity?.passportCountry || (housemaid as any).passport?.country || '';
        const residentId = housemaid.identity?.residentId || '';

        return [
          housemaid.housemaidNumber || '',
          housemaid.personalInfo.name,
          housemaid.personalInfo.email || '',
          housemaid.personalInfo.phone,
          housemaid.personalInfo.citizenship || '',
          housemaid.personalInfo.country || '',
          housemaid.personalInfo.city || '',
          housemaid.personalInfo.address,
          passportNumber,
          passportCountry,
          residentId,
          housemaid.locationStatus.isInsideCountry ? 'Inside Country' : 'Outside Country',
          housemaid.locationStatus.exitDate || '',
          housemaid.locationStatus.outsideCountryDate || '',
          housemaid.flightInfo?.flightDate || '',
          housemaid.flightInfo?.flightNumber || '',
          housemaid.flightInfo?.destination || '',
          housemaid.employer.name,
          housemaid.employer.mobileNumber,
          housemaid.employment?.status === 'probationary' ? 'Probationary' : 'Permanent',
          housemaid.employment?.contractPeriodYears || '',
          housemaid.employment?.startDate || '',
          housemaid.employment?.endDate || '',
          housemaid.employment?.position || '',
          housemaid.employment?.salary || '',
          housemaid.complaint.status === 'pending' ? 'Pending' : 'Complete',
          housemaid.complaint.description || '',
          housemaid.complaint.dateReported,
          housemaid.complaint.dateResolved || '',
          housemaid.complaint.resolutionDescription || '',
          housemaid.profilePhoto?.fileData ? 'Yes' : 'No',
          housemaid.cv?.fileData ? 'Yes' : 'No',
          formatDate(housemaid.createdAt),
          formatDate(housemaid.updatedAt)
        ];
      });

      const mainSheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
      
      // Auto-size columns
      const colWidths = headers.map((header, i) => {
        const maxLength = Math.max(
          header.length,
          ...data.map(row => String(row[i] || '').length)
        );
        return { wch: Math.min(maxLength + 2, 50) };
      });
      mainSheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, mainSheet, 'Housemaid Data');

      // Save the file
      const reportTypeText = filters.reportType === 'selected' ? 'selected' : 'all';
      const fileName = `housemaid_report_${reportTypeText}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

    } catch (error) {
      console.error('Error generating Excel report:', error);
      alert('Error generating Excel report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate Word Report
  const generateWordReport = async () => {
    setIsGenerating(true);
    
    try {
      const reportTitle = filters.reportType === 'selected' 
        ? 'Selected Housemaid Records Report' 
        : 'Housemaid Database Report';

      const children = [
        // Title
        new Paragraph({
          children: [
            new TextRun({
              text: reportTitle,
              bold: true,
              size: 32,
            }),
          ],
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        }),

        // Report metadata
        new Paragraph({
          children: [
            new TextRun({
              text: `Generated on: ${formatDate(new Date().toISOString())}`,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: `Total Records: ${filteredHousemaids.length}`,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),

        new Paragraph({ text: "" }), // Empty line

        // Summary Statistics
        new Paragraph({
          children: [
            new TextRun({
              text: "Summary Statistics",
              bold: true,
              size: 28,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: `• Total Records: ${filteredHousemaids.length}\n`,
            }),
            new TextRun({
              text: `• With Housemaid Numbers: ${filteredHousemaids.filter(h => h.housemaidNumber).length}\n`,
            }),
            new TextRun({
              text: `• Pending Complaints: ${filteredHousemaids.filter(h => h.complaint.status === 'pending').length}\n`,
            }),
            new TextRun({
              text: `• Resolved Complaints: ${filteredHousemaids.filter(h => h.complaint.status === 'complete').length}\n`,
            }),
            new TextRun({
              text: `• Outside Country: ${filteredHousemaids.filter(h => !h.locationStatus.isInsideCountry).length}\n`,
            }),
            new TextRun({
              text: `• Probationary Status: ${filteredHousemaids.filter(h => h.employment?.status === 'probationary').length}\n`,
            }),
            new TextRun({
              text: `• With Profile Photos: ${filteredHousemaids.filter(h => h.profilePhoto?.fileData).length}\n`,
            }),
            new TextRun({
              text: `• With CV/Resume: ${filteredHousemaids.filter(h => h.cv?.fileData).length}`,
            }),
          ],
        }),

        new Paragraph({ text: "" }), // Empty line
      ];

      // Individual Records
      filteredHousemaids.forEach((housemaid, index) => {
        const passportNumber = housemaid.identity?.passportNumber || (housemaid as any).passport?.number || '';
        const passportCountry = housemaid.identity?.passportCountry || (housemaid as any).passport?.country || '';
        const residentId = housemaid.identity?.residentId || '';

        // Record header
        const headerText = housemaid.housemaidNumber 
          ? `${index + 1}. ${housemaid.personalInfo.name} (${housemaid.housemaidNumber})`
          : `${index + 1}. ${housemaid.personalInfo.name}`;

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: headerText,
                bold: true,
                size: 24,
              }),
            ],
            heading: HeadingLevel.HEADING_2,
          })
        );

        // Create a table for the housemaid data
        const tableRows = [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph("Field")],
                width: { size: 30, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [new Paragraph("Value")],
                width: { size: 70, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
        ];

        // Add data rows
        const dataRows = [
          ...(housemaid.housemaidNumber ? [["Housemaid Number", housemaid.housemaidNumber]] : []),
          ["Full Name", housemaid.personalInfo.name],
          ["Email", housemaid.personalInfo.email || "Not provided"],
          ["Phone", housemaid.personalInfo.phone],
          ["Citizenship", housemaid.personalInfo.citizenship || "Not provided"],
          ["Country", housemaid.personalInfo.country || "Not provided"],
          ["City", housemaid.personalInfo.city || "Not provided"],
          ["Address", housemaid.personalInfo.address],
          ["Passport Number", passportNumber],
          ["Passport Country", passportCountry],
          ...(residentId ? [["Resident ID", residentId]] : []),
          ["Location Status", housemaid.locationStatus.isInsideCountry ? "Inside Country" : "Outside Country"],
          ...(housemaid.locationStatus.exitDate ? [["Exit Date", formatDate(housemaid.locationStatus.exitDate)]] : []),
          ...(housemaid.locationStatus.outsideCountryDate ? [["Outside Country Date", formatDate(housemaid.locationStatus.outsideCountryDate)]] : []),
          ...(housemaid.flightInfo?.flightDate ? [["Flight Date", formatDate(housemaid.flightInfo.flightDate)]] : []),
          ...(housemaid.flightInfo?.flightNumber ? [["Flight Number", housemaid.flightInfo.flightNumber]] : []),
          ...(housemaid.flightInfo?.destination ? [["Destination", housemaid.flightInfo.destination]] : []),
          ["Employer Name", housemaid.employer.name],
          ["Employer Phone", housemaid.employer.mobileNumber],
          ...(housemaid.employment ? [
            ["Employment Status", housemaid.employment.status === 'probationary' ? 'Probationary' : 'Permanent'],
            ["Contract Period", `${housemaid.employment.contractPeriodYears} years`],
            ...(housemaid.employment.startDate ? [["Start Date", formatDate(housemaid.employment.startDate)]] : []),
            ...(housemaid.employment.endDate ? [["End Date", formatDate(housemaid.employment.endDate)]] : []),
            ...(housemaid.employment.position ? [["Position", housemaid.employment.position]] : []),
            ...(housemaid.employment.salary ? [["Salary", housemaid.employment.salary]] : []),
          ] : []),
          ["Complaint Status", housemaid.complaint.status === 'pending' ? 'Pending' : 'Complete'],
          ["Complaint Description", housemaid.complaint.description || "No complaint recorded"],
          ["Date Reported", formatDate(housemaid.complaint.dateReported)],
          ...(housemaid.complaint.dateResolved ? [["Date Resolved", formatDate(housemaid.complaint.dateResolved)]] : []),
          ...(housemaid.complaint.resolutionDescription ? [["Resolution", housemaid.complaint.resolutionDescription]] : []),
          ...(housemaid.cv?.fileName ? [["CV File", housemaid.cv.fileName]] : []),
          ["Created", formatDate(housemaid.createdAt)],
          ["Updated", formatDate(housemaid.updatedAt)],
        ];

        dataRows.forEach(([field, value]) => {
          tableRows.push(
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: field, bold: true })] })],
                }),
                new TableCell({
                  children: [new Paragraph(value)],
                }),
              ],
            })
          );
        });

        const table = new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        });

        children.push(table, new Paragraph({ text: "" })); // Add table and empty line
      });

      // Create document
      const doc = new Document({
        sections: [
          {
            children: children,
          },
        ],
      });

      // Generate and save
      const buffer = await Packer.toBuffer(doc);
      const reportTypeText = filters.reportType === 'selected' ? 'selected' : 'all';
      const fileName = `housemaid_report_${reportTypeText}_${new Date().toISOString().split('T')[0]}.docx`;
      saveAs(new Blob([buffer]), fileName);

    } catch (error) {
      console.error('Error generating Word report:', error);
      alert('Error generating Word report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate PDF Report (existing function)
  const generatePDFReport = async () => {
    setIsGenerating(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Helper function to add new page if needed
      const checkPageBreak = (requiredHeight: number) => {
        if (yPosition + requiredHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Helper function to add text with word wrap
      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10) => {
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, maxWidth);
        pdf.text(lines, x, y);
        return lines.length * (fontSize * 0.35); // Return height used
      };

      // Header
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      const reportTitle = filters.reportType === 'selected' 
        ? 'Selected Housemaid Records Report' 
        : 'Housemaid Database Report';
      pdf.text(reportTitle, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Report metadata
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on: ${formatDate(new Date().toISOString())}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
      pdf.text(`Total Records: ${filteredHousemaids.length}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
      
      if (filters.reportType === 'selected') {
        pdf.text(`Report Type: Selected Housemaids`, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
      }
      
      yPosition += 10;

      // Summary Statistics
      checkPageBreak(60);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Summary Statistics', margin, yPosition);
      yPosition += 10;

      const stats = {
        total: filteredHousemaids.length,
        pendingComplaints: filteredHousemaids.filter(h => h.complaint.status === 'pending').length,
        resolvedComplaints: filteredHousemaids.filter(h => h.complaint.status === 'complete').length,
        outsideCountry: filteredHousemaids.filter(h => !h.locationStatus.isInsideCountry).length,
        probationary: filteredHousemaids.filter(h => h.employment?.status === 'probationary').length,
        withPhotos: filteredHousemaids.filter(h => h.profilePhoto?.fileData).length,
        withCV: filteredHousemaids.filter(h => h.cv?.fileData).length,
        withNumbers: filteredHousemaids.filter(h => h.housemaidNumber).length
      };

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const statsText = [
        `• Total Records: ${stats.total}`,
        `• With Housemaid Numbers: ${stats.withNumbers}`,
        `• Pending Complaints: ${stats.pendingComplaints}`,
        `• Resolved Complaints: ${stats.resolvedComplaints}`,
        `• Outside Country: ${stats.outsideCountry}`,
        `• Probationary Status: ${stats.probationary}`,
        `• With Profile Photos: ${stats.withPhotos}`,
        `• With CV/Resume: ${stats.withCV}`
      ];

      statsText.forEach(stat => {
        pdf.text(stat, margin + 5, yPosition);
        yPosition += 6;
      });

      yPosition += 10;

      // Individual Records (abbreviated for PDF)
      for (let i = 0; i < filteredHousemaids.length; i++) {
        const housemaid = filteredHousemaids[i];
        
        checkPageBreak(filters.includePhotos ? 120 : 80);

        // Record header with housemaid number
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        const headerText = housemaid.housemaidNumber 
          ? `${i + 1}. ${housemaid.personalInfo.name} (${housemaid.housemaidNumber})`
          : `${i + 1}. ${housemaid.personalInfo.name}`;
        pdf.text(headerText, margin, yPosition);
        yPosition += 10;

        // Profile photo if included
        if (filters.includePhotos && housemaid.profilePhoto?.fileData) {
          try {
            const photoSize = 30;
            pdf.addImage(
              housemaid.profilePhoto.fileData,
              'JPEG',
              pageWidth - margin - photoSize,
              yPosition - 8,
              photoSize,
              photoSize
            );
          } catch (error) {
            console.warn('Could not add photo for', housemaid.personalInfo.name);
          }
        }

        // Essential information only for PDF
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        const essentialInfo = [
          `Phone: ${housemaid.personalInfo.phone}`,
          `Employer: ${housemaid.employer.name}`,
          `Status: ${housemaid.complaint.status === 'pending' ? 'Pending' : 'Complete'}`,
          `Location: ${housemaid.locationStatus.isInsideCountry ? 'Inside Country' : 'Outside Country'}`,
        ];

        essentialInfo.forEach(info => {
          pdf.text(info, margin + 5, yPosition);
          yPosition += 5;
        });

        yPosition += 10;
      }

      // Footer
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        `Report generated from Housemaid Database Management System - ${new Date().toLocaleString()}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      // Save the PDF
      const reportTypeText = filters.reportType === 'selected' ? 'selected' : 'all';
      const fileName = `housemaid_report_${reportTypeText}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Main generate function that routes to appropriate format
  const generateReport = async () => {
    switch (filters.exportFormat) {
      case 'pdf':
        await generatePDFReport();
        break;
      case 'excel':
        await generateExcelReport();
        break;
      case 'word':
        await generateWordReport();
        break;
      default:
        await generatePDFReport();
    }
  };

  const updateFilter = (key: keyof ReportFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateDateRange = (key: 'from' | 'to', value: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [key]: value
      }
    }));
  };

  const addSelectedHousemaid = (housemaidId: string) => {
    if (!filters.selectedHousemaids.includes(housemaidId)) {
      setFilters(prev => ({
        ...prev,
        selectedHousemaids: [...prev.selectedHousemaids, housemaidId]
      }));
    }
    setSearchTerm(''); // Clear search after selection
  };

  const removeSelectedHousemaid = (housemaidId: string) => {
    setFilters(prev => ({
      ...prev,
      selectedHousemaids: prev.selectedHousemaids.filter(id => id !== housemaidId)
    }));
  };

  const clearAllSelected = () => {
    setFilters(prev => ({
      ...prev,
      selectedHousemaids: []
    }));
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return FileText;
      case 'excel':
        return FileSpreadsheet;
      case 'word':
        return FileType;
      default:
        return FileText;
    }
  };

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'pdf':
        return 'Professional PDF with photos and formatting';
      case 'excel':
        return 'Spreadsheet with all data in structured format';
      case 'word':
        return 'Document with detailed information and tables';
      default:
        return 'Professional PDF with photos and formatting';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Generate Data Report</h3>
            <p className="text-sm text-gray-600 mt-1">Create comprehensive reports in PDF, Excel, or Word format</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-6">
            {/* Export Format Selection */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Export Format</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['pdf', 'excel', 'word'] as const).map((format) => {
                  const IconComponent = getFormatIcon(format);
                  return (
                    <label key={format} className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="exportFormat"
                        value={format}
                        checked={filters.exportFormat === format}
                        onChange={(e) => updateFilter('exportFormat', e.target.value)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center">
                          <IconComponent className="h-5 w-5 text-blue-600 mr-2" />
                          <span className="font-medium text-gray-900 capitalize">{format}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{getFormatDescription(format)}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Report Type Selection */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Report Type</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="reportType"
                    value="all"
                    checked={filters.reportType === 'all'}
                    onChange={(e) => updateFilter('reportType', e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-3">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="font-medium text-gray-900">All Housemaids</span>
                    </div>
                    <p className="text-sm text-gray-600">Generate report for all housemaids (with filters)</p>
                  </div>
                </label>
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="reportType"
                    value="selected"
                    checked={filters.reportType === 'selected'}
                    onChange={(e) => updateFilter('reportType', e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-3">
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-green-600 mr-2" />
                      <span className="font-medium text-gray-900">Selected Housemaids</span>
                    </div>
                    <p className="text-sm text-gray-600">Generate report for specific housemaids only</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Housemaid Selection (only show when "selected" is chosen) */}
            {filters.reportType === 'selected' && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Select Housemaids</h4>
                
                {/* Enhanced Search Box */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, housemaid number, mobile number, passport number, or resident ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  {/* Search Help Text */}
                  <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-4">
                    <span className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      Name
                    </span>
                    <span className="flex items-center">
                      <Hash className="h-3 w-3 mr-1" />
                      Housemaid #
                    </span>
                    <span className="flex items-center">
                      <Phone className="h-3 w-3 mr-1" />
                      Mobile #
                    </span>
                    <span className="flex items-center">
                      <CreditCard className="h-3 w-3 mr-1" />
                      Passport #
                    </span>
                    <span className="flex items-center">
                      <IdCard className="h-3 w-3 mr-1" />
                      Resident ID
                    </span>
                  </div>
                  
                  {/* Enhanced Search Results */}
                  {searchTerm && searchResults.length > 0 && (
                    <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {searchResults.map((housemaid) => {
                        const matchInfo = getSearchMatchInfo(housemaid, searchTerm);
                        const passportNumber = housemaid.identity?.passportNumber || (housemaid as any).passport?.number || '';
                        const residentId = housemaid.identity?.residentId || '';
                        const IconComponent = matchInfo.icon;
                        
                        return (
                          <button
                            key={housemaid.id}
                            onClick={() => addSelectedHousemaid(housemaid.id)}
                            disabled={filters.selectedHousemaids.includes(housemaid.id)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <p className="font-medium text-gray-900">{housemaid.personalInfo.name}</p>
                                  {housemaid.housemaidNumber && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                      <Hash className="h-3 w-3 mr-1" />
                                      {housemaid.housemaidNumber}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                                  <div className="flex items-center">
                                    <Phone className="h-3 w-3 mr-1" />
                                    <span>{housemaid.personalInfo.phone}</span>
                                  </div>
                                  {passportNumber && (
                                    <div className="flex items-center">
                                      <CreditCard className="h-3 w-3 mr-1" />
                                      <span>{passportNumber}</span>
                                    </div>
                                  )}
                                  {housemaid.employer.mobileNumber && (
                                    <div className="flex items-center">
                                      <Building className="h-3 w-3 mr-1" />
                                      <span>{housemaid.employer.mobileNumber}</span>
                                    </div>
                                  )}
                                  {residentId && (
                                    <div className="flex items-center">
                                      <IdCard className="h-3 w-3 mr-1" />
                                      <span>{residentId}</span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex items-center mt-1">
                                  <IconComponent className="h-3 w-3 mr-1 text-green-600" />
                                  <span className="text-xs text-green-600 font-medium">{matchInfo.text}</span>
                                </div>
                              </div>
                              
                              <div className="ml-4">
                                {filters.selectedHousemaids.includes(housemaid.id) ? (
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                  <Plus className="h-5 w-5 text-blue-600" />
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  
                  {searchTerm && searchResults.length === 0 && (
                    <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-600">
                      <Search className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                      <p>No housemaids found matching "{searchTerm}"</p>
                      <p className="text-xs mt-1">Try searching by name, housemaid number, mobile number, passport number, or resident ID</p>
                    </div>
                  )}
                </div>

                {/* Selected Housemaids */}
                {filters.selectedHousemaids.length > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-blue-900">Selected Housemaids ({filters.selectedHousemaids.length})</h5>
                      <button
                        onClick={clearAllSelected}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedHousemaidsData.map((housemaid) => {
                        const passportNumber = housemaid.identity?.passportNumber || (housemaid as any).passport?.number || '';
                        
                        return (
                          <div key={housemaid.id} className="flex items-center justify-between bg-white p-3 rounded border">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <p className="font-medium text-gray-900">{housemaid.personalInfo.name}</p>
                                {housemaid.housemaidNumber && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                    <Hash className="h-3 w-3 mr-1" />
                                    {housemaid.housemaidNumber}
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs text-gray-600">
                                <div className="flex items-center">
                                  <Phone className="h-3 w-3 mr-1" />
                                  <span>{housemaid.personalInfo.phone}</span>
                                </div>
                                {passportNumber && (
                                  <div className="flex items-center">
                                    <CreditCard className="h-3 w-3 mr-1" />
                                    <span>{passportNumber}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => removeSelectedHousemaid(housemaid.id)}
                              className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                              title="Remove from selection"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {filters.selectedHousemaids.length === 0 && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                      <div>
                        <p className="text-yellow-800 font-medium">No housemaids selected</p>
                        <p className="text-yellow-700 text-sm mt-1">
                          Use the search box above to find housemaids by name, housemaid number, mobile number, passport number, or resident ID.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Report Options */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Report Options</h4>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.includePhotos}
                    onChange={(e) => updateFilter('includePhotos', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={filters.exportFormat === 'excel'}
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Include profile photos in report
                    {filters.exportFormat === 'excel' && (
                      <span className="text-gray-500"> (not available for Excel)</span>
                    )}
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.includeCV}
                    onChange={(e) => updateFilter('includeCV', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include CV information</span>
                </label>
              </div>
            </div>

            {/* Filters (only show for "all" report type) */}
            {filters.reportType === 'all' && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Filters</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Complaint Status</label>
                    <select
                      value={filters.statusFilter}
                      onChange={(e) => updateFilter('statusFilter', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending Only</option>
                      <option value="complete">Complete Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <select
                      value={filters.locationFilter}
                      onChange={(e) => updateFilter('locationFilter', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Locations</option>
                      <option value="inside">Inside Country Only</option>
                      <option value="outside">Outside Country Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employment Status</label>
                    <select
                      value={filters.employmentFilter}
                      onChange={(e) => updateFilter('employmentFilter', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Employment</option>
                      <option value="probationary">Probationary Only</option>
                      <option value="permanent">Permanent Only</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Date Range (only show for "all" report type) */}
            {filters.reportType === 'all' && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Date Range (Record Creation)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                    <input
                      type="date"
                      value={filters.dateRange.from}
                      onChange={(e) => updateDateRange('from', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                    <input
                      type="date"
                      value={filters.dateRange.to}
                      onChange={(e) => updateDateRange('to', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Preview Summary */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                {React.createElement(getFormatIcon(filters.exportFormat), { className: "h-5 w-5 mr-2" })}
                Report Preview ({filters.exportFormat.toUpperCase()})
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center">
                  <Users className="h-4 w-4 text-blue-600 mr-1" />
                  <span className="text-blue-700">
                    <span className="font-medium">{filteredHousemaids.length}</span> Records
                  </span>
                </div>
                <div className="flex items-center">
                  <Hash className="h-4 w-4 text-purple-600 mr-1" />
                  <span className="text-blue-700">
                    <span className="font-medium">{filteredHousemaids.filter(h => h.housemaidNumber).length}</span> With Numbers
                  </span>
                </div>
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-orange-600 mr-1" />
                  <span className="text-blue-700">
                    <span className="font-medium">{filteredHousemaids.filter(h => h.complaint.status === 'pending').length}</span> Pending
                  </span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-blue-700">
                    <span className="font-medium">{filteredHousemaids.filter(h => h.complaint.status === 'complete').length}</span> Complete
                  </span>
                </div>
              </div>
              {filters.reportType === 'selected' && (
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <p className="text-sm text-blue-700">
                    Report Type: <span className="font-medium">Selected Housemaids</span>
                    {filters.selectedHousemaids.length > 0 && (
                      <span> ({filters.selectedHousemaids.length} selected)</span>
                    )}
                  </p>
                </div>
              )}
              <div className="mt-2 pt-2 border-t border-blue-200">
                <p className="text-sm text-blue-700">
                  Export Format: <span className="font-medium capitalize">{filters.exportFormat}</span>
                  <span className="text-blue-600"> - {getFormatDescription(filters.exportFormat)}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {filteredHousemaids.length} record(s) will be included in the {filters.exportFormat.toUpperCase()} report
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={generateReport}
              disabled={isGenerating || filteredHousemaids.length === 0 || (filters.reportType === 'selected' && filters.selectedHousemaids.length === 0)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  {React.createElement(getFormatIcon(filters.exportFormat), { className: "h-4 w-4" })}
                  <span>Generate {filters.exportFormat.toUpperCase()} Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;