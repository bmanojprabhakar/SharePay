'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  parseCSVExpenses, 
  convertCSVToFirestore, 
  exportExpensesToCSV, 
  generateSampleCSV, 
  downloadCSV,
  type CSVExpense,
  type FirestoreExpense 
} from '@/lib/csv-utils';

interface ImportExportDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  groupId: string;
  groupName: string;
  currentUserEmail: string;
  expenses: FirestoreExpense[];
  onImportSuccess: (expenses: FirestoreExpense[]) => void;
}

export function ImportExportDialog({
  isOpen,
  setIsOpen,
  groupId,
  groupName,
  currentUserEmail,
  expenses,
  onImportSuccess,
}: ImportExportDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<{
    success: boolean;
    expenses?: CSVExpense[];
    error?: string;
  } | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please select a CSV file.',
      });
      return;
    }

    setIsProcessing(true);
    setParseResult(null);

    try {
      const content = await file.text();
      const csvExpenses = parseCSVExpenses(content);
      
      setParseResult({
        success: true,
        expenses: csvExpenses,
      });

      toast({
        title: 'CSV parsed successfully',
        description: `Found ${csvExpenses.length} expense${csvExpenses.length !== 1 ? 's' : ''} to import.`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setParseResult({
        success: false,
        error: errorMessage,
      });

      toast({
        variant: 'destructive',
        title: 'CSV parsing failed',
        description: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!parseResult?.success || !parseResult.expenses) return;

    setIsProcessing(true);
    try {
      const firestoreExpenses = convertCSVToFirestore(parseResult.expenses, currentUserEmail);
      await onImportSuccess(firestoreExpenses);
      
      toast({
        title: 'Import successful',
        description: `Successfully imported ${firestoreExpenses.length} expense${firestoreExpenses.length !== 1 ? 's' : ''}.`,
      });
      
      setIsOpen(false);
      setParseResult(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import expenses.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    if (expenses.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No data to export',
        description: 'This group has no expenses to export.',
      });
      return;
    }

    try {
      const csvContent = exportExpensesToCSV(expenses);
      const fileName = `${groupName.replace(/[^a-zA-Z0-9]/g, '_')}_expenses_${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCSV(csvContent, fileName);
      
      toast({
        title: 'Export successful',
        description: `Downloaded ${expenses.length} expense${expenses.length !== 1 ? 's' : ''} as CSV.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: 'Failed to export expenses to CSV.',
      });
    }
  };

  const handleDownloadTemplate = () => {
    const sampleCSV = generateSampleCSV();
    downloadCSV(sampleCSV, 'sharepay_expense_template.csv');
    
    toast({
      title: 'Template downloaded',
      description: 'Use this template to format your expenses for import.',
    });
  };

  const resetImport = () => {
    setParseResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle dialog close - reset state when dialog is closed
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // Dialog is being closed - reset the import state
      resetImport();
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import & Export Expenses</DialogTitle>
          <DialogDescription>
            Import expenses from CSV or export current expenses for {groupName}.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </TabsTrigger>
            <TabsTrigger value="export">
              <Download className="w-4 h-4 mr-2" />
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="csv-file">Select CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  disabled={isProcessing}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Upload a CSV file with your expenses. Make sure it follows our template format.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="w-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                Download Template
              </Button>

              {parseResult && (
                <Alert className={parseResult.success ? 'border-green-500' : 'border-red-500'}>
                  {parseResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <AlertDescription>
                    {parseResult.success
                      ? `✅ Successfully parsed ${parseResult.expenses?.length} expense${parseResult.expenses?.length !== 1 ? 's' : ''}. Ready to import!`
                      : `❌ ${parseResult.error}`
                    }
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetImport}>
                Reset
              </Button>
              <Button
                onClick={handleImport}
                disabled={!parseResult?.success || isProcessing}
              >
                {isProcessing ? 'Importing...' : `Import ${parseResult?.expenses?.length || 0} Expenses`}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Export Summary</h4>
                <ul className="text-sm space-y-1">
                  <li>• Group: {groupName}</li>
                  <li>• Total expenses: {expenses.length}</li>
                  <li>• Export format: CSV</li>
                  <li>• Includes: All expense details, splits, and categories</li>
                </ul>
              </div>

              {expenses.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This group has no expenses to export.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={expenses.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export {expenses.length} Expenses
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}