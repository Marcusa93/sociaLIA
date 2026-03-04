'use client'

import { Button } from './index'

export function PrintButton() {
  return (
    <Button variant="secondary" size="sm" onClick={() => window.print()}>
      Imprimir / PDF
    </Button>
  )
}
