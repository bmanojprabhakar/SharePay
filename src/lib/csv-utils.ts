// Simple CSV parser without external dependencies

export interface CSVExpense {
  date: string;
  description: string;
  amount: number;
  paidBy: { [email: string]: number }; // Support multiple payers with amounts
  splitType: 'equal' | 'unequal';
  splitBetween: string[];
  splitDetails?: { [email: string]: number };
  category?: string;
  paymentType?: string;
  notes?: string;
}

export interface FirestoreExpense {
  description: string;
  amount: number;
  payers: { [email: string]: number };
  splitBetween: string[];
  splitType: 'equal' | 'unequal' | 'payment';
  splitDetails?: { [email: string]: number };
  createdAt: Date;
  createdBy: string;
  category?: string;
  paymentType?: string;
  notes?: string;
  expenseDate?: string;
}

// Proper CSV parser function that handles quoted fields
function parseCSV(csvContent: string): any[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV must have at least header and one data row');
  
  // Parse CSV line respecting quoted fields
  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
  
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, ''));
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]).map(v => v.replace(/"/g, ''));
    if (values.length !== headers.length) {
      console.warn(`Row ${i + 1}: Expected ${headers.length} fields, got ${values.length}. Skipping row.`);
      continue; // Skip malformed rows
    }
    
    const record: any = {};
    headers.forEach((header, index) => {
      record[header] = values[index];
    });
    records.push(record);
  }
  
  return records;
}

// Convert CSV string to expense objects
export function parseCSVExpenses(csvContent: string): CSVExpense[] {
  try {
    const records = parseCSV(csvContent);

    return records.map((record: any, index: number) => {
      // Validate required fields
      if (!record.Date || !record.Description || !record.Amount || !record.PaidBy || !record.SplitBetween) {
        throw new Error(`Row ${index + 2}: Missing required fields (Date, Description, Amount, PaidBy, SplitBetween)`);
      }

      // Parse amount
      const amount = parseFloat(record.Amount.toString().replace(/[₹,]/g, ''));
      if (isNaN(amount) || amount <= 0) {
        throw new Error(`Row ${index + 2}: Invalid amount "${record.Amount}"`);
      }

      // Parse multiple payers (supports both old and new format)
      // New format: "email1:amount1;email2:amount2" or old format: "email"
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      let paidBy: { [email: string]: number } = {};
      
      if (record.PaidBy.includes(':')) {
        // New format with amounts: "email1:amount1;email2:amount2"
        const payerDetails = record.PaidBy.split(';');
        let totalPaidAmount = 0;
        
        for (const detail of payerDetails) {
          const [email, amountStr] = detail.split(':').map((s: string) => s.trim());
          if (email && amountStr) {
            if (!emailRegex.test(email)) {
              throw new Error(`Row ${index + 2}: Invalid PaidBy email "${email}"`);
            }
            const paidAmount = parseFloat(amountStr.replace(/[₹,]/g, ''));
            if (isNaN(paidAmount) || paidAmount <= 0) {
              throw new Error(`Row ${index + 2}: Invalid paid amount "${amountStr}" for "${email}"`);
            }
            paidBy[email] = paidAmount;
            totalPaidAmount += paidAmount;
          }
        }
        
        // Validate total paid amount matches expense amount
        if (Math.abs(totalPaidAmount - amount) > 0.01) {
          throw new Error(`Row ${index + 2}: Total paid amount (₹${totalPaidAmount}) doesn't match expense amount (₹${amount})`);
        }
      } else {
        // Old format: single payer pays full amount
        if (!emailRegex.test(record.PaidBy)) {
          throw new Error(`Row ${index + 2}: Invalid PaidBy email "${record.PaidBy}"`);
        }
        paidBy[record.PaidBy.trim()] = amount;
      }

      // Parse split between (semicolon-separated for new format, comma-separated for backward compatibility)
      const splitBetween = record.SplitBetween.includes(';') 
        ? record.SplitBetween.split(';').map((email: string) => email.trim())
        : record.SplitBetween.split(',').map((email: string) => email.trim());
      
      if (splitBetween.length === 0) {
        throw new Error(`Row ${index + 2}: No valid emails in SplitBetween`);
      }

      // Validate split between emails
      const invalidEmails = splitBetween.filter((email: string) => !emailRegex.test(email));
      if (invalidEmails.length > 0) {
        throw new Error(`Row ${index + 2}: Invalid email addresses in SplitBetween: ${invalidEmails.join(', ')}`);
      }

      // Parse split type
      const splitType = record.SplitType?.toLowerCase() === 'unequal' ? 'unequal' : 'equal';

      // Parse split details for unequal splits (semicolon-separated for new format, comma-separated for backward compatibility)
      let splitDetails: { [email: string]: number } | undefined;
      if (splitType === 'unequal' && record.SplitDetails) {
        splitDetails = {};
        const details = record.SplitDetails.includes(';')
          ? record.SplitDetails.split(';')
          : record.SplitDetails.split(',');
          
        for (const detail of details) {
          const [email, amountStr] = detail.split(':').map((s: string) => s.trim());
          if (email && amountStr) {
            const detailAmount = parseFloat(amountStr.replace(/[₹,]/g, ''));
            if (!isNaN(detailAmount)) {
              splitDetails[email] = detailAmount;
            }
          }
        }

        // Validate split details sum matches total amount
        const splitSum = Object.values(splitDetails).reduce((sum, amt) => sum + amt, 0);
        if (Math.abs(splitSum - amount) > 0.01) {
          throw new Error(`Row ${index + 2}: Split details sum (₹${splitSum}) doesn't match total amount (₹${amount})`);
        }
      }

      // Parse date - allow "Unknown" as a valid value
      let dateValue = record.Date;
      if (record.Date.toLowerCase() !== 'unknown') {
        const date = new Date(record.Date);
        if (isNaN(date.getTime())) {
          throw new Error(`Row ${index + 2}: Invalid date format "${record.Date}". Use YYYY-MM-DD format or "Unknown".`);
        }
      }

      return {
        date: record.Date,
        description: record.Description.trim(),
        amount,
        paidBy,
        splitType,
        splitBetween,
        splitDetails,
        category: record.Category?.trim() || '',
        paymentType: record.PaymentType?.trim() || '',
        notes: record.Notes?.trim() || '',
      };
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`CSV parsing error: ${error.message}`);
    }
    throw new Error('Unknown error occurred while parsing CSV');
  }
}

// Convert CSV expenses to Firestore format
export function convertCSVToFirestore(csvExpenses: CSVExpense[], currentUserEmail: string): FirestoreExpense[] {
  return csvExpenses.map((csvExpense, index) => {
    // Use the payers object directly from CSV parsing
    const payers: { [email: string]: number } = csvExpense.paidBy;

    // Handle user-entered expense date properly
    let expenseDate: string | undefined;
    if (csvExpense.date && csvExpense.date !== 'Unknown') {
      try {
        const parsedDate = new Date(csvExpense.date);
        if (!isNaN(parsedDate.getTime())) {
          expenseDate = csvExpense.date;
        }
      } catch {
        // If date parsing fails, leave expenseDate as undefined
        console.warn(`Failed to parse date "${csvExpense.date}" for expense ${index + 1}`);
      }
    }

    const firestoreExpense: FirestoreExpense = {
      description: csvExpense.description,
      amount: csvExpense.amount,
      payers,
      splitBetween: csvExpense.splitBetween,
      splitType: csvExpense.splitType,
      createdAt: new Date(), // Use current timestamp for when the record was created
      createdBy: currentUserEmail,
    };

    // Only add optional fields if they have valid values
    if (csvExpense.splitDetails && Object.keys(csvExpense.splitDetails).length > 0) {
      firestoreExpense.splitDetails = csvExpense.splitDetails;
    }

    if (csvExpense.category && csvExpense.category.trim() !== '') {
      firestoreExpense.category = csvExpense.category.trim();
    }

    if (csvExpense.paymentType && csvExpense.paymentType.trim() !== '') {
      firestoreExpense.paymentType = csvExpense.paymentType.trim();
    }

    if (csvExpense.notes && csvExpense.notes.trim() !== '') {
      firestoreExpense.notes = csvExpense.notes.trim();
    }

    if (expenseDate && expenseDate.trim() !== '') {
      firestoreExpense.expenseDate = expenseDate.trim();
    }
    
    return firestoreExpense;
  });
}

// Export expenses to CSV format
export function exportExpensesToCSV(expenses: FirestoreExpense[]): string {
  const headers = ['Date', 'Description', 'Amount', 'PaidBy', 'SplitType', 'SplitBetween', 'SplitDetails', 'Category', 'PaymentType', 'Notes'];
  
  const rows = expenses.map(expense => {
    // Format multiple payers with amounts (using semicolon separator to avoid CSV delimiter conflict)
    const paidBy = Object.entries(expense.payers)
      .filter(([email, amount]) => amount > 0)
      .map(([email, amount]) => `${email}:${amount}`)
      .join(';');
    
    // Format split between (using semicolon separator to avoid CSV delimiter conflict)
    const splitBetween = expense.splitBetween.join(';');
    
    // Format split details for unequal splits (using semicolon separator)
    let splitDetailsStr = '';
    if (expense.splitType === 'unequal' && expense.splitDetails) {
      splitDetailsStr = Object.entries(expense.splitDetails)
        .map(([email, amount]) => `${email}:${amount}`)
        .join(';');
    }

    // Use expenseDate if available, otherwise mark as Unknown
    let dateStr = 'Unknown';
    if (expense.expenseDate && expense.expenseDate.trim() !== '') {
      try {
        const parsedDate = new Date(expense.expenseDate);
        if (!isNaN(parsedDate.getTime())) {
          dateStr = parsedDate.toISOString().split('T')[0];
        }
      } catch {
        // Keep as 'Unknown' if parsing fails
      }
    }

    return [
      dateStr, // Use user-entered expense date or 'Unknown'
      `"${expense.description}"`, // Wrap in quotes to handle commas
      expense.amount,
      paidBy,
      expense.splitType,
      `"${splitBetween}"`, // Wrap in quotes to handle commas
      splitDetailsStr ? `"${splitDetailsStr}"` : '',
      expense.category || '',
      expense.paymentType || '',
      expense.notes ? `"${expense.notes}"` : '', // Wrap in quotes to handle commas
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  return csvContent;
}

// Generate sample CSV template
export function generateSampleCSV(): string {
  const sampleData = [
    {
      Date: '2024-01-15',
      Description: 'Dinner at Restaurant',
      Amount: '1200',
      PaidBy: 'john@example.com:1200',
      SplitType: 'equal',
      SplitBetween: 'john@example.com;jane@example.com;bob@example.com',
      SplitDetails: '',
      Category: 'Food',
      PaymentType: 'card',
      Notes: 'Team dinner',
    },
    {
      Date: '2024-01-16',
      Description: 'Uber Ride - Multiple Payers',
      Amount: '300',
      PaidBy: 'jane@example.com:200;john@example.com:100',
      SplitType: 'unequal',
      SplitBetween: 'jane@example.com;john@example.com',
      SplitDetails: 'jane@example.com:200;john@example.com:100',
      Category: 'Transport',
      PaymentType: 'upi',
      Notes: 'Airport pickup - split payment',
    },
    {
      Date: 'Unknown',
      Description: 'Miscellaneous Expense',
      Amount: '500',
      PaidBy: 'bob@example.com:500',
      SplitType: 'equal',
      SplitBetween: 'bob@example.com;jane@example.com;john@example.com',
      SplitDetails: '',
      Category: 'Others',
      PaymentType: 'cash',
      Notes: 'Date not available',
    },
  ];

  const headers = Object.keys(sampleData[0]);
  const rows = sampleData.map(row => Object.values(row).map(value => `"${value}"`));
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

// Download file utility
export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}