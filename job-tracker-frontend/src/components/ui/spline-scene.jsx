/**
 * SplineScene — lazy-loaded Spline 3D scene wrapper.
 * Used ONLY in the dashboard hero. Suspense boundary prevents
 * blocking the rest of the app during load.
 */
import React, { Suspense, lazy } from 'react';
import { cn } from '../../lib/utils';

const Spline = lazy(() => import('@splinetool/react-spline'));

function Loader() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-blue-500 animate-spin" />
    </div>
  );
}

export function SplineScene({ scene, className }) {
  return (
    <Suspense fallback={<Loader />}>
      <Spline scene={scene} className={cn('w-full h-full', className)} />
    </Suspense>
  );
}
