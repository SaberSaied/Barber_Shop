/**
 * Reusable component for exporting data tables to CSV and PDF formats.
 * It supports both flat and grouped data structures, making it versatile for various admin pages.
 */
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import 'jspdf-autotable'; // This import extends jsPDF with the autoTable method
import Papa from "papaparse";
import { useTranslation } from 'react-i18next';

interface CartItem {
  id: string;
  name: string;
  price: number;
  [key: string]: string | number;
}

interface Bill {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
  barber_id: string | null;
}

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string;
  booking_time: string;
  barber_preference: string | null;
  status: string;
  notes: string | null;
  service: { id: string; name_en: string; name_ar: string; price: number } | null;
}

interface ColumnDef<T> {
  header: string; 
  accessor: keyof T | ((item: T) => string | number);
}

interface ExportButtonProps<T> {
  data: T[];
  columns: ColumnDef<T>[] | ({
    header: string;
    accessor: (items: Bill | Booking) => string;
  } | {
    header: string;
    accessor: string;
  })[];
  filename: string;
  groupedData?: Record<string, T[] > |  {
    [k: string]: {
      items: Bill[] | Booking[];
      total?: number;
    };
  };
  groupTitle?: (key: string) => string ;
  total?: number;
}

export function ExportButton<T extends object>({ data, columns, filename, groupedData, groupTitle, total }: ExportButtonProps<T>) {
  const { t } = useTranslation();

  const extractValue = (item: T, accessor: ColumnDef<T>['accessor']): string | number => {
    if (typeof accessor === 'function') {
      return accessor(item); 
    }
    return item[accessor as keyof T] as string | number;
  };

  const handleExport = (format: 'csv') => {
    let tableRows: (string | number)[][] = [];
    let csvData: any[] = [];

    const processItem = (item: T) => {
      const row = columns.map(col => extractValue(item, col.accessor));
      tableRows.push(row.map(String));
      
      let csvRow: Record<string, any> = {};
      columns.forEach((col, i) => {
        csvRow[col.header] = row[i];
      });
      csvData.push(csvRow);
    };

    if (groupedData && groupTitle) {
      Object.entries(groupedData).forEach(([key, group]) => {
        if (format === 'csv') {
          csvData.push({ 
            [columns[0].header]: `${groupTitle(key)}(${group.items ? group.items.length : group.length})`, 
            [columns[1].header]: "", 
            [columns[2].header]: "", 
            [columns[3].header]: "", 
            [columns[4].header]: "", 
            [columns[columns.length - 1].header]: "" 
          });
        }
        
        group.items ? group.items.forEach(processItem) : group.forEach(processItem);
        
        if (format === 'csv' && group.total !== undefined) {
          csvData.push({ [columns[0].header]: t('admin.total'), [columns[1].header]: group.total.toFixed(2) });
          csvData.push({}); // Add a blank line for better visual separation between groups.
        }
      });
      csvData.push({ [columns[0].header]: t('admin.total'), [columns[1].header]: total?.toFixed(2) || "" });
    } else {
      data.forEach(processItem);
      csvData.push({ [columns[0].header]: t('admin.total'), [columns[1].header]: total?.toFixed(2) || "" });
    }

    if (format === 'csv')  {
      const csv = Papa.unparse(csvData);
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Button variant="outline" onClick={() => handleExport('csv')}>
      <Download className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
      {t('admin.exportAsCsv')}
    </Button>
  );
}
