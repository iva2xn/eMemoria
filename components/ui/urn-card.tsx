import React from 'react';
import { Button } from './button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './card';

interface UrnCardProps {
  name: string;
  description: string;
  price: string;
  onSelect?: () => void;
}

export function UrnCard({ name, description, price, onSelect }: UrnCardProps) {
  return (
    <Card className="flex flex-col items-center text-center hover:shadow-md transition-shadow">
      <CardHeader className="pb-0 items-center">
        {/* Image Placeholder */}
        <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center">
          <span className="text-muted-foreground text-xs">Urn Image</span>
        </div>
        <CardTitle className="font-semibold text-foreground mt-4">
          {name}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pt-2">
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      </CardContent>
      <CardFooter className="w-full pt-4 border-t border-border flex items-center justify-between">
        <span className="font-medium text-sm text-foreground">{price}</span>
        <Button onClick={onSelect} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8 px-4 rounded-md">
          Select Urn
        </Button>
      </CardFooter>
    </Card>
  );
}
