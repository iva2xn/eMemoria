import React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './card'

interface UrnCardProps {
  name: string
  description: string
  price: string
  onSelect?: () => void
}

export function UrnCard({ name, description, price, onSelect }: UrnCardProps) {
  return (
    <Card className="flex flex-col items-center text-center hover:shadow-md transition-shadow">
      <CardHeader className="pb-0 items-center w-full">
        {/* Image placeholder */}
        <div className="w-full h-36 bg-muted rounded-xl flex items-center justify-center">
          <span className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest">Photo</span>
        </div>
        <CardTitle className="font-serif font-bold text-foreground mt-4 text-lg">
          {name}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 pt-2 px-5">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      </CardContent>

      <CardFooter className="w-full pt-4 border-t border-border flex items-center justify-between px-5 pb-5">
        <span className="font-serif font-bold text-sm text-foreground">{price}</span>
        <Link
          href="/contact"
          onClick={onSelect}
          className="inline-flex items-center justify-center h-9 px-5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
        >
          Select Urn
        </Link>
      </CardFooter>
    </Card>
  )
}
