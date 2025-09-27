import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { 
  ArrowLeft, 
  Package, 
  CheckCircle2, 
  AlertCircle,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock data for Arduino/Microcontroller category
const mockProducts = [
  {
    id: 1,
    name: "Arduino Uno R3",
    description: "The classic Arduino board with USB connection, 14 digital pins, 6 analog inputs, and a 16MHz crystal oscillator.",
    image: "/placeholder.svg",
    totalStock: 10,
    availableStock: 7,
    specifications: ["ATmega328P Microcontroller", "USB Connection", "14 Digital I/O Pins", "6 Analog Inputs"],
    category: "Microcontrollers"
  },
  {
    id: 2,
    name: "Arduino Nano",
    description: "Compact Arduino board perfect for breadboard use. Same functionality as Uno in a smaller form factor.",
    image: "/placeholder.svg",
    totalStock: 8,
    availableStock: 5,
    specifications: ["ATmega328P", "Mini USB", "Compact Design", "Breadboard Compatible"],
    category: "Microcontrollers"
  },
  {
    id: 3,
    name: "ESP32 DevKit",
    description: "WiFi and Bluetooth enabled microcontroller with dual-core processor and extensive GPIO options.",
    image: "/placeholder.svg",
    totalStock: 12,
    availableStock: 0,
    specifications: ["WiFi & Bluetooth", "Dual-Core CPU", "18 ADC Channels", "3.3V Logic"],
    category: "Microcontrollers"
  },
  {
    id: 4,
    name: "Raspberry Pi 4B",
    description: "Single-board computer with quad-core ARM Cortex-A72 processor, up to 8GB RAM, and multiple connectivity options.",
    image: "/placeholder.svg",
    totalStock: 6,
    availableStock: 2,
    specifications: ["Quad-core ARM CPU", "Up to 8GB RAM", "Dual 4K HDMI", "Gigabit Ethernet"],
    category: "Microcontrollers"
  },
];

interface CategoryProductsProps {
  categoryId: number;
  onBack: () => void;
  onLogout: () => void;
}

export default function CategoryProducts({ categoryId, onBack, onLogout }: CategoryProductsProps) {
  const [reservingId, setReservingId] = useState<number | null>(null);
  const { toast } = useToast();
  const teamName = "Team Alpha";
  
  const categoryName = "Microcontrollers";
  const maxReservations = 3;
  const currentReservations = 1; // Team already has 1 reservation in this category

  const getStockStatus = (available: number, total: number) => {
    if (available === 0) return "out-of-stock";
    if (available <= total * 0.2) return "low-stock";
    return "available";
  };

  const handleReserve = async (productId: number, productName: string) => {
    if (currentReservations >= maxReservations) {
      toast({
        variant: "destructive",
        title: "Reservation limit reached",
        description: `You can only reserve ${maxReservations} items from this category.`,
      });
      return;
    }

    const product = mockProducts.find(p => p.id === productId);
    if (!product || product.availableStock === 0) {
      toast({
        variant: "destructive",
        title: "Item unavailable",
        description: "This item is currently out of stock.",
      });
      return;
    }

    setReservingId(productId);
    
    // Simulate API call
    setTimeout(() => {
      setReservingId(null);
      toast({
        title: "Reservation successful!",
        description: `${productName} has been reserved for ${teamName}. Please pick it up from the hardware station.`,
      });
      
      // In real app, this would update the stock and reservations
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        userRole="team" 
        teamName={teamName} 
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
              <h1 className="text-3xl font-bold">{categoryName}</h1>
              <p className="text-muted-foreground">
                Select components to reserve for your project
              </p>
            </div>
          </div>
        </div>

        {/* Reservation Status */}
        <Card className="bg-gradient-card border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
                  <Info className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Category Reservation Status</h3>
                  <p className="text-sm text-muted-foreground">
                    You have reserved {currentReservations} of {maxReservations} allowed items in this category
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {maxReservations - currentReservations}
                </div>
                <div className="text-sm text-muted-foreground">
                  reservations left
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockProducts.map((product) => {
            const stockStatus = getStockStatus(product.availableStock, product.totalStock);
            const canReserve = product.availableStock > 0 && currentReservations < maxReservations;
            const isReserving = reservingId === product.id;
            
            return (
              <Card key={product.id} className="overflow-hidden bg-gradient-card transition-all duration-300 hover:shadow-medium">
                {/* Product Image */}
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <Package className="h-12 w-12 text-muted-foreground" />
                </div>
                
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg leading-tight">{product.name}</CardTitle>
                    <StatusBadge variant={stockStatus}>
                      {stockStatus === "available" && "Available"}
                      {stockStatus === "low-stock" && "Low Stock"}
                      {stockStatus === "out-of-stock" && "Out of Stock"}
                    </StatusBadge>
                  </div>
                  <CardDescription className="text-sm line-clamp-2">
                    {product.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Stock Info */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Available:</span>
                    <span className="font-medium">
                      {product.availableStock} of {product.totalStock}
                    </span>
                  </div>

                  {/* Specifications */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Key Features:</h4>
                    <div className="flex flex-wrap gap-1">
                      {product.specifications.slice(0, 2).map((spec, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                      {product.specifications.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{product.specifications.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Reserve Button */}
                  <Button 
                    className="w-full" 
                    onClick={() => handleReserve(product.id, product.name)}
                    disabled={!canReserve || isReserving}
                    variant={canReserve ? "default" : "secondary"}
                  >
                    {isReserving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Reserving...
                      </>
                    ) : !canReserve && currentReservations >= maxReservations ? (
                      <>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Limit Reached
                      </>
                    ) : !canReserve && product.availableStock === 0 ? (
                      "Out of Stock"
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Reserve Now
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {mockProducts.length === 0 && (
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
    </div>
  );
}