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
  status: "issued" | "returned" | "checked_out";
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
  quantity: number;
  barcode?: string | null;
  category_id?: number;
  categories?: {
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
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [barcode, setBarcode] = useState("");
  const [manualPartName, setManualPartName] = useState("");
  const [manualQuantity, setManualQuantity] = useState("1");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "issued" | "returned" | "checked_out">("all");
  const { toast } = useToast();

  useEffect(() => {
    loadRecords();
    loadCategories();
    loadAllParts();
    loadTeamUsers();
  }, []);

  useEffect(() => {
    if (selectedCategoryId) {
      loadPartsInCategory(selectedCategoryId);
    }
  }, [selectedCategoryId]);

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

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error loading categories:", error);
    }
  };

  const loadAllParts = async () => {
    try {
      const { data, error } = await supabase
        .from("parts")
        .select(`
          id,
          name,
          quantity,
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

  const loadPartsInCategory = async (categoryId: number) => {
    try {
      const { data, error } = await supabase
        .from("parts")
        .select("id, name, quantity, barcode")
        .eq("category_id", categoryId)
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

  const handleBarcodeInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim() || !selectedCategoryId) return;

    setIsLoading(true);
    try {
      const { data: existingPart, error: searchError } = await supabase
        .from("parts")
        .select("*")
        .eq("barcode", barcode.trim())
        .eq("category_id", selectedCategoryId)
        .maybeSingle();

      if (searchError) throw searchError;

      if (existingPart) {
        const { error: updateError } = await supabase
          .from("parts")
          .update({ quantity: existingPart.quantity + 1 })
          .eq("id", existingPart.id);

        if (updateError) throw updateError;

        toast({
          title: "Part scanned",
          description: `Added 1x ${existingPart.name}. New quantity: ${existingPart.quantity + 1}`,
        });
      } else {
        toast({
          title: "Barcode not found",
          description: "Please create this part manually first.",
          variant: "destructive",
        });
      }

      setBarcode("");
      if (selectedCategoryId) loadPartsInCategory(selectedCategoryId);
      onStatsUpdate();
    } catch (error: any) {
      toast({
        title: "Error scanning barcode",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPartName.trim() || !selectedCategoryId) return;

    setIsLoading(true);
    try {
      const qty = parseInt(manualQuantity) || 1;

      const { error } = await supabase
        .from("parts")
        .insert([{
          name: manualPartName.trim(),
          category_id: selectedCategoryId,
          quantity: qty,
          barcode: barcode.trim() || null,
        }]);

      if (error) throw error;

      toast({
        title: "Part added",
        description: `${manualPartName} (${qty}x) added to inventory.`,
      });

      setManualPartName("");
      setManualQuantity("1");
      setBarcode("");
      if (selectedCategoryId) loadPartsInCategory(selectedCategoryId);
      onStatsUpdate();
    } catch (error: any) {
      toast({
        title: "Error adding part",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

  const filteredRecords = records.filter(record => {
    const matchesSearch = searchTerm === "" || 
      record.parts.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.profiles.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.parts.categories.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeVariant = (status: string) => {
    if (status === "issued" || status === "checked_out") return "default";
    return "secondary";
  };

  const getStatusIcon = (status: string) => {
    if (status === "issued" || status === "checked_out") {
      return <ArrowDownCircle className="h-4 w-4" />;
    }
    return <ArrowUpCircle className="h-4 w-4" />;
  };

  const getStatusLabel = (status: string) => {
    if (status === "checked_out") return "Checked Out";
    if (status === "issued") return "Issued";
    return "Returned";
  };

  return (
    <div className="space-y-6">
      {/* Barcode & Manual Entry */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Management</CardTitle>
          <CardDescription>Scan barcodes or manually add items to categories</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Select Category</Label>
            <Select
              value={selectedCategoryId?.toString() || ""}
              onValueChange={(value) => setSelectedCategoryId(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCategoryId && (
            <>
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ScanLine className="h-5 w-5" />
                    Scan Barcode
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleBarcodeInput} className="flex gap-2">
                    <Input
                      placeholder="Scan or enter barcode..."
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      disabled={isLoading}
                    />
                    <Button type="submit" disabled={isLoading || !barcode.trim()}>
                      {isLoading ? "Scanning..." : "Scan"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Manual Entry
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleManualAdd} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="partName">Part Name</Label>
                        <Input
                          id="partName"
                          placeholder="Enter part name..."
                          value={manualPartName}
                          onChange={(e) => setManualPartName(e.target.value)}
                          disabled={isLoading}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          placeholder="1"
                          value={manualQuantity}
                          onChange={(e) => setManualQuantity(e.target.value)}
                          disabled={isLoading}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="barcodeOptional">Barcode (Optional)</Label>
                      <Input
                        id="barcodeOptional"
                        placeholder="Enter or scan barcode..."
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <Button type="submit" disabled={isLoading || !manualPartName.trim()} className="w-full">
                      {isLoading ? "Adding..." : "Add to Inventory"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <h3 className="font-semibold">Current Inventory</h3>
                {parts.length === 0 ? (
                  <div className="text-center py-8 border rounded-lg bg-muted/30">
                    <ScanLine className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No parts in this category yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Part Name</TableHead>
                        <TableHead>Barcode</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parts.map((part) => (
                        <TableRow key={part.id}>
                          <TableCell className="font-medium">{part.name}</TableCell>
                          <TableCell>
                            <code className="text-xs">{part.barcode || "—"}</code>
                          </TableCell>
                          <TableCell className="text-right">{part.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Track component issues and returns</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Record Transaction
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manual Transaction Entry</DialogTitle>
                  <DialogDescription>Record component issue or return</DialogDescription>
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
                          {parts.filter(p => p.categories).map((part) => (
                            <SelectItem key={part.id} value={part.id.toString()}>
                              {part.categories?.name} - {part.name}
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
                      <Textarea id="notes" name="notes" placeholder="Additional notes" />
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
        </CardHeader>
        <CardContent>
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
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="checked_out">Checked Out</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="text-center py-8">
              <ScanLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No inventory records yet.</p>
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
                        {getStatusLabel(record.status)}
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
