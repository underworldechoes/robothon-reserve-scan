import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReservationExport from "./ReservationExport";

interface UserProfile {
  id: string;
  username: string;
  role: string;
}

interface Reservation {
  id: string;
  scanned_at: string;
  status: string;
  notes: string | null;
  admin_remarks: string | null;
  parts: {
    name: string;
    description: string | null;
  };
}

export default function UserReservations() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingReservation, setEditingReservation] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>("");
  const [editRemarks, setEditRemarks] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();

    // Real-time updates for reservations
    const reservationsChannel = supabase
      .channel('admin-reservations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_tracking'
        },
        () => {
          console.log('Reservations updated');
          if (selectedUserId) {
            loadReservations(selectedUserId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reservationsChannel);
    };
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadReservations(selectedUserId);
    }
  }, [selectedUserId]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, role")
        .eq("role", "team")
        .order("username");

      if (error) throw error;
      setUsers(data || []);
      
      if (data && data.length > 0) {
        setSelectedUserId(data[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Error loading users",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadReservations = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("inventory_tracking")
        .select(`
          id,
          scanned_at,
          status,
          notes,
          admin_remarks,
          parts (
            name,
            description
          )
        `)
        .eq("team_user_id", userId)
        .order("scanned_at", { ascending: false });

      if (error) throw error;
      setReservations(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading reservations",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateReservation = async (reservationId: string) => {
    try {
      const { error } = await supabase
        .from("inventory_tracking")
        .update({
          status: editStatus,
          admin_remarks: editRemarks,
        })
        .eq("id", reservationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reservation updated successfully",
      });

      setEditingReservation(null);
      if (selectedUserId) {
        loadReservations(selectedUserId);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startEditing = (reservation: Reservation) => {
    setEditingReservation(reservation.id);
    setEditStatus(reservation.status);
    setEditRemarks(reservation.admin_remarks || "");
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "reserved":
        return "default";
      case "issued":
        return "destructive";
      case "returned":
        return "secondary";
      case "lost":
        return "destructive";
      case "damaged":
        return "destructive";
      default:
        return "outline";
    }
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>User Reservations</CardTitle>
            <CardDescription>View checkout history for each team member</CardDescription>
          </div>
          <ReservationExport />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Select User:</label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a user" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {user.username}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading reservations...</p>
          </div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-8">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {selectedUser ? `${selectedUser.username} has no reservations yet.` : "No reservations found."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Admin Remarks</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell className="font-medium">{reservation.parts.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {reservation.parts.description || "—"}
                  </TableCell>
                  <TableCell>
                    {editingReservation === reservation.id ? (
                      <Select value={editStatus} onValueChange={setEditStatus}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reserved">Reserved</SelectItem>
                          <SelectItem value="issued">Issued</SelectItem>
                          <SelectItem value="returned">Returned</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                          <SelectItem value="damaged">Damaged</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={getStatusBadgeVariant(reservation.status)}>
                        {reservation.status.replace("_", " ")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{new Date(reservation.scanned_at).toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">{reservation.notes || "—"}</TableCell>
                  <TableCell>
                    {editingReservation === reservation.id ? (
                      <Input
                        value={editRemarks}
                        onChange={(e) => setEditRemarks(e.target.value)}
                        placeholder="Add remarks..."
                        className="w-full"
                      />
                    ) : (
                      <span className="text-muted-foreground">{reservation.admin_remarks || "—"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingReservation === reservation.id ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdateReservation(reservation.id)}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingReservation(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEditing(reservation)}>
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
