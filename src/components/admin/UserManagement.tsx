import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Users, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  username: string;
  role: "admin" | "team";
  created_at: string;
  user_id: string;
}

interface UserManagementProps {
  onStatsUpdate: () => void;
}

export default function UserManagement({ onStatsUpdate }: UserManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
const [isLoading, setIsLoading] = useState(false);
const [createdCreds, setCreatedCreds] = useState<{ username: string; password: string } | null>(null);
const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading users",
        description: error.message,
        variant: "destructive",
      });
    }
  };

const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setIsLoading(true);

  const formData = new FormData(e.currentTarget);
  const username = (formData.get("username") as string).trim();
  const role = (formData.get("role") as "admin" | "team") || "team";
  const password = (formData.get("password") as string).trim();

  try {
    if (username.length < 3) throw new Error("Username must be at least 3 characters");
    if (password.length < 6) throw new Error("Password must be at least 6 characters");

    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: { username, password, role },
    });

    if (error) throw new Error((error as any).message || "Failed to create user");
    
    // Set credentials to display
    setCreatedCreds({ username, password });

    toast({
      title: "User created",
      description: `${username} has been created successfully.`,
    });

    loadUsers();
    onStatsUpdate();
  } catch (error: any) {
    toast({
      title: "Error creating user",
      description: error.message,
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

  const handleEditUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const role = formData.get("role") as "admin" | "team";

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username, role })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast({
        title: "User updated",
        description: `${username} has been updated successfully.`,
      });

      setIsEditDialogOpen(false);
      setSelectedUser(null);
      loadUsers();
      onStatsUpdate();
    } catch (error: any) {
      toast({
        title: "Error updating user",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (!confirm(`Are you sure you want to delete "${user.username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // First delete the profile
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Note: We can't delete the auth user from the client side
      // This would need to be done via admin API or Supabase dashboard

      toast({
        title: "User deleted",
        description: `${user.username} has been deleted from profiles. Auth user needs manual deletion.`,
      });

      loadUsers();
      onStatsUpdate();
    } catch (error: any) {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === "admin" ? "destructive" : "default";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Create and manage team member accounts</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
<DialogHeader>
  <DialogTitle>Add New User</DialogTitle>
  <DialogDescription>Create a new team member account</DialogDescription>
</DialogHeader>
<form onSubmit={handleAddUser}>
  <div className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="username">Username</Label>
      <Input id="username" name="username" placeholder="e.g., team01" required />
    </div>
    <div className="space-y-2">
      <Label htmlFor="password">Temporary Password</Label>
      <Input id="password" name="password" type="password" placeholder="min 6 characters" required />
    </div>
    <div className="space-y-2">
      <Label htmlFor="role">Role</Label>
      <Select name="role" defaultValue="team">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="team">Team Member</SelectItem>
          <SelectItem value="admin">Administrator</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {createdCreds && (
      <div className="rounded-md border bg-primary/5 p-4 space-y-3">
        <div className="font-medium text-primary">✓ User Created Successfully!</div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between p-2 rounded bg-background">
            <div>
              <div className="text-muted-foreground text-xs">Login Username:</div>
              <div className="font-mono font-medium">{createdCreds.username}</div>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => {
                navigator.clipboard.writeText(createdCreds.username);
                toast({ title: "Copied!", description: "Username copied to clipboard" });
              }}
            >
              Copy
            </Button>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-background">
            <div>
              <div className="text-muted-foreground text-xs">Password:</div>
              <div className="font-mono font-medium">{createdCreds.password}</div>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => {
                navigator.clipboard.writeText(createdCreds.password);
                toast({ title: "Copied!", description: "Password copied to clipboard" });
              }}
            >
              Copy
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
          <strong>Important:</strong> Share these credentials with the team member. They should use the <strong>username</strong> (not email) to login.
        </div>
      </div>
    )}
  </div>
  <DialogFooter className="mt-6">
    <Button 
      type="button" 
      variant="outline" 
      onClick={() => {
        setIsAddDialogOpen(false);
        setCreatedCreds(null);
      }}
    >
      Close
    </Button>
    {!createdCreds && (
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Creating..." : "Create User"}
      </Button>
    )}
  </DialogFooter>
</form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No users yet. Add your first team member to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role === "admin" ? "Administrator" : "Team Member"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteUser(user)}
                          disabled={user.role === "admin"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleEditUser}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-username">Username</Label>
                  <Input 
                    id="edit-username" 
                    name="username" 
                    defaultValue={selectedUser.username}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select name="role" defaultValue={selectedUser.role}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team">Team Member</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update User"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}