'use client'
import { Printer } from 'lucide-react'
import { imprimerPage } from '@/lib/print'
import Bouton from '@/components/ui/Bouton'

export default function PrintButton({ label = 'Imprimer' }: { label?: string }) {
  return (
    <Bouton variant="neutre" size="sm" icon={Printer} onClick={imprimerPage} className="no-print">
      {label}
    </Bouton>
  )
}
