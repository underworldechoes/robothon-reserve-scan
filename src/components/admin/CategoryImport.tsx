import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CategoryImportProps {
  onImportComplete: () => void;
}

export default function CategoryImport({ onImportComplete }: CategoryImportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      
      // Skip header row
      const dataLines = lines.slice(1);
      
      const categories = dataLines.map(line => {
        // Parse CSV line (handle quoted fields)
        const fields: string[] = [];
        let currentField = "";
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            fields.push(currentField.trim());
            currentField = "";
          } else {
            currentField += char;
          }
        }
        fields.push(currentField.trim());
        
        return {
          name: fields[0]?.replace(/^"|"$/g, '') || "",
          description: fields[1]?.replace(/^"|"$/g, '') || null,
          checkout_limit: fields[2] ? parseInt(fields[2]) : 10
        };
      }).filter(cat => cat.name); // Filter out empty rows

      if (categories.length === 0) {
        throw new Error("No valid categories found in CSV file");
      }

      // Insert categories (upsert to handle duplicates)
      const { error } = await supabase
        .from("categories")
        .upsert(categories, { 
          onConflict: 'name',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      toast({
        title: "Import successful",
        description: `Imported ${categories.length} categories`,
      });

      onImportComplete();
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = "name,description,checkout_limit\nElectronics,Electronic components,10\nMechanical,Mechanical parts,15";
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", "category_template.csv");
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={downloadTemplate}
        variant="outline"
        size="sm"
      >
        Download Template
      </Button>
      <Input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        disabled={isImporting}
        className="hidden"
        id="csv-upload"
      />
      <Label htmlFor="csv-upload">
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          variant="outline"
          className="flex items-center gap-2"
          asChild
        >
          <span>
            <Upload className="h-4 w-4" />
            {isImporting ? "Importing..." : "Import CSV"}
          </span>
        </Button>
      </Label>
    </div>
  );
}
