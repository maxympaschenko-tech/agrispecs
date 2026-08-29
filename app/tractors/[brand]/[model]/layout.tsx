import type { ReactNode } from 'react';
import Link from 'next/link';
import { getMachine } from '@/lib/catalog-service';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ brand: string; model: string }>;
};

export default async function TractorModelLayout({ children, params }: LayoutProps) {
  const { brand, model } = await params;
  const machine = await getMachine(brand, model);

  return (
    <>
      {children}
      {machine && (machine.dataStatus === 'partial' || machine.dataStatus === 'verified') && (
        <Link
          href={`/compare?m1=${encodeURIComponent(machine.id)}`}
          aria-label={`Compare ${machine.title} with another tractor`}
          style={{
            position: 'fixed',
            right: 20,
            bottom: 20,
            zIndex: 30,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 16px',
            borderRadius: 10,
            background: 'var(--brand)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 13,
            boxShadow: '0 8px 24px rgba(16,39,25,.22)',
          }}
        >
          Compare this tractor
        </Link>
      )}
    </>
  );
}
