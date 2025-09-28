import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScanLine, Plus, ArrowUpCircle, ArrowDownCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InventoryRecord {
  id: string;
  part_id: number;
  team_user_id: string;
  status: "issued" | "returned";
  scanned_at: string;
  notes: string;
  parts: {
    name: string;
    categories: {
      name: string;
    };
  };
  profiles: {
    username: string;
  };
}

interface Part {
  id: number;
  name: string;
  category_id: number;
  categories: {
    name: string;
  };
}

interface TeamUser {
  id: string;
  username: string;
}

interface InventoryTrackingProps {
  onStatsUpdate: () => void;
}

export default function InventoryTracking({ onStatsUpdate }: InventoryTrackingProps) {
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "issued" | "returned">("all");
  const { toast } = useToast();

  useEffect(() => {
    loadRecords();
    loadParts();
    loadTeamUsers();
  }, []);

  const loadRecords = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_tracking")
        .select(`
          *,
          parts (
            name,
            categories (name)
          ),
          profiles (username)
        `)
        .order("scanned_at", { ascending: false });

      if (error) throw error;
      setRecords(data as InventoryRecord[] || []);
    } catch (error: any) {
      toast({
        title: "Error loading inventory records",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadParts = async () => {
    try {
      const { data, error } = await supabase
        .from("parts")
        .select(`
          id,
          name,
          category_id,
          categories (name)
        `)
        .order("name");

      if (error) throw error;
      setParts(data || []);
    } catch (error: any) {
      console.error("Error loading parts:", error);
    }
  };

  const loadTeamUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("role", "team")
        .order("username");

      if (error) throw error;
      setTeamUsers(data || []);
    } catch (error: any) {
      console.error("Error loading team users:", error);
    }
  };

  const handleManualEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const part_id = parseInt(formData.get("part_id") as string);
    const team_user_id = formData.get("team_user_id") as string;
    const status = formData.get("status") as "issued" | "returned";
    const notes = formData.get("notes") as string;

    try {
      const { error } = await supabase
        .from("inventory_tracking")
        .insert([{
          part_id,
          team_user_id,
          status,
          notes,
        }]);

      if (error) throw error;

      toast({
        title: "Record added",
        description: `Item ${status} successfully recorded.`,
      });

      setIsAddDialogOpen(false);
      loadRecords();
      onStatsUpdate();
    } catch (error: any) {
      toast({
        title: "Error adding record",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBarcodeScanner = () => {
    toast({
      title: "Barcode Scanner",
      description: "Barcode scanning functionality would be integrated here with a camera library.",
    });
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = searchTerm === "" || 
      record.parts.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.profiles.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.parts.categories.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeVariant = (status: string) => {
    return status === "issued" ? "default" : "secondary";
  };

  const getStatusIcon = (status: string) => {
    return status === "issued" ? 
      <ArrowDownCircle className="h-4 w-4" /> : 
      <ArrowUpCircle className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Inventory Tracking</CardTitle>
              <CardDescription>Track component issues and returns with barcode scanning</CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isScanDialogOpen} onOpenChange={setIsScanDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <ScanLine className="h-4 w-4 mr-2" />
                    Scan Barcode
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Barcode Scanner</DialogTitle>
                    <DialogDescription>Scan component barcodes to track inventory</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="bg-muted rounded-lg p-8 text-center">
                      <ScanLine className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Camera scanner interface would appear here</p>
                      <p className="text-sm text-muted-foreground mt-2">Integration with camera library needed</p>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={handleBarcodeScanner}
                    >
                      Start Scanning
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Manual Entry
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Manual Inventory Entry</DialogTitle>
                    <DialogDescription>Manually record component issue or return</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleManualEntry}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="part_id">Component</Label>
                        <Select name="part_id" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select component" />
                          </SelectTrigger>
                          <SelectContent>
                            {parts.map((part) => (
                              <SelectItem key={part.id} value={part.id.toString()}>
                                {part.categories.name} - {part.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="team_user_id">Team Member</Label>
                        <Select name="team_user_id" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select team member" />
                          </SelectTrigger>
                          <SelectContent>
                            {teamUsers.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Action</Label>
                        <Select name="status" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="issued">Issue Component</SelectItem>
                            <SelectItem value="returned">Return Component</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes (optional)</Label>
                        <Textarea id="notes" name="notes" placeholder="Additional notes about this transaction" />
                      </div>
                    </div>
                    <DialogFooter className="mt-6">
                      <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Recording..." : "Record Entry"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by component, team, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value: "all" | "issued" | "returned") => setStatusFilter(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="issued">Issued Only</SelectItem>
                <SelectItem value="returned">Returned Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="text-center py-8">
              <ScanLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No inventory records yet. Start tracking by scanning barcodes or manual entry.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Team Member</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.parts.name}</TableCell>
                    <TableCell>{record.parts.categories.name}</TableCell>
                    <TableCell>{record.profiles.username}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(record.status)} className="flex items-center gap-1 w-fit">
                        {getStatusIcon(record.status)}
                        {record.status === "issued" ? "Issued" : "Returned"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(record.scanned_at).toLocaleString()}</TableCell>
                    <TableCell>{record.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}