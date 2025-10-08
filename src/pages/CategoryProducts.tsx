import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { 
  ArrowLeft, 
  Package, 
  CheckCircle2, 
  AlertCircle,
  Info,
  ShoppingCart,
  Minus,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Part {
  id: number;
  name: string;
  description: string;
  quantity: number;
  image_url: string | null;
  category_id: number;
}

interface Category {
  id: number;
  name: string;
  description: string | null;
  checkout_limit: number;
}

interface CartItem {
  partId: number;
  quantity: number;
}

interface CategoryProductsProps {
  categoryId: number;
  onBack: () => void;
  onLogout: () => void;
}

export default function CategoryProducts({ categoryId, onBack, onLogout }: CategoryProductsProps) {
  const [parts, setParts] = useState<Part[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [isReserving, setIsReserving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCategoryAndParts();

    // Real-time updates for parts quantity
    const partsChannel = supabase
      .channel('parts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'parts',
          filter: `category_id=eq.${categoryId}`
        },
        (payload) => {
          console.log('Part quantity updated:', payload);
          loadCategoryAndParts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(partsChannel);
    };
  }, [categoryId]);

  const loadCategoryAndParts = async () => {
    try {
      // Load category info with checkout limit
      const { data: categoryData, error: catError } = await supabase
        .from("categories")
        .select("*")
        .eq("id", categoryId)
        .single();

      if (catError) throw catError;
      setCategory(categoryData);

      // Load parts in this category
      const { data: partsData, error: partsError } = await supabase
        .from("parts")
        .select("*")
        .eq("category_id", categoryId)
        .order("name");

      if (partsError) throw partsError;
      setParts(partsData || []);
    } catch (error: any) {
      toast({
        title: "Error loading products",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return "out-of-stock";
    if (quantity <= 5) return "low-stock";
    return "available";
  };

  const updateCartQuantity = (partId: number, change: number) => {
    const part = parts.find(p => p.id === partId);
    if (!part) return;

    const currentQty = cart[partId] || 0;
    const newQty = Math.max(0, Math.min(currentQty + change, part.quantity));
    
    setCart(prev => {
      const updated = { ...prev };
      if (newQty === 0) {
        delete updated[partId];
      } else {
        updated[partId] = newQty;
      }
      return updated;
    });
  };

  const setCartQuantity = (partId: number, value: string) => {
    const part = parts.find(p => p.id === partId);
    if (!part) return;

    const qty = parseInt(value) || 0;
    const newQty = Math.max(0, Math.min(qty, part.quantity));
    
    setCart(prev => {
      const updated = { ...prev };
      if (newQty === 0) {
        delete updated[partId];
      } else {
        updated[partId] = newQty;
      }
      return updated;
    });
  };

  const getTotalItems = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  };

  const handleReserveAll = async () => {
    if (Object.keys(cart).length === 0) {
      toast({
        variant: "destructive",
        title: "Cart is empty",
        description: "Please select items to checkout.",
      });
      return;
    }

    const totalItems = getTotalItems();
    const checkoutLimit = category?.checkout_limit || 10;

    if (totalItems > checkoutLimit) {
      toast({
        variant: "destructive",
        title: "Checkout limit exceeded",
        description: `You can only checkout up to ${checkoutLimit} items from this category.`,
      });
      return;
    }

    setIsReserving(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Convert cart to items array
      const items = Object.entries(cart).map(([partId, quantity]) => ({
        part_id: parseInt(partId),
        quantity
      }));

      const { error } = await supabase.functions.invoke("checkout-item", {
        body: { items },
      });

      if (error) throw error;

      toast({
        title: "Checkout successful!",
        description: `${totalItems} item(s) have been checked out. Please pick them up from the hardware station.`,
      });

      // Clear cart and reload parts
      setCart({});
      await loadCategoryAndParts();
    } catch (error: any) {
      toast({
        title: "Checkout failed",
        description: error.message || "Failed to checkout items",
        variant: "destructive",
      });
    } finally {
      setIsReserving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 animate-pulse mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  const totalItems = getTotalItems();
  const checkoutLimit = category?.checkout_limit || 10;

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header 
        userRole="team" 
        onLogout={onLogout} 
      />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Navigation & Category Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Categories
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{category?.name}</h1>
              <p className="text-muted-foreground">
                Select quantities and reserve items for your project
              </p>
            </div>
          </div>
        </div>

        {/* Category Info */}
        <Card className="bg-gradient-card border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Available Parts</h3>
                  <p className="text-sm text-muted-foreground">
                    {parts.length} parts available • Max {checkoutLimit} items per checkout
                  </p>
                </div>
              </div>
              {totalItems > 0 && (
                <Badge variant={totalItems > checkoutLimit ? "destructive" : "default"} className="text-lg px-4 py-2">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {totalItems} / {checkoutLimit}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {parts.map((part) => {
            const stockStatus = getStockStatus(part.quantity);
            const cartQty = cart[part.id] || 0;
            const canAdd = part.quantity > 0;
            
            return (
              <Card key={part.id} className="overflow-hidden bg-gradient-card transition-all duration-300 hover:shadow-medium">
                {/* Product Image */}
                <div className="aspect-video bg-muted flex items-center justify-center relative">
                  {part.image_url ? (
                    <img src={part.image_url} alt={part.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-12 w-12 text-muted-foreground" />
                  )}
                  {cartQty > 0 && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center font-bold">
                      {cartQty}
                    </div>
                  )}
                </div>
                
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg leading-tight">{part.name}</CardTitle>
                    <StatusBadge variant={stockStatus}>
                      {stockStatus === "available" && "Available"}
                      {stockStatus === "low-stock" && "Low Stock"}
                      {stockStatus === "out-of-stock" && "Out of Stock"}
                    </StatusBadge>
                  </div>
                  <CardDescription className="text-sm line-clamp-2">
                    {part.description || "No description available"}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Stock Info */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Available:</span>
                    <span className="font-medium">{part.quantity}</span>
                  </div>

                  {/* Quantity Selector */}
                  {canAdd ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCartQuantity(part.id, -1)}
                        disabled={cartQty === 0}
                        className="h-9 w-9 p-0"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={cartQty}
                        onChange={(e) => setCartQuantity(part.id, e.target.value)}
                        className="text-center h-9"
                        min="0"
                        max={part.quantity}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCartQuantity(part.id, 1)}
                        disabled={cartQty >= part.quantity}
                        className="h-9 w-9 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button className="w-full" disabled variant="secondary">
                      Out of Stock
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {parts.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No components available</h3>
              <p className="text-muted-foreground">
                Components in this category are currently being restocked.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Fixed Bottom Checkout Bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">
                  Total: {totalItems} item{totalItems !== 1 ? 's' : ''} selected
                </div>
                <div className="text-sm text-muted-foreground">
                  {totalItems > checkoutLimit ? (
                    <span className="text-destructive">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      Exceeds limit of {checkoutLimit} items
                    </span>
                  ) : (
                    `${checkoutLimit - totalItems} items remaining`
                  )}
                </div>
              </div>
              <Button
                size="lg"
                onClick={handleReserveAll}
                disabled={isReserving || totalItems > checkoutLimit}
                className="min-w-[200px]"
              >
                {isReserving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Reserve All Items
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}