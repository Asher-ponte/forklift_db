'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Wrench } from "lucide-react";

const tools = [
  { name: "Flashlight", description: "For inspecting dark or poorly lit areas." },
  { name: "Tire Pressure Gauge", description: "To check and ensure correct tire inflation." },
  { name: "Camera (App Integrated)", description: "For capturing photos of inspected parts." },
  { name: "Safety Goggles/Glasses", description: "Personal protective equipment for eye safety." },
  { name: "Gloves", description: "To protect hands during inspection." },
  { name: "Cleaning Rags/Wipes", description: "For cleaning parts or checking for leaks." },
  { name: "Hydraulic Fluid Dipstick/Indicator", description: "To check hydraulic fluid levels (if applicable)." },
  { name: "Brake Fluid (if applicable)", description: "To check brake fluid levels." },
  { name: "Coolant (if applicable)", description: "To check coolant levels for engine-powered forklifts." },
  { name: "Operator's Manual", description: "Reference for specific forklift model details and procedures." },
];

export default function ToolsList() {
  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-3xl flex items-center">
          <Wrench className="mr-3 h-8 w-8 text-primary" />
          Required Inspection Tools
        </CardTitle>
        <CardDescription>Ensure you have the following tools before starting an inspection.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {tools.map((tool, index) => (
            <li key={index} className="flex items-start p-4 bg-secondary/50 rounded-lg shadow-sm">
              <CheckSquare className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg">{tool.name}</h3>
                <p className="text-muted-foreground text-sm">{tool.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
