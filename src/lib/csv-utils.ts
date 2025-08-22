// Simple CSV parser without external dependencies

export interface CSVExpense {
  date: string;
  description: string;
  amount: number;
  paidBy: string;
  splitType: 'equal' | 'unequal';
  splitBetween: string[];
  splitDetails?: { [email: string]: number };
  category?: string;
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
  notes?: string;
}

// Simple CSV parser function
function parseCSV(csvContent: string): any[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV must have at least header and one data row');
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length !== headers.length) continue; // Skip malformed rows
    
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

      // Parse split between (comma-separated emails)
      const splitBetween = record.SplitBetween.split(',').map((email: string) => email.trim());
      if (splitBetween.length === 0) {
        throw new Error(`Row ${index + 2}: No valid emails in SplitBetween`);
      }

      // Validate emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = splitBetween.filter((email: string) => !emailRegex.test(email));
      if (invalidEmails.length > 0) {
        throw new Error(`Row ${index + 2}: Invalid email addresses: ${invalidEmails.join(', ')}`);
      }

      // Parse split type
      const splitType = record.SplitType?.toLowerCase() === 'unequal' ? 'unequal' : 'equal';

      // Parse split details for unequal splits
      let splitDetails: { [email: string]: number } | undefined;
      if (splitType === 'unequal' && record.SplitDetails) {
        splitDetails = {};
        const details = record.SplitDetails.split(',');
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

      // Validate paid by email
      if (!emailRegex.test(record.PaidBy)) {
        throw new Error(`Row ${index + 2}: Invalid PaidBy email "${record.PaidBy}"`);
      }

      // Parse date
      const date = new Date(record.Date);
      if (isNaN(date.getTime())) {
        throw new Error(`Row ${index + 2}: Invalid date format "${record.Date}". Use YYYY-MM-DD format.`);
      }

      return {
        date: record.Date,
        description: record.Description.trim(),
        amount,
        paidBy: record.PaidBy.trim(),
        splitType,
        splitBetween,
        splitDetails,
        category: record.Category?.trim() || '',
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
  return csvExpenses.map((csvExpense) => {
    // Create payers object
    const payers: { [email: string]: number } = {
      [csvExpense.paidBy]: csvExpense.amount
    };

    return {
      description: csvExpense.description,
      amount: csvExpense.amount,
      payers,
      splitBetween: csvExpense.splitBetween,
      splitType: csvExpense.splitType,
      splitDetails: csvExpense.splitDetails,
      createdAt: new Date(csvExpense.date),
      createdBy: currentUserEmail,
      category: csvExpense.category,
      notes: csvExpense.notes,
    };
  });
}

// Export expenses to CSV format
export function exportExpensesToCSV(expenses: FirestoreExpense[]): string {
  const headers = ['Date', 'Description', 'Amount', 'PaidBy', 'SplitType', 'SplitBetween', 'SplitDetails', 'Category', 'Notes'];
  
  const rows = expenses.map(expense => {
    // Get the primary payer (first one with non-zero amount)
    const paidBy = Object.keys(expense.payers).find(email => expense.payers[email] > 0) || '';
    
    // Format split between
    const splitBetween = expense.splitBetween.join(',');
    
    // Format split details for unequal splits
    let splitDetailsStr = '';
    if (expense.splitType === 'unequal' && expense.splitDetails) {
      splitDetailsStr = Object.entries(expense.splitDetails)
        .map(([email, amount]) => `${email}:${amount}`)
        .join(',');
    }

    return [
      expense.createdAt.toISOString().split('T')[0], // Date in YYYY-MM-DD format
      `"${expense.description}"`, // Wrap in quotes to handle commas
      expense.amount,
      paidBy,
      expense.splitType,
      `"${splitBetween}"`, // Wrap in quotes to handle commas
      splitDetailsStr ? `"${splitDetailsStr}"` : '',
      expense.category || '',
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
      PaidBy: 'john@example.com',
      SplitType: 'equal',
      SplitBetween: 'john@example.com,jane@example.com,bob@example.com',
      SplitDetails: '',
      Category: 'Food',
      Notes: 'Team dinner',
    },
    {
      Date: '2024-01-16',
      Description: 'Uber Ride',
      Amount: '300',
      PaidBy: 'jane@example.com',
      SplitType: 'unequal',
      SplitBetween: 'jane@example.com,john@example.com',
      SplitDetails: 'jane@example.com:200,john@example.com:100',
      Category: 'Transport',
      Notes: 'Airport pickup',
    },
    {
      Date: '2024-01-17',
      Description: 'Hotel Booking',
      Amount: '5000',
      PaidBy: 'bob@example.com',
      SplitType: 'equal',
      SplitBetween: 'bob@example.com,jane@example.com,john@example.com',
      SplitDetails: '',
      Category: 'Accommodation',
      Notes: 'Weekend trip',
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