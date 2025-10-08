import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ReservationExport() {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      // Fetch all reservations with related data
      const { data, error } = await supabase
        .from("inventory_tracking")
        .select(`
          id,
          status,
          scanned_at,
          notes,
          admin_remarks,
          parts (
            name,
            description,
            categories (
              name
            )
          ),
          profiles (
            username
          )
        `)
        .order("scanned_at", { ascending: false });

      if (error) throw error;

      // Convert to CSV
      const headers = [
        "Reservation ID",
        "Username",
        "Part Name",
        "Category",
        "Status",
        "Date",
        "Time",
        "Notes",
        "Admin Remarks"
      ];

      const rows = data.map(reservation => [
        reservation.id,
        reservation.profiles?.username || "Deleted User",
        reservation.parts?.name || "Deleted Part",
        reservation.parts?.categories?.name || "N/A",
        reservation.status,
        new Date(reservation.scanned_at).toLocaleDateString(),
        new Date(reservation.scanned_at).toLocaleTimeString(),
        reservation.notes || "",
        reservation.admin_remarks || ""
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(","),
        ...rows.map(row => 
          row.map(cell => 
            // Escape commas and quotes in cell content
            typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))
              ? `"${cell.replace(/"/g, '""')}"`
              : cell
          ).join(",")
        )
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `reservations_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `Exported ${data.length} reservations to CSV`,
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={exportToCSV}
      disabled={isExporting}
      variant="outline"
      className="flex items-center gap-2"
    >
      <Download className="h-4 w-4" />
      {isExporting ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
