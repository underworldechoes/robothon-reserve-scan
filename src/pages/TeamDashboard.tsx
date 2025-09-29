import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { 
  Cpu, 
  Zap, 
  Camera, 
  Wrench, 
  ChevronRight, 
  Package, 
  Clock,
  CheckCircle2 
} from "lucide-react";

// Mock data
const mockCategories = [
  {
    id: 1,
    name: "Microcontrollers",
    description: "Arduino, Raspberry Pi, ESP32 modules",
    icon: Cpu,
    componentCount: 15,
    maxReservations: 3,
    currentReservations: 1,
  },
  {
    id: 2,
    name: "Sensors",
    description: "Ultrasonic, IMU, temperature sensors",
    icon: Camera,
    componentCount: 24,
    maxReservations: 5,
    currentReservations: 2,
  },
  {
    id: 3,
    name: "Motors & Actuators",
    description: "Servo motors, stepper motors, pumps",
    icon: Zap,
    componentCount: 18,
    maxReservations: 4,
    currentReservations: 0,
  },
  {
    id: 4,
    name: "Tools & Hardware",
    description: "Screws, brackets, connectors",
    icon: Wrench,
    componentCount: 32,
    maxReservations: 10,
    currentReservations: 3,
  },
];

const mockReservations = [
  {
    id: 1,
    component: "Arduino Uno R3",
    category: "Microcontrollers",
    quantity: 1,
    status: "reserved" as const,
    reservedAt: "2024-01-15T10:30:00Z",
  },
  {
    id: 2,
    component: "HC-SR04 Ultrasonic Sensor",
    category: "Sensors",
    quantity: 2,
    status: "picked-up" as const,
    reservedAt: "2024-01-15T09:15:00Z",
    pickedUpAt: "2024-01-15T11:45:00Z",
  },
  {
    id: 3,
    component: "M3 Screws (Pack of 20)",
    category: "Tools & Hardware",
    quantity: 3,
    status: "reserved" as const,
    reservedAt: "2024-01-15T14:20:00Z",
  },
];

interface TeamDashboardProps {
  onLogout: () => void;
  onSelectCategory: (categoryId: number) => void;
}

export default function TeamDashboard({ onLogout, onSelectCategory }: TeamDashboardProps) {
  const teamName = "Team Alpha";

  return (
    <div className="min-h-screen bg-background">
      <Header 
        userRole="team" 
        teamName={teamName} 
        onLogout={onLogout} 
      />
      
      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome back, {teamName}!</h1>
          <p className="text-muted-foreground">
            Select a category to browse and reserve components for your project.
          </p>
        </div>

        {/* Categories Grid */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Browse Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mockCategories.map((category) => {
              const Icon = category.icon;
              const canReserveMore = category.currentReservations < category.maxReservations;
              
              return (
                <Card 
                  key={category.id} 
                  className="cursor-pointer transition-all duration-300 hover:shadow-medium hover:scale-105 bg-gradient-card"
                  onClick={() => onSelectCategory(category.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {category.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Components:</span>
                        <span className="font-medium">{category.componentCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Reserved:</span>
                        <span className="font-medium">
                          {category.currentReservations}/{category.maxReservations}
                        </span>
                      </div>
                      <div className="flex justify-center">
                        <StatusBadge 
                          variant={canReserveMore ? "available" : "out-of-stock"}
                        >
                          {canReserveMore ? "Available" : "Limit Reached"}
                        </StatusBadge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Reservations History */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Your Reservations</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Track your reserved components and pickup status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockReservations.map((reservation) => (
                  <div 
                    key={reservation.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-gradient-card"
                  >
                    <div className="space-y-1">
                      <h4 className="font-medium">{reservation.component}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{reservation.category}</span>
                        <span>Qty: {reservation.quantity}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(reservation.reservedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge 
                        variant={reservation.status === "picked-up" ? "available" : "reserved"}
                      >
                        {reservation.status === "picked-up" ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Picked Up
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            Reserved
                          </>
                        )}
                      </StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}